import { test, expect } from "@playwright/test";
import { createProgress } from "../../app/utils/progress.js";
const saved = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("dragon-vault-boxes-v4")),
  );

test("si falta el catálogo, no se sobrescribe un guardado con cartas modernas", async ({
  page,
}) => {
  const state = createProgress();
  state.owned["44508094"] = 1;
  const original = JSON.stringify(state);
  await page.addInitScript(
    (value) => localStorage.setItem("dragon-vault-boxes-v4", value),
    original,
  );
  await page.route("**/api/catalog/cards", (route) => route.abort());
  await page.goto("/catalogo");
  await expect(page.getByText("El guardado necesita atención")).toBeVisible();
  await expect(page.locator("#catalogo [role=alert]")).toContainText(
    "No se pudo cargar el catálogo completo",
  );
  await page
    .getByRole("link", { name: "Formatos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Comprar mazo · 500 monedas" })
    .first()
    .click();
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "Comprar · 500 monedas", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("dragon-vault-boxes-v4")),
  ).toBe(original);
});

test("catálogo completo aislado, borrador persistente y publicación junto a las cajas clásicas", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/coleccion");
  await expect(page.locator(".collection-results .muted")).toContainText(
    "422 de 422",
  );
  await page.goto("/catalogo");
  await page
    .getByLabel("Buscar cartas", { exact: true })
    .fill("Stardust Dragon");
  const card = page.locator(".market-card").filter({
    has: page.getByRole("button", {
      name: "Ver Dragón de Polvo de Estrellas",
      exact: true,
    }),
  });
  await expect(card).toHaveCount(1);
  await expect(card.getByText("Solo catálogo", { exact: true })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "A tienda", exact: true }),
  ).toBeDisabled();
  await card.getByRole("button", { name: "A expansión", exact: true }).click();
  await page
    .getByRole("button", { name: "Ir al editor de expansiones" })
    .click();
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("El despertar de la Sincronía");
  await page
    .getByLabel("Descripción")
    .fill(
      "Una caja de prueba con Stardust Dragon. Todas las copias tienen la misma oportunidad de salir.",
    );
  await page
    .getByLabel("Copias de Dragón de Polvo de Estrellas", { exact: true })
    .fill("8");
  await page
    .getByLabel("Rareza de Dragón de Polvo de Estrellas", { exact: true })
    .selectOption("Ultra Rare");
  await page.getByLabel("Cartas por sobre", { exact: true }).selectOption("2");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  expect((await saved(page)).economy.customPacks[0].status).toBe("draft");
  expect((await saved(page)).owned).toEqual({});
  await page.reload();
  await expect(
    page
      .locator(".expansion-management-row")
      .getByText("Borrador", { exact: true }),
  ).toBeVisible();
  await page.goto("/sobres");
  await expect(
    page.getByRole("button", { name: /El despertar de la Sincronía/ }),
  ).toHaveCount(0);
  await page.goto("/coleccion");
  await expect(page.locator(".collection-results .muted")).toContainText(
    "422 de 422",
  );
  await page.goto("/especiales");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.locator(".expansion-preview img").evaluate((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          img.onload = img.onerror = resolve;
        }),
  );
  await page.screenshot({
    path: ".impeccable/review/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".impeccable/review/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  expect((await saved(page)).economy.customPacks[0].status).toBe("published");
  await page.getByRole("link", { name: "Formatos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /La leyenda del Dragón Blanco/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /El despertar de la Sincronía/ })
    .click();
  await expect(page.locator("#toast")).toHaveText("", { timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".impeccable/review/box-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".impeccable/review/box-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Abrir un sobre · 5 monedas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revelar todas", exact: true })
    .click();
  await expect(page.locator(".flip-card.flipped")).toHaveCount(2);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const state = await saved(page);
  expect(state.economy.customPacks[0].entries[0].remaining).toBe(6);
  expect(state.coins).toBe(995);
  expect(Object.values(state.owned)).toEqual([2]);
  await page.goto("/coleccion");
  await expect(page.locator(".collection-results .muted")).toContainText(
    "423 de 423",
  );
  await page
    .getByLabel("Buscar cartas", { exact: true })
    .fill("Stardust Dragon");
  await expect(page.locator(".collection-results .card")).toHaveCount(1);
  await page.goto("/especiales");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Sincronía revisada");
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  expect((await saved(page)).economy.customPacks[0].entries[0].remaining).toBe(
    6,
  );
  await page
    .getByLabel("Copias de Dragón de Polvo de Estrellas", { exact: true })
    .fill("10");
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  await expect(page.locator(".expansion-form [role=alert]")).toContainText(
    "El contenido cambió",
  );
  expect((await saved(page)).economy.customPacks[0].entries[0].copies).toBe(8);
  await page
    .getByLabel("Reponer la caja al guardar cambios de contenido")
    .check();
  await page
    .getByRole("button", { name: "Guardar y publicar", exact: true })
    .click();
  expect((await saved(page)).economy.customPacks[0].entries[0].remaining).toBe(
    10,
  );
  expect(errors).toEqual([]);
});

test("el servidor solo admite imágenes del catálogo y las almacena localmente", async ({
  request,
}) => {
  const unknown = await request.get("/api/card-image/9999999999");
  expect(unknown.status()).toBe(404);
  const response = await request.get("/api/card-image/44508094");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/jpeg");
  const bytes = await response.body();
  expect(bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))).toBe(true);
  const cached = await request.get("/api/card-image/44508094");
  expect((await cached.body()).equals(bytes)).toBe(true);
});
