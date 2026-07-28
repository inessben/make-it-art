import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";
import { buildLoginLocation } from "~/utils/post-auth-redirect";

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();

  try {
    await auth.fetchCurrentUser();
  } catch {
    return navigateTo(buildLoginLocation(to.fullPath));
  }

  if (auth.isAdmin) {
    return navigateTo("/admin", { replace: true });
  }
});
