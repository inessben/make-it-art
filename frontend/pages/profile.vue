<template>
  <main class="grid min-h-full place-items-center bg-black px-6 py-10 text-slate-100">
    <div class="rounded-3xl border border-slate-800 bg-slate-950/80 px-6 py-5 text-center">
      Redirecting to your account settings...
    </div>
  </main>
</template>

<script setup>
definePageMeta({ middleware: "auth" });

await navigateTo("/account-settings", { replace: true });
</script>
