import { database } from '../lib/database.mjs';

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store');
  try {
    await database().query({ text: 'SELECT 1', query_timeout: 2000 });
    return { status: 'ok' };
  } catch {
    setResponseStatus(event, 503);
    return { status: 'unavailable' };
  }
});
