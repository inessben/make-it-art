<template>
  <AdminShell
    title="Admin settings"
    description="Manage your administrator account, profile information and back-office security."
  >
    <AccountSettingsForms embedded />
  </AdminShell>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
});
</script>
