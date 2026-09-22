-- Auditoria somente leitura. Execute no SQL Editor com conta autorizada.
-- Não retorna e-mails, senhas, chaves, tokens nem valores comerciais.

-- RLS de todas as tabelas expostas em public.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p')
order by c.relname;

-- Grants efetivos aos papéis usados pela API.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

-- Policies por operação, incluindo as de Storage.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

-- Funções SECURITY DEFINER expostas na API pública.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;

-- Apenas agregados de perfis: revisar viewers ativos e não aprovados.
select role, active, count(*) as total
from public.profiles
group by role, active
order by role, active;

-- Buckets: tamanho, MIME e visibilidade.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;

-- Resumo de relacionamentos e índices.
select conrelid::regclass as table_name, conname as constraint_name,
       confrelid::regclass as referenced_table
from pg_constraint
where contype = 'f' and connamespace = 'public'::regnamespace
order by conrelid::regclass::text, conname;
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
