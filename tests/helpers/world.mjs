import { createProgress } from '../../app/utils/progress.js';
import { cards, starters } from '../../app/utils/catalog.js';
import { allowCards } from '../../app/utils/formats.js';
import { saveExpansion } from '../../app/utils/expansions.js';

// Explicit fixtures: new worlds no longer publish cards or offers automatically.
export function stockedWorld() {
  const state = createProgress();
  allowCards(state, 'official', cards.map(c => String(c.id)));
  state.economy.offers = [{ id: String(cards.find(c => c.rarity === 'Common').id), stock: 3 }];
  return state;
}
export function publishStarter(state, id) {
  const starter = starters.find(s => s.id === id);
  const pack = { id: 'custom-' + id, name: starter.name, kind: 'starter', status: 'published', cost: 500, size: 1,
    entries: starter.entries.map(e => ({ id: String(e.id), copies: e.quantity, remaining: e.quantity, rarity: e.rarity || 'Common' })) };
  saveExpansion(state, pack);
  return pack.id;
}
