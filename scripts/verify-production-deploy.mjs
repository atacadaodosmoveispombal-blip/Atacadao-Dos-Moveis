import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const contract = JSON.parse(readFileSync(join(root, 'config/admin-feature-contract.json'), 'utf8'));
const target = String(process.argv[2] || 'https://www.atacarejomoveis.com.br').replace(/\/$/, '');
const expectedCommit = String(process.argv[3] || process.env.EXPECTED_COMMIT || '').trim();
const stamp = Date.now();
const failures = [];
const cache = new Map();

async function response(path) {
  const result = await fetch(`${target}/${path}?regression_check=${stamp}`, { headers: { 'cache-control': 'no-cache' } });
  if (!result.ok) throw new Error(`${path}: HTTP ${result.status}`);
  return result;
}

async function text(path) {
  if (!cache.has(path)) cache.set(path, await (await response(path)).text());
  return cache.get(path);
}

let manifest;
try {
  manifest = JSON.parse(await text('deploy-manifest.json'));
} catch (error) {
  failures.push(`manifesto de deploy ausente ou inválido: ${error.message}`);
}

if (manifest) {
  if (manifest.branch !== contract.productionBranch) failures.push(`branch publicada '${manifest.branch}', esperado '${contract.productionBranch}'`);
  if (expectedCommit && !manifest.commit.startsWith(expectedCommit) && !expectedCommit.startsWith(manifest.commit)) failures.push(`commit publicado ${manifest.commit} difere do esperado ${expectedCommit}`);
  for (const [file, expectedHash] of Object.entries(manifest.artifacts || {})) {
    try {
      const body = await text(file);
      const actualHash = createHash('sha256').update(body).digest('hex');
      if (actualHash !== expectedHash) failures.push(`artefato publicado diverge do manifesto: ${file}`);
    } catch (error) {
      failures.push(error.message);
    }
  }
}

for (const feature of contract.features) {
  for (const check of feature.checks) {
    if (!/\.(html|css|js)$/.test(check.file)) continue;
    try {
      const body = await text(check.file);
      for (const marker of check.contains) {
        if (!body.includes(marker)) failures.push(`${feature.name}: marcador ausente em produção (${check.file}: ${marker})`);
      }
    } catch (error) {
      failures.push(`${feature.name}: ${error.message}`);
    }
  }
}

try {
  const home = await fetch(`${target}/?regression_check=${stamp}`, { redirect: 'follow' });
  const admin = await fetch(`${target}/admin?regression_check=${stamp}`, { redirect: 'follow' });
  if (!home.ok) failures.push(`site público: HTTP ${home.status}`);
  if (!admin.ok) failures.push(`admin: HTTP ${admin.status}`);
} catch (error) {
  failures.push(`disponibilidade: ${error.message}`);
}

if (failures.length) {
  console.error('\nDEPLOY FALHO: produção não corresponde ao commit esperado.\n');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Produção validada em ${target}: commit ${manifest.commit}, ${contract.features.length} funcionalidades protegidas.`);
