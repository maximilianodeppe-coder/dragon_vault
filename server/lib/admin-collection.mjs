import { byId, isDeckCard, names } from '../../app/utils/catalog.js';
import { addCopies, lotKey } from '../../app/utils/inventory.js';
import { formatOf, ownedInFormat } from '../../app/utils/formats.js';
import { fail, requireAdmin } from './auth.mjs';

export const collectionActions = ['collectionGrant', 'collectionSet', 'collectionClear'];

export function editCollection(state, body, user) {
  requireAdmin(user);
  if (body.type === 'collectionClear') {
    state.owned = {}; state.inventory = {};
    for (const deck of state.decks) deck.cards = {};
  } else {
    const id = body.cardId;
    if (typeof id !== 'string' || !byId.has(id)) fail(400, 'Elegí una carta del catálogo.');
    if (body.type === 'collectionGrant') {
      if (!isDeckCard(byId.get(id)) || typeof body.rarity !== 'string' || !Object.hasOwn(names, body.rarity) || !state.formats.some(f => f.id === body.formatId) ||
          !Number.isSafeInteger(body.quantity) || body.quantity < 1 || body.quantity > 1000)
        fail(400, 'Elegí formato, rareza y entre 1 y 1.000 copias.');
      if ((state.owned[id] || 0) + body.quantity > 1e7) fail(400, 'La carta supera el máximo de copias.');
      addCopies(state, id, body.quantity, { source: 'admin', sourceName: 'Entrega administrativa', rarity: body.rarity, formatId: body.formatId });
    } else {
      const lots = state.inventory[id] || [], lot = lots.find(l => lotKey(l) === body.lot);
      if (!lot) fail(404, 'Estas copias ya no están en la colección. Actualizá la vista.');
      if (!Number.isSafeInteger(body.quantity) || body.quantity < 0 || body.quantity > 1e7 || state.owned[id] - lot.quantity + body.quantity > 1e7)
        fail(400, 'Cantidad de copias no válida.');
      state.owned[id] += body.quantity - lot.quantity;
      lot.quantity = body.quantity;
      state.inventory[id] = lots.filter(l => l.quantity > 0);
      if (!state.owned[id]) { delete state.owned[id]; delete state.inventory[id]; }
      for (const deck of state.decks) {
        const available = ownedInFormat(state, id, formatOf(deck));
        if ((deck.cards[id] || 0) > available) {
          if (available) deck.cards[id] = available;
          else delete deck.cards[id];
        }
      }
    }
  }
  // An old undo must not resurrect copies removed by an administrator.
  delete state.undo;
}
