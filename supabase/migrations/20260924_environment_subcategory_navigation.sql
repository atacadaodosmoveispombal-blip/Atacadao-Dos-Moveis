begin;

-- A tabela categories passa a representar subcategorias. O vínculo com
-- environments mantém a hierarquia administrável sem duplicar o catálogo.
alter table public.categories
  add column if not exists environment_id uuid references public.environments(id) on delete restrict,
  add column if not exists search_keywords text;

alter table public.categories drop constraint if exists categories_slug_key;
create unique index if not exists categories_environment_slug_key
  on public.categories(environment_id, slug)
  where environment_id is not null;
create index if not exists categories_environment_order_idx
  on public.categories(environment_id, active, sort_order);

insert into public.environments(name, slug, description, image_url, active, sort_order)
values
  ('Sala', 'sala', 'Encontre tudo para sua sala', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80', true, 10),
  ('Quarto', 'quarto', 'Conforto para todos os momentos', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=80', true, 20),
  ('Escritório', 'escritorio', 'Produtividade com conforto e estilo', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=700&q=80', true, 30),
  ('Cozinha', 'cozinha', 'Praticidade para o coração da casa', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=80', true, 40),
  ('Infantil', 'infantil', 'Tudo para o quarto do seu pequeno', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=700&q=80', true, 50),
  ('Eletros', 'eletros', 'Tecnologia e praticidade para sua rotina', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=700&q=80', true, 60)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = coalesce(public.environments.image_url, excluded.image_url),
  active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Conserva registros antigos para auditoria, mas remove ambientes legados da navegação.
update public.environments
set active = false, updated_at = now()
where slug in ('sala-de-estar','cozinha-e-jantar','organizacao','sala-de-jantar','colchoes');

-- Reaproveita a categoria histórica de colchões antes do seed para não duplicá-la.
update public.categories c
set environment_id = e.id, updated_at = now()
from public.environments e
where c.slug = 'colchoes' and e.slug = 'quarto' and c.environment_id is null;

with desired(environment_slug, name, slug, search_keywords, sort_order) as (values
  ('sala','Sofá','sofa','Sofás, estofados, retrátil, reclinável, 2 lugares, 3 lugares',10),
  ('sala','Painel','painel','Painel de TV, painel para televisão',20),
  ('sala','Rack','rack','Rack para TV, móvel para televisão',30),
  ('sala','Mesa para Sala','mesa-para-sala','Mesa de jantar, mesa lateral, aparador, buffet',40),
  ('sala','Home Theater','home-theater','Home theater, cinema em casa, som',50),
  ('sala','Estante','estante','Estante, livreiro, prateleira',60),
  ('sala','Poltrona','poltrona','Poltrona, cadeira decorativa',70),
  ('sala','Toucador','toucador','Toucador, penteadeira',80),
  ('sala','Mesa Telefone','mesa-telefone','Mesa de telefone, mesa lateral',90),
  ('sala','Centro','centro','Mesa de centro, mesa central',100),
  ('sala','Barzinho','barzinho','Bar, barzinho, adega',110),
  ('quarto','Roupeiro','roupeiro','Roupeiro, guarda-roupa, armário de quarto',10),
  ('quarto','Camas','camas','Cama, beliche, cama casal, cama solteiro',20),
  ('quarto','Cabeceira','cabeceira','Cabeceira de cama',30),
  ('quarto','Camas Box','camas-box','Cama box, box casal, box solteiro',40),
  ('quarto','Colchões','colchoes','Colchão, espuma, molas, D33',50),
  ('quarto','Cômoda','comoda','Cômoda, gaveteiro de quarto',60),
  ('quarto','Toucador','toucador','Toucador, penteadeira',70),
  ('quarto','Criado','criado','Criado-mudo, mesa de cabeceira',80),
  ('escritorio','Mesa de Computador','mesa-de-computador','Mesa para computador, mesa office, home office',10),
  ('escritorio','Escrivaninha','escrivaninha','Escrivaninha, mesa de estudo',20),
  ('escritorio','Cadeira Giratória','cadeira-giratoria','Cadeira office, cadeira de escritório, cadeira presidente',30),
  ('cozinha','Armário de Parede','armario-de-parede','Armário de cozinha, armário aéreo',10),
  ('cozinha','Balcão','balcao','Balcão de cozinha, balcão com pia',20),
  ('cozinha','Mesa Granito','mesa-granito','Mesa de granito, mesa de cozinha',30),
  ('cozinha','Cristaleira','cristaleira','Cristaleira, vitrine',40),
  ('cozinha','Multiuso','multiuso','Armário multiuso, organizador',50),
  ('cozinha','Mesa Plástica','mesa-plastica','Mesa plástica, mesa de plástico',60),
  ('cozinha','Tábua de Passar','tabua-de-passar','Tábua para passar roupa',70),
  ('cozinha','Fruteira','fruteira','Fruteira, cesta para frutas',80),
  ('cozinha','Cantoneira','cantoneira','Cantoneira, armário de canto',90),
  ('infantil','Berço','berco','Berço, berço infantil, mini cama',10),
  ('infantil','Colchão Berço','colchao-berco','Colchão para berço, colchão infantil',20),
  ('infantil','Roupeiro Infantil','roupeiro-infantil','Roupeiro infantil, guarda-roupa infantil',30),
  ('eletros','Ventiladores','ventiladores','Ventilador, ventilação',10),
  ('eletros','Ferro de Passar','ferro-de-passar','Ferro, passar roupa',20),
  ('eletros','Liquidificador','liquidificador','Liquidificador, mixer',30),
  ('eletros','Fogão','fogao','Fogão, cooktop',40),
  ('eletros','Lavadora e Tanquinho','lavadora-e-tanquinho','Lavadora, máquina de lavar, tanquinho, lava e seca',50),
  ('eletros','Cabelo e Beleza','cabelo-e-beleza','Secador, chapinha, beleza, cabelo',60),
  ('eletros','Espremedor','espremedor','Espremedor, suco, frutas',70),
  ('eletros','Ar-Condicionado e Climatizador','ar-condicionado-e-climatizador','Ar-condicionado, climatizador, refrigeração',80)
),
resolved as (
  select e.id as environment_id, desired.*
  from desired
  join public.environments e on e.slug = desired.environment_slug
),
updated as (
  update public.categories c
  set name = resolved.name,
      description = coalesce(c.description, 'Produtos de ' || resolved.name),
      search_keywords = resolved.search_keywords,
      sort_order = resolved.sort_order,
      active = true,
      show_in_menu = true,
      environment_id = resolved.environment_id,
      updated_at = now()
  from resolved
  where c.environment_id = resolved.environment_id and c.slug = resolved.slug
  returning c.id
)
insert into public.categories(environment_id, name, slug, description, search_keywords, active, sort_order, show_on_homepage, show_in_menu)
select resolved.environment_id, resolved.name, resolved.slug, 'Produtos de ' || resolved.name, resolved.search_keywords, true, resolved.sort_order, true, true
from resolved
where not exists (
  select 1 from public.categories c
  where c.environment_id = resolved.environment_id and c.slug = resolved.slug
);

-- Categorias antigas de primeiro nível deixam de aparecer como subcategorias.
update public.categories
set active = false, show_in_menu = false, updated_at = now()
where slug in ('sala','quarto','cozinha','sala-de-jantar','escritorio','eletrodomesticos','organizacao')
  and environment_id is null;

-- Migra os produtos existentes para as novas subcategorias com base no nome.
with classified as (
  select p.id,
    case
      when p.name ilike '%sofá%' then array['sala','sofa']
      when p.name ilike '%painel%' then array['sala','painel']
      when p.name ilike '%rack%' then array['sala','rack']
      when p.name ilike '%poltrona%' then array['sala','poltrona']
      when p.name ilike '%estante%' and p.name not ilike '%office%' then array['sala','estante']
      when p.name ilike '%mesa de centro%' then array['sala','centro']
      when p.name ilike '%buffet%' or p.name ilike '%aparador%' or p.name ilike '%mesa de jantar%' then array['sala','mesa-para-sala']
      when p.name ilike '%guarda-roupa%' or p.name ilike '%roupeiro%' then array['quarto','roupeiro']
      when p.name ilike '%cama box%' then array['quarto','camas-box']
      when p.name ilike '%colchão%' then array['quarto','colchoes']
      when p.name ilike '%cômoda%' then array['quarto','comoda']
      when p.name ilike '%cama%' or p.name ilike '%beliche%' then array['quarto','camas']
      when p.name ilike '%cadeira%' and (p.name ilike '%office%' or p.name ilike '%presidente%' or p.name ilike '%giratória%') then array['escritorio','cadeira-giratoria']
      when p.name ilike '%escrivaninha%' then array['escritorio','escrivaninha']
      when p.name ilike '%mesa%' and (p.name ilike '%office%' or p.name ilike '%escritório%') then array['escritorio','mesa-de-computador']
      when p.name ilike '%armário de cozinha%' then array['cozinha','armario-de-parede']
      when p.name ilike '%multiuso%' then array['cozinha','multiuso']
      when p.name ilike '%lavadora%' or p.name ilike '%lava e seca%' or p.name ilike '%tanquinho%' then array['eletros','lavadora-e-tanquinho']
      when p.name ilike '%fogão%' then array['eletros','fogao']
      when p.name ilike '%ventilador%' then array['eletros','ventiladores']
      else null
    end as path
  from public.products p
  where p.deleted_at is null
)
update public.products p
set category_id = c.id, environment_id = e.id, updated_at = now()
from classified x
join public.environments e on e.slug = x.path[1]
join public.categories c on c.environment_id = e.id and c.slug = x.path[2]
where p.id = x.id and x.path is not null;

create or replace function public.sync_product_environment_from_category()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  parent_environment uuid;
begin
  if new.category_id is not null then
    select environment_id into parent_environment
    from public.categories
    where id = new.category_id;
    if parent_environment is not null then
      new.environment_id := parent_environment;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists products_sync_environment on public.products;
create trigger products_sync_environment
before insert or update of category_id, environment_id on public.products
for each row execute function public.sync_product_environment_from_category();

comment on column public.categories.environment_id is 'Ambiente pai da subcategoria.';
comment on column public.categories.search_keywords is 'Sinônimos e termos relacionados usados pela busca da loja.';

commit;
