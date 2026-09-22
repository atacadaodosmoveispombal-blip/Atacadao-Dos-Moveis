begin;

-- Contas de clientes são deliberadamente separadas de public.profiles,
-- que continua sendo a lista aprovada de administradores.
create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(full_name) <= 160),
  check (char_length(phone) <= 24)
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Meu endereço',
  postal_code text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(label) between 1 and 60),
  check (postal_code ~ '^\d{8}$'),
  check (char_length(state) = 2)
);
create index if not exists customer_addresses_owner_idx on public.customer_addresses(customer_id, created_at desc);
create unique index if not exists customer_addresses_one_default_idx on public.customer_addresses(customer_id) where is_default;

create table if not exists public.customer_favorites (
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(customer_id, product_id)
);
create index if not exists customer_favorites_created_idx on public.customer_favorites(customer_id, created_at desc);

alter table public.orders add column if not exists customer_id uuid references auth.users(id) on delete set null;
create index if not exists orders_customer_id_created_idx on public.orders(customer_id, created_at desc);
alter table public.online_sales_settings add column if not exists guest_checkout_enabled boolean not null default true;

drop trigger if exists set_customer_profiles_updated_at on public.customer_profiles;
create trigger set_customer_profiles_updated_at before update on public.customer_profiles
for each row execute function public.set_updated_at();
drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at before update on public.customer_addresses
for each row execute function public.set_updated_at();

-- Todo usuário do Auth recebe apenas um perfil de cliente. Acesso administrativo
-- exige inserção e aprovação explícitas em public.profiles por um super_admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_profiles(id, full_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Usuários já existentes recebem a área de cliente sem ganhar qualquer papel
-- administrativo. O painel continua dependendo exclusivamente de public.profiles.
insert into public.customer_profiles(id, full_name, phone)
select
  user_record.id,
  coalesce(nullif(trim(user_record.raw_user_meta_data ->> 'full_name'), ''), ''),
  coalesce(nullif(trim(user_record.raw_user_meta_data ->> 'phone'), ''), '')
from auth.users user_record
on conflict (id) do nothing;

-- Garante um único endereço principal mesmo em alterações concorrentes.
create or replace function public.keep_single_default_customer_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_default then
    update public.customer_addresses
    set is_default = false, updated_at = now()
    where customer_id = new.customer_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;
drop trigger if exists keep_single_default_customer_address on public.customer_addresses;
create trigger keep_single_default_customer_address
before insert or update of is_default on public.customer_addresses
for each row when (new.is_default) execute function public.keep_single_default_customer_address();

alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_favorites enable row level security;

drop policy if exists customer_read_own_profile on public.customer_profiles;
create policy customer_read_own_profile on public.customer_profiles for select to authenticated using (id = auth.uid());
drop policy if exists customer_update_own_profile on public.customer_profiles;
create policy customer_update_own_profile on public.customer_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists customer_insert_own_profile on public.customer_profiles;
create policy customer_insert_own_profile on public.customer_profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists admin_read_customer_profiles on public.customer_profiles;
create policy admin_read_customer_profiles on public.customer_profiles for select to authenticated using (public.is_admin(array['super_admin','admin','viewer']::public.admin_role[]));

drop policy if exists customer_manage_own_addresses on public.customer_addresses;
create policy customer_manage_own_addresses on public.customer_addresses for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists admin_read_customer_addresses on public.customer_addresses;
create policy admin_read_customer_addresses on public.customer_addresses for select to authenticated using (public.is_admin(array['super_admin','admin','viewer']::public.admin_role[]));

drop policy if exists customer_manage_own_favorites on public.customer_favorites;
create policy customer_manage_own_favorites on public.customer_favorites for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists customer_read_own_orders on public.orders;
create policy customer_read_own_orders on public.orders for select to authenticated using (customer_id = auth.uid());
drop policy if exists customer_read_own_order_items on public.order_items;
create policy customer_read_own_order_items on public.order_items for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
drop policy if exists customer_read_own_order_events on public.order_events;
create policy customer_read_own_order_events on public.order_events for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);

grant select, insert, update on public.customer_profiles to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, delete on public.customer_favorites to authenticated;
grant select on public.orders, public.order_items, public.order_events to authenticated;
revoke all on public.customer_profiles, public.customer_addresses, public.customer_favorites from anon;

create or replace function public.create_customer_order(
  checkout_token uuid,
  checkout_items jsonb,
  customer_data jsonb,
  delivery_data jsonb,
  requested_payment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_customer uuid := auth.uid();
  settings public.online_sales_settings;
  existing_order public.orders;
  created_order public.orders;
  item jsonb;
  product_row public.products;
  quantity integer;
  unit_price numeric(12,2);
  regular_price numeric(12,2);
  line_total numeric(12,2);
  subtotal_value numeric(12,2) := 0;
  discount_value numeric(12,2) := 0;
  shipping_value numeric(12,2) := 0;
  resolved_items jsonb := '[]'::jsonb;
  delivery_method_value public.checkout_delivery_method;
  payment_method_value public.checkout_payment_method;
  product_image text;
  category_name text;
  address_value jsonb;
  all_free_shipping boolean := true;
begin
  if checkout_token is null then raise exception 'Identificador do checkout ausente.'; end if;
  if jsonb_typeof(checkout_items) <> 'array' or jsonb_array_length(checkout_items) < 1 or jsonb_array_length(checkout_items) > 50 then
    raise exception 'A sacola precisa ter entre 1 e 50 itens.';
  end if;

  select * into settings from public.online_sales_settings where id = true;
  if settings is null or not settings.online_sales_enabled then raise exception 'A venda online está temporariamente indisponível.'; end if;
  if current_customer is null and not settings.guest_checkout_enabled then raise exception 'Entre ou crie uma conta para continuar.'; end if;

  select * into existing_order from public.orders where client_order_token = checkout_token;
  if found then
    if existing_order.customer_id is distinct from current_customer then raise exception 'Checkout já utilizado.'; end if;
    return jsonb_build_object('id', existing_order.id, 'order_number', existing_order.order_number, 'status', existing_order.status, 'total', existing_order.total);
  end if;

  begin payment_method_value := requested_payment::public.checkout_payment_method;
  exception when invalid_text_representation then raise exception 'Forma de pagamento inválida.'; end;
  if payment_method_value = 'pix' and not settings.pix_enabled then raise exception 'PIX indisponível no momento.'; end if;
  if payment_method_value = 'card' and not settings.card_enabled then raise exception 'Cartão indisponível no momento.'; end if;

  begin delivery_method_value := (delivery_data ->> 'method')::public.checkout_delivery_method;
  exception when invalid_text_representation then raise exception 'Forma de entrega inválida.'; end;
  if delivery_method_value = 'pickup' and not settings.pickup_enabled then raise exception 'Retirada indisponível no momento.'; end if;
  if delivery_method_value = 'delivery' and not settings.delivery_enabled then raise exception 'Entrega indisponível no momento.'; end if;
  if delivery_method_value = 'delivery' then
    if coalesce(delivery_data ->> 'postal_code','') !~ '^\d{8}$'
       or nullif(trim(delivery_data ->> 'street'),'') is null
       or nullif(trim(delivery_data ->> 'number'),'') is null
       or nullif(trim(delivery_data ->> 'neighborhood'),'') is null
       or nullif(trim(delivery_data ->> 'city'),'') is null
       or char_length(coalesce(delivery_data ->> 'state','')) <> 2 then
      raise exception 'Preencha o endereço de entrega corretamente.';
    end if;
    address_value := delivery_data - 'method' - 'save_address' - 'address_id';
  end if;

  if nullif(trim(customer_data ->> 'name'),'') is null
     or nullif(trim(customer_data ->> 'email'),'') is null
     or nullif(trim(customer_data ->> 'phone'),'') is null then
    raise exception 'Nome, e-mail e telefone são obrigatórios.';
  end if;

  for item in select * from jsonb_array_elements(checkout_items) loop
    begin
      quantity := greatest(1, (item ->> 'quantity')::integer);
      select * into product_row from public.products
      where id = (item ->> 'product_id')::uuid and active and deleted_at is null
      for update;
    exception when invalid_text_representation then raise exception 'Produto inválido na sacola.'; end;
    if product_row.id is null then raise exception 'Um produto da sacola não está mais disponível.'; end if;
    if quantity > public.available_product_stock(product_row.id) then raise exception 'Estoque insuficiente para %.', product_row.name; end if;

    regular_price := product_row.price;
    select least(
      product_row.price,
      coalesce(product_row.promotional_price, product_row.price),
      coalesce(min(case
        when promotion.promotion_type = 'percentage' then greatest(0, product_row.price * (1 - promotion.discount_value / 100))
        when promotion.promotion_type = 'fixed' then greatest(0, product_row.price - promotion.discount_value)
        else coalesce(product_row.promotional_price, product_row.price)
      end), product_row.price)
    ) into unit_price
    from public.promotions promotion
    left join public.promotion_products linked on linked.promotion_id = promotion.id and linked.product_id = product_row.id
    where promotion.active
      and (promotion.start_at is null or promotion.start_at <= now())
      and (promotion.end_at is null or promotion.end_at > now())
      and (linked.product_id is not null or (promotion.auto_include_category and promotion.category_id = product_row.category_id));

    select c.name into category_name from public.categories c where c.id = product_row.category_id;
    select pi.image_url into product_image from public.product_images pi where pi.product_id = product_row.id order by pi.is_cover desc, pi.sort_order limit 1;
    line_total := round(unit_price * quantity, 2);
    subtotal_value := subtotal_value + line_total;
    discount_value := discount_value + round((regular_price - unit_price) * quantity, 2);
    all_free_shipping := all_free_shipping and coalesce(product_row.free_city_shipping, false);
    resolved_items := resolved_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.id, 'name', product_row.name, 'slug', product_row.slug, 'sku', product_row.sku,
      'image', product_image, 'category', category_name, 'quantity', quantity, 'regular_price', regular_price,
      'unit_price', unit_price, 'line_total', line_total, 'free_shipping', coalesce(product_row.free_city_shipping, false),
      'snapshot', jsonb_build_object('color', product_row.color, 'material', product_row.material, 'warranty', product_row.warranty)
    ));
    product_row := null;
  end loop;

  if subtotal_value < settings.minimum_order_amount then raise exception 'O pedido mínimo é de R$ %.', settings.minimum_order_amount; end if;
  if delivery_method_value = 'delivery' then
    select case
      when (rule ->> 'free_shipping_min')::numeric > 0 and subtotal_value >= (rule ->> 'free_shipping_min')::numeric then 0
      when all_free_shipping and coalesce((rule ->> 'allow_product_free_shipping')::boolean, false) then 0
      else coalesce((rule ->> 'flat_rate')::numeric, 0)
    end into shipping_value
    from jsonb_array_elements(settings.shipping_rules) rule
    where coalesce((rule ->> 'active')::boolean, true)
      and exists(select 1 from jsonb_array_elements_text(coalesce(rule -> 'cep_prefixes','[]'::jsonb)) prefix where replace(delivery_data ->> 'postal_code','-','') like prefix || '%')
    limit 1;
    shipping_value := coalesce(shipping_value, 0);
  end if;

  insert into public.orders(
    client_order_token, customer_id, customer_name, customer_email, customer_phone, customer_cpf,
    delivery_method, delivery_address, payment_method, payment_status, status,
    subtotal, discount_total, shipping_total, total, payment_provider
  ) values (
    checkout_token, current_customer, trim(customer_data ->> 'name'), lower(trim(customer_data ->> 'email')),
    trim(customer_data ->> 'phone'), nullif(trim(customer_data ->> 'cpf'), ''), delivery_method_value,
    address_value, payment_method_value, 'pending', 'awaiting_payment', subtotal_value + discount_value,
    discount_value,
    shipping_value, subtotal_value + shipping_value, settings.gateway_provider
  )
  returning * into created_order;

  insert into public.order_items(order_id, product_id, product_name, product_slug, product_sku, product_image_url, category_name, quantity, regular_unit_price, unit_price, discount_total, line_total, free_shipping, product_snapshot)
  select created_order.id, (entry ->> 'product_id')::uuid, entry ->> 'name', entry ->> 'slug', entry ->> 'sku', entry ->> 'image', entry ->> 'category',
    (entry ->> 'quantity')::integer, (entry ->> 'regular_price')::numeric, (entry ->> 'unit_price')::numeric,
    ((entry ->> 'regular_price')::numeric - (entry ->> 'unit_price')::numeric) * (entry ->> 'quantity')::integer,
    (entry ->> 'line_total')::numeric, (entry ->> 'free_shipping')::boolean, entry -> 'snapshot'
  from jsonb_array_elements(resolved_items) entry;

  insert into public.stock_reservations(order_id, product_id, quantity, expires_at)
  select created_order.id, (entry ->> 'product_id')::uuid, (entry ->> 'quantity')::integer,
    now() + make_interval(mins => settings.reservation_minutes)
  from jsonb_array_elements(resolved_items) entry;

  insert into public.order_events(order_id, event_key, event_type, title, description, source, actor_id)
  values(created_order.id, 'order-created', 'created', 'Pedido recebido', 'Pedido criado com os valores validados pela loja.', 'customer', current_customer);

  return jsonb_build_object('id', created_order.id, 'order_number', created_order.order_number, 'status', created_order.status, 'total', created_order.total, 'payment_status', created_order.payment_status);
end;
$$;

revoke all on function public.create_customer_order(uuid,jsonb,jsonb,jsonb,text) from public;
grant execute on function public.create_customer_order(uuid,jsonb,jsonb,jsonb,text) to anon, authenticated;

comment on table public.customer_profiles is 'Dados mínimos da conta do cliente. Não concede acesso administrativo.';
comment on table public.customer_addresses is 'Endereços privados protegidos por auth.uid() e RLS.';
comment on table public.customer_favorites is 'Favoritos sincronizados da conta do cliente.';
comment on function public.create_customer_order(uuid,jsonb,jsonb,jsonb,text) is 'Cria pedido com preços e estoque recalculados no servidor; nunca confia nos valores enviados pelo navegador.';

commit;
