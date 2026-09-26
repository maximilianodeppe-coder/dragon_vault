import { test, expect } from "@playwright/test";
import { createProgress } from "../../app/utils/progress.js";
import { addCopies } from "../../app/utils/inventory.js";
const saved = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("dragon-vault-boxes-v4")),
  );
test("crear banlist, elegir por mazo, señalar conflictos, persistir y eliminar sin perder cartas", async ({
  page,
}) => {
  const s = createProgress(),
    id = "36996508";
  addCopies(s, id, 3, {
    source: "shop",
    sourceName: "Tienda",
    rarity: "Common",
  });
  s.decks = [
    { id: "a", name: "Mi mazo", cards: { [id]: 3 } },
    { id: "b", name: "Otro mazo", cards: {} },
  ];
  await page.goto("/banlists");
  await page.evaluate(
    (s) => localStorage.setItem("dragon-vault-boxes-v4", JSON.stringify(s)),
    s,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Banlists adicionales', exact: true }).click();
  await page
    .getByRole("button", { name: "Crear banlist", exact: true })
    .click();
  await page
    .getByLabel("Nombre de la nueva lista", { exact: true })
    .fill("Duelo clásico");
  await page.getByRole('button', { name: 'Guardar nueva banlist', exact: true }).click();
  await page
    .getByRole("searchbox", {
      name: "Buscar cartas para la lista",
      exact: true,
    })
    .fill(id);
  await page
    .getByRole('group', { name: 'Límite de Mago Oscuro', exact: true })
    .getByRole('button', { name: '1 copia', exact: true }).click();
  expect((await saved(page)).banlists[0].name).toBe("Duelo clásico");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".impeccable/review/banlists-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/review/banlists-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const listId = (await saved(page)).banlists[0].id;
  await page.goto("/mazos");
  await page
    .getByLabel("Banlist de este mazo", { exact: true })
    .selectOption(listId);
  await expect(page.locator(".banlist-warning")).toContainText("sobran 2");
  expect((await saved(page)).decks[0].cards[id]).toBe(3);
  await expect(
    page.getByRole("button", { name: "Agregar Mago Oscuro", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".impeccable/review/banlist-deck-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/review/banlist-deck-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Quitar Mago Oscuro", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Quitar Mago Oscuro", exact: true })
    .first()
    .click();
  await expect(page.locator(".deck-banlist-status")).toContainText(
    "Cumple los límites",
  );
  await page.getByLabel("Elegir mazo", { exact: true }).selectOption("b");
  await expect(
    page.getByLabel("Banlist de este mazo", { exact: true }),
  ).toHaveValue("");
  await page.reload();
  await expect(
    page.getByLabel("Banlist de este mazo", { exact: true }),
  ).toHaveValue(listId);
  await page.goto("/banlists");
  await page.getByRole('button', { name: 'Banlists adicionales', exact: true }).click();
  await page
    .getByRole('group', { name: 'Límite de Mago Oscuro', exact: true })
    .getByRole('button', { name: 'No permitida', exact: true }).click();
  await page.goto("/mazos");
  await expect(page.locator(".banlist-warning")).toContainText("prohibida");
  await page.goto("/banlists");
  await page.getByRole('button', { name: 'Banlists adicionales', exact: true }).click();
  await page
    .getByRole("button", { name: "Eliminar banlist", exact: true })
    .click();
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: "Eliminar banlist", exact: true })
    .click();
  const end = await saved(page);
  expect(end.banlists).toEqual([]);
  expect(end.decks[0].banlistId).toBeUndefined();
  expect(end.owned[id]).toBe(3);
  expect(end.decks[0].cards[id]).toBe(1);
});
