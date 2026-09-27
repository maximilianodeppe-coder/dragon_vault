import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerCatalog, allCards, names, gameCards } from "../app/utils/catalog.js";
import { indexSetCards, officialDraft, filterSets } from "../app/utils/official-sets.js";
import { createProgress, validate, clone } from "../app/utils/progress.js";
import { saveExpansion, hasDraftChanges, fillCommons } from "../app/utils/expansions.js";
import { validateSets } from "../scripts/sync-sets.mjs";

const sets = JSON.parse(readFileSync("data/catalog/sets.json", "utf8"));
registerCatalog(JSON.parse(readFileSync("data/catalog/cards.json", "utf8")));
const index = indexSetCards(allCards);

test("protege borradores de solo metadatos y detecta cambios sin confundir stock vendido", () => {
  const draft = { draft: {}, draftName: "", draftDescription: "", draftCover: "", draftSource: null,
    draftKind: "pack", draftCost: 5, draftSize: 5, draftBoxPacks: 100, draftRarities: {} };
  assert.equal(hasDraftChanges(draft), false);
  assert.equal(hasDraftChanges({ ...draft, draftName: "Mi idea" }), true);
  assert.equal(hasDraftChanges({ ...draft, draftDescription: "Descripción" }), true);
  const pack = officialDraft(sets.data.find((s) => s.set_name === "Dark Crisis"), index.get("Dark Crisis"));
  const populated = { ...draft, draft: Object.fromEntries(pack.entries.map((e) => [e.id, e.copies])),
    draftRarities: Object.fromEntries(pack.entries.map((e) => [e.id, e.rarity])), draftName: pack.name,
    draftBoxPacks: pack.boxPacks, draftCover: pack.coverId, draftSource: pack.officialSource };
  pack.entries[0].remaining = 0;
  assert.equal(hasDraftChanges(populated, pack), false);
  assert.equal(hasDraftChanges({ ...populated, draftCost: 10 }, pack), true);
});

test("archivo completo validado, cronología, fechas ausentes y formatos separados", () => {
  validateSets(sets);
  const tcg = filterSets(sets.data);
  assert.ok(tcg.length > 900);
  assert.ok(tcg.filter((s) => s.tcg_date).every((s, i, rows) => i === 0 || rows[i - 1].tcg_date <= s.tcg_date));
  assert.ok(tcg.every((s) => !/speed duel/i.test(s.set_name)));
  assert.ok(filterSets(sets.data, { format: "Speed Duel" }).length > 0);
  assert.ok(filterSets(sets.data, { year: "unknown" }).every((s) => !s.tcg_date));
  assert.equal(filterSets(sets.data, { search: "no-such-expansion" }).length, 0);
  assert.throws(() => validateSets({ metadata: { count: 0 }, data: [] }));
});

test("ediciones con código compartido conservan su identidad y cartas sin duplicados", () => {
  const waves = sets.data.filter((s) => s.set_code === "CT10");
  assert.ok(waves.length >= 2);
  for (const set of waves) {
    const draft = officialDraft(set, index.get(set.set_name));
    assert.equal(draft.officialSource.name, set.set_name);
    assert.equal(new Set(draft.entries.map((e) => e.id)).size, draft.entries.length);
    assert.ok(draft.entries.every((e) => e.copies === ({ Rare: 5, 'Super Rare': 3 }[e.rarity] || 1) && Object.hasOwn(names, e.rarity)));
  }
  assert.throws(() => officialDraft(waves[0], undefined), /vinculadas/);
});

test("importar una oficial permite borrador, publicación, respaldo y edición sin reponer existencias", () => {
  const set = sets.data.find((s) => s.set_name === "Dark Crisis");
  const pack = { ...officialDraft(set, index.get(set.set_name)), id: "custom-official-test" };
  const state = createProgress();
  saveExpansion(state, pack);
  assert.equal(gameCards(state).length, 0);
  assert.deepEqual(validate(clone(state)).economy.customPacks[0].officialSource, pack.officialSource);
  const published = { ...clone(pack), status: "published" };
  published.entries = fillCommons(published.entries, published.size, published.boxPacks).map(e => ({ ...e, remaining: e.copies }));
  saveExpansion(state, published, true);
  assert.ok(gameCards(state).length === published.entries.length);
  assert.deepEqual(state.owned, {});
  state.economy.customPacks[0].entries[0].remaining = 0;
  saveExpansion(state, { ...clone(published), cost: 10 });
  assert.equal(state.economy.customPacks[0].entries[0].remaining, 0);
  const bad = clone(state);
  bad.economy.customPacks[0].officialSource.code = "../bad";
  assert.throws(() => validate(bad), /referencia/);
});
