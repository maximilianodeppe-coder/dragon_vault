import { test } from "node:test";
import assert from "node:assert/strict";
import { createProgress, validate, clone } from "../app/utils/progress.js";
import {
  starters,
  starterProducts,
  cards,
  gameCards,
} from "../app/utils/catalog.js";
import { grantStarter } from "../app/utils/actions.js";
import Economy from "../app/utils/economy-engine.js";
import { saveExpansion } from "../app/utils/expansions.js";

const product = () => ({
  id: "custom-start",
  kind: "starter",
  name: "Magos de prueba",
  cost: 120,
  size: 1,
  status: "draft",
  entries: starters[0].entries
    .slice(0, 14)
    .map((e, i) => ({
      id: String(e.id),
      copies: i === 13 ? 1 : 3,
      remaining: i === 13 ? 1 : 3,
      rarity: "Rare",
    })),
});
test("mazo fijo: borrador, publicación, compra repetible y rareza real con respaldo", () => {
  const s = createProgress(),
    p = product();
  saveExpansion(s, p);
  validate(s);
  assert.equal(starterProducts(s).length, 0);
  assert.throws(() => grantStarter(s, p.id, true, "deck"));
  p.status = "published";
  validate(s);
  assert.equal(starterProducts(s).length, 1);
  assert.equal(
    gameCards(s).some((c) => c.obtainable.some((e) => e.set === p.id)),
    true,
  );
  const before = clone(p.entries);
  grantStarter(s, p.id, true, "deck");
  assert.equal(s.coins, 880);
  assert.equal(
    Object.values(s.owned).reduce((a, b) => a + b, 0),
    40,
  );
  assert.equal(s.inventory[p.entries[0].id][0].rarity, "Rare");
  assert.equal(s.inventory[p.entries[0].id][0].source, p.id);
  assert.equal(s.decks[0].cards[p.entries[0].id], 3);
  grantStarter(s, p.id, false, "unused");
  assert.equal(s.coins, 760);
  assert.deepEqual(p.entries, before);
  assert.deepEqual(validate(clone(s)), s);
  assert.throws(() => Economy.draw(s, cards, p.id, () => 0));
  s.economy.customPacks = [];
  validate(s);
  assert.equal(s.owned[p.entries[0].id], 6);
});
test("mazos inválidos y compras sin saldo no alteran el progreso", () => {
  const s = createProgress(),
    p = product();
  p.status = "published";
  s.economy.customPacks.push(p);
  for (const mutate of [
    (p) => (p.kind = "invalid"),
    (p) => (p.entries[0].copies = 1001),
    (p) => (p.entries = []),
  ]) {
    const bad = clone(s);
    mutate(bad.economy.customPacks[0]);
    assert.throws(() => validate(bad));
  }
  s.coins = 0;
  const before = clone(s);
  assert.throws(() => grantStarter(s, p.id, true, "deck"));
  assert.deepEqual(s, before);
  p.status = "draft";
  p.entries = p.entries.slice(0, 1);
  validate(s);
  assert.throws(() => saveExpansion(s, { ...p, kind: "pack" }));
});

test("convertir sobres existentes en mazo conserva cartas, origen y compras", () => {
  const s = createProgress();
  const pack = { ...product(), kind: "pack", size: 5, status: "published",
    officialSource: { name: "Starter Deck", code: "SDY", date: "", format: "TCG" } };
  saveExpansion(s, pack);
  Economy.draw(s, cards, pack.id, () => 0);
  const inventory = clone(s.inventory), owned = clone(s.owned), coins = s.coins;
  const deck = { ...clone(pack), kind: "starter", size: 1 };
  saveExpansion(s, deck);
  validate(s);
  assert.deepEqual(s.inventory, inventory);
  assert.deepEqual(s.owned, owned);
  assert.equal(s.coins, coins);
  assert.deepEqual(deck.officialSource, pack.officialSource);
  assert.deepEqual(deck.entries, pack.entries);
  grantStarter(s, deck.id, true, "converted-deck");
  assert.equal(Object.values(s.decks[0].cards).reduce((n, q) => n + q, 0), 40);
  assert.throws(() => saveExpansion(s, { ...clone(deck), kind: "pack" }), /reponer/);
});
