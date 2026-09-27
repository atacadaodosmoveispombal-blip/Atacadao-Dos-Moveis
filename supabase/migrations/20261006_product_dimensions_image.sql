-- Foto gerada com as medidas do produto.
--
-- A referência continua normalizada em product_images: a linha com
-- image_role = 'dimensions' é a imagem_com_medidas do produto. Fotos já
-- existentes recebem o papel gallery e não são removidas ou sobrescritas.

alter table public.product_images
  add column if not exists image_role text;

update public.product_images
set image_role = 'gallery'
where image_role is null
   or image_role not in ('gallery', 'dimensions');

alter table public.product_images
  alter column image_role set default 'gallery';

alter table public.product_images
  alter column image_role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_images_image_role_check'
      and conrelid = 'public.product_images'::regclass
  ) then
    alter table public.product_images
      add constraint product_images_image_role_check
      check (image_role in ('gallery', 'dimensions'));
  end if;
end
$$;

create unique index if not exists product_images_one_dimensions_image_per_product
  on public.product_images (product_id)
  where image_role = 'dimensions';

create index if not exists product_images_product_role_idx
  on public.product_images (product_id, image_role);

comment on column public.product_images.image_role is
  'gallery para fotos originais/galeria; dimensions para a versão gerada com as medidas.';
