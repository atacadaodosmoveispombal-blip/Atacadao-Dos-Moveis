import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.STOREFRONT_URL || 'http://127.0.0.1:4173';
const port = 9347;
const profile = path.resolve('tmp', `hero-page-chrome-${Date.now()}`);
const outputDir = path.resolve('tmp', 'hero-verification');
const browser = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, baseUrl
], { windowsHide: true, stdio: 'ignore' });

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let socket;
let sequence = 0;
const pending = new Map();
const browserErrors = [];

async function target() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(item => item.type === 'page');
      if (page) return page;
    } catch {}
    await wait(100);
  }
  throw new Error('Chrome não abriu a página real da loja.');
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

async function waitFor(expression, message, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error(message);
}

async function waitForPage() {
  await waitFor("document.readyState === 'complete' && Boolean(window.atacarejoHero) && Boolean(document.querySelector('.hero-slide.is-active'))", 'A Home não concluiu a inicialização.');
}

async function heroState() {
  return evaluate(`(() => {
    const hero = document.querySelector('.hero');
    const carousel = document.querySelector('.hero-carousel');
    const slides = [...document.querySelectorAll('[data-hero-slide]')];
    const active = document.querySelector('.hero-slide.is-active');
    const style = hero ? getComputedStyle(hero) : null;
    const rect = hero?.getBoundingClientRect();
    return {
      exists: Boolean(hero && carousel), hidden: Boolean(hero?.hidden), display: style?.display,
      visibility: style?.visibility, opacity: style?.opacity, width: rect?.width || 0, height: rect?.height || 0,
      slides: slides.length, activeCount: slides.filter(slide => slide.classList.contains('is-active')).length,
      activeIndex: slides.indexOf(active), activeMedia: active?.dataset.mediaType || (active?.querySelector('video') ? 'video' : 'image'),
      viewport: [innerWidth, innerHeight]
    };
  })()`);
}

function assertStable(state, label) {
  assert(state.exists, `${label}: Hero/carrossel ausente.`);
  assert(!state.hidden && state.display !== 'none' && state.visibility !== 'hidden' && Number(state.opacity) > 0, `${label}: Hero invisível: ${JSON.stringify(state)}`);
  assert(state.width > 0 && state.height >= 200, `${label}: espaço da Hero colapsou: ${JSON.stringify(state)}`);
  assert(state.slides >= 1 && state.activeCount === 1 && state.activeIndex >= 0, `${label}: slide ativo inconsistente: ${JSON.stringify(state)}`);
}

async function screenshot(filename) {
  const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, filename), Buffer.from(result.data, 'base64'));
}

try {
  const page = await target();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails?.text || 'Erro JavaScript');
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') browserErrors.push(message.params.entry.text);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  await command('Runtime.enable');
  await command('Log.enable');
  await command('Page.enable');
  await command('Page.bringToFront');
  await waitForPage();

  const initial = await heroState();
  assertStable(initial, 'carregamento inicial desktop');
  await screenshot('desktop-inicial.png');

  let sawRotation = initial.slides < 2;
  const observed = new Set([initial.activeIndex]);
  for (let cycle = 0; cycle < 3; cycle++) {
    await wait(7000);
    const current = await heroState();
    assertStable(current, `autoplay ciclo ${cycle + 1}`);
    observed.add(current.activeIndex);
    sawRotation ||= current.activeIndex !== initial.activeIndex;
  }
  assert(sawRotation, `Autoplay não mudou de slide em três ciclos: ${JSON.stringify([...observed])}`);

  await command('Page.reload', { ignoreCache: true });
  await waitForPage();
  const refreshed = await heroState();
  assertStable(refreshed, 'F5 desktop');

  await command('Page.navigate', { url: `${baseUrl}/admin.html` });
  await waitFor("document.readyState === 'complete'", 'A navegação para o painel não concluiu.');
  await command('Page.navigate', { url: baseUrl });
  await waitForPage();
  assertStable(await heroState(), 'retorno de outra página');

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Page.reload', { ignoreCache: true });
  await waitForPage();
  const mobile = await heroState();
  assertStable(mobile, 'carregamento mobile');
  assert(mobile.viewport[0] === 390, `Viewport mobile não aplicado: ${JSON.stringify(mobile.viewport)}`);
  await screenshot('mobile-inicial.png');
  await wait(7000);
  assertStable(await heroState(), 'autoplay mobile');

  assert(browserErrors.length === 0, `Erros JavaScript no navegador: ${browserErrors.join(' | ')}`);
  console.log(`OK Hero real desktop: ${initial.slides} slide(s), ${initial.height}px de altura`);
  console.log(`OK autoplay estável por três ciclos: índices ${[...observed].join(', ')}`);
  console.log('OK F5 e navegação entre Home/painel/Home');
  console.log(`OK Hero real mobile: ${mobile.width}×${mobile.height}px`);
  console.log('OK sem exceções JavaScript no navegador');
  console.log(`Capturas: ${outputDir}`);
} finally {
  socket?.close();
  browser.kill();
}
