<script setup>
import {
  byId,
  isPublished,
} from "~/utils/catalog.js";
import { remainingCards } from "~/utils/expansions.js";
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
  const pool = product.entries.map(e => byId.get(e.id));
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
</script>
<template>
  <section id="sobres">
    <template v-if="!custom">
    <p v-if="!published.length">Todavía no hay sobres publicados en este formato.</p>
    <h3 v-if="published.some(p => p.officialSource)">Expansiones oficiales</h3>
    <div
      id="boxTabs"
      class="box-tabs"
      aria-label="Elegir expansión"
    >
      <button
        v-for="product in published.filter(p => p.officialSource)"
        :key="product.id"
        class="expansion-portal"
        @click="
          customId = product.id;
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
        <button v-for="product in published.filter(p => !p.officialSource)" :key="product.id" class="expansion-portal" @click="customId = product.id; data.lastPack = []">
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
  </section>
</template>
