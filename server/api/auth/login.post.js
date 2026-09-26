import { login, cookieName, WEEK } from '../../lib/auth.mjs';
export default defineEventHandler(async event => {
  const body = await readLimitedBody(event);
  const { token, user } = await login(body?.username, body?.password, getRequestIP(event) || 'unknown');
  setCookie(event, cookieName, token, { httpOnly: true, secure: process.env.APP_ORIGIN?.startsWith('https://') || false, sameSite: 'strict', path: '/', maxAge: WEEK });
  return { user };
});
