<template>
  <div class="container" style="padding: 40px 0; min-height: calc(100vh - 64px)">
    <h1 style="margin-bottom: 24px">Your Cart</h1>

    <div v-if="!cart.items.length" class="empty-cart">
      <div style="font-size:56px; margin-bottom:16px">🛒</div>
      <p class="text-muted">Your cart is empty.</p>
      <router-link to="/shop" class="btn btn-primary" style="margin-top:20px">Browse Products</router-link>
    </div>

    <div v-else class="cart-layout">
      <div class="cart-items card">
        <div v-for="item in cart.items" :key="item.product_id" class="cart-item">
          <div class="item-icon">📦</div>
          <div class="item-info">
            <div class="item-name">{{ item.product_name }}</div>
            <div class="item-price text-muted text-sm">${{ Number(item.price).toFixed(2) }} each</div>
          </div>
          <div class="qty-control">
            <button class="qty-btn" @click="cart.updateQuantity(item.product_id, item.quantity - 1)">−</button>
            <span class="qty-value">{{ item.quantity }}</span>
            <button class="qty-btn" @click="cart.updateQuantity(item.product_id, item.quantity + 1)">+</button>
          </div>
          <div class="item-total">${{ (item.price * item.quantity).toFixed(2) }}</div>
          <button class="btn btn-ghost btn-sm" @click="cart.removeItem(item.product_id)">✕</button>
        </div>
      </div>

      <div class="cart-summary card">
        <h3>Order Summary</h3>
        <div class="summary-row">
          <span>Items ({{ cart.count }})</span>
          <span>${{ cart.total.toFixed(2) }}</span>
        </div>
        <div class="summary-row">
          <span>Shipping</span>
          <span class="text-muted">Free</span>
        </div>
        <div class="summary-total">
          <span>Total</span>
          <span class="total-amount">${{ cart.total.toFixed(2) }}</span>
        </div>

        <div v-if="error" class="alert alert-error" style="margin-top:12px">{{ error }}</div>
        <div v-if="success" class="alert alert-success" style="margin-top:12px">{{ success }}</div>

        <button class="btn btn-primary btn-lg" style="width:100%; justify-content:center; margin-top:20px"
          :disabled="placing" @click="placeOrder">
          {{ placing ? 'Placing order…' : 'Place Order' }}
        </button>
        <button class="btn btn-ghost btn-sm" style="width:100%; justify-content:center; margin-top:8px"
          @click="cart.clear()">
          Clear Cart
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useCartStore } from '@/store/cart';
import api from '@/utils/api';
import { useRouter } from 'vue-router';

const cart = useCartStore();
const router = useRouter();
const placing = ref(false);
const error = ref('');
const success = ref('');

const placeOrder = async () => {
  placing.value = true;
  error.value = '';
  success.value = '';
  try {
    const items = cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
    await api.post('/orders', { items });
    success.value = 'Order placed successfully!';
    cart.clear();
    setTimeout(() => router.push('/orders'), 1500);
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to place order';
  } finally {
    placing.value = false;
  }
};
</script>

<style scoped>
.empty-cart { text-align: center; padding: 80px 0; }
.cart-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 768px) { .cart-layout { grid-template-columns: 1fr; } }
.cart-items { padding: 0; overflow: hidden; }
.cart-item {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.cart-item:last-child { border-bottom: none; }
.item-icon { font-size: 28px; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-weight: 600; font-size: 15px; }
.item-total { font-weight: 700; font-family: var(--font-display); min-width: 70px; text-align: right; }
.qty-control {
  display: flex; align-items: center;
  border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden;
}
.qty-btn {
  width: 32px; height: 32px; font-size: 16px;
  background: var(--paper); border: none; cursor: pointer;
  transition: background 0.15s;
}
.qty-btn:hover { background: var(--accent-light); color: var(--accent); }
.qty-value { padding: 0 12px; font-weight: 600; font-size: 14px; }
.cart-summary { padding: 24px; }
.cart-summary h3 { font-size: 18px; margin-bottom: 20px; }
.summary-row {
  display: flex; justify-content: space-between;
  font-size: 14px; padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.summary-total {
  display: flex; justify-content: space-between;
  padding: 16px 0 0; font-weight: 700; font-size: 16px;
}
.total-amount { font-size: 20px; color: var(--accent); font-family: var(--font-display); }
</style>
