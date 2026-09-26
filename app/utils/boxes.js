import LegacyBoxEngine from "./legacy-boxes.js";

("use strict");
const packSize = 5,
  capacity = 500,
  copies = { Rare: 3, "Super Rare": 2, "Ultra Rare": 1, "Secret Rare": 1 };
function initial(cards, set) {
  const list = cards.filter((c) => c.set === set),
    commons = list.filter((c) => c.rarity === "Common"),
    result = Object.fromEntries(
      list.map((c) => [String(c.id), copies[c.rarity] || 0]),
    );
  const extra = capacity - Object.values(result).reduce((a, b) => a + b, 0);
  if (extra < commons.length || !commons.length)
    throw Error("Caja no compatible");
  for (let i = 0; i < extra; i++) result[commons[i % commons.length].id]++;
  return result;
}
function total(box) {
  return Object.values(box.remaining).reduce((a, b) => a + b, 0);
}
function create(cards, set) {
  return {
    remaining: initial(cards, set),
    resets: 0,
    opened: 0,
    baseDrawn: 0,
    baseOpened: 0,
  };
}
function migrate(box, cards, set, version) {
  const legacy = LegacyBoxEngine;
  const old = version === 2 ? legacy.migrate(box, cards, set) : box;
  legacy.validate(old, cards, set);
  const previous = legacy.initial(cards, set),
    next = initial(cards, set);
  const remaining = Object.fromEntries(
    Object.keys(next).map((id) => [
      id,
      Math.max(0, next[id] - (previous[id] - old.remaining[id])),
    ]),
  );
  return {
    remaining,
    resets: old.resets,
    opened: old.opened,
    baseDrawn: capacity - total({ remaining }),
    baseOpened: old.opened,
  };
}
function validate(box, cards, set) {
  const expected = initial(cards, set);
  if (
    !box ||
    !box.remaining ||
    Array.isArray(box.remaining) ||
    !Number.isSafeInteger(box.resets) ||
    box.resets < 0 ||
    !Number.isSafeInteger(box.opened) ||
    box.opened < 0 ||
    !Number.isInteger(box.baseDrawn) ||
    box.baseDrawn < 0 ||
    box.baseDrawn > capacity ||
    !Number.isSafeInteger(box.baseOpened) ||
    box.baseOpened < 0 ||
    box.baseOpened > box.opened
  )
    throw Error("Estado de caja no válido");
  if (Object.keys(box.remaining).length !== Object.keys(expected).length)
    throw Error("Contenido de caja no válido");
  for (const [id, n] of Object.entries(box.remaining))
    if (
      !Object.hasOwn(expected, id) ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > expected[id]
    )
      throw Error("Cantidad restante no válida");
  const opened = box.opened - box.baseOpened;
  if (
    opened > Math.ceil((capacity - box.baseDrawn) / packSize) ||
    capacity - total(box) !==
      Math.min(capacity, box.baseDrawn + opened * packSize)
  )
    throw Error("Avance de caja no válido");
  return box;
}
function draw(box, random) {
  const result = [];
  for (let i = 0; i < packSize && total(box) > 0; i++) {
    let ticket = random(total(box));
    if (!Number.isInteger(ticket) || ticket < 0 || ticket >= total(box))
      throw Error("Sorteo no válido");
    for (const [id, n] of Object.entries(box.remaining)) {
      if (ticket < n) {
        box.remaining[id]--;
        result.push(id);
        break;
      }
      ticket -= n;
    }
  }
  if (result.length) box.opened++;
  return result;
}
function reset(box, cards, set) {
  return { ...create(cards, set), resets: box.resets + 1 };
}
export default {
  packSize,
  capacity,
  initial,
  total,
  create,
  migrate,
  validate,
  draw,
  reset,
};
