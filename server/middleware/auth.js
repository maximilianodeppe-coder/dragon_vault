import { cookieName, verifySession, fail, requireAdmin, publicUser, appOrigin } from '../lib/auth.mjs';
import { database } from '../lib/database.mjs';

export default defineEventHandler(async event => {
  let path;
  try { path = decodeURIComponent(getRequestURL(event).pathname).replace(/\/+/g, '/'); }
  catch { fail(400, 'Ruta no válida.'); }
  // Static public catalog snapshots must not bypass authenticated API access.
  if (path.startsWith('/catalog/')) fail(404, 'Recurso no disponible.');
  if (!path.startsWith('/api/')) return;
  setHeader(event, 'Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(event.method)) {
    const origin = appOrigin(process.env.NODE_ENV !== 'production' ? getRequestURL(event).origin : '');
    if (getHeader(event, 'origin') !== origin || !getHeader(event, 'content-type')?.startsWith('application/json')) fail(403, 'Solicitud de origen no permitido.');
  }
  if (path === '/api/auth/login' && event.method === 'POST') return;
  const token = getCookie(event, cookieName);
  if (!token) fail(401, 'Iniciá sesión para continuar.');
  let claims;
  try { claims = await verifySession(token); }
  catch { fail(401, 'Tu sesión venció. Volvé a ingresar.'); }
  const { rows: [user] } = await database().query(`SELECT u.* FROM vault_users u JOIN vault_sessions s ON s.user_id = u.id
    WHERE s.id = $1 AND u.id = $2 AND s.expires_at > now() AND NOT u.blocked`, [claims.sid, claims.sub]);
  if (!user) fail(401, 'Tu sesión ya no está disponible. Volvé a ingresar.');
  event.context.user = publicUser(user);
  event.context.sessionId = claims.sid;
  if (path.startsWith('/api/admin/')) requireAdmin(user);
});
