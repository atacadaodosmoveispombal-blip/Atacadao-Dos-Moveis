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
assert(admin.includes('SIMPLE_CATEGORY_IMAGE_PRESETS') && admin.includes('data-simple-category-image'), 'As imagens predefinidas clicáveis não foram preservadas.');
assert(admin.includes('Clique em uma das imagens que já existem no site.'), 'A orientação simples de escolha da imagem está ausente.');
assert(admin.includes('Nome da categoria') && admin.includes('Descrição curta') && admin.includes('Categoria ativa'), 'Os campos essenciais do cadastro simples estão ausentes.');
assert(admin.includes('simpleCreate') && admin.includes('preset_image_url'), 'A imagem escolhida não está sendo persistida no cadastro.');
assert(admin.includes("activeInput.type === 'checkbox' ? activeInput.checked : activeInput.value === 'true'"), 'O seletor Sim/Não não está integrado ao salvamento.');
assert(admin.includes('async function openCategoryEditor(record = null)') && admin.includes('category-products-section'), 'O editor completo das categorias existentes foi removido.');
assert(admin.includes("$('#saveEditor').textContent = 'Salvar e publicar'") && adminHtml.includes('data-close>Cancelar</button>'), 'Os únicos comandos finais necessários não foram preservados.');
assert(styles.includes('.simple-category-layout') && styles.includes('.simple-category-preview'), 'O formulário e a prévia responsiva não possuem estilos.');

console.log('OK nova categoria simples, imagens predefinidas, prévia e edição existente preservada');
