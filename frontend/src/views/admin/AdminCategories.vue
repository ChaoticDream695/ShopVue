<template>
  <div class="container" style="padding: 40px 0; min-height: calc(100vh - 64px)">
    <div class="page-header">
      <div>
        <h1>Categories</h1>
        <p class="text-muted text-sm">Organise your product catalog</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">+ New Category</button>
    </div>

    <LoadingSpinner v-if="loading" label="Loading categories…" style="margin-top:48px" />

    <div v-else class="card" style="overflow:hidden; margin-top:24px">
      <table class="table">
        <thead>
          <tr><th>ID</th><th>Name</th><th>Description</th><th>Created</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat.category_id">
            <td class="text-muted text-sm">#{{ cat.category_id }}</td>
            <td style="font-weight:600">{{ cat.category_name }}</td>
            <td class="text-muted text-sm">{{ cat.category_description }}</td>
            <td class="text-muted text-sm">{{ fmt(cat.created_on) }}</td>
            <td>
              <div style="display:flex; gap:6px">
                <button class="btn btn-outline btn-sm" @click="openModal(cat)">Edit</button>
                <button class="btn btn-danger btn-sm" @click="remove(cat)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!categories.length" style="text-align:center; padding:48px; color:var(--ink-light)">
        <div style="font-size:40px; margin-bottom:10px">🗂️</div>
        No categories yet. Create one!
      </div>
    </div>

    <BaseModal v-model="showModal" :title="editing ? 'Edit Category' : 'New Category'">
      <AlertMessage :message="formError" type="error" />
      <form @submit.prevent="save">
        <div class="form-group">
          <label>Category Name</label>
          <input v-model="form.category_name" required placeholder="e.g. Electronics" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="form.category_description" rows="3" placeholder="Optional description…"></textarea>
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
import { ref, onMounted } from 'vue';
import api from '@/utils/api';
import BaseModal from '@/components/BaseModal.vue';
import AlertMessage from '@/components/AlertMessage.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const categories = ref([]);
const loading    = ref(true);
const showModal  = ref(false);
const editing    = ref(null);
const saving     = ref(false);
const formError  = ref('');
const form       = ref({ category_name: '', category_description: '' });

const fmt = (d) => new Date(d).toLocaleDateString();

const fetch = async () => {
  loading.value = true;
  const { data } = await api.get('/categories');
  categories.value = data;
  loading.value = false;
};

const openModal = (cat = null) => {
  editing.value = cat;
  formError.value = '';
  form.value = cat
    ? { category_name: cat.category_name, category_description: cat.category_description }
    : { category_name: '', category_description: '' };
  showModal.value = true;
};

const save = async () => {
  saving.value = true;
  formError.value = '';
  try {
    if (editing.value) {
      await api.put(`/categories/${editing.value.category_id}`, form.value);
      toast.success('Category updated!');
    } else {
      await api.post('/categories', form.value);
      toast.success('Category created!');
    }
    showModal.value = false;
    await fetch();
  } catch (err) {
    formError.value = err.response?.data?.error || 'Failed to save';
  } finally {
    saving.value = false;
  }
};

const remove = async (cat) => {
  if (!confirm(`Delete category "${cat.category_name}"? Products using it will lose their category.`)) return;
  try {
    await api.delete(`/categories/${cat.category_id}`);
    toast.success('Category deleted');
    await fetch();
  } catch (err) {
    toast.error(err.response?.data?.error || 'Cannot delete — category may have products linked.');
  }
};

onMounted(fetch);
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
</style>
