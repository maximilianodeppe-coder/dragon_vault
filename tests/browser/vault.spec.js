import { test, expect } from "@playwright/test";

const saved = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("dragon-vault-boxes-v4")),
  );
const modal = (page) => page.locator("dialog[open]");
async function buyStarter(page) {
  await page.goto("/iniciales");
  await page
    .getByRole("button", { name: "Comprar mazo · 500 monedas" })
    .first()
    .click();
  await page
    .getByRole("checkbox", { name: "Guardarlo también en Mis mazos" })
    .check();
  await modal(page)
    .getByRole("button", { name: "Comprar · 500 monedas", exact: true })
    .click();
}

test("compra, edición de mazos, apertura y persistencia tras recargar", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await buyStarter(page);
  expect((await saved(page)).coins).toBe(500);
  await page.getByRole("link", { name: "Mis mazos", exact: true }).click();
  await expect(page.getByLabel("Nombre del mazo")).toHaveValue(
    "Mazo de inicio de Yugi",
  );
  await page.getByLabel("Nombre del mazo").fill("Mi primer mazo");
  await page.getByLabel("Nombre del mazo").press("Tab");
  await page.locator(".deck-zone-grid .deck-remove").first().click();
  expect(
    Object.values((await saved(page)).decks[0].cards).reduce(
      (a, b) => a + b,
      0,
    ),
  ).toBe(49);
  await page.getByRole("link", { name: "Formatos", exact: true }).click();
  await page
    .getByRole("button", { name: /La leyenda del Dragón Blanco/ })
    .click();
  await page
    .getByRole("button", { name: /Abrir un sobre · 5 monedas/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Apertura de sobre" }),
  ).toBeVisible();
  expect((await saved(page)).coins).toBe(495);
  expect(
    Object.values((await saved(page)).owned).reduce((a, b) => a + b, 0),
  ).toBe(55);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Monedas y saldo" }),
  ).toHaveText("◉ 495");
  await page.getByRole("link", { name: "Mis mazos", exact: true }).click();
  await expect(page.getByLabel("Nombre del mazo")).toHaveValue(
    "Mi primer mazo",
  );
  expect(errors).toEqual([]);
});

test("catálogo, tienda y sobre especial mantienen existencias y precios", async ({
  page,
}) => {
  await page.goto("/catalogo");
  await expect(page.locator(".market-card")).toHaveCount(30);
  await page
    .getByLabel("Buscar cartas", { exact: true })
    .fill("Tri-Horned Dragon");
  await expect(page.locator(".market-card")).toHaveCount(1);
  await page.getByRole("button", { name: "A expansión", exact: true }).click();
  await page
    .getByRole("button", { name: "Ir al editor de expansiones" })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Dragones de prueba");
  await page
    .getByRole("combobox", { name: "Cartas por sobre", exact: true })
    .selectOption("1");
  await page
    .getByRole("button", { name: "Crear y publicar expansión" })
    .click();
  await page
    .getByRole("button", { name: "Ver en Sobres", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir un sobre · 5 monedas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revelar todas", exact: true })
    .click();
  await expect(page.locator(".flip-card.flipped")).toHaveCount(1);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Caja agotada", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Tienda", exact: true }).click();
  await page.getByRole("button", { name: "Comprar una copia" }).first().click();
  await modal(page)
    .getByRole("button", { name: /^Comprar por/ })
    .click();
  const state = await saved(page);
  expect(state.economy.offers[0].stock).toBe(2);
  expect(state.economy.customPacks[0].entries[0].remaining).toBe(0);
  expect(state.packs).toBe(1);
});

test("respaldo antiguo, exportación, venta protegida y deshacer borrado", async ({
  page,
}) => {
  await buyStarter(page);
  const snapshot = await saved(page);
  snapshot.version = 1;
  delete snapshot.boxes;
  delete snapshot.coins;
  delete snapshot.economy;
  await page.getByRole("button", { name: "Guardar / cargar" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "backup-v1.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });
  await page
    .getByRole("button", { name: "Reemplazar mi progreso con esta copia" })
    .click();
  expect((await saved(page)).coins).toBe(1000);
  await page.getByRole("link", { name: /Mi colección/ }).click();
  await page.getByRole("checkbox", { name: "Solo las que tengo" }).check();
  await page.locator(".collection-results .card").first().click();
  await expect(page.getByRole("button", { name: /Vender copias/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: 'Identificar copias', exact: true })).toBeVisible();
  await modal(page)
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await page.getByText("Más opciones", { exact: true }).click();
  await page
    .getByRole("button", { name: "Borrar toda mi colección", exact: true })
    .click();
  await modal(page)
    .getByRole("button", { name: "Borrar toda mi colección", exact: true })
    .click();
  expect((await saved(page)).owned).toEqual({});
  await page
    .getByRole("button", { name: "Deshacer última eliminación" })
    .click();
  expect((await saved(page)).owned).toEqual(snapshot.owned);
  expect((await saved(page)).decks).toEqual(snapshot.decks);
  await page.getByRole("button", { name: "Guardar / cargar" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar copia", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(
    /^dragon-vault-.*\.json$/,
  );
});

test("un guardado inválido no se sobrescribe al abrir la aplicación", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("dragon-vault-boxes-v4", "invalid-json"),
  );
  await page.goto("/iniciales");
  await expect(page.getByText("El guardado necesita atención")).toBeVisible();
  await page
    .getByRole("button", { name: "Comprar mazo · 500 monedas" })
    .first()
    .click();
  await modal(page)
    .getByRole("button", { name: "Comprar · 500 monedas", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("dragon-vault-boxes-v4")),
  ).toBe("invalid-json");
});

test("rutas directas, filtros combinables e interfaz móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalogo");
  await page.getByLabel("Buscar cartas", { exact: true }).fill("dragón");
  await page.getByText("Atributo", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Oscuridad", exact: true }).check();
  await page.getByRole("combobox", { name: "Ordenar por" }).selectOption("atk");
  expect(await page.locator(".market-card").count()).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/catalogo-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/iniciales");
  await expect(
    page.getByRole("heading", { name: "Tus primeros compañeros de duelo." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver las 50 cartas" }).first().click();
  await expect(page.locator("#starterContent .card")).toHaveCount(50);
  await page.screenshot({ path: "test-results/iniciales-mobile.png" });
});

test("un fallo al guardar impide entregar compras sin persistir", async ({
  page,
}) => {
  await page.goto("/iniciales");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException(
        "No se pudo guardar. Exportá una copia.",
        "QuotaExceededError",
      );
    };
  });
  await page
    .getByRole("button", { name: "Comprar mazo · 500 monedas" })
    .first()
    .click();
  await modal(page)
    .getByRole("button", { name: "Comprar · 500 monedas", exact: true })
    .click();
  await expect(modal(page).getByRole("status")).toContainText(
    "No se pudo guardar",
  );
  await modal(page)
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Monedas y saldo" }),
  ).toHaveText("◉ 1.000");
  expect(await saved(page)).toBeNull();
});

test("arrastrar cartas y editar precios funcionan en escritorio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await buyStarter(page);
  await page.getByRole("link", { name: "Mis mazos", exact: true }).click();
  await page
    .locator(".deck-zone-grid .deck-card")
    .first()
    .dragTo(page.locator(".deck-library .workbench-heading"));
  expect(
    Object.values((await saved(page)).decks[0].cards).reduce(
      (a, b) => a + b,
      0,
    ),
  ).toBe(49);
  await page
    .locator(".deck-library-grid .deck-card[draggable=true]")
    .first()
    .dragTo(page.locator(".deck-dropzone").first());
  expect(
    Object.values((await saved(page)).decks[0].cards).reduce(
      (a, b) => a + b,
      0,
    ),
  ).toBe(50);
  await page.screenshot({ path: "test-results/mazos-desktop.png" });
  await page.getByRole("link", { name: "Tienda", exact: true }).click();
  await page.getByRole("button", { name: "Valores por rareza" }).click();
  await page.getByLabel("Compra Común", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Guardar valores" }).click();
  expect((await saved(page)).economy.prices.Common.buy).toBe(9);
  await page
    .getByRole("link", { name: "Formatos", exact: true })
    .click();
  await expect(page.locator(".starter-product img").first()).toBeVisible();
  await page.screenshot({ path: "test-results/iniciales-desktop.png" });
});
