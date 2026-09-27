import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [admin, storefront, app, migration, contract, cmsVerification] = await Promise.all([
  readFile('admin-app.js', 'utf8'),
  readFile('storefront-cms.js', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('supabase/migrations/20261011_stock_by_color_source_of_truth.sql', 'utf8'),
  readFile('config/admin-feature-contract.json', 'utf8'),
  readFile('scripts/verify-cms.mjs', 'utf8')
]);

const sections = admin.slice(admin.indexOf('const productEditorSections'), admin.indexOf('const productFields'));
assert(!sections.includes("key: 'availability'") && !sections.includes("label: 'Disponibilidade'"), 'A aba Disponibilidade ainda existe no cadastro individual.');
assert(!sections.includes("['stock_quantity'") && !sections.includes("['low_stock_threshold'"), 'O cadastro individual ainda possui estoque global editável.');
assert(admin.includes('id="productVariantStockTotal"') && admin.includes('data-variant-field="stock"'), 'A aba Cores não possui estoque por cor e total automático.');
assert(admin.includes('draft.active = true') && !admin.includes('data-variant-field="active"'), 'Ainda existe um segundo controle manual de disponibilidade da cor.');
assert(admin.includes('values.stock_quantity = variantSettings.variants.reduce'), 'O total do produto não é calculado pela soma das cores.');
assert(admin.includes('id="massOriginStock"') && admin.includes('data-mass-color-stock'), 'O cadastro em massa não controla estoque da origem e de cada cor separadamente.');
assert(!admin.includes('data-mass-field="stock_quantity"') && !admin.includes("['stock_quantity', 'Estoque']"), 'O cadastro em massa ainda possui estoque global fora de Cores.');
assert(storefront.includes('const variantStockTotal = variants.reduce') && storefront.includes('stock: row.variants_enabled && variants.length ? variantStockTotal'), 'O catálogo não usa a soma dos estoques das cores.');
assert(app.includes('aria-disabled="${Number(variant.stock)<=0}"') && app.includes("Number(variant.stock)<=0?'disabled':''"), 'O site não mantém somente a cor zerada como indisponível.');
assert(migration.includes('greatest(') && migration.includes('preserved_stock'), 'A migração não preserva o estoque legado ao criar a cor de origem.');
assert(!migration.includes('create temporary table') && !migration.includes('stock_by_color_origin_backfill'), 'A migração voltou a depender de tabela temporária incompatível com o executor SQL hospedado.');
assert(migration.includes('derive_product_stock_from_colors') && migration.includes('sync_product_variant_stock'), 'O banco não protege o estoque total como valor derivado.');
assert(migration.includes("new.active := true") && migration.includes('Zero means unavailable'), 'Quantidade zero não é a única regra de indisponibilidade da cor.');
assert(cmsVerification.includes('estoque total derivado exclusivamente das cores') && cmsVerification.includes('cor de origem sem estoque próprio'), 'A verificação pós-deploy não confere a soma e o estoque da origem.');
assert(contract.includes('estoque exclusivamente por cor'), 'A proteção antirregressão do estoque por cor não foi registrada.');

console.log('OK estoque por cor como fonte única, total derivado, origem e cadastro em massa preservados');
