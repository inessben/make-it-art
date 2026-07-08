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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #5b6578;
  font-size: 0.8rem;
  font-weight: 600;
}

.strength-level {
  font-size: 0.78rem;
}

.strength-level-weak {
  color: #b42318;
}

.strength-level-medium {
  color: #b54708;
}

.strength-level-strong {
  color: #067647;
}

.strength-track {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #e4eaf3;
}

.strength-fill {
  height: 100%;
  border-radius: inherit;
  transition:
    width 0.18s ease,
    background 0.18s ease;
}

.strength-fill-weak {
  background: #f04438;
}

.strength-fill-medium {
  background: #f79009;
}

.strength-fill-strong {
  background: #12b76a;
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
  gap: 7px;
  align-items: center;
  color: #5b6578;
  font-size: 0.78rem;
  line-height: 1.25;
}

.requirement-marker {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #c8d2e2;
}

.requirement-item-met {
  color: #067647;
}

.requirement-item-met .requirement-marker {
  border-color: #12b76a;
  background: #12b76a;
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
