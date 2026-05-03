import { ref } from 'vue';
import api from '@/utils/api';

/**
 * Composable for making API calls with loading/error state.
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi(() => api.get('/products'))
 *   await execute()
 */
export function useApi(fn) {
  const data    = ref(null);
  const loading = ref(false);
  const error   = ref('');

  const execute = async (...args) => {
    loading.value = true;
    error.value   = '';
    try {
      const res = await fn(...args);
      data.value = res.data;
      return res.data;
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'An error occurred';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, execute };
}

/**
 * Convenience wrappers
 */
export const useGet    = (url, params = {}) => useApi(() => api.get(url, { params }));
export const usePost   = (url)              => useApi((body) => api.post(url, body));
export const usePut    = (url)              => useApi((body) => api.put(url, body));
export const useDelete = (url)              => useApi(() => api.delete(url));
