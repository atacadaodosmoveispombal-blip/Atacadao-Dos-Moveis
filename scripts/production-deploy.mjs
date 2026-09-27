import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const contract = JSON.parse(readFileSync(join(root, 'config/admin-feature-contract.json'), 'utf8'));
const runGit = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_USE_SYSTEM_CA: '1' }, shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};

runGit(['fetch', 'origin', '--prune']);
const branch = runGit(['branch', '--show-current']);
const commit = runGit(['rev-parse', 'HEAD']);
const officialCommit = runGit(['rev-parse', `origin/${contract.productionBranch}`]);
const dirtyTracked = runGit(['status', '--porcelain', '--untracked-files=no']);
const pendingMigrations = contract.database?.pendingMigrations || [];

if (branch !== contract.productionBranch) throw new Error(`Deploy bloqueado: branch atual '${branch}', esperado '${contract.productionBranch}'.`);
if (commit !== officialCommit) throw new Error(`Deploy bloqueado: HEAD ${commit} difere de origin/${contract.productionBranch} ${officialCommit}.`);
if (dirtyTracked) throw new Error('Deploy bloqueado: existem alterações rastreadas sem commit.');
if (pendingMigrations.length) throw new Error(`Deploy bloqueado: migrations ainda não confirmadas em produção: ${pendingMigrations.join(', ')}.`);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
run(npm, ['run', 'build']);
run(npx, ['--yes', 'vercel@latest', '--prod', '--yes']);
run(npm, ['run', 'verify:production', '--', 'https://www.atacarejomoveis.com.br', commit]);
run(npm, ['run', 'verify:cms']);

console.log(`Deploy de produção concluído e validado para ${commit}.`);
