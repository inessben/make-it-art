import { defineNuxtRouteMiddleware } from "#app";

export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server || (!window.location.search && !window.location.hash)) {
    return;
  }

  window.history.replaceState(window.history.state, "", window.location.pathname);
});
