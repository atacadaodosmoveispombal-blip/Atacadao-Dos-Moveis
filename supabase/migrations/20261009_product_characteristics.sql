begin;

-- Características informativas do produto. Estes campos não representam
-- variações de compra e não podem alterar cor, preço, estoque ou imagens.
alter table public.products
  add column if not exists mirror_feature text,
  add column if not exists ribbed_feature text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_mirror_feature_check'
  ) then
    alter table public.products
      add constraint products_mirror_feature_check
      check (mirror_feature is null or mirror_feature in ('with', 'without'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_ribbed_feature_check'
  ) then
    alter table public.products
      add constraint products_ribbed_feature_check
      check (ribbed_feature is null or ribbed_feature in ('with', 'without'));
  end if;
end;
$$;

-- Converte somente grupos antigos que possuam uma única alternativa ativa e
-- reconhecida. Casos ambíguos permanecem intactos para revisão administrativa.
with legacy_mirror as (
  select
    g.product_id,
    case
      when count(*) filter (where v.active and lower(v.slug) in ('com-espelho', 'sem-espelho')) = 1
        then max(case
          when v.active and lower(v.slug) = 'com-espelho' then 'with'
          when v.active and lower(v.slug) = 'sem-espelho' then 'without'
        end)
    end as feature
  from public.product_option_groups g
  join public.product_option_values v on v.option_group_id = g.id
  where lower(g.slug) = 'espelho'
  group by g.product_id
)
update public.products p
set mirror_feature = legacy_mirror.feature
from legacy_mirror
where p.id = legacy_mirror.product_id
  and p.mirror_feature is null
  and legacy_mirror.feature is not null;

with legacy_ribbed as (
  select
    g.product_id,
    case
      when count(*) filter (where v.active and lower(v.slug) in ('com-ripado', 'sem-ripado')) = 1
        then max(case
          when v.active and lower(v.slug) = 'com-ripado' then 'with'
          when v.active and lower(v.slug) = 'sem-ripado' then 'without'
        end)
    end as feature
  from public.product_option_groups g
  join public.product_option_values v on v.option_group_id = g.id
  where lower(g.slug) = 'ripado'
  group by g.product_id
)
update public.products p
set ribbed_feature = legacy_ribbed.feature
from legacy_ribbed
where p.id = legacy_ribbed.product_id
  and p.ribbed_feature is null
  and legacy_ribbed.feature is not null;

-- Mantém os registros históricos, mas deixa de expô-los como opções de compra.
update public.product_option_groups
set active = false
where lower(slug) in ('espelho', 'ripado')
  and active;

-- As opções selecionáveis futuras continuam funcionando, porém os grupos
-- reservados acima nunca são apagados nem recriados por este fluxo.
create or replace function public.replace_product_options(target_product_id uuid, option_groups jsonb)
returns void
language plpgsql
security definer
set search_path = ''
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
  if not exists(
    select 1 from public.products
    where id = target_product_id and deleted_at is null
  ) then
    raise exception 'Produto não encontrado';
  end if;
  if jsonb_typeof(coalesce(option_groups, '[]'::jsonb)) <> 'array' then
    raise exception 'As opções do produto devem ser uma lista';
  end if;

  delete from public.product_option_groups
  where product_id = target_product_id
    and lower(slug) not in ('espelho', 'ripado');

  for group_item in
    select value from jsonb_array_elements(coalesce(option_groups, '[]'::jsonb))
  loop
    group_name := btrim(coalesce(group_item->>'name', ''));
    group_slug := btrim(coalesce(group_item->>'slug', ''));
    if group_name = '' or group_slug = '' then
      raise exception 'Nome e identificador do grupo são obrigatórios';
    end if;
    if lower(group_slug) in ('espelho', 'ripado') then
      raise exception 'Espelho e Ripado são características informativas do produto';
    end if;
    if jsonb_typeof(coalesce(group_item->'values', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(group_item->'values', '[]'::jsonb)) = 0 then
      raise exception 'Cada opção precisa ter pelo menos uma alternativa';
    end if;

    insert into public.product_option_groups(product_id, name, slug, display_order, active)
    values(target_product_id, group_name, group_slug, group_position, true)
    returning id into saved_group_id;

    value_position := 0;
    for value_item in select value from jsonb_array_elements(group_item->'values')
    loop
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

comment on column public.products.mirror_feature is
  'Característica informativa: with = com espelho; without = sem espelho.';
comment on column public.products.ribbed_feature is
  'Característica informativa: with = com ripado; without = sem ripado.';
comment on table public.product_option_groups is
  'Grupos realmente selecionáveis pelo cliente; Espelho e Ripado são características em products.';

commit;
