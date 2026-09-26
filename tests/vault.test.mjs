import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { cards, starters, SETS } from "../app/utils/catalog.js";
import {
  createProgress,
  validate,
  clone,
  deckCounts,
} from "../app/utils/progress.js";
import {
  BOX,
  Economy,
  openBox,
  grantStarter,
  changeDeck,
} from "../app/utils/actions.js";
import Legacy from "../app/utils/legacy-boxes.js";
import query from "../app/utils/collection-query.js";
import { addCopies, editionFor } from "../app/utils/inventory.js";

test("se conservan las 422 cartas, los mazos iniciales y todas las imágenes", () => {
  assert.equal(cards.length, 422);
  assert.deepEqual(cards, JSON.parse(readFileSync("dist/cards.json", "utf8")));
  assert.deepEqual(
    starters,
    JSON.parse(readFileSync("dist/starters.json", "utf8")),
  );
  for (const card of cards) {
    assert.ok(existsSync("public/" + card.image));
    assert.deepEqual(
      readFileSync("public/" + card.image),
      readFileSync("dist/" + card.image),
    );
  }
});

test("las reglas migradas coinciden con los motores originales", () => {
  const original = vm.createContext({});
  for (const file of [
    "legacy-boxes",
    "boxes",
    "economy-engine",
    "collection-query",
  ])
    vm.runInContext(readFileSync(`dist/${file}.js`, "utf8"), original);
  for (const set of SETS)
    assert.deepEqual(
      BOX.initial(cards, set.id),
      clone(original.BoxEngine.initial(cards, set.id)),
    );
  assert.deepEqual(
    Economy.defaults(cards),
    clone(original.Economy.defaults(cards)),
  );
  const filters = {
    search: "dragon",
    categories: ["monster"],
    atkMin: "1000",
    sort: "atk",
    direction: "desc",
  };
  assert.deepEqual(
    query(cards, {}, filters).cards.map(c=>c.id).sort(),
    clone(original.CollectionQuery(cards, {}, filters)).cards.map(c=>c.id).sort(),
  );
});

test("las cajas agotan 500 cartas sin reposición y conservan el saldo", () => {
  const state = createProgress();
  for (let i = 0; i < 100; i++)
    assert.equal(openBox(state, "LOB", () => 0).length, 5);
  assert.equal(BOX.total(state.boxes.LOB), 0);
  assert.equal(state.coins, 500);
  assert.equal(
    Object.values(state.owned).reduce((a, b) => a + b, 0),
    500,
  );
  validate(state);
  const previous = clone(state);
  assert.throws(() => openBox(state, "LOB", () => 0));
  assert.deepEqual(state, previous);
});

test("las compras sin saldo no entregan cartas ni descuentan existencias", () => {
  const state = createProgress();
  state.coins = 0;
  const previous = clone(state);
  assert.throws(() => openBox(state, "MRD", () => 0));
  assert.throws(() => grantStarter(state, "SDY", true, "deck"));
  assert.throws(() => Economy.buy(state, cards, state.economy.offers[0].id));
  assert.deepEqual(state, previous);
});

test("comprar un mazo inicial conserva sus 50 cartas y los límites del editor", () => {
  const state = createProgress();
  grantStarter(state, "SDY", true, "deck");
  assert.equal(state.coins, 500);
  assert.equal(
    Object.values(state.owned).reduce((a, b) => a + b, 0),
    50,
  );
  assert.deepEqual(deckCounts(state.decks[0]), { main: 50, extra: 0 });
  const id = String(starters[0].entries[0].id);
  assert.throws(() => changeDeck(state, "deck", id, 1));
  changeDeck(state, "deck", id, -1);
  changeDeck(state, "deck", id, 1);
  addCopies(
    state,
    id,
    4 - state.owned[id],
    editionFor(
      cards.find((c) => String(c.id) === id),
      "SDY",
    ),
  );
  changeDeck(state, "deck", id, 1);
  changeDeck(state, "deck", id, 1);
  assert.throws(() => changeDeck(state, "deck", id, 1));
  assert.throws(() => Economy.sell(state, cards, [{ id, quantity: 2 }]));
  assert.equal(Economy.sell(state, cards, [{ id, quantity: 1 }]).count, 1);
  validate(state);
});

test("los sobres especiales cobran una vez y admiten el último sobre parcial", () => {
  const state = createProgress(),
    id = String(cards[0].id);
  state.economy.customPacks.push({
    id: "custom-test",
    name: "Prueba",
    cost: 7,
    size: 5,
    entries: [{ id, copies: 6, remaining: 6 }],
  });
  assert.equal(Economy.draw(state, cards, "custom-test", () => 0).length, 5);
  assert.equal(Economy.draw(state, cards, "custom-test", () => 0).length, 1);
  assert.equal(state.coins, 986);
  const previous = clone(state);
  assert.throws(() => Economy.draw(state, cards, "custom-test", () => 0));
  assert.deepEqual(state, previous);
  validate(state);
});

test("importa las versiones 1, 2, 3 y 4 sin perder cartas ni mazos", () => {
  const original = createProgress();
  grantStarter(original, "SDK", true, "kaiba");
  for (const version of [1, 2, 3, 4]) {
    const old = clone(original);
    old.version = version;
    if (version < 4) {
      delete old.coins;
      delete old.economy;
    }
    if (version === 1) delete old.boxes;
    if (version === 2)
      old.boxes = Object.fromEntries(
        SETS.map((s) => [
          s.id,
          {
            remaining: Object.fromEntries(
              cards
                .filter((c) => c.set === s.id)
                .map((c) => [String(c.id), Legacy.copies[c.rarity]]),
            ),
            opened: 0,
            resets: 0,
          },
        ]),
      );
    if (version === 3)
      old.boxes = Object.fromEntries(
        SETS.map((s) => [s.id, Legacy.create(cards, s.id)]),
      );
    const migrated = validate(old);
    assert.equal(migrated.version, 7);
    assert.deepEqual(migrated.owned, original.owned);
    assert.deepEqual(migrated.decks, original.decks);
    assert.equal(migrated.coins, version === 4 ? 500 : 1000);
    for (const set of SETS)
      assert.equal(BOX.total(migrated.boxes[set.id]), 500);
    assert.deepEqual(validate(clone(migrated)), migrated);
  }
});

test("rechaza respaldos alterados, precios inválidos y rangos invertidos", () => {
  const state = createProgress();
  assert.throws(() => validate({ ...clone(state), coins: -1 }));
  assert.throws(() => validate({ ...clone(state), owned: { unknown: 1 } }));
  const bad = clone(state);
  bad.economy.prices.Common.buy = 0;
  assert.throws(() => validate(bad));
  assert.ok(query(cards, {}, { atkMin: "2000", atkMax: "1000" }).error);
  assert.ok(
    query(cards, {}, { search: "dragón", categories: ["monster"] }).cards
      .length,
  );
});
