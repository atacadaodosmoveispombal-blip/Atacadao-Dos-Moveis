begin;

-- Fundação do e-commerce. Esta migration não cria cobranças e não armazena
-- credenciais financeiras. A integração do gateway será feita em outra etapa.
do $$ begin
  create type public.checkout_payment_method as enum ('pix', 'card');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.checkout_delivery_method as enum ('pickup', 'delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_payment_status as enum ('pending', 'approved', 'declined', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_fulfillment_status as enum (
    'received', 'awaiting_payment', 'payment_approved', 'preparing',
    'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_reservation_status as enum ('active', 'converted', 'released', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists public.online_sales_settings (
  id boolean primary key default true check (id),
  online_sales_enabled boolean not null default false,
  pix_enabled boolean not null default false,
  card_enabled boolean not null default false,
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default false,
  require_cpf boolean not null default false,
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  max_installments integer not null default 10 check (max_installments between 1 and 24),
  reservation_minutes integer not null default 30 check (reservation_minutes between 5 and 1440),
  gateway_provider text,
  shipping_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(shipping_rules) = 'array'),
  updated_at timestamptz not null default now(),
  check (not online_sales_enabled or gateway_provider is not null),
  check (not pix_enabled or gateway_provider is not null),
  check (not card_enabled or gateway_provider is not null)
);

insert into public.online_sales_settings(id) values(true) on conflict(id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity,
  order_number text generated always as ('#ADM-' || lpad(sequence_number::text, 6, '0')) stored unique,
  public_access_token uuid not null default gen_random_uuid() unique,
  client_order_token uuid unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text,
  delivery_method public.checkout_delivery_method not null,
  delivery_address jsonb,
  payment_method public.checkout_payment_method not null,
  payment_status public.order_payment_status not null default 'pending',
  status public.order_fulfillment_status not null default 'received',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  payment_provider text,
  gateway_transaction_id text,
  gateway_charge_id text,
  payment_expires_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((delivery_method = 'pickup' and delivery_address is null) or (delivery_method = 'delivery' and delivery_address is not null)),
  check (round(subtotal - discount_total + shipping_total, 2) = round(total, 2))
);

create unique index if not exists orders_gateway_transaction_unique
  on public.orders(payment_provider, gateway_transaction_id)
  where gateway_transaction_id is not null;
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_payment_created_idx on public.orders(payment_status, created_at desc);
create index if not exists orders_customer_email_idx on public.orders(lower(customer_email));

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text,
  product_sku text,
  product_image_url text,
  category_name text,
  quantity integer not null check (quantity > 0),
  regular_unit_price numeric(12,2) not null check (regular_unit_price >= 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  free_shipping boolean not null default false,
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(order_id, product_id),
  check (round(unit_price * quantity, 2) = round(line_total, 2))
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status public.stock_reservation_status not null default 'active',
  expires_at timestamptz not null,
  converted_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, product_id)
);
create index if not exists stock_reservations_available_idx
  on public.stock_reservations(product_id, expires_at)
  where status = 'active';

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  event_key text,
  event_type text not null,
  title text not null,
  description text,
  source text not null default 'system' check (source in ('system','customer','admin','gateway')),
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(order_id, event_key)
);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at);

create table if not exists public.payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  order_id uuid references public.orders(id) on delete set null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, provider_event_id)
);

drop trigger if exists set_online_sales_settings_updated_at on public.online_sales_settings;
create trigger set_online_sales_settings_updated_at before update on public.online_sales_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.available_product_stock(target_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce(p.stock_quantity, 0) - coalesce((
      select sum(r.quantity)::integer
      from public.stock_reservations r
      where r.product_id = p.id
        and r.status = 'active'
        and r.expires_at > now()
    ), 0),
    0
  )
  from public.products p
  where p.id = target_product_id
    and p.active
    and p.deleted_at is null;
$$;

create or replace function public.expire_stock_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.stock_reservations
  set status = 'expired', released_at = now()
  where status = 'active' and expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.admin_transition_order(target_order_id uuid, target_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders;
  next_status public.order_fulfillment_status;
begin
  if not public.is_admin(array['super_admin','admin','editor']::public.admin_role[]) then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;

  begin
    next_status := target_status::public.order_fulfillment_status;
  exception when invalid_text_representation then
    raise exception 'Status de pedido inválido.';
  end;

  select * into current_order from public.orders where id = target_order_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  if next_status = 'payment_approved' then
    raise exception 'O pagamento só pode ser aprovado pela confirmação autenticada do gateway.';
  end if;

  if not (
    (current_order.status in ('received','awaiting_payment') and next_status = 'cancelled') or
    (current_order.status = 'payment_approved' and next_status = 'preparing') or
    (current_order.status = 'preparing' and current_order.delivery_method = 'pickup' and next_status = 'ready_for_pickup') or
    (current_order.status = 'preparing' and current_order.delivery_method = 'delivery' and next_status = 'out_for_delivery') or
    (current_order.status in ('ready_for_pickup','out_for_delivery') and next_status = 'completed')
  ) then
    raise exception 'Transição de status não permitida: % → %.', current_order.status, next_status;
  end if;

  update public.orders
  set status = next_status,
      cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end,
      completed_at = case when next_status = 'completed' then now() else completed_at end
  where id = current_order.id
  returning * into current_order;

  if next_status = 'cancelled' then
    update public.stock_reservations
    set status = 'released', released_at = now()
    where order_id = current_order.id and status = 'active';
  end if;

  insert into public.order_events(order_id,event_type,title,description,source,actor_id)
  values(current_order.id,'status_changed','Status atualizado','Novo status: ' || next_status::text,'admin',auth.uid());

  return current_order;
end;
$$;

alter table public.online_sales_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.order_events enable row level security;
alter table public.payment_webhook_events enable row level security;

drop policy if exists public_read_online_sales_settings on public.online_sales_settings;
create policy public_read_online_sales_settings on public.online_sales_settings
for select using (true);

drop policy if exists admin_write_online_sales_settings on public.online_sales_settings;
create policy admin_write_online_sales_settings on public.online_sales_settings
for all using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

drop policy if exists admin_read_orders on public.orders;
create policy admin_read_orders on public.orders for select
using (public.is_admin(array['super_admin','admin','editor','viewer']::public.admin_role[]));

drop policy if exists admin_read_order_items on public.order_items;
create policy admin_read_order_items on public.order_items for select
using (public.is_admin(array['super_admin','admin','editor','viewer']::public.admin_role[]));

drop policy if exists admin_read_stock_reservations on public.stock_reservations;
create policy admin_read_stock_reservations on public.stock_reservations for select
using (public.is_admin(array['super_admin','admin','editor','viewer']::public.admin_role[]));

drop policy if exists admin_read_order_events on public.order_events;
create policy admin_read_order_events on public.order_events for select
using (public.is_admin(array['super_admin','admin','editor','viewer']::public.admin_role[]));

drop policy if exists admin_read_payment_webhook_events on public.payment_webhook_events;
create policy admin_read_payment_webhook_events on public.payment_webhook_events for select
using (public.is_admin(array['super_admin','admin']::public.admin_role[]));

revoke all on function public.available_product_stock(uuid) from public;
grant execute on function public.available_product_stock(uuid) to anon, authenticated;
revoke all on function public.expire_stock_reservations() from public, anon, authenticated;
grant execute on function public.expire_stock_reservations() to service_role;
revoke all on function public.admin_transition_order(uuid,text) from public;
grant execute on function public.admin_transition_order(uuid,text) to authenticated;

comment on table public.online_sales_settings is 'Configurações públicas da venda online. Segredos do gateway nunca devem ser armazenados nesta tabela.';
comment on table public.orders is 'Pedidos com valores consolidados no backend. A criação segura será exposta pela integração oficial do gateway.';
comment on table public.order_items is 'Snapshot imutável dos itens no momento da compra.';
comment on table public.payment_webhook_events is 'Registro idempotente de eventos autenticados do gateway.';

do $$
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists(
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'online_sales_settings'
     ) then
    alter publication supabase_realtime add table public.online_sales_settings;
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
