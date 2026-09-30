import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, clone, validate } from '../app/utils/progress.js';
import { worldState, personalState, mergeState, applyAction } from '../server/lib/vault.mjs';

test('cajas por cuenta: aperturas, reinicios, guardado y cambios de composición', () => {
  const initial = createProgress();
  initial.economy.customPacks.push({ id: 'custom-personal-box', name: 'Caja', status: 'published', cost: 5, size: 1, boxPacks: 100,
    entries: [{ id: '89631139', rarity: 'Rare', copies: 100, remaining: 40 }] });
  // The old shared stock is not assigned to any individual account.
  const oldWorld = clone(initial), empty = personalState(createProgress());
  const a = mergeState(empty, oldWorld), b = mergeState(empty, oldWorld);
  const stock = s => s.economy.customPacks[0].entries[0].remaining;
  assert.equal(stock(a), 100); assert.equal(stock(b), 100);
  const player = { role: 'player' };
  applyAction(a, { type: 'openCustom', id: 'custom-personal-box' }, player);
  assert.equal(stock(a), 99); assert.equal(stock(b), 100);
  const savedA = personalState(a), shared = worldState(a);
  assert.equal(stock(shared), 100);
  const reloaded = mergeState(savedA, shared);
  assert.equal(stock(reloaded), 99);
  applyAction(b, { type: 'openCustom', id: 'custom-personal-box' }, player);
  const coins = a.coins, owned = clone(a.owned);
  applyAction(a, { type: 'resetCustom', id: 'custom-personal-box' }, player);
  assert.equal(stock(a), 100); assert.equal(stock(b), 99);
  assert.equal(a.coins, coins); assert.deepEqual(a.owned, owned);
  assert.equal(stock(mergeState(personalState(a), shared)), 100);
  shared.economy.customPacks[0].cost = 9;
  assert.equal(stock(mergeState(savedA, shared)), 99);
  shared.economy.customPacks[0].entries[0].copies = 200;
  shared.economy.customPacks[0].boxPacks = 200;
  assert.equal(stock(mergeState(savedA, shared)), 200);
  validate(a); validate(b);
  assert.throws(() => applyAction(a, { type: 'resetCustom', id: 'missing' }, player));
  a.economy.customPacks[0].status = 'draft';
  assert.throws(() => applyAction(a, { type: 'resetCustom', id: 'custom-personal-box' }, player));
});
