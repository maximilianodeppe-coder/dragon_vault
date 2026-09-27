import { publishStarter } from "./helpers/world.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { createProgress, validate, clone } from "../app/utils/progress.js";
import {
  cards,
  byId,
  allCards,
  registerCatalog,
  registerSpanish,
} from "../app/utils/catalog.js";
import { Economy, grantStarter, openBox } from "../app/utils/actions.js";
import {
  addCopies,
  lotKey,
  lotsFor,
  identifyCopies,
} from "../app/utils/inventory.js";
import { readFileSync } from "node:fs";
registerCatalog(JSON.parse(readFileSync("data/catalog/cards.json")));
const id = String(cards.find((c) => c.name_en === "Dark Magician").id);
const rare = {
  source: "custom-rare",
  sourceName: "Magos raros",
  rarity: "Rare",
};
const ultra = {
  source: "custom-ultra",
  sourceName: "Magos ultra",
  rarity: "Ultra Rare",
};
test("la misma carta conserva sus ediciones y se vende por la rareza elegida", () => {
  const s = createProgress();
  addCopies(s, id, 2, rare);
  addCopies(s, id, 2, ultra);
  assert.equal(s.owned[id], 4);
  assert.equal(lotsFor(s, id).length, 2);
  assert.throws(() => Economy.sell(s, allCards, [{ id, quantity: 1 }]));
  assert.deepEqual(
    Economy.sell(s, allCards, [{ id, lot: lotKey(rare), quantity: 1 }]),
    { coins: 3, count: 1 },
  );
  assert.deepEqual(
    Economy.sell(s, allCards, [{ id, lot: lotKey(ultra), quantity: 1 }]),
    { coins: 15, count: 1 },
  );
  assert.equal(s.coins, 1018);
  assert.equal(s.owned[id], 2);
  validate(s);
  assert.deepEqual(validate(clone(s)), s);
});
test("las ventas combinadas protegen el total que requieren los mazos", () => {
  const s = createProgress();
  addCopies(s, id, 2, rare);
  addCopies(s, id, 2, ultra);
  s.decks.push({ id: "test", name: "Mago", cards: { [id]: 3 } });
  const before = clone(s);
  assert.throws(() =>
    Economy.sell(s, allCards, [
      { id, lot: lotKey(rare), quantity: 1 },
      { id, lot: lotKey(ultra), quantity: 1 },
    ]),
  );
  assert.deepEqual(s, before);
  assert.deepEqual(Economy.excess(s), [
    {
      id,
      lot: lotKey(rare),
      rarity: "Rare",
      sourceName: "Magos raros",
      quantity: 1,
    },
  ]);
  Economy.sell(s, allCards, Economy.excess(s));
  validate(s);
  assert.equal(s.owned[id], 3);
});
test("sobres propios, clásicos, tienda e iniciales registran el origen de cada copia", () => {
  const s = createProgress();
  s.economy.customPacks.push({
    id: "custom-rare",
    name: "Magos raros",
    cost: 5,
    size: 1,
    entries: [{ id, rarity: "Rare", copies: 2, remaining: 2 }],
  });
  Economy.draw(s, allCards, "custom-rare", () => 0);
  assert.equal(lotsFor(s, id)[0].rarity, "Rare");
  s.economy.customPacks[0].entries[0].rarity = "Common";
  s.economy.customPacks[0].name = "Nuevo nombre";
  Economy.draw(s, allCards, "custom-rare", () => 0);
  assert.deepEqual(
    lotsFor(s, id).map((l) => l.rarity),
    ["Rare", "Common"],
  );
  s.economy.customPacks = [];
  const starterId = publishStarter(s, "SDY");
  grantStarter(s, starterId, false);
  assert.throws(() => openBox(s, "LOB"), /retiradas/);
  s.economy.offers = [{ id, stock: 3 }];
  const offer = s.economy.offers[0];
  Economy.buy(s, allCards, offer.id);
  assert.ok(lotsFor(s, offer.id).some((l) => l.source === "shop"));
  assert.ok(lotsFor(s, id).some((l) => l.source === starterId));
  validate(s);
});
test("migra sin inventar rarezas y permite identificar sin alterar cantidades ni saldo", () => {
  const old = createProgress();
  old.version = 4;
  old.owned[id] = 3;
  delete old.inventory;
  const s = validate(old);
  assert.equal(lotsFor(s, id)[0].rarity, null);
  assert.throws(() => Economy.sell(s, allCards, [{ id, quantity: 1 }]));
  identifyCopies(s, id, 1, rare);
  assert.equal(s.owned[id], 3);
  assert.equal(s.coins, 1000);
  assert.equal(lotsFor(s, id).find((l) => !l.rarity).quantity, 2);
  validate(s);
  const bad = clone(s);
  bad.inventory[id][0].quantity++;
  assert.throws(() => validate(bad));
  const missing = clone(s);
  delete missing.inventory;
  assert.throws(() => validate(missing));
});
test("los efectos y nombres españoles se cruzan por ID y mantienen el historial clásico", () => {
  registerSpanish(JSON.parse(readFileSync("data/catalog/es.json")));
  const stardust = byId.get("44508094");
  assert.equal(stardust.language, "es");
  assert.match(stardust.name_es, /Polvo de Estrellas/);
  assert.match(stardust.desc_es, /Sacrificar/);
  assert.ok(byId.get("26202165").historical);
});
