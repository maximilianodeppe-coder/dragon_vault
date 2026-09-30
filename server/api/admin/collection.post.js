import { database } from '../../lib/database.mjs';
import { fail, requireAdmin } from '../../lib/auth.mjs';
import { vaultTransaction } from '../../lib/vault.mjs';
import { collectionActions } from '../../lib/admin-collection.mjs';

export default defineEventHandler(async event => {
  requireAdmin(event.context.user);
  const body = await readLimitedBody(event);
  if (!body || typeof body.id !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(body.id) || !collectionActions.includes(body.type)) fail(400, 'Cambio de colección no válido.');
  const { rows: [target] } = await database().query('SELECT id, username FROM vault_users WHERE id = $1', [body.id]);
  if (!target) fail(404, 'Usuario no encontrado.');
  if (body.type === 'collectionClear' && body.confirmUsername !== target.username) fail(400, 'Escribí el nombre de la cuenta para vaciar su colección.');
  await loadGameCatalog();
  try { return await vaultTransaction({ ...target, role: 'admin' }, body); }
  catch (error) {
    if (error.statusCode || error.code) throw error;
    throw createError({ statusCode: 400, message: error.message });
  }
});
