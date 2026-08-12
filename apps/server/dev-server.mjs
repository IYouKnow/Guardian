import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const forceNew = args.includes('-new') || args.includes('--new');

const webDistPath = join(import.meta.dirname, 'packages/server/dist');

if (!existsSync(webDistPath) || forceNew) {
  if (forceNew) {
    console.log('Force building new web...');
  } else {
    console.log('Web build not found, building...');
  }
  execSync('pnpm build:web', { stdio: 'inherit' });
} else {
  console.log('Using existing web build');
}

console.log('Starting Go server...');
execSync('cd packages/server && go run .', { stdio: 'inherit' });