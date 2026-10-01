begin;

-- Preserve the legacy primary type while allowing additional classifications.
create table public.product_category_types (
  product_id uuid not null references public.products(id) on delete cascade,
  category_type_id uuid not null references public.category_types(id) on delete cascade,
  primary key (product_id, category_type_id)
);
create index product_category_types_type_idx on public.product_category_types (category_type_id, product_id);

create function public.validate_product_category_type_assignment()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.products p
    join public.category_types t on t.id = new.category_type_id
    where p.id = new.product_id and p.category_id = t.category_id
  ) then
    raise exception 'O tipo selecionado nao pertence a subcategoria do produto.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger product_category_types_validate
before insert or update on public.product_category_types
for each row execute function public.validate_product_category_type_assignment();

create function public.validate_product_category_type_assignments_on_category_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.category_id is distinct from old.category_id and exists (
    select 1 from public.product_category_types pct
    join public.category_types t on t.id = pct.category_type_id
    where pct.product_id = new.id and t.category_id is distinct from new.category_id
  ) then
    raise exception 'Remova os tipos vinculados antes de mudar a subcategoria do produto.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger products_validate_category_type_assignments
before update of category_id on public.products
for each row execute function public.validate_product_category_type_assignments_on_category_change();

create function public.prevent_assigned_category_type_reparent()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.category_id is distinct from old.category_id and exists (
    select 1 from public.product_category_types where category_type_id = old.id
  ) then
    raise exception 'Reatribua os produtos antes de mover este tipo para outra subcategoria.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger category_types_prevent_assigned_reparent
before update of category_id on public.category_types
for each row execute function public.prevent_assigned_category_type_reparent();

insert into public.product_category_types (product_id, category_type_id)
select id, type_id from public.products where type_id is not null
on conflict do nothing;

alter table public.product_category_types enable row level security;
create policy product_category_types_read on public.product_category_types
for select to anon, authenticated
using (exists (
  select 1 from public.products p where p.id = product_id
  and ((p.active and p.deleted_at is null) or public.is_admin())
));
create policy product_category_types_insert on public.product_category_types
for insert to authenticated
with check (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
create policy product_category_types_delete on public.product_category_types
for delete to authenticated
using (public.is_admin(array['super_admin','admin','editor']::public.admin_role[]));
revoke all on public.product_category_types from public, anon, authenticated;
grant select on public.product_category_types to anon;
grant select, insert, delete on public.product_category_types to authenticated;

-- Seed the requested types only where the corresponding subcategory exists.
-- Existing custom names and active flags are left untouched.
insert into public.categories (environment_id, name, slug, description, search_keywords, active, sort_order, show_on_homepage, show_in_menu)
select e.id, requested.name, requested.slug, requested.description, requested.keywords, true, requested.sort_order, false, true
from (values
  ('cozinha','Cozinha','cozinha','Cozinhas compactas, completas e moduladas','cozinha, modulada, compacta',5),
  ('infantil','Cama Infantil','cama-infantil','Camas para o quarto infantil','cama infantil, bicama, beliche',40)
) as requested(environment_slug,name,slug,description,keywords,sort_order)
join public.environments e on e.slug = requested.environment_slug
on conflict (environment_id, slug) where environment_id is not null do nothing;

with seed(environment_slug, category_slug, type_name, type_slug, sort_order) as (
  values
  ('sala','sofa','2 Lugares','2-lugares',10),('sala','sofa','3 Lugares','3-lugares',20),('sala','sofa','Retrátil e Reclinável','retratil-e-reclinavel',30),('sala','sofa','Sofá-Cama','sofa-cama',40),('sala','sofa','Sofá de Canto','sofa-de-canto',50),
  ('sala','poltrona','Decorativa','decorativa',10),('sala','poltrona','Reclinável','reclinavel',20),('sala','poltrona','Namoradeira','namoradeira',30),
  ('sala','rack','Rack para TV','rack-para-tv',10),('sala','rack','Rack com Painel','rack-com-painel',20),
  ('sala','painel','Painel para TV','painel-para-tv',10),('sala','painel','Painel com LED','painel-com-led',20),
  ('quarto','roupeiro','Casal','casal',40),('quarto','roupeiro','Solteiro','solteiro',50),('quarto','roupeiro','Porta de Correr','porta-de-correr',60),('quarto','roupeiro','Porta de Bater','porta-de-bater',70),('quarto','roupeiro','Com Espelho','com-espelho',80),
  ('quarto','camas','Solteiro','solteiro',10),('quarto','camas','Casal','casal',20),('quarto','camas','Queen','queen',30),('quarto','camas','King','king',40),('quarto','camas','Bicama','bicama',50),('quarto','camas','Beliche','beliche',60),
  ('quarto','camas-box','Solteiro','solteiro',10),('quarto','camas-box','Casal','casal',20),('quarto','camas-box','Queen','queen',30),('quarto','camas-box','King','king',40),('quarto','camas-box','Box Baú','box-bau',50),
  ('quarto','colchoes','Solteiro','solteiro',10),('quarto','colchoes','Casal','casal',20),('quarto','colchoes','Queen','queen',30),('quarto','colchoes','King','king',40),
  ('quarto','cabeceira','Solteiro','solteiro',10),('quarto','cabeceira','Casal','casal',20),('quarto','cabeceira','Queen','queen',30),('quarto','cabeceira','King','king',40),
  ('quarto','comoda','Com Gavetas','com-gavetas',10),('quarto','comoda','Com Porta','com-porta',20),('quarto','comoda','Infantil','infantil',30),
  ('quarto','criado','Tradicional','tradicional',10),('quarto','criado','Suspensa','suspensa',20),
  ('quarto','toucador','Tradicional','tradicional',10),('quarto','toucador','Camarim','camarim',20),
  ('sala','mesa-para-sala','4 Lugares','4-lugares',10),('sala','mesa-para-sala','6 Lugares','6-lugares',20),('sala','mesa-para-sala','8 Lugares','8-lugares',30),
  ('cozinha','cozinha','Compacta','compacta',10),('cozinha','cozinha','Completa','completa',20),('cozinha','cozinha','Modulada','modulada',30),
  ('cozinha','armario-de-parede','Aéreo','aereo',10),('cozinha','armario-de-parede','Balcão','balcao',20),('cozinha','armario-de-parede','Paneleiro','paneleiro',30),
  ('escritorio','escrivaninha','Tradicional','tradicional',10),('escritorio','escrivaninha','Para Computador','para-computador',20),('escritorio','escrivaninha','Em L','em-l',30),('escritorio','escrivaninha','Gamer','gamer',40),
  ('escritorio','cadeira-giratoria','Secretária','secretaria',10),('escritorio','cadeira-giratoria','Diretor','diretor',20),('escritorio','cadeira-giratoria','Presidente','presidente',30),('escritorio','cadeira-giratoria','Gamer','gamer',40),
  ('infantil','berco','Tradicional','tradicional',10),('infantil','berco','Mini Berço','mini-berco',20),('infantil','berco','3 em 1','3-em-1',30),
  ('infantil','cama-infantil','Infantil','infantil',10),('infantil','cama-infantil','Bicama','bicama',20),('infantil','cama-infantil','Beliche','beliche',30)
)
insert into public.category_types (category_id, name, slug, active, sort_order)
select c.id, s.type_name, s.type_slug, true, s.sort_order
from seed s
join public.environments e on e.slug = s.environment_slug
join public.categories c on c.environment_id = e.id and c.slug = s.category_slug
on conflict (category_id, slug) do nothing;

do $$
declare table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['category_types','product_category_types'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;

commit;
