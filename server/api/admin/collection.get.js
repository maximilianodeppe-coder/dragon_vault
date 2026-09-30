import { database } from '../../lib/database.mjs';
import { fail, requireAdmin } from '../../lib/auth.mjs';
import { vaultTransaction } from '../../lib/vault.mjs';

export default defineEventHandler(async event => {
  requireAdmin(event.context.user);
  const { id } = getQuery(event);
  if (typeof id !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id)) fail(400, 'Usuario no válido.');
  const { rows: [target] } = await database().query('SELECT id FROM vault_users WHERE id = $1', [id]);
  if (!target) fail(404, 'Usuario no encontrado.');
  await loadGameCatalog();
  return vaultTransaction({ ...target, role: 'admin' });
});
