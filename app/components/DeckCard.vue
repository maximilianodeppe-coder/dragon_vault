<script setup>
import { names, image, rarityClass } from "~/utils/catalog.js";
import { limitNames } from "~/utils/banlists.js";
defineProps({
  card: Object,
  used: Number,
  free: Number,
  owned: { type: Number, default: undefined },
  enabled: Boolean,
  inside: Boolean,
  limit: { type: Number, default: 3 },
  group: Number,
});
defineEmits(["change", "dragstart"]);
const { data } = useVault();
</script>
<template>
  <article
    class="deck-card"
    :class="[
      rarityClass(card),
      { 'used-up': !inside && !free, 'banlist-exceeded': used > limit },
    ]"
    :draggable="enabled"
    @dragstart="enabled ? $emit('dragstart', $event) : $event.preventDefault()"
  >
    <button
      class="deck-card-image"
      :aria-label="'Ver ' + card.name_es"
      @click="data.dialog = { kind: 'detail', id: String(card.id) }"
    >
      <CardImage
        draggable="false"
        :src="image(card)"
        :alt="card.name_en"
        loading="lazy"
      />
    </button>
    <RestrictionBadge v-if="limit < 3 || group !== undefined" class="deck-restriction-badge" :limit="group ?? limit" :shared="group !== undefined" />
    <span class="deck-card-badge"
      >{{ used
      }}{{
        inside
          ? " en mazo"
          : " / " +
            Math.min(owned ?? data.progress.owned[card.id] ?? 0, limit) +
            " en mazo"
      }}</span
    ><span class="deck-card-title">{{ card.name_es }} <ErrataBadge v-if="card.postErrata" /></span
    ><small class="deck-card-rarity">{{ names[card.rarity] }}</small
    ><small class="deck-limit" :class="{ 'over-limit': used > limit }"
      >{{ group && limit === 3 ? 'Hasta 3 por carta' : limitNames[limit] }}{{ used > limit ? " · excedida" : "" }}</small
    ><small v-if="group" class="deck-limit">Limitada {{ group }} · cupo compartido</small
    ><span v-if="!inside" class="deck-stock"
      >Tenés {{ owned ?? data.progress.owned[card.id] ?? 0 }} · disponibles
      {{ free }}</span
    ><button
      :class="inside ? 'deck-remove' : 'deck-add-button'"
      :disabled="!enabled"
      :aria-label="(inside ? 'Quitar ' : 'Agregar ') + card.name_es"
      @click="$emit('change')"
    >
      {{ inside ? "− Quitar" : "＋ Agregar" }}
    </button>
  </article>
</template>
<style scoped>
.deck-restriction-badge { position: absolute; top: 36px; right: 6px; z-index: 1; }
</style>
