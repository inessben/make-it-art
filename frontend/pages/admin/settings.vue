<template>
  <AdminShell
    title="Parametres admin"
    description="Gerez votre compte administrateur, vos informations et la securite d'acces au backoffice."
  >
    <AccountSettingsForms />
  </AdminShell>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
});
</script>
