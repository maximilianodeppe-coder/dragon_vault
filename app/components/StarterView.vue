<script setup>
import { cards, starterProducts, byId, image } from "~/utils/catalog.js";
import { formatOf } from '~/utils/formats.js';
const props = defineProps({ formatId: { type: String, default: 'official' } });
const { data } = useVault();
const selected = ref(null);
const products = computed(() => starterProducts(data.progress).filter((p) => formatOf(p) === props.formatId));
const starter = computed(() =>
  products.value.find((s) => s.id === selected.value),
);
const count = (s) => s.entries.reduce((n, e) => n + e.quantity, 0);
const cover = (s) =>
  s.kind === "starter"
    ? byId.get(s.coverId || s.entries[0].id)
    : cards.find((c) => c.name_en === s.hero);
</script>
<template>
  <section id="iniciales">
    <p v-if="!products.length">Todavía no hay mazos de inicio publicados en este formato.</p>
    <div class="starter-products">
      <article
        v-for="s in products"
        :key="s.id"
        class="starter-product"
        :class="s.id.toLowerCase()"
      >
        <CardImage :src="image(cover(s))" :alt="cover(s).name_es" />
        <div>
          <span class="tag">{{
            s.kind === "starter"
              ? "Mazo personalizado"
              : s.edition + " · " + s.id
          }}</span>
          <h2>{{ s.name }}</h2>
          <p v-if="s.kind !== 'starter'">
            50 cartas fijas · 1 ultra rara · 2 súper raras · 47 comunes
          </p>
          <p v-else>
            {{ count(s) }} cartas fijas · {{ s.entries.length }} diferentes
          </p>
          <p v-if="s.description">{{ s.description }}</p>
          <p>
            Sumá el contenido completo a tu colección y usalo para armar tus
            mazos.
          </p>
          <button
            class="primary"
            @click="data.dialog = { kind: 'starter', id: s.id }"
          >
            Comprar mazo · {{ s.cost }} monedas</button
          ><button @click="selected = s.id">
            Ver las {{ count(s) }} cartas
          </button>
        </div>
      </article>
    </div>
    <section v-if="starter" id="starterContent">
      <div class="section-heading">
        <h2>Contenido · {{ starter.name }}</h2>
        <button @click="selected = null">Ocultar contenido</button
        ><span>{{ count(starter) }} cartas en total</span>
      </div>
      <p class="micro">
        Rarezas y cantidades que recibirás con cada compra de este mazo.
      </p>
      <div class="cards">
        <CardTile
          v-for="entry in starter.entries"
          :key="entry.id"
          :copies="entry.quantity + ' en el mazo'"
          :card="{
            ...byId.get(String(entry.id)),
            rarity: entry.rarity,
          }"
        />
      </div>
      <p v-if="starter.source">
        <a
          class="source-link"
          :href="starter.source"
          target="_blank"
          rel="noopener"
          >Consultar lista de esta edición ↗</a
        >
      </p>
    </section>
  </section>
</template>
