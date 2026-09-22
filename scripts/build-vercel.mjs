import { copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'dist');
const publicFiles = [
  'index.html',
  'admin.html',
  'styles.css',
  'admin.css',
  'admin-design-system.css',
  'app.js',
  'mobile-navigation.js',
  'category-icons.js',
  'admin-app.js',
  'hero-carousel.js',
  'storefront-cms.js',
  'customer-account.js',
  'customer-account.css',
  'redefinir-senha.html',
  'reset-password.js',
  'virtual-assistant-launcher.css',
  'virtual-assistant-loader.js',
  'virtual-assistant.js',
  'virtual-assistant-catalog.js',
  'virtual-assistant.css',
  'virtual-assistant-catalog.css',
  'manifest.webmanifest',
  'service-worker.js',
  'pwa.js',
  'offline.html',
  '404.html',
  'robots.txt',
  'sitemap.xml'
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of publicFiles) {
  const destination = join(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(root, file), destination);
}

cpSync(join(root, 'assets'), join(output, 'assets'), { recursive: true });

console.log(`Vercel build pronto: ${publicFiles.length} arquivos e assets copiados para dist/.`);
