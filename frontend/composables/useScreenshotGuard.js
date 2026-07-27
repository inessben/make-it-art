import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const shortcutBlackout = ref(false);
const focusBlackout = ref(false);
const isBlackedOut = computed(() => shortcutBlackout.value || focusBlackout.value);
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

  // macOS / iPadOS system screenshots
  if (event.metaKey && event.shiftKey && ["3", "4", "5", "6"].includes(event.key)) {
    return true;
  }

  // In-page screenshot helpers (e.g. some browser extensions / Firefox)
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

function triggerShortcutBlackout() {
  if (import.meta.server || activeGuards.value < 1) return;

  shortcutBlackout.value = true;
  document.documentElement.classList.add("mia-screenshot-guard-active");
  clearClipboardSoon();

  window.clearTimeout(blackoutTimer);
  blackoutTimer = window.setTimeout(() => {
    shortcutBlackout.value = false;
    if (!focusBlackout.value) {
      document.documentElement.classList.remove("mia-screenshot-guard-active");
    }
  }, BLACKOUT_MS);
}

function syncFocusBlackout() {
  if (import.meta.server || activeGuards.value < 1) {
    focusBlackout.value = false;
    return;
  }

  const shouldHide =
    document.visibilityState === "hidden" ||
    (typeof document.hasFocus === "function" && !document.hasFocus());

  focusBlackout.value = shouldHide;

  if (shouldHide || shortcutBlackout.value) {
    document.documentElement.classList.add("mia-screenshot-guard-active");
  } else {
    document.documentElement.classList.remove("mia-screenshot-guard-active");
  }
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

function onCopy(event) {
  if (activeGuards.value < 1 || isTypingTarget(event.target)) return;
  event.preventDefault();
  triggerShortcutBlackout();
}

function bindListeners() {
  if (listenersBound || import.meta.server) return;
  listenersBound = true;
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("focus", onWindowFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("copy", onCopy, true);
  document.addEventListener("cut", onCopy, true);
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
  window.clearTimeout(blackoutTimer);
  window.clearTimeout(clipboardClearTimer);
  shortcutBlackout.value = false;
  focusBlackout.value = false;
  document.documentElement.classList.remove("mia-screenshot-guard-active");
}

/**
 * Best-effort screenshot deterrents for protected artwork media.
 * Browsers cannot fully block OS-level capture (unlike native FLAG_SECURE / Widevine),
 * but this mirrors the streaming-site UX: blackout while unfocused, blocked shortcuts,
 * and clipboard wipe after PrintScreen attempts.
 */
export function useScreenshotGuard() {
  onMounted(() => {
    activeGuards.value += 1;
    bindListeners();
  });

  onBeforeUnmount(() => {
    activeGuards.value = Math.max(0, activeGuards.value - 1);
    if (activeGuards.value === 0) {
      unbindListeners();
    }
  });

  return {
    isBlackedOut,
    triggerBlackout: triggerShortcutBlackout
  };
}
