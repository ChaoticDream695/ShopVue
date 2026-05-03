<template>
  <Transition name="slide-fade">
    <div v-if="message" class="alert" :class="`alert-${type}`" role="alert">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  message: String,
  type: { type: String, default: 'error' } // 'error' | 'success'
});
</script>

<style scoped>
.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from  { transform: translateY(-6px); opacity: 0; }
.slide-fade-leave-to    { opacity: 0; }
</style>
