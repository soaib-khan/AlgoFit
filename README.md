# AlgoFit — Ready-to-deploy Node.js fashion storefront

Dark/minimal storefront with responsive UI, motion, demo fashion catalog, bag drawer, Google Forms checkout, Supabase email/password auth, and a Supabase product table.

## 1. Install
```bash
npm install
```

## 2. Environment
Copy `.env.example` to `.env` and set:
```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Optional server-only key; do NOT expose this to the browser:
SUPABASE_SECRET_KEY=sb_secret_...
PORT=3000
```

## 3. Supabase
Open Supabase SQL Editor and run `supabase/schema.sql`.
Then configure Auth > URL Configuration for your deployment URL. Enable Email/password authentication.

## 4. Run
```bash
npm start
```
Open http://localhost:3000

## 5. Deploy
This is a standard Node/Express app. On Render/Railway/Fly.io or another Node host:
- Build/install: `npm install`
- Start: `npm start`
- Add the same environment variables.

For a platform that only serves static files, use a Node-capable host because `/api/config` and `/api/products` are Express routes.

## Security
- Publishable key can be exposed to the browser; RLS must protect database access.
- Secret key is server-only and should never be placed in `public/`, frontend JavaScript, GitHub, or browser environment variables.


## Google Forms orders
The storefront opens the configured Google Form for checkout. The selected cart summary is also copied to the visitor's clipboard so it can be pasted into the order form if you add a field for it.

Set `GOOGLE_ORDER_FORM_URL` in `.env`.

## Supabase project
Configured project URL: `https://badxgndvbxtcplfkadte.supabase.co`

The downloadable project does not contain a Supabase secret key. Keep any secret/service-role key server-side only and rotate it if it has previously been exposed.
