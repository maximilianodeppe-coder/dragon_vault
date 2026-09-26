import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, validate, clone } from '../app/utils/progress.js';
import { cards, isDeckCard, isExtraDeck, starterProducts } from '../app/utils/catalog.js';
import { addCopies } from '../app/utils/inventory.js';
import { grantStarter, changeDeck } from '../app/utils/actions.js';
import { saveExpansion } from '../app/utils/expansions.js';
import { canSaveStarter, deckRules } from '../app/utils/deck-rules.js';
import { groupCounts, groupAllowance } from '../app/utils/banlists.js';

const main = cards.filter(c => isDeckCard(c) && !isExtraDeck(c)).slice(0, 22).map(c => String(c.id));
const extra = cards.filter(isExtraDeck).slice(0, 3).map(c => String(c.id));
function setup() {
  const s = createProgress();
  for (const id of [...main, ...extra]) addCopies(s, id, 3, { source: 'test', sourceName: 'Prueba', rarity: 'Common' });
  s.decks.push({ id: 'speed', name: 'Speed', ruleset: 'speed', cards: {} });
  return s;
}
test('productos fijos sin límite de mazo: entrega completa sin crear mazos grandes', () => {
  const s = createProgress();
  const pack = { id: 'custom-lot', name: 'Lote', kind: 'starter', status: 'published', cost: 10, size: 1,
    entries: main.map(id => ({ id, copies: 3, remaining: 3, rarity: 'Rare' })) };
  saveExpansion(s, pack); validate(s);
  assert.equal(canSaveStarter(starterProducts(s).find(p => p.id === pack.id)), false);
  grantStarter(s, pack.id, true, 'must-not-exist');
  assert.equal(s.decks.length, 0);
  assert.equal(Object.values(s.owned).reduce((a, b) => a + b, 0), 66);
  assert.equal(s.coins, 990);
  assert.deepEqual(validate(clone(s)), s);
  pack.entries = [{ id: main[0], copies: 100, remaining: 100, rarity: 'Rare' }];
  validate(s);
  grantStarter(s, pack.id, true, 'still-no-deck');
  assert.equal(s.owned[main[0]], 103);
  assert.equal(s.decks.length, 0);
});
test('Speed Duel aplica 30 Main y 6 Extra y conserva reglas en respaldos', () => {
  const s = setup();
  assert.equal(deckRules(s.decks[0]).min, 20);
  for (const id of main.slice(0, 10)) changeDeck(s, 'speed', id, 3);
  assert.throws(() => changeDeck(s, 'speed', main[10], 1), /límite/);
  for (const id of extra.slice(0, 2)) changeDeck(s, 'speed', id, 3);
  assert.throws(() => changeDeck(s, 'speed', extra[2], 1), /límite/);
  assert.deepEqual(validate(clone(s)), s);
  const bad = clone(s); bad.decks[0].cards[main[10]] = 1;
  assert.throws(() => validate(bad), /tamaño máximo/);
  const legacy = createProgress(); legacy.version = 6;
  assert.equal(validate(legacy).version, 7);
});
test('cupos compartidos suman copias distintas y Main/Extra; quitar libera cupo', () => {
  const s = setup();
  s.banlists.push({ id: 'shared', name: 'Speed', style: 'shared', limits: {
    [main[0]]: 3, [extra[0]]: 3, [main[1]]: 2, [main[2]]: 2, [main[3]]: 1, [main[4]]: 1 } });
  s.decks[0].banlistId = 'shared';
  changeDeck(s, 'speed', main[0], 2); changeDeck(s, 'speed', extra[0], 1);
  assert.throws(() => changeDeck(s, 'speed', extra[0], 1), /cupo compartido/);
  changeDeck(s, 'speed', main[1], 2);
  assert.throws(() => changeDeck(s, 'speed', main[2], 1), /cupo compartido/);
  changeDeck(s, 'speed', main[3], 1);
  assert.throws(() => changeDeck(s, 'speed', main[4], 1), /cupo compartido/);
  changeDeck(s, 'speed', main[0], -1);
  assert.equal(groupAllowance(s, s.decks[0], extra[0]), 1);
  changeDeck(s, 'speed', extra[0], 1);
  changeDeck(s, 'speed', main[5], 3); // Unlisted is unrestricted, not Limited 3.
  assert.deepEqual(groupCounts(s, s.decks[0]).map(g => g.copies), [1, 2, 3]);
  s.banlists[0].limits[main[5]] = 3;
  assert.equal(groupCounts(s, s.decks[0])[2].copies, 6);
  assert.deepEqual(validate(clone(s)), s); // Existing conflicts stay editable.
  s.banlists[0].style = 'invalid';
  assert.throws(() => validate(clone(s)), /Estilo/);
});
