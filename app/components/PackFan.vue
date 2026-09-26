<script setup>
import { image } from "~/utils/catalog.js";
defineProps({ cards: { type: Array, required: true } });
</script>
<template>
  <span class="pack-fan" aria-hidden="true">
    <CardImage
      v-for="(card, i) in cards"
      :key="card.id"
      :src="image(card)"
      alt=""
      loading="lazy"
      :style="{
        '--offset': i - Math.floor(cards.length / 2),
        zIndex: 5 - Math.abs(i - Math.floor(cards.length / 2)),
      }"
    />
  </span>
</template>
