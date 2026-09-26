import { resolve } from "node:path";
import { createCatalogUpdater } from "../../scripts/catalog-updater.mjs";
import { catalogImages } from "../../scripts/sync-catalog.mjs";
import originals from "../../app/data/cards.json";

let updater;
let indexed;
let images;
export function liveCatalog() {
  if (!updater) updater = (async () => {
    const assets = useStorage("assets:catalog");
    const [cards, spanish, sets] = await Promise.all([
      assets.getItem("cards.json"), assets.getItem("es.json"), assets.getItem("sets.json"),
    ]);
    return createCatalogUpdater({
      directory: resolve(".data/catalog"), initial: { cards, spanish, sets }, originals,
    });
  })();
  return updater;
}

export async function liveImages() {
  const snapshot = await (await liveCatalog()).get();
  if (indexed !== snapshot.cards) {
    images = catalogImages(snapshot.cards);
    indexed = snapshot.cards;
  }
  return images;
}
