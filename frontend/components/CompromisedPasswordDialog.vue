<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="password-warning-backdrop"
      role="presentation"
      @keydown.esc="$emit('continue')"
      @keydown.tab="trapFocus"
    >
      <section
        ref="dialog"
        class="password-warning-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="password-warning-title"
        aria-describedby="password-warning-description"
        tabindex="-1"
      >
        <p class="password-warning-eyebrow">Security warning</p>
        <h2 id="password-warning-title">This password is no longer safe</h2>
        <p id="password-warning-description">
          This password appears in a known data breach. It does not necessarily mean that your Make
          It Art account was compromised, but you should replace this password and stop using it on
          other services.
        </p>

        <div class="password-warning-actions">
          <button type="button" class="password-warning-primary" @click="$emit('change-password')">
            Change password now
          </button>
          <button type="button" class="password-warning-secondary" @click="$emit('continue')">
            Continue
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
});

defineEmits(["change-password", "continue"]);

const dialog = ref(null);
let previouslyFocusedElement = null;

function focusableElements() {
  return [
    ...(dialog.value?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || [])
  ];
}

function trapFocus(event) {
  const elements = focusableElements();
  if (!elements.length) return;
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      previouslyFocusedElement?.focus?.();
      previouslyFocusedElement = null;
      return;
    }

    previouslyFocusedElement = document.activeElement;
    await nextTick();
    const firstFocusableElement = focusableElements()[0];
    if (firstFocusableElement) firstFocusableElement.focus();
    else dialog.value?.focus();
  }
);
</script>

<style scoped>
.password-warning-backdrop {
  @apply fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm;
}

.password-warning-dialog {
  @apply my-8 w-full max-w-lg border border-amber-700/60 bg-slate-950 p-6 shadow-2xl outline-none sm:p-8;
}

.password-warning-dialog:focus-visible {
  @apply ring-2 ring-amber-500/70;
}

.password-warning-eyebrow {
  @apply m-0 text-subtitle-2 font-bold uppercase tracking-[0.16em] text-amber-400;
}

h2 {
  @apply mt-3 text-title-2 text-slate-100;
}

#password-warning-description {
  @apply mt-4 text-body-1 leading-relaxed text-slate-300;
}

.password-warning-actions {
  @apply mt-7 flex flex-col gap-3 sm:flex-row;
}

.password-warning-primary,
.password-warning-secondary {
  @apply min-h-12 px-6 text-subtitle-2 font-bold transition;
}

.password-warning-primary {
  @apply bg-amber-500 text-slate-950 hover:bg-amber-400;
}

.password-warning-secondary {
  @apply border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500;
}
</style>
