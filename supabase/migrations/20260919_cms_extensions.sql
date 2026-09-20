begin;

create table if not exists public.inspirations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  environment_id uuid references public.environments(id) on delete set null,
  cover_image text,
  active boolean not null default true,
  sort_order integer not null default 0,
  meta_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspiration_images (
  id uuid primary key default gen_random_uuid(),
  inspiration_id uuid not null references public.inspirations(id) on delete cascade,
  image_url text not null,
  storage_path text not null unique,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inspiration_products (
  inspiration_id uuid references public.inspirations(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  primary key(inspiration_id,product_id)
);

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text,
  subtitle text,
  content jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_sections(section_key,title,active,sort_order) values
('hero','Hero',true,10),('environments','Ambientes',true,20),
('featured_products','Produtos em destaque',true,30),('promotions','Promoções',true,40),
('best_sellers','Mais vendidos',true,50),('new_arrivals','Lançamentos',true,60),
('inspirations','Inspirações',true,70),('institutional','Institucional',true,80)
on conflict(section_key) do nothing;

create index if not exists inspirations_public_idx on public.inspirations(active,sort_order);
create index if not exists inspiration_images_order_idx on public.inspiration_images(inspiration_id,sort_order);
create index if not exists site_sections_order_idx on public.site_sections(active,sort_order);

drop trigger if exists set_inspirations_updated_at on public.inspirations;
create trigger set_inspirations_updated_at before update on public.inspirations
for each row execute function public.set_updated_at();
drop trigger if exists set_site_sections_updated_at on public.site_sections;
create trigger set_site_sections_updated_at before update on public.site_sections
for each row execute function public.set_updated_at();

alter table public.inspirations enable row level security;
alter table public.inspiration_images enable row level security;
alter table public.inspiration_products enable row level security;
alter table public.site_sections enable row level security;

drop policy if exists public_read_inspirations on public.inspirations;
create policy public_read_inspirations on public.inspirations for select using(active or public.is_admin());
drop policy if exists public_read_inspiration_images on public.inspiration_images;
create policy public_read_inspiration_images on public.inspiration_images for select using(exists(select 1 from public.inspirations i where i.id=inspiration_id and (i.active or public.is_admin())));
drop policy if exists public_read_inspiration_products on public.inspiration_products;
create policy public_read_inspiration_products on public.inspiration_products for select using(true);
drop policy if exists public_read_site_sections on public.site_sections;
create policy public_read_site_sections on public.site_sections for select using(active or public.is_admin());

drop policy if exists admin_write_inspirations on public.inspirations;
create policy admin_write_inspirations on public.inspirations for all using(public.is_admin(array['super_admin','admin','editor']::public.admin_role[])) with check(public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
drop policy if exists admin_write_inspiration_images on public.inspiration_images;
create policy admin_write_inspiration_images on public.inspiration_images for all using(public.is_admin(array['super_admin','admin','editor']::public.admin_role[])) with check(public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
drop policy if exists admin_write_inspiration_products on public.inspiration_products;
create policy admin_write_inspiration_products on public.inspiration_products for all using(public.is_admin(array['super_admin','admin','editor']::public.admin_role[])) with check(public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
drop policy if exists admin_write_site_sections on public.site_sections;
create policy admin_write_site_sections on public.site_sections for all using(public.is_admin(array['super_admin','admin','editor']::public.admin_role[])) with check(public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('categories','categories',true,8388608,array['image/jpeg','image/png','image/webp']),
('environments','environments',true,8388608,array['image/jpeg','image/png','image/webp']),
('brands','brands',true,4194304,array['image/jpeg','image/png','image/webp','image/svg+xml']),
('banners','banners',true,8388608,array['image/jpeg','image/png','image/webp']),
('inspirations','inspirations',true,8388608,array['image/jpeg','image/png','image/webp']),
('avatars','avatars',false,4194304,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists public_read_cms_images on storage.objects;
create policy public_read_cms_images on storage.objects for select using(bucket_id in ('categories','environments','brands','banners','inspirations'));
drop policy if exists admin_manage_cms_images on storage.objects;
create policy admin_manage_cms_images on storage.objects for all using(bucket_id in ('categories','environments','brands','banners','inspirations','avatars') and public.is_admin(array['super_admin','admin','editor']::public.admin_role[])) with check(bucket_id in ('categories','environments','brands','banners','inspirations','avatars') and public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

commit;
