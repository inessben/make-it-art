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

      <button type="button" class="password-toggle" @click="showPassword = !showPassword">
        {{ showPassword ? "Hide" : "Show" }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: "Password"
  },
  modelValue: {
    type: String,
    required: true
  },
  autocomplete: {
    type: String,
    default: "current-password"
  }
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
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

input,
button {
  min-height: 44px;
  border-radius: 6px;
  font: inherit;
}

input {
  min-width: 0;
  width: 100%;
  padding: 10px 12px;
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
  margin-top: 0;
  padding: 0 14px;
  border: 1px solid #c8d2e2;
  background: #ffffff;
  color: #172033;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.password-toggle:hover {
  background: #f3f6fb;
  border-color: #aebbd0;
}
</style>
