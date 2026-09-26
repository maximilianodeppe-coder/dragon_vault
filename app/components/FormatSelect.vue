<script setup>
defineProps({ modelValue: String, all: Boolean, label: { type: String, default: 'Formato' } });
defineEmits(['update:modelValue']);
const { data } = useVault();
</script>
<template>
  <label>{{ label }}<select :value="modelValue" :aria-label="label" @change="$emit('update:modelValue', $event.target.value)">
    <option v-if="all" value="">Todos los formatos</option>
    <option v-for="format in data.progress.formats" :key="format.id" :value="format.id">{{ format.name }}</option>
  </select></label>
</template>
