import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCatalogUpdater, DAY } from "../scripts/catalog-updater.mjs";
import { catalogImages } from "../scripts/sync-catalog.mjs";

const cards = JSON.parse(await readFile(new URL("../data/catalog/cards.json", import.meta.url), "utf8"));
const spanish = JSON.parse(await readFile(new URL("../data/catalog/es.json", import.meta.url), "utf8"));
const sets = JSON.parse(await readFile(new URL("../data/catalog/sets.json", import.meta.url), "utf8"));
const newCard = { id: 999999999, name: "New card", type: "Effect Monster", desc: "New effect",
  card_images: [{ image_url: "https://images.ygoprodeck.com/images/cards/999999999.jpg" }] };

async function fixture(t, overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), "dragon-vault-sync-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let time = Date.now();
  const calls = { version: 0, cards: 0, spanish: 0 };
  const options = {
    directory, initial: { cards, spanish, sets }, originals: [], now: () => time,
    getSets: async () => sets,
    getVersion: async () => { calls.version++; return "v2"; },
    getCards: async () => {
      calls.cards++;
      return { metadata: cards.metadata, data: [...cards.data.slice(1), newCard] };
    },
    getSpanish: async () => {
      calls.spanish++;
      return { metadata: spanish.metadata, data: {
        ...spanish.data, [newCard.id]: { name: "Carta nueva", text: "Efecto nuevo", source: "YAML Yugi" },
      } };
    },
    log: { info() {}, error() {} }, ...overrides,
  };
  return { updater: createCatalogUpdater(options), options, calls, nextDay: () => { time += DAY; } };
}

test("sincroniza altas e imágenes, retiene cartas ausentes y deduplica chequeos", async (t) => {
  const f = await fixture(t);
  const [state, same] = await Promise.all([f.updater.check(), f.updater.check()]);
  assert.equal(state, same);
  assert.equal(state.cards.data.length, cards.data.length + 1);
  assert.ok(state.cards.data.some((c) => c.id === cards.data[0].id));
  assert.equal(state.spanish.data[newCard.id].name, "Carta nueva");
  assert.equal(catalogImages(state.cards)[newCard.id], newCard.card_images[0].image_url);
  await f.updater.check();
  assert.deepEqual(f.calls, { version: 1, cards: 1, spanish: 1 });
  const restarted = createCatalogUpdater(f.options);
  assert.equal((await restarted.check()).version, "v2");
  assert.deepEqual(f.calls, { version: 1, cards: 1, spanish: 1 });
  f.nextDay();
  await restarted.check();
  assert.deepEqual(f.calls, { version: 2, cards: 1, spanish: 2 });
});

test("actualiza expansiones cada día y conserva el listado si falla la fuente", async (t) => {
  let downloads = 0;
  const added = { set_name: "Test expansion", set_code: "TEST", num_of_cards: 1, tcg_date: "2026-09-25" };
  const f = await fixture(t, { getSets: async () => {
    if (++downloads > 1) throw Error("Fuente caída");
    return { metadata: { ...sets.metadata, count: sets.data.length + 1 }, data: [...sets.data, added] };
  } });
  assert.equal((await f.updater.check()).sets.data.at(-1).set_name, added.set_name);
  await f.updater.check();
  assert.equal(downloads, 1);
  f.nextDay();
  const result = await f.updater.check();
  assert.equal(downloads, 2);
  assert.equal(result.sets.data.at(-1).set_name, added.set_name);
  assert.equal(result.errors.sets, "Fuente caída");
});

test("el español se actualiza incluso cuando falla la API de cartas", async (t) => {
  const f = await fixture(t, { getVersion: async () => { throw Error("Sin conexión"); } });
  const state = await f.updater.check();
  assert.equal(state.cards, cards);
  assert.equal(state.spanish.data[newCard.id].text, "Efecto nuevo");
  assert.match(state.errors.cards, /Sin conexión/);
});

test("una traducción fallida no impide altas; un catálogo incompleto nunca se publica", async (t) => {
  const f = await fixture(t, { getSpanish: async () => { throw Error("Fuente caída"); } });
  const state = await f.updater.check();
  assert.equal(state.cards.data.length, cards.data.length + 1);
  assert.equal(state.spanish, spanish);
  const incomplete = createCatalogUpdater({ ...f.options,
    getVersion: async () => "v3", getCards: async () => ({ data: [newCard] }),
  });
  f.nextDay();
  const failed = await incomplete.check();
  assert.equal(failed.version, "v2");
  assert.equal(failed.cards.data.length, cards.data.length + 1);
  assert.match(failed.errors.cards, /incompleto/);
});

test("retiene traducciones previas y descarta una copia persistida corrupta", async (t) => {
  const id = Object.keys(spanish.data)[0];
  const reduced = { ...spanish.data };
  delete reduced[id];
  const f = await fixture(t, { getSpanish: async () => ({ metadata: spanish.metadata, data: reduced }) });
  assert.deepEqual((await f.updater.check()).spanish.data[id], spanish.data[id]);
  await writeFile(join(f.options.directory, "snapshot.json"), "{broken");
  assert.equal((await createCatalogUpdater(f.options).get()).cards, cards);
});

test('registra cambios de texto sin declararlos erratas funcionales y los conserva al reiniciar', async t => {
  const updated = structuredClone(cards);
  updated.data[0].desc += ' Changed text for review.';
  const f = await fixture(t, { getCards: async () => updated });
  const next = await f.updater.check();
  assert.equal(next.cards.textChanges.length, 1);
  assert.equal(next.cards.textChanges[0].before, cards.data[0].desc);
  assert.equal(next.cards.textChanges[0].status, 'pending');
  const restarted = createCatalogUpdater(f.options);
  assert.deepEqual((await restarted.get()).cards.textChanges, next.cards.textChanges);
  f.nextDay();
  assert.equal((await restarted.check()).cards.textChanges.length, 1);
});
