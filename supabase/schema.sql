-- AlgoFit: minimal product catalog + RLS
create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price integer not null check (price >= 0),
  image_url text not null,
  description text default '',
  sizes text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
to anon, authenticated
using (is_active = true);

insert into public.products (name, category, price, image_url, description, sizes)
values
('Midnight Oversized Hoodie','Hoodies',899,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85','Heavyweight relaxed-fit hoodie with a clean street silhouette.','{"S","M","L","XL"}'),
('Washed Utility Jeans','Jeans',1299,'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85','Straight-fit washed denim built for everyday styling.','{"28","30","32","34","36"}'),
('Essential Box Tee','T-Shirts',499,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85','Minimal heavyweight cotton tee with an easy box fit.','{"S","M","L","XL"}'),
('Studio Overshirt','Shirts',999,'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=85','Clean overshirt designed for layered everyday looks.','{"S","M","L","XL"}'),
('Minimal Rib Top','Women',699,'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=900&q=85','Soft ribbed top with a modern minimal silhouette.','{"S","M","L"}'),
('Everyday Wide-Leg Denim','Women',1199,'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=900&q=85','Relaxed wide-leg denim for a clean everyday fit.','{"26","28","30","32"}')
on conflict do nothing;
