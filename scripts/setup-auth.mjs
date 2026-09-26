import { randomUUID } from 'node:crypto';
import { database, schema, transaction } from '../server/lib/database.mjs';
import { username, hashPassword } from '../server/lib/auth.mjs';

try {
  await database().query(schema);
  if (process.argv.includes('--admin')) {
    const name = username(process.env.ADMIN_USERNAME);
    const hash = await hashPassword(process.env.ADMIN_PASSWORD);
    await transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(482731)');
      const { rows } = await db.query("SELECT id FROM vault_users WHERE role = 'admin'");
      if (rows.length) throw Error('Ya existe una cuenta administradora. Creá usuarios desde la aplicación.');
      await db.query("INSERT INTO vault_users(id, username, password_hash, role) VALUES ($1, $2, $3, 'admin')", [randomUUID(), name, hash]);
    });
    console.log('Cuenta administradora creada. Podés ingresar e importar tu respaldo local.');
  } else console.log('Tablas de PostgreSQL preparadas.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (process.env.DATABASE_URL) await database().end(); }
