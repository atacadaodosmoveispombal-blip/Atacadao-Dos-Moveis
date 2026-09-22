-- Execute no SQL Editor do Supabase com uma conta administradora.
-- Somente leitura. Uma unica tabela de resultados, sem dados pessoais ou segredos.
-- PASSOU indica que esta verificacao especifica passou; nao substitui testes de login.

with checks (item, passed) as (
  select 'RLS em todas as tabelas public',
         not exists (
           select 1
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public'
             and c.relkind in ('r', 'p')
             and not c.relrowsecurity
         )
  union all
  select 'Visitante sem escrita direta em tabelas editoriais',
         not exists (
           select 1
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public'
             and c.relkind in ('r', 'p')
             and c.relname <> 'leads'
             and (
               has_table_privilege('anon', c.oid, 'INSERT')
               or has_table_privilege('anon', c.oid, 'UPDATE')
               or has_table_privilege('anon', c.oid, 'DELETE')
             )
         )
  union all
  select 'Visitante sem alterar ou excluir leads',
         not has_table_privilege('anon', 'public.leads', 'UPDATE')
         and not has_table_privilege('anon', 'public.leads', 'DELETE')
  union all
  select 'Novos perfis inativos por padrao',
         coalesce((
           select column_default = 'false'
           from information_schema.columns
           where table_schema = 'public'
             and table_name = 'profiles'
             and column_name = 'active'
         ), false)
  union all
  select 'Funcao is_admin verifica access_approved',
         coalesce(
           pg_get_functiondef(to_regprocedure('public.is_admin(public.admin_role[])'))
             ilike '%access_approved%',
           false
         )
  union all
  select 'Funcao de cadastro inclui access_approved',
         coalesce(
           pg_get_functiondef(to_regprocedure('public.handle_new_user()'))
             ilike '%access_approved%',
           false
         )
  union all
  select 'Protecao de super admin ativa',
         exists (
           select 1
           from pg_trigger t
           join pg_class c on c.oid = t.tgrelid
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public'
             and c.relname = 'profiles'
             and t.tgname = 'protect_super_admin_role'
             and t.tgenabled <> 'D'
         )
  union all
  select 'Existe super admin ativo e aprovado',
         exists (
           select 1
           from public.profiles
           where role = 'super_admin'
             and active = true
             and access_approved = true
         )
  union all
  select 'Buckets site e brands aceitam apenas JPG PNG WebP',
         (select count(*) = 2
          from storage.buckets
          where id in ('site', 'brands')
            and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
            and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']::text[])
  union all
  select 'Preco de custo oculto do visitante',
         not exists (
           select 1 from information_schema.columns c
           where c.table_schema = 'public'
             and c.table_name = 'products'
             and c.column_name = 'cost_price'
             and has_column_privilege('anon', 'public.products', c.column_name, 'SELECT')
         )
  union all
  select 'RPC antiga de visualizacoes bloqueada ao visitante',
         not exists (
           select 1
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'register_product_view'
             and has_function_privilege('anon', p.oid, 'EXECUTE')
         )
  union all
  select 'Evento publico de visualizacao nao altera produtos',
         coalesce(
           not (pg_get_functiondef(to_regprocedure('public.record_product_view_event(uuid,uuid)')) ilike '%update public.products%'),
           false
         )
)
select item,
       case when passed then 'PASSOU' else 'PRECISA CORRECAO' end as resultado
from checks
order by item;
