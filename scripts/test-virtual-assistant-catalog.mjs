import assert from 'node:assert/strict';
import { matchAssistantIntent, normaliseAssistantText, searchStore } from '../virtual-assistant-catalog.js';

const environments = [
  { name: 'Sala', slug: 'sala', subcategories: [{ name: 'Sofá' }, { name: 'Mesa para Sala' }, { name: 'Centro' }] },
  { name: 'Quarto', slug: 'quarto', subcategories: [{ name: 'Roupeiro' }, { name: 'Camas' }, { name: 'Colchões' }] },
  { name: 'Cozinha', slug: 'cozinha', subcategories: [{ name: 'Armário de Parede' }, { name: 'Balcão' }, { name: 'Mesa Plástica' }, { name: 'Cantoneira' }] },
  { name: 'Escritório', slug: 'escritorio', subcategories: [{ name: 'Mesa de Computador' }, { name: 'Cadeira Giratória' }] },
  { name: 'Eletros', slug: 'eletros', subcategories: [{ name: 'Geladeira' }, { name: 'Televisores' }] }
];

const product = (id, name, options = {}) => ({
  id, name, category: options.subcategory || 'Móveis', environment: options.environment || '', subcategory: options.subcategory || '',
  description: options.description || '', specifications: options.specifications || {}, price: options.price ?? 1000,
  oldPrice: options.oldPrice ?? null, installmentCount: 10, installmentValue: (options.price ?? 1000) / 10,
  stock: options.stock ?? 3, available: (options.stock ?? 3) > 0, cartEnabled: true, whatsappEnabled: true,
  freeShipping: Boolean(options.freeShipping), freeAssembly: Boolean(options.freeAssembly), onSale: Boolean(options.onSale), image: 'produto.jpg'
});

const products = [
  product(1, 'Armário Multiuso 2 Portas Nature', { environment: 'Cozinha', subcategory: 'Armário de Parede', price: 549, freeAssembly: true }),
  product(2, 'Cantoneira Alta Nature', { environment: 'Cozinha', subcategory: 'Cantoneira', price: 399 }),
  product(3, 'Armário de Cozinha 8 Portas', { environment: 'Cozinha', subcategory: 'Armário de Parede', price: 899, onSale: true }),
  product(4, 'Guarda-Roupa 6 Portas com Espelho', { environment: 'Quarto', subcategory: 'Roupeiro', price: 1199, freeShipping: true }),
  product(5, 'Sofá Retrátil 3 Lugares', { environment: 'Sala', subcategory: 'Sofá', price: 1899, onSale: true, freeShipping: true }),
  product(6, 'Sofá Premium 4 Lugares', { environment: 'Sala', subcategory: 'Sofá', price: 2499 }),
  product(7, 'Mesa Office com 2 Gavetas', { environment: 'Escritório', subcategory: 'Mesa de Computador', price: 549 }),
  product(8, 'Mesa de Jantar 4 Lugares com Cadeiras', { environment: 'Sala', subcategory: 'Mesa para Sala', price: 1069 }),
  product(9, 'Cama Box Casal Confort', { environment: 'Quarto', subcategory: 'Camas', price: 1249 }),
  product(10, 'Colchão Queen D33', { environment: 'Quarto', subcategory: 'Colchões', price: 1399 }),
  product(11, 'Mesa Plástica 4 Lugares', { environment: 'Cozinha', subcategory: 'Mesa Plástica', price: 299 })
];

const data = { products, environments, store: { pixEnabled: true, cardEnabled: true, maxInstallments: 10 } };
const names = result => result.products?.map(item => item.name) || [];

assert.equal(normaliseAssistantText('  ARMÁRIOS-de Cozinha! '), 'armarios de cozinha');
assert.equal(matchAssistantIntent('guarda roupa', environments).label, 'Roupeiro');
assert.equal(matchAssistantIntent('tv', environments).label, 'Televisores');
assert.equal(matchAssistantIntent('minha sacola', environments).type, 'cart');

let result = searchStore('armário', data);
assert.equal(result.type, 'products');
assert.deepEqual(names(result), ['Armário Multiuso 2 Portas Nature', 'Armário de Cozinha 8 Portas']);
assert.ok(!names(result).some(name => /Cantoneira/.test(name)));

result = searchStore('armário 2 portas', data);
assert.deepEqual(names(result), ['Armário Multiuso 2 Portas Nature']);
assert.ok(!names(result).some(name => /Cantoneira/.test(name)));

assert.equal(searchStore('mesa', data).type, 'choices');
assert.deepEqual(names(searchStore('mesa de computador', data)), ['Mesa Office com 2 Gavetas']);
assert.deepEqual(names(searchStore('sofá', data)), ['Sofá Retrátil 3 Lugares', 'Sofá Premium 4 Lugares']);
assert.deepEqual(names(searchStore('sofá até 2000', data)), ['Sofá Retrátil 3 Lugares']);
assert.deepEqual(names(searchStore('roupeiro 6 portas', data)), ['Guarda-Roupa 6 Portas com Espelho']);
assert.deepEqual(names(searchStore('cama casal', data)), ['Cama Box Casal Confort']);
assert.deepEqual(names(searchStore('colchão queen', data)), ['Colchão Queen D33']);

const context = { lastQuery: 'sofá', lastAllIds: [5, 6], lastShownIds: [5, 6] };
assert.deepEqual(names(searchStore('mais barato', data, context)), ['Sofá Retrátil 3 Lugares', 'Sofá Premium 4 Lugares']);
assert.deepEqual(names(searchStore('com frete grátis', data, context)), ['Sofá Retrátil 3 Lugares']);
assert.deepEqual(names(searchStore('tem armação grátis?', data, { lastQuery: 'armário', lastAllIds: [1, 3], lastShownIds: [1, 3] })), ['Armário Multiuso 2 Portas Nature']);
assert.equal(searchStore('tem armação grátis?', data, { selectedProductId: 1 }).text, 'Sim, Armário Multiuso 2 Portas Nature está marcado com Armação Gratuita.');
assert.equal(searchStore('quanto custa?', data, { selectedProductId: 1 }).type, 'product-info');
assert.equal(searchStore('xyzabc', data).type, 'fallback');
assert.equal(searchStore('formas de pagamento', data).type, 'info');

const updated = { ...data, products: [...products, product(12, 'Poltrona Serena Bouclé', { environment: 'Sala', subcategory: 'Poltrona', price: 799 })] };
assert.deepEqual(names(searchStore('poltrona serena', updated)), ['Poltrona Serena Bouclé']);

console.log('Assistente especialista: catálogo, atributos, preço, contexto e fallback validados.');
