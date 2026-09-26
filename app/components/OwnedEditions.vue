<script setup>
import { names, byId, SETS, starters } from "~/utils/catalog.js";
import {
  lotsFor,
  lotKey,
  identifyCopies,
  editionFor,
  isSellable,
} from "~/utils/inventory.js";
import Economy from "~/utils/economy-engine.js";
import { formatOf, formatName } from '~/utils/formats.js';
const props = defineProps({ id: String });
const vault = useVault(),
  { data } = vault;
const lots = computed(() => lotsFor(data.progress, props.id));
const rarityTotals = computed(() => Object.entries(lots.value.reduce((totals, lot) => {
  const rarity = lot.rarity || 'unknown';
  totals[rarity] = (totals[rarity] || 0) + lot.quantity;
  return totals;
}, {})));
const unknown = computed(() => lots.value.find((l) => !l.rarity));
const identifying = ref(false),
  quantity = ref(1),
  source = ref(""),
  rarity = ref("Common"),
  error = ref("");
const products = computed(() => [
  ...[...SETS, ...starters]
    .filter((p) => byId.get(props.id).obtainable?.some((e) => e.set === p.id))
    .map((p) => ({ id: p.id, name: p.es || p.name })),
  ...data.progress.economy.customPacks.filter((p) =>
    formatOf(p) === 'official' && p.entries.some((e) => e.id === props.id),
  ),
  { id: "shop", name: "Tienda" },
  { id: "identified", name: "Otra expansión / no recuerdo el origen" },
]);
watch(source, (id) => {
  const p = data.progress.economy.customPacks.find((p) => p.id === id);
  rarity.value =
    p?.entries.find((e) => e.id === props.id)?.rarity ||
    editionFor(byId.get(props.id), id).rarity;
});
async function identify() {
  const product = products.value.find((p) => p.id === source.value);
  if (!product) {
    error.value = "Elegí la expansión o indicá que no recordás el origen.";
    return;
  }
  if (
    (await vault.commit((s) =>
      identifyCopies(s, props.id, Number(quantity.value), {
        source: product.id,
        sourceName: product.name,
        rarity: rarity.value,
      }),
    )).ok
  ) {
    identifying.value = false;
    error.value = "";
    vault.notify("Copias identificadas. La cantidad total no cambió.");
  } else error.value = data.toast;
}
</script>
<template>
  <section
    v-if="lots.length"
    class="owned-editions"
    aria-label="Tus copias por expansión y rareza"
  >
    <h3>Tus copias</h3>
    <ul aria-label="Cantidad total por rareza">
      <li v-for="[rarity, quantity] in rarityTotals" :key="rarity">{{ names[rarity] || 'Rareza sin identificar' }}: {{ quantity }} copias</li>
    </ul>
    <p class="micro">
      Cada copia conserva su formato, expansión y valor de venta. Solo se usa en mazos de su formato.
    </p>
    <div v-for="lot in lots" :key="lotKey(lot)" class="owned-edition">
      <div>
        <strong>{{ lot.sourceName }}</strong
        ><span>Formato: {{ formatName(data.progress, formatOf(lot)) }}</span
        ><span
          >{{ lot.quantity }} copias ·
          {{ names[lot.rarity] || "Rareza sin identificar" }}</span
        ><small v-if="isSellable(lot)"
          >{{ Economy.price(data.progress, lot, "sell") }} monedas por
          copia</small
        >
        <small v-if="lot.source === 'shop'"
          >Compra de tienda · No vendible</small
        >
      </div>
      <button
        v-if="isSellable(lot)"
        @click="data.dialog = { kind: 'sale', id, lot: lotKey(lot) }"
      >
        Vender estas copias
      </button>
      <button v-else-if="!lot.rarity && vault.isAdmin.value" @click="identifying = !identifying">
        Identificar copias
      </button>
    </div>
    <form
      v-if="identifying && unknown"
      class="edition-identify"
      @submit.prevent="identify"
    >
      <p>
        El guardado anterior no registraba edición ni rareza. Indicá las que
        recordás: no se deducen de las cajas, porque pudieron reponerse o
        cambiar.
      </p>
      <label
        >Expansión de estas copias<select v-model="source" required>
          <option value="" disabled>Elegí el origen</option>
          <option v-for="p in products" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select></label
      >
      <label
        >Rareza de estas copias<select v-model="rarity">
          <option v-for="(label, key) in names" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      >
      <label
        >Cantidad a identificar<input
          v-model.number="quantity"
          type="number"
          min="1"
          :max="unknown.quantity"
          required
      /></label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="primary">Confirmar identificación</button>
    </form>
  </section>
</template>
