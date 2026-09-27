import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  'virtual-assistant-voice.js',
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

const contract = JSON.parse(readFileSync(join(root, 'config', 'admin-feature-contract.json'), 'utf8'));
const gitValue = args => {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};
const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || gitValue(['rev-parse', 'HEAD']) || 'unknown';
const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || gitValue(['branch', '--show-current']) || 'unknown';
const artifactFiles = ['index.html', 'admin.html', 'admin-app.js', 'admin.css', 'app.js', 'storefront-cms.js', 'hero-carousel.js', 'styles.css'];
const artifacts = Object.fromEntries(artifactFiles.map(file => [
  file,
  createHash('sha256').update(readFileSync(join(output, file))).digest('hex')
]));
const manifest = {
  schemaVersion: 1,
  project: 'atacarejo-dos-moveis',
  commit,
  branch,
  builtAt: new Date().toISOString(),
  release: contract.release,
  protectedFeatures: contract.features.map(feature => feature.name),
  database: contract.database,
  artifacts
};
writeFileSync(join(output, 'deploy-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Vercel build pronto: ${publicFiles.length} arquivos, assets e manifesto do commit ${commit} copiados para dist/.`);
