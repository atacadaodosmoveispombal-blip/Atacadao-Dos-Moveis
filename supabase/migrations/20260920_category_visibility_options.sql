-- Opções editoriais para o novo editor de categorias.
-- Idempotente: pode ser executada novamente sem sobrescrever dados existentes.
alter table public.categories
  add column if not exists show_on_homepage boolean not null default true,
  add column if not exists show_in_menu boolean not null default true;

comment on column public.categories.show_on_homepage is
  'Exibe a categoria entre os cards de categorias da página inicial.';

comment on column public.categories.show_in_menu is
  'Exibe a categoria no menu de navegação de categorias.';
