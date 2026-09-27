import { test } from "node:test";
import assert from "node:assert/strict";
import { validate, clone } from "../app/utils/progress.js";
import { stockedWorld } from './helpers/world.mjs';
import { cards } from "../app/utils/catalog.js";
import { addCopies, lotKey } from "../app/utils/inventory.js";
import Economy from "../app/utils/economy-engine.js";
import query from "../app/utils/collection-query.js";

test("precio individual, compra común y bloqueo de toda venta de tienda", () => {
  const s = stockedWorld(),
    c = cards.find((c) => c.rarity === "Ultra Rare"),
    id = String(c.id);
  s.economy.offers = [{ id, stock: 5, price: 17 }];
  Economy.buy(s, cards, id);
  validate(s);
  assert.equal(s.coins, 983);
  const lot = s.inventory[id][0];
  assert.equal(lot.rarity, "Common");
  assert.equal(lot.source, "shop");
  const before = clone(s);
  assert.throws(() =>
    Economy.sell(s, cards, [{ id, lot: lotKey(lot), quantity: 1 }]),
  );
  assert.deepEqual(s, before);
  // Even old shop lots with a different rarity are non-sellable.
  addCopies(s, id, 5, {
    source: "shop",
    sourceName: "Tienda",
    rarity: "Ultra Rare",
  });
  assert.deepEqual(Economy.excess(s), []);
  assert.throws(() =>
    Economy.quoteSale(s, cards, [
      { id, lot: lotKey(s.inventory[id][1]), quantity: 1 },
    ]),
  );
  addCopies(s, id, 3, { source: "LOB", sourceName: "Sobre", rarity: "Rare" });
  assert.deepEqual(Economy.excess(s), []);
  addCopies(s, id, 1, { source: "LOB", sourceName: "Sobre", rarity: "Rare" });
  assert.equal(Economy.excess(s)[0].quantity, 1);
  Economy.sell(s, cards, Economy.excess(s));
  assert.equal(s.inventory[id][0].quantity, 1);
  assert.deepEqual(validate(clone(s)), s);
  s.economy.offers[0].price = 0;
  assert.throws(() => validate(s));
});
test("consultas sin códigos de edición, incluso si el catálogo no tiene ese campo", () => {
  const source = cards.slice(0, 5).map(({ code, obtainable, ...c }) => c);
  assert.equal(query(source, {}, {}).cards.length, 5);
  assert.equal(query(cards, {}, { search: "LOB-001" }).cards.length, 0);
  assert.equal(
    query(cards, {}, { search: String(cards[0].id) }).cards.length,
    1,
  );
});
