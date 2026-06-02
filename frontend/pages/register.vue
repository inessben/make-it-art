<template>
  <AuthPanel title="Register" max-width="420px" @submit="handleRegister">
    <TextField id="username" v-model="form.username" label="Username" autocomplete="username" />

    <TextField id="email" v-model="form.email" label="Email" type="email" autocomplete="email" />

    <TextField id="phone" v-model="form.phone" label="Phone number" type="tel" autocomplete="tel" />

    <PasswordField
      id="password"
      v-model="form.password"
      label="Password"
      autocomplete="new-password"
    />

    <SubmitButton label="Create account" loading-label="Creating account..." :loading="loading" />

    <FormMessage :message="message" />
  </AuthPanel>
</template>

<script setup>
const form = reactive({
  username: "",
  email: "",
  phone: "",
  password: ""
});

const message = ref("");
const loading = ref(false);

async function handleRegister() {
  loading.value = true;
  message.value = "";

  try {
    const response = await $fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      body: {
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password
      }
    });

    message.value = response.message || "Account created";
  } catch (error) {
    message.value = error?.data?.message || "Registration failed";
  } finally {
    loading.value = false;
  }
}
</script>
