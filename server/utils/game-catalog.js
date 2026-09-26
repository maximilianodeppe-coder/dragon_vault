import { registerCatalog, registerSpanish } from '../../app/utils/catalog.js';
let last;
export async function loadGameCatalog() {
  const snapshot = await (await liveCatalog()).get();
  if (snapshot !== last) {
    registerCatalog(snapshot.cards);
    registerSpanish(snapshot.spanish);
    last = snapshot;
  }
}
