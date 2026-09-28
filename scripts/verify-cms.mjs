const url = 'https://ejcmuygnfrmytdqlyhjr.supabase.co';
const key = 'sb_publishable__J4jaeMvdcVL9EguRpCApw_nV2ymCUP';
// The CMS is driven by the real catalog, not by the old development seed.
// These floors only assert that the required areas are configured; catalog
// quality is checked below through relationships, values and media integrity.
const requiredRecords = {
  products: 1,
  categories: 1,
  environments: 1,
  banners: 1,
  site_sections: 1,
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

for (const [table, minimum] of Object.entries(requiredRecords)) {
  const total = await count(table);
  const ok = total >= minimum;
  console.log(`${ok ? 'OK' : 'PENDENTE'} ${table}: ${total} registro(s); mínimo operacional ${minimum}`);
  failed ||= !ok;
}

await verifyQuery(
  'schema de produtos administrativos',
  'products?select=id,whatsapp_enabled,cart_enabled,free_city_shipping,free_assembly,is_campaign&limit=1'
);
await verifyQuery(
  'schema da galeria de produtos',
  'product_images?select=id,product_id,image_url,storage_path,media_type,poster_url,poster_storage_path,is_cover,sort_order&limit=1'
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

const [environments, categories, products, media, variants] = await Promise.all([
  verifyQuery('ambientes ativos legíveis', 'environments?select=id,name,slug,active&active=eq.true&order=sort_order', rows => rows.length > 0),
  verifyQuery('categorias ativas legíveis', 'categories?select=id,name,slug,environment_id,active&active=eq.true&order=sort_order', rows => rows.length > 0),
  verifyQuery('produtos públicos legíveis', 'products?select=id,name,slug,category_id,environment_id,price,promotional_price,stock_quantity,variants_enabled,origin_color_id,home_featured,active,deleted_at&active=eq.true&deleted_at=is.null&limit=1000', rows => rows.length > 0),
  verifyQuery('mídias dos produtos legíveis', 'product_images?select=id,product_id,image_url,storage_path,media_type,poster_url,poster_storage_path,is_cover,sort_order&limit=1000'),
  verifyQuery('estoques públicos por cor legíveis', 'product_variants?select=id,product_id,color_id,combination_color_id,stock,active&limit=5000')
]);

function verifyIntegrity(label, issues) {
  const ok = issues.length === 0;
  const detail = ok ? '' : `: ${issues.length} ocorrência(s) — ${issues.slice(0, 8).join('; ')}${issues.length > 8 ? `; +${issues.length - 8} não exibida(s)` : ''}`;
  console.log(`${ok ? 'OK' : 'PENDENTE'} ${label}${detail}`);
  failed ||= !ok;
}

function duplicateValues(rows, key) {
  const seen = new Set();
  const duplicates = new Set();
  for (const row of rows) {
    const value = String(row[key] || '').trim().toLowerCase();
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function duplicateCategorySlugs(rows) {
  const seen = new Set();
  const duplicates = new Set();
  for (const row of rows) {
    const slug = String(row.slug || '').trim().toLowerCase();
    if (!slug || !row.environment_id) continue;
    const scopedSlug = `${row.environment_id}/${slug}`;
    if (seen.has(scopedSlug)) duplicates.add(scopedSlug);
    seen.add(scopedSlug);
  }
  return [...duplicates];
}

const environmentIds = new Set(environments.map(item => item.id));
const categoryById = new Map(categories.map(item => [item.id, item]));
const productIds = new Set(products.map(item => item.id));
const mediaByProduct = new Map();
for (const item of media) {
  const list = mediaByProduct.get(item.product_id) || [];
  list.push(item);
  mediaByProduct.set(item.product_id, list);
}
const variantsByProduct = new Map();
for (const variant of variants) {
  const list = variantsByProduct.get(variant.product_id) || [];
  list.push(variant);
  variantsByProduct.set(variant.product_id, list);
}

verifyIntegrity('slugs únicos dos ambientes', duplicateValues(environments, 'slug').map(value => `slug duplicado ${value}`));
verifyIntegrity('slugs únicos das categorias por ambiente', duplicateCategorySlugs(categories).map(value => `ambiente/slug duplicado ${value}`));
verifyIntegrity('slugs únicos dos produtos públicos', duplicateValues(products, 'slug').map(value => `slug duplicado ${value}`));
verifyIntegrity('limite de destaques manuais da Home', products.filter(product => product.home_featured).length > 4 ? [`${products.filter(product => product.home_featured).length} produtos selecionados; máximo 4`] : []);

verifyIntegrity('relacionamentos das categorias', categories.flatMap(category => {
  if (!category.environment_id) return [`${category.name}: sem ambiente`];
  if (!environmentIds.has(category.environment_id)) return [`${category.name}: ambiente inativo ou inexistente`];
  return [];
}));

verifyIntegrity('integridade dos produtos públicos', products.flatMap(product => {
  const issues = [];
  const category = categoryById.get(product.category_id);
  if (!String(product.name || '').trim()) issues.push(`${product.id}: sem nome`);
  if (!String(product.slug || '').trim()) issues.push(`${product.name || product.id}: sem slug`);
  if (!category) issues.push(`${product.name || product.id}: categoria inativa ou inexistente`);
  if (!environmentIds.has(product.environment_id)) issues.push(`${product.name || product.id}: ambiente inativo ou inexistente`);
  if (category?.environment_id && product.environment_id !== category.environment_id) issues.push(`${product.name || product.id}: ambiente diverge da categoria`);
  const price = Number(product.price);
  const promotional = product.promotional_price == null ? null : Number(product.promotional_price);
  if (!Number.isFinite(price) || price <= 0) issues.push(`${product.name || product.id}: preço inválido`);
  if (promotional != null && (!Number.isFinite(promotional) || promotional <= 0 || promotional >= price)) issues.push(`${product.name || product.id}: preço promocional inválido`);
  const stock = Number(product.stock_quantity);
  if (!Number.isInteger(stock) || stock < 0) issues.push(`${product.name || product.id}: estoque inválido`);
  return issues;
}));

verifyIntegrity('estoque total derivado exclusivamente das cores', products.flatMap(product => {
  if (!product.variants_enabled) return [];
  const productVariants = variantsByProduct.get(product.id) || [];
  const issues = [];
  if (!product.origin_color_id) issues.push(`${product.name}: sem cor de origem`);
  if (!productVariants.some(variant => String(variant.color_id) === String(product.origin_color_id) && !variant.combination_color_id)) issues.push(`${product.name}: cor de origem sem estoque próprio`);
  const total = productVariants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  if (total !== Number(product.stock_quantity || 0)) issues.push(`${product.name}: total ${product.stock_quantity} difere da soma por cor ${total}`);
  if (productVariants.some(variant => !Number.isInteger(Number(variant.stock)) || Number(variant.stock) < 0)) issues.push(`${product.name}: estoque de cor inválido`);
  return issues;
}));

verifyIntegrity('integridade da galeria pública', products.flatMap(product => {
  const items = mediaByProduct.get(product.id) || [];
  const issues = [];
  const images = items.filter(item => (item.media_type || 'image') === 'image');
  const covers = items.filter(item => item.is_cover);
  if (!images.length) issues.push(`${product.name}: sem foto`);
  if (items.length > 10) issues.push(`${product.name}: mais de 10 mídias`);
  if (covers.length !== 1 || covers[0]?.media_type === 'video') issues.push(`${product.name}: capa inválida`);
  return issues;
}));

verifyIntegrity('metadados das mídias', media.flatMap(item => {
  const issues = [];
  const type = item.media_type || 'image';
  if (!productIds.has(item.product_id)) return [];
  if (!['image', 'video'].includes(type)) issues.push(`${item.id}: tipo ${type} inválido`);
  try {
    const parsed = new URL(item.image_url);
    if (parsed.protocol !== 'https:') issues.push(`${item.id}: URL não HTTPS`);
  } catch { issues.push(`${item.id}: URL inválida`); }
  if (type === 'video' && item.is_cover) issues.push(`${item.id}: vídeo marcado como capa`);
  return issues;
}));

if (failed) {
  console.error('A integração remota ainda possui pendências. Revise as migrations e os registros indicados acima.');
  process.exitCode = 1;
}
