import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { database, schema } from '../../server/lib/database.mjs';
import { hashPassword, signSession } from '../../server/lib/auth.mjs';
import { createProgress } from '../../app/utils/progress.js';

const base = process.env.APP_ORIGIN;
test('RBAC y economía sobre PostgreSQL y HTTP reales', async t => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/, 'Usá una base aislada cuyo nombre termine en _test.');
  assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):/);
  const db = database(), suffix = randomUUID().slice(0,8), pass = 'Prueba-integracion-2026';
  const admin = { id:randomUUID(), username:`admin-${suffix}` }, player = { id:randomUUID(), username:`player-${suffix}` }, second = { id:randomUUID(), username:`second-${suffix}` };
  await db.query(schema);
  await db.query('DELETE FROM vault_login_limits');
  const hash = await hashPassword(pass);
  for (const [user, role] of [[admin,'admin'],[player,'player'],[second,'player']]) await db.query('INSERT INTO vault_users(id,username,password_hash,role) VALUES($1,$2,$3,$4)',[user.id,user.username,hash,role]);
  async function call(path, body, cookie, method = body ? 'POST' : 'GET', origin = base) {
    const response = await fetch(base+path, {method, headers:{'Content-Type':'application/json', Origin:origin, ...(cookie ? {Cookie:cookie} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
    const text = await response.text(); let data; try{data=JSON.parse(text)}catch{data=text}
    return {status:response.status,data,cookie:response.headers.get('set-cookie')};
  }
  const signin = async user => {const result=await call('/api/auth/login',{username:user.username,password:pass}); assert.equal(result.status,200,JSON.stringify(result.data)); return result.cookie.split(';')[0];};
  try {
    await t.test('sin cuenta no se accede a datos ni al catálogo estático',async()=>{
      assert.equal((await call('/api/vault')).status,401);
      assert.equal((await call('/api/catalog/cards')).status,401);
      assert.equal((await call('/api/admin/users')).status,401);
      assert.equal((await call('/catalog/cards.json')).status,404);
    });
    admin.cookie=await signin(admin); player.cookie=await signin(player); second.cookie=await signin(second);
    await t.test('cookie HttpOnly, una semana, dispositivos simultáneos y logout aislado',async()=>{
      const result = await call('/api/auth/login',{username:player.username.toUpperCase(),password:pass});
      assert.equal(result.status,200); assert.match(result.cookie,/HttpOnly/i); assert.match(result.cookie,/SameSite=Strict/i); assert.match(result.cookie,/Max-Age=604800/i);
      assert.equal((await call('/api/auth/logout',{},result.cookie.split(';')[0])).status,200);
      assert.equal((await call('/api/auth/session',null,result.cookie.split(';')[0])).status,401);
      assert.equal((await call('/api/auth/session',null,player.cookie)).status,200);
      const forged = await signSession(player.id,randomUUID());
      assert.equal((await call('/api/auth/session',null,`dragon_vault_session=${forged}`)).status,401);
    });
    await t.test('RBAC en cada endpoint y protección de origen',async()=>{
      for(const [path,body,method] of [['/api/admin/users',null,'GET'],['/api/admin/users',{username:'intruder',password:pass,role:'admin'},'POST'],['/api/admin/users',{id:player.id,role:'admin',blocked:false},'PATCH'],['/api/admin/coins',{id:player.id,amount:1000},'POST']]) assert.equal((await call(path,body,player.cookie,method)).status,403);
      for(const type of ['adminCommit','import','credit']) assert.equal((await call('/api/vault/action',{type,progress:createProgress(),amount:100},player.cookie)).status,403);
      assert.equal((await call('/api/vault/action',{type:'open',id:'LOB'},player.cookie,'POST','https://evil.example')).status,403);
      assert.equal((await call('/api/admin/users',{username:'intruder',password:pass,role:'admin'},null)).status,401);
    });
    await t.test('importación conserva progreso y ediciones viejas reciben conflicto',async()=>{
      const previous = await call('/api/vault',null,admin.cookie); assert.equal(previous.status,200,JSON.stringify(previous.data));
      const state=createProgress(); state.coins=2345; state.economy.offers=[{id:state.economy.offers[0].id,stock:1,price:20}];
      const imported=await call('/api/vault/action',{type:'import',revision:previous.data.revision,progress:state},admin.cookie);
      assert.equal(imported.status,200,JSON.stringify(imported.data)); assert.equal(imported.data.progress.coins,2345);
      assert.equal((await call('/api/vault/action',{type:'adminCommit',revision:previous.data.revision,progress:state},admin.cookie)).status,409);
    });
    await t.test('dos compradores de la última copia: uno gana, otro no pierde monedas',async()=>{
      const before=await call('/api/vault',null,player.cookie), id=before.data.progress.economy.offers[0].id;
      const results=await Promise.all([player,second].map(user=>call('/api/vault/action',{type:'buy',id,price:0,userId:admin.id},user.cookie)));
      assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
      const states=await Promise.all([player,second].map(user=>call('/api/vault',null,user.cookie)));
      assert.equal(states.reduce((sum,r)=>sum+r.data.progress.coins,0),1980);
      assert.equal(states.reduce((sum,r)=>sum+(r.data.progress.owned[id]||0),0),1);
      assert.equal(states[0].data.progress.economy.offers[0].stock,0);
      assert.equal((await call('/api/vault',null,admin.cookie)).data.progress.coins,2345);
    });
    await t.test('mazos privados, cartas y aperturas se validan en servidor',async()=>{
      const made=await call('/api/vault/action',{type:'deckCreate',formatId:'official',ruleset:'standard'},player.cookie);
      assert.equal(made.status,200);const id=made.data.result;
      assert.equal((await call('/api/vault/action',{type:'deckUpdate',id,field:'name',value:'Ajeno'},second.cookie)).status,404);
      assert.equal((await call('/api/vault/action',{type:'deckChange',id,cardId:'89631139',delta:100},player.cookie)).status,400);
      const opened=await call('/api/vault/action',{type:'open',id:'LOB'},player.cookie);
      assert.equal(opened.status,200);assert.equal(opened.data.result.length,5);
      const after=await call('/api/vault',null,player.cookie); assert.equal(after.data.progress.packs,1);
      assert.equal((await call('/api/vault',null,second.cookie)).data.progress.packs,0);
    });
    await t.test('administrador crea, cambia rol, bloquea y recarga cuentas',async()=>{
      const created=await call('/api/admin/users',{username:`created-${suffix}`,password:pass,role:'player'},admin.cookie);assert.equal(created.status,201,JSON.stringify(created.data));
      const id=created.data.id;
      assert.equal((await call('/api/admin/users',{username:`created-${suffix}`,password:pass,role:'player'},admin.cookie)).status,409);
      assert.equal((await call('/api/admin/coins',{id,amount:75},admin.cookie)).data.progress.coins,1075);
      assert.equal((await call('/api/admin/users',{id,role:'admin',blocked:false},admin.cookie,'PATCH')).status,200);
      const contenderCookie = await signin({username:`created-${suffix}`});
      const race = await Promise.all([
        call('/api/admin/users',{id,role:'player',blocked:false},admin.cookie,'PATCH'),
        call('/api/admin/users',{id:admin.id,role:'player',blocked:false},contenderCookie,'PATCH'),
      ]);
      assert.equal(race.filter(r=>r.status===200).length,1);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM vault_users WHERE role='admin' AND NOT blocked")).rows[0].n,1);
      await db.query("UPDATE vault_users SET role='admin' WHERE id=$1",[admin.id]);
      assert.equal((await call('/api/admin/users',{id,role:'player',blocked:true},admin.cookie,'PATCH')).status,200);
      assert.equal((await call('/api/auth/login',{username:`created-${suffix}`,password:pass})).status,401);
      assert.equal((await call('/api/admin/users',{id:admin.id,role:'player',blocked:false},admin.cookie,'PATCH')).status,400);
      await db.query('DELETE FROM vault_users WHERE id=$1',[id]);
    });
    await t.test('intentos reiterados limitados sin enumerar usuarios',async()=>{
      let result;for(let i=0;i<11;i++) result=await call('/api/auth/login',{username:`missing-${suffix}`,password:pass});
      assert.equal(result.status,429);
    });
  } finally { await db.query('DELETE FROM vault_users WHERE id = ANY($1::uuid[])',[[admin.id,player.id,second.id]]); await db.end(); }
});
