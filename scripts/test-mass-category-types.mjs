import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const source = readFileSync(fileURLToPath(new URL('../admin-app.js', import.meta.url)), 'utf8');
const block = (start, end) => source.slice(source.indexOf(`function ${start}(`), source.indexOf(`function ${end}(`));
const context = vm.createContext({ esc: value => String(value) });
vm.runInContext(`${block('massTypeIds', 'newMassColorSelection')}${block('massEffectiveValues', 'massProductErrors')};this.api={massTypeIds,massTypeChoices,massEffectiveValues}`, context);
const { massTypeIds, massTypeChoices, massEffectiveValues } = context.api;
assert.equal(JSON.stringify(massTypeIds(['a', 'b', 'a'])), '["a","b"]', 'Tipos repetidos devem ser eliminados.');
const base = { environment_id: 'quarto', category_id: 'roupeiro', type_ids: ['bater', 'correr'], material: '', mirror_feature: '', ribbed_feature: '', warranty: '', description: '' };
const row = { overrides: {} };
assert.equal(JSON.stringify(massEffectiveValues(row, base).type_ids), '["bater","correr"]', 'Uma linha nova herda os dois tipos do padrão.');
assert.equal(massEffectiveValues(row, base).type_id, 'bater', 'O primeiro tipo continua na coluna legada.');
row.overrides.type_ids = ['correr', 'espelho'];
assert.equal(JSON.stringify(massEffectiveValues(row, base).type_ids), '["correr","espelho"]', 'A linha pode ter outra combinação de tipos.');
row.overrides.type_ids = [];
assert.equal(massEffectiveValues(row, base).type_ids.length, 0, 'A linha pode remover todos os tipos herdados.');
const mass = { types: [
  { id: 'bater', category_id: 'roupeiro', name: 'Roupeiro de Bater' },
  { id: 'correr', category_id: 'roupeiro', name: 'Roupeiro de Correr' },
  { id: 'cama', category_id: 'camas', name: 'Cama' }
] };
const choices = massTypeChoices(mass, 'roupeiro', ['bater', 'correr'], 'data-mass-base-type');
assert.equal((choices.match(/checked/g) || []).length, 2, 'Os dois tipos devem aparecer marcados.');
assert.ok(!choices.includes('Cama'), 'Tipos de outra subcategoria não devem aparecer.');
assert.match(source, /product_category_types'\)\.insert\(typeIds\.map\(category_type_id/, 'O salvamento deve criar todas as associações.');
assert.match(source, /common\.type_ids\.some\(id => !mass\.types\.some/, 'Todas as associações devem ser validadas.');
console.log('OK herança, substituição, remoção, escopo, validação e persistência de tipos no cadastro em massa');
