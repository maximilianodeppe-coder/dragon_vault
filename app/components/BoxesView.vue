<script setup>
import {
  cards,
  byId,
  SETS,
  names,
  image,
  isPublished,
} from "~/utils/catalog.js";
import { remainingCards } from "~/utils/expansions.js";
import BOX from "~/utils/boxes.js";
import query from "~/utils/collection-query.js";
import { formatOf } from '~/utils/formats.js';
const props = defineProps({ formatId: { type: String, default: 'official' } });
const vault = useVault(),
  { data } = vault;
const route = useRoute();
const customId = ref("");
const published = computed(() =>
  data.progress.economy.customPacks.filter(
    (p) => isPublished(p) && p.kind !== "starter" && formatOf(p) === props.formatId,
  ),
);
const custom = computed(() =>
  published.value.find((p) => p.id === customId.value),
);
function showcase(product) {
  const pool = product.entries
    ? product.entries.map((e) => byId.get(e.id))
    : cards.filter((c) => c.set === product.id);
  const cover =
    pool.find(
      (c) => String(c.id) === product.coverId || c.name_en === product.hero,
    ) || pool[0];
  const others = pool
    .filter((c) => c !== cover)
    .sort((a, b) => (a.rarity === "Common") - (b.rarity === "Common"))
    .slice(0, 4);
  others.splice(Math.floor((others.length + 1) / 2), 0, cover);
  return others;
}
watch(
  () => route.query.expansion,
  (id) => {
    customId.value = typeof id === "string" ? id : "";
  },
  { immediate: true },
);
const detail = ref(false),
  search = ref(""),
  rarity = ref("");
const set = computed(() =>
  SETS.find((s) => s.id === data.progress.selectedSet),
);
const box = computed(() => data.progress.boxes[set.value.id]);
const list = computed(() => cards.filter((c) => c.set === set.value.id));
const initial = computed(() => BOX.initial(cards, set.value.id));
const remaining = computed(() => BOX.total(box.value));
const hero = computed(() =>
  list.value.find((c) => c.name_en === set.value.hero),
);
const unique = computed(
  () => Object.values(data.progress.owned).filter((n) => n > 0).length,
);
const completion = computed(() =>
  Math.round((unique.value / vault.gameCards.value.length) * 100),
);
const pool = computed(
  () =>
    query(list.value, data.progress.owned, {
      search: search.value,
      rarity: rarity.value,
      sort: "rarity",
      direction: "desc",
    }).cards,
);
async function choose(id) { data.progress.selectedSet = id; detail.value = true; customId.value = ''; data.lastPack = []; }
function reset() {
  const id = set.value.id;
  vault.confirm(
    "¿Reiniciar " + set.value.es + "?",
    "Se reponen las 500 cartas de esta caja. Tu colección y tus mazos se conservan.",
    async () => {
      if (
        (await vault.commit((s) => {
          s.boxes[id] = BOX.reset(s.boxes[id], cards, id);
        })).ok
      ) {
        data.lastPack = [];
        data.dialog = null;
      }
    },
    "Reiniciar esta caja",
  );
}
</script>
<template>
  <section id="sobres">
    <template v-if="!detail && !custom">
    <p v-if="formatId !== 'official' && !published.length">Todavía no hay sobres publicados en este formato.</p>
    <h3 v-if="formatId === 'official' || published.some(p => p.officialSource)">Expansiones oficiales</h3>
    <div
      id="boxTabs"
      class="box-tabs"
      aria-label="Elegir expansión"
    >
      <button
        v-for="(product, i) in (formatId === 'official' ? SETS : [])"
        :key="product.id"
        class="expansion-portal"
        :style="{ '--pack-accent': ['#8dc9ff', '#b59aff', '#e5c58b'][i % 3] }"
        :class="{ selected: product.id === set.id }"
        @click="choose(product.id)"
      >
        <PackFan :cards="showcase(product)" />
        <strong>{{ product.es }}</strong
        ><small
          >{{ product.id }} ·
          {{ cards.filter((c) => c.set === product.id).length }} cartas</small
        ><span
          >{{
            Math.ceil(BOX.total(data.progress.boxes[product.id]) / 5)
          }}
          sobres restantes</span
        >
      </button>
      <button
        v-for="product in published.filter(p => p.officialSource)"
        :key="product.id"
        class="expansion-portal"
        @click="
          customId = product.id;
          detail = false;
          data.lastPack = [];
        "
      >
        <PackFan :cards="showcase(product)" />
        <strong>{{ product.name }}</strong
        ><small>Basada en una edición {{ product.officialSource.format }}</small
        ><span
          >{{ Math.ceil(remainingCards(product) / product.size) }} sobres
          restantes · {{ product.cost }} monedas</span
        >
      </button>
    </div>
    <section v-if="published.some(p => !p.officialSource)" class="custom-boxes" aria-label="Sobres de creación propia">
      <h2>Creaciones propias</h2>
      <div class="box-tabs">
        <button v-for="product in published.filter(p => !p.officialSource)" :key="product.id" class="expansion-portal" @click="customId = product.id; detail = false; data.lastPack = []">
          <PackFan :cards="showcase(product)" />
          <strong>{{ product.name }}</strong><small>Expansión personalizada</small>
          <span>{{ Math.ceil(remainingCards(product) / product.size) }} sobres restantes · {{ product.cost }} monedas</span>
        </button>
      </div>
    </section>
    </template>
    <div v-else-if="custom" id="boxDetail">
      <button
        id="backToBoxes"
        class="quiet"
        @click="
          customId = '';
          navigateTo('/formatos?formato=' + formatId, { replace: true });
        "
      >
        ← Volver a las expansiones</button
      ><ExpansionBox :key="custom.id" :pack="custom" />
    </div>
    <div v-else id="boxDetail">
      <button id="backToBoxes" class="quiet" @click="detail = false">
        ← Volver a las expansiones
      </button>
      <div class="opening-stage">
        <div class="pack-art">
          <div class="edition">CAJA {{ set.id }} · EDICIÓN CLÁSICA</div>
          <CardImage :src="image(hero)" :alt="hero.name_en" />
          <div class="halo"></div>
          <span class="art-caption">{{ hero.name_en.toUpperCase() }}</span>
        </div>
        <div class="pack-info">
          <span class="tag">{{ set.name }}</span>
          <h2>{{ set.subtitle }}</h2>
          <p>
            Buscá tu carta favorita en una caja de copias limitadas. Cada
            apertura descuenta las cartas que obtenés.
          </p>
          <div class="pack-facts">
            <div>
              <strong>{{ list.length }}</strong
              ><span>cartas por descubrir</span>
            </div>
            <div><strong>5</strong><span>cartas por sobre</span></div>
            <div><strong>5</strong><span>rarezas</span></div>
          </div>
          <div class="box-status">
            <span>Caja {{ box.resets + 1 }}</span
            ><strong>{{ Math.ceil(remaining / 5) }} sobres restantes</strong
            ><span>{{ remaining }} / 500 cartas</span>
            <div class="progress">
              <div :style="{ width: remaining / 5 + '%' }"></div>
            </div>
          </div>
          <div class="box-actions">
            <button v-if="vault.isAdmin.value" @click="reset">↻ Reiniciar caja</button>
          </div>
          <button
            class="primary"
            :disabled="!remaining || data.progress.coins < 5"
            @click="vault.open(set.id)"
          >
            {{ remaining ? "Abrir un sobre · 5 monedas" : "Caja agotada" }}
            <span>✦</span>
          </button>
          <p class="micro">5 monedas por sobre · Monedas virtuales de prueba</p>
          <details>
            <summary>Cómo funciona esta caja</summary>
            <p>
              Cada caja nueva contiene 500 cartas: 100 sobres de 5. Por cada
              carta hay 3 copias raras, 2 súper raras, 1 ultra rara y 1 secreta.
              Las copias restantes se reparten entre las comunes. Se extraen
              cartas al azar sin reposición; no hay rareza garantizada por
              sobre.
            </p>
            <p>
              Las cajas anteriores conservan las cartas descontadas; su último
              sobre puede traer menos de 5. Reiniciar repone solo esta caja y
              conserva la colección. Distribución propia inspirada en Duel
              Links.
            </p>
          </details>
        </div>
      </div>
      <div class="section-heading">
        <h2>Tu viaje de coleccionista</h2>
        <span>{{ completion }}% completado</span>
      </div>
      <div class="progress">
        <div :style="{ width: completion + '%' }"></div>
      </div>
      <div class="stats">
        <div>
          <span>Cartas diferentes</span
          ><strong>{{ unique }} / {{ vault.gameCards.value.length }}</strong>
        </div>
        <div>
          <span>Cartas en total</span
          ><strong>{{
            Object.values(data.progress.owned).reduce((a, b) => a + b, 0)
          }}</strong>
        </div>
        <div>
          <span>Sobres abiertos</span><strong>{{ data.progress.packs }}</strong>
        </div>
        <div>
          <span>Mazos guardados</span
          ><strong>{{ data.progress.decks.length }}</strong>
        </div>
      </div>
      <section v-if="data.lastPack.length">
        <div class="section-heading">
          <h2>Tu último sobre</h2>
          <span>{{ data.lastPackName }} · Ya está en tu colección</span>
        </div>
        <div class="cards">
          <CardTile v-for="(card, i) in data.lastPack" :key="i" :card="card" />
        </div>
      </section>
      <details class="box-pool">
        <summary>Ver cartas de esta caja</summary>
        <div class="section-heading">
          <h2>Contenido de la caja</h2>
          <span>Restantes / copias iniciales</span>
        </div>
        <div class="box-stats">
          <div v-for="(label, r) in names" :key="r">
            <strong
              >{{
                list
                  .filter((c) => c.rarity === r)
                  .reduce((n, c) => n + box.remaining[c.id], 0)
              }}
              /
              {{
                list
                  .filter((c) => c.rarity === r)
                  .reduce((n, c) => n + initial[c.id], 0)
              }}</strong
            ><span>{{ label }}</span>
          </div>
        </div>
        <div class="toolbar">
          <input
            v-model="search"
            type="search"
            placeholder="Buscar una carta en esta caja…"
            aria-label="Buscar en la caja"
          /><select v-model="rarity" aria-label="Rareza de la caja">
            <option value="">Todas las rarezas</option>
            <option v-for="(label, r) in names" :key="r" :value="r">
              {{ label }}
            </option>
          </select>
        </div>
        <div class="cards">
          <CardTile
            v-for="card in pool"
            :key="card.id"
            :card="card"
            :copies="box.remaining[card.id] + ' / ' + initial[card.id]"
            :exhausted="!box.remaining[card.id]"
          />
        </div>
        <p v-if="!pool.length">No hay cartas que coincidan.</p>
      </details>
    </div>
  </section>
</template>
