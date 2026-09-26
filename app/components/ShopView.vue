<script setup>
import { byId, names } from "~/utils/catalog.js";
import Economy from "~/utils/economy-engine.js";
import { formatLimit } from '~/utils/formats.js';
const vault = useVault(), { data } = vault;
</script>
<template>
  <section id="tienda">
    <div class="section-tools">
      <strong
        >{{ data.progress.coins.toLocaleString("es-AR") }} monedas
        disponibles</strong
      ><button v-if="vault.isAdmin.value" @click="data.dialog = { kind: 'shop' }">Editar tienda</button
      ><button v-if="vault.isAdmin.value" @click="data.dialog = { kind: 'prices' }">
        Valores por rareza
      </button>
    </div>
    <p class="micro">
      Las existencias de la tienda son compartidas entre todos los jugadores.
    </p>
    <details class="market-prices">
      <summary>Valores de venta de copias obtenidas fuera de la tienda</summary>
      <div id="priceSummary">
        <div v-for="(name, rarity) in names" :key="rarity">
          <span>{{ name }}</span
          ><b>{{ data.progress.economy.prices[rarity].sell }} ◉</b>
        </div>
      </div>
      <p>
        La venta usa la rareza real de cada copia. Las compras de tienda no se
        pueden vender ni cuentan para la venta rápida.
      </p>
    </details>
    <p>
      Todas las ofertas entregan una copia <strong>Común · No vendible</strong>.
      Estas copias pertenecen a Oficial. El precio se configura por carta desde «Editar
      tienda».
    </p>
    <div class="cards">
      <article
        v-for="offer in data.progress.economy.offers"
        :key="offer.id"
        class="market-card"
      >
        <CardTile
          :card="{ ...byId.get(offer.id), rarity: 'Common', shop: true }"
        />
        <div class="market-meta">
          <b>{{ Economy.shopPrice(data.progress, offer.id) }} ◉</b
          ><span>{{ offer.stock }} disponibles</span>
        </div>
        <button
          :disabled="
            !offer.stock ||
            !formatLimit(data.progress, 'official', offer.id) ||
            data.progress.coins < Economy.shopPrice(data.progress, offer.id)
          "
          @click="data.dialog = { kind: 'buy', id: offer.id }"
        >
          Comprar una copia</button
        ><small>{{ formatLimit(data.progress, 'official', offer.id) ? 'Oficial · No vendible' : 'No permitida en Oficial' }}</small>
      </article>
    </div>
    <p v-if="!data.progress.economy.offers.length">
      La tienda está vacía. Elegí cartas desde «Editar tienda».
    </p>
  </section>
</template>
