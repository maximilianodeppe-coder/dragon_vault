<script setup>
import { byId, image, names } from "~/utils/catalog.js";
import {
  remainingCards,
  totalCards,
  raritySummary,
  packCard,
} from "~/utils/expansions.js";
const props = defineProps({ pack: { type: Object, required: true } });
const vault = useVault(),
  { data } = vault;
const search = ref(""),
  rarity = ref("");
const remaining = computed(() => remainingCards(props.pack));
const total = computed(() => totalCards(props.pack));
const hero = computed(() =>
  byId.get(props.pack.coverId || props.pack.entries[0].id),
);
const pool = computed(() =>
  props.pack.entries.filter((e) => {
    const c = byId.get(e.id);
    return (
      (!rarity.value || (e.rarity || c.rarity) === rarity.value) &&
      `${c.name_es} ${c.name_en} ${c.id}`
        .toLocaleLowerCase("es")
        .includes(search.value.toLocaleLowerCase("es"))
    );
  }),
);
function reset() {
  const id = props.pack.id;
  vault.confirm(
    "¿Reponer " + props.pack.name + "?",
    "Se restauran todas las copias de esta caja. Tu colección y tus mazos se conservan.",
    async () => {
      if (
        (await vault.commit((s) =>
          s.economy.customPacks
            .find((p) => p.id === id)
            .entries.forEach((e) => {
              e.remaining = e.copies;
            }),
        )).ok
      )
        data.dialog = null;
    },
    "Reponer caja",
  );
}
</script>
<template>
  <div class="opening-stage">
    <div class="pack-art">
      <div class="edition">Expansión personalizada</div>
      <CardImage :src="image(hero)" :alt="hero.name_en" />
      <div class="halo"></div>
      <span class="art-caption">{{ hero.name_en }}</span>
    </div>
    <div class="pack-info">
      <span class="tag">Tu expansión</span>
      <h2>{{ pack.name }}</h2>
      <p>
        {{
          pack.description ||
          "Una selección propia de cartas. Abrí sus sobres y completá tu colección."
        }}
      </p>
      <div class="pack-facts">
        <div>
          <strong>{{ pack.entries.length }}</strong
          ><span>cartas por descubrir</span>
        </div>
        <div>
          <strong>{{ pack.size }}</strong
          ><span>cartas por sobre</span>
        </div>
        <div>
          <strong>{{ pack.cost }}</strong
          ><span>monedas por sobre</span>
        </div>
      </div>
      <div class="box-status">
        <span>Caja de copias limitadas</span
        ><strong>{{ Math.ceil(remaining / pack.size) }} sobres restantes</strong
        ><span>{{ remaining }} / {{ total }} cartas</span>
        <div class="progress">
          <div :style="{ width: (remaining / total) * 100 + '%' }"></div>
        </div>
      </div>
      <div class="box-actions">
        <button v-if="vault.isAdmin.value" @click="reset">Reponer caja</button>
      </div>
      <button
        class="primary"
        :disabled="!remaining || data.progress.coins < pack.cost"
        @click="vault.openCustom(pack.id)"
      >
        {{
          remaining ? `Abrir un sobre · ${pack.cost} monedas` : "Caja agotada"
        }}
      </button>
      <p v-if="remaining && remaining < pack.size" class="micro">
        Último sobre: {{ remaining }} cartas por {{ pack.cost }} monedas.
      </p>
      <details>
        <summary>Cómo funciona esta caja</summary>
        <p>
          Se extraen hasta {{ pack.size }} cartas al azar sin reposición. Cada
          copia restante tiene la misma oportunidad de salir. No hay una rareza
          garantizada por sobre. Reiniciar repone esta caja y conserva las
          cartas que obtuviste.
        </p>
      </details>
    </div>
  </div>
  <section v-if="data.lastPackName === pack.name && data.lastPack.length">
    <div class="section-heading">
      <h2>Tu último sobre</h2>
      <span>Ya está guardado en tu colección</span>
    </div>
    <div class="cards">
      <CardTile v-for="(card, i) in data.lastPack" :key="i" :card="card" />
    </div>
  </section>
  <details class="box-pool">
    <summary>Ver cartas de esta caja</summary>
    <div class="section-heading">
      <h2>Contenido de {{ pack.name }}</h2>
      <span>Restantes / copias iniciales</span>
    </div>
    <div class="box-stats">
      <div v-for="row in raritySummary(pack)" :key="row.rarity">
        <strong>{{ row.remaining }} / {{ row.copies }}</strong
        ><span>{{ row.label }}</span>
      </div>
    </div>
    <div class="toolbar">
      <input
        v-model="search"
        type="search"
        aria-label="Buscar en la caja"
        placeholder="Buscar una carta…"
      /><select v-model="rarity" aria-label="Rareza de la caja">
        <option value="">Todas las rarezas</option>
        <option v-for="(label, r) in names" :key="r" :value="r">
          {{ label }}
        </option>
      </select>
    </div>
    <div class="cards">
      <CardTile
        v-for="entry in pool"
        :key="entry.id"
        :card="packCard(pack, entry.id)"
        :copies="entry.remaining + ' / ' + entry.copies"
        :exhausted="!entry.remaining"
      />
    </div>
    <p v-if="!pool.length">No hay cartas que coincidan.</p>
  </details>
</template>
