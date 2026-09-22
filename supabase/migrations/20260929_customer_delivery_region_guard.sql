begin;

-- O checkout recalcula o frete no servidor. Uma região sem regra ativa não
-- pode ser tratada como frete zero quando a entrega online for habilitada.
create or replace function public.validate_customer_delivery_region()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  postal_code_value text;
begin
  if new.client_order_token is null or new.delivery_method <> 'delivery' then
    return new;
  end if;

  postal_code_value := regexp_replace(coalesce(new.delivery_address ->> 'postal_code', ''), '[^0-9]', '', 'g');

  if postal_code_value !~ '^[0-9]{8}$' or not exists (
    select 1
    from public.online_sales_settings settings,
         jsonb_array_elements(settings.shipping_rules) rule
    where settings.id = true
      and settings.delivery_enabled
      and coalesce((rule ->> 'active')::boolean, true)
      and exists (
        select 1
        from jsonb_array_elements_text(coalesce(rule -> 'cep_prefixes', '[]'::jsonb)) prefix
        where postal_code_value like prefix || '%'
      )
  ) then
    raise exception 'Entrega indisponível para este CEP.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_customer_delivery_region on public.orders;
create trigger validate_customer_delivery_region
before insert or update of delivery_address, delivery_method on public.orders
for each row execute function public.validate_customer_delivery_region();

comment on function public.validate_customer_delivery_region() is
  'Bloqueia pedidos de checkout com entrega fora dos CEPs de uma regra ativa.';

commit;
