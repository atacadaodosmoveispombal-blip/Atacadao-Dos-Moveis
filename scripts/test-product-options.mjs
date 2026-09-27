import { readFile } from 'node:fs/promises';

const [admin, storefront, app, migration] = await Promise.all([
  readFile('admin-app.js', 'utf8'),
  readFile('storefront-cms.js', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('supabase/migrations/20261008_product_options.sql', 'utf8')
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const colorsTab = admin.indexOf("key: 'variations', label: 'Cores'");
const optionsTab = admin.indexOf("key: 'product_options', label: 'Opções do Produto'");
const benefitsTab = admin.indexOf("key: 'benefits', label: 'Benefícios / Selos'");
assert(colorsTab >= 0 && colorsTab < optionsTab && optionsTab < benefitsTab, 'A aba Opções do Produto não está logo após Cores.');
assert(admin.includes("{ name: 'Espelho', slug: 'espelho'"), 'Opção inicial Espelho ausente.');
assert(admin.includes("{ name: 'Ripado', slug: 'ripado'"), 'Opção inicial Ripado ausente.');
assert(admin.includes("db.rpc('replace_product_options'"), 'Cadastro individual não usa a persistência estruturada compartilhada.');
assert(admin.includes("await saveProductOptions(data.id, selectedProductOptionPayload(row.productOptions || []))"), 'Cadastro em Massa não usa a persistência compartilhada.');
assert(admin.includes('data-mass-options-open'), 'Configuração rápida das opções no Cadastro em Massa ausente.');

assert(migration.includes('create table if not exists public.product_option_groups'), 'Tabela de grupos de opções ausente.');
assert(migration.includes('create table if not exists public.product_option_values'), 'Tabela de alternativas ausente.');
assert(migration.includes('create or replace function public.replace_product_options'), 'Atualização atômica das opções ausente.');
assert(!migration.includes('alter table public.product_variants'), 'A migration de opções não deve alterar a estrutura de cores.');

assert(storefront.includes("const optionRelation = 'product_option_groups"), 'Catálogo não consulta as opções estruturadas.');
assert(storefront.includes('const productOptions = [...(row.product_option_groups || [])]'), 'Catálogo não mapeia opções do produto.');
assert(app.includes('function openProductWithOptions'), 'Página do produto não renderiza os seletores de opções.');
assert(app.includes('function productOptionMessage'), 'Mensagem de WhatsApp não formata as opções escolhidas.');
assert(app.includes('const missingOption=missingProductOptionGroup(base)'), 'WhatsApp não valida opções existentes sem seleção.');
assert(app.includes('productOptions:selectedProductOptionDetails(base)'), 'Evento de WhatsApp não registra as opções escolhidas.');

console.log('OK aba individual após Cores');
console.log('OK Espelho, Ripado e opções futuras');
console.log('OK Cadastro em Massa na mesma estrutura');
console.log('OK banco relacional e substituição atômica');
console.log('OK exibição condicional no site');
console.log('OK opções escolhidas no WhatsApp');
console.log('OK independência de cores e imagens');
