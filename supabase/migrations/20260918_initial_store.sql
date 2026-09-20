begin;

create extension if not exists pgcrypto;

create type public.admin_role as enum ('super_admin','admin','editor','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role public.admin_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, description text, image_url text,
  active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.environments (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, description text, image_url text,
  active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, logo_url text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, sku text not null unique,
  short_description text, description text,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  environment_id uuid references public.environments(id) on delete set null,
  price numeric(12,2) not null check(price >= 0),
  promotional_price numeric(12,2) check(promotional_price >= 0 and promotional_price < price),
  cost_price numeric(12,2) check(cost_price is null or cost_price >= 0),
  stock_quantity integer not null default 0 check(stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check(low_stock_threshold >= 0),
  featured boolean not null default false, best_seller boolean not null default false,
  new_arrival boolean not null default false, on_sale boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true, warranty text, dimensions jsonb,
  material text, color text, specifications jsonb not null default '{}'::jsonb,
  installment_enabled boolean not null default true,
  max_installments integer not null default 12 check(max_installments between 1 and 24),
  meta_title text, meta_description text, og_image_url text,
  deleted_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null, storage_path text not null unique, alt_text text,
  sort_order integer not null default 0, is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index product_single_cover on public.product_images(product_id) where is_cover;

create table public.promotions (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  start_at timestamptz, end_at timestamptz, active boolean not null default true,
  banner_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(end_at is null or start_at is null or end_at > start_at)
);
create table public.promotion_products (
  promotion_id uuid references public.promotions(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  primary key(promotion_id, product_id)
);

create table public.banners (
  id uuid primary key default gen_random_uuid(), title text not null, subtitle text,
  image_desktop_url text, image_mobile_url text, button_text text, button_url text,
  position text not null default 'home_hero', active boolean not null default true,
  start_at timestamptz, end_at timestamptz, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.store_settings (
  id boolean primary key default true check(id), store_name text not null default 'Atacarejo dos Móveis',
  logo_url text, favicon_url text, phone text, whatsapp text, address text,
  city text, state text, postal_code text, map_url text, instagram text,
  facebook text, tiktok text, opening_hours text, institutional_text text,
  footer_text text, whatsapp_message text, default_meta_title text,
  default_meta_description text, updated_at timestamptz not null default now()
);
insert into public.store_settings(id) values(true) on conflict do nothing;

create table public.leads (
  id uuid primary key default gen_random_uuid(), name text not null, phone text,
  email text, message text not null, product_id uuid references public.products(id) on delete set null,
  source text, status text not null default 'novo' check(status in ('novo','em_atendimento','convertido','encerrado')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null,
  action text not null, entity text not null, record_id text, old_data jsonb, new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.is_admin(required_roles public.admin_role[] default array['super_admin','admin','editor','viewer']::public.admin_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active and role=any(required_roles));
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,email,full_name) values(new.id,new.email,new.raw_user_meta_data->>'full_name') on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

do $$ declare t text; begin
  foreach t in array array['profiles','categories','environments','brands','products','promotions','banners','store_settings','leads'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'set_'||t||'_updated_at', t);
  end loop;
end $$;

create index products_public_idx on public.products(active,deleted_at,sort_order) where deleted_at is null;
create index products_category_idx on public.products(category_id);
create index products_environment_idx on public.products(environment_id);
create index product_images_order_idx on public.product_images(product_id,sort_order);
create index leads_status_idx on public.leads(status,created_at desc);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.environments enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.banners enable row level security;
alter table public.store_settings enable row level security;
alter table public.leads enable row level security;
alter table public.audit_logs enable row level security;

create policy public_read_categories on public.categories for select using(active or public.is_admin());
create policy public_read_environments on public.environments for select using(active or public.is_admin());
create policy public_read_brands on public.brands for select using(active or public.is_admin());
create policy public_read_products on public.products for select using((active and deleted_at is null) or public.is_admin());
create policy public_read_product_images on public.product_images for select using(exists(select 1 from public.products p where p.id=product_id and ((p.active and p.deleted_at is null) or public.is_admin())));
create policy public_read_promotions on public.promotions for select using((active and (start_at is null or start_at<=now()) and (end_at is null or end_at>now())) or public.is_admin());
create policy public_read_promotion_products on public.promotion_products for select using(true);
create policy public_read_banners on public.banners for select using((active and (start_at is null or start_at<=now()) and (end_at is null or end_at>now())) or public.is_admin());
create policy public_read_settings on public.store_settings for select using(true);
create policy own_profile on public.profiles for select using(id=auth.uid() or public.is_admin(array['super_admin','admin']::public.admin_role[]));
create policy submit_lead on public.leads for insert with check(status='novo' and notes is null);
create policy admin_read_leads on public.leads for select using(public.is_admin(array['super_admin','admin','viewer']::public.admin_role[]));
create policy admin_read_audit on public.audit_logs for select using(public.is_admin(array['super_admin','admin']::public.admin_role[]));

do $$ declare t text; begin
  foreach t in array array['categories','environments','brands','products','product_images','promotions','promotion_products','banners','store_settings','leads'] loop
    execute format('create policy admin_write_%I on public.%I for all using (public.is_admin(array[''super_admin'',''admin'',''editor'']::public.admin_role[])) with check (public.is_admin(array[''super_admin'',''admin'',''editor'']::public.admin_role[]))',t,t);
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('products','products',true,8388608,array['image/jpeg','image/png','image/webp']),
('site','site',true,8388608,array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy public_read_store_images on storage.objects for select using(bucket_id in ('products','site'));
create policy admin_insert_store_images on storage.objects for insert with check(bucket_id in ('products','site') and public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
create policy admin_update_store_images on storage.objects for update using(bucket_id in ('products','site') and public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
create policy admin_delete_store_images on storage.objects for delete using(bucket_id in ('products','site') and public.is_admin(array['super_admin','admin']::public.admin_role[]));

commit;

-- Depois de criar o primeiro usuário no Authentication, promova-o manualmente:
-- update public.profiles set role='super_admin', active=true where email='SEU_EMAIL';
