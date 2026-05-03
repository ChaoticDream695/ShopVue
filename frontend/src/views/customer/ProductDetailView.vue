<template>
  <div class="container" style="padding-top: 40px; min-height: calc(100vh - 64px)">
    <div v-if="loading" class="spinner"></div>
    <div v-else-if="product" class="product-detail">
      <router-link to="/shop" class="back-link btn btn-ghost btn-sm">← Back to shop</router-link>
      <div class="detail-grid">
        <div class="detail-thumb">
          <span class="detail-icon">{{ icon }}</span>
        </div>
        <div class="detail-info">
          <span class="text-muted text-sm" style="text-transform:uppercase; letter-spacing:.05em">{{ product.category_name }}</span>
          <h1>{{ product.product_name }}</h1>
          <div class="detail-price">${{ Number(product.price).toFixed(2) }}</div>
          <div class="detail-stock">
            <span class="badge" :class="product.stock_quantity > 0 ? 'badge-success' : 'badge-error'">
              {{ product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock' }}
            </span>
          </div>
          <div v-if="auth.isCustomer || !auth.isAuthenticated" class="quantity-row">
            <div class="qty-control">
              <button class="qty-btn" @click="qty = Math.max(1, qty - 1)">−</button>
              <span class="qty-value">{{ qty }}</span>
              <button class="qty-btn" @click="qty = Math.min(product.stock_quantity, qty + 1)">+</button>
            </div>
            <button
              class="btn btn-primary btn-lg"
              :disabled="product.stock_quantity === 0"
              @click="addToCart"
            >
              Add to Cart
            </button>
          </div>
          <div v-if="added" class="alert alert-success" style="margin-top:12px">Added to cart! ✓</div>
        </div>
      </div>
    </div>
    <div v-else class="text-center" style="padding: 80px 0">
      <p class="text-muted">Product not found.</p>
      <router-link to="/shop" class="btn btn-primary" style="margin-top:16px">Back to Shop</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/utils/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

const route = useRoute();
const auth = useAuthStore();
const cart = useCartStore();

const product = ref(null);
const loading = ref(true);
const qty = ref(1);
const added = ref(false);

const icon = computed(() => {
  const n = (product.value?.category_name || '').toLowerCase();
  if (n.includes('electron')) return '💻';
  if (n.includes('cloth') || n.includes('fashion')) return '👗';
  if (n.includes('book')) return '📚';
  return '📦';
});

const addToCart = () => {
  for (let i = 0; i < qty.value; i++) cart.addItem(product.value);
  added.value = true;
  setTimeout(() => { added.value = false; }, 2000);
};

onMounted(async () => {
  try {
    const { data } = await api.get(`/products/${route.params.id}`);
    product.value = data;
  } catch (_) {
    product.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.back-link { margin-bottom: 24px; display: inline-flex; }
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}
@media (max-width: 640px) { .detail-grid { grid-template-columns: 1fr; } }
.detail-thumb {
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent-light), #fff);
  height: 340px;
  display: flex; align-items: center; justify-content: center;
  font-size: 100px;
}
.detail-info { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
.detail-info h1 { font-size: 32px; }
.detail-price { font-size: 32px; font-weight: 800; color: var(--accent); font-family: var(--font-display); }
.quantity-row { display: flex; align-items: center; gap: 16px; }
.qty-control {
  display: flex; align-items: center;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.qty-btn {
  width: 40px; height: 40px;
  font-size: 20px;
  background: var(--paper);
  color: var(--ink);
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.qty-btn:hover { background: var(--accent-light); color: var(--accent); }
.qty-value {
  padding: 0 16px;
  font-weight: 600;
  font-size: 16px;
}
</style>
