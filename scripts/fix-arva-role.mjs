import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '..', '.bolt-memory.sqlite'));

db.exec(`UPDATE users SET is_admin = 1, role = 'global_admin' WHERE username = 'arva'`);

const row = db.prepare(`SELECT username, email, role, is_admin FROM users WHERE username = 'arva'`).get();
console.log('arva row:', row);

db.close();
