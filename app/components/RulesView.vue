<script setup>
import { allCards, byId, image, isDeckCard, cards, SETS, starters } from '~/utils/catalog.js';
import query from '~/utils/collection-query.js';
import { deleteBanlist } from '~/utils/banlists.js';
import { allowCards } from '~/utils/formats.js';
import { indexSetCards } from '~/utils/official-sets.js';
const vault = useVault(), { data } = vault, route = useRoute();
const mode = ref('format'), selected = ref(data.activeFormat), search = ref(''), page = ref(1), rulePage = ref(1), newName = ref('');
const showCreate = ref(route.query.crear === 'formato');
const newStyle = ref('individual');
const lists = computed(() => mode.value === 'format' ? data.progress.formats : data.progress.banlists);
const list = computed(() => lists.value.find((l) => l.id === selected.value) || lists.value[0]);
const fallback = computed(() => mode.value === 'format' ? 0 : list.value?.style === 'shared' ? null : 3);
const results = computed(() => search.value.trim() ? query(allCards.filter(isDeckCard), {}, { search: search.value }).cards : []);
const rules = computed(() => Object.entries(list.value?.limits || {}).map(([id, limit]) => ({ card: byId.get(id), limit })).sort((a, b) => a.card.name_es.localeCompare(b.card.name_es, 'es')));
const setSearch = ref(''), setId = ref('');
const { data: sets, error: setsError, refresh } = useFetch('/api/catalog/sets', { server: false, lazy: true, timeout: 30000, retry: 0 });
const index = indexSetCards(allCards);
const sources = computed(() => [
  ...SETS.map((s) => ({ id: 'classic:' + s.id, name: s.es, ids: cards.filter((c) => c.set === s.id).map((c) => String(c.id)) })),
  ...starters.map((s) => ({ id: 'starter:' + s.id, name: s.name, ids: s.entries.map((e) => String(e.id)) })),
  ...data.progress.economy.customPacks.map((p) => ({ id: p.id, name: p.name, ids: p.entries.map((e) => e.id) })),
  ...(sets.value?.data || []).map((s) => ({ id: 'official:' + s.set_name, name: s.set_name, ids: [...(index.get(s.set_name)?.keys() || [])] })),
].filter((s) => s.ids.length && s.name.toLocaleLowerCase().includes(setSearch.value.trim().toLocaleLowerCase())));
watch(search, () => { page.value = 1; });
watch([mode, selected], () => { rulePage.value = 1; });
watch(() => route.query.formato, (id) => {
  if (data.progress.formats.some((f) => f.id === id)) { mode.value = 'format'; selected.value = id; }
}, { immediate: true });
async function create() {
  const id = crypto.randomUUID();
  if ((await vault.commit((s) => {
    const target = mode.value === 'format' ? s.formats : s.banlists;
    target.push({ id, name: newName.value.trim(), limits: {}, ...(mode.value === 'banlist' ? { style: newStyle.value } : {}) });
  })).ok) { selected.value = id; newName.value = ''; showCreate.value = false; if (mode.value === 'format') data.activeFormat = id; }
}
async function rename(event) {
  if (!(await vault.commit((s) => { (mode.value === 'format' ? s.formats : s.banlists).find((l) => l.id === list.value.id).name = event.target.value.trim(); })).ok) event.target.value = list.value.name;
}
async function setLimit(id, limit) {
  (await vault.commit((s) => {
    const target = (mode.value === 'format' ? s.formats : s.banlists).find((l) => l.id === list.value.id);
    if (mode.value === 'banlist' && (limit === null || (limit === 3 && target.style !== 'shared'))) delete target.limits[id];
    else target.limits[id] = limit;
  }));
}
async function setStyle(event) {
  if (!(await vault.commit(s => {
    const target = s.banlists.find(l => l.id === list.value.id);
    target.style = event.target.value;
    // In an individual list, an explicit 3 means unrestricted, not a shared group.
    for (const [id, n] of Object.entries(target.limits)) if (n === 3) delete target.limits[id];
  })).ok) event.target.value = list.value.style || 'individual';
}
async function addSet() {
  const source = sources.value.find((s) => s.id === setId.value);
  if (!source) return;
  if ((await vault.commit((s) => allowCards(s, list.value.id, source.ids))).ok) vault.notify('Cartas incorporadas. Se conservaron los límites existentes.');
}
function remove() {
  const id = list.value.id;
  vault.confirm('¿Eliminar esta banlist?', 'Los mazos que la usan quedarán sin esta restricción adicional. Sus cartas y su formato se conservan.', async () => {
    if ((await vault.commit((s) => deleteBanlist(s, id))).ok) data.dialog = null;
  }, 'Eliminar banlist');
}
function useFormat() {
  if (mode.value !== 'format') return;
  data.activeFormat = list.value.id;
  data.currentDeck = null;
}
</script>
<template>
  <section v-if="vault.isAdmin.value" aria-label="Editor de listas y formatos" class="banlists">
    <div class="expansion-navigation" aria-label="Tipo de lista">
      <button :aria-pressed="mode === 'format'" @click="mode = 'format'; selected = data.activeFormat">Formatos · listas de permitidas</button>
      <button :aria-pressed="mode === 'banlist'" @click="mode = 'banlist'; selected = ''">Banlists adicionales</button>
    </div>
    <div class="deck-command">
      <label>{{ mode === 'format' ? 'Formato' : 'Banlist' }}<select :value="list?.id || ''" :aria-label="mode === 'format' ? 'Elegir formato' : 'Elegir banlist'" @change="selected = $event.target.value">
        <option v-if="!lists.length" value="">Todavía no hay listas</option>
        <option v-for="item in lists" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select></label>
      <button class="primary" @click="showCreate = !showCreate">{{ mode === 'format' ? 'Crear formato' : 'Crear banlist' }}</button>
      <NuxtLink to="/mazos" @click="useFormat">Usar estas reglas en Mis mazos</NuxtLink>
    </div>
    <form v-if="showCreate" class="deck-command" @submit.prevent="create">
      <label>Nombre de la nueva lista<input v-model="newName" maxlength="60" placeholder="Ej.: Speed Duel entre amigos" required /></label>
      <label v-if="mode === 'banlist'">Estilo de la nueva banlist<select v-model="newStyle"><option value="individual">Límites por carta</option><option value="shared">Speed Duel · cupos compartidos</option></select></label>
      <button class="primary">{{ mode === 'format' ? 'Guardar nuevo formato' : 'Guardar nueva banlist' }}</button>
      <button type="button" @click="showCreate = false">Cancelar</button>
    </form>
    <p v-if="!list">Creá una banlist para aplicar restricciones adicionales. Las cartas no incluidas conservan el límite de su formato.</p>
    <template v-else>
      <div class="banlist-heading">
        <label>{{ mode === 'format' ? 'Nombre del formato' : 'Nombre de la banlist' }}<input :value="list.name" maxlength="60" :aria-label="mode === 'format' ? 'Nombre del formato' : 'Nombre de la banlist'" @change="rename" /></label>
        <button v-if="mode === 'banlist'" class="quiet" @click="remove">Eliminar banlist</button>
        <NuxtLink v-else :to="'/formatos?formato=' + list.id">Ver productos del formato</NuxtLink>
      </div>
      <label v-if="mode === 'banlist'">Estilo de banlist<select :value="list.style || 'individual'" @change="setStyle"><option value="individual">Límites por carta</option><option value="shared">Speed Duel · cupos compartidos</option></select></label>
      <p class="banlist-help" v-if="mode === 'format'">Lista de permitidas (whitelist): solo se pueden jugar las cartas incluidas, con sus límites. 0 las excluye; 1, 2 o 3 indican copias máximas. Guardado automático, sin quitar cartas de tus mazos.</p>
      <p class="banlist-help" v-else-if="list.style === 'shared'">0 prohíbe. Limitada 1, 2 y 3 son grupos: todas las copias de cartas de cada grupo comparten un máximo de 1, 2 o 3 entre Main y Extra. «Libre» quita la restricción de esta banlist, sin habilitar cartas excluidas por el formato. Cambiar a límites por carta elimina el grupo 3. Guardado automático.</p>
      <p class="banlist-help" v-else>La banlist agrega restricciones: 0 prohíbe, 1 limita y 2 semilimita. 3 quita esta restricción, pero nunca habilita una carta excluida por el formato. Guardado automático.</p>
      <details v-if="mode === 'format'" class="format-import">
        <summary>Agregar una expansión completa a la lista</summary>
        <p>Solo incorpora cartas permitidas. No publica productos ni entrega copias. Se respetan los límites existentes, incluidos los 0.</p>
        <div class="deck-command">
          <label>Buscar expansión para la lista<input v-model="setSearch" type="search" @input="setId = ''" /></label>
          <label>Expansión a incorporar<select v-model="setId"><option value="">Elegí una expansión</option><option v-for="s in sources.slice(0, 100)" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
          <button :disabled="!sources.some(s => s.id === setId)" @click="addSet">Agregar cartas permitidas</button>
        </div>
        <p v-if="sources.length > 100">Se muestran 100 resultados. Escribí parte del nombre para acotar la búsqueda.</p>
        <p v-if="setsError" role="alert">No se pudo cargar el archivo oficial. Los productos locales siguen disponibles. <button @click="refresh()">Reintentar</button></p>
      </details>
      <label class="rules-search">Buscar cartas<input v-model="search" type="search" aria-label="Buscar cartas para la lista" placeholder="Nombre en español, inglés o ID" /></label>
      <p role="status">{{ search.trim() ? results.length + ' resultados' : rules.length + ' cartas en la lista' }} · Un toque en 0, 1, 2 o 3 guarda el cambio.</p>
      <div class="banlist-rows">
        <div v-for="entry in (search.trim() ? results.slice((page - 1) * 30, page * 30).map(card => ({ card, limit: list.limits[card.id] ?? fallback })) : rules.slice((rulePage - 1) * 30, rulePage * 30))" :key="entry.card.id" class="banlist-row">
          <button class="banlist-image" :aria-label="'Ver ' + entry.card.name_es" @click="data.dialog = { kind: 'detail', id: String(entry.card.id) }"><CardImage :src="image(entry.card)" :alt="entry.card.name_es" loading="lazy" /></button>
          <span class="banlist-name">{{ entry.card.name_es }}</span>
          <div class="limit-buttons" role="group" :aria-label="'Límite de ' + entry.card.name_es">
            <button v-for="n in [0, 1, 2, 3]" :key="n" :aria-label="n === 0 ? 'No permitida' : (mode === 'banlist' && list.style === 'shared') ? 'Limitada ' + n : n + (n === 1 ? ' copia' : ' copias')" :aria-pressed="entry.limit === n" @click="setLimit(String(entry.card.id), n)">{{ n }}</button>
            <button v-if="mode === 'banlist' && list.style === 'shared'" :aria-pressed="entry.limit === null" @click="setLimit(String(entry.card.id), null)">Libre</button>
          </div>
        </div>
      </div>
      <p v-if="search.trim() && !results.length">No hay coincidencias. Probá otro nombre o ID.</p>
      <p v-else-if="!search.trim() && !rules.length">{{ mode === 'format' ? 'Este formato empieza vacío. Buscá cartas o incorporá una expansión completa.' : 'Todavía no hay restricciones adicionales. Buscá una carta para empezar.' }}</p>
      <div class="banlist-pagination" v-if="(search.trim() ? results.length : rules.length) > 30">
        <button :disabled="(search.trim() ? page : rulePage) === 1" @click="search.trim() ? page-- : rulePage--">Anterior</button>
        <span>Página {{ search.trim() ? page : rulePage }} de {{ Math.ceil((search.trim() ? results.length : rules.length) / 30) }}</span>
        <button :disabled="(search.trim() ? page : rulePage) * 30 >= (search.trim() ? results.length : rules.length)" @click="search.trim() ? page++ : rulePage++">Siguiente</button>
      </div>
    </template>
  </section>
  <section v-else aria-label="Listas y formatos">
    <p>Las reglas las administra el creador de la bóveda. Podés elegir una banlist al editar cada mazo.</p>
    <details v-for="list in [...data.progress.formats, ...data.progress.banlists]" :key="list.id" class="market-prices">
      <summary>{{ list.name }}</summary><p>{{ list.style === 'shared' ? 'Las categorías 1, 2 y 3 comparten su cupo.' : 'Límites por carta.' }}</p>
      <ul><li v-for="(limit, id) in list.limits" :key="id">{{ byId.get(id)?.name_es }} · {{ limit }} copias</li></ul>
    </details>
  </section>
</template>
<style scoped>
.expansion-navigation button[aria-pressed="true"] { color: var(--gold); border-bottom: 2px solid var(--gold); }
.format-import { margin: 24px 0; }
.rules-search { display: block; max-width: 640px; margin-top: 24px; }
.rules-search input { width: 100%; }
.limit-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
.limit-buttons button { min-width: 44px; min-height: 44px; padding: 8px; font-variant-numeric: tabular-nums; }
.limit-buttons button[aria-pressed="true"] { background: var(--gold); color: #17202e; border-color: var(--gold); }
.banlist-row { grid-template-columns: 40px minmax(0, 1fr) auto; }
@media (max-width: 560px) { .limit-buttons { grid-column: 2; } .banlist-row { grid-template-columns: 40px minmax(0, 1fr); } }
</style>
