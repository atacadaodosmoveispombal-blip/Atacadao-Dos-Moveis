begin;

-- O código/SKU passa a ser opcional no editor. A restrição UNIQUE existente
-- continua protegendo os códigos preenchidos, enquanto o PostgreSQL permite
-- múltiplos valores nulos.
update public.products
set sku = null
where btrim(coalesce(sku, '')) = '';

alter table public.products
  alter column sku drop not null;

commit;
