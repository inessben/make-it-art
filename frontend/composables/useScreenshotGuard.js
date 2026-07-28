import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  installScreenCaptureGuard,
  screenCaptureActive,
  screenCaptureSource
} from "~/utils/screenCaptureGuard";

/**
 * Black out protected artworks when a capture tool / focus loss / shortcut is detected.
 * No mandatory cooldown — the user can re-show as soon as the page is focused again.
 */
const stickyBlackout = ref(false);
const shortcutPulse = ref(false);
const pageFocused = ref(true);
const activeGuards = ref(0);

let listenersBound = false;
let pulseTimer = null;
let clipboardClearTimer = null;
let safetyLoopId = 0;

const PULSE_MS = 2000;

function pageIsHidden() {
  if (import.meta.server) return false;
  return (
    document.visibilityState === "hidden" ||
    (typeof document.hasFocus === "function" && !document.hasFocus())
  );
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT"
  );
}

function isCaptureShortcut(event) {
  const key = String(event.key || "").toLowerCase();
  const code = String(event.code || "");

  if (key === "printscreen" || code === "PrintScreen") {
    return true;
  }

  // Win+Shift+S: Win key often not exposed — Shift+S outside inputs ≈ capture tool.
  if (event.shiftKey && (key === "s" || code === "KeyS")) {
    return true;
  }

  if (event.metaKey && event.shiftKey && ["3", "4", "5", "6"].includes(event.key)) {
    return true;
  }

  return false;
}

function clearClipboardSoon() {
  if (import.meta.server || !navigator.clipboard?.writeText) return;

  window.clearTimeout(clipboardClearTimer);
  clipboardClearTimer = window.setTimeout(() => {
    navigator.clipboard.writeText("").catch(() => {});
  }, 120);
}

function syncDocumentGuardClass(isActive) {
  if (import.meta.server) return;
  if (isActive) {
    document.documentElement.classList.add("mia-screenshot-guard-active");
    return;
  }
  document.documentElement.classList.remove("mia-screenshot-guard-active");
}

function isContentHidden() {
  return stickyBlackout.value || shortcutPulse.value || screenCaptureActive.value;
}

function engageStickyBlackout() {
  if (import.meta.server || activeGuards.value < 1) return;
  stickyBlackout.value = true;
  syncDocumentGuardClass(true);
  clearClipboardSoon();
}

function onCaptureDetected() {
  if (import.meta.server || activeGuards.value < 1) return;

  engageStickyBlackout();
  shortcutPulse.value = true;
  syncDocumentGuardClass(true);
  clearClipboardSoon();

  window.clearTimeout(pulseTimer);
  pulseTimer = window.setTimeout(() => {
    shortcutPulse.value = false;
    syncDocumentGuardClass(isContentHidden());
  }, PULSE_MS);
}

function dismissStickyBlackout() {
  if (import.meta.server) return;
  if (screenCaptureActive.value) return;
  if (pageIsHidden()) return;

  stickyBlackout.value = false;
  shortcutPulse.value = false;
  pageFocused.value = true;
  window.clearTimeout(pulseTimer);
  syncDocumentGuardClass(false);
}

function syncFocusBlackout() {
  if (import.meta.server || activeGuards.value < 1) {
    return;
  }

  const hidden = pageIsHidden();
  pageFocused.value = !hidden;

  if (hidden) {
    // Leaving the page / opening Snipping Tool → black out immediately.
    engageStickyBlackout();
    return;
  }

  // Stay black until the user dismisses (do not auto-reveal on focus).
  syncDocumentGuardClass(isContentHidden());
}

function onKeyDown(event) {
  if (activeGuards.value < 1 || isTypingTarget(event.target)) return;

  if (isCaptureShortcut(event)) {
    event.preventDefault();
    onCaptureDetected();
    return;
  }

  const key = String(event.key || "").toLowerCase();
  if ((event.ctrlKey || event.metaKey) && ["s", "p"].includes(key) && !event.shiftKey) {
    event.preventDefault();
    onCaptureDetected();
  }
}

function onKeyUp(event) {
  if (activeGuards.value < 1 || isTypingTarget(event.target)) return;
  if (isCaptureShortcut(event)) {
    event.preventDefault();
    onCaptureDetected();
  }
}

function onVisibilityChange() {
  syncFocusBlackout();
}

function onWindowBlur() {
  syncFocusBlackout();
}

function onWindowFocus() {
  syncFocusBlackout();
}

function onPageFreeze() {
  if (activeGuards.value < 1) return;
  engageStickyBlackout();
}

function onPageResume() {
  syncFocusBlackout();
}

function onCopy(event) {
  if (activeGuards.value < 1 || isTypingTarget(event.target)) return;
  event.preventDefault();
  onCaptureDetected();
}

function startSafetyLoop() {
  if (safetyLoopId || import.meta.server) return;
  safetyLoopId = window.setInterval(() => {
    if (activeGuards.value < 1) return;
    if (screenCaptureActive.value || pageIsHidden()) {
      engageStickyBlackout();
      return;
    }
    syncDocumentGuardClass(isContentHidden());
  }, 400);
}

function stopSafetyLoop() {
  if (!safetyLoopId) return;
  window.clearInterval(safetyLoopId);
  safetyLoopId = 0;
}

function bindListeners() {
  if (listenersBound || import.meta.server) return;
  listenersBound = true;

  installScreenCaptureGuard();
  startSafetyLoop();

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("focus", onWindowFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("copy", onCopy, true);
  document.addEventListener("cut", onCopy, true);
  document.addEventListener("freeze", onPageFreeze);
  document.addEventListener("resume", onPageResume);
}

function unbindListeners() {
  if (!listenersBound || import.meta.server) return;
  listenersBound = false;
  stopSafetyLoop();

  window.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("keyup", onKeyUp, true);
  window.removeEventListener("blur", onWindowBlur);
  window.removeEventListener("focus", onWindowFocus);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  document.removeEventListener("copy", onCopy, true);
  document.removeEventListener("cut", onCopy, true);
  document.removeEventListener("freeze", onPageFreeze);
  document.removeEventListener("resume", onPageResume);

  window.clearTimeout(pulseTimer);
  window.clearTimeout(clipboardClearTimer);
  stickyBlackout.value = false;
  shortcutPulse.value = false;
  syncDocumentGuardClass(false);
}

/**
 * Best-effort deterrents: black out when capture tools / focus loss are detected.
 */
export function useScreenshotGuard(_options = {}) {
  let stopCaptureWatch = null;

  onMounted(() => {
    activeGuards.value += 1;
    bindListeners();
    syncFocusBlackout();

    stopCaptureWatch = watch(screenCaptureActive, (active) => {
      if (activeGuards.value < 1) return;
      if (active) {
        engageStickyBlackout();
        return;
      }
      syncDocumentGuardClass(isContentHidden());
    });
  });

  onBeforeUnmount(() => {
    stopCaptureWatch?.();
    activeGuards.value = Math.max(0, activeGuards.value - 1);
    if (activeGuards.value === 0) {
      unbindListeners();
    } else {
      syncDocumentGuardClass(isContentHidden());
    }
  });

  const isBlackedOut = computed(() => {
    if (activeGuards.value < 1) return false;
    return stickyBlackout.value || shortcutPulse.value || screenCaptureActive.value;
  });

  const blackoutMessage = computed(() => {
    if (screenCaptureActive.value) {
      return "Contenu masqué pendant le partage d'écran ou l'enregistrement";
    }
    if (stickyBlackout.value) {
      return "Capture détectée — aperçu masqué";
    }
    return "Capture bloquée";
  });

  const blackoutMode = computed(() => {
    if (screenCaptureActive.value) {
      return screenCaptureSource.value === "cast" ? "cast" : "screen-share";
    }
    if (stickyBlackout.value) {
      return "sticky";
    }
    if (shortcutPulse.value) {
      return "shortcut";
    }
    return "none";
  });

  const canDismissBlackout = computed(
    () => stickyBlackout.value && !screenCaptureActive.value && pageFocused.value
  );

  return {
    isBlackedOut,
    blackoutMessage,
    blackoutMode,
    canDismissBlackout,
    dismissBlackout: dismissStickyBlackout,
    triggerBlackout: onCaptureDetected
  };
}
