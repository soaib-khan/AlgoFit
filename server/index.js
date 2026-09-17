import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const publicSupabase =
  supabaseUrl && publishableKey
    ? createClient(supabaseUrl, publishableKey)
    : null;

const adminSupabase =
  supabaseUrl && secretKey
    ? createClient(supabaseUrl, secretKey)
    : null;

const localAdminToken = 'algofit-local-admin-token';
const localAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const localAdminPassword = (process.env.ADMIN_PASSWORD || '').trim();


// --------------------------------------------------
// PUBLIC CONFIG
// --------------------------------------------------

app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: supabaseUrl || '',
    supabasePublishableKey: publishableKey || '',
    googleOrderFormUrl: process.env.GOOGLE_ORDER_FORM_URL || ''
  });
});


// --------------------------------------------------
// PUBLIC PRODUCTS
// --------------------------------------------------

app.get('/api/products', async (_req, res) => {
  if (!publicSupabase) {
    return res.json({ products: [] });
  }

  const { data, error } = await publicSupabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  res.json({
    products: data || []
  });
});


// --------------------------------------------------
// ADMIN AUTH MIDDLEWARE
// --------------------------------------------------

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authorization token required.'
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  req.adminToken = token;

  if (token === localAdminToken) {
    return next();
  }

  if (!adminSupabase) {
    return res.status(500).json({
      error: 'Supabase secret key is not configured on the server.'
    });
  }

  next();
}

// --------------------------------------------------
// ADMIN LOGIN
// --------------------------------------------------

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.'
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPassword = String(password).trim();

  if (
    localAdminEmail &&
    normalizedEmail === localAdminEmail &&
    localAdminPassword &&
    normalizedPassword === localAdminPassword
  ) {
    return res.json({
      success: true,
      token: localAdminToken,
      user: {
        email: localAdminEmail
      }
    });
  }

  if (adminSupabase) {
    try {
      const { data, error } = await adminSupabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword
      });

      if (!error && data.session) {
        return res.json({
          success: true,
          token: data.session.access_token,
          user: {
            email: data.user?.email || normalizedEmail
          }
        });
      }
    } catch (e) {
      console.warn('Supabase admin login fallback failed:', e.message || e);
    }
  }

  return res.status(401).json({
    error: 'Invalid admin email or password.'
  });
});

// --------------------------------------------------
// VERIFY ADMIN
// --------------------------------------------------

app.get('/api/admin/me', requireAdmin, async (req, res) => {
  if (req.adminToken === localAdminToken) {
    return res.json({
      authenticated: true,
      user: {
        id: 'local-admin',
        email: localAdminEmail
      }
    });
  }

  const {
    data: { user },
    error
  } = await adminSupabase.auth.getUser(req.adminToken);

  if (error || !user) {
    return res.status(401).json({
      error: 'Invalid login session.'
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  if (
    adminEmail &&
    user.email?.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    return res.status(403).json({
      error: 'You are not authorized as an admin.'
    });
  }

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email
    }
  });
});


// --------------------------------------------------
// ADMIN GET PRODUCTS
// --------------------------------------------------

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  if (req.adminToken === localAdminToken) {
    const { data, error } = await adminSupabase
      ? adminSupabase.from('products').select('*').order('created_at', { ascending: false })
      : { data: [], error: null };

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ products: data || [] });
  }

  const {
    data: { user },
    error: authError
  } = await adminSupabase.auth.getUser(req.adminToken);

  if (authError || !user) {
    return res.status(401).json({
      error: 'Invalid login session.'
    });
  }

  if (
    process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL.toLowerCase()
  ) {
    return res.status(403).json({
      error: 'Admin access denied.'
    });
  }

  const { data, error } = await adminSupabase
    .from('products')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  res.json({
    products: data || []
  });
});


// --------------------------------------------------
// ADMIN ADD PRODUCT
// --------------------------------------------------

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  if (req.adminToken === localAdminToken) {
    if (!adminSupabase) {
      return res.status(500).json({ error: 'Supabase is not configured for product storage.' });
    }
  }

  const {
    data: { user },
    error: authError
  } = req.adminToken === localAdminToken
      ? { data: { user: { email: localAdminEmail } }, error: null }
      : await adminSupabase.auth.getUser(req.adminToken);

  if (authError || !user) {
    return res.status(401).json({
      error: 'Invalid login session.'
    });
  }

  if (
    process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL.toLowerCase()
  ) {
    return res.status(403).json({
      error: 'Admin access denied.'
    });
  }

  const {
    name,
    category,
    price,
    image_url,
    description,
    sizes,
    is_active
  } = req.body;

  if (!name || !category || price === undefined || !image_url) {
    return res.status(400).json({
      error: 'Name, category, price and image URL are required.'
    });
  }

  const { data, error } = await adminSupabase
    .from('products')
    .insert({
      name,
      category,
      price: Number(price),
      image_url,
      description: description || '',
      sizes: Array.isArray(sizes) ? sizes : [],
      is_active: is_active !== false
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  res.json({
    success: true,
    product: data
  });
});


// --------------------------------------------------
// ADMIN UPDATE PRODUCT
// --------------------------------------------------

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {

  const {
    data: { user },
    error: authError
  } = req.adminToken === localAdminToken
      ? { data: { user: { email: localAdminEmail } }, error: null }
      : await adminSupabase.auth.getUser(req.adminToken);

  if (authError || !user) {
    return res.status(401).json({
      error: 'Invalid login session.'
    });
  }

  if (
    process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL.toLowerCase()
  ) {
    return res.status(403).json({
      error: 'Admin access denied.'
    });
  }

  const {
    name,
    category,
    price,
    image_url,
    description,
    sizes,
    is_active
  } = req.body;

  const { data, error } = await adminSupabase
    .from('products')
    .update({
      name,
      category,
      price: Number(price),
      image_url,
      description: description || '',
      sizes: Array.isArray(sizes) ? sizes : [],
      is_active: Boolean(is_active)
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  res.json({
    success: true,
    product: data
  });
});


// --------------------------------------------------
// ADMIN DELETE PRODUCT
// --------------------------------------------------

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {

  const {
    data: { user },
    error: authError
  } = req.adminToken === localAdminToken
      ? { data: { user: { email: localAdminEmail } }, error: null }
      : await adminSupabase.auth.getUser(req.adminToken);

  if (authError || !user) {
    return res.status(401).json({
      error: 'Invalid login session.'
    });
  }

  if (
    process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL.toLowerCase()
  ) {
    return res.status(403).json({
      error: 'Admin access denied.'
    });
  }

  const { error } = await adminSupabase
    .from('products')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  res.json({
    success: true
  });
});


// --------------------------------------------------
// ADMIN PAGE
// --------------------------------------------------

app.get('/admin', (_req, res) => {
  res.sendFile(
    path.join(__dirname, '..', 'public', 'admin.html')
  );
});


// --------------------------------------------------
// FRONTEND FALLBACK
// --------------------------------------------------

app.get(/^(?!\/api|\/admin).*/, (_req, res) => {
  res.sendFile(
    path.join(__dirname, '..', 'public', 'index.html')
  );
});


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(port, () => {
  console.log(
    `AlgoFit running on http://localhost:${port}`
  );
});