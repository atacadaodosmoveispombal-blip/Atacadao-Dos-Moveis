import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [styles, app] = await Promise.all([
  readFile('styles.css', 'utf8'),
  readFile('app.js', 'utf8')
]);

assert(
  styles.includes('.catalogue .product-grid{grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;gap:18px}'),
  'O catálogo desktop não está protegido com quatro colunas e espaçamento uniforme.'
);
assert(
  !styles.includes('.product-grid,.catalogue .product-grid,.office-grid{grid-template-columns:repeat(3'),
  'Uma regra global voltou a sobrescrever o catálogo desktop para três colunas.'
);
assert(
  styles.includes('.official-product-photo{position:relative;width:100%;aspect-ratio:1280/1270;'),
  'A área da foto não utiliza a proporção padrão 1280 × 1270.'
);
assert(
  styles.includes('object-fit:contain;object-position:center') &&
    styles.includes('.catalogue .official-product-card:hover .official-product-photo>img{transform:none}'),
  'As artes do produto podem voltar a ser cortadas ou deformadas no catálogo.'
);
assert(
  styles.includes('@media(max-width:1000px){.product-grid,.catalogue .product-grid,.office-grid{grid-template-columns:repeat(2') &&
    styles.includes('@media(max-width:620px){.product-grid,.catalogue .product-grid,.office-grid{grid-template-columns:minmax(0,1fr)'),
  'Os breakpoints responsivos de tablet e celular não foram preservados.'
);
assert(
  app.includes('width="1280" height="1270"'),
  'A marcação da imagem do card não declara a proporção intrínseca 1280 × 1270.'
);

for (const marker of [
  'official-product-heart',
  'official-product-price',
  'official-product-benefits',
  'product-add-bag',
  'product-whatsapp'
]) {
  assert(app.includes(marker), `O conteúdo protegido do card foi removido: ${marker}.`);
}

console.log('OK catálogo desktop com quatro colunas, fotos 1280 × 1270 sem corte e conteúdo dos cards preservado');
