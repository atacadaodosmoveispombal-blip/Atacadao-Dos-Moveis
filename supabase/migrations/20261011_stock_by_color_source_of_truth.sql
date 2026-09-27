begin;

-- Every product with a confirmed origin colour must have a sellable origin
-- variant. The statements deliberately avoid temporary tables because hosted
-- SQL executors may run each statement in a different database session.
update public.product_variants variant
set default_variant = false
where variant.default_variant
  and exists (
    select 1
    from public.products product
    where product.id = variant.product_id
      and product.deleted_at is null
      and product.origin_color_id is not null
      and not exists (
        select 1
        from public.product_variants origin_variant
        where origin_variant.product_id = product.id
          and origin_variant.color_id = product.origin_color_id
          and origin_variant.combination_color_id is null
      )
  );

-- For legacy rows, preserve the existing aggregate quantity by assigning only
-- the still-unrepresented remainder to the newly-created origin colour.
with missing_origin as (
  select
    product.id as product_id,
    product.origin_color_id as color_id,
    color.name as color_name,
    color.hex as color_hex,
    color.secondary_hex,
    greatest(
      coalesce(product.stock_quantity, 0) - coalesce((
        select sum(existing_variant.stock)::integer
        from public.product_variants existing_variant
        where existing_variant.product_id = product.id
      ), 0),
      0
    )::integer as preserved_stock
  from public.products product
  join public.product_colors color on color.id = product.origin_color_id
  where product.deleted_at is null
    and not exists (
      select 1
      from public.product_variants origin_variant
      where origin_variant.product_id = product.id
        and origin_variant.color_id = product.origin_color_id
        and origin_variant.combination_color_id is null
    )
)
insert into public.product_variants (
  product_id, name, type, sku, color_name, swatch_mode, color_hex,
  secondary_color_hex, stock, low_stock_threshold, active,
  default_variant, display_order, color_id, combination_color_id
)
select
  backfill.product_id,
  backfill.color_name,
  'color',
  null,
  backfill.color_name,
  'simple',
  backfill.color_hex,
  backfill.secondary_hex,
  backfill.preserved_stock,
  0,
  true,
  true,
  0,
  backfill.color_id,
  null
from missing_origin backfill;

-- A selected colour remains visible on the storefront. Quantity zero is the
-- only availability switch, so one colour can sell out without hiding others.
update public.product_variants
set active = true
where type = 'color' and active is distinct from true;

update public.products product
set variants_enabled = true,
    variation_type = 'color'
where product.origin_color_id is not null
  and exists (select 1 from public.product_variants variant where variant.product_id = product.id);

create or replace function public.enforce_color_variant_stock_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'color' then
    new.active := true;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_color_variant_stock_availability on public.product_variants;
create trigger enforce_color_variant_stock_availability
before insert or update of type, active on public.product_variants
for each row execute function public.enforce_color_variant_stock_availability();

-- products.stock_quantity is retained as a compatible aggregate for lists,
-- reports and checkout. It is derived and cannot compete with colour stock.
create or replace function public.derive_product_stock_from_colors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.variants_enabled and exists (
    select 1 from public.product_variants variant where variant.product_id = new.id
  ) then
    new.stock_quantity := coalesce((
      select sum(variant.stock)::integer
      from public.product_variants variant
      where variant.product_id = new.id
    ), 0);
  end if;
  return new;
end;
$$;

drop trigger if exists derive_product_stock_from_colors on public.products;
create trigger derive_product_stock_from_colors
before update of stock_quantity, variants_enabled on public.products
for each row execute function public.derive_product_stock_from_colors();

create or replace function public.sync_product_variant_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_product uuid;
begin
  target_product := case when tg_op = 'DELETE' then old.product_id else new.product_id end;
  update public.products product set stock_quantity = coalesce((
    select sum(variant.stock)::integer from public.product_variants variant
    where variant.product_id = target_product
  ), 0), updated_at = now()
  where product.id = target_product and product.variants_enabled;
  return null;
end;
$$;

-- Recalculate every aggregate after the safe backfill.
update public.products product
set stock_quantity = coalesce((
  select sum(variant.stock)::integer
  from public.product_variants variant
  where variant.product_id = product.id
), 0)
where product.variants_enabled
  and exists (select 1 from public.product_variants variant where variant.product_id = product.id);

comment on column public.products.stock_quantity is
  'Derived aggregate of product_variants.stock for products with colour variations. Edit colour stock, never this aggregate.';
comment on column public.product_variants.stock is
  'Single source of truth for the quantity available in this colour variation. Zero means unavailable.';

commit;
