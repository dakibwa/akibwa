import { spawn } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const firstArg = rawArgs[0];
const command = !firstArg || firstArg.startsWith('-') ? 'dev' : firstArg;
const args = !firstArg || firstArg.startsWith('-') ? rawArgs : rawArgs.slice(1);
const env = { ...process.env };

if (process.platform === 'darwin') {
  delete env.NODE_USE_SYSTEM_CA;
  delete env.NODE_EXTRA_CA_CERTS;
}

const child = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', command, ...args], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
