begin;

-- Preferências leves do assistente de navegação. Nenhuma conversa é armazenada.
alter table public.store_settings
  add column if not exists assistant_enabled boolean not null default true,
  add column if not exists assistant_welcome_message text not null default 'Olá! 👋 Posso ajudar você a encontrar o que procura. Digite, por exemplo: sofá, quarto, cozinha, ofertas ou armários.',
  add column if not exists assistant_show_sala boolean not null default true,
  add column if not exists assistant_show_quarto boolean not null default true,
  add column if not exists assistant_show_cozinha boolean not null default true,
  add column if not exists assistant_show_eletros boolean not null default true,
  add column if not exists assistant_show_offers boolean not null default true,
  add column if not exists assistant_show_whatsapp boolean not null default true;

commit;

notify pgrst, 'reload schema';
