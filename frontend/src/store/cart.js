import { defineStore } from 'pinia';

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem('cart') || '[]')
  }),

  getters: {
    count: (s) => s.items.reduce((acc, i) => acc + i.quantity, 0),
    total: (s) => s.items.reduce((acc, i) => acc + i.price * i.quantity, 0),
  },

  actions: {
    addItem(product) {
      const existing = this.items.find((i) => i.product_id === product.product_id);
      if (existing) {
        existing.quantity++;
      } else {
        this.items.push({ ...product, quantity: 1 });
      }
      this._save();
    },

    removeItem(product_id) {
      this.items = this.items.filter((i) => i.product_id !== product_id);
      this._save();
    },

    updateQuantity(product_id, quantity) {
      const item = this.items.find((i) => i.product_id === product_id);
      if (item) {
        if (quantity <= 0) this.removeItem(product_id);
        else item.quantity = quantity;
      }
      this._save();
    },

    clear() {
      this.items = [];
      this._save();
    },

    _save() {
      localStorage.setItem('cart', JSON.stringify(this.items));
    }
  }
});
