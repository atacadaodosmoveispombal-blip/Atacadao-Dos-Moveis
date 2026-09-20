begin;

-- Complementa o CMS/ADM sem apagar dados existentes.
-- Execute depois de 20260918_initial_store.sql e 20260919_cms_extensions.sql.

alter table public.products
  add column if not exists view_count bigint not null default 0 check (view_count >= 0);

alter table public.promotions
  add column if not exists label text;

alter table public.store_settings
  add column if not exists default_og_image_url text,
  add column if not exists primary_color text not null default '#063c9f',
  add column if not exists accent_color text not null default '#ffda18';

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type text not null default 'percent'
    check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order numeric(12,2) check (minimum_order is null or minimum_order >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  start_at timestamptz,
  end_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at > start_at)
);

create unique index if not exists coupons_code_upper_unique
  on public.coupons (upper(code));
create index if not exists coupons_active_period_idx
  on public.coupons (active, start_at, end_at);

create table if not exists public.coupon_products (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

create table if not exists public.stock_history (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  previous_quantity integer,
  new_quantity integer not null,
  change_quantity integer not null,
  reason text not null default 'ajuste_manual',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_history_product_date_idx
  on public.stock_history (product_id, created_at desc);

create table if not exists public.product_views (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  session_key text,
  source text,
  viewed_at timestamptz not null default now()
);

create index if not exists product_views_product_date_idx
  on public.product_views (product_id, viewed_at desc);
create index if not exists product_views_date_idx
  on public.product_views (viewed_at desc);

-- Atualização automática do updated_at para as novas tabelas.
drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

-- Garante no máximo quatro fotos por publicação de inspiração.
create or replace function public.enforce_inspiration_image_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.inspiration_images
    where inspiration_id = new.inspiration_id
      and (tg_op <> 'UPDATE' or id <> new.id)
  ) >= 4 then
    raise exception 'Cada inspiração pode ter no máximo 4 fotos.';
  end if;
  return new;
end;
$$;

drop trigger if exists inspiration_image_limit on public.inspiration_images;
create trigger inspiration_image_limit
before insert or update of inspiration_id on public.inspiration_images
for each row execute function public.enforce_inspiration_image_limit();

-- Registra toda alteração de quantidade em estoque.
create or replace function public.log_stock_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stock_quantity is distinct from old.stock_quantity then
    insert into public.stock_history (
      product_id, previous_quantity, new_quantity, change_quantity, user_id
    ) values (
      new.id,
      old.stock_quantity,
      new.stock_quantity,
      new.stock_quantity - old.stock_quantity,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists products_stock_history on public.products;
create trigger products_stock_history
after update of stock_quantity on public.products
for each row execute function public.log_stock_change();

-- RPC pública segura para contabilizar acesso a produto publicado.
create or replace function public.register_product_view(
  target_product_id uuid,
  visitor_session text default null,
  view_source text default 'site'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.products
    where id = target_product_id
      and active = true
      and deleted_at is null
  ) then
    return;
  end if;

  -- Evita contagens repetidas da mesma sessão no mesmo produto em 30 minutos.
  if visitor_session is not null and exists (
    select 1 from public.product_views
    where product_id = target_product_id
      and session_key = left(visitor_session, 120)
      and viewed_at > now() - interval '30 minutes'
  ) then
    return;
  end if;

  insert into public.product_views(product_id, session_key, source)
  values (target_product_id, left(visitor_session, 120), left(view_source, 100));

  update public.products
  set view_count = view_count + 1
  where id = target_product_id;
end;
$$;

revoke all on function public.register_product_view(uuid, text, text) from public;
grant execute on function public.register_product_view(uuid, text, text) to anon, authenticated;

-- Auditoria automática para os módulos gerenciados no painel.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id text;
  before_data jsonb;
  after_data jsonb;
begin
  before_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  -- A contagem de visualizações não é uma alteração editorial.
  if tg_table_name = 'products' and tg_op = 'UPDATE'
     and (before_data - array['view_count', 'updated_at'])
         = (after_data - array['view_count', 'updated_at']) then
    return new;
  end if;

  -- Funciona tanto em tabelas com id quanto nas tabelas de relacionamento.
  row_id := coalesce(
    after_data ->> 'id',
    before_data ->> 'id',
    concat_ws(':',
      coalesce(after_data ->> 'promotion_id', before_data ->> 'promotion_id',
               after_data ->> 'coupon_id', before_data ->> 'coupon_id',
               after_data ->> 'inspiration_id', before_data ->> 'inspiration_id'),
      coalesce(after_data ->> 'product_id', before_data ->> 'product_id')
    )
  );

  insert into public.audit_logs(user_id, action, entity, record_id, old_data, new_data)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    row_id,
    before_data,
    after_data
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categories', 'environments', 'brands', 'products', 'product_images',
    'promotions', 'promotion_products', 'coupons', 'coupon_products',
    'banners', 'inspirations', 'inspiration_images', 'inspiration_products',
    'site_sections', 'store_settings', 'leads', 'profiles'
  ] loop
    execute format('drop trigger if exists audit_changes on public.%I', table_name);
    execute format(
      'create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      table_name
    );
  end loop;
end;
$$;

alter table public.coupons enable row level security;
alter table public.coupon_products enable row level security;
alter table public.stock_history enable row level security;
alter table public.product_views enable row level security;

drop policy if exists public_read_active_coupons on public.coupons;
create policy public_read_active_coupons
on public.coupons for select
using (
  (
    active
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at > now())
  )
  or public.is_admin()
);

drop policy if exists public_read_coupon_products on public.coupon_products;
create policy public_read_coupon_products
on public.coupon_products for select
using (true);

drop policy if exists admin_write_coupons on public.coupons;
create policy admin_write_coupons
on public.coupons for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

drop policy if exists admin_write_coupon_products on public.coupon_products;
create policy admin_write_coupon_products
on public.coupon_products for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

drop policy if exists admin_read_stock_history on public.stock_history;
create policy admin_read_stock_history
on public.stock_history for select
using (public.is_admin());

drop policy if exists admin_read_product_views on public.product_views;
create policy admin_read_product_views
on public.product_views for select
using (public.is_admin());

-- Admins podem alterar função/status de perfis; o próprio usuário continua só lendo.
drop policy if exists admin_update_profiles on public.profiles;
create policy admin_update_profiles
on public.profiles for update
using (public.is_admin(array['super_admin','admin']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin']::public.admin_role[]));

-- Somente super_admin pode promover alguém a super_admin.
create or replace function public.protect_super_admin_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'super_admin' and coalesce(old.role, 'viewer'::public.admin_role) <> 'super_admin'
     and not public.is_admin(array['super_admin']::public.admin_role[]) then
    raise exception 'Somente um super_admin pode conceder essa função.';
  end if;
  if old.role = 'super_admin' and new.role <> 'super_admin'
     and not public.is_admin(array['super_admin']::public.admin_role[]) then
    raise exception 'Somente um super_admin pode remover essa função.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_super_admin_role on public.profiles;
create trigger protect_super_admin_role
before update of role on public.profiles
for each row execute function public.protect_super_admin_role();

-- Blocos padrão da home, sem sobrescrever personalizações existentes.
insert into public.site_sections(section_key, title, subtitle, active, sort_order)
values
  ('promotions', 'Ofertas do dia', 'Os melhores preços para aproveitar agora', true, 40),
  ('featured_products', 'Destaques', 'Produtos escolhidos para sua casa', true, 30),
  ('best_sellers', 'Mais vendidos', 'Escolhas que fazem sucesso', true, 50),
  ('new_arrivals', 'Lançamentos', 'Novidades para renovar sua casa', true, 60)
on conflict (section_key) do nothing;

commit;

-- Depois de aplicar, atualize o cache do schema se necessário no painel do Supabase:
-- NOTIFY pgrst, 'reload schema';
