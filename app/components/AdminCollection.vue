<script setup>
import { allCards, byId, names, isDeckCard } from '~/utils/catalog.js';
import query from '~/utils/collection-query.js';
import { lotKey } from '~/utils/inventory.js';
import { formatOf, formatName, formatLimit } from '~/utils/formats.js';

const props = defineProps({ user: { type: Object, required: true } });
defineEmits(['close']);
const vault = useVault();
const snapshot = ref(null), busy = ref(false), error = ref(''), success = ref('');
const search = ref(''), filterFormat = ref(''), page = ref(1);
const grantSearch = ref(''), grantCard = ref(null), grantFormat = ref('official'), rarity = ref('Common'), quantity = ref(1);
const clearing = ref(false), confirmUsername = ref('');
const progress = computed(() => snapshot.value?.progress);
const matches = computed(() => grantSearch.value.trim() ? query(allCards.filter(isDeckCard), {}, { search: grantSearch.value }).cards : []);
const collection = computed(() => {
  if (!progress.value) return [];
  const cards = Object.keys(progress.value.inventory).map(id => byId.get(id)).filter(Boolean);
  return query(cards, progress.value.owned, { search: search.value }).cards.map(card => ({
    card,
    lots: progress.value.inventory[card.id].filter(lot => !filterFormat.value || formatOf(lot) === filterFormat.value),
  })).filter(entry => entry.lots.length);
});
const total = computed(() => collection.value.reduce((n, entry) => n + entry.lots.reduce((sum, lot) => sum + lot.quantity, 0), 0));
const pages = computed(() => Math.max(1, Math.ceil(collection.value.length / 20)));
watch([search, filterFormat], () => { page.value = 1; });
watch(pages, n => { page.value = Math.min(page.value, n); });
watch(grantSearch, () => { grantCard.value = null; });

async function load() {
  busy.value = true;
  try { snapshot.value = await $fetch('/api/admin/collection', { query: { id: props.user.id }, retry: 0 }); }
  catch (e) { snapshot.value = null; error.value = e.data?.message || 'No se pudo cargar la colección. Volvé a intentar.'; }
  finally { busy.value = false; }
}
async function save(type, values, message) {
  if (busy.value || !snapshot.value) return;
  busy.value = true; error.value = ''; success.value = '';
  try {
    snapshot.value = await $fetch('/api/admin/collection', { method: 'POST', body: { id: props.user.id, type, revision: snapshot.value.revision, ...values }, retry: 0 });
    success.value = message;
    clearing.value = false; confirmUsername.value = '';
  } catch (e) {
    error.value = e.data?.message || 'No se pudo confirmar el cambio. Revisá la colección antes de repetir.';
    await load();
  } finally { busy.value = false; }
  if (props.user.id === vault.data.auth.user?.id) {
    try { await vault.refresh(); } catch { vault.notify('Recargá la página para actualizar tu colección.'); }
  }
}
function setCopies(card, lot, event) {
  const next = Number(new FormData(event.target).get('quantity'));
  if (next === lot.quantity) return;
  const action = () => {
    vault.data.dialog = null;
    return save('collectionSet', { cardId: String(card.id), lot: lotKey(lot), quantity: next }, `Cantidad de ${card.name_es} actualizada.`);
  };
  if (next < lot.quantity) vault.confirm(`¿Reducir copias de ${props.user.username}?`, `De ${lot.quantity} a ${next} copias de ${card.name_es}. Se quitarán de sus mazos las copias que ya no tenga. No se entregan monedas.`, action, 'Confirmar reducción');
  else action();
}
await load();
</script>

<template>
  <section class="admin-collection">
    <button :disabled="busy" @click="$emit('close')">Volver a usuarios</button>
    <div class="section-heading"><h1>Colección de {{ user.username }}</h1><button :disabled="busy" @click="error = ''; load()">Actualizar colección</button></div>
    <p>Administrás esta cuenta desde tu sesión. No hace falta que el usuario esté conectado.</p>
    <p v-if="error" class="vault-error" role="alert">{{ error }}</p>
    <p v-if="success" role="status">{{ success }}</p>
    <p v-if="busy" role="status">Cargando cambios…</p>
    <template v-if="progress">
      <section class="admin-grant" aria-labelledby="grant-title">
        <h2 id="grant-title">Entregar cartas</h2>
        <p>Elegí una carta del catálogo, su formato y rareza. Se agrega con origen «Entrega administrativa».</p>
        <label>Buscar carta para entregar<input v-model="grantSearch" type="search" placeholder="Nombre en español o inglés" :disabled="busy" /></label>
        <ul v-if="grantSearch.trim() && !grantCard" class="admin-card-results" aria-label="Cartas encontradas">
          <li v-for="card in matches.slice(0, 12)" :key="card.id"><button :disabled="busy" @click="grantCard = card"><CardImage :src="card.image" alt="" loading="lazy" /><span>{{ card.name_es }}<small>{{ card.name_en }}</small></span></button></li>
        </ul>
        <p v-if="grantSearch.trim() && !grantCard" class="micro">{{ matches.length ? `Mostrando ${Math.min(12, matches.length)} de ${matches.length} coincidencias. Afiná el nombre para encontrar tu carta.` : 'No hay cartas con ese nombre.' }}</p>
        <form v-if="grantCard" class="admin-grant-form" @submit.prevent="save('collectionGrant', { cardId: String(grantCard.id), formatId: grantFormat, rarity, quantity }, `${quantity} copias de ${grantCard.name_es} entregadas a ${user.username}.`)">
          <div class="admin-selected-card"><CardImage :src="grantCard.image" :alt="grantCard.name_es" /><div><strong>{{ grantCard.name_es }}</strong><p>{{ grantCard.name_en }}</p><button type="button" :disabled="busy" @click="grantCard = null">Elegir otra carta</button></div></div>
          <div class="admin-form-fields">
            <label>Formato de entrega<select v-model="grantFormat" :disabled="busy"><option v-for="format in progress.formats" :key="format.id" :value="format.id">{{ format.name }}</option></select></label>
            <label>Rareza de entrega<select v-model="rarity" :disabled="busy"><option v-for="(name, key) in names" :key="key" :value="key">{{ name }}</option></select></label>
            <label>Copias a entregar<input v-model.number="quantity" type="number" min="1" max="1000" step="1" required :disabled="busy" /></label>
            <button class="primary" :disabled="busy">Entregar cartas</button>
          </div>
          <p v-if="!formatLimit(progress, grantFormat, grantCard.id)" class="micro">Esta carta no está permitida en los mazos del formato elegido. La entrega no modifica sus reglas.</p>
        </form>
      </section>
      <section aria-labelledby="inventory-title">
        <div class="section-heading"><h2 id="inventory-title">Colección completa</h2><span>{{ collection.length }} cartas · {{ total }} copias</span></div>
        <div class="admin-form-fields">
          <label>Buscar en la colección<input v-model="search" type="search" placeholder="Nombre de la carta" :disabled="busy" /></label>
          <label>Formato de la colección<select v-model="filterFormat" :disabled="busy"><option value="">Todos los formatos</option><option v-for="format in progress.formats" :key="format.id" :value="format.id">{{ format.name }}</option></select></label>
        </div>
        <p class="micro">Editá la cantidad por origen y rareza; usá 0 para quitar esas copias. Al reducirlas, también se ajustan sus mazos. No cambia el saldo de monedas.</p>
        <p v-if="!collection.length">{{ Object.keys(progress.inventory).length ? 'No hay cartas que coincidan con estos filtros.' : 'Esta cuenta todavía no tiene cartas. Podés entregarle las primeras arriba.' }}</p>
        <ul :key="snapshot.revision" class="admin-inventory">
          <li v-for="{ card, lots } in collection.slice((page - 1) * 20, page * 20)" :key="card.id">
            <div class="admin-inventory-card"><CardImage :src="card.image" :alt="card.name_es" loading="lazy" /><h3>{{ card.name_es }}</h3></div>
            <form v-for="lot in lots" :key="lotKey(lot)" class="admin-lot" @submit.prevent="setCopies(card, lot, $event)">
              <div><strong>{{ names[lot.rarity] || 'Rareza sin identificar' }}</strong><span>{{ lot.sourceName }} · {{ formatName(progress, formatOf(lot)) }}</span></div>
              <label>Copias<input name="quantity" :value="lot.quantity" :aria-label="`Copias de ${card.name_es}, ${names[lot.rarity] || 'sin rareza'}, ${lot.sourceName}, ${formatName(progress, formatOf(lot))}`" type="number" min="0" max="10000000" step="1" required :disabled="busy" /></label>
              <button :disabled="busy">Guardar cantidad</button>
            </form>
          </li>
        </ul>
        <nav v-if="pages > 1" class="admin-pagination" aria-label="Páginas de la colección"><button :disabled="busy || page === 1" @click="page--">Anterior</button><span>Página {{ page }} de {{ pages }}</span><button :disabled="busy || page === pages" @click="page++">Siguiente</button></nav>
      </section>
      <section class="admin-clear" aria-labelledby="clear-title">
        <h2 id="clear-title">Vaciar colección</h2>
        <p>Elimina todas las cartas de {{ user.username }}, en todos los formatos, y vacía el contenido de sus mazos. Conserva la cuenta, las monedas y los nombres de los mazos. No se puede deshacer.</p>
        <button v-if="!clearing" class="danger" :disabled="busy || !Object.keys(progress.inventory).length" @click="clearing = true">Vaciar colección de {{ user.username }}</button>
        <form v-else class="admin-form-fields" @submit.prevent="save('collectionClear', { confirmUsername }, `Colección de ${user.username} vaciada.`)">
          <label>Escribí {{ user.username }} para confirmar<input v-model="confirmUsername" autocomplete="off" :disabled="busy" required /></label>
          <button class="danger" :disabled="busy || confirmUsername !== user.username">Eliminar todas las cartas</button><button type="button" :disabled="busy" @click="clearing = false; confirmUsername = ''">Cancelar</button>
        </form>
      </section>
    </template>
  </section>
</template>

<style scoped>
.admin-collection { min-width: 0; }
.admin-collection h1 { overflow-wrap: anywhere; }
.admin-collection > section, .admin-grant { margin-top: 32px; }
.admin-collection label { display: grid; gap: 8px; min-width: 0; }
.admin-collection input, .admin-collection select { min-width: 0; width: 100%; }
.admin-grant { padding-bottom: 32px; border-bottom: 1px solid var(--line); }
.admin-card-results, .admin-inventory { list-style: none; padding: 0; }
.admin-card-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.admin-card-results button { display: flex; align-items: center; gap: 12px; text-align: left; width: 100%; }
.admin-card-results img { width: 40px; height: 58px; object-fit: contain; }
.admin-card-results span { min-width: 0; overflow-wrap: anywhere; }
.admin-card-results small, .admin-lot span { display: block; color: var(--muted); }
.admin-selected-card { display: flex; gap: 16px; align-items: center; margin: 24px 0; }
.admin-selected-card img { width: 80px; }
.admin-form-fields { display: flex; flex-wrap: wrap; align-items: end; gap: 16px; margin-top: 16px; }
.admin-form-fields label { flex: 1 1 180px; }
.admin-inventory > li { padding: 24px 0; border-bottom: 1px solid var(--line); }
.admin-inventory-card { display: flex; align-items: center; gap: 16px; }
.admin-inventory-card img { width: 52px; }
.admin-inventory-card h3 { margin: 0; overflow-wrap: anywhere; }
.admin-lot { display: flex; align-items: end; flex-wrap: wrap; gap: 16px; margin-top: 16px; }
.admin-lot > div { flex: 1 1 260px; overflow-wrap: anywhere; }
.admin-lot label { width: 110px; }
.admin-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 24px; }
.admin-clear { border-top: 1px solid var(--line); padding-top: 24px; }
@media (max-width: 700px) {
  .admin-card-results { grid-template-columns: 1fr; }
  .admin-form-fields > label { flex-basis: 100%; }
  .admin-lot > div { flex-basis: 100%; }
  .admin-collection .section-heading { align-items: start; }
}
</style>
