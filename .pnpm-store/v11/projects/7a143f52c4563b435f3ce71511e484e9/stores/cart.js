import { defineStore } from "pinia";

const STORAGE_KEY = "mia_cart_v1";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: [],
    hydrated: false
  }),

  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPriceValue: (state) =>
      state.items.reduce((sum, item) => {
        const price = Number(item.artwork?.priceValue ?? 0);
        return sum + price * item.quantity;
      }, 0),
    isEmpty: (state) => state.items.length === 0
  },

  actions: {
    hydrate() {
      if (this.hydrated) {
        return;
      }

      if (import.meta.server) {
        this.hydrated = true;
        return;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? safeParse(raw, { items: [] }) : { items: [] };

      this.items = Array.isArray(parsed.items) ? parsed.items : [];
      this.hydrated = true;
    },

    persist() {
      if (import.meta.server) {
        return;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items: this.items
        })
      );
    },

    addArtwork(artwork, quantity = 1) {
      this.hydrate();

      if (!artwork?.id) {
        return;
      }

      const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;
      const safeQty = Math.max(1, Math.floor(qty));

      const existing = this.items.find((item) => item.artwork?.id === artwork.id);

      if (existing) {
        existing.quantity += safeQty;
      } else {
        this.items.unshift({
          artwork,
          quantity: safeQty
        });
      }

      this.persist();
    },

    removeArtwork(artworkId) {
      this.hydrate();
      this.items = this.items.filter((item) => item.artwork?.id !== artworkId);
      this.persist();
    },

    setQuantity(artworkId, quantity) {
      this.hydrate();
      const existing = this.items.find((item) => item.artwork?.id === artworkId);
      if (!existing) {
        return;
      }

      const qty = Math.max(1, Math.floor(Number(quantity || 1)));
      existing.quantity = qty;
      this.persist();
    },

    clear() {
      this.hydrate();
      this.items = [];
      this.persist();
    }
  }
});
