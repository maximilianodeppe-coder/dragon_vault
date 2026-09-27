import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { database, schema } from '../../server/lib/database.mjs';
import { hashPassword } from '../../server/lib/auth.mjs';
import { createProgress } from '../../app/utils/progress.js';
import { cards } from '../../app/utils/catalog.js';
import { allowCards } from '../../app/utils/formats.js';
import { addCopies } from '../../app/utils/inventory.js';

const id = randomUUID(), username = 'boxes-' + id.slice(0,8), password = 'Prueba-cajas-mixtas-2026';
const selected = cards.filter(c => c.type === 'Normal Monster').slice(0, 4);
test.beforeAll(async () => {
  expect(new URL(process.env.DATABASE_URL).pathname).toMatch(/_test$/);
  await database().query(schema);
  await database().query('INSERT INTO vault_users(id,username,password_hash,role) VALUES($1,$2,$3,$4)', [id, username, await hashPassword(password), 'admin']);
  await mkdir('.impeccable/review/box-mixed', { recursive: true });
});
test.afterAll(async () => {
  await database().query('DELETE FROM vault_users WHERE id=$1', [id]);
  await database().end();
});
test('cajas configurables, banlist mixta e indicadores en escritorio y móvil', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/login');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/formatos$/);
  const state = createProgress();
  const ids = selected.map(c => String(c.id));
  allowCards(state, 'official', ids);
  for (const key of ids) addCopies(state, key, 3, { source: 'test', sourceName: 'Prueba visual', rarity: 'Common' });
  state.banlists = [{ id: 'mixed-visual', name: 'Prueba mixta', style: 'mixed', limits: { [ids[0]]: 1, [ids[1]]: 2, [ids[2]]: 0, [ids[3]]: 0 }, cardStyles: { [ids[1]]: 'shared', [ids[3]]: 'shared' } }];
  state.decks = [{ id: 'visual', name: 'Mazo de prueba', cards: { [ids[0]]: 1, [ids[1]]: 1 }, banlistId: 'mixed-visual' }];
  state.economy.customPacks = [{ id: 'custom-visual', name: 'Caja de prueba', status: 'draft', cost: 5, size: 5, boxPacks: 20,
    entries: ids.slice(0, 2).map((key, i) => ({ id: key, copies: i ? 3 : 2, remaining: i ? 3 : 2, rarity: i ? 'Rare' : 'Common' })) }];
  const imported = await page.evaluate(async progress => {
    const current = await (await fetch('/api/vault')).json();
    const response = await fetch('/api/vault/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'import', progress, revision: current.revision }) });
    return { status: response.status, body: await response.text() };
  }, state);
  expect(imported.status, imported.body).toBe(200);
  await page.goto('/formatos');
  await expect(page.getByRole('heading', { name: 'Este formato todavía no tiene productos' })).toBeVisible();
  await expect(page.locator('.expansion-portal')).toHaveCount(0);
  await page.goto('/especiales');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Sobres por caja', { exact: false })).toHaveValue('20');
  await page.getByRole('button', { name: 'Completar caja con comunes' }).click();
  await expect(page.getByLabel('Copias de ' + selected[0].name_es, { exact: true })).toHaveValue('97');
  await expect(page.getByLabel('Copias de ' + selected[1].name_es, { exact: true })).toHaveValue('3');
  await page.getByLabel('Reponer la caja al guardar').check();
  await page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click();
  await expect(page.locator('.catalog-status')).toContainText('Publicada');
  await capture(page, 'box');
  await page.goto('/banlists');
  await page.getByRole('button', { name: 'Banlists adicionales', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Estilo de banlist', exact: true })).toHaveValue('mixed');
  const row = page.locator('.banlist-row').filter({ hasText: selected[0].name_es });
  await row.getByLabel('Tipo de límite de ' + selected[0].name_es, { exact: true }).selectOption('shared');
  await expect(row.getByRole('button', { name: 'Limitada 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await row.getByLabel('Tipo de límite de ' + selected[0].name_es, { exact: true }).selectOption('individual');
  await expect(row.getByRole('button', { name: '1 copia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await capture(page, 'rules');
  await page.goto('/mazos');
  await expect(page.locator('.deck-restriction-badge.shared').first()).toBeVisible();
  await expect(page.locator('.deck-restriction-badge:not(.shared)').first()).toBeVisible();
  await capture(page, 'decks');
  expect(errors).toEqual([]);
});
async function capture(page, name) {
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    if (name === 'decks') expect(await page.locator('.deck-card:has(.deck-restriction-badge)').evaluateAll(cards => cards.every(card => {
      const a = card.querySelector('.deck-restriction-badge').getBoundingClientRect();
      const b = card.querySelector('.deck-card-badge').getBoundingClientRect();
      return a.top >= b.bottom || a.bottom <= b.top || a.left >= b.right || a.right <= b.left;
    }))).toBe(true);
    await page.screenshot({ path: `.impeccable/review/box-mixed/${name}-${device}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}
