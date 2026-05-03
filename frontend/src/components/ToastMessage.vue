<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="message" class="toast" :class="`toast-${type}`">
        <span class="toast-icon">{{ type === 'success' ? '✓' : '✕' }}</span>
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast';
const { message, type } = useToast();
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  min-width: 240px;
}
.toast-success { background: #166534; color: white; }
.toast-error   { background: #991b1b; color: white; }
.toast-icon    { font-weight: 700; font-size: 16px; }

.toast-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { transform: translateY(20px) scale(0.9); opacity: 0; }
.toast-leave-to     { transform: translateY(10px); opacity: 0; }
</style>
