begin;

-- Amplia somente os banners da Hero para suportar imagem ou vídeo.
-- Registros antigos continuam funcionando como slides de imagem.
alter table public.banners
  add column if not exists internal_title text,
  add column if not exists media_type text not null default 'image',
  add column if not exists video_desktop_url text,
  add column if not exists video_mobile_url text,
  add column if not exists poster_url text;

update public.banners
set internal_title = title
where internal_title is null or trim(internal_title) = '';

alter table public.banners
  drop constraint if exists banners_media_type_check,
  add constraint banners_media_type_check
    check (media_type in ('image', 'video'));

-- O mesmo bucket público continua sendo usado. O limite maior vale para
-- vídeos; imagens seguem validadas e otimizadas pelo painel antes do upload.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners',
  'banners',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.banners.internal_title is
  'Nome administrativo do slide, não usado como texto visível na mídia.';
comment on column public.banners.media_type is
  'Tipo da mídia principal do slide: image ou video.';
comment on column public.banners.video_desktop_url is
  'Vídeo principal da Hero em MP4 ou WebM.';
comment on column public.banners.video_mobile_url is
  'Vídeo mobile opcional; quando ausente, usa o vídeo desktop.';
comment on column public.banners.poster_url is
  'Imagem de capa e fallback do vídeo da Hero.';

commit;
