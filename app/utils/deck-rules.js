import { byId, isDeckCard, isExtraDeck, cardFamily } from './catalog.js';

export const deckRules = (deck) => deck?.ruleset === 'speed'
  ? { min: 20, main: 30, extra: 6 }
  : { min: 40, main: 60, extra: 15 };

// A fixed-content product is not necessarily a playable deck.
export function canSaveStarter(starter) {
  if (!starter) return false;
  let total = 0, extra = 0;
  const families = {};
  for (const entry of starter.entries) {
    const card = byId.get(String(entry.id));
    const n = entry.quantity ?? entry.copies;
    const family = cardFamily(entry.id);
    families[family] = (families[family] || 0) + n;
    if (families[family] > 3) return false;
    if (!isDeckCard(card) || n > 3) return false;
    total += n;
    if (isExtraDeck(card)) extra += n;
  }
  return total <= 60 && extra <= 15;
}
