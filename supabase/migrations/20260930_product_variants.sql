begin;

-- Variações são opcionais. Produtos antigos continuam usando os campos de
-- preço, SKU e estoque da própria tabela products.
alter table public.products
  add column if not exists variants_enabled boolean not null default false,
  add column if not exists variation_type text;

alter table public.products drop constraint if exists products_variation_type_check;
alter table public.products add constraint products_variation_type_check
  check (variation_type is null or variation_type in ('color','size','measure','model','fabric','voltage','finish'));

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  type text not null default 'color',
  sku text,
  color_name text,
  swatch_mode text not null default 'simple',
  color_hex text,
  secondary_color_hex text,
  swatch_image text,
  swatch_storage_path text,
  price numeric(12,2),
  price_adjustment numeric(12,2) not null default 0,
  stock integer not null default 0,
  low_stock_threshold integer not null default 0,
  active boolean not null default true,
  default_variant boolean not null default false,
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type in ('color','size','measure','model','fabric','voltage','finish')),
  check (swatch_mode in ('simple','composite','image')),
  check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  check (secondary_color_hex is null or secondary_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  check (price is null or price >= 0),
  check (price_adjustment >= 0),
  check (stock >= 0),
  check (low_stock_threshold >= 0),
  check (display_order >= 0)
);

create unique index if not exists product_variants_sku_unique
  on public.product_variants(lower(sku)) where sku is not null and btrim(sku) <> '';
create unique index if not exists product_variants_single_default
  on public.product_variants(product_id) where default_variant;
create index if not exists product_variants_product_order_idx
  on public.product_variants(product_id, display_order, created_at);

create table if not exists public.variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  image_url text not null,
  storage_path text not null unique,
  alt_text text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists variant_images_single_cover
  on public.variant_images(variant_id) where is_cover;
create index if not exists variant_images_variant_order_idx
  on public.variant_images(variant_id, sort_order);

-- Estrutura extensível para tamanho, medida, tecido e outros tipos futuros.
create table if not exists public.variant_attributes (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  attribute_key text not null,
  attribute_value text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(variant_id, attribute_key)
);

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();

alter table public.product_variants enable row level security;
alter table public.variant_images enable row level security;
alter table public.variant_attributes enable row level security;

drop policy if exists public_read_product_variants on public.product_variants;
create policy public_read_product_variants on public.product_variants for select
using (
  active and exists(
    select 1 from public.products p
    where p.id = product_id and p.active and p.deleted_at is null
  )
);
drop policy if exists public_read_variant_images on public.variant_images;
create policy public_read_variant_images on public.variant_images for select
using (
  exists(
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = variant_id and v.active and p.active and p.deleted_at is null
  )
);
drop policy if exists public_read_variant_attributes on public.variant_attributes;
create policy public_read_variant_attributes on public.variant_attributes for select
using (
  exists(
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = variant_id and v.active and p.active and p.deleted_at is null
  )
);

drop policy if exists admin_write_product_variants on public.product_variants;
create policy admin_write_product_variants on public.product_variants for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
drop policy if exists admin_write_variant_images on public.variant_images;
create policy admin_write_variant_images on public.variant_images for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
drop policy if exists admin_write_variant_attributes on public.variant_attributes;
create policy admin_write_variant_attributes on public.variant_attributes for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

grant select on public.product_variants, public.variant_images, public.variant_attributes to anon, authenticated;
grant insert, update, delete on public.product_variants, public.variant_images, public.variant_attributes to authenticated;

alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_name text;
alter table public.order_items add column if not exists variant_sku text;
alter table public.order_items drop constraint if exists order_items_order_id_product_id_key;
create unique index if not exists order_items_order_product_variant_unique
  on public.order_items(order_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists order_items_variant_idx on public.order_items(variant_id);

alter table public.stock_reservations add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
alter table public.stock_reservations drop constraint if exists stock_reservations_order_id_product_id_key;
create unique index if not exists stock_reservations_order_product_variant_unique
  on public.stock_reservations(order_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists stock_reservations_variant_available_idx
  on public.stock_reservations(variant_id, expires_at) where status = 'active' and variant_id is not null;

create or replace function public.available_variant_stock(target_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce(v.stock, 0) - coalesce((
      select sum(r.quantity)::integer from public.stock_reservations r
      where r.variant_id = v.id and r.status = 'active' and r.expires_at > now()
    ), 0), 0
  )
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = target_variant_id and v.active and p.active and p.deleted_at is null;
$$;

create or replace function public.available_product_stock(target_product_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when p.variants_enabled then
    coalesce((select sum(public.available_variant_stock(v.id)) from public.product_variants v where v.product_id = p.id and v.active), 0)::integer
  else greatest(
    coalesce(p.stock_quantity, 0) - coalesce((
      select sum(r.quantity)::integer from public.stock_reservations r
      where r.product_id = p.id and r.variant_id is null and r.status = 'active' and r.expires_at > now()
    ), 0), 0
  ) end
  from public.products p
  where p.id = target_product_id and p.active and p.deleted_at is null;
$$;

-- Mantém o estoque agregado do produto útil para listas e relatórios antigos.
create or replace function public.sync_product_variant_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_product uuid;
begin
  target_product := case when tg_op = 'DELETE' then old.product_id else new.product_id end;
  update public.products p set stock_quantity = coalesce((
    select sum(v.stock)::integer from public.product_variants v
    where v.product_id = target_product and v.active
  ), 0), updated_at = now()
  where p.id = target_product and p.variants_enabled;
  return null;
end;
$$;
drop trigger if exists sync_product_variant_stock on public.product_variants;
drop trigger if exists sync_product_variant_stock_insert on public.product_variants;
drop trigger if exists sync_product_variant_stock_update on public.product_variants;
drop trigger if exists sync_product_variant_stock_delete on public.product_variants;
create trigger sync_product_variant_stock_insert
after insert on public.product_variants
for each row execute function public.sync_product_variant_stock();
create trigger sync_product_variant_stock_update
after update on public.product_variants
for each row execute function public.sync_product_variant_stock();
create trigger sync_product_variant_stock_delete
after delete on public.product_variants
for each row execute function public.sync_product_variant_stock();

-- Consome a reserva exatamente uma vez quando o gateway confirma o pagamento.
create or replace function public.consume_paid_order_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare reservation record;
begin
  if new.payment_status = 'approved' and old.payment_status is distinct from 'approved' then
    for reservation in
      select * from public.stock_reservations
      where order_id = new.id and status = 'active' and expires_at > now()
      for update
    loop
      if reservation.variant_id is not null then
        update public.product_variants set stock = stock - reservation.quantity
        where id = reservation.variant_id and stock >= reservation.quantity;
        if not found then raise exception 'Estoque insuficiente para a variação do pedido %.', new.order_number; end if;
      else
        update public.products set stock_quantity = stock_quantity - reservation.quantity
        where id = reservation.product_id and stock_quantity >= reservation.quantity;
        if not found then raise exception 'Estoque insuficiente para o pedido %.', new.order_number; end if;
      end if;
      update public.stock_reservations set status = 'converted', converted_at = now() where id = reservation.id;
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists consume_paid_order_stock on public.orders;
create trigger consume_paid_order_stock after update of payment_status on public.orders
for each row execute function public.consume_paid_order_stock();

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
  current_customer uuid := auth.uid(); settings public.online_sales_settings; existing_order public.orders; created_order public.orders;
  item jsonb; product_row public.products; variant_row public.product_variants; quantity integer;
  unit_price numeric(12,2); regular_price numeric(12,2); base_sale_price numeric(12,2); line_total numeric(12,2);
  subtotal_value numeric(12,2) := 0; discount_value numeric(12,2) := 0; shipping_value numeric(12,2) := 0;
  resolved_items jsonb := '[]'::jsonb; delivery_method_value public.checkout_delivery_method; payment_method_value public.checkout_payment_method;
  product_image text; category_name text; address_value jsonb; all_free_shipping boolean := true;
begin
  if checkout_token is null then raise exception 'Identificador do checkout ausente.'; end if;
  if jsonb_typeof(checkout_items) <> 'array' or jsonb_array_length(checkout_items) < 1 or jsonb_array_length(checkout_items) > 50 then raise exception 'A sacola precisa ter entre 1 e 50 itens.'; end if;
  select * into settings from public.online_sales_settings where id = true;
  if settings is null or not settings.online_sales_enabled then raise exception 'A venda online está temporariamente indisponível.'; end if;
  if current_customer is null and not settings.guest_checkout_enabled then raise exception 'Entre ou crie uma conta para continuar.'; end if;
  select * into existing_order from public.orders where client_order_token = checkout_token;
  if found then
    if existing_order.customer_id is distinct from current_customer then raise exception 'Checkout já utilizado.'; end if;
    return jsonb_build_object('id',existing_order.id,'order_number',existing_order.order_number,'status',existing_order.status,'total',existing_order.total);
  end if;
  begin payment_method_value := requested_payment::public.checkout_payment_method; exception when invalid_text_representation then raise exception 'Forma de pagamento inválida.'; end;
  if payment_method_value = 'pix' and not settings.pix_enabled then raise exception 'PIX indisponível no momento.'; end if;
  if payment_method_value = 'card' and not settings.card_enabled then raise exception 'Cartão indisponível no momento.'; end if;
  begin delivery_method_value := (delivery_data ->> 'method')::public.checkout_delivery_method; exception when invalid_text_representation then raise exception 'Forma de entrega inválida.'; end;
  if delivery_method_value = 'pickup' and not settings.pickup_enabled then raise exception 'Retirada indisponível no momento.'; end if;
  if delivery_method_value = 'delivery' and not settings.delivery_enabled then raise exception 'Entrega indisponível no momento.'; end if;
  if delivery_method_value = 'delivery' then
    if coalesce(delivery_data->>'postal_code','') !~ '^\d{8}$' or nullif(trim(delivery_data->>'street'),'') is null or nullif(trim(delivery_data->>'number'),'') is null or nullif(trim(delivery_data->>'neighborhood'),'') is null or nullif(trim(delivery_data->>'city'),'') is null or char_length(coalesce(delivery_data->>'state','')) <> 2 then raise exception 'Preencha o endereço de entrega corretamente.'; end if;
    address_value := delivery_data - 'method' - 'save_address' - 'address_id';
  end if;
  if nullif(trim(customer_data->>'name'),'') is null or nullif(trim(customer_data->>'email'),'') is null or nullif(trim(customer_data->>'phone'),'') is null then raise exception 'Nome, e-mail e telefone são obrigatórios.'; end if;

  for item in select * from jsonb_array_elements(checkout_items) loop
    product_row := null; variant_row := null; product_image := null; category_name := null;
    begin
      quantity := greatest(1,(item->>'quantity')::integer);
      select * into product_row from public.products where id=(item->>'product_id')::uuid and active and deleted_at is null for update;
    exception when invalid_text_representation then raise exception 'Produto inválido na sacola.'; end;
    if product_row.id is null then raise exception 'Um produto da sacola não está mais disponível.'; end if;
    if product_row.variants_enabled then
      if nullif(item->>'variant_id','') is null then raise exception 'Escolha uma variação para %.', product_row.name; end if;
      begin select * into variant_row from public.product_variants where id=(item->>'variant_id')::uuid and product_id=product_row.id and active for update;
      exception when invalid_text_representation then raise exception 'Variação inválida na sacola.'; end;
      if variant_row.id is null then raise exception 'A variação escolhida para % não está mais disponível.', product_row.name; end if;
      if quantity > public.available_variant_stock(variant_row.id) then raise exception 'Estoque insuficiente para % — %.', product_row.name, variant_row.name; end if;
    elsif quantity > public.available_product_stock(product_row.id) then raise exception 'Estoque insuficiente para %.', product_row.name; end if;

    regular_price := product_row.price;
    select least(product_row.price,coalesce(product_row.promotional_price,product_row.price),coalesce(min(case when promotion.promotion_type='percentage' then greatest(0,product_row.price*(1-promotion.discount_value/100)) when promotion.promotion_type='fixed' then greatest(0,product_row.price-promotion.discount_value) else coalesce(product_row.promotional_price,product_row.price) end),product_row.price))
      into base_sale_price from public.promotions promotion left join public.promotion_products linked on linked.promotion_id=promotion.id and linked.product_id=product_row.id
      where promotion.active and (promotion.start_at is null or promotion.start_at<=now()) and (promotion.end_at is null or promotion.end_at>now()) and (linked.product_id is not null or (promotion.auto_include_category and promotion.category_id=product_row.category_id));
    base_sale_price := coalesce(base_sale_price, product_row.promotional_price, product_row.price);
    if variant_row.id is not null then
      regular_price := coalesce(variant_row.price, product_row.price + variant_row.price_adjustment);
      unit_price := coalesce(variant_row.price, base_sale_price + variant_row.price_adjustment);
    else unit_price := base_sale_price; end if;
    select c.name into category_name from public.categories c where c.id=product_row.category_id;
    if variant_row.id is not null then select vi.image_url into product_image from public.variant_images vi where vi.variant_id=variant_row.id order by vi.is_cover desc,vi.sort_order limit 1; end if;
    if product_image is null then select pi.image_url into product_image from public.product_images pi where pi.product_id=product_row.id order by pi.is_cover desc,pi.sort_order limit 1; end if;
    line_total := round(unit_price*quantity,2); subtotal_value := subtotal_value+line_total; discount_value := discount_value+round((regular_price-unit_price)*quantity,2);
    all_free_shipping := all_free_shipping and coalesce(product_row.free_city_shipping,false);
    resolved_items := resolved_items || jsonb_build_array(jsonb_build_object(
      'product_id',product_row.id,'variant_id',variant_row.id,'name',product_row.name,'slug',product_row.slug,
      'sku',coalesce(variant_row.sku,product_row.sku),'variant_name',variant_row.name,'variant_sku',variant_row.sku,
      'image',product_image,'category',category_name,'quantity',quantity,'regular_price',regular_price,'unit_price',unit_price,'line_total',line_total,
      'free_shipping',coalesce(product_row.free_city_shipping,false),'snapshot',jsonb_build_object('variation_type',product_row.variation_type,'variant_id',variant_row.id,'variant_name',variant_row.name,'color',coalesce(variant_row.color_name,product_row.color),'color_hex',variant_row.color_hex,'secondary_color_hex',variant_row.secondary_color_hex,'material',product_row.material,'warranty',product_row.warranty)
    ));
  end loop;
  if subtotal_value < settings.minimum_order_amount then raise exception 'O pedido mínimo é de R$ %.',settings.minimum_order_amount; end if;
  if delivery_method_value='delivery' then
    select case when (rule->>'free_shipping_min')::numeric>0 and subtotal_value>=(rule->>'free_shipping_min')::numeric then 0 when all_free_shipping and coalesce((rule->>'allow_product_free_shipping')::boolean,false) then 0 else coalesce((rule->>'flat_rate')::numeric,0) end into shipping_value
    from jsonb_array_elements(settings.shipping_rules) rule where coalesce((rule->>'active')::boolean,true) and exists(select 1 from jsonb_array_elements_text(coalesce(rule->'cep_prefixes','[]'::jsonb)) prefix where replace(delivery_data->>'postal_code','-','') like prefix||'%') limit 1;
    shipping_value := coalesce(shipping_value,0);
  end if;
  insert into public.orders(client_order_token,customer_id,customer_name,customer_email,customer_phone,customer_cpf,delivery_method,delivery_address,payment_method,payment_status,status,subtotal,discount_total,shipping_total,total,payment_provider)
  values(checkout_token,current_customer,trim(customer_data->>'name'),lower(trim(customer_data->>'email')),trim(customer_data->>'phone'),nullif(trim(customer_data->>'cpf'),''),delivery_method_value,address_value,payment_method_value,'pending','awaiting_payment',subtotal_value+discount_value,discount_value,shipping_value,subtotal_value+shipping_value,settings.gateway_provider) returning * into created_order;
  insert into public.order_items(order_id,product_id,variant_id,product_name,product_slug,product_sku,variant_name,variant_sku,product_image_url,category_name,quantity,regular_unit_price,unit_price,discount_total,line_total,free_shipping,product_snapshot)
  select created_order.id,(entry->>'product_id')::uuid,nullif(entry->>'variant_id','')::uuid,entry->>'name',entry->>'slug',entry->>'sku',entry->>'variant_name',entry->>'variant_sku',entry->>'image',entry->>'category',(entry->>'quantity')::integer,(entry->>'regular_price')::numeric,(entry->>'unit_price')::numeric,((entry->>'regular_price')::numeric-(entry->>'unit_price')::numeric)*(entry->>'quantity')::integer,(entry->>'line_total')::numeric,(entry->>'free_shipping')::boolean,entry->'snapshot' from jsonb_array_elements(resolved_items) entry;
  insert into public.stock_reservations(order_id,product_id,variant_id,quantity,expires_at)
  select created_order.id,(entry->>'product_id')::uuid,nullif(entry->>'variant_id','')::uuid,(entry->>'quantity')::integer,now()+make_interval(mins=>settings.reservation_minutes) from jsonb_array_elements(resolved_items) entry;
  insert into public.order_events(order_id,event_key,event_type,title,description,source,actor_id) values(created_order.id,'order-created','created','Pedido recebido','Pedido criado com os valores e a variação validados pela loja.','customer',current_customer);
  return jsonb_build_object('id',created_order.id,'order_number',created_order.order_number,'status',created_order.status,'total',created_order.total,'payment_status',created_order.payment_status);
end;
$$;

revoke all on function public.available_variant_stock(uuid) from public;
grant execute on function public.available_variant_stock(uuid) to anon, authenticated;
revoke all on function public.create_customer_order(uuid,jsonb,jsonb,jsonb,text) from public;
grant execute on function public.create_customer_order(uuid,jsonb,jsonb,jsonb,text) to anon, authenticated;

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='product_variants') then alter publication supabase_realtime add table public.product_variants; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='variant_images') then alter publication supabase_realtime add table public.variant_images; end if;
  end if;
end $$;

comment on table public.product_variants is 'Variações vendáveis por produto, começando por cores e acabamentos.';
comment on table public.variant_images is 'Galeria específica de cada variação.';
comment on table public.variant_attributes is 'Atributos extensíveis para novos tipos de variação.';

commit;

notify pgrst, 'reload schema';
