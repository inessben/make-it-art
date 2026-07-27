<template>
  <NuxtLink
    to="/artworks/new"
    class="artist-floating-action"
    aria-label="Add a new artwork"
    title="Add a new artwork"
  >
    <span class="artist-floating-action__plus" aria-hidden="true">+</span>
    <span class="artist-floating-action__label">Add artwork</span>
  </NuxtLink>
</template>

<style scoped lang="scss">
.artist-floating-action {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 70;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 0 22px;
  border: 1px solid rgba(123, 44, 255, 0.42);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(123, 44, 255, 0.96), rgba(74, 108, 247, 0.96));
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.34),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
  color: #050816;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.artist-floating-action:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow:
    0 22px 46px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.artist-floating-action__plus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.artist-floating-action__label {
  font-family: "Geist", "Hanken Grotesk", sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .artist-floating-action {
    right: 16px;
    bottom: 16px;
    min-height: 54px;
    padding: 0 18px;
  }

  .artist-floating-action__label {
    font-size: 11px;
    letter-spacing: 0.08em;
  }
}
</style>
