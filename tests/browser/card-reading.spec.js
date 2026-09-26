import { test, expect } from "@playwright/test";

test("nombres estables, preview accesible y efecto antes de las copias", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/coleccion");
  const tiles = page.locator(".card");
  await expect(tiles.first()).toBeVisible();
  const titles = page.locator(".card .card-name");
  expect(
    await titles.first().evaluate((el) => getComputedStyle(el).textOverflow),
  ).toBe("ellipsis");
  const first = tiles.first();
  await first.hover();
  await expect(page.locator(".card-preview")).toBeVisible();
  await page.screenshot({ path: ".impeccable/review/reading-preview.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".card-preview")).not.toBeVisible();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".detail-effect")).toBeVisible();
  expect(
    await page.locator(".detail-effect").evaluate((el) => {
      const copies = document.querySelector(".owned-editions");
      return (
        !copies ||
        !!(
          el.compareDocumentPosition(copies) & Node.DOCUMENT_POSITION_FOLLOWING
        )
      );
    }),
  ).toBe(true);
  await page.screenshot({ path: ".impeccable/review/reading-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".impeccable/review/reading-mobile.png" });
  expect(
    await page
      .locator("dialog[open]")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});
