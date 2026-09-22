-- Preparada para aplicar somente apos backup verificado do banco e do Storage.
-- Preserva custos existentes em schema privado antes de remover a coluna publica.
-- Executar como uma unica transacao no SQL Editor; depois publicar o frontend atualizado.
begin;

create schema if not exists atacarejo_private;
revoke all on schema atacarejo_private from public, anon, authenticated;

create table if not exists atacarejo_private.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric(12,2) not null check (cost_price >= 0)
);
alter table atacarejo_private.product_costs enable row level security;
revoke all on atacarejo_private.product_costs from public, anon, authenticated;

do $migration$
declare
  missing_costs bigint;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'cost_price'
  ) then
    execute $sql$
      insert into atacarejo_private.product_costs(product_id, cost_price)
      select id, cost_price from public.products where cost_price is not null
      on conflict (product_id) do update set cost_price = excluded.cost_price
    $sql$;
    execute $sql$
      select count(*) from public.products p
      left join atacarejo_private.product_costs c on c.product_id = p.id
      where p.cost_price is not null and c.cost_price is distinct from p.cost_price
    $sql$ into missing_costs;
    if missing_costs <> 0 then
      raise exception 'Copia dos custos incompleta: % produto(s)', missing_costs;
    end if;
    alter table public.products drop column cost_price;
  end if;
end;
$migration$;

-- A RPC antiga podia alterar products.view_count. Bloqueia sua execucao publica.
revoke execute on function public.register_product_view(uuid, text, text)
from public, anon, authenticated;

-- O visitante registra apenas um evento de analytics, nunca uma alteracao em products.
create or replace function public.record_product_view_event(
  target_product_id uuid,
  visitor_session uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if target_product_id is null or visitor_session is null then return; end if;
  if not exists (
    select 1 from public.products p
    where p.id = target_product_id and p.active = true and p.deleted_at is null
  ) then return; end if;
  if exists (
    select 1 from public.product_views v
    where v.product_id = target_product_id
      and v.session_key = visitor_session::text
      and v.viewed_at > now() - interval '30 minutes'
  ) then return; end if;
  insert into public.product_views(product_id, session_key, source)
  values (target_product_id, visitor_session::text, 'site');
end;
$function$;
revoke all on function public.record_product_view_event(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_product_view_event(uuid, uuid) to anon, authenticated;

-- A lista administrativa passa a consultar os eventos, sem depender do contador em products.
create or replace function public.top_viewed_products(limit_count integer default 5)
returns table(id uuid, name text, sku text, view_count bigint, image_url text)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.sku, count(v.id)::bigint,
           (select pi.image_url from public.product_images pi
            where pi.product_id = p.id
            order by pi.is_cover desc, pi.sort_order, pi.created_at
            limit 1)
    from public.product_views v
    join public.products p on p.id = v.product_id
    where p.deleted_at is null
    group by p.id, p.name, p.sku
    order by count(v.id) desc, p.name
    limit least(greatest(coalesce(limit_count, 5), 1), 20);
end;
$function$;
revoke all on function public.top_viewed_products(integer) from public, anon, authenticated;
grant execute on function public.top_viewed_products(integer) to authenticated;

commit;
