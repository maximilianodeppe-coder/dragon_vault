import pg from 'pg';

let pool;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('Configurá DATABASE_URL para conectar PostgreSQL.');
  return pool ||= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
}
export async function transaction(action) {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
export const schema = `
CREATE TABLE IF NOT EXISTS vault_users (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'player')),
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vault_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES vault_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_sessions_user ON vault_sessions(user_id);
CREATE TABLE IF NOT EXISTS vault_world (
  id integer PRIMARY KEY CHECK (id = 1),
  state jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vault_progress (
  user_id uuid PRIMARY KEY REFERENCES vault_users(id) ON DELETE CASCADE,
  state jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vault_login_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
`;
