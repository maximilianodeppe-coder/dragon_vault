import { names } from "./catalog.js";

export function setFormat(set) {
  return /speed duel/i.test(set.set_name) ? "Speed Duel" :
    /rush duel/i.test(set.set_name) ? "Rush Duel" : "TCG";
}

// Set names are the source's identifiers; codes are shared by different products.
export function indexSetCards(cards) {
  const index = new Map();
  for (const card of cards) {
    // Imported set membership does not identify which historical effect was printed.
    // Keep the established selection; variants are chosen explicitly in the editor.
    if (card.postErrata) continue;
    for (const edition of card.officialSets || card.card_sets || []) {
      if (!index.has(edition.set_name)) index.set(edition.set_name, new Map());
      const members = index.get(edition.set_name);
      const id = String(card.id);
      if (!members.has(id)) members.set(id, { id, editions: [] });
      const entry = members.get(id);
      if (!entry.editions.some((e) => e.set_code === edition.set_code && e.set_rarity === edition.set_rarity))
        entry.editions.push(edition);
    }
  }
  return index;
}

export function officialDraft(set, members) {
  if (!members?.size) throw Error("Esta edición todavía no tiene cartas vinculadas en la fuente.");
  const entries = [...members.values()].map(({ id, editions }) => ({
    id, copies: 1, remaining: 1,
    rarity: editions.find((e) => Object.hasOwn(names, e.set_rarity))?.set_rarity || "Common",
  }));
  for (const entry of entries) entry.remaining = entry.copies = ({ Rare: 5, 'Super Rare': 3 }[entry.rarity] || 1);
  return {
    boxPacks: Math.max(100, Math.ceil(entries.reduce((n, e) => n + e.copies, 0) / Math.min(5, entries.length))),
    kind: "pack", name: set.set_name, description: "", status: "draft", cost: 5,
    size: Math.min(5, entries.length), coverId: entries[0].id, entries,
    officialSource: { name: set.set_name, code: set.set_code, date: set.tcg_date || "", format: setFormat(set) },
  };
}

export function filterSets(sets, { search = "", year = "", format = "TCG", order = "oldest" } = {}) {
  const term = search.trim().toLocaleLowerCase("es");
  return sets.filter((set) => (!format || setFormat(set) === format) &&
    (!term || set.set_name.toLocaleLowerCase("es").includes(term)) &&
    (!year || (year === "unknown" ? !set.tcg_date : set.tcg_date?.startsWith(year))))
    .sort((a, b) => {
      if (order === "name") return a.set_name.localeCompare(b.set_name);
      if (!a.tcg_date || !b.tcg_date) return Number(!a.tcg_date) - Number(!b.tcg_date) || a.set_name.localeCompare(b.set_name);
      return (order === "newest" ? -1 : 1) * a.tcg_date.localeCompare(b.tcg_date) || a.set_name.localeCompare(b.set_name);
    });
}
