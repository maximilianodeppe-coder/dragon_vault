import { randomUUID } from 'node:crypto';
import { createProgress, validate, clone } from '../../app/utils/progress.js';
import { allCards, SETS } from '../../app/utils/catalog.js';
import { openBox, Economy, random, grantStarter, changeDeck } from '../../app/utils/actions.js';
import { addCopies } from '../../app/utils/inventory.js';
import { transaction } from './database.mjs';
import { fail, requireAdmin } from './auth.mjs';

const sharedKeys = ['formats', 'banlists', 'odds', 'boxes', 'economy'];
const personalKeys = ['version', 'coins', 'owned', 'inventory', 'packs', 'decks', 'selectedSet'];
const pick = (state, keys) => Object.fromEntries(keys.map(key => [key, state[key]]));
export const worldState = state => pick(state, sharedKeys);
export const personalState = state => pick(state, personalKeys);
export function mergeState(personal, shared) {
  const state = { ...clone(personal), ...clone(shared) };
  // Deleted lists do not strand other players' decks.
  for (const deck of state.decks) if (deck.banlistId && !state.banlists.some(b => b.id === deck.banlistId)) delete deck.banlistId;
  return state;
}
export function applyAction(state, body, user) {
  if (!body || typeof body.type !== 'string') fail(400, 'Acción no válida.');
  switch (body.type) {
    case 'credit':
      requireAdmin(user);
      if (!Number.isSafeInteger(body.amount) || body.amount < 1 || body.amount > 1000000) fail(400, 'Cantidad no válida.');
      state.coins += body.amount;
      return;
    case 'open':
      if (!SETS.some(s => s.id === body.id)) fail(400, 'Caja no válida.');
      return openBox(state, body.id);
    case 'openCustom': return Economy.draw(state, allCards, body.id, random);
    case 'buy': return Economy.buy(state, allCards, body.id);
    case 'starter': {
      if (typeof body.createDeck !== 'boolean') fail(400, 'Selección no válida.');
      const id = randomUUID();
      grantStarter(state, body.id, body.createDeck, id);
      return id;
    }
    case 'sell':
      if (!Array.isArray(body.items) || body.items.length > 50000) fail(400, 'Venta no válida.');
      return Economy.sell(state, allCards, body.items);
    case 'deckCreate': {
      if (state.decks.length >= 200 || !state.formats.some(f => f.id === body.formatId)) fail(400, 'No se puede crear el mazo en ese formato.');
      if (!['standard', 'speed'].includes(body.ruleset)) fail(400, 'Reglas no válidas.');
      const id = randomUUID();
      state.decks.push({ id, name: 'Mi mazo ' + (state.decks.length + 1), formatId: body.formatId, ruleset: body.ruleset, cards: {} });
      return id;
    }
    case 'deckChange':
      if (![1, -1].includes(body.delta) || typeof body.cardId !== 'string') fail(400, 'Cambio de carta no válido.');
      return changeDeck(state, body.id, body.cardId, body.delta);
    case 'deckUpdate': {
      const deck = state.decks.find(d => d.id === body.id);
      if (!deck) fail(404, 'Mazo no encontrado.');
      if (!['name', 'banlistId', 'ruleset'].includes(body.field) || typeof body.value !== 'string') fail(400, 'Cambio de mazo no válido.');
      if (body.field === 'name' && (!body.value.trim() || body.value.length > 60)) fail(400, 'Usá un nombre de hasta 60 caracteres.');
      deck[body.field] = body.value;
      return;
    }
    case 'deckDelete': state.decks = state.decks.filter(d => d.id !== body.id); return;
    case 'clear': {
      const previous = clone({ owned: state.owned, inventory: state.inventory, decks: state.decks });
      state.owned = {}; state.inventory = {}; state.decks.forEach(d => { d.cards = {}; });
      state.undo = previous;
      return true;
    }
    case 'undoClear': {
      if (!state.undo) fail(400, 'No hay una eliminación para deshacer.');
      for (const [id, lots] of Object.entries(state.undo.inventory))
        for (const lot of lots) addCopies(state, id, lot.quantity, lot);
      for (const old of state.undo.decks) {
        const deck = state.decks.find(d => d.id === old.id);
        if (deck && !Object.keys(deck.cards).length) deck.cards = old.cards;
      }
      delete state.undo;
      return;
    }
    case 'adminCommit':
    case 'import': {
      requireAdmin(user);
      const next = validate(clone(body.progress));
      // A format may be referenced by another user's inventory. Keep stable IDs.
      if (body.type === 'adminCommit' && state.formats.some(f => !next.formats.some(n => n.id === f.id))) fail(400, 'No se pueden eliminar formatos con progreso compartido.');
      for (const key of [...personalKeys, ...sharedKeys]) state[key] = next[key];
      delete state.undo;
      return;
    }
    default: fail(400, 'Acción no permitida.');
  }
}

export async function vaultTransaction(user, body) {
  return transaction(async db => {
    // ponytail: one world row serializes stock mutations; split product rows if contention grows.
    await db.query('INSERT INTO vault_world(id, state) VALUES (1, $1) ON CONFLICT DO NOTHING', [worldState(createProgress())]);
    const { rows: [world] } = await db.query('SELECT state, revision FROM vault_world WHERE id = 1 FOR UPDATE');
    await db.query('INSERT INTO vault_progress(user_id, state) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, personalState(createProgress())]);
    const { rows: [personal] } = await db.query('SELECT state, revision FROM vault_progress WHERE user_id = $1 FOR UPDATE', [user.id]);
    const state = mergeState(personal.state, world.state);
    const revision = `${world.revision}:${personal.revision}`;
    let result;
    if (body) {
      if (body.type === 'adminCommit' || body.type === 'import') {
        requireAdmin(user);
        if (body.revision !== revision) fail(409, 'El estado cambió en otra sesión. Se actualizó la vista; revisá y repetí la operación.');
      }
      result = applyAction(state, body, user);
      validate(state);
      const shared = worldState(state);
      if (body.type === 'import') {
        // Import can replace shared rules only when all existing players remain valid.
        const { rows } = await db.query('SELECT user_id, state FROM vault_progress WHERE user_id <> $1', [user.id]);
        for (const row of rows) {
          try { validate(mergeState(row.state, shared)); }
          catch { fail(409, 'Esta copia quitaría formatos usados por otro jugador. Conservá esos formatos antes de importar.'); }
        }
      }
      await db.query('UPDATE vault_world SET state = $1, revision = revision + 1 WHERE id = 1', [shared]);
      await db.query('UPDATE vault_progress SET state = $2, revision = revision + 1 WHERE user_id = $1', [user.id, { ...personalState(state), ...(state.undo ? { undo: state.undo } : {}) }]);
    }
    const canUndo = !!state.undo;
    delete state.undo;
    if (user.role !== 'admin') state.economy.customPacks = state.economy.customPacks.filter(p => p.status !== 'draft');
    return { progress: state, revision: body ? `${world.revision + 1}:${personal.revision + 1}` : revision, result, canUndo };
  });
}
