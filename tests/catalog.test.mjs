import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cards,
  allCards,
  byId,
  registerCatalog,
  gameCards,
  isPublished,
  isExtraDeck,
} from "../app/utils/catalog.js";
import {
  createProgress,
  validate,
  clone,
  deckCounts,
} from "../app/utils/progress.js";
import { Economy, changeDeck } from "../app/utils/actions.js";
import { saveExpansion, raritySummary } from "../app/utils/expansions.js";

const snapshot = JSON.parse(readFileSync("data/catalog/cards.json", "utf8"));
registerCatalog(snapshot);
const modern = allCards.find((c) => c.name_en === "Stardust Dragon");
const id = String(modern.id);
const expansion = (status = "draft") => ({
  id: "custom-test",
  name: "Sincronía",
  code: "SYN-01",
  description: "Prueba",
  coverId: id,
  status,
  cost: 7,
  size: 2,
  entries: [{ id, copies: 3, remaining: 3, rarity: "Ultra Rare" }],
});

test("el catálogo íntegro preserva el original y no activa cartas automáticamente", () => {
  assert.equal(snapshot.data.length, snapshot.metadata.count);
  assert.equal(new Set(allCards.map((c) => c.id)).size, allCards.length);
  assert.ok(allCards.length > 14000);
  for (const c of cards) {
    assert.equal(byId.get(String(c.id)).name_es, c.name_es);
    assert.equal(byId.get(String(c.id)).image, c.image);
  }
  assert.equal(gameCards(createProgress()).length, 422);
  assert.equal(modern.language, "en");
  assert.ok(modern.officialSets.length);
  assert.ok(isExtraDeck(modern));
});

test("borrador, publicación, extracción sin garantías y retiro conservan las cartas obtenidas", () => {
  const state = createProgress();
  saveExpansion(state, expansion());
  validate(state);
  assert.equal(gameCards(state).length, 422);
  assert.throws(() => Economy.draw(state, allCards, "custom-test", () => 0));
  assert.equal(state.coins, 1000);
  saveExpansion(state, expansion("published"));
  assert.equal(gameCards(state).length, 423);
  assert.equal(state.owned[id], undefined);
  assert.deepEqual(
    Economy.draw(state, allCards, "custom-test", () => 0),
    [id, id],
  );
  assert.equal(state.coins, 993);
  assert.equal(state.economy.customPacks[0].entries[0].remaining, 1);
  assert.deepEqual(validate(clone(state)), state);
  saveExpansion(state, expansion());
  assert.equal(state.economy.customPacks[0].entries[0].remaining, 1);
  assert.equal(gameCards(state).length, 423);
  state.economy.customPacks = [];
  assert.equal(gameCards(state).length, 423);
  state.decks.push({ id: "deck", name: "Sincronía", cards: {} });
  changeDeck(state, "deck", id, 1);
  assert.deepEqual(deckCounts(state.decks[0]), { main: 0, extra: 1 });
  validate(state);
  assert.ok(isPublished({ name: "Formato anterior" }));
});

test("editar presentación conserva stock; cambiar contenido requiere reposición explícita", () => {
  const state = createProgress();
  saveExpansion(state, expansion("published"));
  Economy.draw(state, allCards, "custom-test", () => 0);
  saveExpansion(state, {
    ...expansion("published"),
    name: "Otro nombre",
    cost: 8,
  });
  assert.equal(state.economy.customPacks[0].entries[0].remaining, 1);
  const changed = expansion("published");
  changed.entries[0].copies = changed.entries[0].remaining = 5;
  assert.throws(() => saveExpansion(state, changed), /contenido cambió/);
  saveExpansion(state, changed, true);
  assert.equal(state.economy.customPacks[0].entries[0].remaining, 5);
  assert.equal(
    raritySummary(changed).find((r) => r.rarity === "Ultra Rare").percent,
    100,
  );
  const bad = clone(state);
  bad.economy.customPacks[0].status = "unknown";
  assert.throws(() => validate(bad));
});

test("cada copia pesa igual y no se fuerza ninguna rareza", () => {
  const state = createProgress();
  const pack = expansion("published");
  const common = String(cards.find((c) => c.rarity === "Common").id);
  pack.entries = [
    { id: common, copies: 3, remaining: 3, rarity: "Common" },
    { id, copies: 1, remaining: 1, rarity: "Ultra Rare" },
  ];
  saveExpansion(state, pack);
  assert.equal(
    raritySummary(pack).find((r) => r.rarity === "Common").percent,
    75,
  );
  assert.deepEqual(
    Economy.draw(state, allCards, pack.id, () => 0),
    [common, common],
  );
  assert.deepEqual(
    Economy.draw(state, allCards, pack.id, (total) => total - 1),
    [id, common],
  );
  assert.throws(() => Economy.draw(state, allCards, pack.id, () => 0));
  validate(state);
});
