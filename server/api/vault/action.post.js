import { vaultTransaction } from '../../lib/vault.mjs';
export default defineEventHandler(async event => {
  const body = await readLimitedBody(event, event.context.user.role === 'admin' ? 20000000 : 1000000);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createError({ statusCode: 400, message: 'Acción no válida.' });
  await loadGameCatalog();
  try { return await vaultTransaction(event.context.user, body); }
  catch (error) {
    if (error.statusCode) throw error;
    if (error.code) throw error;
    throw createError({ statusCode: 400, message: error.message });
  }
});
