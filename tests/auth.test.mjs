import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { hashPassword, password, username, signSession, verifySession, WEEK } from '../server/lib/auth.mjs';
import { applyAction, mergeState, personalState, worldState } from '../server/lib/vault.mjs';
import { createProgress, clone, validate } from '../app/utils/progress.js';

test('bcrypt usa sal independiente, costo 12 y rechaza truncamientos de contraseña', async () => {
  const value = 'Prueba-segura-2026';
  const a = await hashPassword(value), b = await hashPassword(value);
  assert.notEqual(a, b); assert.equal(bcrypt.getRounds(a), 12);
  assert.equal(await bcrypt.compare(value, a), true);
  assert.equal(await bcrypt.compare('contraseña equivocada', a), false);
  assert.throws(() => password('x'.repeat(73)));
  assert.throws(() => password('😀'.repeat(19)));
  assert.throws(() => password('demasiadocorta\0'));
  assert.equal(username('Maxi.Admin'), 'maxi.admin');
  assert.throws(() => username('__proto__!'));
});
test('JWT firmado dura una semana y rechaza manipulación, vencimiento y otra audiencia', async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('base64url');
  const id = randomUUID(), sid = randomUUID(), token = await signSession(id, sid);
  const claims = await verifySession(token);
  assert.equal(claims.sub, id); assert.equal(claims.sid, sid); assert.equal(claims.exp - claims.iat, WEEK);
  const parts = token.split('.'); parts[1] = Buffer.from(JSON.stringify({ ...claims, sub: randomUUID(), role: 'admin' })).toString('base64url');
  await assert.rejects(verifySession(parts.join('.')));
  const key = new TextEncoder().encode(process.env.JWT_SECRET);
  const expired = await new SignJWT({ sid }).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('dragon-vault').setAudience('dragon-vault-web').setIssuedAt().setExpirationTime('0s').sign(key);
  await assert.rejects(verifySession(expired));
  const foreign = await new SignJWT({sid}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuer('dragon-vault').setAudience('another-app').setIssuedAt().setExpirationTime('7d').sign(key);
  await assert.rejects(verifySession(foreign));
});
test('jugadores no pueden importar, editar el mundo ni acreditar monedas; precios se calculan en servidor', () => {
  const state = createProgress(), player = { role: 'player' };
  for (const type of ['adminCommit', 'import', 'credit']) assert.throws(() => applyAction(state, {type, progress: clone(state), amount: 1000, role: 'admin'}, player), e => e.statusCode === 403);
  assert.throws(() => applyAction(state, {type:'eval', code:'state.coins=9999'}, player));
  const offer = state.economy.offers[0];
  applyAction(state, { type:'buy', id:offer.id, price:0, coins:1e9, userId:randomUUID() }, player);
  assert.equal(state.coins, 995); assert.equal(offer.stock,2); assert.equal(state.owned[offer.id],1);
  assert.throws(() => applyAction(state, {type:'deckChange', delta:5000}, player));
  validate(state);
});
test('el stock es compartido, los saldos son personales y deshacer usa copias guardadas en servidor', () => {
  const a = createProgress(), b = createProgress(), user = {role:'player'};
  const offer = a.economy.offers[0]; applyAction(a, {type:'buy', id:offer.id},user);
  const joined = mergeState(personalState(b),worldState(a));
  assert.equal(joined.coins,1000); assert.equal(joined.economy.offers[0].stock,2); assert.deepEqual(joined.owned,{});
  applyAction(a,{type:'clear'},user); assert.deepEqual(a.owned,{});
  applyAction(a,{type:'undoClear', progress:{owned:{fake:1000}}},user);
  assert.equal(a.owned[offer.id],1);
  assert.throws(()=>applyAction(a,{type:'undoClear'},user)); validate(a);
});
