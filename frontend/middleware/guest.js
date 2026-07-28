import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";
import { resolvePostAuthDestination } from "~/utils/post-auth-redirect";

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();

  try {
    await auth.fetchCurrentUser();

    if (auth.isAuthenticated) {
      const destination = auth.isAdmin
        ? auth.defaultAuthenticatedRoute
        : resolvePostAuthDestination(to.query.redirect, "", auth.defaultAuthenticatedRoute);

      return navigateTo(destination, { replace: true });
    }
  } catch {
    auth.user = null;
  }
});
