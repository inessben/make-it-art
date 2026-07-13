<template>
  <main class="auth-page">
    <section class="auth-shell" :style="{ maxWidth }">
      <NuxtLink to="/" class="auth-brand" aria-label="Make It Art home">
        <img src="/logo.png" alt="" />
        <span>MAKE IT ART</span>
      </NuxtLink>
      <form class="auth-form" @submit.prevent="$emit('submit')">
        <header>
          <p class="auth-kicker">MAKE IT ART ACCOUNT</p>
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
    required: true,
  },
  maxWidth: {
    type: String,
    default: "420px",
  },
  description: {
    type: String,
    default: "",
  },
});

defineEmits(["submit"]);
</script>

<style scoped>
.auth-page {
  @apply grid min-h-screen place-items-center bg-black px-4 py-10 text-slate-100 sm:px-6;
  background:
    radial-gradient(
      circle at top left,
      rgb(88 0 200 / 0.3),
      transparent 40%
    ),
    radial-gradient(circle at bottom right, rgb(123 44 255 / 0.12), transparent 32%),
    theme("colors.black");
}

.auth-shell {
  @apply grid w-full gap-6;
}

.auth-brand {
  @apply mx-auto flex items-center gap-3 text-title-4 text-slate-100;
}

.auth-brand img {
  @apply h-12 w-10 object-contain;
}

.auth-form {
  @apply grid w-full gap-5 rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8;
}

h1 {
  @apply mt-2 text-title-2 text-slate-100;
}

.auth-kicker {
  @apply text-subtitle-2 font-semibold uppercase tracking-[0.2em] text-violet-400;
}

.auth-description {
  @apply mt-3 text-body-1 leading-6 text-slate-400;
}
</style>
