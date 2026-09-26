import { test, expect } from "@playwright/test";

test("archivo oficial: buscar, preparar, publicar y separar de las creaciones", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/expansiones');
  await expect(page.getByRole('heading', { name: /ediciones$/ })).toBeVisible();
  await expect(page.locator('.official-set-row h3').first()).toHaveText('Summoned Skull Sample promotional card');
  await page.getByRole('combobox', { name: 'Formato', exact: true }).selectOption('Speed Duel');
  await expect(page.locator('.official-set-row h3').first()).toContainText('Speed Duel');
  await page.getByRole('combobox', { name: 'Formato', exact: true }).selectOption('TCG');
  await page.getByLabel('Buscar expansión', { exact: true }).fill('Dark Crisis');
  await page.getByRole('button', { name: 'Preparar Dark Crisis', exact: true }).click();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Dark Crisis');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.impeccable/review/tcg-editor-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.impeccable/review/tcg-editor-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.expansion-entry')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.locator('.expansion-management-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click();
  await page.getByRole('link', { name: 'Mis creaciones', exact: true }).click();
  await expect(page.locator('.expansion-management-row')).toHaveCount(0);
  await page.goto('/sobres');
  await expect(page.getByRole('button', { name: /Dark Crisis/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Dark Crisis/ })).toBeVisible();
  await page.goto('/expansiones');
  await page.getByLabel('Buscar expansión', { exact: true }).fill('Dark Crisis');
  await page.getByRole('button', { name: 'Editar Dark Crisis', exact: true }).click();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Dark Crisis');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('dragon-vault-boxes-v4')));
  expect(state.economy.customPacks).toHaveLength(1);
  expect(state.economy.customPacks[0].officialSource.name).toBe('Dark Crisis');
  expect(state.owned).toEqual({});
});

test("archivo oficial: estados de error, sin resultados y capturas adaptables", async ({ page }) => {
  await page.route('**/api/catalog/sets', (route) => route.abort());
  await page.goto('/expansiones');
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar');
  await page.unroute('**/api/catalog/sets');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('.official-set-row').first()).toBeVisible();
  await page.getByLabel('Buscar expansión').fill('no-such-expansion');
  await expect(page.getByText('No hay expansiones con esos filtros.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.impeccable/review/tcg-desktop.png', fullPage: true });
  await page.screenshot({ path: '.impeccable/review/tcg-desktop-first.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.impeccable/review/tcg-mobile.png', fullPage: true });
  await page.screenshot({ path: '.impeccable/review/tcg-mobile-first.png' });
});

test("protege el borrador propio sin cartas al preparar una oficial", async ({ page }) => {
  await page.goto('/especiales');
  await expect(page.getByText('Cada compra entrega exactamente estas copias y rarezas.', { exact: false })).toHaveCount(0);
  await page.getByLabel('Nombre', { exact: true }).fill('Mi idea sin cartas');
  await page.getByRole('link', { name: 'Oficiales TCG', exact: true }).click();
  await page.getByLabel('Buscar expansión').fill('Dark Crisis');
  await page.getByRole('button', { name: 'Preparar Dark Crisis', exact: true }).click();
  await expect(page.locator('dialog[open]')).toContainText('Tenés cambios sin guardar');
  await page.locator('dialog[open]').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('link', { name: 'Mis creaciones', exact: true }).click();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Mi idea sin cartas');
});
