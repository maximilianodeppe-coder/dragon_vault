import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('health público: base disponible, fallo genérico y API privada protegida', async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  for (const available of [true, false]) {
    const port = available ? 3118 : 3119;
    const base = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, ['.output/server/index.mjs'], {
      env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port),
        APP_ORIGIN: base, DATABASE_URL: available ? process.env.DATABASE_URL : 'postgresql://health:invalid@127.0.0.1:1/health_test' },
      stdio: 'ignore', windowsHide: true,
    });
    try {
      let response;
      for (let i = 0; i < 80; i++) {
        try { response = await fetch(base + '/api/health', { signal: AbortSignal.timeout(8000) }); break; }
        catch { await delay(100); }
      }
      assert.ok(response, 'El servidor de prueba debe iniciar.');
      assert.equal(response.status, available ? 200 : 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { status: available ? 'ok' : 'unavailable' });
      assert.equal((await fetch(base + '/api/auth/session')).status, 401);
      assert.equal((await fetch(base + '/api/health/private')).status, 401);
      assert.equal((await fetch(base + '/api/health', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    } finally {
      if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    }
  }
});
