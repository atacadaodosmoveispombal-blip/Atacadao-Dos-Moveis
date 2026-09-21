begin;

-- Finaliza o schema consumido pelo gerenciador de campanhas sem substituir
-- registros, imagens ou relacionamentos existentes.
alter table public.banners
  add column if not exists campaign_type text not null default 'custom',
  add column if not exists content_mode text not null default 'banner',
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists promotion_id uuid references public.promotions(id) on delete set null,
  add column if not exists link_type text not null default 'link',
  add column if not exists alignment text not null default 'left',
  add column if not exists display_locations text[] not null default array['home']::text[],
  add column if not exists draft boolean not null default false,
  add column if not exists paused boolean not null default false,
  add column if not exists auto_include_category boolean not null default false,
  add column if not exists deactivate_on_end boolean not null default true,
  add column if not exists keep_products_after_end boolean not null default true;

alter table public.promotions
  add column if not exists promotion_type text not null default 'display_only',
  add column if not exists discount_value numeric(12,2),
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists selection_mode text not null default 'manual',
  add column if not exists auto_include_category boolean not null default false;

create index if not exists banners_campaign_status_idx
  on public.banners(draft, paused, active, start_at, end_at);
create index if not exists banners_campaign_category_idx
  on public.banners(category_id);
create index if not exists banners_campaign_promotion_idx
  on public.banners(promotion_id);
create index if not exists promotions_campaign_category_idx
  on public.promotions(category_id);

-- Mantém a posição dos banners antigos compatível com o novo editor.
update public.banners
set display_locations = case position
  when 'home_hero' then array['home_hero']::text[]
  when 'home_middle' then array['home_middle']::text[]
  when 'home_bottom' then array['home_bottom']::text[]
  else array['home']::text[]
end
where display_locations = array['home']::text[];

-- Reafirma os buckets usados nesta etapa. O upsert não remove objetos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('products','products',true,8388608,array['image/jpeg','image/png','image/webp']),
  ('categories','categories',true,8388608,array['image/jpeg','image/png','image/webp']),
  ('banners','banners',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Editores já podem cadastrar e substituir fotos; também precisam remover
-- o objeto antigo para não deixar arquivos órfãos.
drop policy if exists admin_delete_store_images on storage.objects;
create policy admin_delete_store_images
on storage.objects for delete
using (
  bucket_id in ('products','site')
  and public.is_admin(array['super_admin','admin','editor']::public.admin_role[])
);

-- Garante atualização automática do site para todas as entidades editoriais.
do $$
declare
  table_name text;
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach table_name in array array[
      'products','product_images','categories','environments','banners',
      'promotions','promotion_products','site_sections','store_settings',
      'inspirations','inspiration_images'
    ] loop
      if not exists(
        select 1
        from pg_publication_tables
        where pubname='supabase_realtime'
          and schemaname='public'
          and tablename=table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;

commit;
