<template>
  <main class="min-h-screen bg-[#000000] px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto w-full max-w-[1120px] rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-8 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Account Settings</p>
          <h1 class="mt-4 text-[clamp(2rem,2.5vw,2.8rem)] font-semibold leading-[1.05]">
            Manage your account preferences
          </h1>
          <p class="mt-4 max-w-2xl text-[#A0ADB4] leading-7">
            Mettez à jour vos informations, changez votre mot de passe et gérez la sécurité de votre
            compte.
          </p>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-3">
        <div
          v-if="successMessage"
          class="rounded-2xl border border-[#1A1F2A] bg-[#11243a] px-5 py-4 text-sm text-[#B9E3FF]"
        >
          {{ successMessage }}
        </div>
        <div
          v-if="errorMessage"
          class="rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
        >
          {{ errorMessage }}
        </div>
      </div>

      <div class="mt-10 space-y-8">
        <form
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8"
          @submit.prevent="saveProfile"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-[#E6EDF7]">Profile Information</h2>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                Mettez à jour vos informations personnelles.
              </p>
            </div>
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 py-3 text-sm font-semibold text-[#000000] transition hover:bg-[#3b70f0]"
            >
              Save Changes
            </button>
          </div>

          <div class="mt-8 grid gap-6 lg:grid-cols-2">
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">First Name</span>
              <input
                v-model="firstName"
                type="text"
                placeholder="John"
                class="w-full rounded-xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/30"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Last Name</span>
              <input
                v-model="lastName"
                type="text"
                placeholder="Doe"
                class="w-full rounded-xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/30"
              />
            </label>
          </div>

          <div class="mt-6 grid gap-6">
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Email</span>
              <input
                v-model="email"
                type="email"
                placeholder="john.doe@example.com"
                class="w-full rounded-xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/30"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Bio</span>
              <textarea
                v-model="bio"
                rows="4"
                placeholder="Art enthusiast and collector"
                class="w-full rounded-xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/30"
              ></textarea>
            </label>
          </div>
        </form>

        <form
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8"
          @submit.prevent="updatePassword"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-[#E6EDF7]">Change Password</h2>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                Modifiez votre mot de passe pour renforcer la sécurité.
              </p>
            </div>
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 py-3 text-sm font-semibold text-[#000000] transition hover:bg-[#3b70f0]"
            >
              Update Password
            </button>
          </div>

          <div class="mt-8 grid gap-6">
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Current Password</span>
              <input
                v-model="currentPassword"
                type="password"
                class="w-full rounded-xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/30"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">New Password</span>
              <input
                v-model="newPassword"
                type="password"
                class="w-full rounded-xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/30"
              />
            </label>
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Confirm New Password</span>
              <input
                v-model="confirmPassword"
                type="password"
                class="w-full rounded-xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3 text-sm text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/30"
              />
            </label>
          </div>
        </form>

        <section class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-[#E6EDF7]">Danger Zone</h2>
              <p class="mt-2 max-w-2xl text-sm text-[#A0ADB4] leading-7">
                Une fois votre compte supprimé, il n’y a pas de retour en arrière. Soyez certain.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl bg-[#F43F5E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4266]"
              @click="deleteAccount"
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const { user } = storeToRefs(auth);

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const bio = ref("");
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const successMessage = ref("");
const errorMessage = ref("");

watchEffect(() => {
  if (user.value) {
    const fullName = user.value.username || "";
    const [first = "", last = ""] = fullName.split(" ");
    firstName.value = first;
    lastName.value = last;
    email.value = user.value.email || "";
    bio.value = user.value.bio || "";
  }
});

async function saveProfile() {
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      body: {
        username: `${firstName.value} ${lastName.value}`.trim(),
        email: email.value,
        bio: bio.value
      }
    });

    auth.user = response.user;
    successMessage.value = "Profil mis à jour avec succès.";
  } catch (error) {
    errorMessage.value = error?.data?.message || "Impossible de mettre à jour le profil.";
  }
}

async function updatePassword() {
  successMessage.value = "";
  errorMessage.value = "";

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    errorMessage.value = "Veuillez renseigner tous les champs du mot de passe.";
    return;
  }

  if (newPassword.value.length < 8) {
    errorMessage.value = "Le nouveau mot de passe doit contenir au moins 8 caractères.";
    return;
  }

  if (newPassword.value === currentPassword.value) {
    errorMessage.value = "Le nouveau mot de passe doit être différent de l’actuel.";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "La confirmation du mot de passe doit correspondre.";
    return;
  }

  try {
    await $fetch("/api/auth/password", {
      method: "PATCH",
      credentials: "include",
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value
      }
    });

    successMessage.value = "Mot de passe mis à jour avec succès.";
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
  } catch (error) {
    errorMessage.value = error?.data?.message || "Impossible de mettre à jour le mot de passe.";
  }
}

function deleteAccount() {
  console.log("Delete account requested");
}

definePageMeta({
  middleware: "auth"
});
</script>
