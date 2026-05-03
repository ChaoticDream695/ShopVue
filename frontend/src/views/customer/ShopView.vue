<template>
  <div class="shop-page">
    <div class="container">
      <div class="shop-header">
        <h1>Shop</h1>
        <p class="text-muted">Discover our latest products</p>
      </div>

      <!-- Filters -->
      <div class="filters">
        <input
          v-model="search"
          type="search"
          placeholder="Search products…"
          class="search-input"
          @input="debouncedFetch"
        />
        <select v-model="selectedCategory" @change="fetchProducts" class="category-select">
          <option value="">All categories</option>
          <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
            {{ cat.category_name }}
          </option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="spinner"></div>

      <!-- Empty -->
      <div v-else-if="!products.length" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No products found</p>
      </div>

      <!-- Grid -->
      <div v-else class="products-grid">
        <ProductCard
          v-for="product in products"
          :key="product.product_id"
          :product="product"
        />
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="pagination">
        <button
          class="btn btn-outline btn-sm"
          :disabled="page === 1"
          @click="changePage(page - 1)"
        >← Prev</button>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button
          class="btn btn-outline btn-sm"
          :disabled="page === totalPages"
          @click="changePage(page + 1)"
        >Next →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api';
import ProductCard from '@/components/ProductCard.vue';

const products = ref([]);
const categories = ref([]);
const loading = ref(false);
const search = ref('');
const selectedCategory = ref('');
const page = ref(1);
const limit = 12;
const total = ref(0);

const totalPages = computed(() => Math.ceil(total.value / limit));

let debounceTimer;
const debouncedFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { page.value = 1; fetchProducts(); }, 400);
};

const fetchProducts = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, limit };
    if (search.value) params.search = search.value;
    if (selectedCategory.value) params.category_id = selectedCategory.value;
    const { data } = await api.get('/products', { params });
    products.value = data.products;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
};

const changePage = (p) => {
  page.value = p;
  fetchProducts();
};

onMounted(async () => {
  const { data } = await api.get('/categories');
  categories.value = data;
  await fetchProducts();
});
</script>

<style scoped>
.shop-page { padding: 40px 0; min-height: calc(100vh - 64px); }
.shop-header { margin-bottom: 32px; }
.shop-header h1 { font-size: 36px; margin-bottom: 4px; }
.filters {
  display: flex; gap: 12px; margin-bottom: 32px;
  flex-wrap: wrap;
}
.search-input { max-width: 320px; }
.category-select { max-width: 200px; }
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}
.empty-state {
  text-align: center; padding: 80px 0;
  color: var(--ink-light);
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin-top: 32px;
}
.page-info { font-size: 14px; color: var(--ink-light); }
</style>
