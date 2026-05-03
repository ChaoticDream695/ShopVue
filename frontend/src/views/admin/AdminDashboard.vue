<template>
  <div class="container" style="padding: 40px 0; min-height: calc(100vh - 64px)">
    <div class="dash-header">
      <div>
        <h1>Dashboard</h1>
        <p class="text-muted">Welcome back, <strong>{{ auth.user?.username }}</strong></p>
      </div>
    </div>

    <div v-if="loading" class="spinner" style="margin-top: 48px"></div>

    <div v-else class="dash-grid">
      <router-link to="/admin/products" class="stat-card card">
        <div class="stat-icon">📦</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalProducts }}</div>
          <div class="stat-label">Total Products</div>
        </div>
      </router-link>

      <router-link to="/admin/categories" class="stat-card card">
        <div class="stat-icon">🗂️</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalCategories }}</div>
          <div class="stat-label">Categories</div>
        </div>
      </router-link>

      <router-link to="/admin/orders" class="stat-card card">
        <div class="stat-icon">🛒</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.totalOrders }}</div>
          <div class="stat-label">Total Orders</div>
        </div>
      </router-link>

      <div class="stat-card card no-link">
        <div class="stat-icon">💰</div>
        <div class="stat-body">
          <div class="stat-value">${{ stats.revenue.toFixed(2) }}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>
    </div>

    <!-- Recent orders -->
    <div v-if="!loading" class="card" style="margin-top: 32px; overflow: hidden">
      <div class="section-header">
        <h2 style="font-size:18px">Recent Orders</h2>
        <router-link to="/admin/orders" class="btn btn-outline btn-sm">View all</router-link>
      </div>
      <table class="table">
        <thead>
          <tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
        </thead>
        <tbody>
          <tr v-for="order in recentOrders" :key="order.order_id">
            <td style="font-weight:600">#{{ order.order_id }}</td>
            <td>{{ order.firstname }} {{ order.lastname }}</td>
            <td style="color:var(--accent); font-weight:700">${{ Number(order.total_amount).toFixed(2) }}</td>
            <td><span class="badge" :class="statusClass(order.status)">{{ order.status }}</span></td>
            <td class="text-muted text-sm">{{ formatDate(order.order_date) }}</td>
          </tr>
          <tr v-if="!recentOrders.length">
            <td colspan="5" style="text-align:center; color:var(--ink-light); padding:32px">No orders yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/utils/api';
import { useAuthStore } from '@/store/auth';

const auth = useAuthStore();
const loading = ref(true);
const stats = ref({ totalProducts: 0, totalCategories: 0, totalOrders: 0, revenue: 0 });
const recentOrders = ref([]);

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const statusClass = (s) => ({
  pending: 'badge-default', confirmed: 'badge-info',
  shipped: 'badge-warning', delivered: 'badge-success', cancelled: 'badge-error'
}[s] || 'badge-default');

onMounted(async () => {
  try {
    const [pRes, cRes, oRes] = await Promise.all([
      api.get('/products?limit=1'),
      api.get('/categories'),
      api.get('/orders')
    ]);
    stats.value.totalProducts   = pRes.data.total;
    stats.value.totalCategories = cRes.data.length;
    stats.value.totalOrders     = oRes.data.length;
    stats.value.revenue         = oRes.data.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
    recentOrders.value          = oRes.data.slice(0, 5);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.dash-header { margin-bottom: 32px; }
.dash-header h1 { font-size: 36px; }
.dash-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
}
.stat-card:not(.no-link):hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
  border-color: var(--accent);
}
.stat-icon { font-size: 32px; flex-shrink: 0; }
.stat-value {
  font-size: 28px;
  font-weight: 800;
  font-family: var(--font-display);
  color: var(--accent);
  line-height: 1;
}
.stat-label { font-size: 13px; color: var(--ink-light); margin-top: 4px; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
</style>
