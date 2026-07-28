<template>
  <AccountSectionShell
    eyebrow="Settings"
    title="Account settings"
    description="Manage your general account and privacy preferences from the same workspace."
  >
    <AppStatePanel
      type="disabled"
      title="Additional settings unavailable"
      message="Additional privacy and account preferences will be enabled in a future release."
    />
  </AccountSectionShell>
</template>

<script setup>
definePageMeta({
  middleware: "auth"
});
</script>
