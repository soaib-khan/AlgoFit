let products = []; let filter = 'All'; let bag = []; let isSignup = false; let supabase = null; let googleOrderFormUrl = '';
const curatedProducts = [
  { id: 'demo1', name: 'Street Flex Hoodie', category: 'Hoodies', price: 299, image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo2', name: 'Relaxed Indigo Jeans', category: 'Jeans', price: 199, image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo3', name: 'Everyday Cotton Tee', category: 'T-Shirts', price: 149, image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo4', name: 'City Lite Overshirt', category: 'Shirts', price: 399, image_url: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo5', name: 'Festive Ease Kurta', category: 'Women', price: 499, image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85' },
  { id: 'demo6', name: 'Chic Wide-Leg Denim', category: 'Women', price: 399, image_url: 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=900&q=85' }
];
const $ = s => document.querySelector(s); const $$ = s => document.querySelectorAll(s);
const money = n => `₹${Number(n).toLocaleString('en-IN')}`;
async function init() {
  try { const r = await fetch('/api/config'); const c = await r.json(); googleOrderFormUrl = c.googleOrderFormUrl || ''; if (c.supabaseUrl && c.supabasePublishableKey) { const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'); supabase = mod.createClient(c.supabaseUrl, c.supabasePublishableKey) } } catch (e) { console.warn('Supabase unavailable', e) }
  await loadProducts(); setup(); observe();
}
async function loadProducts() {
  products = curatedProducts.map(product => ({ ...product }));
  try {
    const r = await fetch('/api/products');
    const j = await r.json();
    if (Array.isArray(j.products) && j.products.length) {
      products = curatedProducts.map(product => ({ ...product }));
    }
  } catch (e) {
    products = curatedProducts.map(product => ({ ...product }));
  }
  renderProducts();
}
function renderProducts() { const root = $('#products'); const shown = filter === 'All' ? products : products.filter(p => p.category === filter); root.innerHTML = shown.map((p, i) => `<article class="product" style="animation-delay:${i * 70}ms"><div class="product-img"><img loading="lazy" src="${p.image_url}" alt="${p.name}"><span class="product-tag">${p.category.toUpperCase()}</span></div><div class="product-info"><h3>${p.name}</h3><div class="meta"><span>${money(p.price)}</span><span>Available now</span></div><button class="add" data-add="${p.id}">Add to bag</button></div></article>`).join(''); $$('[data-add]').forEach(b => b.onclick = () => addToBag(b.dataset.add)); }
function addToBag(id) { const p = products.find(x => x.id === id); if (!p) return; bag.push(p); updateBag(); toast('Added to your bag'); }
function updateBag() {
  $('#bagCount').textContent = bag.length; $('#bagItems').innerHTML = bag.length ? bag.map((p, i) => `<div class="drawer-item"><img src="${p.image_url}" alt=""><div><h4>${p.name}</h4><p>${money(p.price)}</p></div><button class="text-btn" data-remove="${i}">Remove</button></div>`).join('') : '<p style="color:#777;padding:30px 0">Your bag is empty.</p>';
  $('#bagTotal').textContent = money(bag.reduce((s, p) => s + Number(p.price), 0)); $$('[data-remove]').forEach(b => b.onclick = () => { bag.splice(Number(b.dataset.remove), 1); updateBag() });
}
function setup() {
  $$('#filters button').forEach(b => b.onclick = () => { $$('#filters button').forEach(x => x.classList.remove('active')); b.classList.add('active'); filter = b.dataset.filter; renderProducts() });
  $('#bagBtn').onclick = () => $('#bagDrawer').classList.add('open'); $('[data-bag-close]').onclick = () => $('#bagDrawer').classList.remove('open');
  $('#accountBtn').onclick = () => $('#authModal').classList.add('show'); $('[data-close]').onclick = () => $('#authModal').classList.remove('show');
  $('#toggleAuth').onclick = () => { isSignup = !isSignup; $('#authTitle').textContent = isSignup ? 'Create your account.' : 'Welcome back.'; $('#toggleAuth').textContent = isSignup ? 'Already have an account?' : 'Create an account'; $('#authNote').textContent = '' };
  $('#authForm').onsubmit = authSubmit;
  $('#newsletter').onsubmit = e => { e.preventDefault(); toast('You are on the list.'); e.target.reset() };
  $('#checkoutBtn').onclick = checkout;
  $('#searchBtn').onclick = () => toast('Search is coming in the next release');
}
async function authSubmit(e) { e.preventDefault(); if (!supabase) { $('#authNote').textContent = 'Connect Supabase in .env to enable authentication.'; return } const email = $('#authEmail').value, password = $('#authPassword').value; const fn = isSignup ? supabase.auth.signUp({ email, password }) : supabase.auth.signInWithPassword({ email, password }); const { error } = await fn; if (error) { $('#authNote').textContent = error.message; return } $('#authNote').textContent = isSignup ? 'Check your email to confirm your account.' : 'Signed in successfully.'; setTimeout(() => $('#authModal').classList.remove('show'), 1000) }
function checkout() { if (!bag.length) return toast('Your bag is empty'); const summary = bag.map(p => `${p.name} — ${money(p.price)}`).join(' | '); try { navigator.clipboard?.writeText(`AlgoFit order: ${summary}. Total: ${money(bag.reduce((s, p) => s + Number(p.price), 0))}`) } catch (e) { } if (googleOrderFormUrl) { window.open(googleOrderFormUrl, '_blank', 'noopener,noreferrer'); toast('Order form opened — cart summary copied'); } else toast('Order form is not configured'); }
function toast(t) { const x = $('#toast'); x.textContent = t; x.classList.add('show'); setTimeout(() => x.classList.remove('show'), 2200) }
function observe() { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }), { threshold: .12 }); $$('.reveal').forEach(x => io.observe(x)); }
init();
