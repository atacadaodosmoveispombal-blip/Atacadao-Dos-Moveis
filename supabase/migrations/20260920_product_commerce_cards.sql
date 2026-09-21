begin;

-- Configurações individuais do componente oficial de produto.
alter table public.products
  add column if not exists whatsapp_enabled boolean not null default true,
  add column if not exists cart_enabled boolean not null default true,
  add column if not exists free_city_shipping boolean not null default false,
  add column if not exists free_assembly boolean not null default false,
  add column if not exists is_campaign boolean not null default false;

-- Textos globais reutilizados por todos os cards e pelo checkout da sacola.
alter table public.store_settings
  add column if not exists whatsapp_button_text text not null default 'COMPRAR PELO WHATSAPP',
  add column if not exists whatsapp_button_subtitle text not null default 'Fale com a loja e garanta este produto agora!',
  add column if not exists product_benefit_secure_text text not null default 'Compra segura',
  add column if not exists product_benefit_pickup_text text not null default 'Retire na loja',
  add column if not exists service_region text;

commit;

notify pgrst, 'reload schema';
