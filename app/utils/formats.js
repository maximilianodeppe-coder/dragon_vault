import { cards, byId, gameCards, isDeckCard } from './catalog.js';

export const formatOf = (item) => item?.formatId ?? 'official';
export const formatName = (state, id) => state.formats?.find((f) => f.id === id)?.name || 'Oficial';
export const defaultFormats = () => [{ id: 'official', name: 'Oficial', limits: {} }];
export const formatLimit = (state, formatId, id) => state.formats?.find((f) => f.id === formatId)?.limits[id] ?? 0;
export function ownedInFormat(state, id, formatId) {
  return (state.inventory?.[id] || []).filter((l) => formatOf(l) === formatId).reduce((n, l) => n + l.quantity, 0);
}
export function formatOwned(state, formatId) {
  return Object.fromEntries(Object.keys(state.owned).map((id) => [id, ownedInFormat(state, id, formatId)]).filter(([, n]) => n));
}
export function allowCards(state, formatId, ids) {
  const format = state.formats.find((f) => f.id === formatId);
  if (!format) throw Error('El formato no existe.');
  for (const id of ids) {
    if (isDeckCard(byId.get(String(id))) && !Object.hasOwn(format.limits, id)) format.limits[id] = 3;
  }
}
export function validateFormats(state, legacy = false) {
  if (legacy) {
    state.formats = defaultFormats();
    allowCards(state, 'official', cards.map(c => String(c.id)));
    allowCards(state, 'official', gameCards(state).map((c) => String(c.id)));
  }
  if (!Array.isArray(state.formats) || !state.formats.length || state.formats.length > 100)
    throw Error('Los formatos no son válidos (máximo 100).');
  const ids = new Set();
  for (const f of state.formats) {
    if (!f || typeof f.id !== 'string' || !/^[\w-]{1,100}$/.test(f.id) || ids.has(f.id) ||
        typeof f.name !== 'string' || !f.name.trim() || f.name.length > 60 ||
        !f.limits || typeof f.limits !== 'object' || Array.isArray(f.limits)) throw Error('Formato o lista de permitidas no válida.');
    ids.add(f.id);
    for (const [id, n] of Object.entries(f.limits))
      if (!isDeckCard(byId.get(id)) || !Number.isInteger(n) || n < 0 || n > 3) throw Error('Las cartas permitidas admiten límites de 0 a 3.');
  }
  if (!ids.has('official')) throw Error('Falta el formato Oficial.');
  for (const item of [...state.decks, ...state.economy.customPacks, ...Object.values(state.inventory).flat()])
    if (!ids.has(formatOf(item))) throw Error('El formato asociado no existe.');
  for (const d of state.decks)
    for (const [id, n] of Object.entries(d.cards))
      if (n > ownedInFormat(state, id, formatOf(d))) throw Error('El mazo supera las copias obtenidas en su formato.');
  // Rule edits keep conflicting decks intact; inventory boundaries never do.
}
