import {
  readFile,
  writeFile,
  rename,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
export async function fetchSpanish(catalog, originals, previous = { data: {} }) {
  const byPassword = new Map(),
    byKonami = new Map(),
    byName = new Map(),
    sources = [];
  for (const file of ["cards", "skill", "rush"]) {
    const url = `https://dawnbrandbots.github.io/yaml-yugi/${file}.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw Error(`${url}: ${response.status}`);
    const raw = await response.text(),
      parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : Object.values(parsed);
    sources.push({
      url,
      sha256: createHash("sha256").update(raw).digest("hex"),
      count: rows.length,
    });
    for (const row of rows) {
      if (!row.text?.es || !row.name?.es) continue;
      const text = [
        row.pendulum_effect?.es
          ? "Efecto de Péndulo\n" + row.pendulum_effect.es
          : "",
        row.text.es,
      ]
        .filter(Boolean)
        .join("\n\n");
      const value = { name: row.name.es, text, source: "YAML Yugi" };
      if (row.password) byPassword.set(String(row.password), value);
      if (row.konami_id) byKonami.set(String(row.konami_id), value);
      if (row.name.en) byName.set(row.name.en, value);
    }
  }
  const data = { ...previous.data },
    missing = [];
  function isSpanish(text) {
    const body = text.replace(/"[^"]*"/g, "");
    return (
      (
        body.match(
          /\b(?:el|la|los|las|un|una|de|del|que|puedes|esta|este|durante|tu|tus|adversario|monstruo|carta)\b/gi,
        ) || []
      ).length >= 2 &&
      !/\b(?:you|your|this card|opponent|summon|destroy|inflict|during|once per|cannot)\b/i.test(
        body,
      )
    );
  }
  const community = new Map();
  const temp = await mkdtemp(join(tmpdir(), "dragon-vault-spanish-"));
  try {
    const listingResponse = await fetch("https://api.github.com/repos/ryoken08/CDBEsp/contents", {
      signal: AbortSignal.timeout(60000),
    });
    if (!listingResponse.ok) throw Error(`CDBEsp: HTTP ${listingResponse.status}`);
    const listing = await listingResponse.json();
    if (!Array.isArray(listing)) throw Error("Listado CDBEsp no válido.");
    for (const file of listing.filter(
      (f) => /\.cdb$/.test(f.name) && !f.name.startsWith("goat-"),
    )) {
      if (!/^[\w .-]+\.cdb$/.test(file.name) ||
          !file.download_url?.startsWith("https://raw.githubusercontent.com/ryoken08/CDBEsp/"))
        throw Error("Archivo CDBEsp no válido.");
      const response = await fetch(file.download_url, {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw Error("Falló la descarga de " + file.name);
      const bytes = Buffer.from(await response.arrayBuffer());
      const path = join(temp, file.name);
      await writeFile(path, bytes);
      const db = new DatabaseSync(path, { readOnly: true });
      try {
        for (const row of db.prepare("SELECT id, name, desc FROM texts").all())
          if (row.name && row.desc && isSpanish(row.desc))
            community.set(String(row.id), {
              name: row.name,
              text: row.desc,
              source: "CDBEsp · traducción comunitaria",
            });
      } finally {
        db.close();
        await rm(path);
      }
      sources.push({
        url: file.download_url,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  for (const c of catalog.data) {
    const match =
      byPassword.get(String(c.id)) ||
      byKonami.get(String(c.misc_info?.[0]?.konami_id)) ||
      byName.get(c.name) ||
      community.get(String(c.id));
    if (match) {
      data[c.id] = match;
      if (originals.some(original => original.id === c.id && original.historical?.classification === 'functional'))
        data[c.id + ':errata'] = { ...match, englishText: c.desc };
    }
    else missing.push({ id: c.id, name: c.name, type: c.type });
  }
  for (const c of originals)
    data[c.id] = {
      name: c.name_es,
      text: c.desc_es,
      source: "Konami · ficha clásica",
    };
  const uncovered = missing.filter((c) => !data[c.id]);
  if (Object.keys(data).length < 10000)
    throw Error(
      "Cobertura española inesperadamente baja; se conserva la copia anterior.",
    );
  const metadata = {
    retrievedAt: new Date().toISOString(),
    sources,
    count: Object.keys(data).length,
    total: new Set([...catalog.data, ...originals].map((c) => c.id)).size,
    missing: uncovered.length,
  };
  return { metadata, data, missing: uncovered };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const catalog = JSON.parse(await readFile("data/catalog/cards.json", "utf8"));
  const originals = JSON.parse(await readFile("app/data/cards.json", "utf8"));
  const previous = JSON.parse(await readFile("data/catalog/es.json", "utf8"));
  const { metadata, data, missing: uncovered } = await fetchSpanish(catalog, originals, previous);
  await writeFile(
    "data/catalog/es.json.tmp",
    JSON.stringify({ metadata, data }),
  );
  await rename("data/catalog/es.json.tmp", "data/catalog/es.json");
  await writeFile(
    "data/catalog/es-missing.json",
    JSON.stringify(uncovered, null, 2),
  );
  console.log(JSON.stringify(metadata, null, 2));
}
