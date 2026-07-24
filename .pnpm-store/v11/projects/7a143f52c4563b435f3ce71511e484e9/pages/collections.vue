<script setup>
import { navigateTo } from "#app";

definePageMeta({
  middleware: "auth"
});

await navigateTo({
  path: "/wishlist",
  query: {
    tab: "collections"
  }
});
</script>
