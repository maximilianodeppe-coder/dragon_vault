import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

export function validateSets(snapshot) {
  if (!Array.isArray(snapshot?.data) || snapshot.data.length < 500 ||
      snapshot.metadata?.count !== snapshot.data.length)
    throw Error("El listado de expansiones está incompleto.");
  const seen = new Set();
  for (const set of snapshot.data) {
    if (typeof set.set_name !== "string" || !set.set_name.trim() || set.set_name.length > 160 ||
        typeof set.set_code !== "string" || !/^[A-Z0-9-]{1,12}$/.test(set.set_code) ||
        !Number.isSafeInteger(set.num_of_cards) || set.num_of_cards < 1 ||
        (set.tcg_date && !/^\d{4}-\d{2}-\d{2}$/.test(set.tcg_date)) || seen.has(set.set_name))
      throw Error("El listado contiene una expansión no válida.");
    seen.add(set.set_name);
  }
}

export async function fetchSets() {
  const source = "https://db.ygoprodeck.com/api/v7/cardsets.php";
  const response = await fetch(source, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`Expansiones YGOPRODeck: HTTP ${response.status}`);
  const raw = await response.text();
  const data = JSON.parse(raw);
  const snapshot = { metadata: { source, retrievedAt: new Date().toISOString(),
    count: data.length, sha256: createHash("sha256").update(raw).digest("hex") }, data };
  validateSets(snapshot);
  snapshot.data.sort((a, b) => (a.tcg_date || "9999").localeCompare(b.tcg_date || "9999") ||
    a.set_name.localeCompare(b.set_name));
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sets = await fetchSets();
  await mkdir("data/catalog", { recursive: true });
  await writeFile("data/catalog/sets.json.tmp", JSON.stringify(sets));
  await rename("data/catalog/sets.json.tmp", "data/catalog/sets.json");
  // Seed the live snapshot without re-downloading cards or touching player progress.
  try {
    const file = ".data/catalog/snapshot.json";
    const current = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file + ".tmp", JSON.stringify({ ...current, sets }));
    await rename(file + ".tmp", file);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  console.log(JSON.stringify(sets.metadata, null, 2));
}
