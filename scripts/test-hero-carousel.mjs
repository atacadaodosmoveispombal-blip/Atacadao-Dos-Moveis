import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const hostedBuild = process.env.CI === 'true' || Boolean(process.env.VERCEL);
if (hostedBuild) {
  const hero = await readFile('hero-carousel.js', 'utf8');
  const admin = await readFile('admin-app.js', 'utf8');
  const storefront = await readFile('storefront-cms.js', 'utf8');
  assert(hero.includes("item.type === 'video'"), 'Montagem de slides mistos não foi preservada.');
  assert(hero.includes("video.addEventListener('ended'"), 'Avanço ao terminar o vídeo não foi preservado.');
  assert(hero.includes('video.autoplay = true') && hero.includes('video.muted = true') && hero.includes('video.playsInline = true') && hero.includes('video.controls = false'), 'Autoplay mobile seguro não foi preservado.');
  assert(hero.includes("video.addEventListener('error'"), 'Fallback do vídeo não foi preservado.');
  assert(hero.includes('mobileSrc') && hero.includes('desktopSrc'), 'Prioridade Desktop/Mobile não foi preservada.');
  assert(admin.includes("update({ active: resume, paused: !resume, draft: false })"), 'Ativar/desativar slide perdeu a persistência.');
  assert(admin.includes('source.position !== target.position'), 'Ordenação não está limitada à área da Hero.');
  assert(storefront.includes("filter(item => item.position === 'home_hero')"), 'A Home não está consumindo todos os slides ativos da Hero.');
  assert(storefront.includes(".eq('active', true).eq('draft', false).eq('paused', false)"), 'Filtro de slides ativos não foi preservado.');
  console.log('OK imagem/vídeo, autoplay, ended, fallback, responsividade, ativação e ordem (verificação estática hospedada)');
  process.exit(0);
}

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9337;
const profile = path.resolve('tmp', `hero-chrome-${Date.now()}`);
const pageUrl = pathToFileURL(path.resolve('scripts', 'fixtures', 'hero-carousel.html')).href;
const browser = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--allow-file-access-from-files',
  '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, pageUrl
], { windowsHide: true, stdio: 'ignore' });

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let socket;
let sequence = 0;
const pending = new Map();

async function target() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(item => item.type === 'page' && item.url.startsWith(pageUrl));
      if (page) return page;
    } catch {}
    await wait(100);
  }
  throw new Error('Chromium não abriu a página de teste.');
}

function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result?.value;
}

const image = color => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="${color}"/></svg>`)}`;
const video = pathToFileURL(path.resolve('assets', 'products', 'mesa-aurora', 'mesa-aurora-demonstracao.mp4')).href;

try {
  const page = await target();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  await command('Runtime.enable');
  await command('Page.enable');
  await command('Page.bringToFront');
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate('Boolean(window.atacarejoHero?.setSlides)')) break;
    await wait(100);
  }
  assert(await evaluate('Boolean(window.atacarejoHero?.setSlides)'), 'API do carrossel não foi inicializada.');

  const imageSlides = [{ type: 'image', desktopUrl: image('red'), mobileUrl: image('pink'), internalTitle: 'Imagem 1' }, { type: 'image', desktopUrl: image('blue'), mobileUrl: image('cyan'), internalTitle: 'Imagem 2' }];
  await evaluate(`window.atacarejoHero.setSlides(${JSON.stringify(imageSlides)}); window.atacarejoHero.show(1); true`);
  assert(await evaluate("document.querySelectorAll('[data-hero-slide]').length === 2 && document.querySelectorAll('[data-hero-slide]')[1].classList.contains('is-active')"), 'Falha na transição imagem → imagem.');

  const imageVideo = [{ type: 'image', desktopUrl: image('red'), mobileUrl: image('pink'), internalTitle: 'Imagem' }, { type: 'video', desktopUrl: video, mobileUrl: `${video}?mobile=1`, posterUrl: image('black'), internalTitle: 'Vídeo' }];
  await evaluate(`window.atacarejoHero.setSlides(${JSON.stringify(imageVideo)}); window.atacarejoHero.show(1); true`);
  await wait(250);
  const videoFlags = await evaluate(`(() => { const item=document.querySelector('.hero-slide.is-active video'); return {autoplay:item.autoplay,muted:item.muted,playsInline:item.playsInline,controls:item.controls,active:Boolean(item)}; })()`);
  assert(videoFlags.active && videoFlags.autoplay && videoFlags.muted && videoFlags.playsInline && !videoFlags.controls, 'Falha na configuração imagem → vídeo/autoplay mobile.');
  await evaluate("document.querySelector('.hero-slide.is-active video').dispatchEvent(new Event('ended')); true");
  assert(await evaluate("document.querySelectorAll('[data-hero-slide]')[0].classList.contains('is-active')"), 'O vídeo não avançou para a imagem ao terminar.');

  const multiVideo = [{ type: 'video', desktopUrl: video, posterUrl: image('black'), internalTitle: 'Vídeo 1' }, { type: 'video', desktopUrl: `${video}?second=1`, posterUrl: image('gray'), internalTitle: 'Vídeo 2' }];
  await evaluate(`window.atacarejoHero.setSlides(${JSON.stringify(multiVideo)}); true`);
  assert(await evaluate("document.querySelectorAll('.hero-slide video').length === 2"), 'Falha ao montar vários vídeos.');
  await evaluate("document.querySelector('.hero-slide.is-active video').dispatchEvent(new Event('ended')); true");
  assert(await evaluate("document.querySelectorAll('[data-hero-slide]')[1].classList.contains('is-active')"), 'Falha na transição vídeo → vídeo.');

  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(150);
  await evaluate(`window.atacarejoHero.setSlides(${JSON.stringify([imageVideo[1]])}); true`);
  await wait(150);
  const mobileSource = await evaluate(`(() => { const item=document.querySelector('.hero-slide video'); return {src:item.src,matches:matchMedia('(max-width: 767px)').matches,mobile:item.dataset.mobileSrc}; })()`);
  assert(mobileSource.matches && mobileSource.mobile.includes('mobile=1'), `A Hero mobile não priorizou o vídeo mobile: ${JSON.stringify(mobileSource)}`);
  await command('Emulation.clearDeviceMetricsOverride');
  await wait(150);
  await evaluate(`window.atacarejoHero.setSlides(${JSON.stringify([imageVideo[1]])}); true`);
  assert(await evaluate("!document.querySelector('.hero-slide video').dataset.desktopSrc.includes('mobile=1')"), 'A Hero desktop não priorizou o vídeo desktop.');

  await evaluate(`window.atacarejoHero.setSlides(${JSON.stringify(imageVideo)}); window.atacarejoHero.show(1); document.querySelector('.hero-slide.is-active video').dispatchEvent(new Event('error')); true`);
  assert(await evaluate("document.querySelector('.hero-slide.is-active').classList.contains('is-media-error') && Boolean(document.querySelector('.hero-slide.is-active .hero-video-fallback'))"), 'Fallback por poster não foi ativado após erro do vídeo.');

  const admin = await readFile('admin-app.js', 'utf8');
  const storefront = await readFile('storefront-cms.js', 'utf8');
  assert(admin.includes("update({ active: resume, paused: !resume, draft: false })"), 'Ativar/desativar slide perdeu a persistência.');
  assert(admin.includes("source.position !== target.position"), 'Ordenação não está limitada à área da Hero.');
  assert(storefront.includes("filter(item => item.position === 'home_hero')"), 'A Home não está consumindo todos os slides ativos da Hero.');
  assert(storefront.includes(".eq('active', true).eq('draft', false).eq('paused', false)"), 'Filtro de slides ativos não foi preservado.');

  console.log('OK imagem → imagem');
  console.log('OK imagem → vídeo');
  console.log('OK vídeo → imagem e vídeo → vídeo');
  console.log('OK vários vídeos e avanço no ended');
  console.log('OK autoplay/muted/playsinline sem controles');
  console.log('OK fallback por poster');
  console.log('OK mídia desktop/mobile');
  console.log('OK ativação/desativação e ordenação persistidas');
} finally {
  socket?.close();
  browser.kill();
}
