-- Explicitly separates the product's original colour/gallery from optional
-- colour variations. Existing products intentionally remain unassigned: an
-- administrator must confirm the real colour instead of the migration guessing.

alter table public.products
  add column if not exists origin_color_id uuid;

alter table public.product_images
  add column if not exists color_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'products_origin_color_id_fkey'
       and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_origin_color_id_fkey
      foreign key (origin_color_id)
      references public.product_colors(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'product_images_color_id_fkey'
       and conrelid = 'public.product_images'::regclass
  ) then
    alter table public.product_images
      add constraint product_images_color_id_fkey
      foreign key (color_id)
      references public.product_colors(id)
      on delete restrict;
  end if;
end
$$;

create index if not exists idx_products_origin_color_id
  on public.products(origin_color_id);

create index if not exists idx_product_images_color_id
  on public.product_images(color_id);

comment on column public.products.origin_color_id is
  'Mandatory in the admin workflow. The confirmed real colour represented by the main product gallery. Null is retained only for legacy products pending manual correction.';

comment on column public.product_images.color_id is
  'Colour represented by this product gallery item. Main gallery media is assigned to products.origin_color_id; variation media remains in variant_images.';

-- Deliberately no UPDATE/backfill here. A default variant is not reliable
-- evidence of the real colour shown in legacy product photography.
