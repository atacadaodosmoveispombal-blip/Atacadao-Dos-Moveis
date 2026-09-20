begin;

-- Migra o conteúdo que já existia no storefront para a fonte única do CMS.
-- Todos os inserts são idempotentes e não sobrescrevem futuras edições do ADM.

insert into public.categories(name, slug, image_url, active, sort_order) values
  ('Sala', 'sala', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80', true, 10),
  ('Quarto', 'quarto', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=80', true, 20),
  ('Cozinha', 'cozinha', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=80', true, 30),
  ('Sala de jantar', 'sala-de-jantar', 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=700&q=80', true, 40),
  ('Escritório', 'escritorio', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=700&q=80', true, 50),
  ('Colchões', 'colchoes', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=700&q=80', true, 60),
  ('Eletrodomésticos', 'eletrodomesticos', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=700&q=80', true, 70),
  ('Organização', 'organizacao', 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=700&q=80', true, 80)
on conflict (slug) do nothing;

insert into public.environments(name, slug, image_url, active, sort_order) values
  ('Sala de estar', 'sala-de-estar', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80', true, 10),
  ('Quarto', 'quarto', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=80', true, 20),
  ('Cozinha e jantar', 'cozinha-e-jantar', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=700&q=80', true, 30),
  ('Escritório', 'escritorio', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=700&q=80', true, 40),
  ('Organização', 'organizacao', 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=700&q=80', true, 50),
  ('Eletros', 'eletros', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=700&q=80', true, 60),
  ('Sala de jantar', 'sala-de-jantar', 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=700&q=80', true, 70),
  ('Colchões', 'colchoes', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=700&q=80', true, 80)
on conflict (slug) do nothing;

with seed(sku,name,slug,category_slug,environment_slug,price,promotional_price,image_url,best_seller,featured,new_arrival,description,sort_order) as (values
  ('MOV-0001','Sofá Retrátil 3 Lugares Reclinável','sofa-retratil-3-lugares-reclinavel','sala','sala-de-estar',2499.00,1899.00,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',true,true,false,null,10),
  ('MOV-0002','Guarda-Roupa 6 Portas com Espelho','guarda-roupa-6-portas-com-espelho','quarto','quarto',1499.00,1199.00,'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',false,false,false,null,20),
  ('MOV-0003','Mesa de Jantar 6 Lugares com Cadeiras','mesa-de-jantar-6-lugares-com-cadeiras','sala-de-jantar','sala-de-jantar',1299.00,1069.00,'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80',true,true,false,null,30),
  ('MOV-0004','Cama Box Casal com Colchão','cama-box-casal-com-colchao','quarto','quarto',1599.00,1249.00,'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',false,false,false,null,40),
  ('MOV-0005','Painel para TV até 65” com Nichos','painel-para-tv-ate-65-com-nichos','sala','sala-de-estar',899.00,709.00,'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',true,true,false,null,50),
  ('MOV-0006','Rack para TV 2 Portas','rack-para-tv-2-portas','sala','sala-de-estar',749.00,579.00,'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=800&q=80',false,false,false,null,60),
  ('MOV-0007','Cômoda 4 Gavetas Nature','comoda-4-gavetas-nature','quarto','quarto',599.00,449.00,'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',false,false,false,null,70),
  ('MOV-0008','Colchão Casal D33','colchao-casal-d33','colchoes','colchoes',899.00,699.00,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',false,false,false,null,80),
  ('MOV-0009','Armário de Cozinha 8 Portas','armario-de-cozinha-8-portas','cozinha','cozinha-e-jantar',1199.00,899.00,'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80',false,false,false,null,90),
  ('MOV-0010','Poltrona Decorativa Oslo','poltrona-decorativa-oslo','sala','sala-de-estar',529.00,399.00,'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',false,false,false,null,100),
  ('MOV-0011','Escrivaninha Compacta Office','escrivaninha-compacta-office','escritorio','escritorio',449.00,329.00,'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',false,false,false,null,110),
  ('MOV-0012','Geladeira Frost Free 375L','geladeira-frost-free-375l','eletrodomesticos','eletros',3299.00,2899.00,'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',false,false,false,null,120),
  ('MOV-0013','Buffet Aparador 4 Portas Freijó','buffet-aparador-4-portas-freijo','sala-de-jantar','sala-de-jantar',1099.00,799.00,'https://images.unsplash.com/photo-1713810958247-01dbd76b4a61?auto=format&fit=crop&w=800&q=80',true,true,true,'Design contemporâneo com amplo espaço interno e acabamento amadeirado.',130),
  ('MOV-0014','Estante Livreiro 5 Nichos Industrial','estante-livreiro-5-nichos-industrial','organizacao','organizacao',599.00,429.00,'https://images.unsplash.com/photo-1718524767499-7fe3a6ab4f8c?auto=format&fit=crop&w=800&q=80',false,false,false,'Estrutura versátil para livros, plantas e objetos decorativos.',140),
  ('MOV-0015','Mesa de Centro Elevatória com Baú','mesa-de-centro-elevatoria-com-bau','sala','sala-de-estar',649.00,459.00,'https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0?auto=format&fit=crop&w=800&q=80',true,true,false,'Tampo elevatório e compartimento interno para uma sala mais organizada.',150),
  ('MOV-0016','Beliche Juvenil com Escada e Gavetas','beliche-juvenil-com-escada-e-gavetas','quarto','quarto',1699.00,1299.00,'https://images.unsplash.com/photo-1721743169043-dda0212ce3d4?auto=format&fit=crop&w=800&q=80',false,false,true,'Solução compacta com proteção lateral e gavetas para otimizar o quarto.',160),
  ('MOV-0017','Cama Infantil com Grade de Proteção','cama-infantil-com-grade-de-protecao','quarto','quarto',999.00,749.00,'https://images.unsplash.com/photo-1723258343563-7d71a55d6dfa?auto=format&fit=crop&w=800&q=80',false,false,false,'Modelo acolhedor com acesso baixo e proteção para noites tranquilas.',170),
  ('MOV-0018','Lavadora Automática 12kg Inverter','lavadora-automatica-12kg-inverter','eletrodomesticos','eletros',2599.00,2199.00,'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=800&q=80',true,true,false,'Alta capacidade, ciclos inteligentes e funcionamento econômico.',180),
  ('MOV-0019','Lava e Seca 11kg Premium','lava-e-seca-11kg-premium','eletrodomesticos','eletros',3799.00,3199.00,'https://images.unsplash.com/photo-1657064575960-efefbe831c2e?auto=format&fit=crop&w=800&q=80',false,true,false,'Lavagem e secagem no mesmo ciclo com painel digital intuitivo.',190),
  ('MOV-0020','Armário Multiuso 2 Portas Nature','armario-multiuso-2-portas-nature','organizacao','organizacao',749.00,549.00,'https://images.unsplash.com/photo-1628152371231-936cf45eb8f3?auto=format&fit=crop&w=800&q=80',false,false,false,'Prateleiras internas reguláveis para organizar diferentes ambientes.',200),
  ('MOV-0021','Cadeira Office Ergonômica Giratória','cadeira-office-ergonomica-giratoria','escritorio','escritorio',899.00,699.00,'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=800&q=80',false,true,false,'Encosto ergonômico, regulagem de altura e rodízios para uma rotina mais confortável.',210),
  ('MOV-0022','Mesa Office Industrial com 2 Gavetas','mesa-office-industrial-com-2-gavetas','escritorio','escritorio',749.00,549.00,'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',false,true,true,'Tampo amplo e gavetas funcionais para organizar estudos e trabalho.',220),
  ('MOV-0023','Armário de Escritório Alto 2 Portas','armario-de-escritorio-alto-2-portas','escritorio','escritorio',849.00,629.00,'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80',false,false,false,'Espaço interno versátil para documentos, materiais e objetos de uso diário.',230),
  ('MOV-0024','Gaveteiro Office 3 Gavetas com Rodízios','gaveteiro-office-3-gavetas-com-rodizios','escritorio','escritorio',519.00,389.00,'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',false,false,false,'Organização compacta para documentos e materiais, com mobilidade para o dia a dia.',240),
  ('MOV-0025','Estante Office 5 Prateleiras','estante-office-5-prateleiras','escritorio','escritorio',649.00,479.00,'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=80',false,false,false,'Estrutura vertical para livros, pastas e decoração sem ocupar muito espaço.',250),
  ('MOV-0026','Mesa em L para Escritório Compacto','mesa-em-l-para-escritorio-compacto','escritorio','escritorio',1099.00,829.00,'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',false,true,false,'Formato em L com área ampla para computador, estudos e organização da rotina.',260),
  ('MOV-0027','Cadeira Presidente Reclinável','cadeira-presidente-reclinavel','escritorio','escritorio',1199.00,899.00,'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',false,true,false,'Assento acolchoado, braços de apoio e ajuste para longas jornadas com conforto.',270)
)
insert into public.products(
  sku,name,slug,category_id,environment_id,price,promotional_price,
  short_description,featured,best_seller,new_arrival,on_sale,sort_order,
  active,stock_quantity,low_stock_threshold,installment_enabled,max_installments
)
select seed.sku,seed.name,seed.slug,c.id,e.id,seed.price,seed.promotional_price,
  seed.description,seed.featured,seed.best_seller,seed.new_arrival,true,seed.sort_order,
  true,0,5,true,10
from seed
left join public.categories c on c.slug=seed.category_slug
left join public.environments e on e.slug=seed.environment_slug
on conflict (sku) do nothing;

with images(sku,image_url) as (values
  ('MOV-0001','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0002','https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0003','https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0004','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0005','https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0006','https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0007','https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0008','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0009','https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0010','https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0011','https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0012','https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0013','https://images.unsplash.com/photo-1713810958247-01dbd76b4a61?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0014','https://images.unsplash.com/photo-1718524767499-7fe3a6ab4f8c?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0015','https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0016','https://images.unsplash.com/photo-1721743169043-dda0212ce3d4?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0017','https://images.unsplash.com/photo-1723258343563-7d71a55d6dfa?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0018','https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0019','https://images.unsplash.com/photo-1657064575960-efefbe831c2e?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0020','https://images.unsplash.com/photo-1628152371231-936cf45eb8f3?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0021','https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0022','https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0023','https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0024','https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0025','https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0026','https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80'),
  ('MOV-0027','https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80')
)
insert into public.product_images(product_id,image_url,storage_path,alt_text,sort_order,is_cover)
select p.id,images.image_url,'legacy/'||images.sku||'-cover.jpg',p.name,0,true
from images join public.products p using(sku)
where not exists(select 1 from public.product_images pi where pi.product_id=p.id)
on conflict (storage_path) do nothing;

insert into public.banners(title,subtitle,image_desktop_url,image_mobile_url,button_text,button_url,position,active,sort_order)
select 'Sua casa com mais conforto e economia.','Móveis para combinar com a sua casa, seu estilo e seu bolso.','assets/editorial-room-clean.png','assets/editorial-room-clean.png','Explorar produtos','#catalogo','home_hero',true,10
where not exists(select 1 from public.banners where position='home_hero');

insert into public.banners(title,subtitle,image_desktop_url,button_text,button_url,position,active,sort_order)
select 'Semana do Sofá','Conforto com preço baixo','assets/reference-home.png','Ver ofertas','#catalogo','home_middle',true,20
where not exists(select 1 from public.banners where position='home_middle' and sort_order=20);

insert into public.banners(title,subtitle,image_desktop_url,button_text,button_url,position,active,sort_order)
select 'Quartos com estilo','Seu descanso merece o melhor','assets/reference-home.png','Confira','#catalogo','home_middle',true,30
where not exists(select 1 from public.banners where position='home_middle' and sort_order=30);

insert into public.promotions(title,description,label,active)
select 'Ofertas do dia','Produtos que já aparecem com preço promocional no catálogo atual.','Oferta',true
where not exists(select 1 from public.promotions where title='Ofertas do dia');

insert into public.promotion_products(promotion_id,product_id)
select promotion.id,product.id
from public.promotions promotion cross join public.products product
where promotion.title='Ofertas do dia' and product.on_sale=true and product.deleted_at is null
on conflict do nothing;

update public.store_settings set
  phone=coalesce(phone,'(75) 99115-1721'),
  whatsapp=coalesce(whatsapp,'5575991151721'),
  whatsapp_message=coalesce(whatsapp_message,'Olá! Gostaria de conhecer os produtos.'),
  address=coalesce(address,'Praça Ricardo Borges, 75 (Próximo a Igreja Velha)'),
  city=coalesce(city,'Ribeira do Pombal'),
  state=coalesce(state,'BA'),
  postal_code=coalesce(postal_code,'48400-000'),
  map_url=coalesce(map_url,'https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a+Ricardo+Borges%2C+75%2C+Centro%2C+Ribeira+do+Pombal+-+BA%2C+48400-000'),
  instagram=coalesce(instagram,'https://www.instagram.com/menorprecomoveis'),
  facebook=coalesce(facebook,'https://www.facebook.com/menorprecomoveis'),
  footer_text=coalesce(footer_text,'© 2026 Atacarejo dos Móveis. Todos os direitos reservados.'),
  default_meta_title=coalesce(default_meta_title,'Atacarejo dos Móveis — móveis para todos os momentos'),
  default_meta_description=coalesce(default_meta_description,'Móveis para todos os momentos com preço baixo, entrega rápida e atendimento pelo WhatsApp.')
where id=true;

update public.site_sections set title='Um carinho para cada ambiente', subtitle='Escolha o ambiente e descubra móveis que combinam com a sua vida.' where section_key='environments' and title='Ambientes';
update public.site_sections set title='Encontre seu próximo móvel', subtitle='Produtos escolhidos para a sua casa.' where section_key='featured_products' and title='Produtos em destaque';
update public.site_sections set title='Ofertas do dia', subtitle='Os melhores preços para você aproveitar agora!' where section_key='promotions' and title in ('Promoções','Ofertas do dia');
update public.site_sections set title='Mais vendidos', subtitle='Escolhas que fazem sucesso em todos os lares' where section_key='best_sellers';

insert into public.site_sections(section_key,title,subtitle,active,sort_order) values
  ('office','Seu escritório mais bonito e funcional.','Destaques para o home office.',true,25),
  ('promo_banners','Campanhas da loja',null,true,45),
  ('benefits','Benefícios',null,true,55),
  ('ambient','Seu cantinho merece esse aconchego.','Ideias para renovar a sala e aproveitar cada encontro.',true,60)
on conflict(section_key) do nothing;

-- Habilita atualização automática do site em abas/dispositivos conectados.
do $$
declare table_name text;
begin
  foreach table_name in array array['products','product_images','categories','environments','banners','site_sections','store_settings','inspirations','inspiration_images'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';
