import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app = readFileSync('app.js', 'utf8');
const html = readFileSync('index.html', 'utf8');
const cms = readFileSync('storefront-cms.js', 'utf8');
const render = app.slice(app.indexOf('function renderCatalog(){'), app.indexOf('function renderCatalogBreadcrumb(){'));
const source = app.slice(app.indexOf('function sortCatalogProducts('), app.indexOf('function renderCatalog(){'));
const matchesSource = app.slice(app.indexOf('function catalogMatchesTaxonomy('), app.indexOf('function sortCatalogProducts('));
const sort = runInNewContext(`${source}; sortCatalogProducts`, {
  productHasPrice: product => Number.isFinite(Number(product.price)) && Number(product.price) > 0,
  Intl, Date, Number, Boolean
});
const matchesTaxonomy = runInNewContext(`${matchesSource}; catalogMatchesTaxonomy`);

const products = [
  { n: 'Árvore', price: '100.25', createdAt: '2026-10-01T00:00:00Z' },
  { n: 'Banco', price: '9.90', createdAt: '2026-10-10T00:00:00Z', featured: true },
  { n: 'Cadeira', price: null, createdAt: '' }
];
const names = order => Array.from(sort([...products], order), product => product.n).join(',');

assert.equal(names('price-asc'), 'Banco,Árvore,Cadeira');
assert.equal(names('price-desc'), 'Árvore,Banco,Cadeira');
assert.equal(names('name-asc'), 'Árvore,Banco,Cadeira');
assert.equal(names('name-desc'), 'Cadeira,Banco,Árvore');
assert.equal(names('newest'), 'Banco,Árvore,Cadeira');
assert.equal(names('featured'), 'Banco,Árvore,Cadeira');
assert.equal(names('relevant'), 'Árvore,Banco,Cadeira');
const sortOptions = html.match(/<select id="sort">([\s\S]*?)<\/select>/)?.[1];
assert.ok(sortOptions, 'Seletor de ordenação ausente');
assert.match(sortOptions, /<option value="price-asc" selected>Menor preço<\/option>/);
assert.equal((sortOptions.match(/\bselected\b/g) || []).length, 1, 'Somente Menor preço deve iniciar selecionado');
const categoryProducts = [
  { n: 'Sofá caro', price: 900, environment: 'Sala', subcategory: 'Sofás', typeIds: ['2'] },
  { n: 'Sofá barato', price: 300, environment: 'Sala', subcategory: 'Sofás', typeIds: ['2'] },
  { n: 'Mesa', price: 500, environment: 'Sala', subcategory: 'Mesas', typeIds: ['3'] },
  { n: 'Cama', price: 400, environment: 'Quarto', subcategory: 'Camas', typeIds: ['4'] }
];
for (const [environment, subcategory, typeId, expected] of [
  ['Todas', '', '', 'Sofá barato,Cama,Mesa,Sofá caro'],
  ['Sala', '', '', 'Sofá barato,Mesa,Sofá caro'],
  ['Sala', 'Sofás', '', 'Sofá barato,Sofá caro'],
  ['Sala', 'Sofás', '2', 'Sofá barato,Sofá caro'],
  ['Quarto', 'Camas', '', 'Cama']
]) {
  const filtered = categoryProducts.filter(product => matchesTaxonomy(product, environment, subcategory, typeId));
  assert.equal(Array.from(sort(filtered, 'price-asc'), product => product.n).join(','), expected);
}
assert.equal(Array.from(sort(categoryProducts.filter(product => matchesTaxonomy(product, 'Sala', 'Sofás', '')), 'price-desc'), product => product.n).join(','), 'Sofá caro,Sofá barato');
assert.ok(render.indexOf('if(q)list=list.filter') < render.indexOf('sortCatalogProducts(list,'));
assert.ok(render.indexOf('sortCatalogProducts(list,') < render.indexOf('list.slice(0,categoryVisibleLimit)'));
for (const value of ['price-asc', 'price-desc', 'name-asc', 'name-desc', 'newest', 'featured']) {
  assert.ok(html.includes(`value="${value}"`), `Opção ausente: ${value}`);
}
assert.ok(cms.includes('featured: Boolean(row.featured), createdAt: row.created_at'));
assert.ok(cms.includes('on_sale,created_at,og_image_url'));

console.log('OK ordenação numérica, nomes, datas e destaques após filtros e antes da paginação');
