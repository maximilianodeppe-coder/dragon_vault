import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { createError } from 'h3';
import { database } from './database.mjs';

export const WEEK = 7 * 24 * 60 * 60;
export const cookieName = 'dragon_vault_session';
export function appOrigin(fallback = '') {
  const value = process.env.APP_ORIGIN || fallback;
  let url;
  try { url = new URL(value); } catch { fail(503, 'Configurá APP_ORIGIN con el origen de la aplicación.'); }
  if (url.origin !== value || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))))
    fail(503, 'APP_ORIGIN debe usar HTTPS, sin barra final; HTTP solo se permite en localhost.');
  return value;
}
export function fail(statusCode, message) { throw createError({ statusCode, message }); }
export function username(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.-]{3,32}$/.test(value)) fail(400, 'El usuario debe tener de 3 a 32 letras, números, puntos, guiones o guiones bajos.');
  return value.toLowerCase();
}
export function password(value) {
  if (typeof value !== 'string' || [...value].length < 12 || Buffer.byteLength(value, 'utf8') > 72 || value.includes('\0'))
    fail(400, 'Usá una contraseña de al menos 12 caracteres y hasta 72 bytes.');
  return value;
}
export const hashPassword = value => bcrypt.hash(password(value), 12);
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || Buffer.byteLength(value) < 32) throw new Error('JWT_SECRET debe contener al menos 32 bytes aleatorios.');
  return new TextEncoder().encode(value);
}
export async function signSession(userId, sessionId = randomUUID()) {
  return new SignJWT({ sid: sessionId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId).setIssuer('dragon-vault').setAudience('dragon-vault-web')
    .setIssuedAt().setExpirationTime('7d').sign(secret());
}
export async function verifySession(token) {
  const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer: 'dragon-vault', audience: 'dragon-vault-web', requiredClaims: ['sub', 'sid', 'iat', 'exp'], maxTokenAge: '7d' });
  if (![payload.sub, payload.sid].every(id => typeof id === 'string' && /^[a-f\d-]{36}$/i.test(id))) throw Error('Sesión no válida.');
  return payload;
}
export function requireAdmin(user) {
  if (user?.role !== 'admin') fail(403, 'Esta acción requiere una cuenta administradora.');
}
export function publicUser(user) { return { id: user.id, username: user.username, role: user.role, blocked: user.blocked }; }
export async function login(name, pass, address) {
  // PostgreSQL shares throttling between processes; neither IP nor username is stored in clear text here.
  const { createHash } = await import('node:crypto');
  const key = input => createHash('sha256').update(input).digest('hex');
  const db = database();
  for (const [scope, limit] of [[`ip:${address}`, 50], [`user:${String(name).toLowerCase().slice(0,128)}`, 10]]) {
    const { rows } = await db.query(`INSERT INTO vault_login_limits(key, attempts, expires_at) VALUES ($1, 1, now() + interval '15 minutes')
      ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN vault_login_limits.expires_at < now() THEN 1 ELSE vault_login_limits.attempts + 1 END,
      expires_at = CASE WHEN vault_login_limits.expires_at < now() THEN now() + interval '15 minutes' ELSE vault_login_limits.expires_at END RETURNING attempts`, [key(scope)]);
    if (rows[0].attempts > limit) fail(429, 'Demasiados intentos. Esperá 15 minutos antes de volver a ingresar.');
  }
  const normalized = typeof name === 'string' ? name.toLowerCase() : '';
  const { rows: [user] } = await db.query('SELECT * FROM vault_users WHERE username = $1', [normalized]);
  const validInput = typeof pass === 'string' && Buffer.byteLength(pass) <= 72;
  // A valid cost-12 hash keeps unknown-user responses on the same bcrypt path.
  const match = await bcrypt.compare(validInput ? pass : '', user?.password_hash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!validInput || !match || !user || user.blocked) fail(401, 'Usuario o contraseña incorrectos.');
  const id = randomUUID();
  const token = await signSession(user.id, id);
  await db.query("DELETE FROM vault_sessions WHERE expires_at < now()");
  await db.query("DELETE FROM vault_login_limits WHERE expires_at < now()");
  await db.query("INSERT INTO vault_sessions(id, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')", [id, user.id]);
  return { token, user: publicUser(user) };
}
