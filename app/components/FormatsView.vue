<script setup>
import { formatOf, formatName } from '~/utils/formats.js';
const vault = useVault(), { data } = vault;
const route = useRoute();
watch(() => route.query.formato, (id) => {
  if (data.progress.formats.some((f) => f.id === id)) data.activeFormat = id;
}, { immediate: true });
const products = computed(() => data.progress.economy.customPacks.filter((p) => formatOf(p) === data.activeFormat && p.status !== 'draft'));
</script>
<template>
  <section aria-label="Productos por formato">
    <div class="deck-command">
      <FormatSelect v-model="data.activeFormat" />
      <NuxtLink v-if="vault.isAdmin.value" :to="'/banlists?formato=' + data.activeFormat">Editar lista de permitidas</NuxtLink>
      <NuxtLink v-if="vault.isAdmin.value" to="/banlists?crear=formato">Crear formato</NuxtLink>
      <NuxtLink v-if="vault.isAdmin.value" :to="'/expansiones?formato=' + data.activeFormat">Agregar expansión oficial</NuxtLink>
      <button v-if="vault.isAdmin.value" @click="vault.newProduct">Crear producto propio</button>
    </div>
    <p>Las cartas obtenidas acá pertenecen a {{ formatName(data.progress, data.activeFormat) }}. No se mezclan con copias de otros formatos.</p>
    <template v-if="products.length">
      <h2>Mazos de inicio</h2>
      <StarterView :key="'starter-' + data.activeFormat" :format-id="data.activeFormat" />
      <h2>Sobres</h2>
      <BoxesView :key="'boxes-' + data.activeFormat" :format-id="data.activeFormat" />
    </template>
    <div v-else class="expansion-empty">
      <h2>Este formato todavía no tiene productos</h2>
      <p>Prepará una expansión o un mazo y elegí este formato al publicarlo. Sus cartas nuevas se incorporan a la lista de permitidas, sin cambiar los límites que ya definiste.</p>
    </div>
  </section>
</template>
