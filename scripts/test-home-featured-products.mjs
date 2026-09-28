import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [admin, storefront, app, index, styles, migration, contract, cmsVerification] = await Promise.all([
  readFile('admin-app.js', 'utf8'),
  readFile('storefront-cms.js', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('styles.css', 'utf8'),
  readFile('supabase/migrations/20261012_home_featured_products.sql', 'utf8'),
  readFile('config/admin-feature-contract.json', 'utf8'),
  readFile('scripts/verify-cms.mjs', 'utf8')
]);

assert(admin.includes('HOME_FEATURED_LIMIT = 4') && admin.includes('data-product-home-featured'), 'O painel não possui a seleção manual de até quatro produtos da Home.');
assert(admin.includes('Você já selecionou o limite de 4 produtos para a Home. Desmarque um produto para selecionar outro.'), 'A mensagem obrigatória do quinto produto não foi preservada.');
assert(admin.includes("update({ home_featured: input.checked })") && !admin.includes("update({ featured: input.checked, home_featured"), 'A Home não está independente do destaque promocional existente.');
assert(storefront.includes('homeFeatured: Boolean(row.home_featured)') && storefront.includes('mirror_feature,ribbed_feature,home_featured'), 'O CMS público não sincroniza a seleção manual da Home.');
assert(app.includes('HOME_PRODUCT_LIMIT=4,CATEGORY_PAGE_SIZE=8') && app.includes('p=>p.homeFeatured===true'), 'A Home não limita a vitrine aos quatro itens escolhidos.');
assert(app.includes('list.slice(0,categoryVisibleLimit)') && app.includes('categoryVisibleLimit+=CATEGORY_PAGE_SIZE'), 'As categorias não carregam os produtos em lotes de oito.');
assert(index.includes('id="catalogLoadMore"') && index.includes('VER MAIS PRODUTOS'), 'O botão Ver mais produtos não existe no catálogo de categorias.');
assert(app.includes("loadMore.hidden=!categoryMode||visibleList.length>=total"), 'O botão Ver mais não desaparece ao chegar ao fim da categoria.');
assert(app.includes("function scrollToTop(){assistantResultIds=null;offersOnly=false;activeCat='Todas';activeEnvironment='Todas';activeSubcategory=''"), 'Voltar para Início não limpa os filtros de categoria.');
assert(index.includes('id="ofertas" hidden') && index.includes('id="mais-vendidos" hidden') && index.includes('class="office-products" hidden'), 'Uma linha automática adicional de produtos ainda pode aparecer na Home.');
assert(!index.includes('class="banner-strip" hidden'), 'Os banners existentes foram ocultados indevidamente.');
assert(styles.includes('.catalogue .product-grid{grid-template-columns:repeat(4'), 'Os quatro produtos não permanecem lado a lado no desktop.');
assert(migration.includes('add column if not exists home_featured') && migration.includes('selected_count >= 4'), 'A migration não protege o limite de quatro no banco.');
assert(migration.includes('pg_advisory_xact_lock') && migration.includes('HOME_FEATURED_LIMIT_REACHED'), 'O limite não está protegido contra seleções concorrentes.');
assert(!migration.match(/update\s+public\.products[\s\S]*home_featured/i), 'A migration seleciona produtos automaticamente, contrariando a regra manual.');
assert(contract.includes('quatro destaques manuais da Home e ver mais por categoria'), 'A funcionalidade não foi adicionada ao contrato antirregressão.');
assert(cmsVerification.includes('limite de destaques manuais da Home'), 'A verificação pós-deploy não confere o limite de quatro.');

console.log('OK quatro destaques manuais da Home, limite transacional e Ver mais exclusivo das categorias');
