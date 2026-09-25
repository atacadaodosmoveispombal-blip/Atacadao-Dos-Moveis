begin;

-- Evolui a galeria existente sem mover ou apagar nenhuma foto cadastrada.
-- image_url continua sendo a URL canônica da mídia para manter compatibilidade
-- com o painel e com integrações antigas.
alter table public.product_images
  add column if not exists media_type text not null default 'image',
  add column if not exists poster_url text,
  add column if not exists poster_storage_path text;

update public.product_images
set media_type = 'image'
where media_type is null or media_type not in ('image', 'video');

alter table public.product_images
  drop constraint if exists product_images_media_type_check,
  add constraint product_images_media_type_check
    check (media_type in ('image', 'video')),
  drop constraint if exists product_images_cover_must_be_image_check,
  add constraint product_images_cover_must_be_image_check
    check (not is_cover or media_type = 'image');

comment on column public.product_images.image_url is
  'URL publica da midia do produto. Mantem o nome legado para compatibilidade.';
comment on column public.product_images.media_type is
  'Tipo da midia da galeria: image ou video.';
comment on column public.product_images.poster_url is
  'Poster WebP opcional gerado para videos.';

-- Somente o bucket de produtos passa a aceitar video. Os demais buckets
-- continuam com as regras atuais exclusivas para imagens.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
