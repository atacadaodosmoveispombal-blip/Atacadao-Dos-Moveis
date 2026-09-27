import { readFile } from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [admin, adminHtml, storefront, hero, styles] = await Promise.all([
  readFile('admin-app.js', 'utf8'),
  readFile('admin.html', 'utf8'),
  readFile('storefront-cms.js', 'utf8'),
  readFile('hero-carousel.js', 'utf8'),
  readFile('styles.css', 'utf8')
]);

assert(adminHtml.includes('data-view="banners">▣ Editar Home'), 'O menu simplificado Editar Home não está disponível.');
assert(!adminHtml.includes('data-view="sections"'), 'A tela técnica Página inicial continua exposta no menu.');
assert(admin.includes("banners: 'Editar Home'"), 'O título do editor visual não foi preservado.');
assert(admin.includes('Troque as imagens, vídeos e textos que aparecem na página inicial.'), 'O texto simples do editor visual não foi preservado.');
assert(admin.includes('CARROSSEL DO TOPO') && admin.includes('DESTAQUES DA HOME'), 'As duas áreas visuais da Home não foram preservadas.');
assert(admin.includes("if ((count || 0) >= 8)"), 'O limite de oito slides não está protegido ao salvar.');
assert(admin.includes('1600 × 650 px') && admin.includes('image/jpeg,image/png,image/webp'), 'As orientações e formatos de foto não estão presentes.');
assert(admin.includes('video/mp4,video/webm') && admin.includes('até 50 MB'), 'Os formatos e o limite de vídeo não estão presentes.');
assert(admin.includes("['product', 'Produto específico']") && admin.includes("['whatsapp', 'WhatsApp']") && admin.includes("['custom', 'Link personalizado']"), 'Os destinos simples não foram preservados.');
assert(admin.includes("view: 'home-highlight'") && admin.includes("db.from('site_sections').update(values)"), 'O destaque não está sendo persistido no CMS.');
assert(admin.includes('data-home-slide-id') && admin.includes("addEventListener('dragover'"), 'A ordenação visual por arrastar não foi preservada.');
assert(admin.includes('defaultHomeHeroSlides') && admin.includes('importDefaultHomeCarousel'), 'Os slides reais que já aparecem na Home não podem ser trazidos para o editor.');
assert(admin.includes("else if (view === 'banners') await renderVisualHomeEditor(revision)"), 'A rota do painel ainda não aponta para o editor simplificado.');
assert(admin.includes('async function renderBanners(') && admin.includes('async function saveBanner('), 'O editor técnico legado foi removido em vez de preservado internamente.');
assert(storefront.includes('function applyAmbientSection') && storefront.includes("content.media_type === 'video'"), 'A Home não aplica foto/vídeo do destaque salvo.');
assert(hero.includes('atacarejo:hero-slide-change') && storefront.includes('function applyHeroSlideCopy'), 'Título, texto e botão não acompanham cada slide ativo.');
assert(storefront.includes('video.autoplay = true') && storefront.includes('video.muted = true') && storefront.includes('video.playsInline = true'), 'O vídeo do destaque perdeu autoplay seguro para celular.');
assert(styles.includes('--ambient-mobile-image') && styles.includes('object-fit:cover'), 'A responsividade visual do destaque não está protegida.');

console.log('OK editor visual da Home, carrossel, destaques, persistência e responsividade');
