import { randomUUID } from 'node:crypto';
import { username, hashPassword, fail } from '../../lib/auth.mjs';
import { database } from '../../lib/database.mjs';
export default defineEventHandler(async event => {
  const body = await readLimitedBody(event);
  const name = username(body?.username);
  if (!['admin', 'player'].includes(body?.role)) fail(400, 'Rol no válido.');
  const hash = await hashPassword(body.password);
  try {
    const { rows: [user] } = await database().query('INSERT INTO vault_users(id, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role, blocked', [randomUUID(), name, hash, body.role]);
    setResponseStatus(event, 201);
    return user;
  } catch (error) { if (error.code === '23505') fail(409, 'Ese nombre de usuario ya existe.'); throw error; }
});
