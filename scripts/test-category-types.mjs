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
  { id: 5, environment: 'Quarto', subcategory: 'Roupeiro', typeId: 'dois' },
  { id: 6, environment: 'Quarto', subcategory: 'Roupeiro', typeId: 'casal', typeIds: ['casal', 'correr', 'espelho'] }
];
const ids = (environment, subcategory, typeId) => products.filter(product => matches(product, environment, subcategory, typeId)).map(product => product.id);

assert.deepEqual(ids('Sala', 'Sofá', 'tres'), [2], 'Um tipo deve mostrar somente seus próprios produtos.');
assert.deepEqual(ids('Quarto', 'Roupeiro', 'correr'), [6], 'O mesmo produto deve aparecer em cada tipo associado.');
assert.deepEqual(ids('Quarto', 'Roupeiro', 'espelho'), [6], 'A associação múltipla não deve depender do tipo principal.');
assert.deepEqual(ids('Sala', 'Sofá', ''), [1, 2, 3], 'A subcategoria deve continuar incluindo produtos antigos sem tipo.');
assert.deepEqual(ids('Sala', 'Poltrona', ''), [4], 'Subcategorias sem tipos devem abrir diretamente.');
assert.deepEqual(ids('Sala', '', ''), [1, 2, 3, 4], 'O ambiente deve incluir todos os seus produtos.');
assert.deepEqual(ids('Todas', '', ''), [1, 2, 3, 4, 5, 6], 'A navegação geral deve continuar intacta.');

const sourceBlock = (start, end) => source.slice(source.indexOf(`function ${start}(`), source.indexOf(`function ${end}(`));
const events = [];
const classes = () => {
  const names = new Set();
  return { add: name => names.add(name), remove: name => names.delete(name), toggle: (name, enabled) => enabled ? names.add(name) : names.delete(name), contains: name => names.has(name) };
};
const subcategoryButton = { dataset: { megaSubcategory: 'Roupeiro' }, classList: classes(), setAttribute() {}, removeAttribute() {} };
const otherSubcategoryButton = { dataset: { megaSubcategory: 'Camas' }, classList: classes(), setAttribute() {}, removeAttribute() {} };
const typeButton = { dataset: { megaType: 'casal' } };
const typePanel = { hidden: true, classList: classes(), querySelectorAll: () => [typeButton] };
const allButton = {};
const mega = {
  hidden: true, dataset: {}, classList: classes(), getBoundingClientRect: () => ({ right: 800 }),
  querySelector: selector => selector === '.environment-mega-types' ? typePanel : selector === '[data-mega-all]' ? allButton : selector === '[data-mega-subcategory].is-selected' ? subcategoryButton.classList.contains('is-selected') ? subcategoryButton : null : subcategoryButton,
  querySelectorAll: () => [subcategoryButton, otherSubcategoryButton]
};
const environment = { name: 'Quarto', subcategories: [{ name: 'Roupeiro', types: [{ id: 'casal', name: 'Casal' }] }] };
const context = vm.createContext({
  document: { querySelector: () => mega, querySelectorAll: () => [] },
  environmentRecord: () => environment, desktopMegaMarkup: () => '',
  subcategoryName: item => item.name,
  clearTimeout() {}, requestAnimationFrame: callback => callback(), normaliseSearch: value => value.toLowerCase(),
  storeHtml: value => value, typeIcon: () => '<svg></svg>', innerWidth: 1200,
  filterSubcategory: (...args) => events.push(['subcategory', ...args]),
  filterType: (...args) => events.push(['type', ...args]),
  environmentMenuTimer: null,
  setTimeout: () => { throw new Error('O menu selecionado não deve agendar fechamento ao sair com o mouse.'); }
});
for (const [start, end] of [['showDesktopTypes', 'typeIcon'], ['openDesktopEnvironmentMenu', 'openDesktopAllEnvironmentsMenu'], ['scheduleEnvironmentMenuClose', 'renderMobileEnvironmentPanel']]) {
  vm.runInContext(`${sourceBlock(start, end)};this.${start}=${start}`, context);
}
context.openDesktopEnvironmentMenu('Quarto');
subcategoryButton.onclick();
assert.equal(subcategoryButton.classList.contains('is-selected'), true, 'Roupeiro deve permanecer destacado após o clique.');
assert.equal(otherSubcategoryButton.classList.contains('is-selected'), false, 'Outras subcategorias devem continuar sem seleção.');
assert.equal(typePanel.hidden, false, 'O painel de tipos deve continuar aberto após o clique.');
context.scheduleEnvironmentMenuClose();
assert.equal(typePanel.hidden, false, 'Sair com o mouse não deve fechar o painel selecionado.');
typeButton.onclick();
assert.deepEqual(events, [['subcategory', 'Quarto', 'Roupeiro', true], ['type', 'Quarto', 'Roupeiro', 'casal']]);
assert.deepEqual(ids('Quarto', 'Roupeiro', 'casal'), [6], 'O clique em Casal deve filtrar somente os roupeiros correspondentes.');

console.log('OK filtro exato por tipo, menu fixo após clique, múltiplos tipos e produtos antigos');
