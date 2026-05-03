<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <div class="auth-logo">◈</div>
        <h1>Welcome back</h1>
        <p class="text-muted text-sm">Sign in to your ShopVue account</p>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Username</label>
          <input v-model="form.username" type="text" placeholder="your_username" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" placeholder="••••••••" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

      <p class="auth-footer text-center text-sm text-muted">
        Don't have an account?
        <router-link to="/register" style="color: var(--accent); font-weight:600">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

const form = ref({ username: '', password: '' });
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  try {
    const data = await auth.login(form.value);
    router.push(data.user.role === 'admin' ? '/admin' : '/shop');
  } catch (err) {
    error.value = err.response?.data?.error || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 64px);
  display: flex; align-items: center; justify-content: center;
  padding: 40px 24px;
  background: linear-gradient(135deg, var(--paper) 0%, #fff0eb 100%);
}
.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 40px;
}
.auth-header { text-align: center; margin-bottom: 28px; }
.auth-logo {
  font-size: 36px; color: var(--accent);
  margin-bottom: 12px;
}
.auth-header h1 { font-size: 28px; margin-bottom: 6px; }
.auth-footer { margin-top: 24px; }
</style>
