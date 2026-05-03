<template>
  <div class="spinner-wrap" :style="{ padding }">
    <div class="spinner" :style="{ width: size, height: size }"></div>
    <p v-if="label" class="spinner-label text-muted text-sm">{{ label }}</p>
  </div>
</template>

<script setup>
defineProps({
  size:    { type: String, default: '36px' },
  padding: { type: String, default: '40px 0' },
  label:   { type: String, default: '' }
});
</script>

<style scoped>
.spinner-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
</style>
