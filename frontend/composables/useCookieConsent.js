import { computed, ref } from "vue";

const STORAGE_KEY = "mia_cookie_consent";

const status = ref(null);
let initialized = false;

function readStoredStatus() {
  if (import.meta.server) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "accepted" || raw === "rejected") return raw;
    return null;
  } catch {
    return null;
  }
}

function writeStoredStatus(value) {
  if (import.meta.server) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private browsing, disabled storage): consent choice
    // simply won't persist across reloads, which is an acceptable degradation.
  }
}

export function useCookieConsent() {
  if (!initialized && import.meta.client) {
    status.value = readStoredStatus();
    initialized = true;
  }

  const hasChosen = computed(() => status.value !== null);
  const hasAcceptedAnalytics = computed(() => status.value === "accepted");

  function accept() {
    status.value = "accepted";
    writeStoredStatus("accepted");
  }

  function reject() {
    status.value = "rejected";
    writeStoredStatus("rejected");
  }

  function resetChoice() {
    status.value = null;
    if (!import.meta.server) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
    }
  }

  return { status, hasChosen, hasAcceptedAnalytics, accept, reject, resetChoice };
}
