import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  installScreenCaptureGuard,
  screenCaptureActive,
  screenCaptureSource
} from "~/utils/screenCaptureGuard";

const shortcutBlackout = ref(false);
const focusBlackout = ref(false);

const activeGuards = ref(0);

let listenersBound = false;
let blackoutTimer = null;
let clipboardClearTimer = null;

const BLACKOUT_MS = 1800;

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

  if (event.metaKey && event.shiftKey && ["3", "4", "5", "6"].includes(event.key)) {
    return true;
  }

  if (event.shiftKey && (event.metaKey || event.ctrlKey) && key === "s") {
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
  if (isActive) {
    document.documentElement.classList.add("mia-screenshot-guard-active");
    return;
  }
  document.documentElement.classList.remove("mia-screenshot-guard-active");
}

function triggerShortcutBlackout() {
  if (import.meta.server || activeGuards.value < 1) return;

  shortcutBlackout.value = true;
  syncDocumentGuardClass(true);
  clearClipboardSoon();

  window.clearTimeout(blackoutTimer);
  blackoutTimer = window.setTimeout(() => {
    shortcutBlackout.value = false;
    syncDocumentGuardClass(isContentHidden());
  }, BLACKOUT_MS);
}

function isContentHidden() {
  return (
    focusBlackout.value ||
    screenCaptureActive.value ||
    shortcutBlackout.value
  );
}

function syncFocusBlackout() {
  if (import.meta.server || activeGuards.value < 1) {
    focusBlackout.value = false;
    return;
  }

  focusBlackout.value =
    document.visibilityState === "hidden" ||
    (typeof document.hasFocus === "function" && !document.hasFocus());

  syncDocumentGuardClass(isContentHidden());
}

function onKeyDown(event) {
  if (activeGuards.value < 1 || isTypingTarget(event.target)) return;

  if (isCaptureShortcut(event)) {
    event.preventDefault();
    triggerShortcutBlackout();
    return;
  }

  const key = String(event.key || "").toLowerCase();
  if ((event.ctrlKey || event.metaKey) && ["s", "p"].includes(key)) {
    event.preventDefault();
    triggerShortcutBlackout();
  }
}

function onKeyUp(event) {
  if (activeGuards.value < 1) return;
  if (isCaptureShortcut(event)) {
    event.preventDefault();
    triggerShortcutBlackout();
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
  focusBlackout.value = true;
  syncDocumentGuardClass(true);
}

function onPageResume() {
  syncFocusBlackout();
}

function onCopy(event) {
  if (activeGuards.value < 1 || isTypingTarget(event.target)) return;
  event.preventDefault();
  triggerShortcutBlackout();
}

function bindListeners() {
  if (listenersBound || import.meta.server) return;
  listenersBound = true;

  installScreenCaptureGuard();

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

  window.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("keyup", onKeyUp, true);
  window.removeEventListener("blur", onWindowBlur);
  window.removeEventListener("focus", onWindowFocus);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  document.removeEventListener("copy", onCopy, true);
  document.removeEventListener("cut", onCopy, true);
  document.removeEventListener("freeze", onPageFreeze);
  document.removeEventListener("resume", onPageResume);

  window.clearTimeout(blackoutTimer);
  window.clearTimeout(clipboardClearTimer);
  shortcutBlackout.value = false;
  focusBlackout.value = false;
  syncDocumentGuardClass(false);
}

const isBlackedOut = computed(() => {
  if (activeGuards.value < 1) {
    return false;
  }
  return (
    shortcutBlackout.value ||
    focusBlackout.value ||
    screenCaptureActive.value
  );
});

const blackoutMessage = computed(() => {
  if (screenCaptureActive.value) {
    return "Contenu masqué pendant le partage d'écran ou l'enregistrement";
  }
  if (focusBlackout.value) {
    return "Contenu masqué — revenez sur cet onglet pour continuer";
  }
  return "Capture bloquée";
});

const blackoutMode = computed(() => {
  if (screenCaptureActive.value) {
    return screenCaptureSource.value === "cast" ? "cast" : "screen-share";
  }
  if (focusBlackout.value) {
    return "focus";
  }
  if (shortcutBlackout.value) {
    return "shortcut";
  }
  return "none";
});

/**
 * Best-effort deterrents for screenshots and in-browser capture/streaming.
 * True Netflix-style blocking during Discord/Teams desktop capture requires DRM video;
 * static images cannot be fully protected at the OS compositor level from JavaScript alone.
 */
export function useScreenshotGuard() {
  let stopCaptureWatch = null;

  onMounted(() => {
    activeGuards.value += 1;
    bindListeners();
    syncFocusBlackout();

    stopCaptureWatch = watch(screenCaptureActive, () => {
      if (activeGuards.value > 0) {
        syncDocumentGuardClass(isContentHidden());
      }
    });
  });

  onBeforeUnmount(() => {
    stopCaptureWatch?.();
    activeGuards.value = Math.max(0, activeGuards.value - 1);
    if (activeGuards.value === 0) {
      unbindListeners();
    }
  });

  return {
    isBlackedOut,
    blackoutMessage,
    blackoutMode,
    triggerBlackout: triggerShortcutBlackout
  };
}
