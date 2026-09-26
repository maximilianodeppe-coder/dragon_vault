import { fail } from '../../lib/auth.mjs';
import { transaction } from '../../lib/database.mjs';
export default defineEventHandler(async event => {
  const body = await readLimitedBody(event);
  if (!body || !/^[a-f\d-]{36}$/i.test(body.id) || !['admin', 'player'].includes(body.role) || typeof body.blocked !== 'boolean') fail(400, 'Datos de usuario no válidos.');
  return transaction(async db => {
    // Serializes admin changes so two requests cannot remove the final administrator.
    await db.query("SELECT pg_advisory_xact_lock(482731)");
    if (body.id === event.context.user.id && (body.blocked || body.role !== 'admin')) fail(400, 'No podés bloquearte ni quitar tu propio rol administrador.');
    if (body.blocked || body.role !== 'admin') {
      const { rows: admins } = await db.query("SELECT id FROM vault_users WHERE role = 'admin' AND NOT blocked");
      if (admins.length === 1 && admins[0].id === body.id) fail(400, 'Debe quedar al menos un administrador activo.');
    }
    const { rows } = await db.query('UPDATE vault_users SET role = $2, blocked = $3 WHERE id = $1 RETURNING id, username, role, blocked', [body.id, body.role, body.blocked]);
    if (!rows.length) fail(404, 'Usuario no encontrado.');
    return rows[0];
  });
});
