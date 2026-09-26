import { liveImages } from "../../utils/live-catalog.js";

const pending = new Map();
let nextRequest = 0;

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const imageIndex = await liveImages();
  if (!/^\d{1,10}$/.test(id || "") || !Object.hasOwn(imageIndex, id))
    throw createError({
      statusCode: 404,
      statusMessage: "Carta no encontrada",
    });
  const storage = useStorage("cardImages");
  const key = `${id}.jpg`;
  let buffer = await storage.getItemRaw(key);
  if (!buffer) {
    if (!pending.has(id)) {
      const task = (async () => {
        // Four starts per second globally, deduplicated and persisted after the first fetch.
        const delay = Math.max(0, nextRequest - Date.now());
        nextRequest = Date.now() + delay + 250;
        await new Promise((resolve) => setTimeout(resolve, delay));
        const response = await fetch(imageIndex[id], {
          signal: AbortSignal.timeout(15000),
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.startsWith("image/")
        )
          throw createError({
            statusCode: 502,
            statusMessage: "Imagen no disponible",
          });
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 3000000 || bytes[0] !== 0xff || bytes[1] !== 0xd8)
          throw createError({
            statusCode: 502,
            statusMessage: "Imagen no válida",
          });
        await storage.setItemRaw(key, bytes);
        return bytes;
      })();
      pending.set(id, task);
      task.finally(() => pending.delete(id)).catch(() => {});
    }
    buffer = await pending.get(id);
  }
  setHeader(event, "Content-Type", "image/jpeg");
  setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");
  return buffer;
});
