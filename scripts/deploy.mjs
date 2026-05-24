import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logPath = join(root, 'DEPLOY-RESULT.txt');
const lines = [];

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  lines.push(line);
  console.log(line);
}

function run(cmd) {
  log(`$ ${cmd}`);
  const out = execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (out.trim()) log(out.trim());
  return out;
}

try {
  log('=== DEPLOY START ===');
  run('git fetch origin');
  log('=== status ===');
  run('git status');
  log('=== rebase ===');
  run('git pull --rebase origin main');
  log('=== build ===');
  run('npm run build');
  try {
    run('git add -A');
    run('git commit -m "fix: CCM exclusive route, layout hardening v6, orphan session signOut"');
  } catch {
    log('(nothing to commit or commit skipped)');
  }
  log('=== push ===');
  run('git push origin main');
  log('=== origin/main ===');
  run('git log origin/main -1 --oneline');
  log('=== DEPLOY OK ===');
} catch (e) {
  log(`ERROR: ${e.message}`);
  if (e.stdout) log(String(e.stdout));
  if (e.stderr) log(String(e.stderr));
  process.exit(1);
} finally {
  writeFileSync(logPath, lines.join('\n') + '\n');
}
