begin;

-- Link only verified products already present in the live catalog. No products,
-- media or categories are created or deleted by this migration.
do $$
declare
  wardrobe_count integer;
  corner_sofa_count integer;
begin
  select count(*) into wardrobe_count
  from public.products p
  join public.categories c on c.id = p.category_id
  join public.environments e on e.id = c.environment_id
  where e.slug = 'quarto' and c.slug = 'roupeiro'
    and p.active and p.deleted_at is null;
  if wardrobe_count <> 51 then
    raise exception 'Inventario de roupeiros mudou: esperado 51, encontrado %', wardrobe_count;
  end if;

  select count(*) into corner_sofa_count
  from public.products p
  join public.categories c on c.id = p.category_id
  join public.environments e on e.id = c.environment_id
  where e.slug = 'sala' and c.slug in ('sofa-canto', 'sofa')
    and p.id in (
      'ad9a7fcf-60f6-4072-af08-18696ba94b34'::uuid,
      'dd4fbada-890b-4ce0-89c0-b35e8b01cacd'::uuid,
      '0c361a4c-c582-45de-94a5-1820793550d5'::uuid
    )
    and p.active and p.deleted_at is null and p.type_id is null;
  if corner_sofa_count <> 3 then
    raise exception 'Inventario de sofas de canto mudou: esperado 3, encontrado %', corner_sofa_count;
  end if;

  if not exists (
    select 1 from public.categories c
    join public.environments e on e.id = c.environment_id
    where e.slug = 'sala' and c.slug = 'sofa'
  ) then
    raise exception 'Subcategoria Sala > Sofa ausente.';
  end if;
end;
$$;

-- These three real corner sofas were placed in a separate subcategory, while
-- the requested type belongs below Sala > Sofa. Preserve the old category row.
update public.products p
set category_id = target.id
from public.categories target
join public.environments e on e.id = target.environment_id
where e.slug = 'sala' and target.slug = 'sofa'
  and p.id in (
    'ad9a7fcf-60f6-4072-af08-18696ba94b34'::uuid,
    'dd4fbada-890b-4ce0-89c0-b35e8b01cacd'::uuid,
    '0c361a4c-c582-45de-94a5-1820793550d5'::uuid
  )
  and p.category_id <> target.id;

insert into public.product_category_types (product_id, category_type_id)
select p.id, t.id
from public.products p
join public.categories c on c.id = p.category_id
join public.environments e on e.id = c.environment_id
join public.category_types t on t.category_id = c.id and t.slug = 'sofa-de-canto'
where e.slug = 'sala' and c.slug = 'sofa'
  and p.id in (
    'ad9a7fcf-60f6-4072-af08-18696ba94b34'::uuid,
    'dd4fbada-890b-4ce0-89c0-b35e8b01cacd'::uuid,
    '0c361a4c-c582-45de-94a5-1820793550d5'::uuid
  )
on conflict do nothing;

-- The old wardrobe types and the explicit mirror characteristic provide
-- verifiable classifications for the new types. Size and "Casal" are left
-- untouched because the catalog does not establish those facts reliably.
insert into public.product_category_types (product_id, category_type_id)
select distinct p.id, t.id
from public.products p
join public.categories c on c.id = p.category_id
join public.environments e on e.id = c.environment_id
join public.category_types legacy on legacy.id = p.type_id
join public.category_types t on t.category_id = c.id
where e.slug = 'quarto' and c.slug = 'roupeiro'
  and p.active and p.deleted_at is null
  and (
    (t.slug = 'porta-de-bater' and legacy.slug = 'roupeiro-de-bater')
    or (t.slug = 'porta-de-correr' and (legacy.slug = 'roupeiro-de-correr' or p.name ilike '%correr%'))
    or (t.slug = 'solteiro' and legacy.slug = 'roupeiro-solteiro-3-4-portas')
    or (t.slug = 'com-espelho' and p.mirror_feature = 'with')
  )
on conflict do nothing;

-- Abort the whole transaction if the source taxonomy differs from the audited
-- one or a target type is missing.
do $$
declare
  results record;
begin
  for results in
    with expected(environment_slug, category_slug, type_slug, minimum) as (
      values
        ('sala','sofa','sofa-de-canto',3),
        ('quarto','roupeiro','porta-de-bater',21),
        ('quarto','roupeiro','porta-de-correr',20),
        ('quarto','roupeiro','solteiro',12),
        ('quarto','roupeiro','com-espelho',3)
    )
    select expected.type_slug, expected.minimum, count(pct.product_id) as actual
    from expected
    left join public.environments e on e.slug = expected.environment_slug
    left join public.categories c on c.environment_id = e.id and c.slug = expected.category_slug
    left join public.category_types t on t.category_id = c.id and t.slug = expected.type_slug
    left join public.product_category_types pct on pct.category_type_id = t.id
    group by expected.type_slug, expected.minimum
  loop
    if results.actual < results.minimum then
      raise exception 'Vinculos de % incompletos: esperado ao menos %, encontrado %',
        results.type_slug, results.minimum, results.actual;
    end if;
  end loop;
end;
$$;

commit;
