import { test, expect } from "@playwright/test";

test("las pantallas aprovechan el ancho sin desbordar de móvil a 2K", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const width of [390, 768, 1440, 2560]) {
    await page.setViewportSize({ width, height: width === 2560 ? 1440 : 1000 });
    for (const route of [
      "coleccion",
      "catalogo",
      "mazos",
      "especiales",
      "sobres",
      "iniciales",
      "tienda",
    ]) {
      await page.goto("/" + route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator(".vault-loading")).toHaveCount(0, {
        timeout: 15000,
      });
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        width: document.querySelector("main").getBoundingClientRect().width,
      }));
      expect(metrics.overflow, `${route} a ${width}px`).toBe(false);
      expect(metrics.width, `${route} usa el ancho disponible`).toBeGreaterThan(
        width * 0.95,
      );
      if (route === "coleccion" && [390, 2560].includes(width)) {
        const columns = await page
          .locator(".collection-results .cards")
          .evaluate(
            (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
          );
        expect(columns).toBeGreaterThanOrEqual(width === 2560 ? 10 : 2);
        await page.screenshot({
          path: `.impeccable/review/responsive-${width}.png`,
        });
      }
    }
  }
});
