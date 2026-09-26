import { liveCatalog } from "../../utils/live-catalog.js";

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name");
  if (!["cards", "es", "sets"].includes(name)) throw createError({ statusCode: 404 });
  const snapshot = await (await liveCatalog()).get();
  setHeader(event, "Cache-Control", "no-store");
  return name === "cards" ? snapshot.cards : name === "sets" ? snapshot.sets : snapshot.spanish;
});
