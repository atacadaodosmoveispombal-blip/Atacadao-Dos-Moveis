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
assert.match(pickerMarkup, /Roupeiros/, 'A galeria deve organizar os desenhos por ambiente.');
assert.match(pickerMarkup, /Buscar desenho/, 'A galeria deve permitir encontrar um desenho pelo nome.');
assert.match(pickerMarkup, /Sofá de canto/, 'Os desenhos da imagem de referência devem ter nomes legíveis.');
const seed = read('../supabase/migrations/20261016_category_type_assignments_and_seed.sql');
const seedBlock = seed.match(/with seed\(environment_slug, category_slug, type_name, type_slug, sort_order\) as \(\s*values([\s\S]*?)\)\s*insert into public\.category_types/)?.[1];
assert.ok(seedBlock, 'A lista dos tipos solicitados deve estar disponível.');
const requestedTypes = [...seedBlock.matchAll(/\('([^']+)','([^']+)','([^']+)','([^']+)',\d+\)/g)];
assert.equal(requestedTypes.length, 66, 'A referência deve conter os 66 tipos solicitados.');
for (const [, , subcategory, name] of requestedTypes) {
  const key = icons.typeKeyFor(name, subcategory);
  assert.ok(key, `${subcategory} → ${name} precisa de desenho automático.`);
  assert.ok(icons.keys.includes(key), `${subcategory} → ${name} aponta para um SVG existente.`);
  assert.match(icons.icon(key), /^<svg[^>]+>.*<\/svg>$/, `${subcategory} → ${name} deve renderizar como SVG.`);
}
assert.notEqual(icons.typeKeyFor('Casal', 'Roupeiro'), icons.typeKeyFor('Casal', 'Camas'), 'O mesmo nome deve receber desenhos específicos da subcategoria.');
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
assert.equal(typeIcon({ name: 'Queen', slug: 'queen' }, { name: 'Camas', slug: 'camas' }, bedroom), icons.icon('cama-queen', { size: 20 }), 'Os tipos de cama devem mostrar o desenho correspondente no site.');
assert.match(styles, /\.environment-mega-types>button \.category-icon\{[^}]*color:#0751b7/, 'Tipos não clicados devem continuar azuis.');
assert.match(styles, /\.environment-mega-links button\.is-selected \.category-icon\{color:#bd9100\}/, 'Só a subcategoria selecionada recebe destaque.');
assert.ok(admin.includes('bindIconPicker($(\'#editorFields\'), syncCategoryPreview)'), 'O seletor da subcategoria deve atualizar a prévia.');
assert.ok(admin.includes("['icon_key', 'Ícone do tipo', 'iconpicker']"), 'O tipo deve permitir escolher o ícone.');
assert.ok(cms.includes("select('id,category_id,name,slug,icon_key,active,sort_order')"), 'O menu deve carregar o ícone salvo.');
console.log('OK ícones de roupeiro, seleção azul, galeria no painel e leitura do ícone salvo');
