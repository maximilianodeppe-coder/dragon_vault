<script setup>
const route = useRoute();
const headings = {
  formatos: ['Elegí cómo querés jugar.', 'Mazos de inicio y sobres reunidos en cada formato.'],
  iniciales: [
    "Tus primeros compañeros de duelo.",
    "Mazos clásicos y personalizados: elegí tu contenido, carta por carta.",
  ],
  sobres: [
    "Toda leyenda empieza con un sobre.",
    "Descubrí las cartas que lo empezaron todo.",
  ],
  coleccion: [
    "Tu colección, carta a carta.",
    "Explorá las expansiones y los mazos de inicio. Tocá una carta para leer su ficha en español.",
  ],
  mazos: [
    "De la colección al duelo.",
    "Armá tus mazos con las cartas que conseguiste.",
  ],
  banlists: [
    "Tus reglas para cada duelo.",
    "Cada formato tiene su lista de permitidas. Las banlists pueden agregar restricciones a tus mazos.",
  ],
  tienda: [
    "Una carta puede cambiar tu mazo.",
    "Comprá cartas puntuales con tus monedas.",
  ],
  catalogo: [
    "Todas las cartas, a tu alcance.",
    "Consultá, seleccioná y prepará nuevos productos.",
  ],
  especiales: [
    "Tus ideas, tus expansiones.",
    "Diseñá y administrá tus propios sobres y mazos, carta por carta.",
  ],
  expansiones: [
    "El archivo de expansiones.",
    "Recorré las ediciones del TCG y elegí cuál publicar en Dragon Vault.",
  ],
};
definePageMeta({
  validate: (route) =>
    [
      "iniciales",
      "formatos",
      "sobres",
      "coleccion",
      "mazos",
      "banlists",
      "tienda",
      "catalogo",
      "especiales",
      "expansiones",
    ].includes(route.params.section),
});
const section = computed(() => route.params.section);
const heading = computed(() => headings[section.value]);
useHead(() => ({
  title: `${heading.value?.[0] || "Dragon Vault"} · Dragon Vault`,
}));
</script>
<template>
  <div class="eyebrow">YU-GI-OH! · ARCHIVO DE EXPANSIONES</div>
  <div class="heading">
    <div>
      <h1>{{ heading[0] }}</h1>
      <p>{{ heading[1] }}</p>
    </div>
    <div class="local">
      Tu colección personal<br /><small
        >Guardado automático en tu cuenta</small
      >
    </div>
  </div>
  <nav v-if="section === 'expansiones' || section === 'especiales'" class="expansion-navigation" aria-label="Administrar expansiones">
    <NuxtLink to="/expansiones" :aria-current="section === 'expansiones' ? 'page' : undefined">Oficiales TCG</NuxtLink>
    <NuxtLink to="/especiales" :aria-current="section === 'especiales' ? 'page' : undefined">Mis creaciones</NuxtLink>
  </nav>
  <template v-if="section === 'expansiones'">
    <template v-if="route.query.editor === '1'">
      <NuxtLink class="official-back" to="/expansiones">Volver al archivo de expansiones</NuxtLink>
      <CustomPacksView official />
    </template>
    <OfficialSetsView v-else />
  </template>
  <FormatsView v-else-if="section === 'formatos'" />
  <StarterView v-else-if="section === 'iniciales'" />
  <BoxesView v-else-if="section === 'sobres'" />
  <CollectionView
    v-else-if="section === 'coleccion' || section === 'catalogo'"
    :key="section"
    :catalog="section === 'catalogo'"
  />
  <DecksView v-else-if="section === 'mazos'" />
  <RulesView v-else-if="section === 'banlists'" />
  <ShopView v-else-if="section === 'tienda'" />
  <CustomPacksView v-else-if="section === 'especiales'" />
</template>
