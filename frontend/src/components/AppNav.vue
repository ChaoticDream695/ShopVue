<template>
  <nav class="navbar">
    <div class="container navbar-inner">
      <router-link to="/" class="brand">
        <span class="brand-icon">◈</span> ShopVue
      </router-link>

      <div class="nav-links">
        <!-- Customer nav -->
        <template v-if="!auth.isAdmin">
          <router-link to="/shop" class="nav-link">Shop</router-link>
        </template>

        <!-- Admin nav -->
        <template v-if="auth.isAdmin">
          <router-link to="/admin" class="nav-link">Dashboard</router-link>
          <router-link to="/admin/products" class="nav-link">Products</router-link>
          <router-link to="/admin/categories" class="nav-link">Categories</router-link>
          <router-link to="/admin/orders" class="nav-link">Orders</router-link>
        </template>
      </div>

      <div class="nav-actions">
        <template v-if="auth.isAuthenticated">
          <router-link v-if="auth.isCustomer" to="/orders" class="nav-link">My Orders</router-link>
          <router-link v-if="auth.isCustomer" to="/cart" class="nav-cart">
            🛒
            <span v-if="cart.count > 0" class="cart-badge">{{ cart.count }}</span>
          </router-link>
          <div class="user-chip">
            <span>{{ auth.user?.username }}</span>
            <span class="badge" :class="auth.isAdmin ? 'badge-warning' : 'badge-info'">{{ auth.user?.role }}</span>
          </div>
          <button class="btn btn-ghost btn-sm" @click="logout">Logout</button>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-outline btn-sm">Login</router-link>
          <router-link to="/register" class="btn btn-primary btn-sm">Register</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const cart = useCartStore();
const router = useRouter();

const logout = () => {
  auth.logout();
  router.push('/login');
};
</script>

<style scoped>
.navbar {
  position: sticky; top: 0; z-index: 100;
  background: rgba(250,250,248,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.navbar-inner {
  display: flex; align-items: center; gap: 24px;
  height: 64px;
}
.brand {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--accent);
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.brand-icon { font-size: 18px; }
.nav-links { display: flex; gap: 4px; flex: 1; }
.nav-link {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-light);
  transition: all 0.15s;
}
.nav-link:hover, .nav-link.router-link-active {
  background: var(--accent-light);
  color: var(--accent);
}
.nav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.user-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--paper);
  border: 1px solid var(--border);
  font-size: 13px;
  font-weight: 500;
}
.nav-cart {
  position: relative;
  font-size: 20px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}
.nav-cart:hover { background: var(--accent-light); }
.cart-badge {
  position: absolute; top: -4px; right: -4px;
  background: var(--accent); color: white;
  border-radius: 50%;
  width: 18px; height: 18px;
  font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}
</style>
