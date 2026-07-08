<template>
  <div class="password-field">
    <label :for="id">{{ label }}</label>

    <div class="password-control">
      <input
        :id="id"
        :value="modelValue"
        :type="showPassword ? 'text' : 'password'"
        :autocomplete="autocomplete"
        required
        @input="$emit('update:modelValue', $event.target.value)"
      />

      <button
        type="button"
        class="password-toggle"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        :title="showPassword ? 'Hide password' : 'Show password'"
        @click="showPassword = !showPassword"
      >
        <EyeIcon v-if="!showPassword" />
        <EyeOffIcon v-else />
      </button>
    </div>
  </div>
</template>

<script setup>
import EyeIcon from "~/components/icons/EyeIcon.vue";
import EyeOffIcon from "~/components/icons/EyeOffIcon.vue";

defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "Password",
  },
  modelValue: {
    type: String,
    required: true,
  },
  autocomplete: {
    type: String,
    default: "current-password",
  },
});

defineEmits(["update:modelValue"]);

const showPassword = ref(false);
</script>

<style scoped>
.password-field {
  display: grid;
  gap: 10px;
}

label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #33415c;
}

.password-control {
  position: relative;
}

input {
  min-height: 44px;
  border-radius: 6px;
  font: inherit;
}

input {
  min-width: 0;
  width: 100%;
  padding: 10px 46px 10px 12px;
  border: 1px solid #c8d2e2;
  background: #ffffff;
  color: #172033;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

input:focus {
  border-color: #3273dc;
  box-shadow: 0 0 0 3px rgba(50, 115, 220, 0.16);
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #5b6578;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;
  transform: translateY(-50%);
}

.password-toggle:hover,
.password-toggle:focus-visible {
  background: #f3f6fb;
  color: #172033;
}

.password-toggle:focus-visible {
  outline: 2px solid rgba(50, 115, 220, 0.42);
  outline-offset: 2px;
}

.password-toggle svg {
  width: 18px;
  height: 18px;
}
</style>
