<script setup>
import {
  byId,
  names,
  image,
  isPublished,
  isExtraDeck,
} from "~/utils/catalog.js";
import {
  remainingCards,
  totalCards,
  raritySummary,
  saveExpansion,
  fillCommons,
} from "~/utils/expansions.js";
import { formatOf, formatName } from '~/utils/formats.js';
const vault = useVault(),
  { data } = vault;
const props = defineProps({ official: Boolean });
const management = computed(() => data.progress.economy.customPacks.filter((p) => !!p.officialSource === props.official));
const editorMatches = computed(() => !!data.draftSource === props.official);
const error = ref(""),
  refill = ref(false);
const existing = computed(() =>
  data.progress.economy.customPacks.find((p) => p.id === data.editingPack),
);
const entries = computed(() =>
  Object.entries(data.draft).map(([id, quantity]) => ({
    id,
    copies: Number(quantity),
    remaining: Number(quantity),
    rarity: data.draftRarities[id] || byId.get(id).rarity,
  })),
);
const draft = computed(() => ({ entries: entries.value }));
const total = computed(() => totalCards(draft.value));
const cover = computed(
  () => byId.get(data.draftCover) || byId.get(entries.value[0]?.id),
);
const summary = computed(() => raritySummary(draft.value));
const isStarter = computed(() => data.draftKind === "starter");
const targetCards = computed(() => Number(data.draftBoxPacks) * Number(data.draftSize));
function autofill() {
  try {
    const filled = fillCommons(entries.value, Number(data.draftSize), Number(data.draftBoxPacks));
    data.draft = Object.fromEntries(filled.map(e => [e.id, e.copies]));
    error.value = '';
    vault.notify('Caja completada con comunes. Las otras rarezas se conservaron.');
  } catch (e) { error.value = e.message; }
}
function changeRarity(id, rarity) {
  data.draftRarities[id] = rarity;
  if (!isStarter.value) data.draft[id] = ({ Rare: 5, 'Super Rare': 3, 'Ultra Rare': 1, 'Secret Rare': 1 }[rarity] || data.draft[id]);
}
const extraCount = computed(() =>
  entries.value
    .filter((e) => isExtraDeck(byId.get(e.id)))
    .reduce((n, e) => n + e.copies, 0),
);
function clear() {
  vault.resetDraft();
  error.value = "";
  refill.value = false;
  if (props.official) navigateTo('/especiales');
}
async function save(status) {
  if (!data.draftName.trim()) {
    error.value = "Escribí un nombre para el producto.";
    return;
  }
  if (!entries.value.length) {
    error.value = "Agregá al menos una carta desde el catálogo.";
    return;
  }
  if (!isStarter.value && total.value < Number(data.draftSize)) {
    error.value =
      "La caja necesita al menos tantas copias como cartas por sobre. Agregá copias o reducí el tamaño del sobre.";
    return;
  }
  const pack = {
    id: data.editingPack || "custom-" + crypto.randomUUID(),
    kind: data.draftKind,
    formatId: data.draftFormat,
    name: data.draftName.trim(),
    description: data.draftDescription.trim(),
    coverId: String(cover.value?.id || ""),
    status,
    cost: Number(data.draftCost),
    size: isStarter.value ? 1 : Number(data.draftSize),
    ...(!isStarter.value && data.draftBoxPacks !== '' ? { boxPacks: Number(data.draftBoxPacks) } : {}),
    entries: entries.value.map((e) => ({ ...e })),
    ...(data.draftSource ? { officialSource: { ...data.draftSource } } : {}),
  };
  const result = (await vault.commit((state) =>
    saveExpansion(state, pack, refill.value),
  ));
  if (!result.ok) {
    error.value = result.error || data.toast;
    return;
  }
  data.editingPack = pack.id;
  refill.value = false;
  error.value = "";
  vault.notify(
    status === "published"
      ? isStarter.value
        ? "Mazo publicado en su formato"
        : "Expansión publicada en su formato"
      : "Borrador guardado: sus cartas todavía no se habilitan",
  );
}
function edit(pack) {
  vault.editProduct(pack);
  error.value = "";
  refill.value = false;
  document.getElementById("expansionName")?.focus();
}
function removeEntry(id) {
  delete data.draft[id];
  delete data.draftRarities[id];
  if (data.draftCover === id) data.draftCover = "";
}
function duplicate(pack) {
  vault.editProduct({ ...pack, id: undefined, name: pack.name.slice(0, 152) + ' (copia)', entries: pack.entries.map((e) => ({ ...e, remaining: e.copies })) });
}
function action(pack, reset) {
  vault.confirm(
    (reset ? "Reponer " : "Eliminar ") + pack.name,
    (reset
      ? "Se restauran todas las copias de esta caja."
      : "Se retira el producto de la tienda y del editor.") +
      " Las cartas obtenidas y los mazos se conservan.",
    async () => {
      if (
        (await vault.commit((s) => {
          if (reset)
            s.economy.customPacks
              .find((p) => p.id === pack.id)
              .entries.forEach((e) => {
                e.remaining = e.copies;
              });
          else
            s.economy.customPacks = s.economy.customPacks.filter(
              (p) => p.id !== pack.id,
            );
        })).ok
      ) {
        if (!reset && data.editingPack === pack.id) clear();
        data.dialog = null;
      }
    },
    reset ? "Reponer caja" : "Eliminar expansión",
  );
}
</script>

<template>
  <section id="especiales" class="expansion-editor">
    <template v-if="editorMatches">
    <div class="expansion-editor-top">
      <p v-if="data.draftSource">
        Basada en {{ data.draftSource.name }} · {{ data.draftSource.format }}.
        La selección original queda vinculada; el precio, las copias y las rarezas del juego son configurables.
      </p>
      <p v-else>
        Diseñá sobres al azar o mazos de contenido fijo. Elegí cartas del
        catálogo y publicalos dentro de un formato.
      </p>
      <button
        v-if="data.editingPack || entries.length"
        class="quiet"
        @click="vault.changeDraft(clear)"
      >
        {{ official ? 'Crear producto propio' : 'Nuevo producto' }}
      </button>
    </div>
    <div class="expansion-workspace">
      <form class="expansion-form" @submit.prevent="save('published')">
        <h2>
          {{
            existing
              ? "Editar " + existing.name
              : isStarter
                ? "Diseñá un mazo de inicio"
                : "Diseñá una expansión"
          }}
        </h2>
        <div class="expansion-fields">
          <label class="wide">Formato del producto<select v-model="data.draftFormat" :disabled="!!existing" aria-label="Formato del producto">
            <option v-for="f in data.progress.formats" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select><small>Las compras pertenecen a este formato. Para cambiarlo en un producto guardado, duplicalo.</small></label>
          <label class="wide"
            >Tipo de producto<select
              v-model="data.draftKind"
            >
              <option value="pack">Expansión de sobres · cartas al azar</option>
              <option value="starter">
                Mazo de inicio · contenido fijo
              </option></select
            ><small v-if="existing"
              >Podés cambiar entre sobres y mazo conservando la lista de cartas. Las compras anteriores no cambian.</small
            ></label
          >
          <label class="wide"
            >Nombre<input
              id="expansionName"
              v-model="data.draftName"
              maxlength="160"
              required
              placeholder="Ej.: El despertar de los dragones"
          /></label>
          <label
            >Portada<select
              v-model="data.draftCover"
              aria-label="Carta de portada"
            >
              <option value="">Primera carta seleccionada</option>
              <option
                v-for="entry in entries"
                :key="entry.id"
                :value="entry.id"
              >
                {{ byId.get(entry.id).name_es }}
              </option>
            </select></label
          >
          <label class="wide"
            >Descripción<textarea
              v-model="data.draftDescription"
              maxlength="600"
              rows="3"
              :placeholder="
                isStarter
                  ? 'Contá cómo se juega este mazo.'
                  : 'Contá qué hace especial a esta expansión.'
              "
            ></textarea>
          </label>
          <label
            >{{ isStarter ? "Monedas por mazo" : "Monedas por sobre"
            }}<input
              v-model.number="data.draftCost"
              type="number"
              min="1"
              max="100000"
              required
          /></label>
          <label v-if="!isStarter"
            >Cartas por sobre<select
              v-model.number="data.draftSize"
              aria-label="Cartas por sobre"
            >
              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
            </select></label
          >
          <label v-if="!isStarter">Sobres por caja<input v-model.number="data.draftBoxPacks" type="number" min="1" :max="Math.floor(100000 / data.draftSize)" step="1" :required="!existing" placeholder="Cantidad de sobres" /><small v-if="existing && !existing.boxPacks">Opcional para cajas anteriores; al definirlo, la publicación exigirá el total exacto.</small></label>
        </div>
        <div v-if="!isStarter" class="box-fill-controls">
          <p v-if="data.draftBoxPacks" role="status">{{ total }} / {{ targetCards }} copias · {{ total < targetCards ? 'Faltan ' + (targetCards - total) : total > targetCards ? 'Sobran ' + (total - targetCards) : 'Caja completa' }}</p>
          <button type="button" :disabled="!entries.length || !data.draftBoxPacks" @click="autofill">Completar caja con comunes</button>
          <p class="expansion-help">Distribución inicial por carta: 5 raras, 3 súper raras, 1 ultra rara y 1 secreta. Podés ajustar esas cantidades; el autorrelleno solo agrega comunes, sin reducir copias. Máximo 1.000 por carta.</p>
        </div>
        <div class="expansion-content-heading">
          <h3>
            {{ isStarter ? "Contenido del mazo" : "Contenido de la caja" }}
          </h3>
          <button type="button" @click="navigateTo('/catalogo')">
            Agregar cartas del catálogo
          </button>
        </div>
        <p v-if="!isStarter" class="expansion-help">
          Elegí las copias y la rareza de cada carta en esta expansión. Todas
          las copias restantes tienen la misma probabilidad de salir.
        </p>
        <p v-if="data.draftSource" class="expansion-help">
          Importación inicial: 1 común, 5 raras, 3 súper raras, 1 ultra rara y 1 secreta por carta, sin reproducir las cantidades de un producto físico.
          Si hay varias rarezas, se elige la primera compatible; las no admitidas empiezan como Común.
          Revisá la distribución antes de publicar. Podés consultar las ediciones originales en la ficha de cada carta.
        </p>
        <p v-if="isStarter" class="expansion-help">
          Cada compra entrega exactamente estas copias y rarezas. No necesita cumplir el tamaño de un mazo: puede ser un lote de cartas.
          Si supera 60 cartas en total, solo se entrega a la colección, sin crear un mazo.
        </p>
        <div v-if="entries.length" class="expansion-entries">
          <div v-for="entry in entries" :key="entry.id" class="expansion-entry">
            <button
              type="button"
              class="entry-image"
              :aria-label="'Ver ' + byId.get(entry.id).name_es"
              @click="data.dialog = { kind: 'detail', id: entry.id }"
            >
              <CardImage
                :src="image(byId.get(entry.id))"
                :alt="byId.get(entry.id).name_en"
                loading="lazy"
              />
            </button>
            <div class="entry-name">
              {{ byId.get(entry.id).name_es
              }}<small>{{ byId.get(entry.id).type }}</small>
            </div>
            <label
              >Rareza<select
                :value="data.draftRarities[entry.id]"
                @change="changeRarity(entry.id, $event.target.value)"
                :aria-label="'Rareza de ' + byId.get(entry.id).name_es"
              >
                <option v-for="(label, r) in names" :key="r" :value="r">
                  {{ label }}
                </option>
              </select></label
            >
            <label
              >Copias<input
                v-model.number="data.draft[entry.id]"
                :aria-label="'Copias de ' + byId.get(entry.id).name_es"
                type="number"
                min="1"
                :max="1000"
                required
            /></label>
            <button
              type="button"
              class="entry-remove quiet"
              :aria-label="
                'Quitar ' + byId.get(entry.id).name_es + ' de la expansión'
              "
              @click="removeEntry(entry.id)"
            >
              Quitar
            </button>
          </div>
        </div>
        <div v-else class="expansion-empty">
          <h3>
            {{
              isStarter
                ? "El mazo empieza con tus cartas."
                : "La caja empieza con tus cartas."
            }}
          </h3>
          <p>
            Buscá entre todas las cartas de Yu-Gi-Oh! y usá «{{
              isStarter ? "A mazo" : "A expansión"
            }}». Elegirlas no las agrega a Mi colección.
          </p>
          <button type="button" @click="navigateTo('/catalogo')">
            Explorar el catálogo completo
          </button>
        </div>
        <label v-if="existing && !isStarter" class="expansion-refill"
          ><input v-model="refill" type="checkbox" /> Reponer la caja al guardar
          cambios de contenido</label
        >
        <p v-if="existing && !isStarter" class="expansion-help">
          Cambiar el nombre, la portada, el precio o el estado conserva las
          existencias. Convertir un mazo en sobres o cambiar cartas, rarezas o tamaño del sobre requiere
          confirmar la reposición.
        </p>
        <p v-if="error" class="vault-error" role="alert">{{ error }}</p>
        <div class="expansion-save">
          <button class="primary">
            {{
              existing
                ? "Guardar y publicar"
                : isStarter
                  ? "Crear y publicar mazo"
                  : "Crear y publicar expansión"
            }}</button
          ><button type="button" @click="save('draft')">
            Guardar borrador
          </button>
        </div>
        <p class="expansion-help">
          Publicar agrega las cartas nuevas a la lista de permitidas de este formato con límite 3. Se conservan las restricciones que ya definiste. No entrega copias; un borrador queda solo en este editor.
        </p>
      </form>
      <aside
        class="expansion-preview"
        :aria-label="
          isStarter ? 'Vista previa del mazo' : 'Vista previa de la expansión'
        "
      >
        <h2>
          {{
            isStarter
              ? "Mazo para " + formatName(data.progress, data.draftFormat)
              : "Sobres para " + formatName(data.progress, data.draftFormat)
          }}
        </h2>
        <div class="expansion-preview-cover">
          <CardImage v-if="cover" :src="image(cover)" :alt="cover.name_en" />
          <div v-else class="expansion-cover-empty">
            Elegí una carta para la portada
          </div>
          <div>
            <h3>
              {{
                data.draftName ||
                (isStarter ? "Tu nuevo mazo" : "Tu nueva expansión")
              }}
            </h3>
            <p>
              {{
                data.draftDescription ||
                (isStarter
                  ? "La descripción de tu mazo aparecerá acá."
                  : "La descripción de tu expansión aparecerá acá.")
              }}
            </p>
          </div>
        </div>
        <dl class="expansion-summary">
          <div>
            <dt>Cartas diferentes</dt>
            <dd>{{ entries.length }}</dd>
          </div>
          <div>
            <dt>{{ isStarter ? "Cartas por compra" : "Copias en la caja" }}</dt>
            <dd>{{ total || 0 }}</dd>
          </div>
          <div v-if="!isStarter">
            <dt>Sobres por caja</dt>
            <dd>{{ data.draftBoxPacks || Math.ceil(total / (Number(data.draftSize) || 1)) || 0 }}</dd>
          </div>
          <div>
            <dt>{{ isStarter ? "Precio por mazo" : "Precio por sobre" }}</dt>
            <dd>{{ data.draftCost || 0 }} monedas</dd>
          </div>
        </dl>
        <p v-if="isStarter" class="expansion-help">
          {{ total - extraCount }} principales · {{ extraCount }} de Extra Deck.
          Compra repetible: no consume cartas de las cajas.
        </p>
        <h3>{{ isStarter ? "Rarezas del mazo" : "Distribución inicial" }}</h3>
        <table class="rarity-distribution">
          <thead>
            <tr>
              <th>Rareza</th>
              <th>Copias</th>
              <th>{{ isStarter ? "Del mazo" : "Por extracción" }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary" :key="row.rarity">
              <th>{{ row.label }}</th>
              <td>{{ row.copies || 0 }}</td>
              <td>
                {{
                  row.percent.toLocaleString("es-AR", {
                    maximumFractionDigits: 1,
                  })
                }}%
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!isStarter" class="expansion-help">
          Sin rareza garantizada. Estos porcentajes corresponden a la primera
          carta de una caja llena y cambian a medida que se agotan las copias.
        </p>
        <p
          v-if="!isStarter && total > 0 && total % data.draftSize"
          class="expansion-help"
        >
          El último sobre tendrá {{ total % data.draftSize }} cartas, por el
          mismo precio.
        </p>
      </aside>
    </div>
    </template>
    <div v-else class="expansion-empty">
      <h2>{{ official ? 'Elegí una expansión del archivo' : 'Tenés una expansión oficial en edición' }}</h2>
      <p>El borrador que estás preparando se conserva mientras navegás.</p>
      <button v-if="official" @click="navigateTo('/expansiones')">Ver expansiones oficiales</button>
      <template v-else>
        <button @click="navigateTo('/expansiones?editor=1')">Volver al borrador oficial</button>
        <button @click="vault.changeDraft(clear)">Crear producto propio</button>
      </template>
    </div>
    <section class="expansion-management" aria-label="Tus expansiones">
      <div class="section-heading">
        <h2>{{ official ? 'Publicaciones oficiales preparadas' : 'Mis creaciones: expansiones y mazos' }}</h2>
        <span>{{ management.length }} guardadas</span>
      </div>
      <article
        v-for="pack in management"
        :key="pack.id"
        class="expansion-management-row"
      >
        <CardImage
          :src="image(byId.get(pack.coverId || pack.entries[0].id))"
          :alt="pack.name"
          loading="lazy"
        />
        <div>
          <span class="catalog-status">{{
            isPublished(pack)
              ? pack.kind === "starter"
                ? "Publicado en Mazos de inicio"
                : "Publicada en Sobres"
              : "Borrador"
          }}</span>
          <h3>{{ pack.name }}</h3>
          <p>Formato: {{ formatName(data.progress, formatOf(pack)) }}</p>
          <p>
            {{ pack.entries.length }} cartas diferentes ·
            {{
              pack.kind === "starter"
                ? totalCards(pack) + " cartas fijas"
                : remainingCards(pack) + " / " + totalCards(pack) + " copias"
            }}
            · {{ pack.cost }} monedas por
            {{ pack.kind === "starter" ? "mazo" : "sobre" }}
          </p>
        </div>
        <div class="backup-actions">
          <button
            v-if="isPublished(pack)"
            @click="
              navigateTo(
                '/formatos?formato=' + formatOf(pack) + (pack.kind === 'starter' ? '' : '&expansion=' + pack.id),
              )
            "
          >
            {{
              pack.kind === "starter"
                ? "Ver en Mazos de inicio"
                : "Ver en Sobres"
            }}</button
          ><button @click="edit(pack)">Editar</button
          ><button @click="duplicate(pack)">Duplicar para otro formato</button
          ><button v-if="pack.kind !== 'starter'" @click="action(pack, true)">
            Reponer caja</button
          ><button class="quiet" @click="action(pack, false)">Eliminar</button>
        </div>
      </article>
      <p v-if="!management.length">
        Todavía no guardaste productos. Podés preparar un borrador o publicar tu
        primera expansión o mazo.
      </p>
    </section>
  </section>
</template>
