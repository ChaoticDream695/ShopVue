<template>
  <div class="container" style="padding: 40px 0; min-height: calc(100vh - 64px)">
    <div class="page-header" style="margin-bottom: 24px">
      <div>
        <h1>Orders</h1>
        <p class="text-muted text-sm">Manage and track all customer orders</p>
      </div>
      <!-- Status filter -->
      <select v-model="filterStatus" style="max-width:180px">
        <option value="">All statuses</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <LoadingSpinner v-if="loading" label="Loading orders…" />

    <div v-else>
      <div v-if="!filtered.length" style="text-align:center; padding:80px; color:var(--ink-light)">
        <div style="font-size:40px; margin-bottom:12px">📋</div>
        No orders found.
      </div>
      <div v-for="order in filtered" :key="order.order_id" class="order-card card">
        <div class="order-header">
          <div>
            <span class="order-id">Order #{{ order.order_id }}</span>
            <span class="text-muted text-sm" style="display:block; margin-top:3px">
              👤 {{ order.firstname }} {{ order.lastname }}
              <a :href="`mailto:${order.email}`" style="color:var(--accent)">{{ order.email }}</a>
            </span>
            <span class="text-muted text-sm">🕐 {{ formatDate(order.order_date) }}</span>
          </div>
          <div class="order-right">
            <select
              :value="order.status"
              class="status-select"
              @change="updateStatus(order.order_id, $event.target.value)"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="order-total">${{ Number(order.total_amount).toFixed(2) }}</span>
          </div>
        </div>
        <div class="order-items">
          <div v-for="item in order.items" :key="item.product_id" class="order-item">
            <span class="item-name">{{ item.product_name }}</span>
            <span class="text-muted text-sm">× {{ item.quantity }}</span>
            <span class="item-subtotal">${{ (item.price * item.quantity).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const orders = ref([]);
const loading = ref(true);
const filterStatus = ref('');
const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const filtered = computed(() =>
  filterStatus.value ? orders.value.filter(o => o.status === filterStatus.value) : orders.value
);

const formatDate = (d) => new Date(d).toLocaleString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const fetch = async () => {
  loading.value = true;
  const { data } = await api.get('/orders');
  orders.value = data;
  loading.value = false;
};

const updateStatus = async (orderId, status) => {
  try {
    await api.patch(`/orders/${orderId}/status`, { status });
    const order = orders.value.find(o => o.order_id === orderId);
    if (order) order.status = status;
    toast.success(`Order #${orderId} marked as ${status}`);
  } catch (err) {
    toast.error(err.response?.data?.error || 'Failed to update status');
  }
};

onMounted(fetch);
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.order-card { padding: 20px 24px; margin-bottom: 16px; }
.order-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 14px; flex-wrap: wrap; gap: 12px;
}
.order-id { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
.order-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.order-total { font-size: 22px; font-weight: 800; color: var(--accent); font-family: var(--font-display); }
.status-select {
  width: auto; padding: 7px 12px; font-size: 13px;
  border-radius: 8px; border: 1.5px solid var(--border);
  background: var(--paper); cursor: pointer;
}
.order-items { border-top: 1px solid var(--border); padding-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.order-item { display: flex; align-items: center; justify-content: space-between; font-size: 14px; gap: 12px; }
.item-name { flex: 1; font-weight: 500; }
.item-subtotal { font-weight: 700; min-width: 80px; text-align: right; }
</style>
