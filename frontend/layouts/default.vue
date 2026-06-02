<template>
  <div class="layout-default">
    <AppHeader />
    <main class="layout-default__main">
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.layout-default {
  min-height: 100vh;
  background-color: #262d3d;
  color: white;

  &__main {
    flex: 1;
  }
}
</style>
