import assert from 'node:assert/strict';
import { matchAssistantIntent, normaliseAssistantText } from '../virtual-assistant.js';

const environments = [
  { name: 'Sala', slug: 'sala', subcategories: [{ name: 'Sofá', slug: 'sofa' }, { name: 'Painel' }] },
  { name: 'Quarto', slug: 'quarto', subcategories: [{ name: 'Roupeiro' }, { name: 'Camas' }] },
  { name: 'Cozinha', slug: 'cozinha', subcategories: [{ name: 'Armário de Parede' }, { name: 'Balcão' }] },
  { name: 'Eletros', slug: 'eletros', subcategories: [{ name: 'Geladeira' }, { name: 'Televisores' }] },
  { name: 'Escritório', slug: 'escritorio', subcategories: [{ name: 'Cadeira Giratória' }] }
];

const cases = [
  ['sofá', 'subcategory', 'Sofá'], ['quero ver sofás', 'subcategory', 'Sofá'], ['SOFAS', 'subcategory', 'Sofá'],
  ['me mostre armários', 'subcategory', 'Armário de Parede'], ['ARMARIO DE COZINHA', 'subcategory', 'Armário de Parede'],
  ['guarda roupa', 'subcategory', 'Roupeiro'], ['guarda-roupa', 'subcategory', 'Roupeiro'],
  ['quero ver camas', 'subcategory', 'Camas'], ['quero alguma coisa para cozinha', 'environment', 'Cozinha'],
  ['geladeira', 'subcategory', 'Geladeira'], ['tv', 'subcategory', 'Televisores'],
  ['cadeira escritório', 'subcategory', 'Cadeira Giratória'], ['promoções', 'offers'], ['OFERTAS', 'offers'],
  ['minha sacola', 'cart'], ['ver meu carrinho', 'cart'], ['quero falar com alguém', 'whatsapp'],
  ['WhatsApp', 'whatsapp'], ['xyzabc', 'fallback']
];

for (const [message, type, label] of cases) {
  const result = matchAssistantIntent(message, environments);
  assert.equal(result.type, type, `Intenção incorreta para “${message}”`);
  if (label) assert.equal(result.label, label, `Destino incorreto para “${message}”`);
}

assert.equal(normaliseAssistantText('  ARMÁRIOS-de Cozinha! '), 'armarios de cozinha');
console.log(`Assistente virtual: ${cases.length} intenções validadas.`);

