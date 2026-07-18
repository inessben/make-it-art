import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", {
  state: () => ({
    cart: null,
    loading: false,
    error: "",
    validationMessage: "",
  }),

  actions: {
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
            credentials: "include",
          }),
        "Impossible de charger votre panier.",
      );
    },

    async setItem(artworkId, quantity) {
      return this.runCartRequest(
        () =>
          $fetch("/api/v1/cart/items", {
            method: "POST",
            credentials: "include",
            body: { artworkId, quantity },
          }),
        "Impossible de mettre à jour cet article.",
      );
    },

    async removeItem(artworkId) {
      return this.runCartRequest(
        () =>
          $fetch(`/api/v1/cart/items/${artworkId}`, {
            method: "DELETE",
            credentials: "include",
          }),
        "Impossible de retirer cet article.",
      );
    },

    async clearCart() {
      return this.runCartRequest(
        () =>
          $fetch("/api/v1/cart", {
            method: "DELETE",
            credentials: "include",
          }),
        "Impossible de vider votre panier.",
      );
    },

    async validateForCheckout() {
      if (!this.cart) {
        return false;
      }

      try {
        await this.runCartRequest(
          () =>
            $fetch("/api/v1/cart/validate", {
              method: "POST",
              credentials: "include",
              body: {
                cartVersion: this.cart.version,
                pricingFingerprint: this.cart.pricingFingerprint,
              },
            }),
          "Votre panier doit être vérifié avant le paiement.",
        );
        this.validationMessage = "Prix et disponibilité confirmés.";
        return true;
      } catch {
        return false;
      }
    },
  },
});
