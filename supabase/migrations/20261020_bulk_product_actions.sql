begin;

create function public.bulk_product_action(
  product_ids uuid[],
  action_name text,
  destination_category_id uuid default null,
  destination_type_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  unique_ids uuid[];
  affected integer;
begin
  if not public.is_admin(array['super_admin','admin','editor']::public.admin_role[]) then
    raise exception 'Sem permissão para alterar produtos.' using errcode = '42501';
  end if;

  select array_agg(distinct id) into unique_ids
  from unnest(product_ids) as id
  where id is not null;
  if coalesce(array_length(unique_ids, 1), 0) = 0 then
    raise exception 'Selecione ao menos um produto.' using errcode = '22023';
  end if;
  if action_name not in ('move', 'activate', 'deactivate', 'delete') then
    raise exception 'Ação em massa inválida.' using errcode = '22023';
  end if;

  select count(*) into affected
  from (select id from public.products where id = any(unique_ids) and deleted_at is null for update) locked;
  if affected <> array_length(unique_ids, 1) then
    raise exception 'A seleção contém produtos excluídos ou inexistentes. Atualize a lista.' using errcode = '22023';
  end if;

  if action_name = 'move' then
    if destination_category_id is null or not exists (
      select 1 from public.categories where id = destination_category_id
    ) then
      raise exception 'Escolha uma subcategoria de destino válida.' using errcode = '22023';
    end if;
    if destination_type_id is not null and not exists (
      select 1 from public.category_types
      where id = destination_type_id and category_id = destination_category_id
    ) then
      raise exception 'O tipo escolhido não pertence à subcategoria de destino.' using errcode = '22023';
    end if;

    -- Os vínculos antigos precisam sair antes da alteração de categoria: um
    -- trigger impede tipos de outra subcategoria no mesmo produto.
    delete from public.product_category_types where product_id = any(unique_ids);
    update public.products
    set category_id = destination_category_id, type_id = destination_type_id
    where id = any(unique_ids);
    if destination_type_id is not null then
      insert into public.product_category_types (product_id, category_type_id)
      select id, destination_type_id from unnest(unique_ids) as id;
    end if;
  elsif action_name = 'activate' then
    update public.products set active = true where id = any(unique_ids);
  elsif action_name = 'deactivate' then
    update public.products set active = false where id = any(unique_ids);
  else
    update public.products
    set active = false, deleted_at = now()
    where id = any(unique_ids);
  end if;

  return affected;
end;
$$;

revoke all on function public.bulk_product_action(uuid[], text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.bulk_product_action(uuid[], text, uuid, uuid) to authenticated;

commit;
