import { defineNuxtRouteMiddleware, navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();

  try {
    await auth.fetchCurrentUser();
  } catch {
    return navigateTo("/login");
  }

  if (auth.isAdmin) {
    return navigateTo("/admin", { replace: true });
  }

  if (!auth.isVerifiedArtist) {
    return navigateTo("/artist-profile", { replace: true });
  }
});
