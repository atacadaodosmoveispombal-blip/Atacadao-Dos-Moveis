import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const admin = readFileSync('admin-app.js', 'utf8');
const schema = readFileSync('supabase/migrations/20260918_initial_store.sql', 'utf8');
const migration = readFileSync('supabase/migrations/20261019_products_active_by_default.sql', 'utf8');

const between = (start, end) => {
  const from = admin.indexOf(start);
  const to = admin.indexOf(end, from + start.length);
  assert(from >= 0 && to > from, `Trecho não encontrado: ${start}`);
  return admin.slice(from, to);
};

const publicationFields = between("{ key: 'publication'", 'const productFields =');
const saveProduct = between('async function saveProduct(event)', 'const MASS_PRODUCT_DRAFT_KEY');
assert(!publicationFields.includes("['active',"), 'A edição comum não deve oferecer alteração do status.');
assert.match(saveProduct, /if \(!record\) values\.active = true;/, 'Produto novo deve ser publicado no INSERT.');
assert.equal((saveProduct.match(/values\.active/g) || []).length, 1, 'A edição não deve alterar o status atual.');
assert.match(saveProduct, /record\s*\? await db\.from\('products'\)\.update\(values\)[\s\S]*?: await db\.from\('products'\)\.insert\(values\)/);

const payloadSource = between('function massProductPayload(row, base)', 'function massProductVariantSettings(');
const massProductPayload = vm.runInNewContext(`(${payloadSource.trim()})`, {
  massEffectiveValues: (_row, base) => base,
  parseProductDimension: Number,
  catalogColor: id => ({ id, name: 'Azul' }),
  massColorSelectionLabel: () => 'Branco',
  slugify: value => value.toLowerCase().replaceAll(' ', '-'),
  massProductDimensions: () => ({})
});
const massProduct = massProductPayload({
  name: 'Mesa Nova', price: '100', promotional_price: '', originColorId: 'azul',
  originStock: 2, colorSelections: []
}, { category_id: 'categoria', environment_id: 'ambiente' });
assert.equal(massProduct.active, true, 'Cadastro em massa deve publicar o produto novo.');

const duplicate = between('const duplicateProduct = async source =>', 'const bindProductRows =');
assert.match(duplicate, /copy\.active = true;/, 'Duplicar também cria um produto publicado.');
assert.match(admin, /data-product-toggle/);
assert.match(admin, /update\(\{ active: !row\.active \}\)/, 'Ativar/Desativar deve continuar disponível.');
assert.match(schema, /create table public\.products[\s\S]*?active boolean not null default true/);
assert.match(migration, /alter table public\.products alter column active set default true;/);
assert(!/update\s+public\.products/i.test(migration), 'A migração não deve reativar produtos existentes.');

console.log('OK produto novo publicado; edição preserva status; cadastro em massa, duplicação e Ativar/Desativar preservados');
