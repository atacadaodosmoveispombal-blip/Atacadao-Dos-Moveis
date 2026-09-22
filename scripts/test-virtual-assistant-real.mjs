import assert from 'node:assert/strict';
import { searchStore } from '../virtual-assistant-catalog.js';

const url = 'https://ejcmuygnfrmytdqlyhjr.supabase.co';
const key = 'sb_publishable__J4jaeMvdcVL9EguRpCApw_nV2ymCUP';
const headers = { apikey: key };

async function rows(path) {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

const [productRows, categories, environments] = await Promise.all([
  rows('products?select=id,name,short_description,description,price,promotional_price,stock_quantity,on_sale,specifications,dimensions,material,color,warranty,installment_enabled,max_installments,free_city_shipping,free_assembly,whatsapp_enabled,cart_enabled,categories(name,search_keywords),environments(name),brands(name),product_images(image_url,is_cover,sort_order)&active=eq.true&deleted_at=is.null'),
  rows('categories?select=id,name,slug,environment_id,search_keywords,active&active=eq.true&order=sort_order'),
  rows('environments?select=id,name,slug,description,active&active=eq.true&order=sort_order')
]);

const products = productRows.map(row => {
  const regular = Number(row.price);
  const promotional = Number(row.promotional_price);
  const price = promotional > 0 && promotional <= regular ? promotional : regular;
  const images = [...(row.product_images || [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || Number(a.sort_order) - Number(b.sort_order));
  return {
    id: row.id, name: row.name, category: row.categories?.name || '', subcategory: row.categories?.name || '',
    environment: row.environments?.name || '', brand: row.brands?.name || '', keywords: row.categories?.search_keywords || '',
    description: row.short_description || row.description || '', fullDescription: row.description || '', specifications: row.specifications || {},
    dimensions: row.dimensions?.description || '', material: row.material || '', color: row.color || '', warranty: row.warranty || '',
    price: Number.isFinite(price) && price > 0 ? price : null, oldPrice: promotional > 0 && promotional < regular ? regular : null,
    installmentCount: row.installment_enabled ? Number(row.max_installments) : null,
    installmentValue: row.installment_enabled && price > 0 ? price / Number(row.max_installments) : null,
    stock: Number(row.stock_quantity) || 0, available: Number(row.stock_quantity) > 0, onSale: Boolean(row.on_sale || (promotional > 0 && promotional < regular)),
    freeShipping: Boolean(row.free_city_shipping), freeAssembly: Boolean(row.free_assembly), cartEnabled: row.cart_enabled !== false,
    whatsappEnabled: row.whatsapp_enabled !== false, image: images[0]?.image_url || ''
  };
});

const navigation = environments.map(environment => ({
  ...environment,
  subcategories: categories.filter(category => category.environment_id === environment.id)
}));
const data = { products, environments: navigation };
const names = result => result.products?.map(product => product.name) || [];
const text = product => `${product.name} ${product.subcategory} ${product.environment}`.toLocaleLowerCase('pt-BR');

const armarios = searchStore('armário', data);
assert.ok(['products', 'fallback'].includes(armarios.type));
assert.ok((armarios.products || []).every(product => /arm[aá]rio/i.test(text(product))));
assert.ok((armarios.products || []).every(product => !/^cantoneira\b/i.test(product.name)));

const twoDoors = searchStore('armário 2 portas', data);
assert.ok((twoDoors.products || []).every(product => /arm[aá]rio/i.test(text(product)) && /\b2\s+(?:\w+\s+){0,3}portas?\b/i.test(`${product.name} ${JSON.stringify(product.specifications)}`)));

const computerTables = searchStore('mesa de computador', data);
assert.ok((computerTables.products || []).every(product => /mesa|escrivaninha/i.test(text(product))));

const affordableSofas = searchStore('sofá até 2000', data);
assert.ok((affordableSofas.products || []).every(product => /sof[aá]/i.test(text(product)) && product.price <= 2000));

for (const query of ['roupeiro 6 portas', 'cama casal', 'colchão queen']) {
  const result = searchStore(query, data);
  assert.ok(['products', 'fallback'].includes(result.type), `${query} precisa retornar produtos coerentes ou fallback seguro`);
}

assert.equal(searchStore('xyzabc', data).type, 'fallback');
console.log(`Catálogo real validado: ${products.length} produtos, ${categories.length} subcategorias e ${environments.length} ambientes.`);
console.log(`Armários encontrados: ${names(armarios).join(' | ') || 'nenhum (fallback seguro)'}`);
console.log(`Armários 2 portas: ${names(twoDoors).join(' | ') || 'nenhum (fallback seguro)'}`);
console.log(`Sofás até R$ 2.000: ${names(affordableSofas).join(' | ') || 'nenhum (fallback seguro)'}`);
