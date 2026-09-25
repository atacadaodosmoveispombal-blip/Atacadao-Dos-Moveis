begin;

-- Catálogo reutilizável de cores e acabamentos. A tabela de variações existente
-- continua sendo a fonte de preço, estoque, SKU e disponibilidade por produto.
create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  hex text not null,
  secondary_hex text,
  type text not null default 'solid',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_colors_slug_unique unique (slug),
  constraint product_colors_type_check check (type in ('solid','wood','combination')),
  constraint product_colors_hex_check check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  constraint product_colors_secondary_hex_check check (secondary_hex is null or secondary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  constraint product_colors_sort_order_check check (sort_order >= 0)
);

drop trigger if exists set_product_colors_updated_at on public.product_colors;
create trigger set_product_colors_updated_at before update on public.product_colors
for each row execute function public.set_updated_at();

alter table public.product_colors enable row level security;

drop policy if exists public_read_product_colors on public.product_colors;
create policy public_read_product_colors on public.product_colors for select
using (active);

drop policy if exists admin_write_product_colors on public.product_colors;
create policy admin_write_product_colors on public.product_colors for all
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]))
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));

grant select on public.product_colors to anon, authenticated;
grant insert, update, delete on public.product_colors to authenticated;

insert into public.product_colors (name, slug, hex, secondary_hex, type, sort_order)
values
  ('Branco',   'branco',    '#F7F5EF', '#E3E6E8', 'solid', 10),
  ('Off White','off-white', '#EEE7D5', '#D9CFB8', 'solid', 20),
  ('Bege',     'bege',      '#D9C6A5', '#BFA989', 'solid', 30),
  ('Preto',    'preto',     '#202124', '#08090A', 'solid', 40),
  ('Cinza',    'cinza',     '#85898C', '#62676B', 'solid', 50),
  ('Marrom',   'marrom',    '#6B4423', '#3F2717', 'solid', 60),
  ('Freijó',   'freijo',    '#B9723B', '#7C421F', 'wood', 70),
  ('Carvalho', 'carvalho',  '#B99B78', '#806342', 'wood', 80),
  ('Nogueira', 'nogueira',  '#694028', '#3F2418', 'wood', 90),
  ('Imbuia',   'imbuia',    '#4A2B20', '#281713', 'wood', 100),
  ('Mel',      'mel',       '#C27B2B', '#94541F', 'wood', 110),
  ('Canela',   'canela',    '#A85526', '#713617', 'wood', 120),
  ('Azul',     'azul',      '#164A96', '#0B2D65', 'solid', 130),
  ('Verde',    'verde',     '#1C6B55', '#104638', 'solid', 140),
  ('Rosé',     'rose',      '#EAB8C4', '#D691A3', 'solid', 150)
on conflict (slug) do update set
  name = excluded.name,
  hex = excluded.hex,
  secondary_hex = excluded.secondary_hex,
  type = excluded.type,
  sort_order = excluded.sort_order;

alter table public.product_variants
  add column if not exists color_id uuid,
  add column if not exists combination_color_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_variants_color_id_fkey') then
    alter table public.product_variants add constraint product_variants_color_id_fkey
      foreign key (color_id) references public.product_colors(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_variants_combination_color_id_fkey') then
    alter table public.product_variants add constraint product_variants_combination_color_id_fkey
      foreign key (combination_color_id) references public.product_colors(id) on delete set null;
  end if;
end $$;

create index if not exists product_variants_color_idx on public.product_variants(color_id);
create index if not exists product_variants_combination_color_idx on public.product_variants(combination_color_id);

-- Relaciona automaticamente variações antigas que já usam os nomes do catálogo.
update public.product_variants variant
set color_id = color.id
from public.product_colors color
where variant.color_id is null
  and variant.combination_color_id is null
  and lower(btrim(coalesce(variant.color_name, variant.name))) = lower(color.name);

update public.product_variants variant
set color_id = first_color.id,
    combination_color_id = second_color.id
from public.product_colors first_color,
     public.product_colors second_color
where variant.color_id is null
  and position('/' in replace(coalesce(variant.color_name, variant.name), '+', '/')) > 0
  and lower(btrim(split_part(replace(coalesce(variant.color_name, variant.name), '+', '/'), '/', 1))) = lower(first_color.name)
  and lower(btrim(split_part(replace(coalesce(variant.color_name, variant.name), '+', '/'), '/', 2))) = lower(second_color.name);

-- Demonstração visual em seis móveis existentes. Nada é alterado quando o
-- produto já possui qualquer variação, protegendo configurações reais.
with demo(product_id, color_slug, second_slug, variant_name, sku, stock, is_default, display_order) as (
  values
    ('17cffbf9-5a8d-4c23-82d2-e66e2ae26aa4'::uuid, 'bege', null, 'Bege', 'MOV-0001-BEGE', 5, true, 0),
    ('17cffbf9-5a8d-4c23-82d2-e66e2ae26aa4'::uuid, 'cinza', null, 'Cinza', 'MOV-0001-CINZA', 3, false, 1),
    ('17cffbf9-5a8d-4c23-82d2-e66e2ae26aa4'::uuid, 'marrom', null, 'Marrom', 'MOV-0001-MARROM', 2, false, 2),
    ('2015df2e-312d-4e35-8fc6-8ce68ff906ad'::uuid, 'off-white', 'freijo', 'Off White / Freijó', 'MOV-0002-OFF-FRE', 5, true, 0),
    ('2015df2e-312d-4e35-8fc6-8ce68ff906ad'::uuid, 'branco', 'freijo', 'Branco / Freijó', 'MOV-0002-BRA-FRE', 3, false, 1),
    ('2015df2e-312d-4e35-8fc6-8ce68ff906ad'::uuid, 'off-white', 'carvalho', 'Off White / Carvalho', 'MOV-0002-OFF-CAR', 0, false, 2),
    ('b6e458d0-c65a-4c54-85a2-7b37f2f91435'::uuid, 'freijo', null, 'Freijó', 'MOV-0006-FREIJO', 4, true, 0),
    ('b6e458d0-c65a-4c54-85a2-7b37f2f91435'::uuid, 'off-white', 'freijo', 'Off White / Freijó', 'MOV-0006-OFF-FRE', 2, false, 1),
    ('b6e458d0-c65a-4c54-85a2-7b37f2f91435'::uuid, 'preto', 'freijo', 'Preto / Freijó', 'MOV-0006-PRE-FRE', 0, false, 2),
    ('dbe25b6f-a527-40a6-945e-a37dc7c4b94a'::uuid, 'branco', null, 'Branco', 'MOV-0007-BRANCO', 4, true, 0),
    ('dbe25b6f-a527-40a6-945e-a37dc7c4b94a'::uuid, 'off-white', null, 'Off White', 'MOV-0007-OFF', 3, false, 1),
    ('dbe25b6f-a527-40a6-945e-a37dc7c4b94a'::uuid, 'freijo', null, 'Freijó', 'MOV-0007-FREIJO', 2, false, 2),
    ('158ed397-a13a-4c22-bc9a-d0af54593df6'::uuid, 'freijo', null, 'Freijó', 'MOV-0011-FREIJO', 5, true, 0),
    ('158ed397-a13a-4c22-bc9a-d0af54593df6'::uuid, 'carvalho', null, 'Carvalho', 'MOV-0011-CARVALHO', 3, false, 1),
    ('158ed397-a13a-4c22-bc9a-d0af54593df6'::uuid, 'preto', null, 'Preto', 'MOV-0011-PRETO', 1, false, 2),
    ('4ff01ce2-c10c-42b0-abdd-860235f2b298'::uuid, 'bege', null, 'Bege', 'MOV-0010-BEGE', 5, true, 0),
    ('4ff01ce2-c10c-42b0-abdd-860235f2b298'::uuid, 'cinza', null, 'Cinza', 'MOV-0010-CINZA', 3, false, 1),
    ('4ff01ce2-c10c-42b0-abdd-860235f2b298'::uuid, 'verde', null, 'Verde', 'MOV-0010-VERDE', 2, false, 2)
), eligible as (
  select demo.*, first_color.id as first_color_id, first_color.hex as first_hex,
         second_color.id as second_color_id, second_color.hex as second_hex
  from demo
  join public.products product on product.id = demo.product_id and product.deleted_at is null
  join public.product_colors first_color on first_color.slug = demo.color_slug
  left join public.product_colors second_color on second_color.slug = demo.second_slug
  where not exists (
    select 1 from public.product_variants existing where existing.product_id = demo.product_id
  )
)
insert into public.product_variants (
  product_id, name, type, sku, color_name, swatch_mode, color_hex,
  secondary_color_hex, price, price_adjustment, stock, low_stock_threshold,
  active, default_variant, display_order, color_id, combination_color_id
)
select product_id, variant_name, 'color', sku, variant_name,
       case when second_color_id is null then 'simple' else 'composite' end,
       first_hex, second_hex, null, 0, stock, 1, true, is_default,
       display_order, first_color_id, second_color_id
from eligible
on conflict do nothing;

update public.products product
set variants_enabled = true,
    variation_type = 'color',
    stock_quantity = coalesce((select sum(variant.stock) from public.product_variants variant where variant.product_id = product.id and variant.active), 0)
where product.id in (
  '17cffbf9-5a8d-4c23-82d2-e66e2ae26aa4'::uuid,
  '2015df2e-312d-4e35-8fc6-8ce68ff906ad'::uuid,
  'b6e458d0-c65a-4c54-85a2-7b37f2f91435'::uuid,
  'dbe25b6f-a527-40a6-945e-a37dc7c4b94a'::uuid,
  '158ed397-a13a-4c22-bc9a-d0af54593df6'::uuid,
  '4ff01ce2-c10c-42b0-abdd-860235f2b298'::uuid
)
and exists (select 1 from public.product_variants variant where variant.product_id = product.id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_colors'
  ) then
    alter publication supabase_realtime add table public.product_colors;
  end if;
end $$;

comment on table public.product_colors is 'Catálogo reutilizável de cores e acabamentos exibido no cadastro simplificado de variações.';
comment on column public.product_variants.color_id is 'Cor ou acabamento principal selecionado no catálogo.';
comment on column public.product_variants.combination_color_id is 'Segunda cor/acabamento quando a variação é uma combinação.';

commit;
