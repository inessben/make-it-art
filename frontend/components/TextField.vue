<template>
  <div class="text-field">
    <label :for="id">{{ label }}</label>

    <input
      :id="id"
      :value="modelValue"
      :type="type"
      :autocomplete="autocomplete"
      :required="required"
      @input="$emit('update:modelValue', $event.target.value)"
    />
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
    required: true
  },
  modelValue: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: "text"
  },
  autocomplete: {
    type: String,
    default: undefined
  },
  required: {
    type: Boolean,
    default: true
  }
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.text-field {
  display: grid;
  gap: 10px;
}

label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #33415c;
}

input {
  min-height: 44px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #c8d2e2;
  border-radius: 6px;
  background: #ffffff;
  color: #172033;
  font: inherit;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

input:focus {
  border-color: #3273dc;
  box-shadow: 0 0 0 3px rgba(50, 115, 220, 0.16);
}
</style>
