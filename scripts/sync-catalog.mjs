import { mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export async function fetchCatalog() {
  const source = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
  const response = await fetch(source, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`YGOPRODeck: HTTP ${response.status}`);
  const raw = await response.text();
  const payload = JSON.parse(raw);
  validateCatalog(payload);
  const metadata = {
    source,
    retrievedAt: new Date().toISOString(),
    count: payload.data.length,
    sha256: createHash("sha256").update(raw).digest("hex"),
    language: "en",
    scope: "Todos los registros del endpoint cardinfo, sin filtros de formato ni edición.",
  };
  return { metadata, data: payload.data };
}

export function validateCatalog(payload) {
  if (!Array.isArray(payload.data) || payload.data.length < 10000)
    throw Error(
      "El catálogo recibido está incompleto; se conserva la copia anterior.",
    );
  const ids = new Set();
  for (const card of payload.data) {
    if (
      !Number.isSafeInteger(card.id) ||
      card.id <= 0 ||
      ids.has(card.id) ||
      typeof card.name !== "string" || !card.name.trim() ||
      typeof card.type !== "string" || !card.type.trim() ||
      typeof card.desc !== "string"
    )
      throw Error("El catálogo contiene un registro no válido.");
    ids.add(card.id);
  }
}

export function catalogImages(snapshot) {
  return Object.fromEntries(snapshot.data.flatMap((card) => {
    const url = card.card_images?.[0]?.image_url;
    return /^https:\/\/images\.ygoprodeck\.com\/images\/cards\/\d+\.jpg$/.test(url || "")
      ? [[String(card.id), url]] : [];
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const snapshot = await fetchCatalog();
  await mkdir("data/catalog", { recursive: true });
  await mkdir("server/data", { recursive: true });
  // Replace only after the whole snapshot has passed validation; never overwrite progress.
  for (const [path, content] of [
    [
      "data/catalog/cards.json",
      JSON.stringify(snapshot),
    ],
    ["server/data/card-images.json", JSON.stringify(catalogImages(snapshot))],
  ]) {
    await writeFile(path + ".tmp", content);
    await rename(path + ".tmp", path);
  }
  console.log(JSON.stringify(snapshot.metadata, null, 2));
}
