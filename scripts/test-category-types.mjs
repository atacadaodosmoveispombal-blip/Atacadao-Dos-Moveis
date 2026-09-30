import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const source = readFileSync(fileURLToPath(new URL('../app.js', import.meta.url)), 'utf8');
const match = source.match(/function catalogMatchesTaxonomy\([^\n]+/);
assert.ok(match, 'O filtro de catálogo por tipo deve existir.');
const matches = vm.runInNewContext(`(${match[0]})`);

const products = [
  { id: 1, environment: 'Sala', subcategory: 'Sofá', typeId: 'dois' },
  { id: 2, environment: 'Sala', subcategory: 'Sofá', typeId: 'tres' },
  { id: 3, environment: 'Sala', subcategory: 'Sofá', typeId: '' },
  { id: 4, environment: 'Sala', subcategory: 'Poltrona', typeId: '' },
  { id: 5, environment: 'Quarto', subcategory: 'Roupeiro', typeId: 'dois' }
];
const ids = (environment, subcategory, typeId) => products.filter(product => matches(product, environment, subcategory, typeId)).map(product => product.id);

assert.deepEqual(ids('Sala', 'Sofá', 'tres'), [2], 'Um tipo deve mostrar somente seus próprios produtos.');
assert.deepEqual(ids('Sala', 'Sofá', ''), [1, 2, 3], 'A subcategoria deve continuar incluindo produtos antigos sem tipo.');
assert.deepEqual(ids('Sala', 'Poltrona', ''), [4], 'Subcategorias sem tipos devem abrir diretamente.');
assert.deepEqual(ids('Sala', '', ''), [1, 2, 3, 4], 'O ambiente deve incluir todos os seus produtos.');
assert.deepEqual(ids('Todas', '', ''), [1, 2, 3, 4, 5], 'A navegação geral deve continuar intacta.');

console.log('OK filtro exato por tipo, produtos antigos e subcategorias sem tipos');
