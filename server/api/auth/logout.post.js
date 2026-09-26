import { cookieName } from '../../lib/auth.mjs';
import { database } from '../../lib/database.mjs';
export default defineEventHandler(async event => {
  await database().query('DELETE FROM vault_sessions WHERE id = $1', [event.context.sessionId]);
  deleteCookie(event, cookieName, { path: '/' });
  return { ok: true };
});
