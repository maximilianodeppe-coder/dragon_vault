<script setup>
import { byId, print, isExtraDeck, isDeckCard, familyCopies } from "~/utils/catalog.js";
import { deckCounts } from "~/utils/progress.js";
import { changeDeck } from "~/utils/actions.js";
import { deckRules } from '~/utils/deck-rules.js';
import { groupCounts, groupAllowance, restrictionStyle } from '~/utils/banlists.js';
import query from "~/utils/collection-query.js";
import { defaultFilters } from "~/utils/filters.js";
import { formatOf, formatOwned, formatName } from '~/utils/formats.js';
import {
  cardLimit,
  banlistConflicts,
  activeBanlist,
} from "~/utils/banlists.js";
const vault = useVault(),
  { data } = vault;
const filters = ref({
    ...defaultFilters(),
    onlyOwned: true,
    searchEffect: true,
  }),
  available = ref(false),
  drag = ref(null),
  hover = ref("");
const formatId = ref(data.currentDeck ? formatOf(data.progress.decks.find((d) => d.id === data.currentDeck)) : data.activeFormat);
const newRuleset = ref('standard');
watch(formatId, (id) => { data.activeFormat = id; });
const formatDecks = computed(() => data.progress.decks.filter((d) => formatOf(d) === formatId.value));
const owned = computed(() => formatOwned(data.progress, formatId.value));
const deck = computed(
  () =>
    formatDecks.value.find((d) => d.id === data.currentDeck) ||
    formatDecks.value[0],
);
const count = computed(() =>
  deck.value ? deckCounts(deck.value) : { main: 0, extra: 0 },
);
const limit = (id) => cardLimit(data.progress, deck.value, id);
const conflicts = computed(() => banlistConflicts(data.progress, deck.value));
const rules = computed(() => deckRules(deck.value));
const groups = computed(() => groupCounts(data.progress, deck.value));
async function selectRules(event) { if (!(await vault.request('deckUpdate', { id: deck.value.id, field: 'ruleset', value: event.target.value })).ok) event.target.value = deck.value?.ruleset || 'standard'; }
const selectedBanlist = computed(() =>
  activeBanlist(data.progress, deck.value),
);
const groupOf = id => restrictionStyle(selectedBanlist.value, id) === 'shared' ? selectedBanlist.value.limits[id] : undefined;
async function selectBanlist(event) { if (!(await vault.request('deckUpdate', { id: deck.value.id, field: 'banlistId', value: event.target.value })).ok) event.target.value = deck.value?.banlistId || ''; }
const result = computed(() =>
  query(vault.gameCards.value.filter(isDeckCard), owned.value, {
    ...filters.value,
    onlyOwned: true,
  }),
);
const free = (id) =>
  Math.max(
    0,
    Math.min(3 - familyCopies(deck.value, id), groupAllowance(data.progress, deck.value, id),
      Math.min(limit(id), owned.value[id] || 0) - (deck.value?.cards[id] || 0)),
  );
const library = computed(() =>
  result.value.cards.filter((c) => !available.value || free(c.id)),
);
const entries = (area) =>
  Object.entries(deck.value?.cards || {})
    .filter(([id]) => isExtraDeck(byId.get(id)) === (area === "extra"))
    .flatMap(([id, n]) =>
      Array.from({ length: n }, (_, i) => ({
        card: byId.get(id),
        key: id + "-" + i,
      })),
    );
const composition = computed(() =>
  ["Monstruos", "Mágicas", "Trampas"]
    .map(
      (label, i) =>
        label +
        ": " +
        Object.entries(deck.value?.cards || {}).reduce((n, [id, copies]) => {
          const c = byId.get(id);
          return (
            n +
            ((
              i === 0
                ? c.type.includes("Monster") && !isExtraDeck(c)
                : i === 1
                  ? c.type === "Spell Card"
                  : c.type === "Trap Card"
            )
              ? copies
              : 0)
          );
        }, 0),
    )
    .join(" · "),
);
async function create() { const result = await vault.request('deckCreate', { formatId: formatId.value, ruleset: newRuleset.value }); if (result.ok) data.currentDeck = result.result; }
function change(id, delta) { return vault.request('deckChange', { id: deck.value?.id, cardId: String(id), delta }); }
async function rename(event) { const result = await vault.request('deckUpdate', { id: deck.value.id, field: 'name', value: event.target.value.trim() || 'Mi mazo' }); if (!result.ok) event.target.value = deck.value.name; }
function remove() { const id = deck.value.id; vault.confirm('¿Eliminar este mazo?', 'Las cartas seguirán en tu colección.', async () => { if ((await vault.request('deckDelete', { id })).ok) data.dialog = null; }, 'Eliminar mazo'); }
function start(event, id, origin) {
  drag.value = { id, origin, deckId: deck.value.id };
  event.dataTransfer.setData("text/plain", String(id));
  event.dataTransfer.effectAllowed = "copyMove";
}
function drop(zone) {
  const payload = drag.value;
  drag.value = null;
  hover.value = "";
  if (!payload || payload.deckId !== deck.value?.id) return;
  if (payload.origin === "deck" && zone === "library")
    return change(payload.id, -1);
  if (payload.origin !== "library" || zone === "library") return;
  const fusion = isExtraDeck(byId.get(String(payload.id)));
  if (fusion !== (zone === "extra"))
    return vault.notify(
      fusion
        ? "Fusiones, Sincronía, Xyz y Enlace van en el mazo extra."
        : "Esta carta va en el mazo principal.",
    );
  change(payload.id, 1);
}
</script>
<template>
  <section
    id="mazos"
    @dragend="
      drag = null;
      hover = '';
    "
  >
    <div class="deck-command">
      <FormatSelect v-model="formatId" label="Formato de los mazos" />
      <label>Reglas del nuevo mazo<select v-model="newRuleset"><option value="standard">Estándar · 40–60</option><option value="speed">Speed Duel · 20–30</option></select></label>
      <label
        >Mazo
        <select
          :value="deck?.id || ''"
          aria-label="Elegir mazo"
          @change="data.currentDeck = $event.target.value"
        >
          <option v-if="!deck" value="">Todavía no hay mazos</option>
          <option v-for="d in formatDecks" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select></label
      ><button class="primary" @click="create">＋ Crear un mazo</button
      ><span>Solo copias de {{ formatName(data.progress, formatId) }} · Arrastrá para agregar</span>
    </div>
    <div class="deck-workbench">
      <section
        class="deck-library"
        :class="{ 'drop-hover': hover === 'library' }"
        aria-label="Cartas de tu colección"
        @dragover.prevent="hover = 'library'"
        @drop.prevent="drop('library')"
      >
        <div class="workbench-heading">
          <h2>Tu colección</h2>
          <small>{{ library.length }} cartas</small>
        </div>
        <CardFilters
          v-model="filters"
          :error="result.error"
          :source-cards="vault.gameCards.value"
          deck
        /><label
          ><input v-model="available" type="checkbox" /> Solo copias
          disponibles</label
        >
        <p class="deck-drag-tip">
          Arrastrá cartas al mazo. Para quitarlas, arrastralas de vuelta.
        </p>
        <div class="deck-library-grid">
          <DeckCard
            v-for="card in library"
            :key="card.id"
            :card="print(card, filters.set)"
            :used="deck?.cards[card.id] || 0"
            :free="free(card.id)"
            :owned="owned[card.id] || 0"
            :limit="limit(card.id)"
            :group="groupOf(card.id)"
            :enabled="!!deck && free(card.id) > 0"
            @change="change(card.id, 1)"
            @dragstart="start($event, card.id, 'library')"
          />
          <p v-if="!library.length" class="deck-empty">
            No hay cartas que coincidan. Cambiá los filtros o abrí sobres.
          </p>
        </div>
      </section>
      <section class="deck-board" aria-label="Mazo en construcción">
        <div class="deck-board-header">
          <input
            :value="deck?.name || ''"
            :disabled="!deck"
            maxlength="60"
            aria-label="Nombre del mazo"
            placeholder="Nombre de tu mazo"
            @change="rename"
          /><button class="quiet" :disabled="!deck" @click="remove">
            Eliminar mazo
          </button>
        </div>
        <div class="deck-banlist">
          <label>Reglas de construcción<select :value="deck?.ruleset || 'standard'" :disabled="!deck" @change="selectRules"><option value="standard">Estándar · 40–60 / Extra 15</option><option value="speed">Speed Duel · 20–30 / Extra 6</option></select></label>
          <label
            >Banlist de este mazo
            <select
              :value="deck?.banlistId || ''"
              :disabled="!deck"
              aria-label="Banlist de este mazo"
              @change="selectBanlist"
            >
              <option value="">Solo la lista de permitidas del formato</option>
              <option
                v-for="list in data.progress.banlists"
                :key="list.id"
                :value="list.id"
              >
                {{ list.name }}
              </option>
            </select>
          </label>
          <NuxtLink :to="'/banlists?formato=' + formatId">Editar permitidas y banlists</NuxtLink>
        </div>
        <div v-if="conflicts.length" class="banlist-warning" role="status">
          <strong>El mazo no cumple las reglas del formato o la banlist</strong>
          <p>
            Conservamos tus cartas. Quitá las copias que sobran para cumplir los
            límites.
          </p>
          <ul>
            <li v-for="conflict in conflicts" :key="conflict.id">
              {{ byId.get(conflict.id).name_es }}: {{ conflict.copies }} en mazo
              ·
              {{
                conflict.limit === 0 ? "prohibida" : `máximo ${conflict.limit}`
              }}
              · sobran {{ conflict.copies - conflict.limit }}
            </li>
          </ul>
        </div>
        <p
          v-else-if="deck && !groups.some(g => g.copies > g.limit)"
          class="deck-banlist-status"
          role="status"
        >
          Cumple los límites de {{ formatName(data.progress, formatId) }}{{ selectedBanlist ? ' y ' + selectedBanlist.name : '' }}.
        </p>
        <div v-if="groups.length" class="deck-group-counts" :class="groups.some(g => g.copies > g.limit) ? 'banlist-warning' : 'deck-rules'" role="status">
          <p v-for="g in groups" :key="g.limit">Limitada {{ g.limit }}: {{ g.copies }} / {{ g.limit }} copias entre todas las cartas del grupo. <strong v-if="g.copies > g.limit">Sobran {{ g.copies - g.limit }}; quitá copias de este grupo.</strong></p>
        </div>
        <p id="deckBuildStatus" role="status">
          {{
            !deck
              ? "Creá un mazo para empezar a agregar cartas."
              : count.main < rules.min
                ? `Borrador · faltan ${rules.min - count.main} cartas principales para llegar a ${rules.min}`
                : "Tamaño válido · guardado automático"
          }}
        </p>
        <p id="deckComposition">{{ composition }}</p>
        <div
          v-for="[area, title, max] in [
            ['main', 'Mazo principal', rules.main],
            ['extra', 'Mazo extra', rules.extra],
          ]"
          :key="area"
          class="deck-dropzone"
          :class="{
            'fusion-zone': area === 'extra',
            'drop-hover': hover === area,
          }"
          :aria-label="title"
          @dragover.prevent="hover = area"
          @drop.prevent="drop(area)"
        >
          <div class="workbench-heading">
            <h2>{{ title }}</h2>
            <strong>{{ count[area] }} / {{ max }}</strong>
          </div>
          <div class="deck-zone-grid">
            <DeckCard
              v-for="entry in entries(area)"
              :key="entry.key"
              :card="entry.card"
              :used="deck.cards[entry.card.id]"
              :limit="limit(entry.card.id)"
              :group="groupOf(entry.card.id)"
              inside
              enabled
              @change="change(entry.card.id, -1)"
              @dragstart="start($event, entry.card.id, 'deck')"
            />
            <div v-if="!entries(area).length" class="drop-placeholder">
              <span>＋</span
              >{{
                area === "extra"
                  ? "Fusión, Sincronía, Xyz y Enlace"
                  : "Arrastrá tus cartas a esta zona"
              }}<small>{{
                area === "extra"
                  ? `Hasta ${rules.extra} cartas`
                  : `Monstruos, mágicas y trampas · ${rules.min}–${rules.main} cartas`
              }}</small>
            </div>
          </div>
        </div>
        <p class="deck-rules">
          Los límites se aplican por carta, sin importar su rareza, entre el
          mazo principal y el extra. Rige el menor límite entre la lista de permitidas y la banlist elegida; solo cuentan las copias obtenidas en este formato. También podés usar los botones ＋ Agregar y −
          Quitar.
        </p>
        <p v-if="deck?.ruleset === 'speed'" class="deck-rules">Speed Duel aplica 20–30 principales y hasta 6 de Extra. La lista de permitidas del formato determina las cartas disponibles; elegí una banlist de cupos compartidos para aplicar Limitada 1, 2 y 3. Side Deck y habilidades no están implementados.</p>
      </section>
    </div>
  </section>
</template>
