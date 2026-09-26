"use strict";
const packSize = 5,
  capacity = 750,
  copies = {
    Common: 5,
    Rare: 3,
    "Super Rare": 2,
    "Ultra Rare": 1,
    "Secret Rare": 1,
  };
function legacyInitial(cards, set) {
  return Object.fromEntries(
    cards
      .filter((c) => c.set === set)
      .map((c) => [String(c.id), copies[c.rarity]]),
  );
}
function initial(cards, set) {
  const list = cards.filter((c) => c.set === set),
    result = legacyInitial(cards, set),
    commons = list
      .filter((c) => c.rarity === "Common")
      .sort((a, b) => a.code.localeCompare(b.code));
  let extra = capacity - Object.values(result).reduce((a, b) => a + b, 0);
  if (extra < 0 || !commons.length)
    throw Error("No se puede distribuir esta caja");
  for (let i = 0; i < extra; i++) result[commons[i % commons.length].id]++;
  return result;
}
function create(cards, set) {
  return {
    remaining: initial(cards, set),
    resets: 0,
    opened: 0,
    legacyDrawn: 0,
    legacyOpened: 0,
  };
}
function total(box) {
  return Object.values(box.remaining).reduce((a, b) => a + b, 0);
}
function checkCounts(box, expected) {
  if (
    !box ||
    !box.remaining ||
    Array.isArray(box.remaining) ||
    !Number.isSafeInteger(box.resets) ||
    box.resets < 0 ||
    !Number.isSafeInteger(box.opened) ||
    box.opened < 0
  )
    throw Error("Estado de caja no válido.");
  if (Object.keys(box.remaining).length !== Object.keys(expected).length)
    throw Error("La caja no coincide con la expansión.");
  for (const [id, n] of Object.entries(box.remaining))
    if (
      !Object.hasOwn(expected, id) ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > expected[id]
    )
      throw Error("Cantidad restante no válida.");
}
function migrate(box, cards, set) {
  const old = legacyInitial(cards, set),
    next = initial(cards, set);
  checkCounts(box, old);
  const oldTotal = Object.values(old).reduce((a, b) => a + b, 0),
    used = oldTotal - total(box);
  if (
    used !== Math.min(box.opened * 9, oldTotal) ||
    box.opened > Math.ceil(oldTotal / 9)
  )
    throw Error("Avance anterior no válido");
  return {
    ...box,
    remaining: Object.fromEntries(
      Object.keys(next).map((id) => [
        id,
        next[id] - (old[id] - box.remaining[id]),
      ]),
    ),
    legacyDrawn: used,
    legacyOpened: box.opened,
  };
}
function validate(box, cards, set) {
  const expected = initial(cards, set);
  checkCounts(box, expected);
  if (
    !Number.isSafeInteger(box.legacyDrawn) ||
    box.legacyDrawn < 0 ||
    box.legacyDrawn > capacity ||
    !Number.isSafeInteger(box.legacyOpened) ||
    box.legacyOpened < 0 ||
    box.legacyOpened > box.opened
  )
    throw Error("Historial de caja no válido.");
  const oldTotal = Object.values(legacyInitial(cards, set)).reduce(
    (a, b) => a + b,
    0,
  );
  if (
    box.legacyDrawn !== Math.min(box.legacyOpened * 9, oldTotal) ||
    box.legacyOpened > Math.ceil(oldTotal / 9)
  )
    throw Error("Historial anterior no válido");
  const opened = box.opened - box.legacyOpened;
  if (
    opened > Math.ceil((capacity - box.legacyDrawn) / packSize) ||
    capacity - total(box) !==
      Math.min(box.legacyDrawn + opened * packSize, capacity)
  )
    throw Error("El avance de la caja no coincide.");
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
  copies,
  packSize,
  capacity,
  initial,
  create,
  total,
  validate,
  migrate,
  draw,
  reset,
};
