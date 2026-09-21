const url = 'https://ejcmuygnfrmytdqlyhjr.supabase.co';
const key = 'sb_publishable__J4jaeMvdcVL9EguRpCApw_nV2ymCUP';
const expected = {
  products: 64,
  categories: 8,
  environments: 8,
  banners: 3,
  site_sections: 8,
  store_settings: 1
};

async function count(table) {
  const response = await fetch(`${url}/rest/v1/${table}?select=id`, {
    headers: { apikey: key, Prefer: 'count=exact', Range: '0-0' }
  });
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status} ${await response.text()}`);
  const range = response.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : (await response.json()).length;
}

let failed = false;
async function verifyQuery(label, path, validate = () => true) {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key } });
  if (!response.ok) {
    console.log(`PENDENTE ${label}: HTTP ${response.status} ${await response.text()}`);
    failed = true;
    return [];
  }
  const rows = await response.json();
  const ok = validate(rows);
  console.log(`${ok ? 'OK' : 'PENDENTE'} ${label}`);
  failed ||= !ok;
  return rows;
}

for (const [table, minimum] of Object.entries(expected)) {
  const total = await count(table);
  const ok = total >= minimum;
  console.log(`${ok ? 'OK' : 'PENDENTE'} ${table}: ${total} registro(s); esperado >= ${minimum}`);
  failed ||= !ok;
}

await verifyQuery(
  'schema de produtos administrativos',
  'products?select=id,whatsapp_enabled,cart_enabled,free_city_shipping,free_assembly,is_campaign&limit=1'
);
await verifyQuery(
  'schema de categorias administrativas',
  'categories?select=id,show_on_homepage,show_in_menu,icon_key&limit=1'
);
await verifyQuery('schema de ícones dos ambientes', 'environments?select=id,icon_key&limit=1');
const banners = await verifyQuery(
  'schema de campanhas e banners',
  'banners?select=id,active,draft,paused,sort_order,content_mode,category_id,promotion_id&order=sort_order'
);
await verifyQuery(
  'schema de promoções',
  'promotions?select=id,promotion_type,discount_value,category_id,selection_mode,auto_include_category&limit=1'
);
const activeBanners = banners.filter(item => item.active && !item.draft && !item.paused);
const bannerOrderOk = activeBanners.every((item, index) => index === 0 || Number(activeBanners[index - 1].sort_order) <= Number(item.sort_order));
console.log(`${bannerOrderOk ? 'OK' : 'PENDENTE'} ordem dos banners públicos`);
failed ||= !bannerOrderOk;

const categoryResponse = await fetch(`${url}/rest/v1/categories?select=id,name&active=eq.true&order=sort_order`, { headers: { apikey: key } });
const productResponse = await fetch(`${url}/rest/v1/products?select=category_id&active=eq.true&deleted_at=is.null`, { headers: { apikey: key } });
if (!categoryResponse.ok) throw new Error(`categories: HTTP ${categoryResponse.status} ${await categoryResponse.text()}`);
if (!productResponse.ok) throw new Error(`products: HTTP ${productResponse.status} ${await productResponse.text()}`);
const categories = await categoryResponse.json();
const products = await productResponse.json();
for (const category of categories) {
  const total = products.filter(product => product.category_id === category.id).length;
  const ok = total >= 8;
  console.log(`${ok ? 'OK' : 'PENDENTE'} categoria ${category.name}: ${total} produto(s); esperado >= 8`);
  failed ||= !ok;
}

if (failed) {
  console.error('A integração remota ainda possui pendências. Revise as migrations e os registros indicados acima.');
  process.exitCode = 1;
}
