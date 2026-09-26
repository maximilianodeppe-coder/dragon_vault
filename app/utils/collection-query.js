const normalize = (s) =>
  String(s || "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
const collator = new Intl.Collator("es", { numeric: true });
function query(cards, owned, f) {
  const ranges = ["atk", "def", "level", "copies"];
  for (const key of ranges) {
    for (const edge of ["Min", "Max"])
      if (
        f[key + edge] !== "" &&
        f[key + edge] != null &&
        (!Number.isFinite(Number(f[key + edge])) || Number(f[key + edge]) < 0)
      )
        return {
          cards: [],
          error: "Ingresá valores numéricos mayores o iguales a cero.",
        };
    if (
      f[key + "Min"] !== "" &&
      f[key + "Max"] !== "" &&
      f[key + "Min"] != null &&
      f[key + "Max"] != null &&
      Number(f[key + "Min"]) > Number(f[key + "Max"])
    )
      return {
        cards: [],
        error:
          "El mínimo no puede superar el máximo (" + key.toUpperCase() + ").",
      };
  }
  const has = (values, value) => !values?.length || values.includes(value),
    q = normalize(f.search);
  const result = cards.filter((c) => {
    const copies = owned[c.id] || 0,
      category = c.type.includes("Monster")
        ? "monster"
        : c.type === "Spell Card"
          ? "spell"
          : c.type === "Trap Card"
            ? "trap"
            : "other";
    if (f.archetype && !normalize(c.archetype).includes(normalize(f.archetype)))
      return false;
    if (
      f.officialSet &&
      !(c.officialSets || []).some((e) =>
        normalize(e.set_name).includes(normalize(f.officialSet)),
      )
    )
      return false;
    if (
      (f.set &&
        !(
          c.ownedLots?.length
            ? c.ownedLots.map((l) => ({ set: l.source }))
            : c.obtainable || [{ set: c.set }]
        ).some((p) => p.set === f.set)) ||
      (f.rarity &&
        (c.ownedLots?.length
          ? !c.ownedLots.some(
              (l) => l.rarity === f.rarity && (!f.set || l.source === f.set),
            )
          : (c.obtainable?.find((p) => p.set === f.set)?.rarity || c.rarity) !==
            f.rarity)) ||
      (f.onlyOwned && !copies) ||
      (f.ownership === "missing" && copies) ||
      (f.ownership === "duplicates" && copies < 2)
    )
      return false;
    if (
      !has(f.attributes, c.attribute) ||
      !has(f.races, c.race) ||
      !has(f.categories, category) ||
      !has(f.types, c.type) ||
      !has(f.properties, c.race)
    )
      return false;
    for (const key of ranges) {
      const n = key === "copies" ? copies : c[key],
        lo = f[key + "Min"],
        hi = f[key + "Max"];
      if ((lo !== "" && lo != null) || (hi !== "" && hi != null)) {
        if (n == null || n < 0) return false;
        if (
          (lo !== "" && lo != null && n < Number(lo)) ||
          (hi !== "" && hi != null && n > Number(hi))
        )
          return false;
      }
    }
    const text =
      c.name_es +
      " " +
      c.name_en +
      " " +
      c.id +
      (f.searchEffect ? " " + (c.historical?.text || c.desc_es) : "");
    return normalize(text).includes(q);
  });
  const rank = {
    Common: 0,
    Rare: 1,
    "Super Rare": 2,
    "Ultra Rare": 3,
    "Secret Rare": 4,
  };
  const key = !f.sort || f.sort === "code" ? "name" : f.sort,
    direction = f.direction === "desc" ? -1 : 1;
  const value = (c) =>
    key === "copies"
      ? owned[c.id] || 0
      : key === "rarity"
        ? rank[c.obtainable?.find((p) => p.set === f.set)?.rarity || c.rarity]
        : key === "name"
          ? c.name_es
          : key === "name_en"
            ? c.name_en
            : key === "set"
              ? c.set
              : c[key];
  result.sort((a, b) => {
    const av = value(a),
      bv = value(b),
      missing = (v) => v == null || (typeof v === "number" && v < 0);
    if (missing(av) || missing(bv))
      return missing(av) === missing(bv)
        ? String(a.id).localeCompare(String(b.id))
        : missing(av)
          ? 1
          : -1;
    const delta =
      typeof av === "number"
        ? av - bv
        : collator.compare(String(av), String(bv));
    return delta * direction || String(a.id).localeCompare(String(b.id));
  });
  return { cards: result, error: "" };
}
export default query;
