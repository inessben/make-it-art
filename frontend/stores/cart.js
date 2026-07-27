import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", {
  state: () => ({
    cart: null,
    loading: false,
    error: "",
    validationMessage: ""
  }),

  actions: {
    hydrate() {
      return this.cart;
    },

    persist() {
      return this.cart;
    },

    removeArtwork(artworkId) {
      if (!this.cart?.items?.length) {
        return this.cart;
      }

      this.cart = {
        ...this.cart,
        items: this.cart.items.filter((item) => item.artworkId !== artworkId)
      };

      return this.cart;
    },

    async csrfHeaders() {
      const response = await $fetch("/api/v1/security/csrf-token", {
        credentials: "include"
      });

      return { "x-csrf-token": response.csrfToken };
    },

    async runCartRequest(request, fallbackMessage) {
      this.loading = true;
      this.error = "";
      this.validationMessage = "";

      try {
        const response = await request();
        this.cart = response.cart;
        return response;
      } catch (error) {
        if (error?.data?.cart) {
          this.cart = error.data.cart;
        }

        this.error = error?.data?.message || fallbackMessage;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchCart() {
      return this.runCartRequest(
        () =>
          $fetch("/api/v1/cart", {
            credentials: "include"
          }),
        "Impossible de charger votre panier."
      );
    },

    async setItem(artworkId, quantity) {
      return this.runCartRequest(async () => {
        const headers = await this.csrfHeaders();
        return $fetch("/api/v1/cart/items", {
          method: "POST",
          credentials: "include",
          headers,
          body: { artworkId, quantity }
        });
      }, "Impossible de mettre à jour cet article.");
    },

    async removeItem(artworkId) {
      return this.runCartRequest(async () => {
        const headers = await this.csrfHeaders();
        return $fetch(`/api/v1/cart/items/${artworkId}`, {
          method: "DELETE",
          credentials: "include",
          headers
        });
      }, "Impossible de retirer cet article.");
    },

    async clearCart() {
      return this.runCartRequest(async () => {
        const headers = await this.csrfHeaders();
        return $fetch("/api/v1/cart", {
          method: "DELETE",
          credentials: "include",
          headers
        });
      }, "Impossible de vider votre panier.");
    },

    async validateForCheckout() {
      if (!this.cart) {
        return false;
      }

      try {
        await this.runCartRequest(async () => {
          const headers = await this.csrfHeaders();
          return $fetch("/api/v1/cart/validate", {
            method: "POST",
            credentials: "include",
            headers,
            body: {
              cartVersion: this.cart.version,
              pricingFingerprint: this.cart.pricingFingerprint
            }
          });
        }, "Votre panier doit être vérifié avant le paiement.");
        this.validationMessage = "Prix et disponibilité confirmés.";
        this.persist();
        return true;
      } catch {
        return false;
      }
    }
  }
});
