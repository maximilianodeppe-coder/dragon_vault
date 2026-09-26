<script setup>
import {
  allCards,
  print,
  catalogMetadata,
  spanishMetadata,
  pendingTextChanges,
} from "~/utils/catalog.js";
import query from "~/utils/collection-query.js";
import { defaultFilters } from "~/utils/filters.js";
import { lotsFor } from "~/utils/inventory.js";
import { formatOf, formatOwned, formatLimit } from '~/utils/formats.js';
const props = defineProps({ catalog: Boolean });
const vault = useVault(),
  { data } = vault;
const filters = ref(defaultFilters()),
  page = ref(0);
const formatId = ref('');
const owned = computed(() => !props.catalog && formatId.value ? formatOwned(data.progress, formatId.value) : data.progress.owned);
watch(formatId, () => { page.value = 0; });
const active = computed(
  () => new Map(vault.gameCards.value.map((c) => [String(c.id), c])),
);
const source = computed(() =>
  props.catalog
    ? allCards.map((c) => active.value.get(String(c.id)) || c)
    : vault.gameCards.value.filter((c) => !formatId.value || formatLimit(data.progress, formatId.value, c.id) > 0 || owned.value[c.id]).map((c) => ({
        ...c,
        ownedCount: owned.value[c.id] || 0,
        ownedLots: lotsFor(data.progress, String(c.id)).filter((l) => !formatId.value || formatOf(l) === formatId.value),
      })),
);
const result = computed(() =>
  query(source.value, owned.value, filters.value),
);
const pages = computed(() =>
  Math.max(1, Math.ceil(result.value.cards.length / 30)),
);
watch(
  filters,
  () => {
    page.value = 0;
  },
  { deep: true },
);
watch(pages, (value) => {
  page.value = Math.min(page.value, value - 1);
});
const visible = computed(() =>
  props.catalog
    ? result.value.cards.slice(page.value * 30, (page.value + 1) * 30)
    : result.value.cards,
);
const draftCount = computed(() =>
  Object.values(data.draft).reduce((a, b) => a + b, 0),
);
</script>
<template>
  <section :id="catalog ? 'catalogo' : 'coleccion'">
    <div v-if="!catalog" class="deck-command"><FormatSelect v-model="formatId" all label="Formato de la colección" /><span>Las cantidades corresponden a copias obtenidas en el formato elegido. La ficha permite ver todos los orígenes.</span></div>
    <p v-if="catalog">
      {{ allCards.length.toLocaleString("es-AR") }} cartas para diseñar tus
      expansiones. Las cartas de «Solo catálogo» no aparecen en Mi colección
      hasta que publiques una expansión que las incluya.
    </p>
    <p v-if="catalog" class="catalog-source">
      Fuente:
      <a href="https://ygoprodeck.com/api-guide/" target="_blank" rel="noopener"
        >YGOPRODeck</a
      >
      ·
      {{
        catalogMetadata
          ? new Date(catalogMetadata.retrievedAt).toLocaleDateString("es-AR")
          : "Catálogo local"
      }}. Textos en español: {{ spanishMetadata?.count || 422 }} fichas.
      {{ spanishMetadata?.missing || 0 }} pendientes de traducción; se conserva
      su texto original.
    </p>
    <p v-if="catalog && data.catalogError" class="vault-error" role="alert">
      {{ data.catalogError }}
    </p>
    <details v-if="catalog && vault.isAdmin.value" class="catalog-source">
      <summary>Variantes y revisión de erratas · {{ pendingTextChanges.length }} cambios pendientes</summary>
      <p>La E señala una variante post-errata de las cuatro cartas históricas documentadas. El chequeo diario compara textos cuando YGOPRODeck cambia de versión; las diferencias se conservan para revisión, sin clasificarlas automáticamente como erratas funcionales. No es un historial completo de todas las cartas.</p>
      <article v-for="(change, index) in pendingTextChanges" :key="index">
        <h3>{{ change.name }} · {{ change.detectedAt }}</h3>
        <p>Anterior: {{ change.before }}</p><p>Nuevo: {{ change.after }}</p>
      </article>
    </details>
    <div class="collection-layout">
      <CardFilters
        v-model="filters"
        :error="result.error"
        :source-cards="source"
        :catalog="catalog"
      />
      <div class="collection-results">
        <div v-if="catalog && vault.isAdmin.value" class="section-tools">
          <span
            >{{ draftCount }} copias en el borrador
            {{
              data.draftKind === "starter" ? "del mazo" : "de la expansión"
            }}</span
          ><button @click="navigateTo(data.draftSource ? '/expansiones?editor=1' : '/especiales')">
            Ir al editor de expansiones
          </button>
        </div>
        <div v-else class="collection-actions">
          <button
            class="primary"
            @click="data.dialog = { kind: 'sale', id: null }"
          >
            Venta rápida · excedentes de 3
          </button>
          <details class="collection-danger">
            <summary>Más opciones</summary>
            <button class="danger" @click="data.dialog = { kind: 'clear' }">
              Borrar toda mi colección
            </button>
          </details>
          <button v-if="data.undo" @click="vault.undoClear">
            Deshacer última eliminación</button
          ><span>Para vender cartas puntuales, abrí su ficha.</span>
        </div>
        <p class="muted">
          {{ result.cards.length }} de {{ source.length }} cartas
          <template v-if="catalog"
            >· página {{ page + 1 }} de {{ pages }}</template
          ><template v-else
            >·
            {{
              result.cards.reduce(
                (n, c) => n + (owned[c.id] || 0),
                0,
              )
            }}
            copias en tu colección</template
          >
        </p>
        <div class="cards">
          <template v-for="card in visible" :key="card.id">
            <article v-if="catalog" class="market-card">
              <span class="catalog-status">{{
                active.has(String(card.id)) ? "En juego" : "Solo catálogo"
              }}</span>
              <CardTile :card="print(card, filters.set)" /><small
                >En tienda: Común · No vendible</small
              >
              <div v-if="vault.isAdmin.value" class="catalog-card-actions">
                <button
                  :disabled="!active.has(String(card.id))"
                  :title="
                    !active.has(String(card.id))
                      ? 'Publicá una expansión con esta carta primero'
                      : ''
                  "
                  @click="vault.addOffer(card.id)"
                >
                  A tienda</button
                ><button @click="vault.addDraft(card.id)">
                  {{ data.draftKind === "starter" ? "A mazo" : "A expansión" }}
                </button>
              </div>
            </article>
            <CardTile v-else :card="card" hide-rarity />
          </template>
        </div>
        <p v-if="!visible.length">
          No hay cartas que coincidan. Probá ampliar los rangos o limpiar los
          filtros.
        </p>
        <div v-if="catalog" class="pagination">
          <button :disabled="page === 0" @click="page--">Anterior</button
          ><button :disabled="page >= pages - 1" @click="page++">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
