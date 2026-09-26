import { database } from '../../lib/database.mjs';
import { fail } from '../../lib/auth.mjs';
import { vaultTransaction } from '../../lib/vault.mjs';
export default defineEventHandler(async event => {
  const body = await readLimitedBody(event);
  if (!body || !/^[a-f\d-]{36}$/i.test(body.id) || !Number.isSafeInteger(body.amount) || body.amount < 1 || body.amount > 1000000) fail(400, 'Indicá un usuario y entre 1 y 1.000.000 monedas.');
  const { rows: [target] } = await database().query('SELECT id, role FROM vault_users WHERE id = $1', [body.id]);
  if (!target) fail(404, 'Usuario no encontrado.');
  await loadGameCatalog();
  return vaultTransaction({ ...target, role: 'admin' }, { type: 'credit', amount: body.amount });
});
