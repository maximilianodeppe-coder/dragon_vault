import { test, expect } from "@playwright/test";
import { createProgress } from "../../app/utils/progress.js";
import { addCopies, lotKey } from "../../app/utils/inventory.js";
const id = "36996508",
  rare = {
    source: "custom-magos",
    sourceName: "El círculo de los magos",
    rarity: "Rare",
  },
  ultra = {
    source: "LOB",
    sourceName: "La leyenda del Dragón Blanco",
    rarity: "Ultra Rare",
  };
const saved = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("dragon-vault-boxes-v4")),
  );
async function seed(page, state) {
  await page.goto("/coleccion");
  await page.evaluate(
    (s) => localStorage.setItem("dragon-vault-boxes-v4", JSON.stringify(s)),
    state,
  );
  await page.reload();
  await page.getByLabel("Buscar cartas", { exact: true }).fill("Dark Magician");
}
test("una carta agrupa ediciones y permite elegir la rareza que se vende", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = createProgress();
  addCopies(s, id, 2, rare);
  addCopies(s, id, 2, ultra);
  await seed(page, s);
  const tile = page.getByRole("button", {
    name: "Ver Mago Oscuro",
    exact: true,
  });
  await expect(tile).toHaveCount(1);
  await expect(tile).toContainText("2 Rara · 2 Ultra Rara");
  await tile.click();
  await expect(page.locator(".owned-edition")).toHaveCount(2);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: ".impeccable/review/copies-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".owned-editions").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/copies-mobile.png",
    fullPage: true,
  });
  await page
    .locator(".owned-edition")
    .filter({ hasText: "El círculo de los magos" })
    .getByRole("button", { name: "Vender estas copias" })
    .click();
  await expect(page.getByText("Valor de esta copia: 3 monedas.")).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/sale-mobile.png",
    fullPage: true,
  });
  expect(
    await page
      .locator("dialog[open]")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  expect((await saved(page)).coins).toBe(1003);
  expect(
    (await saved(page)).inventory[id].find((l) => l.rarity === "Rare").quantity,
  ).toBe(1);
  await tile.click();
  await page
    .getByRole("button", { name: "Vender copias · elegir expansión y rareza" })
    .click();
  await page
    .getByLabel("Expansión y rareza a vender")
    .selectOption(lotKey(ultra));
  await expect(
    page.getByText("Valor de esta copia: 15 monedas."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar venta", exact: true })
    .click();
  expect((await saved(page)).coins).toBe(1018);
  expect((await saved(page)).owned[id]).toBe(2);
  await page.reload();
  await page.getByLabel("Buscar cartas", { exact: true }).fill("Dark Magician");
  await expect(tile).toHaveCount(1);
  await expect(tile).toContainText("1 Rara · 1 Ultra Rara");
  expect(errors).toEqual([]);
});
test("un guardado antiguo permite identificar las copias sin inventar el origen", async ({
  page,
}) => {
  const s = createProgress();
  s.version = 4;
  s.owned[id] = 2;
  delete s.inventory;
  s.economy.customPacks.push({
    id: "custom-magos",
    name: "Magos raros",
    cost: 5,
    size: 1,
    entries: [{ id, copies: 5, remaining: 3, rarity: "Rare" }],
  });
  await seed(page, s);
  await page
    .getByRole("button", { name: "Ver Mago Oscuro", exact: true })
    .click();
  await expect(
    page.getByText("Rareza sin identificar", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Identificar copias", exact: true })
    .click();
  await page
    .getByLabel("Expansión de estas copias")
    .selectOption("custom-magos");
  await expect(page.getByLabel("Rareza de estas copias")).toHaveValue("Rare");
  await page.getByLabel("Cantidad a identificar").fill("2");
  await page.getByRole("button", { name: "Confirmar identificación" }).click();
  const state = await saved(page);
  expect(state.owned[id]).toBe(2);
  expect(state.coins).toBe(1000);
  expect(state.inventory[id]).toEqual([
    {
      source: "custom-magos",
      sourceName: "Magos raros",
      rarity: "Rare",
      quantity: 2,
    },
  ]);
});
test("catálogo muestra efectos españoles y señala los pendientes", async ({
  page,
}) => {
  await page.goto("/catalogo");
  await page.getByLabel("Buscar cartas", { exact: true }).fill("44508094");
  await page
    .getByRole("button", {
      name: "Ver Dragón de Polvo de Estrellas",
      exact: true,
    })
    .click();
  await expect(page.locator(".detail p[lang=es]")).toContainText(
    "Sacrificar esta carta",
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByLabel("Buscar cartas", { exact: true }).fill("72978038");
  await page.locator(".market-card .card").click();
  await expect(page.locator(".catalog-source").last()).toContainText(
    "pendiente",
  );
  await expect(page.locator(".detail p[lang=en]")).not.toBeEmpty();
});
