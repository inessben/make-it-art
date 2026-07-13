<template>
  <section class="password-strength" aria-live="polite">
    <div class="strength-heading">
      <span>Password strength</span>
      <strong
        :class="`strength-level strength-level-${strength.level.toLowerCase()}`"
      >
        {{ strength.level }}
      </strong>
    </div>

    <div
      class="strength-track"
      role="progressbar"
      aria-label="Password strength"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="strength.percentage"
    >
      <div
        class="strength-fill"
        :class="`strength-fill-${strength.level.toLowerCase()}`"
        :style="{ width: `${strength.percentage}%` }"
      ></div>
    </div>

    <ul class="requirement-list">
      <li
        v-for="requirement in requirements"
        :key="requirement.id"
        class="requirement-item"
        :class="{ 'requirement-item-met': requirement.isMet }"
      >
        <span class="requirement-marker" aria-hidden="true"></span>
        <span class="requirement-label">{{ requirement.label }}</span>
        <span class="requirement-state">
          {{ requirement.isMet ? "Met" : "Missing" }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from "vue";
import {
  getPasswordRequirementStates,
  getPasswordStrength,
} from "~/utils/password-validation";

const props = defineProps({
  password: {
    type: String,
    default: "",
  },
});

const requirements = computed(() =>
  getPasswordRequirementStates(props.password),
);
const strength = computed(() => getPasswordStrength(props.password));
</script>

<style scoped>
.password-strength {
  display: grid;
  gap: 7px;
  margin-top: -2px;
  padding: 0 2px 2px;
}

.strength-heading {
  @apply flex items-center justify-between gap-3 text-subtitle-2 font-semibold text-slate-500;
}

.strength-level {
  @apply text-subtitle-2;
}

.strength-level-weak {
  @apply text-red-700;
}

.strength-level-medium {
  @apply text-amber-700;
}

.strength-level-strong {
  @apply text-green-700;
}

.strength-track {
  @apply h-1.5 overflow-hidden rounded-full bg-slate-100;
}

.strength-fill {
  height: 100%;
  border-radius: inherit;
  transition:
    width 0.18s ease,
    background 0.18s ease;
}

.strength-fill-weak {
  @apply bg-red-500;
}

.strength-fill-medium {
  @apply bg-amber-500;
}

.strength-fill-strong {
  @apply bg-green-500;
}

.requirement-list {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.requirement-item {
  display: grid;
  grid-template-columns: 8px 1fr;
  @apply items-center gap-2 text-subtitle-2 leading-tight text-slate-500;
}

.requirement-marker {
  @apply h-2 w-2 rounded-full bg-slate-400;
}

.requirement-item-met {
  @apply text-green-700;
}

.requirement-item-met .requirement-marker {
  @apply border-green-500 bg-green-500;
}

.requirement-label {
  min-width: 0;
}

.requirement-state {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
