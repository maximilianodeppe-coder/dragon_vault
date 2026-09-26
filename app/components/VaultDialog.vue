<script setup>
import {
  allCards as cards,
  byId,
  starterProducts,
  names,
} from "~/utils/catalog.js";
import { validate, clone } from "~/utils/progress.js";
import { Economy } from "~/utils/actions.js";
import { canSaveStarter } from '~/utils/deck-rules.js';
import { lotsFor, lotKey, isSellable } from "~/utils/inventory.js";
import { formatOf, formatName, ownedInFormat } from '~/utils/formats.js';
const vault = useVault(),
  { data } = vault;
const dialog = ref(),
  quantity = ref(1),
  selectedLot = ref(""),
  saveDeck = ref(false),
  prices = ref({}),
  pending = ref(null),
  error = ref("");
const kind = computed(() => data.dialog?.kind);
const card = computed(() => byId.get(data.dialog?.id));
const saleLots = computed(() => lotsFor(data.progress, data.dialog?.id));
const saleLot = computed(() =>
  saleLots.value.find((l) => lotKey(l) === selectedLot.value),
);
const starter = computed(() =>
  starterProducts(data.progress).find((s) => s.id === data.dialog?.id),
);
const starterCount = computed(
  () => starter.value?.entries.reduce((n, e) => n + e.quantity, 0) || 0,
);
const custom = computed(() =>
  data.progress.economy.customPacks.find((p) => p.id === data.dialog?.id),
);
const saleItems = computed(() =>
  data.dialog?.id
    ? [
        {
          id: data.dialog.id,
          lot: selectedLot.value,
          quantity: Number(quantity.value),
        },
      ]
    : Economy.excess(data.progress),
);
const available = computed(() =>
  card.value
    ? Math.min(
        isSellable(saleLot.value) ? saleLot.value.quantity : 0,
        Math.max(
          0,
          ownedInFormat(data.progress, String(card.value.id), formatOf(saleLot.value)) -
            Economy.protectedCopies(data.progress, String(card.value.id), formatOf(saleLot.value)),
        ),
      )
    : 0,
);
const quote = computed(() => {
  try {
    return Economy.quoteSale(data.progress, cards, saleItems.value);
  } catch (e) {
    return { error: e.message };
  }
});
watch(
  () => data.dialog,
  async (value) => {
    quantity.value = 1;
    selectedLot.value =
      value?.lot ||
      (saleLots.value.find(isSellable)
        ? lotKey(saleLots.value.find(isSellable))
        : "");
    saveDeck.value = false;
    pending.value = null;
    error.value = "";
    prices.value = clone(data.progress.economy.prices);
    await nextTick();
    if (!dialog.value) return;
    if (value && !dialog.value.open) dialog.value.showModal();
    else if (!value && dialog.value.open) dialog.value.close();
  },
);
function close() {
  data.dialog = null;
}
async function buy() {
  if ((await vault.request('buy', { id: data.dialog.id })).ok) {
    close();
    vault.notify("Carta agregada a tu colección");
  }
}
async function buyStarter() {
  const count = starterCount.value;
  if (
    (await vault.request('starter', { id: starter.value.id, createDeck: saveDeck.value }))
      .ok
  ) {
    if (saveDeck.value && canSaveStarter(starter.value)) data.currentDeck = data.progress.decks.at(-1)?.id;
    close();
    vault.notify(`${count} cartas agregadas a tu colección`);
  }
}
async function sell() {
  const result = (await vault.request('sell', { items: saleItems.value }));
  if (result.ok) {
    data.undo = null;
    close();
    vault.notify(
      `Vendiste ${result.result.count} copias por ${result.result.coins} monedas`,
    );
  }
}
async function savePrices() {
  if (
    (await vault.commit((s) => {
      s.economy.prices = clone(prices.value);
    })).ok
  )
    close();
}
async function stock(id, event, field = "stock") {
  const n = Number(event.target.value);
  if (
    !(await vault.commit((s) => {
      s.economy.offers.find((o) => o.id === id)[field] = n;
    })).ok
  )
    event.target.value =
      data.progress.economy.offers.find((o) => o.id === id)[field] ??
      Economy.shopPrice(data.progress, id);
}
async function readBackup(event) {
  pending.value = null;
  error.value = "";
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 20000000)
      throw Error("El archivo supera el máximo de 20 MB.");
    pending.value = validate(JSON.parse(await file.text()));
  } catch (e) {
    error.value = e.message;
  }
}
function confirmImport() {
  const backup = clone(pending.value);
  vault.confirm('¿Importar esta copia?', 'Reemplaza tu progreso y las cajas, ofertas y reglas compartidas. Las colecciones de otros jugadores se conservan.', () => vault.importProgress(backup), 'Importar copia');
}
</script>
<template>
  <dialog
    ref="dialog"
    :class="{ 'card-detail-dialog': kind === 'detail' }"
    aria-label="Dragon Vault"
    @close="close"
    @click="$event.target === dialog && close()"
  >
    <button class="close" aria-label="Cerrar" @click="close">×</button>
    <CardDetail v-if="kind === 'detail'" :id="data.dialog.id" />
    <template v-else-if="kind === 'confirm'"
      ><h2>{{ data.dialog.title }}</h2>
      <p>{{ data.dialog.message }}</p>
      <div class="backup-actions">
        <button class="primary" @click="data.dialog.action()">
          {{ data.dialog.label }}</button
        ><button @click="close">Cancelar</button>
      </div></template
    >
    <template v-else-if="kind === 'wallet'"
      ><h2>Tus monedas</h2>
      <p class="wallet-balance">
        ◉ {{ data.progress.coins.toLocaleString("es-AR") }}
      </p>
      <p>
        Cada sobre cuesta <strong>5 monedas</strong> y cada mazo de inicio,
        <strong>500 monedas</strong>.
      </p>
      <p>
        Recibís 1.000 monedas iniciales. El saldo se guarda junto con tu
        colección y se incluye en las copias de seguridad.
      </p>
      <button
        v-if="vault.isAdmin.value"
        class="primary"
        @click="
          vault.commit((s) => {
            s.coins = Math.min(1e9, s.coins + 1000);
          })
        "
      >
        Agregar 1.000 monedas
      </button>
      <p class="micro">
        Monedas virtuales, sin dinero real. Solo el administrador puede recargarlas.
      </p></template
    >
    <template v-else-if="kind === 'backup'"
      ><h2>Tu colección, a salvo.</h2>
      <p>
        Descargá una copia con tus cartas, monedas, mazos y el avance de las
        cajas y la tienda. Tu cuenta ya conserva el progreso entre dispositivos.
      </p>
      <div class="backup-actions">
        <button v-if="vault.isAdmin.value" @click="vault.importLocal">Importar progreso de este navegador</button>
        <button class="primary" @click="vault.exportData">
          Descargar copia</button
        ><label v-if="vault.isAdmin.value" class="quiet"
          >Elegir copia
          <input
            type="file"
            accept=".json,application/json"
            @change="readBackup"
        /></label>
      </div>
      <p class="micro">
        Solo el administrador puede importar. Reemplaza su progreso y las cajas, ofertas y reglas compartidas de todos los jugadores. El archivo no incluye imágenes.
      </p>
      <p v-if="error" class="vault-error" role="alert">{{ error }}</p>
      <template v-if="pending && vault.isAdmin.value"
        ><p>
          Copia válida:
          {{ Object.values(pending.owned).reduce((a, b) => a + b, 0) }} cartas y
          {{ pending.decks.length }} mazos.
        </p>
        <button @click="confirmImport">
          Importar mi progreso y configuración compartida
        </button></template
      ></template
    >
    <template v-else-if="kind === 'starter'"
      ><h2>{{ starter.name }}</h2>
      <p>
        El producto cuesta {{ starter.cost }} monedas. Tu saldo:
        {{ data.progress.coins.toLocaleString("es-AR") }} monedas. Vas a agregar
        sus {{ starterCount }} cartas a tu colección, con las cantidades y
        rarezas indicadas en su contenido.
      </p>
      <label v-if="canSaveStarter(starter)"
        ><input v-model="saveDeck" type="checkbox" /> Guardarlo también en Mis
        mazos, listo para editar</label
      >
      <p v-else>Solo se agregará a tu colección: este lote no cumple los límites para guardarlo como mazo (hasta 60 cartas totales, 15 de Extra y 3 por carta jugable).</p>
      <p class="micro">
        Podés agregar este producto más de una vez. No consume cartas de las
        cajas.
      </p>
      <button
        class="primary"
        :disabled="data.progress.coins < starter.cost"
        @click="buyStarter"
      >
        Comprar · {{ starter.cost }} monedas
      </button></template
    >
    <template v-else-if="kind === 'buy'"
      ><h2>Comprar {{ card.name_es }}</h2>
      <p>
        Una copia Común · No vendible, por
        {{ Economy.shopPrice(data.progress, card.id) }} monedas. No se puede
        vender ni cuenta para la venta rápida. Tu saldo quedará en
        {{ data.progress.coins - Economy.shopPrice(data.progress, card.id) }}.
      </p>
      <button class="primary" @click="buy">
        Comprar por {{ Economy.shopPrice(data.progress, card.id) }} monedas
      </button></template
    >
    <template v-else-if="kind === 'sale'"
      ><h2>{{ card ? card.name_es : "Venta rápida · excedentes de 3" }}</h2>
      <p v-if="card">
        Tenés {{ data.progress.owned[card.id] }} copias en total. De la edición
        elegida podés vender {{ available }}. Siempre se conserva la cantidad
        que necesitan tus mazos, sin importar la rareza.
      </p>
      <p v-else>
        Se venderán solo las copias que superen tres de cada carta por formato, en toda tu
        colección, sin importar los filtros. Primero se eligen las de menor
        valor de venta. Las compras de tienda no cuentan para calcular
        excedentes y nunca se venden. Las copias sin identificar se conservan.
      </p>
      <label v-if="card"
        >Expansión y rareza a vender<select v-model="selectedLot">
          <option value="" disabled>Elegí las copias</option>
          <option
            v-for="lot in saleLots"
            :key="lotKey(lot)"
            :value="lotKey(lot)"
            :disabled="!isSellable(lot)"
          >
            {{ formatName(data.progress, formatOf(lot)) }} · {{ lot.sourceName }} ·
            {{ names[lot.rarity] || "Sin identificar" }} ·
            {{ lot.quantity }} copias
            {{ lot.source === "shop" ? "· No vendible" : "" }}
          </option>
        </select></label
      >
      <p v-if="card && isSellable(saleLot)">
        Valor de esta copia:
        {{ Economy.price(data.progress, saleLot, "sell") }} monedas.
      </p>
      <p v-if="card && !saleLots.some(isSellable)">
        No hay copias vendibles. Las compras de tienda no se venden; las copias
        sin identificar necesitan origen y rareza.
      </p>
      <label v-if="card"
        >Copias a vender
        <input
          v-model.number="quantity"
          type="number"
          min="1"
          :max="available"
          step="1"
      /></label>
      <div v-else class="sale-list">
        <div v-for="item in saleItems" :key="item.id + item.lot">
          <span
            >{{ byId.get(item.id).name_es }} × {{ item.quantity }} ·
            {{ item.sourceName }} · {{ names[item.rarity] }}</span
          ><b
            >+{{
              item.quantity * Economy.price(data.progress, item, "sell")
            }}
            ◉</b
          >
        </div>
      </div>
      <p role="status">
        {{
          quote.error ||
          `${quote.count} copias → +${quote.coins} monedas · saldo final: ${data.progress.coins + quote.coins}`
        }}
      </p>
      <div class="backup-actions">
        <button class="primary" :disabled="!!quote.error" @click="sell">
          Confirmar venta</button
        ><button @click="close">Cancelar</button>
      </div></template
    >
    <template v-else-if="kind === 'prices'"
      ><h2>Valores por rareza</h2>
      <p>
        La venta usa la rareza de cada copia, salvo las de tienda, que no son
        vendibles. La compra Común es el precio por defecto de las ofertas sin
        precio individual; los demás valores de compra se conservan por
        compatibilidad.
      </p>
      <form @submit.prevent="savePrices">
        <div class="price-table">
          <b>Rareza</b><b>Compra</b><b>Venta</b
          ><template v-for="(name, r) in names" :key="r"
            ><span>{{ name }}</span
            ><input
              v-model.number="prices[r].buy"
              :aria-label="'Compra ' + name"
              type="number"
              min="1"
              max="100000"
              required /><input
              v-model.number="prices[r].sell"
              :aria-label="'Venta ' + name"
              type="number"
              min="0"
              max="10000"
              required
          /></template>
        </div>
        <p class="micro">
          Los valores deben ser enteros y compra debe superar a venta.
        </p>
        <button class="primary">Guardar valores</button>
      </form></template
    >
    <template v-else-if="kind === 'shop'"
      ><h2>Editar tienda</h2>
      <p>
        Cambiá el precio por carta y sus existencias, o retirala de la oferta.
        Todas se compran como comunes no vendibles. Para sumar otras cartas,
        abrí la base de datos y usá «A tienda».
      </p>
      <div class="sale-list shop-offers">
        <div v-for="offer in data.progress.economy.offers" :key="offer.id">
          <span>{{ byId.get(offer.id).name_es }}</span
          ><label
            >Precio<input
              :value="Economy.shopPrice(data.progress, offer.id)"
              :aria-label="'Precio ' + byId.get(offer.id).name_es"
              type="number"
              min="1"
              max="100000"
              @change="stock(offer.id, $event, 'price')" /></label
          ><label
            >Existencias<input
              :value="offer.stock"
              :aria-label="'Stock ' + byId.get(offer.id).name_es"
              type="number"
              min="0"
              max="100000"
              @change="stock(offer.id, $event)" /></label
          ><button
            @click="
              vault.commit((s) => {
                s.economy.offers = s.economy.offers.filter(
                  (o) => o.id !== offer.id,
                );
              })
            "
          >
            Retirar
          </button>
        </div>
        <p v-if="!data.progress.economy.offers.length">No hay ofertas.</p>
      </div>
      <button
        class="primary"
        @click="
          close();
          navigateTo('/catalogo');
        "
      >
        Elegir cartas de la base de datos
      </button></template
    >
    <template v-else-if="kind === 'content' && custom"
      ><h2>{{ custom.name }}</h2>
      <p>
        Copias restantes / iniciales. Cada copia restante tiene la misma
        probabilidad de salir.
      </p>
      <div class="sale-list">
        <div v-for="entry in custom.entries" :key="entry.id">
          <button @click="data.dialog = { kind: 'detail', id: entry.id }">
            {{ byId.get(entry.id).name_es }}</button
          ><span>{{ entry.remaining }} / {{ entry.copies }}</span>
        </div>
      </div></template
    >
    <template v-else-if="kind === 'clear'"
      ><h2>¿Borrar toda tu colección?</h2>
      <p>
        Se eliminarán todas las cartas obtenidas. Tus mazos conservarán sus
        nombres, pero quedarán vacíos. Las cajas y el historial de aperturas se
        mantienen.
      </p>
      <p>
        Podés descargar una copia antes de continuar. La última eliminación se
        puede deshacer desde tu cuenta.
      </p>
      <div class="delete-actions">
        <button @click="vault.exportData">Descargar copia</button
        ><button @click="close">Cancelar</button
        ><button class="danger" @click="vault.clearCollection">
          Borrar toda mi colección
        </button>
      </div></template
    >
    <template v-else-if="kind === 'sources'"
      ><h2>Fuentes y edición</h2>
      <p>
        Mazos de inicio Yugi (SDY) y Kaiba (SDK), TCG Norteamérica 2002, 50
        cartas fijas cada uno; Legend of Blue Eyes White Dragon (126), Metal
        Raiders (144) y Spell Ruler (104). La tercera expansión se publicó
        originalmente como Magic Ruler; usamos los códigos SRL. Rarezas e
        imágenes en inglés: YGOPRODeck. Nombres y descripciones de las 422
        cartas clásicas en español: base oficial de Konami. El catálogo completo
        adicional incorpora nombres y efectos españoles de YAML Yugi y CDBEsp
        (fuente comunitaria); las fichas sin traducción disponible se
        identifican como pendientes. No habilita cartas en el juego
        automáticamente.
      </p>
      <p>
        Las fichas históricas conservan el efecto anterior en los cuatro cambios
        funcionales confirmados: Sangan, Bruja del Bosque Negro, Tortuga
        Catapulta y Oscuridad Aproximándose. Son traducciones del efecto TCG
        anterior, no transcripciones oficiales españolas. La auditoría no es
        exhaustiva. Las imágenes pueden corresponder a reediciones.
      </p>
      <p>
        Cajas simuladas con 500 cartas: 100 sobres de 5. Se mantienen 3 copias
        de cada rara, 2 de cada súper rara, 1 de cada ultra rara y secreta; el
        resto se distribuye entre las comunes. No son cajas oficiales de Duel
        Links ni reproducen sobres físicos.
      </p>
      <p>
        El progreso se guarda en tu cuenta. Las cajas y ofertas son compartidas. No se incluyen intercambios ni duelos.
      </p>
      <p>
        <a
          class="source-link"
          href="https://ygoprodeck.com/api-guide/"
          target="_blank"
          rel="noopener"
          >YGOPRODeck</a
        >
        ·
        <a
          href="https://github.com/DawnbrandBots/yaml-yugi"
          target="_blank"
          rel="noopener"
          >YAML Yugi</a
        >
        ·
        <a
          href="https://github.com/ryoken08/CDBEsp"
          target="_blank"
          rel="noopener"
          >CDBEsp</a
        >
        ·
        <a
          class="source-link"
          href="https://www.db.yugioh-card.com/yugiohdb/?request_locale=es"
          target="_blank"
          rel="noopener"
          >Base oficial de Konami</a
        >
      </p></template
    >
    <p v-if="data.toast" class="vault-error" role="status">{{ data.toast }}</p>
  </dialog>
</template>
