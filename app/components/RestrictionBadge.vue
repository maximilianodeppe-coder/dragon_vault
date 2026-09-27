<script setup>
const props = defineProps({ limit: Number, shared: Boolean });
const label = computed(() => `${props.shared ? 'Speed Duel' : 'Normal'} · ${props.limit === 0 ? 'Prohibida' : props.shared ? 'Cupo compartido ' + props.limit : props.limit === 3 ? 'Sin restricción adicional' : 'Máximo ' + props.limit + ' por carta'}`);
</script>
<template>
  <span class="restriction-badge" :class="{ shared }" :title="label" :aria-label="label" role="img">
    <svg v-if="limit === 0" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5" /></svg>
    <span v-else aria-hidden="true">{{ limit }}</span>
  </span>
</template>
<style scoped>
.restriction-badge { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 28px; height: 28px; border: 3px solid #ef7777; border-radius: 50%; background: var(--bg); color: var(--text); font-size: 16px; font-weight: 700; line-height: 1; vertical-align: middle; }
.restriction-badge.shared { border-color: #8dc9ff; }
.restriction-badge svg { width: 100%; height: 100%; stroke: #ef7777; stroke-width: 3; fill: none; }
.restriction-badge.shared svg { stroke: #8dc9ff; }
</style>
