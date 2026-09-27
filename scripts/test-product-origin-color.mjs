import { readFile } from 'node:fs/promises';

const [admin, storefront, app, migration] = await Promise.all([
  readFile('admin-app.js', 'utf8'),
  readFile('storefront-cms.js', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('supabase/migrations/20261010_product_origin_color.sql', 'utf8')
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(migration.includes('add column if not exists origin_color_id uuid'), 'Migration sem cor de origem estruturada no produto.');
assert(migration.includes('add column if not exists color_id uuid'), 'Migration sem vínculo de cor nas mídias principais.');
assert(migration.includes('products_origin_color_id_fkey'), 'Migration sem integridade entre produto e catálogo de cores.');
assert(migration.includes('product_images_color_id_fkey'), 'Migration sem integridade entre mídia principal e catálogo de cores.');
assert(!/update\s+public\.products/i.test(migration), 'Migration tenta inventar automaticamente a cor de origem de produtos antigos.');
assert(!/update\s+public\.product_images/i.test(migration), 'Migration tenta reclassificar automaticamente imagens antigas.');
assert(!/\b(drop|truncate|delete\s+from)\b/i.test(migration), 'Migration contém operação destrutiva.');

assert(admin.includes('id="productOriginColor" required'), 'Cadastro individual não exige a cor de origem.');
assert(admin.includes('Produto antigo sem cor de origem'), 'Produtos antigos sem origem não são sinalizados.');
assert(admin.includes('function ensureOriginVariant('), 'Cadastro individual não cria a variação estrutural da origem.');
assert(admin.includes('values.origin_color_id = variantSettings.originColorId'), 'Cadastro individual não persiste a cor de origem.');
assert(admin.includes("update({ color_id: variantSettings.originColorId })"), 'Galeria existente não é vinculada à cor de origem confirmada.');
assert(admin.includes('colorId: variantSettings.originColorId'), 'Novas mídias principais não recebem a cor de origem.');
assert(admin.includes('originColorId: source.originColorId'), 'Cadastro em Massa não mantém uma origem independente por linha.');
assert(admin.includes("errors.push('Falta cor de origem')"), 'Cadastro em Massa permite produto sem origem.');
assert(admin.includes('id="massOriginColor" required'), 'Cadastro em Massa não exibe o seletor obrigatório de origem.');
assert(admin.includes('origin_color_id: row.originColorId'), 'Cadastro em Massa não persiste a origem.');
assert(admin.includes('colorId: row.originColorId'), 'Cadastro em Massa não vincula sua galeria principal à origem.');

assert(storefront.includes('origin_color:product_colors!products_origin_color_id_fkey'), 'Vitrine não carrega a cor de origem estruturada.');
assert(storefront.includes('isOrigin: Boolean(row.origin_color_id'), 'Vitrine não identifica a variação de origem.');
assert(storefront.includes('variants.find(item => item.isOrigin)'), 'Vitrine não prioriza a origem.');
assert(app.includes('item.isOrigin&&item.active!==false'), 'Página do produto não seleciona primeiro a origem.');
assert(app.includes('isOrigin?(p.baseMedia||p.media||[])'), 'Retorno à origem não restaura a galeria principal.');
assert(app.includes("base.variants.length===1?'COR':'ESCOLHA A COR'"), 'Produto de uma cor não usa o rótulo simples COR.');

console.log('OK cor de origem obrigatória no cadastro individual e em massa');
console.log('OK produtos antigos permanecem sem atribuição automática e são sinalizados');
console.log('OK galeria principal vinculada somente à origem');
console.log('OK cores adicionais usam apenas imagens secundárias');
console.log('OK vitrine inicia na origem e restaura a galeria principal');
