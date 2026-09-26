<script setup>
import { names, image, rarityClass, types, attrs } from "~/utils/catalog.js";
const props = defineProps({
  card: { type: Object, required: true },
  copies: { type: [String, Number], default: undefined },
  exhausted: Boolean,
  hideRarity: Boolean,
});
const { data } = useVault();
</script>
<template>
  <UTooltip
    :delay-duration="350"
    :content="{ side: 'right', align: 'start', collisionPadding: 16 }"
    :ui="{ content: 'card-preview' }"
  >
    <button
      class="card"
      :class="[
        hideRarity ? 'rarity-common' : card.ownedLots?.length
          ? card.ownedLots.length === 1
            ? rarityClass(card.ownedLots[0])
            : 'rarity-common'
          : rarityClass(card),
        { unowned: !(card.ownedCount ?? data.progress.owned[card.id]), exhausted },
      ]"
      :aria-label="'Ver ' + card.name_es"
      @click="
        data.dialog = { kind: 'detail', id: String(card.id), shop: card.shop }
      "
    >
      <CardImage :src="image(card)" :alt="card.name_en" loading="lazy" />
      <ErrataBadge v-if="card.postErrata" />
      <span class="copies">{{
        copies ?? (card.ownedCount ?? data.progress.owned[card.id] ?? 0) + "×"
      }}</span>
      <span class="card-name">{{ card.name_es }}</span>
      <small v-if="!hideRarity && card.ownedLots?.length" class="rarity">{{
        card.ownedLots
          .map((l) => `${l.quantity} ${names[l.rarity] || "sin identificar"}`)
          .join(" · ")
      }}</small>
      <small v-else-if="!hideRarity" class="rarity">{{ names[card.rarity] }}</small>
      <span v-if="exhausted" class="stock-label">AGOTADA</span>
    </button>
    <template #content>
      <div class="card-preview-body">
        <h3>{{ card.name_es }}</h3>
        <p class="preview-meta">
          {{ types[card.type] || card.type
          }}<template v-if="card.attribute">
            · {{ attrs[card.attribute] || card.attribute }}</template
          ><template v-if="card.level != null">
            · {{ card.type?.includes("XYZ") ? "Rango" : "Nivel" }}
            {{ card.level }}</template
          >
        </p>
        <p v-if="card.atk != null" class="preview-stats">
          ATK {{ card.atk
          }}<template v-if="card.def != null"> / DEF {{ card.def }}</template
          ><template v-if="card.linkval"> · Enlace {{ card.linkval }}</template>
        </p>
        <p class="preview-effect" :lang="card.language === 'en' ? 'en' : 'es'">
          {{ card.historical?.text || card.desc_es }}
        </p>
        <p v-if="card.language === 'en'" class="preview-meta">
          Traducción al español pendiente
        </p>
        <p class="preview-hint">
          {{ card.ownedCount ?? data.progress.owned[card.id] ?? 0 }} copias · Abrí la ficha para
          ver todos los datos
        </p>
      </div>
    </template>
  </UTooltip>
</template>
