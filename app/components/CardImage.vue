<script setup>
const props = defineProps({ src: String, alt: { type: String, default: "" } });
const failed = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>
<template>
  <img
    :src="failed ? '/assets/card-back.jpg' : src"
    :alt="failed ? 'Imagen no disponible: ' + alt : alt"
    :title="
      failed
        ? 'La imagen no está disponible. La ficha y los datos se pueden consultar.'
        : undefined
    "
    @error="failed = true"
  />
</template>
