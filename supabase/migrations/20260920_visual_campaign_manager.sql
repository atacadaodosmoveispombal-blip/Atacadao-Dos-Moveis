begin;

-- Amplia banners para funcionarem como campanhas visuais sem substituir
-- os registros, IDs, imagens ou posições que já existem.
alter table public.banners
  add column if not exists campaign_type text not null default 'custom',
  add column if not exists content_mode text not null default 'banner',
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists promotion_id uuid references public.promotions(id) on delete set null,
  add column if not exists link_type text not null default 'link',
  add column if not exists alignment text not null default 'left',
  add column if not exists display_locations text[] not null default array['home']::text[],
  add column if not exists draft boolean not null default false,
  add column if not exists paused boolean not null default false,
  add column if not exists auto_include_category boolean not null default false,
  add column if not exists deactivate_on_end boolean not null default true,
  add column if not exists keep_products_after_end boolean not null default true;

alter table public.promotions
  add column if not exists promotion_type text not null default 'display_only',
  add column if not exists discount_value numeric(12,2),
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists selection_mode text not null default 'manual',
  add column if not exists auto_include_category boolean not null default false;

create index if not exists banners_campaign_status_idx
  on public.banners(draft, paused, active, start_at, end_at);
create index if not exists banners_campaign_category_idx
  on public.banners(category_id);
create index if not exists banners_campaign_promotion_idx
  on public.banners(promotion_id);
create index if not exists promotions_campaign_category_idx
  on public.promotions(category_id);

-- Valores antigos continuam equivalentes ao comportamento anterior.
update public.banners
set display_locations = case position
  when 'home_hero' then array['home_hero']::text[]
  when 'home_middle' then array['home_middle']::text[]
  when 'home_bottom' then array['home_bottom']::text[]
  else array['home']::text[]
end
where display_locations = array['home']::text[];

commit;
