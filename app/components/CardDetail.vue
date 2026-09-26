<script setup>
import {
  byId,
  names,
  types,
  attrs,
  races,
  image,
  rarityClass,
  productName,
  isPublished,
} from "~/utils/catalog.js";
import { lotsFor, isSellable } from "~/utils/inventory.js";
const props = defineProps({ id: String });
const { data } = useVault();
const card = computed(() =>
  data.dialog?.shop
    ? { ...byId.get(props.id), rarity: "Common" }
    : byId.get(props.id),
);
</script>
<template>
  <div class="detail" :class="rarityClass(card)">
    <CardImage :src="image(card)" :alt="card.name_en" />
    <div class="detail-content">
      <h2>{{ card.name_es }} <ErrataBadge v-if="card.postErrata" /></h2>
      <p v-if="card.postErrata" class="micro">Variante con efecto actualizado. Sus copias se registran por separado de la versión histórica.</p>
      <div class="english" v-if="card.name_en !== card.name_es">
        {{ card.name_en }}
      </div>
      <span class="detail-reference">
        {{
          data.dialog?.shop
            ? "Oferta de tienda · Común · No vendible"
            : data.progress.owned[id]
              ? "Ver rarezas en Tus copias"
              : names[card.rarity] + " de referencia"
        }}</span
      >
      <p v-if="card.language === 'en'" class="catalog-source">
        Traducción al español pendiente · se conserva el texto original en
        inglés.
      </p>
      <dl>
        <div>
          <dt>Tipo</dt>
          <dd>{{ types[card.type] || card.type }}</dd>
        </div>
        <div v-if="card.attribute">
          <dt>
            Atributo<template v-if="card.level != null">
              · {{ card.type?.includes("XYZ") ? "Rango" : "Nivel" }}</template
            >
          </dt>
          <dd>
            {{ attrs[card.attribute] || card.attribute
            }}<template v-if="card.level != null"> · {{ card.level }}</template>
          </dd>
        </div>
        <div>
          <dt>Clase</dt>
          <dd>{{ races[card.race] || card.race }}</dd>
        </div>
        <div v-if="card.atk != null">
          <dt>ATK / DEF</dt>
          <dd>{{ card.atk }} / {{ card.def ?? "—" }}</dd>
        </div>
        <div v-if="card.linkval">
          <dt>Enlace</dt>
          <dd>{{ card.linkval }} · {{ card.linkmarkers?.join(", ") }}</dd>
        </div>
        <div v-if="card.scale != null">
          <dt>Escala de Péndulo</dt>
          <dd>{{ card.scale }}</dd>
        </div>
        <div v-if="card.archetype">
          <dt>Arquetipo</dt>
          <dd>{{ card.archetype }}</dd>
        </div>
      </dl>
      <section class="detail-effect" aria-label="Texto de la carta">
        <h3>
          {{
            card.historical
              ? "Efecto anterior · español"
              : "Efecto / descripción"
          }}
        </h3>
        <p :lang="card.language === 'en' ? 'en' : 'es'">
          {{ card.historical?.text || card.desc_es }}
        </p>
      </section>
      <OwnedEditions :id="id" />
      <p v-if="!data.progress.owned[id]" class="detail-empty">
        Todavía no tenés copias de esta carta.
      </p>
      <details class="card-origins" open>
        <summary>Dónde conseguirla</summary>
        <ul>
          <li v-for="(edition, i) in card.obtainable || []" :key="i">
            {{ productName(edition.set) }}
            <span>{{ names[edition.rarity] }}</span>
          </li>
          <li
            v-for="pack in data.progress.economy.customPacks.filter(
              (p) => isPublished(p) && p.entries.some((e) => e.id === id),
            )"
            :key="pack.id"
          >
            {{ pack.kind === "starter" ? "Mazo de inicio" : "Expansión" }} ·
            {{ pack.name }}
          </li>
          <li
            v-if="
              data.progress.economy.offers.some(
                (o) => o.id === id && o.stock > 0,
              )
            "
          >
            Disponible en la tienda
          </li>
          <li
            v-if="
              !card.obtainable?.length &&
              !data.progress.economy.customPacks.some(
                (p) => isPublished(p) && p.entries.some((e) => e.id === id),
              ) &&
              !data.progress.economy.offers.some(
                (o) => o.id === id && o.stock > 0,
              )
            "
          >
            No está disponible en ningún producto del juego. Podés incluirla en
            una expansión desde Base de datos.
          </li>
        </ul>
      </details>
      <details v-if="card.officialSets?.length" class="card-origins">
        <summary>Ediciones oficiales · {{ card.officialSets.length }}</summary>
        <ul>
          <li v-for="(edition, i) in card.officialSets" :key="i">
            {{ edition.set_name }}
            <span>{{ edition.set_rarity }}</span>
          </li>
        </ul>
      </details>
      <template v-if="card.historical"
        ><p class="micro">
          Traducción del texto inglés de {{ card.historical.print }}. No es una
          transcripción de una edición española.
        </p>
        <details class="effect-original">
          <summary>Texto anterior original · inglés</summary>
          <p lang="en">{{ card.historical.original_en }}</p>
        </details>
        <a
          class="source-link"
          :href="card.historical.source"
          target="_blank"
          rel="noopener"
          >Fuente y edición del texto ↗</a
        ></template
      ><a
        v-else-if="card.cid"
        class="source-link"
        :href="
          'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=' +
          card.cid +
          '&request_locale=es'
        "
        target="_blank"
        rel="noopener"
        >Consultar ficha oficial en español ↗</a
      >
      <a
        v-else-if="card.source_url"
        class="source-link"
        :href="card.source_url"
        target="_blank"
        rel="noopener"
        >Consultar ficha en YGOPRODeck ↗</a
      >
      <p class="micro">
        {{
          card.historical
            ? "Usá el efecto clásico de esta ficha. La imagen puede mostrar el texto de una reedición."
            : card.language === "en"
              ? "Texto del catálogo YGOPRODeck. La imagen puede corresponder a una reedición."
              : `Texto en español: ${card.translationSource || "base oficial de Konami"}. La imagen puede corresponder a una reedición.`
        }}
      </p>
      <button
        v-if="lotsFor(data.progress, id).some(isSellable)"
        @click="data.dialog = { kind: 'sale', id }"
      >
        Vender copias · elegir expansión y rareza
      </button>
    </div>
  </div>
</template>
