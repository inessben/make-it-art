import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();

  try {
    await auth.fetchCurrentUser();

    if (auth.isAuthenticated) {
      return navigateTo(auth.defaultAuthenticatedRoute, { replace: true });
    }
  } catch {
    auth.user = null;
  }
});
