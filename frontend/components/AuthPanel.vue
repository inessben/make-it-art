<template>
  <main class="auth-page">
    <section class="auth-shell" :style="{ maxWidth }">
      <NuxtLink to="/" class="auth-brand" aria-label="Make It Art home">
        <img src="/logo.png" alt="" />
        <span>MAKE IT ART</span>
      </NuxtLink>
      <form class="auth-form" @submit.prevent="$emit('submit')">
        <header>
          <h1>{{ title }}</h1>
          <p v-if="description" class="auth-description">{{ description }}</p>
        </header>
        <slot />
      </form>
    </section>
  </main>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  maxWidth: {
    type: String,
    default: "420px"
  },
  description: {
    type: String,
    default: ""
  }
});

defineEmits(["submit"]);
</script>

<style scoped>
.auth-page {
  @apply grid place-items-center overflow-hidden bg-black px-4 text-slate-100 sm:px-6;
  height: 100vh;
  height: 100dvh;
  padding-block: clamp(0.75rem, 2.5vh, 2rem);
  background:
    radial-gradient(circle at top left, rgb(88 0 200 / 0.3), transparent 40%),
    radial-gradient(circle at bottom right, rgb(123 44 255 / 0.12), transparent 32%),
    theme("colors.black");
}

.auth-shell {
  @apply grid w-full;
  max-height: 100%;
  gap: clamp(0.5rem, 1.8vh, 1.25rem);
}

.auth-brand {
  @apply mx-auto flex items-center gap-3 text-title-4 text-slate-100;
}

.auth-brand img {
  @apply h-10 w-8 object-contain;
}

.auth-form {
  @apply grid w-full rounded-2xl border border-slate-800 bg-slate-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)];
  gap: clamp(0.6rem, 1.5vh, 1.1rem);
  padding: clamp(0.9rem, 2.2vh, 1.75rem);
}

h1 {
  @apply text-title-3 text-slate-100 sm:text-title-2;
}

.auth-description {
  @apply mt-2 text-body-1 leading-5 text-slate-400;
}

@media (max-height: 800px) {
  .auth-brand {
    @apply text-body-2;
  }

  .auth-brand img {
    @apply h-8 w-7;
  }

  .auth-form {
    gap: 0.55rem;
    padding: 0.85rem 1rem;
  }

  h1 {
    @apply text-title-3;
  }

  .auth-description {
    @apply mt-1 text-footer leading-5;
  }

  :deep(.text-field),
  :deep(.password-field) {
    gap: 0.25rem;
  }

  :deep(.text-field input),
  :deep(.password-field input),
  :deep(button[type="submit"]) {
    min-height: 2.5rem;
  }

  :deep(.text-field input),
  :deep(.password-field input) {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  :deep(.password-strength) {
    gap: 0.3rem;
  }
}

@media (max-height: 800px) and (min-width: 400px) {
  :deep(.requirement-list) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1rem;
  }
}
</style>
