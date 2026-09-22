import { createReadStream, stat } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 4173;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const publicFiles = new Set([
  'index.html', 'admin.html', 'redefinir-senha.html', '404.html', 'offline.html', 'robots.txt', 'sitemap.xml',
  'styles.css', 'admin.css', 'admin-design-system.css', 'app.js', 'admin-app.js',
  'storefront-cms.js', 'customer-account.js', 'customer-account.css', 'reset-password.js', 'category-icons.js', 'mobile-navigation.js',
  'hero-carousel.js', 'service-worker.js', 'pwa.js', 'manifest.webmanifest',
  'virtual-assistant-launcher.css', 'virtual-assistant.css', 'virtual-assistant-catalog.css',
  'virtual-assistant-loader.js', 'virtual-assistant.js', 'virtual-assistant-catalog.js', 'virtual-assistant-voice.js'
]);

const server = createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  const route = pathname.replace(/\/+$/, '') || '/';
  const storefrontRoute = ['/', '/ofertas', '/categorias', '/sacola', '/conta'].includes(route);
  const relativePath = storefrontRoute ? 'index.html' : route === '/admin' ? 'admin.html' : route === '/redefinir-senha' ? 'redefinir-senha.html' : route.replace(/^\/+/, '');
  const segments = relativePath.split('/');
  const allowedAsset = relativePath.startsWith('assets/') && segments.every(segment => segment && !segment.startsWith('.'));
  if (relativePath.includes('\\') || (!publicFiles.has(relativePath) && !allowedAsset)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  const filePath = normalize(join(root, relativePath));

  stat(filePath, (error, file) => {
    if (error || !file.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    createReadStream(filePath).pipe(response);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Atacarejo dos Móveis: http://127.0.0.1:${port}`);
});
