begin;

-- Keep the existing Quarto hierarchy intact. Only make sure that its existing
-- Colchões record belongs to Quarto and is available in the navigation.
do $$
declare
  quarto_id uuid;
begin
  select id into quarto_id from public.environments where slug = 'quarto';
  if quarto_id is null then
    raise exception 'O ambiente Quarto precisa existir antes desta migração.';
  end if;

  update public.categories legacy
  set environment_id = quarto_id,
      active = true,
      show_in_menu = true,
      updated_at = now()
  where legacy.slug = 'colchoes'
    and legacy.environment_id is null
    and not exists (
      select 1 from public.categories current
      where current.environment_id = quarto_id and current.slug = 'colchoes'
    );

  insert into public.categories (
    environment_id, name, slug, description, search_keywords, icon_key,
    active, sort_order, show_on_homepage, show_in_menu
  ) values (
    quarto_id, 'Colchões', 'colchoes', 'Colchões para todos os tipos de descanso',
    'Colchões, colchão, espuma, molas, D33', 'colchoes', true, 50, true, true
  )
  on conflict (environment_id, slug) where environment_id is not null
  do update set
    name = excluded.name,
    active = true,
    show_in_menu = true,
    updated_at = now();
end;
$$;

-- Eletros is a top-level environment. The requested categories below are its
-- second level; no products are created or deleted by this migration.
do $$
declare
  eletros_id uuid;
begin
  select id into eletros_id from public.environments where slug = 'eletros';
  if eletros_id is null then
    insert into public.environments (
      name, slug, description, image_url, active, sort_order
    ) values (
      'Eletros', 'eletros', 'Tecnologia e praticidade para sua rotina',
      'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=700&q=80',
      true, 60
    ) returning id into eletros_id;
  else
    update public.environments
    set name = 'Eletros', active = true, updated_at = now()
    where id = eletros_id;
  end if;

  -- Rename the old singular category in place when possible. Its product
  -- links remain unchanged, so Fogões never gains a duplicate catalogue.
  if not exists (
    select 1 from public.categories where environment_id = eletros_id and slug = 'fogoes'
  ) then
    update public.categories
    set name = 'Fogões', slug = 'fogoes',
        search_keywords = 'Fogões, fogão, cooktop, forno',
        icon_key = 'fogao', active = true, show_in_menu = true, updated_at = now()
    where environment_id = eletros_id and slug = 'fogao';
  end if;

  insert into public.categories (
    environment_id, name, slug, description, search_keywords, icon_key,
    active, sort_order, show_on_homepage, show_in_menu
  ) values
    (eletros_id, 'Fogões', 'fogoes', 'Fogões para sua cozinha', 'Fogões, fogão', 'fogao', true, 10, true, true),
    (eletros_id, 'Cooktops', 'cooktops', 'Cooktops para sua cozinha', 'Cooktop', 'fogao', true, 20, true, true),
    (eletros_id, 'Fornos', 'fornos', 'Fornos para sua cozinha', 'Forno, forno elétrico', 'fogao', true, 30, true, true),
    (eletros_id, 'Micro-ondas', 'micro-ondas', 'Micro-ondas para sua cozinha', 'Micro-ondas, microondas', 'eletros', true, 40, true, true),
    (eletros_id, 'Geladeiras', 'geladeiras', 'Geladeiras e refrigeradores', 'Geladeiras, geladeira, refrigerador', 'eletros', true, 50, true, true),
    (eletros_id, 'Freezers', 'freezers', 'Freezers para sua casa', 'Freezers, freezer', 'eletros', true, 60, true, true),
    (eletros_id, 'Máquinas de Lavar', 'maquinas-de-lavar', 'Máquinas de lavar roupas', 'Máquinas de lavar, máquina de lavar, lavadora, lava e seca, tanquinho', 'eletros', true, 70, true, true)
  on conflict (environment_id, slug) where environment_id is not null
  do update set
    name = excluded.name,
    description = excluded.description,
    search_keywords = excluded.search_keywords,
    icon_key = excluded.icon_key,
    active = true,
    sort_order = excluded.sort_order,
    show_in_menu = true,
    updated_at = now();

  -- Reclassify untyped products from the previous Eletros groups. Products
  -- with a third-level type remain untouched to preserve their detailed link.
  with targets as (
    select c.id, c.slug
    from public.categories c
    where c.environment_id = eletros_id
      and c.slug in ('fogoes','cooktops','fornos','micro-ondas','geladeiras','freezers','maquinas-de-lavar')
  ), classified as (
    select p.id,
      case
        when p.name ilike '%cooktop%' then 'cooktops'
        when p.name ilike '%micro-ondas%' or p.name ilike '%microondas%' then 'micro-ondas'
        when p.name ilike '%geladeira%' or p.name ilike '%refrigerador%' then 'geladeiras'
        when p.name ilike '%freezer%' then 'freezers'
        when p.name ilike '%lavadora%' or p.name ilike '%máquina de lavar%' or p.name ilike '%maquina de lavar%' or p.name ilike '%lava e seca%' or p.name ilike '%tanquinho%' then 'maquinas-de-lavar'
        when p.name ilike '%forno%' then 'fornos'
        when p.name ilike '%fogão%' or p.name ilike '%fogao%' then 'fogoes'
      end as target_slug
    from public.products p
    where p.environment_id = eletros_id and p.deleted_at is null and p.type_id is null
  )
  update public.products p
  set category_id = target.id, environment_id = eletros_id, updated_at = now()
  from classified source
  join targets target on target.slug = source.target_slug
  where p.id = source.id and source.target_slug is not null;

  -- Legacy groups stay stored for audit and product history, but no longer
  -- appear as parallel menu choices under Eletros.
  update public.categories
  set active = false, show_in_menu = false, show_on_homepage = false, updated_at = now()
  where environment_id = eletros_id
    and slug not in ('fogoes','cooktops','fornos','micro-ondas','geladeiras','freezers','maquinas-de-lavar');
end;
$$;

commit;
