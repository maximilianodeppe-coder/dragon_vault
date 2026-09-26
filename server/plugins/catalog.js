import { liveCatalog } from "../utils/live-catalog.js";

export default defineNitroPlugin((nitro) => {
  if (import.meta.prerender) return;
  const check = () => liveCatalog().then((updater) => updater.check())
    .catch((error) => console.error("Falló el chequeo diario del catálogo:", error.message));
  // Check persisted due time on startup and hourly; download at most once per 24 hours.
  const startup = setTimeout(check, 1000);
  const timer = setInterval(check, 60 * 60 * 1000);
  startup.unref();
  timer.unref();
  nitro.hooks.hook("close", () => { clearTimeout(startup); clearInterval(timer); });
});
