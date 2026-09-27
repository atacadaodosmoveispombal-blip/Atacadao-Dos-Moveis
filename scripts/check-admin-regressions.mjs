import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const contract = readJson('config/admin-feature-contract.json');
const migrationBaseline = readJson('config/migration-baseline.json');
const errors = [];

for (const feature of contract.features) {
  for (const check of feature.checks) {
    const file = join(root, check.file);
    if (!existsSync(file)) {
      errors.push(`${feature.name}: arquivo ausente (${check.file})`);
      continue;
    }
    const source = readFileSync(file, 'utf8');
    for (const marker of check.contains) {
      if (!source.includes(marker)) errors.push(`${feature.name}: marcador ausente em ${check.file}: ${marker}`);
    }
  }
}

const adminSource = readFileSync(join(root, 'admin-app.js'), 'utf8');
const variantStart = adminSource.indexOf('async function saveProductVariants(');
const variantEnd = adminSource.indexOf('async function productEditorMarkup(', variantStart);
const variantScope = variantStart >= 0 && variantEnd > variantStart ? adminSource.slice(variantStart, variantEnd) : '';
if (!variantScope) {
  errors.push('hierarquia de imagens: rotina de variações não localizada');
} else {
  if (variantScope.includes("db.from('product_images')")) errors.push('hierarquia de imagens: fotos de cor estão alterando product_images');
  if (/variant_images[\s\S]{0,220}is_cover:\s*true/.test(variantScope)) errors.push('hierarquia de imagens: foto de cor marcada automaticamente como principal');
  if (!/variant_images'[\s\S]{0,260}is_cover:\s*false/.test(variantScope)) errors.push('hierarquia de imagens: inserção secundária da foto de cor não está garantida');
}

const migrationsDir = join(root, 'supabase', 'migrations');
const sha256 = value => createHash('sha256').update(value).digest('hex');
for (const [name, expectedHash] of Object.entries(migrationBaseline)) {
  const file = join(migrationsDir, name);
  if (!existsSync(file)) {
    errors.push(`migration histórica removida: ${name}`);
    continue;
  }
  const actualHash = sha256(readFileSync(file));
  if (actualHash !== expectedHash) errors.push(`migration histórica alterada: ${name}`);
}

let migrationNames;
try {
  migrationNames = execFileSync('git', ['ls-files', '--', 'supabase/migrations/*.sql'], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean).map(file => basename(file));
} catch {
  migrationNames = readdirSync(migrationsDir).filter(name => name.endsWith('.sql'));
}

const forbiddenMigration = /\b(drop\s+(table|schema|database)|alter\s+table[\s\S]{0,180}\bdrop\s+column|truncate\s+(table\s+)?|delete\s+from|\b(reset|seed|fixture|demo)\b)/i;
for (const name of migrationNames) {
  if (migrationBaseline[name]) continue;
  const source = readFileSync(join(migrationsDir, name), 'utf8');
  if (forbiddenMigration.test(`${name}\n${source}`)) errors.push(`migration nova potencialmente destrutiva ou de demonstração: ${name}`);
  errors.push(`migration nova ainda não revisada/registrada no baseline: ${name}`);
}

if (process.env.VERCEL_ENV === 'production') {
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || '';
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';
  if (branch !== contract.productionBranch) errors.push(`deploy de produção originado da branch '${branch || 'desconhecida'}', esperado '${contract.productionBranch}'`);
  if (!/^[a-f0-9]{40}$/i.test(commit)) errors.push('deploy de produção sem commit Git verificável');
}

if (errors.length) {
  console.error('\nREGRESSÃO DETECTADA:\na nova versão remove funcionalidade existente.\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Proteção antirregressão aprovada: ${contract.features.length} funcionalidades e ${Object.keys(migrationBaseline).length} migrations preservadas.`);
