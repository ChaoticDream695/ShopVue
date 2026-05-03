import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const routes = [
  { path: '/', redirect: '/shop' },
  { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
  { path: '/register', component: () => import('@/views/RegisterView.vue'), meta: { guest: true } },

  // Customer routes
  { path: '/shop', component: () => import('@/views/customer/ShopView.vue') },
  { path: '/shop/product/:id', component: () => import('@/views/customer/ProductDetailView.vue') },
  { path: '/cart', component: () => import('@/views/customer/CartView.vue'), meta: { auth: true, role: 'customer' } },
  { path: '/orders', component: () => import('@/views/customer/OrdersView.vue'), meta: { auth: true, role: 'customer' } },

  // Admin routes
  { path: '/admin', component: () => import('@/views/admin/AdminDashboard.vue'), meta: { auth: true, role: 'admin' } },
  { path: '/admin/products', component: () => import('@/views/admin/AdminProducts.vue'), meta: { auth: true, role: 'admin' } },
  { path: '/admin/categories', component: () => import('@/views/admin/AdminCategories.vue'), meta: { auth: true, role: 'admin' } },
  { path: '/admin/orders', component: () => import('@/views/admin/AdminOrders.vue'), meta: { auth: true, role: 'admin' } },

  { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFoundView.vue') }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.guest && auth.isAuthenticated) {
    return auth.isAdmin ? '/admin' : '/shop';
  }
  if (to.meta.auth && !auth.isAuthenticated) {
    return '/login';
  }
  if (to.meta.role && auth.user?.role !== to.meta.role) {
    return auth.isAdmin ? '/admin' : '/shop';
  }
});

export default router;
