import { byId, isDeckCard } from "./catalog.js";
import { formatOf, formatLimit } from './formats.js';

export const limitNames = [
  "Prohibida · 0",
  "Limitada · 1",
  "Semilimitada · 2",
  "Sin restricción · 3",
];
export const activeBanlist = (state, deck) =>
  state.banlists?.find((list) => list.id === deck?.banlistId);
export const cardLimit = (state, deck, id) =>
  Math.min(formatLimit(state, formatOf(deck), id), activeBanlist(state, deck)?.limits[id] ?? 3);
export function groupCounts(state, deck) {
  const list = activeBanlist(state, deck);
  if (list?.style !== 'shared') return [];
  return [1, 2, 3].map(limit => ({ limit, copies: Object.entries(deck?.cards || {})
    .reduce((sum, [id, n]) => sum + (list.limits[id] === limit ? n : 0), 0) }));
}
export function groupAllowance(state, deck, id) {
  const list = activeBanlist(state, deck);
  const group = groupCounts(state, deck).find(g => g.limit === list?.limits[id]);
  return group ? Math.max(0, group.limit - group.copies) : 3;
}
export const banlistConflicts = (state, deck) =>
  Object.entries(deck?.cards || {}).flatMap(([id, copies]) => {
    const limit = cardLimit(state, deck, id);
    return copies > limit ? [{ id, copies, limit }] : [];
  });

export function validateBanlists(state) {
  if (state.banlists === undefined) state.banlists = [];
  if (!Array.isArray(state.banlists) || state.banlists.length > 200)
    throw Error("Las banlists no son válidas (máximo 200).");
  const ids = new Set();
  for (const list of state.banlists) {
    if (
      !list ||
      typeof list.id !== "string" ||
      !list.id ||
      list.id.length > 100 ||
      ids.has(list.id) ||
      typeof list.name !== "string" ||
      !list.name.trim() ||
      list.name.length > 60 ||
      !list.limits ||
      typeof list.limits !== "object" ||
      Array.isArray(list.limits)
    )
      throw Error("La banlist necesita un nombre y límites válidos.");
    ids.add(list.id);
    if (list.style !== undefined && !['individual', 'shared'].includes(list.style))
      throw Error('Estilo de banlist no válido.');
    for (const [id, limit] of Object.entries(list.limits))
      if (
        !byId.has(id) ||
        !isDeckCard(byId.get(id)) ||
        !Number.isInteger(limit) ||
        limit < 0 ||
        limit > 3
      )
        throw Error("La banlist contiene cartas o límites no válidos.");
  }
  for (const deck of state.decks)
    if (
      deck.banlistId !== undefined &&
      (typeof deck.banlistId !== "string" ||
        (deck.banlistId && !ids.has(deck.banlistId)))
    )
      throw Error("La banlist elegida para un mazo no existe.");
  // Conflicts remain editable drafts; changing a list never removes owned cards.
}

export function deleteBanlist(state, id) {
  state.banlists = state.banlists.filter((list) => list.id !== id);
  for (const deck of state.decks)
    if (deck.banlistId === id) delete deck.banlistId;
}
