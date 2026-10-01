import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../storefront-cms.js', import.meta.url), 'utf8');
const url = source.match(/const url = '([^']+)'/)?.[1];
const key = source.match(/const key = '([^']+)'/)?.[1];
if (!url || !key) throw new Error('Configuração pública do CMS não encontrada.');

async function read(table, fields) {
  const endpoint = new URL(`${url}/rest/v1/${table}`);
  endpoint.searchParams.set('select', fields);
  endpoint.searchParams.set('limit', '1000');
  const response = await fetch(endpoint, { headers: { apikey: key } });
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status} ${await response.text()}`);
  return response.json();
}

const [environments, categories, types, products, assignments] = await Promise.all([
  read('environments', 'id,name,slug,active'),
  read('categories', 'id,name,slug,environment_id,active,show_in_menu'),
  read('category_types', 'id,name,slug,category_id,active'),
  read('products', 'id,sku,name,category_id,type_id,mirror_feature,active,deleted_at'),
  read('product_category_types', 'product_id,category_type_id')
]);

const environmentById = new Map(environments.map(row => [row.id, row]));
const categoryById = new Map(categories.map(row => [row.id, row]));
const typeById = new Map(types.map(row => [row.id, row]));
const assignmentsByProduct = new Map();
for (const row of assignments) {
  const ids = assignmentsByProduct.get(row.product_id) || new Set();
  ids.add(row.category_type_id);
  assignmentsByProduct.set(row.product_id, ids);
}
const visibleProducts = products.filter(row => row.active && !row.deleted_at);
const grouped = new Map();
for (const product of visibleProducts) {
  const category = categoryById.get(product.category_id);
  const environment = environmentById.get(category?.environment_id);
  const label = `${environment?.name || '?'} → ${category?.name || '?'}`;
  const ids = new Set([...(assignmentsByProduct.get(product.id) || []), product.type_id].filter(Boolean));
  const list = grouped.get(label) || [];
  list.push({ id: product.id, sku: product.sku, name: product.name, mirrorFeature: product.mirror_feature, types: [...ids].map(id => typeById.get(id)?.name || `? ${id}`) });
  grouped.set(label, list);
}
const visibleCountByType = new Map();
for (const product of visibleProducts) {
  const ids = new Set([...(assignmentsByProduct.get(product.id) || []), product.type_id].filter(Boolean));
  for (const id of ids) visibleCountByType.set(id, (visibleCountByType.get(id) || 0) + 1);
}
console.log(JSON.stringify({
  totals: { environments: environments.length, categories: categories.length, types: types.length, products: products.length, visibleProducts: visibleProducts.length, assignments: assignments.length },
  groups: [...grouped].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([name, rows]) => ({ name, count: rows.length, products: rows })),
  types: types.map(type => ({
    category: categoryById.get(type.category_id)?.name || '?',
    categorySlug: categoryById.get(type.category_id)?.slug || '?',
    environment: environmentById.get(categoryById.get(type.category_id)?.environment_id)?.name || '?',
    name: type.name,
    slug: type.slug,
    active: type.active,
    visibleProducts: visibleCountByType.get(type.id) || 0
  }))
}, null, 2));
