import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];
const fs = await import('node:fs');
const chrome = chromeCandidates.find(candidate => fs.existsSync(candidate));
if (!chrome) throw new Error('Google Chrome não encontrado.');

const outputDir = resolve('output/product-mesa-aurora');
const htmlPath = join(outputDir, 'video-maker.html');
await mkdir(outputDir, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'mesa-aurora-video-'));
const port = 9336;
const browser = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  pathToFileURL(htmlPath).href
], { stdio: 'ignore' });

const delay = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
let socket;
try {
  let page;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      page = pages.find(item => item.type === 'page' && item.url.startsWith('file:'));
      if (page) break;
    } catch {}
    await delay(250);
  }
  if (!page) throw new Error('A página de geração não abriu no Chrome.');

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolvePromise, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve: resolvePromise, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable');

  let payload;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const evaluation = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ result: window.__result, error: window.__error })',
      returnByValue: true,
      awaitPromise: true
    });
    const state = JSON.parse(evaluation.result.value);
    if (state.error) throw new Error(state.error);
    if (state.result) {
      payload = state.result;
      break;
    }
    await delay(250);
  }
  if (!payload) throw new Error('O vídeo não ficou pronto no tempo esperado.');

  for (const poster of payload.posters) {
    await writeFile(join(outputDir, poster.name), Buffer.from(poster.base64, 'base64'));
  }
  const videoName = `mesa-aurora-demonstracao.${payload.extension}`;
  await writeFile(join(outputDir, videoName), Buffer.from(payload.base64, 'base64'));
  console.log(JSON.stringify({ video: videoName, mimeType: payload.mimeType, images: payload.posters.map(item => item.name) }));
} finally {
  try { socket?.close(); } catch {}
  browser.kill();
  if (resolve(profile).startsWith(resolve(tmpdir()))) await rm(profile, { recursive: true, force: true });
}
