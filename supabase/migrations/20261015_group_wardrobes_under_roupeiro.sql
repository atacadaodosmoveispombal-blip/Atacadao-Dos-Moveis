begin;

-- Preserve the three original subcategory records for history. Move every
-- product assigned to them into Quarto > Roupeiro > its original group as a type.
do $$
declare
  quarto_id uuid;
  bater_id uuid;
  correr_id uuid;
  solteiro_id uuid;
  roupeiro_id uuid;
  bater_type_id uuid;
  correr_type_id uuid;
  solteiro_type_id uuid;
  source_count bigint;
  moved_count bigint;
begin
  select id into strict quarto_id
  from public.environments
  where slug = 'quarto';

  select id into strict bater_id
  from public.categories
  where environment_id = quarto_id and name = 'Roupeiro de Bater';

  select id into strict correr_id
  from public.categories
  where environment_id = quarto_id and name = 'Roupeiro De Correr';

  select id into strict solteiro_id
  from public.categories
  where environment_id = quarto_id and name = 'Roupeiro Solteiro (3/4 portas)';

  -- Existing types on these old parents need a separate mapping. Fail safely
  -- instead of silently replacing a more detailed classification.
  if exists (
    select 1 from public.category_types
    where category_id in (bater_id, correr_id, solteiro_id)
  ) then
    raise exception 'Uma das subcategorias antigas ja possui tipos; revise o mapeamento antes de migrar.';
  end if;

  select count(*) into source_count
  from public.products
  where category_id in (bater_id, correr_id, solteiro_id);

  -- "Roupeiro de Bater" currently owns the slug needed by the new parent.
  -- Change only its slug; the original row and its other relationships remain.
  if exists (
    select 1 from public.categories
    where id = bater_id and slug = 'roupeiro'
  ) then
    update public.categories
    set slug = 'roupeiro-de-bater', updated_at = now()
    where id = bater_id;
  end if;

  if exists (
    select 1 from public.categories
    where environment_id = quarto_id and slug = 'roupeiro'
      and name <> 'Roupeiro'
  ) then
    raise exception 'O slug da nova subcategoria Roupeiro ja pertence a outro registro.';
  end if;

  insert into public.categories (
    environment_id, name, slug, description, search_keywords, icon_key,
    active, sort_order, show_on_homepage, show_in_menu
  ) values (
    quarto_id, 'Roupeiro', 'roupeiro', 'Roupeiros e guarda-roupas',
    'Roupeiro, guarda-roupa, armario de quarto', 'roupeiro',
    true, 10, true, true
  )
  on conflict (environment_id, slug) where environment_id is not null
  do update set
    name = excluded.name,
    active = true,
    show_in_menu = true,
    updated_at = now()
  returning id into roupeiro_id;

  insert into public.category_types (category_id, name, slug, active, sort_order)
  values (roupeiro_id, 'Roupeiro de Bater', 'roupeiro-de-bater', true, 10)
  on conflict (category_id, slug) do update set
    name = excluded.name, active = true, sort_order = excluded.sort_order,
    updated_at = now()
  returning id into bater_type_id;

  insert into public.category_types (category_id, name, slug, active, sort_order)
  values (roupeiro_id, 'Roupeiro De Correr', 'roupeiro-de-correr', true, 20)
  on conflict (category_id, slug) do update set
    name = excluded.name, active = true, sort_order = excluded.sort_order,
    updated_at = now()
  returning id into correr_type_id;

  insert into public.category_types (category_id, name, slug, active, sort_order)
  values (roupeiro_id, 'Roupeiro Solteiro (3/4 portas)', 'roupeiro-solteiro-3-4-portas', true, 30)
  on conflict (category_id, slug) do update set
    name = excluded.name, active = true, sort_order = excluded.sort_order,
    updated_at = now()
  returning id into solteiro_type_id;

  update public.products
  set category_id = roupeiro_id,
      type_id = case category_id
        when bater_id then bater_type_id
        when correr_id then correr_type_id
        when solteiro_id then solteiro_type_id
      end,
      updated_at = now()
  where category_id in (bater_id, correr_id, solteiro_id);

  get diagnostics moved_count = row_count;
  if moved_count <> source_count then
    raise exception 'Contagem de produtos migrados divergente: % de %.', moved_count, source_count;
  end if;

  -- These rows stay in the database but no longer appear as subcategories.
  update public.categories
  set active = false,
      show_in_menu = false,
      show_on_homepage = false,
      updated_at = now()
  where id in (bater_id, correr_id, solteiro_id);

  if exists (
    select 1 from public.products
    where category_id in (bater_id, correr_id, solteiro_id)
  ) then
    raise exception 'Ainda existem produtos vinculados as subcategorias antigas.';
  end if;
end;
$$;

commit;
