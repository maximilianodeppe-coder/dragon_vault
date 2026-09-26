import { test, expect } from "@playwright/test";
import { createProgress } from "../../app/utils/progress.js";
const saved = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("dragon-vault-boxes-v4")));
test("tienda común con precio individual, no vendible y sin códigos de edición", async ({
  page,
}) => {
  const s = createProgress();
  s.economy.offers = [{ id: "36996508", stock: 4 }];
  await page.goto("/tienda");
  await page.evaluate(
    (s) => localStorage.setItem("dragon-vault-boxes-v4", JSON.stringify(s)),
    s,
  );
  await page.reload();
  await expect(page.locator(".market-card .rarity")).toHaveText("Común");
  await expect(page.locator(".market-card")).not.toContainText("LOB-");
  await page
    .getByRole("button", { name: "Ver Mago Oscuro", exact: true })
    .click();
  await expect(page.locator(".detail-reference")).toHaveText(
    "Oferta de tienda · Común · No vendible",
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar tienda", exact: true })
    .click();
  await page.getByLabel("Precio Mago Oscuro", { exact: true }).fill("17");
  await page.getByLabel("Stock Mago Oscuro", { exact: true }).focus();
  expect((await saved(page)).economy.offers[0].price).toBe(17);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".impeccable/review/shop-edit-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".impeccable/review/shop-edit-mobile.png" });
  expect(
    await page
      .locator("dialog[open]")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Comprar una copia", exact: true })
    .click();
  await expect(page.locator("dialog[open]")).toContainText("No vendible");
  await page
    .getByRole("button", { name: "Comprar por 17 monedas", exact: true })
    .click();
  const next = await saved(page);
  expect(next.coins).toBe(983);
  expect(next.inventory["36996508"][0]).toMatchObject({
    source: "shop",
    rarity: "Common",
    quantity: 1,
  });
  await page.goto("/coleccion");
  await page.getByLabel("Buscar cartas", { exact: true }).fill("36996508");
  await page
    .getByRole("button", { name: "Ver Mago Oscuro", exact: true })
    .click();
  await expect(page.locator(".owned-editions")).toContainText("No vendible");
  await expect(
    page.getByRole("button", { name: "Vender estas copias", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".detail")).not.toContainText("LOB-005");
  await page.locator(".owned-editions").scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".impeccable/review/shop-copy-mobile.png" });
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.reload();
  expect((await saved(page)).economy.offers[0].price).toBe(17);
});
