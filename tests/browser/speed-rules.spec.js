import { test, expect } from '@playwright/test';
import { createProgress } from '../../app/utils/progress.js';
import { addCopies } from '../../app/utils/inventory.js';
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('dragon-vault-boxes-v4')));
async function seed(page, state, route) {
  await page.goto(route);
  await page.evaluate(s => localStorage.setItem('dragon-vault-boxes-v4', JSON.stringify(s)), state);
  await page.reload();
}
async function captures(page, name) {
  for (const [size, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.impeccable/review/${name}-${size}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
}
test('publicar lote de más de 60 cartas y comprarlo sin crear mazo', async ({ page }) => {
  const s = createProgress();
  s.economy.customPacks.push({ id: 'custom-large', name: 'Lote grande', kind: 'starter', status: 'draft', cost: 10, size: 1,
    entries: [{ id: '36996508', copies: 65, remaining: 65, rarity: 'Rare' }] });
  await seed(page, s, '/especiales');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Copias de Mago Oscuro', { exact: true }).fill('70');
  await page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click();
  expect((await saved(page)).economy.customPacks[0].entries[0].copies).toBe(70);
  await page.goto('/formatos');
  await page.locator('.starter-product').filter({ hasText: 'Lote grande' }).getByRole('button', { name: 'Comprar mazo · 10 monedas' }).click();
  await expect(page.getByLabel('Guardarlo también en Mis mazos, listo para editar')).toHaveCount(0);
  await expect(page.locator('dialog[open]')).toContainText('Solo se agregará a tu colección');
  await captures(page, 'large-product-purchase');
  await page.getByRole('button', { name: 'Comprar · 10 monedas', exact: true }).click();
  const next = await saved(page);
  expect(next.owned['36996508']).toBe(70);
  expect(next.decks).toHaveLength(0);
  expect(next.coins).toBe(990);
});
test('crear Speed Duel y banlist compartida, sumar cartas distintas y liberar cupos', async ({ page }) => {
  const s = createProgress();
  const ids = ['36996508', '89631139'];
  for (const id of ids) addCopies(s, id, 3, { source: 'shop', sourceName: 'Tienda', rarity: 'Common' });
  await seed(page, s, '/banlists');
  await page.getByRole('button', { name: 'Banlists adicionales', exact: true }).click();
  await page.getByRole('button', { name: 'Crear banlist', exact: true }).click();
  await page.getByLabel('Nombre de la nueva lista', { exact: true }).fill('Speed compartida');
  await page.getByRole('combobox', { name: 'Estilo de la nueva banlist', exact: true }).selectOption('shared');
  await page.getByRole('button', { name: 'Guardar nueva banlist', exact: true }).click();
  for (const id of ids) {
    await page.getByLabel('Buscar cartas para la lista').fill(id);
    await page.getByRole('button', { name: 'Limitada 3', exact: true }).click();
  }
  await page.getByLabel('Buscar cartas para la lista').fill('');
  await captures(page, 'speed-banlist');
  const listId = (await saved(page)).banlists[0].id;
  await page.goto('/mazos');
  await page.getByRole('combobox', { name: 'Reglas del nuevo mazo', exact: true }).selectOption('speed');
  await page.getByRole('button', { name: '＋ Crear un mazo', exact: true }).click();
  await page.getByLabel('Banlist de este mazo').selectOption(listId);
  await expect(page.locator('#deckBuildStatus')).toContainText('llegar a 20');
  await expect(page.locator('.deck-dropzone[aria-label="Mazo extra"]')).toContainText('0 / 6');
  const dark = page.getByRole('button', { name: 'Agregar Mago Oscuro', exact: true });
  const blue = page.getByRole('button', { name: 'Agregar Dragón Blanco de Ojos Azules', exact: true });
  await dark.click(); await dark.click(); await blue.click();
  await expect(dark).toBeDisabled(); await expect(blue).toBeDisabled();
  await expect(page.locator('.deck-group-counts')).toContainText('Limitada 3: 3 / 3');
  await expect(page.locator('.deck-group-counts')).not.toHaveClass(/banlist-warning/);
  await captures(page, 'speed-deck');
  await page.getByRole('button', { name: 'Quitar Mago Oscuro', exact: true }).first().click();
  await expect(blue).toBeEnabled();
  await blue.click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Reglas de construcción', exact: true })).toHaveValue('speed');
  await expect(blue).toBeDisabled();
  await page.goto('/banlists');
  await page.getByRole('button', { name: 'Banlists adicionales', exact: true }).click();
  await page.getByLabel('Buscar cartas para la lista').fill(ids[1]);
  await page.getByRole('button', { name: 'Libre', exact: true }).click();
  expect((await saved(page)).banlists[0].limits[ids[1]]).toBeUndefined();
  await page.goto('/mazos');
  await expect(blue).toBeEnabled();
  expect((await saved(page)).decks[0].cards).toEqual({ [ids[0]]: 1, [ids[1]]: 2 });
});
