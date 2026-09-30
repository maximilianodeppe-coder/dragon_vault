import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { database, schema } from '../../server/lib/database.mjs';
import { hashPassword } from '../../server/lib/auth.mjs';
import { createProgress, clone } from '../../app/utils/progress.js';
import { addCopies, lotKey } from '../../app/utils/inventory.js';
import { personalState, worldState } from '../../server/lib/vault.mjs';

test('administración de colecciones: permisos, aislamiento, revisiones y mazos', async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  const base = process.env.APP_ORIGIN;
  assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):/);
  const db = database(); await db.query(schema);
  const suffix = randomUUID().slice(0, 8), pass = 'Prueba-colecciones-2026';
  const admin = { id: randomUUID(), username: `admin-${suffix}` }, player = { id: randomUUID(), username: `player-${suffix}` };
  const { rows: [oldWorld] } = await db.query('SELECT * FROM vault_world WHERE id=1');
  async function call(path, body, cookie, method = body ? 'POST' : 'GET') {
    const r = await fetch(base + path, { method, headers: { Origin: base, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] };
  }
  const url = '/api/admin/collection', read = () => call(`${url}?id=${player.id}`, null, admin.cookie);
  try {
    const hash = await hashPassword(pass);
    for (const [u, role] of [[admin, 'admin'], [player, 'player']]) {
      await db.query('INSERT INTO vault_users(id,username,password_hash,role) VALUES($1,$2,$3,$4)', [u.id, u.username, hash, role]);
      const login = await call('/api/auth/login', { username: u.username, password: pass });
      assert.equal(login.status, 200); u.cookie = login.cookie;
    }
    const state = createProgress(); state.formats.push({ id: 'other', name: 'Otro formato', limits: {} });
    const edition = { source: 'shop', sourceName: 'Tienda', rarity: 'Rare', formatId: 'official' };
    addCopies(state, '89631139', 3, edition);
    addCopies(state, '89631139', 2, { ...edition, formatId: 'other' });
    state.decks = [{ id: 'one', name: 'Oficial', cards: { '89631139': 3 }, formatId: 'official' }, { id: 'two', name: 'Otro', cards: { '89631139': 2 }, formatId: 'other' }];
    await db.query('INSERT INTO vault_world(id,state) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET state=$1, revision=vault_world.revision+1', [worldState(state)]);
    await db.query('INSERT INTO vault_progress(user_id,state) VALUES($1,$2)', [player.id, { ...personalState(state), undo: clone(personalState(state)) }]);
    const own = await call('/api/vault', null, admin.cookie);
    assert.equal((await call(`${url}?id=${player.id}`)).status, 401);
    assert.equal((await call(`${url}?id=${admin.id}`, null, player.cookie)).status, 403);
    const grant = { id: player.id, type: 'collectionGrant', cardId: '89631139', rarity: 'Ultra Rare', formatId: 'official', quantity: 2 };
    assert.equal((await call(url, grant, player.cookie)).status, 403);
    for (const type of ['collectionGrant', 'collectionSet', 'collectionClear']) assert.equal((await call('/api/vault/action', { ...grant, type }, player.cookie)).status, 403);
    assert.equal((await call(`${url}?id=invalid`, null, admin.cookie)).status, 400);
    assert.equal((await call(`${url}?id=${randomUUID()}`, null, admin.cookie)).status, 404);
    let current = (await read()).data;
    assert.equal(current.progress.owned['89631139'], 5);
    assert.equal((await call(url, { ...grant, quantity: -1, revision: current.revision }, admin.cookie)).status, 400);
    assert.equal((await call(url, { ...grant, rarity: ['Rare'], revision: current.revision }, admin.cookie)).status, 400);
    assert.equal((await call(url, { ...grant, formatId: 'missing', revision: current.revision }, admin.cookie)).status, 400);
    assert.equal((await call(url, { ...grant, cardId: 'missing', revision: current.revision }, admin.cookie)).status, 400);
    const concurrent = await Promise.all([1, 2].map(() => call(url, { ...grant, revision: current.revision }, admin.cookie)));
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
    current = (await read()).data;
    assert.equal(current.progress.owned['89631139'], 7);
    assert.equal(current.canUndo, false);
    const adminLot = current.progress.inventory['89631139'].find(l => l.source === 'admin');
    assert.equal(adminLot.quantity, 2); assert.equal(adminLot.rarity, 'Ultra Rare');
    assert.deepEqual(current.progress.economy, state.economy);
    // Remove the delivered lot, then reduce only the Official shop lot.
    for (const [lot, quantity] of [[adminLot, 0], [edition, 1]]) {
      const result = await call(url, { id: player.id, type: 'collectionSet', cardId: '89631139', lot: lotKey(lot), quantity, revision: current.revision }, admin.cookie);
      assert.equal(result.status, 200, JSON.stringify(result.data)); current = result.data;
    }
    assert.equal(current.progress.owned['89631139'], 3);
    assert.equal(current.progress.decks[0].cards['89631139'], 1);
    assert.equal(current.progress.decks[1].cards['89631139'], 2);
    assert.equal(current.progress.inventory['89631139'][0].source, 'shop');
    assert.equal(current.progress.coins, state.coins);
    assert.deepEqual((await call('/api/vault', null, admin.cookie)).data.progress, own.data.progress);
    assert.equal((await call(url, { id: player.id, type: 'collectionClear', revision: current.revision, confirmUsername: 'incorrecto' }, admin.cookie)).status, 400);
    // No active player session is needed, including a blocked account.
    await db.query('UPDATE vault_users SET blocked=true WHERE id=$1', [player.id]);
    const cleared = await call(url, { id: player.id, type: 'collectionClear', revision: current.revision, confirmUsername: player.username }, admin.cookie);
    assert.equal(cleared.status, 200, JSON.stringify(cleared.data));
    assert.deepEqual(cleared.data.progress.owned, {}); assert.deepEqual(cleared.data.progress.inventory, {});
    assert.ok(cleared.data.progress.decks.every(d => Object.keys(d.cards).length === 0));
    assert.equal(cleared.data.progress.decks.length, 2); assert.equal(cleared.data.progress.coins, state.coins);
    assert.deepEqual(cleared.data.progress.formats, state.formats);
    assert.equal(cleared.data.canUndo, false);
  } finally {
    await db.query('DELETE FROM vault_users WHERE id=ANY($1::uuid[])', [[admin.id, player.id]]);
    if (oldWorld) await db.query('UPDATE vault_world SET state=$1,revision=$2 WHERE id=1', [oldWorld.state, oldWorld.revision]);
    else await db.query('DELETE FROM vault_world WHERE id=1');
    await db.end();
  }
});
