import BOX from "./boxes.js";
import Economy from "./economy-engine.js";
import {
  cards,
  byId,
  starterProducts,
  isExtraDeck,
  isDeckCard,
  allCards,
  familyCopies,
} from "./catalog.js";
import { deckCounts } from "./progress.js";
import { addCopies, editionFor } from "./inventory.js";
import { cardLimit, groupAllowance } from "./banlists.js";
import { deckRules, canSaveStarter } from './deck-rules.js';
import { formatOf, ownedInFormat } from './formats.js';

export function random(n) {
  const values = new Uint32Array(1),
    limit = Math.floor(4294967296 / n) * n;
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % n;
}

export function openBox(state, set, draw = random) {
  if (state.coins < 5) throw Error("Necesitás 5 monedas para abrir un sobre.");
  const box = state.boxes[set];
  if (!box || !BOX.total(box))
    throw Error("La caja está agotada. Reiniciala para abrir más sobres.");
  const ids = BOX.draw(box, draw);
  for (const id of ids) addCopies(state, id, 1, editionFor(byId.get(id), set));
  state.coins -= 5;
  state.packs++;
  return ids;
}

export function grantStarter(state, id, createDeck, deckId) {
  const starter = starterProducts(state).find((s) => s.id === id);
  if (!starter) throw Error("Mazo de inicio no válido.");
  createDeck = createDeck && canSaveStarter(starter);
  Economy.validate(state.economy, allCards);
  if (state.coins < starter.cost)
    throw Error(`Necesitás ${starter.cost} monedas para comprar este mazo.`);
  if (createDeck && state.decks.length >= 200)
    throw Error("Límite de 200 mazos.");
  for (const entry of starter.entries) {
    if ((state.owned[entry.id] || 0) + entry.quantity > 1e7)
      throw Error("Límite de copias alcanzado.");
  }
  state.coins -= starter.cost;
  for (const entry of starter.entries)
    addCopies(
      state,
      entry.id,
      entry.quantity,
      starter.kind === "starter"
        ? {
            source: id,
            formatId: formatOf(starter),
            sourceName: starter.name,
            rarity: entry.rarity || byId.get(String(entry.id)).rarity,
          }
        : editionFor(byId.get(String(entry.id)), id, starter.name),
    );
  if (createDeck)
    state.decks.push({
      id: deckId,
      formatId: formatOf(starter),
      name: starter.name,
      cards: Object.fromEntries(
        starter.entries.map((e) => [String(e.id), e.quantity]),
      ),
    });
}

export function changeDeck(state, deckId, id, delta) {
  const deck = state.decks.find((d) => d.id === deckId),
    card = byId.get(String(id));
  if (!deck || !card) throw Error("Elegí un mazo y una carta primero.");
  if (!isDeckCard(card))
    throw Error("Las fichas y cartas de habilidad no se agregan al mazo.");
  const next = (deck.cards[id] || 0) + delta;
  if (delta > 0) {
    if (familyCopies(deck, id) + delta > 3)
      throw Error('Máximo 3 copias entre las variantes pre y post-errata de la misma carta.');
    const limit = cardLimit(state, deck, id);
    if (delta > groupAllowance(state, deck, id))
      throw Error('Alcanzaste el cupo compartido de esta categoría de la banlist. Quitá una carta del mismo grupo primero.');
    if (next > limit)
      throw Error(
        limit === 0
          ? "Esta carta está prohibida o fuera de la lista de permitidas del formato o la banlist."
          : `El formato o la banlist permite hasta ${limit} copias de esta carta.`,
      );
    if (next > Math.min(3, ownedInFormat(state, id, formatOf(deck))))
      throw Error("No hay más copias obtenidas en este formato para el mazo.");
    const count = deckCounts(deck),
      fusion = isExtraDeck(card);
    const rules = deckRules(deck);
    if ((fusion ? count.extra : count.main) + delta > (fusion ? rules.extra : rules.main))
      throw Error("Alcanzaste el límite de cartas.");
  }
  if (next <= 0) delete deck.cards[id];
  else deck.cards[id] = next;
}

export { BOX, Economy };
