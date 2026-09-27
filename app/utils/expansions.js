import { byId, names } from "./catalog.js";
import { formatOf, allowCards } from './formats.js';

export function hasDraftChanges(data, saved) {
  if (!saved) return Boolean(Object.keys(data.draft).length || data.draftName.trim() ||
    data.draftDescription.trim() || data.draftCover || data.draftSource ||
    data.draftKind !== "pack" || (data.draftFormat && data.draftFormat !== 'official') || Number(data.draftCost) !== 5 || Number(data.draftSize) !== 5 || Number(data.draftBoxPacks || 0) !== 100);
  return (data.draftFormat || 'official') !== formatOf(saved) || data.draftName.trim() !== saved.name || data.draftDescription.trim() !== (saved.description || "") ||
    data.draftKind !== (saved.kind || "pack") || Number(data.draftCost) !== saved.cost ||
    (data.draftKind !== "starter" && Number(data.draftSize) !== saved.size) ||
    (data.draftKind !== "starter" && Number(data.draftBoxPacks || 0) !== (saved.boxPacks || 0)) ||
    (data.draftCover || Object.keys(data.draft)[0]) !== (saved.coverId || saved.entries[0]?.id) ||
    Object.keys(data.draft).length !== saved.entries.length ||
    saved.entries.some((entry) => Number(data.draft[entry.id]) !== entry.copies ||
      (data.draftRarities[entry.id] || byId.get(entry.id)?.rarity) !== (entry.rarity || byId.get(entry.id)?.rarity));
}

export const remainingCards = (pack) =>
  pack.entries.reduce((sum, entry) => sum + entry.remaining, 0);
export const totalCards = (pack) =>
  pack.entries.reduce((sum, entry) => sum + entry.copies, 0);
export function fillCommons(entries, size, packs) {
  const target = size * packs;
  if (!Number.isInteger(size) || size < 1 || size > 5 || !Number.isInteger(packs) || packs < 1 || target > 100000)
    throw Error('Elegí un tamaño y una cantidad de sobres válidos (hasta 100.000 cartas).');
  if (entries.some(e => !Number.isInteger(e.copies) || e.copies < 1 || e.copies > 1000))
    throw Error('Revisá las copias: cada carta admite de 1 a 1.000.');
  const result = entries.map(e => ({ ...e }));
  let missing = target - totalCards({ entries });
  if (missing < 0) throw Error('Las copias actuales superan la capacidad. Aumentá los sobres o reducí copias manualmente.');
  const commons = result.filter(e => (e.rarity || byId.get(e.id)?.rarity) === 'Common');
  if (missing > commons.reduce((n, e) => n + 1000 - e.copies, 0))
    throw Error('Agregá más cartas comunes: no alcanzan para completar la caja con hasta 1.000 copias por carta.');
  while (missing) {
    for (const entry of commons) {
      if (entry.copies < 1000) { entry.copies++; missing--; }
      if (!missing) break;
    }
  }
  return result;
}
export function packCard(pack, id) {
  const card = byId.get(String(id));
  const entry = pack.entries.find((e) => e.id === String(id));
  return {
    ...card,
    rarity: entry?.rarity || card.rarity,
    code: pack.code || card.code,
  };
}
export function raritySummary(pack) {
  const total = totalCards(pack);
  return Object.entries(names).map(([rarity, label]) => {
    const entries = pack.entries.filter(
      (e) => (e.rarity || byId.get(e.id)?.rarity) === rarity,
    );
    const copies = entries.reduce((n, e) => n + e.copies, 0);
    return {
      rarity,
      label,
      copies,
      remaining: entries.reduce((n, e) => n + e.remaining, 0),
      percent: total ? (copies / total) * 100 : 0,
    };
  });
}

// Preserve stock when only presentation or publication changes. Content edits refill explicitly.
export function saveExpansion(state, pack, refill = false) {
  const existing = state.economy.customPacks.find((p) => p.id === pack.id);
  if (existing && formatOf(existing) !== formatOf(pack)) throw Error('Duplicá el producto para publicarlo en otro formato. Las copias anteriores conservan su origen.');
  const changed =
    existing &&
    ((existing.kind || "pack") !== (pack.kind || "pack") ||
      existing.size !== pack.size ||
      existing.entries.length !== pack.entries.length ||
      pack.entries.some((entry) => {
        const old = existing.entries.find((e) => e.id === entry.id);
        return (
          !old ||
          old.copies !== entry.copies ||
          (old.rarity || byId.get(old.id)?.rarity) !== entry.rarity
        );
      }));
  if (changed && !refill && pack.kind !== "starter")
    throw Error(
      "El contenido cambió. Confirmá que querés reponer la caja al guardar.",
    );
  if (existing && !changed && !refill)
    pack.entries.forEach((entry) => {
      entry.remaining = existing.entries.find(
        (e) => e.id === entry.id,
      ).remaining;
    });
  const index = state.economy.customPacks.findIndex((p) => p.id === pack.id);
  if (index >= 0) state.economy.customPacks[index] = pack;
  else state.economy.customPacks.push(pack);
  if (pack.status !== 'draft') allowCards(state, formatOf(pack), pack.entries.map((e) => e.id));
}
