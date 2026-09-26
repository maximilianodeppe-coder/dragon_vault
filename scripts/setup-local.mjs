// Local-only provisioning. Existing configuration and databases are never replaced.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { schema } from '../server/lib/database.mjs';
import { hashPassword } from '../server/lib/auth.mjs';

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const bin = path.join(root, '.data/postgres-tools/node_modules/@embedded-postgres/windows-x64/native/bin');
// Keep live database files outside OneDrive; use pg_dump for portable backups.
const directory = path.join(process.env.LOCALAPPDATA, 'DragonVault', 'postgres');
const metadata = path.join(root, '.data/local-database.json');
fs.mkdirSync(path.dirname(metadata), { recursive: true });
if (!fs.existsSync(metadata)) {
  if (fs.existsSync('.env') || fs.existsSync(directory)) throw Error('Hay configuración o datos existentes. No se reemplazaron.');
  fs.writeFileSync(metadata, JSON.stringify({ directory, bin, password: randomBytes(32).toString('hex'), port: 55440 }), { flag: 'wx', mode: 0o600 });
}
const config = JSON.parse(fs.readFileSync(metadata, 'utf8'));
if (config.directory !== directory || config.bin !== bin || config.port !== 55440) throw Error('Configuración local inesperada.');
const run = (exe, args) => execFileSync(path.join(bin, exe + '.exe'), args, { windowsHide: true, stdio: 'ignore' });
if (!fs.existsSync(path.join(directory, 'PG_VERSION'))) {
  const pwfile = path.join(root, '.data/local-init-password');
  fs.writeFileSync(pwfile, config.password, { flag: 'wx', mode: 0o600 });
  try { run('initdb', ['-D', directory, '-U', 'postgres', '--auth=scram-sha-256', '--locale=C', '--encoding=UTF8', '--pwfile=' + pwfile]); }
  finally { fs.unlinkSync(pwfile); }
}
let running = false;
try { run('pg_ctl', ['-D', directory, 'status']); running = true; } catch {}
if (!running) run('pg_ctl', ['-D', directory, '-l', path.join(path.dirname(directory), 'postgres.log'), '-o', '-h 127.0.0.1 -p 55440', '-w', 'start']);
const admin = new pg.Client({ host: '127.0.0.1', port: config.port, user: 'postgres', password: config.password, database: 'postgres', connectionTimeoutMillis: 5000 });
await admin.connect();
try {
  const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'dragon_vault'");
  if (!rows.length) await admin.query('CREATE DATABASE dragon_vault');
} finally { await admin.end(); }
if (!fs.existsSync('.env')) fs.writeFileSync('.env', `DATABASE_URL=postgresql://postgres:${config.password}@127.0.0.1:55440/dragon_vault\nJWT_SECRET=${randomBytes(48).toString('base64url')}\nAPP_ORIGIN=http://127.0.0.1:3000\n`, { flag: 'wx', mode: 0o600 });
process.loadEnvFile('.env');
const connection = new URL(process.env.DATABASE_URL);
if (connection.hostname !== '127.0.0.1' || connection.port !== '55440' || connection.pathname !== '/dragon_vault')
  throw Error('DATABASE_URL no apunta a esta base local; no se modificó su esquema.');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
await db.connect();
try {
  await db.query(schema);
  const { rows } = await db.query("SELECT 1 FROM vault_users WHERE role='admin'");
  if (!rows.length) {
    const password = randomBytes(18).toString('base64url');
    const access = path.join(root, '.data/local-access.txt');
    fs.writeFileSync(access, `Dragon Vault local\nURL: http://127.0.0.1:3000\nUsuario: admin\nContraseña: ${password}\n\nArchivo privado: no compartir ni subir a un repositorio.\n`, { flag: 'wx', mode: 0o600 });
    await db.query("INSERT INTO vault_users(id,username,password_hash,role) VALUES($1,'admin',$2,'admin')", [randomUUID(), await hashPassword(password)]);
  }
  console.log('PostgreSQL local listo. Acceso privado en .data/local-access.txt. No se sobrescribió progreso anterior.');
} finally { await db.end(); }
