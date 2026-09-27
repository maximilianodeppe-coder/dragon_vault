import cards from "../data/cards.json" with { type: "json" };
import starters from "../data/starters.json" with { type: "json" };
export { cards, starters };
export const byId = new Map(cards.map((c) => [String(c.id), c]));
export const allCards = [...cards];
export let catalogMetadata = null;
export let spanishMetadata = null;
export let pendingTextChanges = [];
export const cardFamily = id => String(byId.get(String(id))?.baseCardId || id);
export const familyCopies = (deck, id) => Object.entries(deck?.cards || {})
  .reduce((n, [key, count]) => n + (cardFamily(key) === cardFamily(id) ? count : 0), 0);
function addErrataVariants(target, sources = new Map()) {
  for (const original of cards.filter(c => c.historical?.classification === 'functional')) {
    const baseId = String(original.id), source = sources.get(baseId);
    const base = target.get(baseId);
    const currentText = source?.desc || original.desc_en;
    const unchanged = currentText === original.desc_en;
    target.set(baseId + ':errata', {
      ...base, id: baseId + ':errata', baseCardId: baseId, postErrata: true,
      name_es: original.name_es + ' · post-errata',
      name_en: original.name_en + ' · post-errata',
      historical: undefined, obtainable: [], set: '',
      desc_en: currentText, desc_es: unchanged ? original.desc_es : currentText,
      language: unchanged ? 'es' : 'en',
      translationSource: unchanged ? 'Konami · texto actual conservado' : undefined,
    });
  }
}
export function registerSpanish(snapshot) {
  if (!snapshot?.data || Object.keys(snapshot.data).length < 10000)
    throw Error("No se pudo cargar la traducción española.");
  for (const [id, text] of Object.entries(snapshot.data)) {
    const card = byId.get(id);
    if (
      !card ||
      typeof text.name !== "string" ||
      typeof text.text !== "string" ||
      !text.text.trim()
    )
      continue;
    if (card.postErrata && text.englishText !== card.desc_en) continue;
    card.name_es = text.name + (card.postErrata ? ' · post-errata' : '');
    card.desc_es = text.text;
    card.language = "es";
    card.translationSource = text.source;
  }
  spanishMetadata = snapshot.metadata;
}

export function registerCatalog(snapshot) {
  if (
    !Array.isArray(snapshot?.data) ||
    snapshot.data.length < 10000 ||
    snapshot.metadata?.count !== snapshot.data.length
  )
    throw Error("El catálogo completo no está disponible.");
  const originals = new Map(cards.map((c) => [String(c.id), c]));
  const next = new Map();
  for (const source of snapshot.data) {
    if (
      !Number.isSafeInteger(source.id) ||
      source.id <= 0 ||
      next.has(String(source.id)) ||
      !source.name ||
      typeof source.desc !== "string" ||
      !source.type
    )
      throw Error("Hay registros no válidos en el catálogo.");
    const editions = source.card_sets || [];
    const rarity =
      editions.find((e) => Object.hasOwn(names, e.set_rarity))?.set_rarity ||
      "Common";
    next.set(String(source.id), {
      id: source.id,
      name_en: source.name,
      name_es: source.name,
      desc_en: source.desc,
      desc_es: source.desc,
      language: "en",
      type: source.type,
      frameType: source.frameType,
      race: source.race,
      attribute: source.attribute,
      atk: source.atk,
      def: source.def,
      level: source.level,
      scale: source.scale,
      linkval: source.linkval,
      linkmarkers: source.linkmarkers,
      archetype: source.archetype || "",
      formats: source.misc_info?.[0]?.formats || [],
      cid: source.misc_info?.[0]?.konami_id,
      source_url: source.ygoprodeck_url,
      code: String(source.id).padStart(8, "0"),
      set: "",
      rarity,
      image: `/api/card-image/${source.id}`,
      obtainable: [],
      ...originals.get(String(source.id)),
      officialSets: editions,
    });
    if (originals.has(String(source.id)))
      next.get(String(source.id)).language = "es";
  }
  for (const c of cards) if (!next.has(String(c.id))) next.set(String(c.id), c);
  addErrataVariants(next, new Map(snapshot.data.map(c => [String(c.id), c])));
  allCards.splice(0, allCards.length, ...next.values());
  byId.clear();
  next.forEach((card, id) => byId.set(id, card));
  catalogMetadata = snapshot.metadata;
  pendingTextChanges = snapshot.textChanges || [];
}

export const isPublished = (pack) => pack.status !== "draft";
export const starterProducts = (state) => [
  ...state.economy.customPacks
    .filter((p) => p.kind === "starter" && isPublished(p))
    .map((p) => ({
      ...p,
      entries: p.entries.map((e) => ({
        ...e,
        quantity: e.copies,
        code: p.code || p.name,
      })),
    })),
];
export const isExtraDeck = (card) =>
  /Fusion|Synchro|XYZ|Link/.test(card?.type || "");
export const isDeckCard = (card) =>
  card && !["Token", "Skill Card"].includes(card.type);

// Only deliberately enabled cards (or already owned cards) join the game.
export function gameCards(state) {
  const active = new Set();
  const prints = new Map();
  for (const pack of state.economy.customPacks.filter(isPublished)) {
    for (const entry of pack.entries) {
      active.add(entry.id);
      const editions = prints.get(entry.id) || [];
      editions.push({
        set: pack.id,
        code: pack.code || pack.name,
        rarity: entry.rarity || byId.get(entry.id)?.rarity,
      });
      prints.set(entry.id, editions);
    }
  }
  for (const [id, count] of Object.entries(state.owned))
    if (count > 0) active.add(id);
  for (const offer of state.economy.offers) active.add(offer.id);
  return [...active]
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((c) => ({
      ...c,
      obtainable: [
        ...(prints.get(String(c.id)) || []),
      ],
    }));
}
export const names = {
  Common: "Común",
  Rare: "Rara",
  "Super Rare": "Súper Rara",
  "Ultra Rare": "Ultra Rara",
  "Secret Rare": "Secreta",
};
export const types = {
  "Ritual Monster": "Monstruo de ritual",
  "Ritual Effect Monster": "Monstruo de ritual y efecto",
  "Toon Monster": "Monstruo Toon",
  "Normal Monster": "Monstruo normal",
  "Effect Monster": "Monstruo de efecto",
  "Flip Effect Monster": "Monstruo de volteo",
  "Fusion Monster": "Monstruo de fusión",
  "Spell Card": "Carta mágica",
  "Trap Card": "Carta de trampa",
  "Synchro Monster": "Monstruo de Sincronía",
  "Synchro Tuner Monster": "Monstruo de Sincronía / Cantante",
  "XYZ Monster": "Monstruo Xyz",
  "Link Monster": "Monstruo de Enlace",
  "Pendulum Effect Monster": "Monstruo de Péndulo / efecto",
  "Pendulum Normal Monster": "Monstruo de Péndulo / normal",
  "Tuner Monster": "Monstruo Cantante",
  Token: "Ficha",
  "Skill Card": "Carta de habilidad",
};
export const attrs = {
  DARK: "Oscuridad",
  LIGHT: "Luz",
  EARTH: "Tierra",
  WATER: "Agua",
  FIRE: "Fuego",
  WIND: "Viento",
  DIVINE: "Divinidad",
};
export const races = {
  Dragon: "Dragón",
  Spellcaster: "Lanzador de Conjuros",
  Warrior: "Guerrero",
  "Beast-Warrior": "Guerrero-Bestia",
  Beast: "Bestia",
  "Winged Beast": "Bestia Alada",
  Fiend: "Demonio",
  Fairy: "Hada",
  Insect: "Insecto",
  Dinosaur: "Dinosaurio",
  Reptile: "Reptil",
  Fish: "Pez",
  "Sea Serpent": "Serpiente Marina",
  Aqua: "Aqua",
  Pyro: "Piro",
  Thunder: "Trueno",
  Rock: "Roca",
  Plant: "Planta",
  Machine: "Máquina",
  Zombie: "Zombi",
  Normal: "Normal",
  Equip: "Equipo",
  Field: "Campo",
  Continuous: "Continua",
  Counter: "Contraefecto",
  "Quick-Play": "Juego Rápido",
  Ritual: "Ritual",
  Cyberse: "Ciberso",
  Wyrm: "Wyrm",
  Psychic: "Psíquico",
  "Divine-Beast": "Bestia Divina",
  "Creator-God": "Dios Creador",
  Illusion: "Ilusión",
};
export const SETS = [
  {
    id: "LOB",
    name: "Legend of Blue Eyes White Dragon",
    es: "La leyenda del Dragón Blanco",
    hero: "Blue-Eyes White Dragon",
    subtitle: "El origen de la leyenda.",
  },
  {
    id: "MRD",
    name: "Metal Raiders",
    es: "Invasores de Metal",
    hero: "Summoned Skull",
    subtitle: "El poder de los invasores.",
  },
  {
    id: "SRL",
    name: "Spell Ruler",
    es: "Señor de la Magia",
    hero: "Relinquished",
    subtitle: "Dominá el poder de la magia.",
  },
];
export const rarityClass = (c) =>
  ({
    Common: "rarity-common",
    Rare: "rarity-rare",
    "Super Rare": "rarity-super",
    "Ultra Rare": "rarity-ultra",
    "Secret Rare": "rarity-secret",
  })[c.rarity];
export const image = (c) =>
  c?.image
    ? c.image.startsWith("/")
      ? c.image
      : "/" + c.image
    : "/assets/card-back.jpg";
export const print = (c, set) => ({
  ...c,
  ...c.obtainable?.find((p) => p.set === set),
});
export const productName = (id) =>
  [...SETS, ...starters].find((p) => p.id === id)?.name || id;

addErrataVariants(byId);
allCards.splice(0, allCards.length, ...byId.values());
