import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const forceNew = args.includes('-new') || args.includes('--new');

const webDistPath = join(process.cwd(), 'apps/server/dist');

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
// -host 127.0.0.1 binds loopback only so Windows doesn't raise a firewall/UAC
// prompt for the dev server. A plain `go run .` still binds all interfaces.
execSync('cd apps/server && go run . -host 127.0.0.1', { stdio: 'inherit' });