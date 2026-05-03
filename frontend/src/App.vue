<template>
  <div>
    <AppNav />
    <main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <ToastMessage />
  </div>
</template>

<script setup>
import AppNav from '@/components/AppNav.vue';
import ToastMessage from '@/components/ToastMessage.vue';
</script>
