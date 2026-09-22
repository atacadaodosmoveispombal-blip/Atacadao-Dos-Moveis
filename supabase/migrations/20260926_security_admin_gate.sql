-- Prepared for the production security rollout. Apply only after a verified database
-- and Storage backup, a list of approved administrators, and a restore rehearsal.
-- This file is NOT executed by the Vercel build.
begin;

alter table public.profiles
  add column if not exists access_approved boolean not null default false;

-- Existing active admins/editors retain access. Existing viewers must be reviewed
-- individually; self-registered accounts do not become approved by this backfill.
update public.profiles
set access_approved = true
where active = true
  and role in ('super_admin', 'admin', 'editor')
  and access_approved = false;

alter table public.profiles alter column active set default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, email, full_name, role, active, access_approved)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name',
          'viewer'::public.admin_role, false, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.is_admin(
  required_roles public.admin_role[] default array['super_admin','admin','editor','viewer']::public.admin_role[]
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.access_approved = true
      and p.role = any(required_roles)
  );
$$;

-- An ordinary admin may manage users, but cannot disable an approved super admin.
create or replace function public.protect_super_admin_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'super_admin' and old.role <> 'super_admin'
     and not public.is_admin(array['super_admin']::public.admin_role[]) then
    raise exception 'Somente um super_admin pode conceder essa função.';
  end if;
  if old.role = 'super_admin'
     and not public.is_admin(array['super_admin']::public.admin_role[])
     and (new.role is distinct from old.role
          or new.active is distinct from old.active
          or new.access_approved is distinct from old.access_approved) then
    raise exception 'Somente um super_admin pode alterar esse perfil.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_super_admin_role on public.profiles;
create trigger protect_super_admin_role
before update of role, active, access_approved on public.profiles
for each row execute function public.protect_super_admin_role();

-- Explicit grants complement RLS. Anonymous visitors only submit leads through
-- the existing constrained INSERT policy; editorial tables are read-only to anon.
revoke insert, update, delete on table
  public.profiles, public.categories, public.environments, public.brands,
  public.products, public.product_images, public.promotions,
  public.promotion_products, public.banners, public.store_settings,
  public.audit_logs, public.inspirations, public.inspiration_images,
  public.inspiration_products, public.site_sections, public.coupons,
  public.coupon_products, public.stock_history, public.product_views,
  public.online_sales_settings, public.orders, public.order_items,
  public.stock_reservations, public.order_events, public.payment_webhook_events
from anon;
revoke update, delete on table public.leads from anon;

-- These records are written only by trusted triggers, RPCs or the payment backend.
revoke insert, update, delete on table
  public.audit_logs, public.stock_history, public.product_views,
  public.orders, public.order_items, public.stock_reservations,
  public.order_events, public.payment_webhook_events
from authenticated;

-- The editor produces raster WebP; prevent new SVG objects in public buckets.
-- Existing objects are not deleted by this migration and need a separate review.
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id in ('site', 'brands');

commit;
