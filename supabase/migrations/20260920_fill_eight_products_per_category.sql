begin;

-- Completa o catálogo inicial com oito produtos ativos em cada categoria.
-- A carga é idempotente por SKU e não sobrescreve produtos já existentes.
with seed(
  sku,name,slug,category_slug,environment_slug,price,promotional_price,
  image_url,featured,best_seller,new_arrival,description,sort_order
) as (values
  ('MOV-0028','Sofá Modular 4 Lugares com Chaise','sofa-modular-4-lugares-com-chaise','sala','sala-de-estar',3999.00,3199.00,'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=82',true,true,true,'Módulos amplos, chaise confortável e composição versátil para receber toda a família.',280),
  ('MOV-0029','Mesa Lateral Redonda com Pés Palito','mesa-lateral-redonda-com-pes-palito','sala','sala-de-estar',299.00,219.00,'https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0?auto=format&fit=crop&w=1200&q=82',false,false,true,'Mesa lateral compacta com design leve para apoiar objetos e complementar a sala.',290),
  ('MOV-0030','Aparador Retrô 2 Portas com Nicho','aparador-retro-2-portas-com-nicho','sala','sala-de-estar',799.00,599.00,'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=82',true,false,false,'Aparador funcional com duas portas e nicho aberto para organizar e decorar.',300),

  ('MOV-0031','Criado-Mudo 2 Gavetas Nature','criado-mudo-2-gavetas-nature','quarto','quarto',399.00,289.00,'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=82',false,false,true,'Criado-mudo compacto com duas gavetas e acabamento amadeirado.',310),
  ('MOV-0032','Cabeceira Casal Estofada 1,60m','cabeceira-casal-estofada-160m','quarto','quarto',699.00,519.00,'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&w=1200&q=82',true,false,false,'Cabeceira estofada para cama de casal com toque macio e visual acolhedor.',320),
  ('MOV-0033','Sapateira 2 Portas com Espelho','sapateira-2-portas-com-espelho','quarto','quarto',849.00,649.00,'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=82',false,true,false,'Sapateira vertical com espelho e espaço interno para manter os calçados organizados.',330),

  ('MOV-0034','Balcão de Cozinha 3 Portas e Gaveta','balcao-de-cozinha-3-portas-e-gaveta','cozinha','cozinha-e-jantar',799.00,599.00,'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82',true,true,false,'Balcão com amplo espaço interno, três portas e gaveta para utensílios.',340),
  ('MOV-0035','Paneleiro Torre 4 Portas','paneleiro-torre-4-portas','cozinha','cozinha-e-jantar',899.00,669.00,'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1200&q=82',false,false,true,'Paneleiro alto com quatro portas para aproveitar melhor o espaço vertical.',350),
  ('MOV-0036','Cozinha Compacta 10 Portas','cozinha-compacta-10-portas','cozinha','cozinha-e-jantar',1999.00,1499.00,'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82',true,true,true,'Conjunto compacto com armários aéreos e balcões para uma cozinha completa.',360),
  ('MOV-0037','Armário Aéreo 3 Portas','armario-aereo-3-portas','cozinha','cozinha-e-jantar',599.00,429.00,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82',false,false,false,'Armário aéreo com três portas e prateleiras internas para itens do dia a dia.',370),
  ('MOV-0038','Balcão para Cooktop 5 Bocas','balcao-para-cooktop-5-bocas','cozinha','cozinha-e-jantar',749.00,549.00,'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=82',true,false,false,'Balcão preparado para cooktop de cinco bocas com espaço para panelas e mantimentos.',380),
  ('MOV-0039','Fruteira Multiuso com Cestos','fruteira-multiuso-com-cestos','cozinha','cozinha-e-jantar',329.00,239.00,'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82',false,false,true,'Fruteira compacta com cestos e apoio superior para organizar a cozinha.',390),
  ('MOV-0040','Mesa Dobrável de Parede para Cozinha','mesa-dobravel-de-parede-para-cozinha','cozinha','cozinha-e-jantar',449.00,329.00,'https://images.unsplash.com/photo-1556909172-8c2f041fca1e?auto=format&fit=crop&w=1200&q=82',false,false,false,'Mesa dobrável que libera espaço quando não está em uso, ideal para ambientes compactos.',400),

  ('MOV-0041','Conjunto Mesa 4 Cadeiras Estofadas','conjunto-mesa-4-cadeiras-estofadas','sala-de-jantar','sala-de-jantar',1199.00,899.00,'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82',true,true,false,'Conjunto compacto com mesa e quatro cadeiras estofadas para refeições confortáveis.',410),
  ('MOV-0042','Mesa de Jantar Redonda 4 Lugares','mesa-de-jantar-redonda-4-lugares','sala-de-jantar','sala-de-jantar',999.00,749.00,'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=82',true,false,true,'Mesa redonda que favorece a circulação e deixa todos mais próximos.',420),
  ('MOV-0043','Cadeiras de Jantar Estofadas Kit 2','cadeiras-de-jantar-estofadas-kit-2','sala-de-jantar','sala-de-jantar',699.00,519.00,'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82',false,false,false,'Par de cadeiras estofadas com encosto confortável e estrutura resistente.',430),
  ('MOV-0044','Cristaleira 2 Portas de Vidro','cristaleira-2-portas-de-vidro','sala-de-jantar','sala-de-jantar',1099.00,829.00,'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=82',false,false,true,'Cristaleira com portas de vidro para proteger e destacar louças e objetos especiais.',440),
  ('MOV-0045','Buffet 3 Portas com Adega','buffet-3-portas-com-adega','sala-de-jantar','sala-de-jantar',899.00,669.00,'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1200&q=82',true,true,false,'Buffet com três portas e nichos para garrafas, ideal para receber convidados.',450),
  ('MOV-0046','Banco Canto Alemão Estofado','banco-canto-alemao-estofado','sala-de-jantar','sala-de-jantar',1499.00,1149.00,'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=82',false,false,false,'Banco de canto estofado que aproveita o espaço e cria uma área de jantar acolhedora.',460),

  ('MOV-0047','Colchão Solteiro D33','colchao-solteiro-d33','colchoes','colchoes',649.00,489.00,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=82',false,true,false,'Colchão de solteiro com espuma D33 e suporte firme para o uso diário.',470),
  ('MOV-0048','Colchão Casal D45','colchao-casal-d45','colchoes','colchoes',1099.00,829.00,'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=82',true,false,false,'Colchão de casal em espuma D45 com firmeza elevada e conforto uniforme.',480),
  ('MOV-0049','Colchão Queen Molas Ensacadas','colchao-queen-molas-ensacadas','colchoes','colchoes',1899.00,1499.00,'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=82',true,true,true,'Molas ensacadas individualmente para reduzir a transferência de movimentos durante o sono.',490),
  ('MOV-0050','Colchão King Molas Ensacadas','colchao-king-molas-ensacadas','colchoes','colchoes',2499.00,1999.00,'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=82',true,false,true,'Colchão king espaçoso com molas ensacadas e camada de conforto reforçada.',500),
  ('MOV-0051','Colchão Casal Pillow Top','colchao-casal-pillow-top','colchoes','colchoes',1599.00,1249.00,'https://images.unsplash.com/photo-1578898887932-dce23a595ad4?auto=format&fit=crop&w=1200&q=82',false,true,false,'Camada extra pillow top para uma sensação mais macia sem perder sustentação.',510),
  ('MOV-0052','Colchão Infantil D18','colchao-infantil-d18','colchoes','colchoes',449.00,329.00,'https://images.unsplash.com/photo-1723258343563-7d71a55d6dfa?auto=format&fit=crop&w=1200&q=82',false,false,false,'Colchão infantil leve e confortável, desenvolvido para camas de criança.',520),
  ('MOV-0053','Base Box Baú Casal','base-box-bau-casal','colchoes','colchoes',1399.00,1049.00,'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=82',false,false,true,'Base box com baú interno para guardar roupas de cama e otimizar o quarto.',530),

  ('MOV-0054','Fogão 5 Bocas Mesa de Vidro','fogao-5-bocas-mesa-de-vidro','eletrodomesticos','eletros',2299.00,1899.00,'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=1200&q=82',true,true,false,'Fogão de cinco bocas com mesa de vidro, acendimento automático e forno amplo.',540),
  ('MOV-0055','Micro-ondas 32L Digital','micro-ondas-32l-digital','eletrodomesticos','eletros',899.00,749.00,'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=1200&q=82',false,false,true,'Micro-ondas de 32 litros com painel digital e receitas pré-programadas.',550),
  ('MOV-0056','Air Fryer Digital 5L','air-fryer-digital-5l','eletrodomesticos','eletros',599.00,449.00,'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=1200&q=82',true,true,true,'Fritadeira sem óleo com cesto de cinco litros e controle digital de tempo e temperatura.',560),
  ('MOV-0057','Smart TV 50 Polegadas 4K','smart-tv-50-polegadas-4k','eletrodomesticos','eletros',2799.00,2399.00,'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=82',true,false,false,'Smart TV 4K com tela de 50 polegadas, aplicativos integrados e conectividade Wi-Fi.',570),
  ('MOV-0058','Liquidificador 1200W 3 Litros','liquidificador-1200w-3-litros','eletrodomesticos','eletros',349.00,259.00,'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=crop&w=1200&q=82',false,false,false,'Liquidificador potente com jarra de três litros para receitas de toda a família.',580),

  ('MOV-0059','Sapateira Vertical 5 Portas','sapateira-vertical-5-portas','organizacao','organizacao',899.00,679.00,'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=82',true,true,false,'Sapateira vertical com cinco compartimentos basculantes para organizar muitos pares.',590),
  ('MOV-0060','Estante Organizadora 6 Nichos','estante-organizadora-6-nichos','organizacao','organizacao',499.00,359.00,'https://images.unsplash.com/photo-1718524767499-7fe3a6ab4f8c?auto=format&fit=crop&w=1200&q=82',false,false,true,'Estante modular com seis nichos para livros, caixas e objetos decorativos.',600),
  ('MOV-0061','Kit 3 Nichos Decorativos','kit-3-nichos-decorativos','organizacao','organizacao',249.00,179.00,'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=82',false,false,false,'Conjunto de três nichos para criar composições práticas em diferentes paredes.',610),
  ('MOV-0062','Armário para Área de Serviço 2 Portas','armario-para-area-de-servico-2-portas','organizacao','organizacao',799.00,599.00,'https://images.unsplash.com/photo-1628152371231-936cf45eb8f3?auto=format&fit=crop&w=1200&q=82',true,false,false,'Armário alto com prateleiras para produtos de limpeza e utensílios domésticos.',620),
  ('MOV-0063','Baú Organizador Estofado','bau-organizador-estofado','organizacao','organizacao',449.00,329.00,'https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0?auto=format&fit=crop&w=1200&q=82',false,true,true,'Baú estofado que funciona como assento e guarda mantas, brinquedos e acessórios.',630),
  ('MOV-0064','Prateleira Multiuso com Cabideiro','prateleira-multiuso-com-cabideiro','organizacao','organizacao',329.00,239.00,'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82',false,false,false,'Prateleira com cabideiro para organizar bolsas, casacos e objetos de uso diário.',640)
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
join public.categories c on c.slug=seed.category_slug
join public.environments e on e.slug=seed.environment_slug
on conflict (sku) do nothing;

with images(sku,image_url) as (values
  ('MOV-0028','https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0029','https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0030','https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0031','https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0032','https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0033','https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0034','https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0035','https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0036','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0037','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0038','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0039','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0040','https://images.unsplash.com/photo-1556909172-8c2f041fca1e?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0041','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0042','https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0043','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0044','https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0045','https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0046','https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0047','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0048','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0049','https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0050','https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0051','https://images.unsplash.com/photo-1578898887932-dce23a595ad4?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0052','https://images.unsplash.com/photo-1723258343563-7d71a55d6dfa?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0053','https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0054','https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0055','https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0056','https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0057','https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0058','https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0059','https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0060','https://images.unsplash.com/photo-1718524767499-7fe3a6ab4f8c?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0061','https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0062','https://images.unsplash.com/photo-1628152371231-936cf45eb8f3?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0063','https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0?auto=format&fit=crop&w=1200&q=82'),
  ('MOV-0064','https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82')
)
insert into public.product_images(product_id,image_url,storage_path,alt_text,sort_order,is_cover)
select p.id,images.image_url,'seed-20260920/'||images.sku||'-cover.jpg',p.name,0,true
from images
join public.products p using(sku)
where not exists(select 1 from public.product_images pi where pi.product_id=p.id)
on conflict (storage_path) do nothing;

commit;

notify pgrst, 'reload schema';
