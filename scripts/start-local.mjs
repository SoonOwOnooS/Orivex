import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { projectRoot } from './sites-env.mjs';

const args = [
  'dev',
  '--config',
  'dist/server/wrangler.json',
  '--local',
  '--persist-to',
  '.wrangler/state',
  '--ip',
  '127.0.0.1',
  '--inspector-port',
  '0',
];
// Read local secrets from the project root. Do not copy them into the build.
if (existsSync(new URL('../.dev.vars', import.meta.url))) {
  args.push('--env-file', '.dev.vars');
}
args.push(...process.argv.slice(2));
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)), ...args],
  { cwd: projectRoot, stdio: 'inherit', env: process.env },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => {
  console.error('Could not start Wrangler. Run npm ci first.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
