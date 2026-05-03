<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <div class="auth-logo">◈</div>
        <h1>Create account</h1>
        <p class="text-muted text-sm">Join ShopVue today</p>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="success" class="alert alert-success">{{ success }}</div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Role</label>
          <select v-model="form.role">
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="form.username" type="text" placeholder="your_username" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" placeholder="min 6 characters" required minlength="6" />
        </div>

        <template v-if="form.role === 'customer'">
          <div class="form-row">
            <div class="form-group">
              <label>First name</label>
              <input v-model="form.firstname" type="text" placeholder="John" required />
            </div>
            <div class="form-group">
              <label>Last name</label>
              <input v-model="form.lastname" type="text" placeholder="Doe" required />
            </div>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="form.email" type="email" placeholder="john@example.com" required />
          </div>
          <div class="form-group">
            <label>Phone number</label>
            <input v-model="form.phone_number" type="tel" placeholder="+1234567890" required />
          </div>
        </template>

        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Create Account' }}
        </button>
      </form>

      <p class="auth-footer text-center text-sm text-muted">
        Already have an account?
        <router-link to="/login" style="color: var(--accent); font-weight:600">Sign in</router-link>
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

const form = ref({
  role: 'customer', username: '', password: '',
  firstname: '', lastname: '', email: '', phone_number: ''
});
const loading = ref(false);
const error = ref('');
const success = ref('');

const handleRegister = async () => {
  loading.value = true;
  error.value = '';
  success.value = '';
  try {
    await auth.register(form.value);
    success.value = 'Account created! Redirecting to login…';
    setTimeout(() => router.push('/login'), 1500);
  } catch (err) {
    error.value = err.response?.data?.error || 'Registration failed';
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
  max-width: 460px;
  padding: 40px;
}
.auth-header { text-align: center; margin-bottom: 28px; }
.auth-logo { font-size: 36px; color: var(--accent); margin-bottom: 12px; }
.auth-header h1 { font-size: 28px; margin-bottom: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.auth-footer { margin-top: 24px; }
</style>
