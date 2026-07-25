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
  @apply grid gap-2.5;
}

label {
  @apply text-body-1 font-semibold text-slate-500;
}

input {
  @apply min-h-12 w-full border border-slate-800 bg-slate-900 px-4 py-3 text-body-1 text-slate-100 outline-none transition placeholder:text-slate-500;
}

input:focus {
  @apply border-violet-600 ring-2 ring-violet-700/20;
}
</style>
