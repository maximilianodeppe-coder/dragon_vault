import { byId, names, SETS, starters } from "./catalog.js";
import { formatOf } from './formats.js';
export const lotKey = (lot) => JSON.stringify([lot.source, lot.rarity, formatOf(lot)]);
export const lotsFor = (state, id) => state.inventory?.[id] || [];
export const isSellable = (lot) => !!lot?.rarity && lot.source !== 'shop';
export function addCopies(state, id, quantity, edition) {
  id = String(id);
  state.inventory ||= {};
  const lots = (state.inventory[id] ||= []);
  const lot = lots.find((l) => lotKey(l) === lotKey(edition));
  if (lot) lot.quantity += quantity;
  else lots.push({ ...edition, quantity });
  state.owned[id] = (state.owned[id] || 0) + quantity;
}
export function editionFor(card, source, sourceName) {
  const print = card.obtainable?.find((p) => p.set === source);
  const product = [...SETS, ...starters].find((p) => p.id === source);
  return {
    source,
    sourceName: sourceName || product?.es || product?.name || source,
    rarity: print?.rarity || card.rarity,
  };
}
export function migrateInventory(state) {
  state.inventory = Object.fromEntries(
    Object.entries(state.owned)
      .filter(([, n]) => n > 0)
      .map(([id, quantity]) => [
        id,
        [
          {
            source: "legacy",
            sourceName: "Copias anteriores · origen sin identificar",
            rarity: null,
            quantity,
          },
        ],
      ]),
  );
}
export function validateInventory(state) {
  if (
    !state.inventory ||
    typeof state.inventory !== "object" ||
    Array.isArray(state.inventory)
  )
    throw Error("Inventario por edición no válido.");
  for (const [id, lots] of Object.entries(state.inventory)) {
    if (
      !byId.has(id) ||
      !Array.isArray(lots) ||
      !lots.length ||
      lots.length > 1000
    )
      throw Error("Ediciones de carta no válidas.");
    const seen = new Set();
    for (const lot of lots) {
      if (
        !lot ||
        typeof lot.source !== "string" ||
        !/^[\w-]{1,100}$/.test(lot.source) ||
        typeof lot.sourceName !== "string" ||
        !lot.sourceName.trim() ||
        lot.sourceName.length > 160 ||
        !(
          Object.hasOwn(names, lot.rarity) ||
          (lot.source === "legacy" && lot.rarity === null)
        ) ||
        !Number.isSafeInteger(lot.quantity) ||
        lot.quantity < 1 ||
        lot.quantity > 1e7 ||
        seen.has(lotKey(lot))
      )
        throw Error("Rareza, origen o cantidad de copias no válida.");
      seen.add(lotKey(lot));
    }
    if (lots.reduce((n, l) => n + l.quantity, 0) !== state.owned[id])
      throw Error("Las copias por edición no coinciden con la colección.");
  }
  for (const [id, n] of Object.entries(state.owned))
    if (n > 0 && !state.inventory[id])
      throw Error("Falta el desglose de una carta de la colección.");
}
export function identifyCopies(state, id, quantity, edition) {
  const legacy = lotsFor(state, id).find(
    (l) => l.source === "legacy" && l.rarity === null,
  );
  if (
    !legacy ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > legacy.quantity ||
    !Object.hasOwn(names, edition.rarity) ||
    edition.source === "legacy"
  )
    throw Error("Elegí las copias, la expansión y su rareza.");
  if (formatOf(edition) !== formatOf(legacy)) throw Error('Identificar el origen no cambia el formato de las copias.');
  legacy.quantity -= quantity;
  state.inventory[id] = state.inventory[id].filter((l) => l.quantity > 0);
  state.owned[id] -= quantity;
  addCopies(state, id, quantity, edition);
}
