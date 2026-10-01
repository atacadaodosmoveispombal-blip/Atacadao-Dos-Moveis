begin;

-- A escolha do desenho do tipo é opcional; tipos existentes continuam
-- recebendo o desenho automático da subcategoria no menu.
alter table public.category_types
  add column if not exists icon_key text;

commit;
