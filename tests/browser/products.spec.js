import { test, expect } from "@playwright/test";
import { createProgress } from "../../app/utils/progress.js";
import { starters } from "../../app/utils/catalog.js";
const saved = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("dragon-vault-boxes-v4")),
  );

test("crear borrador de mazo desde catálogo y conservar el tipo al recargar", async ({
  page,
}) => {
  await page.goto("/especiales");
  await page.getByLabel("Tipo de producto").selectOption("starter");
  await page.getByLabel("Nombre", { exact: true }).fill("Mi mazo nuevo");
  await page
    .getByRole("button", { name: "Agregar cartas del catálogo" })
    .click();
  await page.getByLabel("Buscar cartas", { exact: true }).fill("36996508");
  await page.getByRole("button", { name: "A mazo", exact: true }).click();
  await page
    .getByRole("button", { name: "Ir al editor de expansiones" })
    .click();
  await page.getByRole("button", { name: "Crear y publicar mazo" }).click();
  expect((await saved(page)).economy.customPacks[0].status).toBe("published");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  expect((await saved(page)).economy.customPacks[0].kind).toBe("starter");
  await page.reload();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByLabel("Tipo de producto")).toHaveValue("starter");
  await page.goto("/iniciales");
  await expect(page.locator(".starter-product")).toHaveCount(2);
});

for (const official of [false, true]) test(`convertir una expansión ${official ? "importada" : "propia"} guardada en mazo y comprar su contenido completo`, async ({
  page,
}) => {
  const state = createProgress();
  const entries = starters[0].entries
    .slice(0, 14)
    .map((e, i) => ({
      id: String(e.id),
      copies: i === 13 ? 1 : 3,
      remaining: i === 13 ? 1 : 3,
      rarity: "Rare",
    }));
  state.economy.customPacks.push({
    id: "custom-test-deck",
    kind: "pack",
    name: "Círculo de aprendices",
    status: "draft",
    cost: 125,
    size: 5,
    entries,
    ...(official ? { officialSource: { name: "Starter Deck", code: "SDY", date: "", format: "TCG" } } : {}),
  });
  await page.goto(official ? "/expansiones?editor=1" : "/especiales");
  await page.evaluate(
    (s) => localStorage.setItem("dragon-vault-boxes-v4", JSON.stringify(s)),
    state,
  );
  await page.reload();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByLabel("Tipo de producto")).toBeEnabled();
  await page.getByLabel("Tipo de producto").selectOption("starter");
  await expect(page.getByLabel("Copias de", { exact: false }).first()).toHaveValue("3");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `.impeccable/review/converted-${official ? "official" : "custom"}-desktop.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `.impeccable/review/converted-${official ? "official" : "custom"}-mobile.png`,
  });
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  expect((await saved(page)).economy.customPacks[0].kind).toBe("starter");
  await page.reload();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByLabel("Tipo de producto")).toHaveValue("starter");
  await page.goto("/sobres");
  await expect(
    page.getByRole("button", { name: /Círculo de aprendices/ }),
  ).toHaveCount(0);
  await page.goto("/iniciales");
  const product = page
    .locator(".starter-product")
    .filter({ hasText: "Círculo de aprendices" });
  await expect(product).toBeVisible();
  await product
    .getByRole("button", { name: "Comprar mazo · 125 monedas" })
    .click();
  await page
    .getByLabel("Guardarlo también en Mis mazos, listo para editar")
    .check();
  await page
    .getByRole("button", { name: "Comprar · 125 monedas", exact: true })
    .click();
  const next = await saved(page);
  expect(next.coins).toBe(875);
  expect(Object.values(next.owned).reduce((a, b) => a + b, 0)).toBe(40);
  expect(next.inventory[entries[0].id][0]).toMatchObject({
    source: "custom-test-deck",
    rarity: "Rare",
    quantity: 3,
  });
  expect(Object.values(next.decks[0].cards).reduce((a, b) => a + b, 0)).toBe(
    40,
  );
  await page.reload();
  await product.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.impeccable/review/converted-${official ? "official" : "custom"}-product-mobile.png`,
  });
});

test("sobres con abanico en hover, teclado y movimiento reducido; efecto blanco", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/sobres");
  const portal = page.locator(".expansion-portal").first();
  await expect(portal.locator("img")).toHaveCount(5);
  const img = portal.locator("img").first();
  const initial = await img.evaluate((el) => getComputedStyle(el).transform);
  await page.screenshot({ path: ".impeccable/review/pack-portals-rest.png" });
  await portal.hover();
  await expect
    .poll(() => img.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(initial);
  await page.screenshot({
    path: ".impeccable/review/pack-portals-hover.png",
    animations: "disabled",
  });
  await page.mouse.move(0, 0);
  await portal.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#boxDetail")).toBeVisible();
  await page
    .getByRole("button", { name: "← Volver a las expansiones", exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(portal).toBeVisible();
  expect(
    await img.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page.screenshot({
    path: ".impeccable/review/pack-portals-mobile.png",
    fullPage: true,
  });
  await page.goto("/coleccion");
  await page.locator(".card").first().click();
  expect(
    await page
      .locator(".detail-effect p")
      .evaluate((el) => getComputedStyle(el).color),
  ).toBe("rgb(255, 255, 255)");
});
