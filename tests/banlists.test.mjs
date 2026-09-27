import test from "node:test";
import assert from "node:assert/strict";
import { validate, clone } from "../app/utils/progress.js";
import { stockedWorld } from './helpers/world.mjs';
import { addCopies } from "../app/utils/inventory.js";
import { changeDeck } from "../app/utils/actions.js";
import {
  cardLimit,
  banlistConflicts,
  deleteBanlist,
} from "../app/utils/banlists.js";

test("banlists conservan borradores, restringen agregados y sobreviven respaldos", () => {
  const s = stockedWorld(),
    id = "36996508";
  addCopies(s, id, 2, {
    source: "shop",
    sourceName: "Tienda",
    rarity: "Common",
  });
  addCopies(s, id, 1, {
    source: "LOB",
    sourceName: "LOB",
    rarity: "Ultra Rare",
  });
  s.decks.push(
    { id: "a", name: "Mazo A", cards: { [id]: 3 } },
    { id: "b", name: "Mazo B", cards: {} },
  );
  s.banlists.push({ id: "rules", name: "Reglas", limits: { [id]: 1 } });
  s.decks[0].banlistId = "rules";
  assert.equal(cardLimit(s, s.decks[1], id), 3);
  assert.deepEqual(banlistConflicts(s, s.decks[0]), [
    { id, copies: 3, limit: 1 },
  ]);
  assert.deepEqual(validate(clone(s)), s);
  changeDeck(s, "a", id, -1);
  changeDeck(s, "a", id, -1);
  assert.deepEqual(banlistConflicts(s, s.decks[0]), []);
  assert.throws(() => changeDeck(s, "a", id, 1), /banlist/);
  s.banlists[0].limits[id] = 0;
  changeDeck(s, "a", id, -1);
  assert.throws(() => changeDeck(s, "a", id, 1), /prohibida/);
  s.banlists[0].limits[id] = 2;
  changeDeck(s, "a", id, 1);
  changeDeck(s, "a", id, 1);
  assert.throws(() => changeDeck(s, "a", id, 1), /banlist/);
  deleteBanlist(s, "rules");
  assert.equal(s.decks[0].banlistId, undefined);
  changeDeck(s, "a", id, 1);
  assert.deepEqual(validate(clone(s)), s);
});

test("guardados anteriores no necesitan banlists; límites y referencias inválidas se rechazan", () => {
  const old = stockedWorld();
  delete old.banlists;
  assert.deepEqual(validate(old).banlists, []);
  for (const limits of [
    { 36996508: -1 },
    { 36996508: 4 },
    { 36996508: 1.5 },
    { 36996508: "1" },
    { unknown: 0 },
  ]) {
    const s = stockedWorld();
    s.banlists = [{ id: "a", name: "Prueba", limits }];
    assert.throws(() => validate(s));
  }
  const bad = stockedWorld();
  bad.decks = [{ id: "a", name: "Prueba", cards: {}, banlistId: "missing" }];
  assert.throws(() => validate(bad), /no existe/);
  const duplicate = stockedWorld();
  duplicate.banlists = [
    { id: "a", name: "A", limits: {} },
    { id: "a", name: "B", limits: {} },
  ];
  assert.throws(() => validate(duplicate));
});
