<template>
  <div class="space-y-8">
    <div class="flex flex-col gap-3">
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

    <form
      class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8"
      @submit.prevent="saveProfile"
    >
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2 class="text-lg font-semibold text-[#E6EDF7]">
            Profile Information
          </h2>
          <p class="mt-2 text-sm text-[#A0ADB4]">
            Update your personal information.
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
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2 class="text-lg font-semibold text-[#E6EDF7]">Change Password</h2>
          <p class="mt-2 text-sm text-[#A0ADB4]">
            Change your password to improve security.
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

    <section
      v-if="showArtistContractSection"
      class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8"
    >
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-lg font-semibold text-[#E6EDF7]">Contrat artiste</h2>
          <p class="mt-2 max-w-2xl text-sm leading-7 text-[#A0ADB4]">
            Retrouvez ici votre contrat signe en PDF pour le consulter ou le
            telecharger a tout moment.
          </p>
          <p
            v-if="artistContractSignedAtLabel"
            class="mt-3 text-sm font-medium text-[#B8C5D9]"
          >
            Signe le {{ artistContractSignedAtLabel }}
          </p>
          <p
            v-if="artistContractVersion"
            class="mt-1 text-xs uppercase tracking-[0.16em] text-[#4A6CF7]"
          >
            {{ artistContractVersion }}
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <a
            href="/api/artists/me/contract.pdf"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
          >
            Ouvrir le PDF
          </a>
          <a
            href="/api/artists/me/contract.pdf?download=1"
            class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
          >
            Telecharger le PDF
          </a>
        </div>
      </div>
    </section>

    <section class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-8">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-lg font-semibold text-[#E6EDF7]">Danger Zone</h2>
          <p class="mt-2 max-w-2xl text-sm leading-7 text-[#A0ADB4]">
            Once your account is deleted, there is no turning back. Be sure.
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
</template>

<script setup>
import { computed, ref, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "~/stores/auth";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "~/utils/password-validation";

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

const artistContractSignedAtLabel = computed(() => {
  const signedAt = user.value?.artistApplication?.contractSignedAt;

  if (!signedAt) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(signedAt));
});

const artistContractVersion = computed(
  () => user.value?.artistApplication?.contractVersion || "",
);
const showArtistContractSection = computed(() => {
  if (auth.isAdmin) {
    return false;
  }

  const application = user.value?.artistApplication;

  return Boolean(
    auth.isArtist &&
    application &&
    (application.hasContractPdf ||
      application.contractSignedAt ||
      application.contractVersion ||
      application.status === "approved"),
  );
});

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
        bio: bio.value,
      },
    });

    auth.user = response.user;
    successMessage.value = "Profile updated successfully.";
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to update profile.";
  }
}

async function updatePassword() {
  successMessage.value = "";
  errorMessage.value = "";

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    errorMessage.value = "Please fill in all password fields.";
    return;
  }

  const passwordError =
    getPasswordValidationError(newPassword.value) ||
    getPasswordConfirmationError(newPassword.value, confirmPassword.value);

  if (passwordError) {
    errorMessage.value = passwordError;
    return;
  }

  if (newPassword.value === currentPassword.value) {
    errorMessage.value =
      "The new password must be different from the current one.";
    return;
  }

  try {
    await $fetch("/api/auth/password", {
      method: "PATCH",
      credentials: "include",
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      },
    });

    successMessage.value = "Password updated successfully.";
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to update password.";
  }
}

function deleteAccount() {
  console.log("Delete account requested");
}
</script>
