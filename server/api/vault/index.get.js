import { vaultTransaction } from '../../lib/vault.mjs';
export default defineEventHandler(async event => {
  await loadGameCatalog();
  return vaultTransaction(event.context.user);
});
