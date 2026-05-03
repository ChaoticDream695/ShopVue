<template>
  <div class="container" style="padding: 40px 0; min-height: calc(100vh - 64px)">
    <h1 style="margin-bottom: 24px">My Orders</h1>

    <div v-if="loading" class="spinner"></div>
    <div v-else-if="!orders.length" class="empty-state">
      <div style="font-size:48px; margin-bottom:12px">📦</div>
      <p class="text-muted">No orders yet.</p>
      <router-link to="/shop" class="btn btn-primary" style="margin-top:16px">Start Shopping</router-link>
    </div>

    <div v-else class="orders-list">
      <div v-for="order in orders" :key="order.order_id" class="order-card card">
        <div class="order-header">
          <div>
            <span class="order-id">Order #{{ order.order_id }}</span>
            <span class="order-date text-muted text-sm">{{ formatDate(order.order_date) }}</span>
          </div>
          <div class="order-right">
            <span class="badge" :class="statusClass(order.status)">{{ order.status }}</span>
            <span class="order-total">${{ Number(order.total_amount).toFixed(2) }}</span>
          </div>
        </div>
        <div class="order-items">
          <div v-for="item in order.items" :key="item.product_id" class="order-item">
            <span>{{ item.product_name }}</span>
            <span class="text-muted text-sm">× {{ item.quantity }}</span>
            <span>${{ (item.price * item.quantity).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/utils/api';

const orders = ref([]);
const loading = ref(true);

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric'
});

const statusClass = (s) => ({
  pending: 'badge-default',
  confirmed: 'badge-info',
  shipped: 'badge-warning',
  delivered: 'badge-success',
  cancelled: 'badge-error'
}[s] || 'badge-default');

onMounted(async () => {
  try {
    const { data } = await api.get('/orders');
    orders.value = data;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.empty-state { text-align: center; padding: 80px 0; }
.orders-list { display: flex; flex-direction: column; gap: 16px; }
.order-card { padding: 20px 24px; }
.order-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
}
.order-id { font-family: var(--font-display); font-weight: 700; font-size: 16px; display: block; }
.order-date { display: block; margin-top: 2px; }
.order-right { display: flex; align-items: center; gap: 12px; }
.order-total { font-size: 20px; font-weight: 800; color: var(--accent); font-family: var(--font-display); }
.order-items { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border); padding-top: 14px; }
.order-item {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 14px; gap: 8px;
}
.order-item span:first-child { flex: 1; }
</style>
