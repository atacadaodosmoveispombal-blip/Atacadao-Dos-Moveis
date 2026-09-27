import { readFile } from 'node:fs/promises';

const [admin, storefront, app, migration] = await Promise.all([
  readFile('admin-app.js', 'utf8'),
  readFile('storefront-cms.js', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('supabase/migrations/20261009_product_characteristics.sql', 'utf8')
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(admin.includes('function productCharacteristicsEditorHtml('), 'Cadastro individual sem características estruturadas.');
assert(admin.includes("choices('mirror_feature', mirror") && admin.includes("choices('ribbed_feature', ribbed"), 'Campos individuais de Espelho/Ripado ausentes.');
assert(admin.includes('name="material_feature" value="MDF" type="radio"') && admin.includes('name="material_feature" value="MDP" type="radio"'), 'Material não está limitado a uma escolha no cadastro individual.');
assert(admin.includes('data-mass-override="material"'), 'Material por produto ausente no Cadastro em Massa.');
assert(admin.includes('data-mass-override="mirror_feature"'), 'Espelho por produto ausente no Cadastro em Massa.');
assert(admin.includes('data-mass-override="ribbed_feature"'), 'Ripado por produto ausente no Cadastro em Massa.');
assert(admin.includes('mirror_feature: common.mirror_feature || null'), 'Cadastro em Massa não persiste Espelho.');
assert(admin.includes('ribbed_feature: common.ribbed_feature || null'), 'Cadastro em Massa não persiste Ripado.');

assert(migration.includes('add column if not exists mirror_feature text'), 'Coluna de Espelho ausente.');
assert(migration.includes('add column if not exists ribbed_feature text'), 'Coluna de Ripado ausente.');
assert(migration.includes("set active = false\nwhere lower(slug) in ('espelho', 'ripado')"), 'Seletores legados não são desativados.');
assert(migration.includes("and lower(slug) not in ('espelho', 'ripado')"), 'Persistência não preserva os grupos legados.');
assert(!migration.includes('delete from public.product_option_groups where product_id = target_product_id;'), 'Migration apaga silenciosamente grupos históricos.');
assert(!migration.includes('alter table public.product_variants'), 'Migration altera indevidamente as cores.');
assert(!migration.includes('update public.product_images'), 'Migration altera indevidamente a imagem principal.');

assert(storefront.includes("!['espelho', 'ripado'].includes"), 'Catálogo não bloqueia seletores legados.');
assert(storefront.includes('mirrorFeature: row.mirror_feature'), 'Catálogo não mapeia Espelho.');
assert(storefront.includes('ribbedFeature: row.ribbed_feature'), 'Catálogo não mapeia Ripado.');
assert(app.includes('function productCharacteristicBadges('), 'Página do produto sem etiquetas informativas.');
assert(app.includes('function productSpecificationEntries('), 'Página do produto sem especificações automáticas.');
assert(app.includes('function productCharacteristicMessage('), 'WhatsApp não recebe as características informativas.');

console.log('OK características estruturadas no cadastro individual e em massa');
console.log('OK dados legados convertidos e preservados');
console.log('OK Espelho/Ripado não são seletores públicos');
console.log('OK etiquetas, especificações e WhatsApp integrados');
console.log('OK cores e imagem principal permanecem independentes');
