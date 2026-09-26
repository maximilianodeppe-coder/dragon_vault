"use strict";
import { addCopies, lotKey, lotsFor, isSellable } from "./inventory.js";
import { isDeckCard, isExtraDeck } from "./catalog.js";
import { formatOf, ownedInFormat, formatLimit } from './formats.js';
const rarities = ["Common", "Rare", "Super Rare", "Ultra Rare", "Secret Rare"];
const integer = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
function defaults(cards) {
  return {
    prices: Object.fromEntries(
      rarities.map((r, i) => [
        r,
        { sell: [1, 3, 7, 15, 20][i], buy: [5, 12, 28, 60, 80][i] },
      ]),
    ),
    offers: rarities.flatMap((r) =>
      cards
        .filter((c) => c.rarity === r)
        .slice(0, 2)
        .map((c) => ({ id: String(c.id), stock: 3 })),
    ),
    customPacks: [],
  };
}
function validate(e, cards) {
  if (e === undefined) return defaults(cards);
  const ids = new Set(cards.map((c) => String(c.id)));
  if (
    !e ||
    typeof e !== "object" ||
    !e.prices ||
    !Array.isArray(e.offers) ||
    e.offers.length > 500 ||
    !Array.isArray(e.customPacks) ||
    e.customPacks.length > 100
  )
    throw Error("Configuración de tienda no válida");
  for (const r of rarities) {
    const p = e.prices[r];
    if (
      !p ||
      !integer(p.sell, 0, 10000) ||
      !integer(p.buy, 1, 100000) ||
      p.buy <= p.sell
    )
      throw Error("El precio de compra debe superar el de venta");
  }
  const seen = new Set();
  for (const o of e.offers) {
    if (!o || !ids.has(o.id) || seen.has(o.id) || !integer(o.stock, 0, 100000))
      throw Error("Oferta no válida");
    seen.add(o.id);
    if (o.price !== undefined && !integer(o.price, 1, 100000))
      throw Error(
        "El precio de cada carta debe ser un entero entre 1 y 100000 monedas",
      );
  }
  seen.clear();
  for (const p of e.customPacks) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^custom-[\w-]{1,70}$/.test(p.id) ||
      seen.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 160 ||
      !integer(p.cost, 1, 100000) ||
      !integer(p.size, 1, 5) ||
      !Array.isArray(p.entries) ||
      !p.entries.length ||
      p.entries.length > cards.length
    )
      throw Error("Sobre personalizado no válido");
    seen.add(p.id);
    if (p.officialSource !== undefined) {
      const source = p.officialSource;
      if (!source || typeof source.name !== "string" || !source.name.trim() || source.name.length > 160 ||
          typeof source.code !== "string" || !/^[A-Z0-9-]{1,12}$/.test(source.code) ||
          typeof source.date !== "string" || (source.date && !/^\d{4}-\d{2}-\d{2}$/.test(source.date)) ||
          !["TCG", "Speed Duel", "Rush Duel"].includes(source.format))
        throw Error("La referencia de la expansión oficial no es válida");
    }
    if (p.kind !== undefined && !["pack", "starter"].includes(p.kind))
      throw Error("Tipo de producto no válido");
    if (p.status !== undefined && !["draft", "published"].includes(p.status))
      throw Error("Estado de expansión no válido");
    if (
      p.code !== undefined &&
      (typeof p.code !== "string" || !/^[A-Z0-9-]{0,12}$/.test(p.code))
    )
      throw Error(
        "Usá hasta 12 letras mayúsculas, números o guiones para el código",
      );
    if (
      p.description !== undefined &&
      (typeof p.description !== "string" || p.description.length > 600)
    )
      throw Error("La descripción admite hasta 600 caracteres");
    if (
      p.coverId &&
      (typeof p.coverId !== "string" ||
        !p.entries.some((e) => e.id === p.coverId))
    )
      throw Error("La carta de portada debe pertenecer a la expansión");
    const entries = new Set();
    let total = 0;
    for (const v of p.entries) {
      if (
        !v ||
        !ids.has(v.id) ||
        entries.has(v.id) ||
        !integer(v.copies, 1, 1000) ||
        !integer(v.remaining, 0, v.copies)
      )
        throw Error("Contenido del sobre no válido");
      entries.add(v.id);
      if (v.rarity !== undefined && !rarities.includes(v.rarity))
        throw Error("Rareza de expansión no válida");
      total += v.copies;
    }
    if (total < p.size || total > 100000)
      throw Error("Cantidad de cartas del sobre no válida");
  }
  return e;
}
function price(state, card, kind) {
  return state.economy.prices[card.rarity][kind];
}
function shopPrice(state, id) {
  return (
    state.economy.offers.find((o) => o.id === String(id))?.price ??
    state.economy.prices.Common.buy
  );
}
function protectedCopies(state, id, formatId) {
  if (formatId === undefined) return [...new Set(state.decks.map(formatOf))].reduce((n, f) => n + protectedCopies(state, id, f), 0);
  return Math.max(0, ...state.decks.filter((d) => formatOf(d) === formatId).map((d) => d.cards[id] || 0));
}
function quoteSale(state, cards, items) {
  const byId = new Map(cards.map((c) => [String(c.id), c]));
  let coins = 0,
    count = 0;
  const seen = new Set();
  const sold = {};
  for (const item of items) {
    const c = byId.get(item.id);
    const lots = lotsFor(state, item.id);
    const lot = item.lot
      ? lots.find((l) => lotKey(l) === item.lot)
      : lots.length === 1
        ? lots[0]
        : null;
    const key = item.id + ":" + (lot ? lotKey(lot) : "");
    const group = item.id + ':' + formatOf(lot);
    sold[group] = (sold[group] || 0) + item.quantity;
    if (
      !c ||
      !lot ||
      !isSellable(lot) ||
      seen.has(key) ||
      !integer(item.quantity, 1, 1e7) ||
      item.quantity > lot.quantity ||
      sold[group] >
        ownedInFormat(state, item.id, formatOf(lot)) - protectedCopies(state, item.id, formatOf(lot))
    )
      throw Error("No podés vender copias que no tenés o que están en un mazo");
    seen.add(key);
    coins += price(state, lot, "sell") * item.quantity;
    count += item.quantity;
  }
  if (!count) throw Error("No hay cartas para vender");
  if (state.coins + coins > 1e9) throw Error("Se alcanzó el límite de monedas");
  return { coins, count };
}
function sell(state, cards, items) {
  const quote = quoteSale(state, cards, items);
  for (const item of items) {
    const lots = lotsFor(state, item.id);
    const lot = item.lot ? lots.find((l) => lotKey(l) === item.lot) : lots[0];
    lot.quantity -= item.quantity;
    state.inventory[item.id] = lots.filter((l) => l.quantity > 0);
    if (!state.inventory[item.id].length) delete state.inventory[item.id];
    state.owned[item.id] -= item.quantity;
    if (!state.owned[item.id]) delete state.owned[item.id];
  }
  state.coins += quote.coins;
  return quote;
}
function excess(state) {
  return Object.keys(state.owned).flatMap((id) => [...new Set(lotsFor(state, id).map(formatOf))].flatMap((formatId) => {
    const lots = lotsFor(state, id).filter((l) => formatOf(l) === formatId);
    const n = ownedInFormat(state, id, formatId);
    const eligible = lots.filter(isSellable);
    const eligibleCount = eligible.reduce((sum, l) => sum + l.quantity, 0);
    let remaining = Math.max(
      0,
      eligibleCount -
        Math.max(3, protectedCopies(state, id, formatId) - (n - eligibleCount)),
    );
    return [...lots]
      .filter(isSellable)
      .sort((a, b) => price(state, a, "sell") - price(state, b, "sell"))
      .flatMap((l) => {
        const quantity = Math.min(remaining, l.quantity);
        remaining -= quantity;
        return quantity
          ? [
              {
                id,
                lot: lotKey(l),
                rarity: l.rarity,
                sourceName: l.sourceName,
                quantity,
              },
            ]
          : [];
      });
  }));
}
function buy(state, cards, id) {
  const c = cards.find((c) => String(c.id) === id),
    offer = state.economy.offers.find((o) => o.id === id);
  if (!c || !offer || offer.stock < 1)
    throw Error("Esta carta no está disponible en la tienda");
  if (!formatLimit(state, 'official', id)) throw Error('La tienda pertenece al formato Oficial. Esta carta no está permitida allí.');
  const cost = shopPrice(state, id);
  if (!integer(cost, 1, 100000)) throw Error("Precio de tienda no válido");
  if (state.coins < cost) throw Error("No tenés monedas suficientes");
  if ((state.owned[id] || 0) >= 1e7) throw Error("Límite de copias alcanzado");
  state.coins -= cost;
  addCopies(state, id, 1, {
    source: "shop",
    sourceName: "Tienda",
    rarity: "Common",
  });
  offer.stock--;
  return cost;
}
function draw(state, cards, id, random) {
  const pack = state.economy.customPacks.find((p) => p.id === id);
  if (!pack || pack.status === "draft" || pack.kind === "starter")
    throw Error("Publicá la expansión para poder abrir sus sobres");
  if (state.coins < pack.cost) throw Error("No tenés monedas suficientes");
  const pool = pack.entries.map((e) => ({ ...e })),
    result = [];
  let total = pool.reduce((n, e) => n + e.remaining, 0);
  if (!total) throw Error("Esta caja especial está agotada");
  for (let i = 0; i < pack.size && total; i++) {
    let ticket = random(total);
    if (!integer(ticket, 0, total - 1)) throw Error("Sorteo no válido");
    for (const e of pool) {
      if (ticket < e.remaining) {
        e.remaining--;
        total--;
        result.push(e.id);
        break;
      }
      ticket -= e.remaining;
    }
  }
  const gains = {};
  for (const id of result) gains[id] = (gains[id] || 0) + 1;
  for (const [id, n] of Object.entries(gains))
    if ((state.owned[id] || 0) + n > 1e7)
      throw Error("Límite de copias alcanzado");
  pack.entries = pool;
  state.coins -= pack.cost;
  for (const [id, n] of Object.entries(gains))
    addCopies(state, id, n, {
      source: pack.id,
      formatId: formatOf(pack),
      sourceName: pack.name,
      rarity:
        pack.entries.find((e) => e.id === id).rarity ||
        cards.find((c) => String(c.id) === id).rarity,
    });
  state.packs++;
  return result;
}
export default {
  defaults,
  validate,
  price,
  shopPrice,
  protectedCopies,
  quoteSale,
  sell,
  excess,
  buy,
  draw,
};
