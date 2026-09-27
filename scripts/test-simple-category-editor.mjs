import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [admin, adminHtml, styles] = await Promise.all([
  readFile('admin-app.js', 'utf8'),
  readFile('admin.html', 'utf8'),
  readFile('admin.css', 'utf8')
]);

assert(admin.includes('async function openSimpleCategoryCreate()'), 'O formulário simples de nova categoria não foi preservado.');
assert(admin.includes('if (!record) return openSimpleCategoryCreate();'), 'A criação não está separada da edição de categorias existentes.');
const simpleEditor = admin.slice(admin.indexOf('async function openSimpleCategoryCreate()'), admin.indexOf('async function openCategoryEditor'));
assert(simpleEditor.includes("select('id,name,sort_order,environment_id,image_url,icon_key')"), 'As imagens já cadastradas no banco não alimentam a grade visual.');
assert(simpleEditor.includes('storedImages') && simpleEditor.includes('CategoryIcons.keys.map') && simpleEditor.includes('data-simple-category-image'), 'O banco visual existente do projeto não está disponível diretamente na tela.');
assert(simpleEditor.includes('Clique em uma imagem ou ícone que já existe no projeto.'), 'A orientação simples de escolha visual está ausente.');
assert(simpleEditor.includes('1. Ambiente') && simpleEditor.includes('2. Nome da categoria/subcategoria') && simpleEditor.includes('3. Descrição curta') && simpleEditor.includes('4. Escolher imagem'), 'O fluxo essencial do cadastro simples está incompleto ou fora de ordem.');
assert(simpleEditor.includes('Posição') && simpleEditor.includes('Categoria ativa'), 'Posição e situação da categoria não foram preservadas.');
assert(simpleEditor.includes('visual_selected') && admin.includes('Escolha uma imagem ou ícone antes de salvar.'), 'A escolha de uma imagem ou ícone não é obrigatoriamente validada.');
assert(simpleEditor.includes('simple-category-preview-visual') && simpleEditor.includes('choice.type === \'image\''), 'A escolha visual não atualiza imediatamente a prévia.');
assert(!simpleEditor.includes('type="file"') && !simpleEditor.includes('SIMPLE_CATEGORY_IMAGE_PRESETS') && !simpleEditor.includes('images.unsplash.com'), 'O cadastro simples ainda oferece upload ou imagens externas fixas.');
assert(admin.includes('simpleCreate') && admin.includes('preset_image_url'), 'A imagem escolhida não está sendo persistida no cadastro.');
assert(admin.includes("activeInput.type === 'checkbox' ? activeInput.checked : activeInput.value === 'true'"), 'O seletor Sim/Não não está integrado ao salvamento.');
assert(admin.includes('async function openCategoryEditor(record = null)') && admin.includes('category-products-section'), 'O editor completo das categorias existentes foi removido.');
assert(admin.includes("$('#saveEditor').textContent = 'Salvar e publicar'") && adminHtml.includes('data-close>Cancelar</button>'), 'Os únicos comandos finais necessários não foram preservados.');
assert(styles.includes('.simple-category-layout') && styles.includes('.simple-category-preview'), 'O formulário e a prévia responsiva não possuem estilos.');

console.log('OK nova categoria simples, ambiente, banco visual existente, prévia e edição preservada');
