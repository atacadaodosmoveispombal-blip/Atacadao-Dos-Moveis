begin;

-- Um tipo ja associado a produtos nao pode ser movido para outra
-- subcategoria, pois isso quebraria a classificacao desses produtos.
create function public.prevent_used_category_type_reparent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.category_id is distinct from old.category_id
     and exists (select 1 from public.products p where p.type_id = old.id) then
    raise exception 'Reatribua os produtos antes de mover este tipo para outra subcategoria.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger category_types_prevent_used_reparent
before update of category_id on public.category_types
for each row execute function public.prevent_used_category_type_reparent();

commit;
