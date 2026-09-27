import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, validate, clone } from '../app/utils/progress.js';
import { cards, starterProducts, gameCards, isExtraDeck } from '../app/utils/catalog.js';
import { fillCommons, saveExpansion } from '../app/utils/expansions.js';
import { allowCards } from '../app/utils/formats.js';
import { addCopies } from '../app/utils/inventory.js';
import { changeDeck, openBox, grantStarter } from '../app/utils/actions.js';
import { groupCounts, groupAllowance, restrictionStyle } from '../app/utils/banlists.js';

test('una bóveda nueva no activa productos ni cartas; rechaza compras antiguas sin cambiar el saldo', () => {
  const state = createProgress(), before = clone(state);
  assert.deepEqual(state.boxes, {});
  assert.deepEqual(starterProducts(state), []);
  assert.deepEqual(gameCards(state), []);
  assert.deepEqual(state.formats[0].limits, {});
  for (const id of ['LOB', 'MRD', 'SRL']) assert.throws(() => openBox(state, id), /retiradas/);
  for (const id of ['SDY', 'SDK']) assert.throws(() => grantStarter(state, id, true, 'deck'));
  assert.deepEqual(state, before);
  assert.deepEqual(validate(clone(state)), state);
});

test('autorrelleno completa el total exacto, preserva rarezas y copias, y no modifica entradas ante errores', () => {
  const entries = ['Common', 'Common', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare'].map((rarity, i) => ({
    id: String(cards[i].id), rarity, copies: [4, 1, 3, 2, 1, 1][i], remaining: [4, 1, 3, 2, 1, 1][i],
  }));
  const before = clone(entries), filled = fillCommons(entries, 5, 20);
  assert.equal(filled.reduce((n, e) => n + e.copies, 0), 100);
  assert.deepEqual(filled.slice(2), entries.slice(2));
  assert.ok(filled.every((e, i) => e.copies >= entries[i].copies));
  assert.deepEqual(fillCommons(filled, 5, 20), filled);
  assert.throws(() => fillCommons(entries, 5, 1), /superan/);
  assert.throws(() => fillCommons(entries.slice(2), 5, 20), /comunes/);
  assert.throws(() => fillCommons(entries, 5, 1000), /comunes/);
  assert.throws(() => fillCommons(entries, 5, 1.5), /válidos/);
  assert.deepEqual(entries, before);
  const state = createProgress();
  const pack = { id: 'custom-box', name: 'Caja', size: 5, boxPacks: 20, cost: 5, status: 'published', entries: filled.map(e => ({ ...e, remaining: e.copies })) };
  saveExpansion(state, pack);
  assert.deepEqual(validate(clone(state)), state);
  const bad = clone(state); bad.economy.customPacks[0].boxPacks = 21;
  assert.throws(() => validate(bad), /exactamente/);
  bad.economy.customPacks[0].status = 'draft';
  validate(bad); // An incomplete draft can be resumed before publication.
});

test('banlist mixta: normales independientes, grupos compartidos Main/Extra y prohibidas de ambos estilos', () => {
  const s = createProgress();
  const ids = [...cards.filter(c => !isExtraDeck(c)).slice(0, 4), cards.find(isExtraDeck)].map(c => String(c.id));
  allowCards(s, 'official', ids);
  for (const id of ids) addCopies(s, id, 3, { source: 'test', sourceName: 'Prueba', rarity: 'Common' });
  const [a,b,c,d,e] = ids;
  s.banlists = [{ id: 'mixed', name: 'Mixta', style: 'mixed', limits: { [a]: 2, [b]: 2, [c]: 0, [d]: 0, [e]: 2 }, cardStyles: { [b]: 'shared', [d]: 'shared', [e]: 'shared' } }];
  const deck = { id: 'deck', name: 'Mazo', cards: {}, banlistId: 'mixed' }; s.decks.push(deck);
  changeDeck(s, deck.id, a, 2);
  changeDeck(s, deck.id, b, 1); changeDeck(s, deck.id, e, 1);
  assert.equal(groupCounts(s, deck).find(g => g.limit === 2).copies, 2);
  assert.equal(groupAllowance(s, deck, a), 3);
  assert.throws(() => changeDeck(s, deck.id, e, 1), /cupo compartido/);
  assert.throws(() => changeDeck(s, deck.id, a, 1), /hasta 2/);
  assert.throws(() => changeDeck(s, deck.id, c, 1)); assert.throws(() => changeDeck(s, deck.id, d, 1));
  changeDeck(s, deck.id, b, -1); changeDeck(s, deck.id, e, 1);
  assert.equal(restrictionStyle(s.banlists[0], a), 'individual');
  assert.deepEqual(validate(clone(s)), s);
  const bad = clone(s); bad.banlists[0].cardStyles[a] = 'invented';
  assert.throws(() => validate(bad), /restricción/);
});
