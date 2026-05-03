<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
      <div class="modal" :style="{ maxWidth: width }">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="btn btn-ghost btn-sm" @click="$emit('update:modelValue', false)">✕</button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  title: String,
  width: { type: String, default: '500px' }
});
defineEmits(['update:modelValue']);
</script>
