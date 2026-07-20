<template>
  <WishlistPageContent />
</template>

<script setup>
import { navigateTo } from "#app";
import WishlistPageContent from "~/components/collector/WishlistPageContent.vue";
import { useAuthStore } from "~/stores/auth";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();

if (auth.isAdmin) {
  await navigateTo("/admin");
}
</script>
