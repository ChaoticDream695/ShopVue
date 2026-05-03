<template>
  <div class="product-card card" @click="$router.push(`/shop/product/${product.product_id}`)">
    <div class="product-thumb">
      <span class="product-icon">{{ categoryEmoji }}</span>
    </div>
    <div class="product-info">
      <span class="product-category text-sm text-muted">{{ product.category_name }}</span>
      <h3 class="product-name">{{ product.product_name }}</h3>
      <div class="product-footer">
        <span class="product-price">${{ Number(product.price).toFixed(2) }}</span>
        <span class="stock-badge" :class="product.stock_quantity > 0 ? 'badge-success' : 'badge-error'">
          {{ product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock' }}
        </span>
      </div>
      <button
        v-if="auth.isCustomer || !auth.isAuthenticated"
        class="btn btn-primary btn-sm add-btn"
        :disabled="product.stock_quantity === 0"
        @click.stop="addToCart"
      >
        + Add to cart
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

const props = defineProps({ product: Object });
const auth = useAuthStore();
const cart = useCartStore();

const categoryEmoji = computed(() => {
  const name = (props.product.category_name || '').toLowerCase();
  if (name.includes('electron')) return '💻';
  if (name.includes('cloth') || name.includes('fashion')) return '👗';
  if (name.includes('book')) return '📚';
  if (name.includes('food')) return '🍎';
  if (name.includes('sport')) return '⚽';
  if (name.includes('home') || name.includes('furni')) return '🏠';
  return '📦';
});

const addToCart = () => {
  cart.addItem(props.product);
};
</script>

<style scoped>
.product-card {
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}
.product-thumb {
  height: 140px;
  background: linear-gradient(135deg, var(--accent-light), #fff);
  display: flex; align-items: center; justify-content: center;
  font-size: 52px;
}
.product-info {
  padding: 16px;
  display: flex; flex-direction: column; gap: 6px;
  flex: 1;
}
.product-category { text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; }
.product-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.product-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 4px;
}
.product-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
  font-family: var(--font-display);
}
.stock-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
}
.badge-success { background: #dcfce7; color: #166534; }
.badge-error { background: #fee2e2; color: #991b1b; }
.add-btn { margin-top: 8px; width: 100%; justify-content: center; }
</style>
