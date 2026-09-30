begin;

-- Terceiro nivel opcional: ambiente -> subcategoria (categories) -> tipo.
-- Nenhum produto ou categoria existente e reclassificado por esta migracao.
create table public.category_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  slug text not null check (length(btrim(slug)) > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_types_category_slug_key unique (category_id, slug)
);

create index category_types_navigation_idx
  on public.category_types (category_id, active, sort_order, name);

create trigger set_category_types_updated_at
before update on public.category_types
for each row execute function public.set_updated_at();

alter table public.products
  add column type_id uuid references public.category_types(id) on delete set null;

create index products_type_idx on public.products (type_id)
  where type_id is not null and deleted_at is null;

-- Impede associar um produto a um tipo de outra subcategoria. Um tipo
-- ausente continua valido para produtos antigos e subcategorias sem tipos.
create function public.validate_product_category_type()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.category_id is null then
    new.type_id := null;
  elsif new.type_id is not null and not exists (
    select 1 from public.category_types t
    where t.id = new.type_id and t.category_id = new.category_id
  ) then
    raise exception 'O tipo selecionado nao pertence a subcategoria do produto.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger products_validate_category_type
before insert or update of category_id, type_id on public.products
for each row execute function public.validate_product_category_type();

alter table public.category_types enable row level security;

create policy category_types_read on public.category_types
for select to anon, authenticated
using (active or public.is_admin());

create policy category_types_insert on public.category_types
for insert to authenticated
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

create policy category_types_update on public.category_types
for update to authenticated
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

create policy category_types_delete on public.category_types
for delete to authenticated
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

-- Grants explicitos: RLS continua controlando quais linhas sao acessiveis.
revoke all on public.category_types from public, anon, authenticated;
grant select on public.category_types to anon;
grant select, insert, update, delete on public.category_types to authenticated;

comment on table public.category_types is 'Tipos opcionais vinculados a uma subcategoria do catalogo.';
comment on column public.products.type_id is 'Tipo opcional dentro da subcategoria (category_id).';

commit;
