import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    isAdmin: (state) => state.user?.isAdmin === true || state.user?.role === "admin",
    isSuperAdmin: (state) => state.user?.isSuperAdmin === true,
    isArtist(state) {
      if (this.isAdmin) {
        return false;
      }

      return state.user?.isArtist === true || Boolean(state.user?.artist);
    },
    isVerifiedArtist(state) {
      if (this.isAdmin) {
        return false;
      }

      if (state.user?.artist?.verified === true) {
        return true;
      }

      // An approved application with an artist profile unlocks the workspace
      // even if a previous session payload still has verified=false.
      return Boolean(
        state.user?.artist && state.user?.artistApplication?.status === "approved"
      );
    },
    hasArtistApplication(state) {
      if (this.isAdmin) {
        return false;
      }

      return Boolean(state.user?.artistApplication);
    },
    artistApplicationStatus(state) {
      if (this.isAdmin) {
        return null;
      }

      return state.user?.artistApplication?.status || null;
    },
    defaultAuthenticatedRoute() {
      return this.isAdmin ? "/admin" : "/";
    },
    settingsRoute() {
      return this.isAdmin ? "/admin/settings" : "/account-settings";
    }
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
