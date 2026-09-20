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
for (const [table, minimum] of Object.entries(expected)) {
  const total = await count(table);
  const ok = total >= minimum;
  console.log(`${ok ? 'OK' : 'PENDENTE'} ${table}: ${total} registro(s); esperado >= ${minimum}`);
  failed ||= !ok;
}

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
  console.error('O catálogo remoto ainda não atingiu a carga mínima. Aplique as migrations de seed pendentes ao projeto Supabase.');
  process.exitCode = 1;
}
