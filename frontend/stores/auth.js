import { defineStore } from "pinia";
import { createCurrentUserSynchronizer } from "~/utils/auth-session";

const synchronizeCurrentUser = createCurrentUserSynchronizer();

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
    fetchCurrentUser() {
      return synchronizeCurrentUser(this, $fetch);
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
