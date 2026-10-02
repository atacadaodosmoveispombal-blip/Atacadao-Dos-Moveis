begin;

-- New products are published by default. Existing product statuses are preserved.
alter table public.products alter column active set default true;

commit;
