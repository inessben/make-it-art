/**
 * Installs global screen-capture hooks as early as possible on the client.
 */
import { defineNuxtPlugin } from "#app";
import { installScreenCaptureGuard } from "~/utils/screenCaptureGuard";

export default defineNuxtPlugin(() => {
  if (import.meta.server) {
    return;
  }

  installScreenCaptureGuard();
});
