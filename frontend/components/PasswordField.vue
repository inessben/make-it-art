<template>
  <div class="password-field">
    <label :for="id">{{ label }}</label>

    <div class="password-control">
      <input
        :id="id"
        :value="modelValue"
        :type="showPassword ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :minlength="minlength"
        required
        aria-required="true"
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
  },
  minlength: {
    type: Number,
    default: undefined
  }
});

defineEmits(["update:modelValue"]);

const showPassword = ref(false);
</script>

<style scoped>
.password-field {
  @apply grid gap-2.5;
}

label {
  @apply text-body-1 font-semibold text-slate-400;
}

.password-control {
  @apply relative;
}

input {
  @apply min-h-12;
}

input {
  @apply min-w-0 w-full border border-slate-800 bg-slate-900 py-3 pl-4 pr-12 text-body-1 text-slate-100 outline-none transition;
}

input:focus-visible {
  @apply border-violet-400 ring-2 ring-violet-400/30;
}

.password-toggle {
  @apply absolute right-2 top-1/2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-slate-400 transition;
  transform: translateY(-50%);
}

.password-toggle:hover,
.password-toggle:focus-visible {
  @apply bg-slate-800 text-slate-100;
}

.password-toggle:focus-visible {
  @apply outline outline-2 outline-offset-2 outline-violet-700/40;
}

.password-toggle svg {
  width: 18px;
  height: 18px;
}
</style>
