import { database } from '../../lib/database.mjs';
export default defineEventHandler(async () => {
  const { rows } = await database().query('SELECT id, username, role, blocked, created_at FROM vault_users ORDER BY created_at');
  return rows;
});
