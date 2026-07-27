<template>
  <AccountSectionShell
    eyebrow="Wallet"
    title="My wallet"
    description="Review your balance, credit and future wallet activity in one place."
  >
    <AppStatePanel
      type="disabled"
      title="Wallet unavailable"
      message="Wallet balances and transactions will be enabled when the payment infrastructure is connected."
    />
  </AccountSectionShell>
</template>

<script setup>
definePageMeta({
  middleware: "auth"
});
</script>
