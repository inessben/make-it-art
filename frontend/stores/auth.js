import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user)
  },

  actions: {
    async fetchCurrentUser() {
      this.loading = true;

      try {
        const response = await $fetch("/api/auth/me", {
          credentials: "include"
        });
        this.user = response.user;

        return this.user;
      } catch (error) {
        if (error?.statusCode !== 401) {
          this.user = null;
          throw error;
        }

        await $fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include"
        });

        const retryResponse = await $fetch("/api/auth/me", {
          credentials: "include"
        });
        this.user = retryResponse.user;

        return this.user;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      await $fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });

      this.user = null;
    }
  }
});
