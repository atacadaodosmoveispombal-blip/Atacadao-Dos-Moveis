-- Category icon keys are resolved by category-icons.js; null means automatic by name.
alter table public.environments add column if not exists icon_key text;
alter table public.categories add column if not exists icon_key text;

update public.environments
set icon_key = slug
where icon_key is null
  and slug in ('sala','quarto','escritorio','cozinha','infantil','eletros');

update public.categories
set icon_key = slug
where icon_key is null
  and slug in (
    'sofa','painel','rack','mesa-para-sala','home-theater','estante','poltrona',
    'toucador','mesa-telefone','centro','barzinho','roupeiro','camas','cabeceira',
    'camas-box','colchoes','comoda','criado','mesa-de-computador','escrivaninha',
    'cadeira-giratoria','armario-de-parede','balcao','mesa-granito','cristaleira',
    'multiuso','mesa-plastica','tabua-de-passar','fruteira','cantoneira','berco',
    'colchao-berco','roupeiro-infantil','ventiladores','ferro-de-passar',
    'liquidificador','fogao','lavadora-e-tanquinho','cabelo-e-beleza',
    'espremedor','ar-condicionado-e-climatizador'
  );
