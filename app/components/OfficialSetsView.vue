<script setup>
import { allCards, isPublished } from "~/utils/catalog.js";
import { filterSets, indexSetCards, officialDraft } from "~/utils/official-sets.js";
import { formatOf } from '~/utils/formats.js';

const vault = useVault();
const route = useRoute();
const destination = ref(vault.data.progress.formats.some((f) => f.id === route.query.formato) ? route.query.formato : vault.data.activeFormat);
const { data: snapshot, pending, error, refresh } = useFetch("/api/catalog/sets", {
  server: false, lazy: true, timeout: 30000, retry: 0,
});
const filters = useState("official-set-filters", () => ({ search: "", year: "", format: "TCG", order: "oldest" }));
const page = ref(0);
const index = indexSetCards(allCards);
const all = computed(() => snapshot.value?.data || []);
const years = computed(() => [...new Set(all.value.map((s) => s.tcg_date?.slice(0, 4)).filter(Boolean))].sort());
const filtered = computed(() => filterSets(all.value, filters.value));
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 30)));
const visible = computed(() => filtered.value.slice(page.value * 30, (page.value + 1) * 30));
const prepared = computed(() => new Map(vault.data.progress.economy.customPacks
  .filter((p) => p.officialSource && formatOf(p) === destination.value).map((p) => [p.officialSource.name, p])));
watch(filters, () => { page.value = 0; }, { deep: true });
const date = (value) => value ? value.split("-").reverse().join("/") : "Fecha no informada";

function prepare(set) {
  try {
    vault.editProduct(prepared.value.get(set.set_name) || { ...officialDraft(set, index.get(set.set_name)), formatId: destination.value });
  } catch (error) { vault.notify(error.message); }
}
</script>

<template>
  <section class="official-sets" aria-label="Archivo de expansiones oficiales">
    <div class="deck-command"><FormatSelect v-model="destination" label="Publicar en formato" /><NuxtLink to="/banlists?crear=formato">Crear formato</NuxtLink></div>
    <div class="official-intro">
      <p>Elegí una edición y prepará su contenido en el editor. Incluye expansiones, mazos, latas y promociones; publicar es un paso posterior.</p>
      <NuxtLink v-if="vault.data.draftSource" to="/expansiones?editor=1">Continuar mi borrador oficial</NuxtLink>
    </div>
    <div class="official-filters">
      <label>Buscar expansión<input v-model="filters.search" type="search" placeholder="Ej.: Dark Crisis" /></label>
      <label>Año<select v-model="filters.year"><option value="">Todos los años</option><option v-for="year in years" :key="year">{{ year }}</option><option value="unknown">Sin fecha informada</option></select></label>
      <label>Formato<select v-model="filters.format"><option value="TCG">TCG</option><option value="Speed Duel">Speed Duel</option><option value="">Todos los formatos</option></select></label>
      <label>Ordenar<select v-model="filters.order"><option value="oldest">Más antiguas primero</option><option value="newest">Más recientes primero</option><option value="name">Nombre A–Z</option></select></label>
    </div>
    <p v-if="pending" role="status">Cargando expansiones…</p>
    <div v-else-if="error || !snapshot?.data" class="vault-error" role="alert">
      <p>No se pudo cargar el archivo de expansiones. Tus productos guardados se conservan.</p>
      <button @click="refresh()">Reintentar</button>
    </div>
    <template v-else>
      <div class="section-heading official-results" role="status">
        <h2>{{ filtered.length.toLocaleString('es-AR') }} ediciones</h2>
        <span>Actualizado {{ date(snapshot.metadata.retrievedAt.slice(0, 10)) }}</span>
      </div>
      <p class="expansion-help">Las cantidades muestran cartas distintas vinculadas, no copias físicas ni probabilidades oficiales. Las ediciones sin contenido vinculado quedan disponibles para consulta.</p>
      <div class="official-list">
        <article v-for="set in visible" :key="set.set_name" class="official-set-row">
          <time :datetime="set.tcg_date || undefined">{{ date(set.tcg_date) }}</time>
          <div class="official-set-name">
            <h3>{{ set.set_name }}</h3>
            <span v-if="prepared.has(set.set_name)" class="catalog-status">{{ isPublished(prepared.get(set.set_name)) ? 'Publicada en Sobres' : 'Borrador guardado' }}</span>
          </div>
          <span class="official-count">{{ index.get(set.set_name)?.size || 0 }} {{ index.get(set.set_name)?.size === 1 ? 'carta distinta' : 'cartas distintas' }}</span>
          <button :disabled="!index.get(set.set_name)?.size && !prepared.has(set.set_name)" :aria-label="(prepared.has(set.set_name) ? 'Editar ' : 'Preparar ') + set.set_name" @click="prepare(set)">
            {{ prepared.has(set.set_name) ? 'Editar publicación' : index.get(set.set_name)?.size ? 'Preparar' : 'Sin contenido' }}
          </button>
        </article>
      </div>
      <div v-if="!filtered.length" class="expansion-empty">
        <h3>No hay expansiones con esos filtros.</h3>
        <button @click="filters = { search: '', year: '', format: 'TCG', order: 'oldest' }">Limpiar filtros</button>
      </div>
      <div v-if="filtered.length" class="banlist-pagination" aria-label="Páginas de expansiones">
        <button :disabled="page === 0" @click="page--">Anterior</button>
        <span>Página {{ page + 1 }} de {{ pages }}</span>
        <button :disabled="page + 1 >= pages" @click="page++">Siguiente</button>
      </div>
      <p class="catalog-source">Fuente: <a href="https://ygoprodeck.com/api-guide/" target="_blank" rel="noopener noreferrer">YGOPRODeck</a>. Se conserva el nombre publicado por la fuente y se revisa el listado a diario.</p>
    </template>
  </section>
</template>
