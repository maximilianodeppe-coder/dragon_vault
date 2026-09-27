import BOX from "./boxes.js";
import Economy from "./economy-engine.js";
import { migrateInventory, validateInventory } from "./inventory.js";
import { validateBanlists } from "./banlists.js";
import { deckRules } from './deck-rules.js';
import { defaultFormats, validateFormats } from './formats.js';
import {
  cards,
  allCards,
  byId,
  SETS,
  isExtraDeck,
  isDeckCard,
  familyCopies,
} from "./catalog.js";
export const storageKey = "dragon-vault-boxes-v4";
export const storageKeys = [
  storageKey,
  "dragon-vault-boxes-v3",
  "dragon-vault-boxes-v2",
  "dragon-vault-lob-v1",
];
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function createProgress() {
  return {
    version: 7,
    formats: defaultFormats(),
    coins: 1000,
    owned: {},
    inventory: {},
    packs: 0,
    decks: [],
    banlists: [],
    odds: [70, 18, 10, 2],
    boxes: {},
    selectedSet: "",
    economy: Economy.defaults(cards),
  };
}
export function deckCounts(d) {
  let main = 0,
    extra = 0;
  for (const [id, n] of Object.entries(d.cards)) {
    if (isExtraDeck(byId.get(id))) extra += n;
    else main += n;
  }
  return { main, extra };
}
export function validate(s) {
  const originalVersion = s?.version;
  if (
    !s ||
    ![1, 2, 3, 4, 5, 6, 7].includes(s.version) ||
    !s.owned ||
    typeof s.owned !== "object" ||
    Array.isArray(s.owned) ||
    !Number.isSafeInteger(s.packs) ||
    s.packs < 0 ||
    !Array.isArray(s.decks) ||
    s.decks.length > 200 ||
    !Array.isArray(s.odds) ||
    s.odds.length !== 4 ||
    s.odds.some((n) => !Number.isFinite(n) || n < 0) ||
    Math.abs(s.odds.reduce((a, b) => a + b, 0) - 100) > 0.001
  )
    throw Error("Formato de copia no válido.");
  for (const [id, n] of Object.entries(s.owned))
    if (!byId.has(id) || !Number.isSafeInteger(n) || n < 0 || n > 1e7)
      throw Error("La copia contiene cartas o cantidades no válidas.");
  const ids = new Set();
  for (const d of s.decks) {
    if (
      !d ||
      typeof d.id !== "string" ||
      ids.has(d.id) ||
      typeof d.name !== "string" ||
      d.name.length > 60 ||
      !d.cards ||
      typeof d.cards !== "object" ||
      Array.isArray(d.cards)
    )
      throw Error("Mazo no válido.");
    ids.add(d.id);
    if (Object.keys(d.cards).some(id => familyCopies(d, id) > 3))
      throw Error('El mazo supera 3 copias entre variantes de la misma carta.');
    if (d.ruleset !== undefined && !['standard', 'speed'].includes(d.ruleset))
      throw Error('Reglas de construcción del mazo no válidas.');
    for (const [id, n] of Object.entries(d.cards))
      if (
        !byId.has(id) ||
        !isDeckCard(byId.get(id)) ||
        !Number.isInteger(n) ||
        n < 1 ||
        n > 3 ||
        n > (s.owned[id] || 0)
      )
        throw Error("El mazo supera las cartas disponibles.");
    const counts = deckCounts(d);
    const rules = deckRules(d);
    if (counts.main > rules.main || counts.extra > rules.extra)
      throw Error("El mazo supera su tamaño máximo.");
  }
  validateBanlists(s);
  if (s.version === 1) {
    s = {
      ...s,
      version: 4,
      boxes: Object.fromEntries(
        SETS.map((set) => [set.id, BOX.create(cards, set.id)]),
      ),
      selectedSet: "LOB",
    };
  } else {
    if (
      !s.boxes ||
      Array.isArray(s.boxes) ||
      (Object.keys(s.boxes).length !== 0 && Object.keys(s.boxes).length !== SETS.length) ||
      (s.selectedSet !== '' && !SETS.some((set) => set.id === s.selectedSet))
    )
      throw Error("Las cajas del archivo no son válidas.");
    for (const set of SETS) {
      if (!Object.keys(s.boxes).length) break;
      if (s.version === 2 || s.version === 3)
        s.boxes[set.id] = BOX.migrate(
          s.boxes[set.id],
          cards,
          set.id,
          s.version,
        );
      BOX.validate(s.boxes[set.id], cards, set.id);
    }
    s.version = 4;
  }
  if (s.coins === undefined) s.coins = 1000;
  if (!Number.isSafeInteger(s.coins) || s.coins < 0 || s.coins > 1e9)
    throw Error("Saldo de monedas no válido.");
  s.economy =
    s.economy === undefined
      ? Economy.defaults(cards)
      : Economy.validate(s.economy, allCards);
  if (originalVersion < 5) migrateInventory(s);
  validateInventory(s);
  validateFormats(s, originalVersion < 6);
  s.version = 7;
  return s;
}
