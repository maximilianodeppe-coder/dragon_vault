import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fetchCatalog, validateCatalog } from "./sync-catalog.mjs";
import { fetchSpanish } from "./sync-spanish.mjs";
import { fetchSets, validateSets } from "./sync-sets.mjs";

export const DAY = 24 * 60 * 60 * 1000;

async function fetchVersion() {
  const response = await fetch("https://db.ygoprodeck.com/api/v7/checkDBVer.php", {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`Versión YGOPRODeck: HTTP ${response.status}`);
  const payload = await response.json();
  const version = (Array.isArray(payload) ? payload[0] : payload)?.database_version;
  if (typeof version !== "string" || !version.trim()) throw Error("Versión de catálogo no válida.");
  return version;
}

function validateState(state) {
  validateCatalog(state.cards);
  if (state.sets) validateSets(state.sets);
  if (state.cards.metadata?.count !== state.cards.data.length ||
      !state.spanish?.data || Object.keys(state.spanish.data).length < 10000 ||
      Object.values(state.spanish.data).some((t) =>
        typeof t.name !== "string" || !t.name.trim() ||
        typeof t.text !== "string" || !t.text.trim()))
    throw Error("Copia del catálogo no válida.");
}

// One Node server per persistent data directory; the in-flight promise deduplicates checks.
export function createCatalogUpdater({ directory, initial, originals, now = Date.now,
  getVersion = fetchVersion, getCards = fetchCatalog, getSpanish = fetchSpanish, getSets = fetchSets,
  log = console }) {
  let current;
  let loading;
  let pending;
  const file = join(directory, "snapshot.json");
  async function get() {
    if (!loading) loading = (async () => {
      current = initial;
      validateState(current);
      try {
        const saved = JSON.parse(await readFile(file, "utf8"));
        validateState(saved);
        current = { ...saved, sets: saved.sets || initial.sets };
      } catch (error) {
        if (error.code !== "ENOENT") log.error("Se usa el catálogo incluido:", error.message);
      }
      return current;
    })();
    await loading;
    return current;
  }
  async function run(force) {
    const previous = await get();
    if (!force && previous.checkedAt && now() - Date.parse(previous.checkedAt) < DAY) return previous;
    const next = { ...previous, checkedAt: new Date(now()).toISOString(), errors: {} };
    try {
      const version = await getVersion();
      if (version !== previous.version) {
        const received = await getCards();
        validateCatalog(received);
        // Retain absent records: existing decks and collections must remain readable.
        const cards = new Map(previous.cards.data.map((card) => [card.id, card]));
        const textChanges = [...(previous.cards.textChanges || [])];
        const normalized = text => text.replace(/\s+/g, ' ').trim();
        for (const card of received.data) {
          const old = cards.get(card.id);
          if (old && normalized(old.desc) !== normalized(card.desc) &&
              !textChanges.some(change => change.id === card.id && change.before === old.desc && change.after === card.desc))
            textChanges.push({ id: card.id, name: card.name, before: old.desc, after: card.desc,
              detectedAt: next.checkedAt, status: 'pending', source: 'YGOPRODeck' });
        }
        for (const card of received.data) cards.set(card.id, card);
        next.cards = {
          metadata: { ...received.metadata, sourceCount: received.data.length, count: cards.size },
          data: [...cards.values()],
          textChanges,
        };
        next.version = version;
      }
    } catch (error) {
      next.errors.cards = error.message;
    }
    try {
      const sets = await getSets();
      validateSets(sets);
      next.sets = sets;
    } catch (error) {
      next.errors.sets = error.message;
    }
    // Spanish sources change independently of the English database version.
    try {
      const spanish = await getSpanish(next.cards, originals, previous.spanish);
      next.spanish = { ...spanish, data: { ...previous.spanish.data, ...spanish.data } };
      next.spanish.metadata = { ...spanish.metadata, count: Object.keys(next.spanish.data).length };
      validateState(next);
    } catch (error) {
      next.spanish = previous.spanish;
      next.errors.spanish = error.message;
    }
    validateState(next);
    await mkdir(directory, { recursive: true });
    await writeFile(file + ".tmp", JSON.stringify(next));
    await rename(file + ".tmp", file);
    current = next;
    log.info("Chequeo diario de cartas y español:", next.checkedAt, next.errors);
    return current;
  }
  function check(force = false) {
    if (!pending) pending = run(force).finally(() => { pending = undefined; });
    return pending;
  }
  return { get, check };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const read = async (file) => JSON.parse(await readFile(file, "utf8"));
  const [cards, spanish, originals, sets] = await Promise.all([
    read("data/catalog/cards.json"), read("data/catalog/es.json"), read("app/data/cards.json"),
    read("data/catalog/sets.json"),
  ]);
  const updater = createCatalogUpdater({ directory: ".data/catalog", initial: { cards, spanish, sets }, originals });
  const state = await updater.check(true);
  if (Object.keys(state.errors).length) process.exitCode = 1;
}
