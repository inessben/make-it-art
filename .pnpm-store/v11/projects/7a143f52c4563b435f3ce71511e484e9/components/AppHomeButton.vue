<template>
  <NuxtLink v-if="!isHomePage" to="/" class="app-home-button" aria-label="Retour a l'accueil">
    <span class="app-home-button__icon" aria-hidden="true">←</span>
    <span>Accueil</span>
  </NuxtLink>
</template>

<script setup>
const route = useRoute();

const isHomePage = computed(() => route.path === "/");
</script>

<style scoped>
.app-home-button {
  position: fixed;
  top: 1.25rem;
  left: 1.25rem;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.65rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  background: rgba(6, 10, 19, 0.88);
  backdrop-filter: blur(10px);
  color: #e6edf7;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.app-home-button:hover {
  background: rgba(20, 28, 46, 0.96);
  border-color: rgba(109, 139, 255, 0.45);
  transform: translateY(-1px);
}

.app-home-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: rgba(74, 108, 247, 0.18);
  color: #8aa2ff;
  font-size: 0.95rem;
  line-height: 1;
}
</style>
