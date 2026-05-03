<template>
  <div class="container" style="padding: 40px 0; min-height: calc(100vh - 64px)">
    <div class="page-header">
      <div>
        <h1>Products</h1>
        <p class="text-muted text-sm">Manage your product catalog</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">+ New Product</button>
    </div>

    <div class="filters card" style="padding: 16px 20px; margin-top: 20px; display:flex; gap:12px; flex-wrap:wrap">
      <input v-model="search" type="search" placeholder="Search products…" style="max-width:280px" @input="debouncedFetch" />
      <select v-model="filterCategory" @change="fetchAll" style="max-width:200px">
        <option value="">All categories</option>
        <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
      </select>
    </div>

    <LoadingSpinner v-if="loading" label="Loading products…" style="margin-top:48px" />

    <div v-else class="card" style="overflow:hidden; margin-top:16px">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Category</th>
            <th>Price</th><th>Stock</th><th>Added</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.product_id">
            <td class="text-muted text-sm">#{{ p.product_id }}</td>
            <td style="font-weight:600">{{ p.product_name }}</td>
            <td><span class="badge badge-info">{{ p.category_name }}</span></td>
            <td style="font-weight:700; color:var(--accent)">${{ Number(p.price).toFixed(2) }}</td>
            <td>
              <span class="badge" :class="p.stock_quantity > 10 ? 'badge-success' : p.stock_quantity > 0 ? 'badge-warning' : 'badge-error'">
                {{ p.stock_quantity }}
              </span>
            </td>
            <td class="text-muted text-sm">{{ fmt(p.created_on) }}</td>
            <td>
              <div style="display:flex; gap:6px">
                <button class="btn btn-outline btn-sm" @click="openModal(p)">Edit</button>
                <button class="btn btn-danger btn-sm" @click="remove(p)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filtered.length" style="text-align:center; padding:48px; color:var(--ink-light)">
        <div style="font-size:40px; margin-bottom:10px">📦</div>
        No products found.
      </div>
    </div>

    <BaseModal v-model="showModal" :title="editing ? 'Edit Product' : 'New Product'">
      <AlertMessage :message="formError" type="error" />
      <form @submit.prevent="save">
        <div class="form-group">
          <label>Product Name</label>
          <input v-model="form.product_name" required placeholder="e.g. MacBook Pro" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Price ($)</label>
            <input v-model="form.price" type="number" step="0.01" min="0" required placeholder="0.00" />
          </div>
          <div class="form-group">
            <label>Stock</label>
            <input v-model="form.stock_quantity" type="number" min="0" required placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select v-model="form.category_id" required>
            <option value="">Select category…</option>
            <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
          </select>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px">
          <button type="button" class="btn btn-ghost" @click="showModal = false">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : editing ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api';
import BaseModal from '@/components/BaseModal.vue';
import AlertMessage from '@/components/AlertMessage.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const products   = ref([]);
const categories = ref([]);
const loading    = ref(true);
const showModal  = ref(false);
const editing    = ref(null);
const saving     = ref(false);
const formError  = ref('');
const search     = ref('');
const filterCategory = ref('');

const fmt = (d) => new Date(d).toLocaleDateString();
const filtered = computed(() => {
  let list = products.value;
  if (search.value) list = list.filter(p => p.product_name.toLowerCase().includes(search.value.toLowerCase()));
  if (filterCategory.value) list = list.filter(p => p.category_id == filterCategory.value);
  return list;
});

let debounceTimer;
const debouncedFetch = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchAll, 350); };
const emptyForm = () => ({ product_name: '', price: '', stock_quantity: '', category_id: '' });
const form = ref(emptyForm());

const fetchAll = async () => {
  loading.value = true;
  const [pRes, cRes] = await Promise.all([api.get('/products?limit=500'), api.get('/categories')]);
  products.value = pRes.data.products;
  categories.value = cRes.data;
  loading.value = false;
};

const openModal = (p = null) => {
  editing.value = p;
  formError.value = '';
  form.value = p
    ? { product_name: p.product_name, price: p.price, stock_quantity: p.stock_quantity, category_id: p.category_id }
    : emptyForm();
  showModal.value = true;
};

const save = async () => {
  saving.value = true;
  formError.value = '';
  try {
    if (editing.value) {
      await api.put(`/products/${editing.value.product_id}`, form.value);
      toast.success('Product updated!');
    } else {
      await api.post('/products', form.value);
      toast.success('Product created!');
    }
    showModal.value = false;
    await fetchAll();
  } catch (err) {
    formError.value = err.response?.data?.error || 'Failed to save product';
  } finally {
    saving.value = false;
  }
};

const remove = async (p) => {
  if (!confirm(`Delete "${p.product_name}"?`)) return;
  try {
    await api.delete(`/products/${p.product_id}`);
    toast.success('Product deleted');
    await fetchAll();
  } catch (err) {
    toast.error(err.response?.data?.error || 'Failed to delete');
  }
};

onMounted(fetchAll);
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
