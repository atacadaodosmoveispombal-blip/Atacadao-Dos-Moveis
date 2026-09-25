begin;

-- A vitrine lê sempre o catálogo público do mesmo projeto Supabase usado pelo
-- painel. Esta publicação cobre todas as tabelas que podem alterar a forma
-- como um produto é exibido, incluindo variantes, cores e mídias.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products',
    'product_images',
    'product_variants',
    'variant_images',
    'product_colors',
    'categories',
    'environments',
    'brands',
    'promotions',
    'promotion_products',
    'banners',
    'site_sections',
    'store_settings',
    'online_sales_settings',
    'inspirations',
    'inspiration_images'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I replica identity full', table_name);

      if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
         and not exists (
           select 1
           from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = table_name
         ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end if;
  end loop;
end $$;

-- Atualiza o cache de esquema do PostgREST depois da publicação das relações.
notify pgrst, 'reload schema';

commit;
