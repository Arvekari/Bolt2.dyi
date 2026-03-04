import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const result = {};

  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];

    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }

    result[key] = next;
    i++;
  }

  return result;
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  const trimmed = content.endsWith('\n') ? content : `${content}\n`;
  return `${trimmed}${line}\n`;
}

function printUsage() {
  console.log('\nUsage:');
  console.log('  node scripts/setup-db.mjs --provider sqlite');
  console.log('  node scripts/setup-db.mjs --provider postgrest --url http://127.0.0.1:3000 --service-key YOUR_KEY');
  console.log('\nNotes:');
  console.log('  - This script DOES NOT install PostgreSQL or PostgREST.');
  console.log('  - It only writes configuration values into .env.local.');
}

const args = parseArgs(process.argv);
const provider = (args.provider || '').toLowerCase();

if (!provider || (provider !== 'sqlite' && provider !== 'postgrest')) {
  printUsage();
  process.exit(1);
}

const envPath = resolve(process.cwd(), '.env.local');
let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

envContent = upsertEnv(envContent, 'BOLT_SERVER_DB_PROVIDER', provider);

if (provider === 'sqlite') {
  envContent = upsertEnv(envContent, 'BOLT_SQLITE_PERSISTENCE_ENABLED', 'true');

  writeFileSync(envPath, envContent, 'utf8');

  console.log('Configured SQLite backend in .env.local');
  console.log('No external database services required.');
  process.exit(0);
}

const postgrestUrl = args.url || '';
const serviceKey = args['service-key'] || '';

if (!postgrestUrl) {
  console.error('Missing required argument: --url (PostgREST base URL)');
  printUsage();
  process.exit(1);
}

envContent = upsertEnv(envContent, 'POSTGREST_URL', postgrestUrl);
envContent = upsertEnv(envContent, 'POSTGREST_SERVICE_ROLE_KEY', serviceKey);
envContent = upsertEnv(envContent, 'BOLT_SQLITE_PERSISTENCE_ENABLED', 'false');

writeFileSync(envPath, envContent, 'utf8');

console.log('Configured PostgREST backend in .env.local');
console.log('Reminder: PostgreSQL and PostgREST must be installed externally (outside this project).');
console.log('Apply schema from docs/postgrest-schema.sql to your PostgreSQL instance before use.');
