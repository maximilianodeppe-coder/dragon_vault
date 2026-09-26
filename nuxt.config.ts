export default defineNuxtConfig({
  compatibilityDate: "2026-09-23",
  ssr: false,
  spaLoadingTemplate: "spa-loading-template.html",
  nitro: {
    serverAssets: [{ baseName: "catalog", dir: "../data/catalog" }],
    compressPublicAssets: true,
    storage: { cardImages: { driver: "fs", base: "./.data/card-images" } },
  },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  ui: { fonts: false, colorMode: false },
  app: {
    head: {
      htmlAttrs: { lang: "es", class: "dark" },
      title: "Dragon Vault · Cajas clásicas",
      meta: [
        {
          name: "description",
          content:
            "Abrí sobres clásicos, completá tu colección y armá tus mazos en Dragon Vault.",
        },
      ],
      link: [
        { rel: "icon", href: "/favicon.svg" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Marcellus&display=swap",
        },
      ],
    },
  },
});
