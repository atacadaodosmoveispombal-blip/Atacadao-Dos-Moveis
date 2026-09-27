begin;

-- Opções selecionáveis independentes de cor, preço, estoque e imagens.
-- Exemplos: Espelho, Ripado, Pés, quantidade de portas e LED.
create table if not exists public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  slug text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(name) <> ''),
  check (btrim(slug) <> ''),
  check (display_order >= 0),
  unique(product_id, slug)
);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.product_option_groups(id) on delete cascade,
  label text not null,
  slug text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(label) <> ''),
  check (btrim(slug) <> ''),
  check (display_order >= 0),
  unique(option_group_id, slug)
);

create index if not exists product_option_groups_product_order_idx
  on public.product_option_groups(product_id, display_order, created_at);
create index if not exists product_option_values_group_order_idx
  on public.product_option_values(option_group_id, display_order, created_at);

drop trigger if exists set_product_option_groups_updated_at on public.product_option_groups;
create trigger set_product_option_groups_updated_at before update on public.product_option_groups
for each row execute function public.set_updated_at();
drop trigger if exists set_product_option_values_updated_at on public.product_option_values;
create trigger set_product_option_values_updated_at before update on public.product_option_values
for each row execute function public.set_updated_at();

alter table public.product_option_groups enable row level security;
alter table public.product_option_values enable row level security;

drop policy if exists public_read_product_option_groups on public.product_option_groups;
create policy public_read_product_option_groups on public.product_option_groups for select
using (
  active and exists (
    select 1 from public.products p
    where p.id = product_id and p.active and p.deleted_at is null
  )
);

drop policy if exists public_read_product_option_values on public.product_option_values;
create policy public_read_product_option_values on public.product_option_values for select
using (
  active and exists (
    select 1
    from public.product_option_groups g
    join public.products p on p.id = g.product_id
    where g.id = option_group_id and g.active and p.active and p.deleted_at is null
  )
);

drop policy if exists admin_write_product_option_groups on public.product_option_groups;
create policy admin_write_product_option_groups on public.product_option_groups for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

drop policy if exists admin_write_product_option_values on public.product_option_values;
create policy admin_write_product_option_values on public.product_option_values for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

grant select on public.product_option_groups, public.product_option_values to anon, authenticated;
grant insert, update, delete on public.product_option_groups, public.product_option_values to authenticated;

-- Substitui todas as opções de um produto em uma única transação.
create or replace function public.replace_product_options(target_product_id uuid, option_groups jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  group_item jsonb;
  value_item jsonb;
  saved_group_id uuid;
  group_position integer := 0;
  value_position integer;
  group_name text;
  group_slug text;
  value_label text;
  value_slug text;
begin
  if not public.is_admin(array['super_admin','admin','editor']::public.admin_role[]) then
    raise exception 'Acesso negado';
  end if;
  if not exists(select 1 from public.products where id = target_product_id and deleted_at is null) then
    raise exception 'Produto não encontrado';
  end if;
  if jsonb_typeof(coalesce(option_groups, '[]'::jsonb)) <> 'array' then
    raise exception 'As opções do produto devem ser uma lista';
  end if;

  delete from public.product_option_groups where product_id = target_product_id;

  for group_item in select value from jsonb_array_elements(coalesce(option_groups, '[]'::jsonb)) loop
    group_name := btrim(coalesce(group_item->>'name', ''));
    group_slug := btrim(coalesce(group_item->>'slug', ''));
    if group_name = '' or group_slug = '' then
      raise exception 'Nome e identificador do grupo são obrigatórios';
    end if;
    if jsonb_typeof(coalesce(group_item->'values', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(group_item->'values', '[]'::jsonb)) = 0 then
      raise exception 'Cada opção precisa ter pelo menos uma alternativa';
    end if;

    insert into public.product_option_groups(product_id, name, slug, display_order, active)
    values(target_product_id, group_name, group_slug, group_position, true)
    returning id into saved_group_id;

    value_position := 0;
    for value_item in select value from jsonb_array_elements(group_item->'values') loop
      value_label := btrim(coalesce(value_item->>'label', ''));
      value_slug := btrim(coalesce(value_item->>'slug', ''));
      if value_label = '' or value_slug = '' then
        raise exception 'Nome e identificador da alternativa são obrigatórios';
      end if;
      insert into public.product_option_values(option_group_id, label, slug, display_order, active)
      values(saved_group_id, value_label, value_slug, value_position, true);
      value_position := value_position + 1;
    end loop;
    group_position := group_position + 1;
  end loop;
end;
$$;

revoke all on function public.replace_product_options(uuid, jsonb) from public;
grant execute on function public.replace_product_options(uuid, jsonb) to authenticated;

comment on table public.product_option_groups is
  'Grupos selecionáveis independentes de cores, como Espelho e Ripado.';
comment on table public.product_option_values is
  'Alternativas disponíveis em cada grupo de opções do produto.';

commit;
