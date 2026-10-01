import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const read = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const storefront = read('../app.js');
const styles = read('../styles.css');
const admin = read('../admin-app.js');
const cms = read('../storefront-cms.js');
const iconSource = read('../category-icons.js');
const window = {};
vm.runInNewContext(iconSource, { window });
const icons = window.CategoryIcons;
const extract = (source, start, end) => source.slice(source.indexOf(`function ${start}(`), source.indexOf(`function ${end}(`));
const picker = vm.runInNewContext(`(${extract(admin, 'iconPickerMarkup', 'bindIconPicker')})`, { CategoryIcons: icons, esc: value => String(value) });
const pickerMarkup = picker('tipo-roupeiro-correr');
assert.match(pickerMarkup, /name="icon_key" value="tipo-roupeiro-correr"/, 'O ícone escolhido deve entrar no formulário.');
assert.match(pickerMarkup, /data-icon-choice="tipo-roupeiro-correr" aria-pressed="true"/, 'A escolha atual deve ficar visível.');
assert.ok(!pickerMarkup.includes('<img'), 'A galeria de ícones não deve usar fotos.');
const typeIcon = vm.runInNewContext(`(${extract(storefront, 'typeIcon', 'openDesktopEnvironmentMenu')})`, {
  CategoryIcons: icons,
  normaliseSearch: value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
});
const wardrobe = { name: 'Roupeiro', icon_key: 'roupeiro' };
const bedroom = { name: 'Quarto' };
const bed = icons.icon('tipo-cama', { size: 20 });
for (const [name, key] of [
  ['Roupeiro de Bater', 'tipo-roupeiro-bater'],
  ['Roupeiro de Correr', 'tipo-roupeiro-correr'],
  ['Roupeiro Solteiro (3/4 portas)', 'tipo-roupeiro-4-portas'],
  ['Roupeiro 3 portas', 'tipo-roupeiro-3-portas'],
  ['Roupeiro 6 portas', 'tipo-roupeiro-6-portas']
]) {
  const actual = typeIcon({ name }, wardrobe, bedroom, 20);
  assert.equal(actual, icons.icon(key, { size: 20 }), `${name} deve ter desenho próprio de roupeiro`);
  assert.notEqual(actual, bed);
}
assert.equal(typeIcon({ name: 'Modelo novo', icon_key: 'tipo-closet' }, wardrobe, bedroom), icons.icon('tipo-closet', { size: 20 }), 'O ícone escolhido no painel tem prioridade.');
assert.match(styles, /\.environment-mega-types>button \.category-icon\{[^}]*color:#0751b7/, 'Tipos não clicados devem continuar azuis.');
assert.match(styles, /\.environment-mega-links button\.is-selected \.category-icon\{color:#bd9100\}/, 'Só a subcategoria selecionada recebe destaque.');
assert.ok(admin.includes('bindIconPicker($(\'#editorFields\'), syncCategoryPreview)'), 'O seletor da subcategoria deve atualizar a prévia.');
assert.ok(admin.includes("['icon_key', 'Ícone do tipo', 'iconpicker']"), 'O tipo deve permitir escolher o ícone.');
assert.ok(cms.includes("select('id,category_id,name,slug,icon_key,active,sort_order')"), 'O menu deve carregar o ícone salvo.');
console.log('OK ícones de roupeiro, seleção azul, galeria no painel e leitura do ícone salvo');
