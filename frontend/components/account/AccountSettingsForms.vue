<template>
  <main :class="props.embedded ? 'text-slate-100' : 'min-h-screen bg-black text-slate-100'">
    <div
      :class="
        props.embedded
          ? 'w-full'
          : 'mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[258px_minmax(0,1fr)]'
      "
    >
      <AccountSettingsSidebar v-if="!props.embedded" />

      <section :class="props.embedded ? 'min-w-0' : 'min-w-0 pb-16 pt-1 lg:px-4'">
        <header v-if="!props.embedded">
          <h1 class="text-title-2">General Settings</h1>
          <p class="mt-2 text-body-1 text-slate-400">
            Manage your digital presence and account identity.
          </p>
        </header>

        <div
          v-if="successMessage"
          class="mt-7 border border-green-900 bg-green-950 px-5 py-4 text-footer text-green-200"
        >
          {{ successMessage }}
        </div>
        <div
          v-if="errorMessage"
          class="mt-7 border border-red-900 bg-red-950 px-5 py-4 text-footer text-red-200"
        >
          {{ errorMessage }}
        </div>

        <form
          :class="
            props.embedded
              ? 'border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6'
              : 'mt-8 rounded-lg border border-slate-800 bg-slate-950/70 p-4 sm:p-6'
          "
          @submit.prevent="saveProfile"
        >
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-title-3">Profile Information</h2>
              <p class="mt-2 text-footer text-slate-500">
                This is how other collectors will see you in the marketplace.
              </p>
            </div>
            <div
              class="h-24 w-24 shrink-0 rounded-xl border-2 border-slate-750 bg-slate-900"
              aria-label="Avatar placeholder"
            />
          </div>

          <div class="mt-10 grid gap-6 md:grid-cols-2">
            <label class="grid gap-2 text-subtitle-2 uppercase tracking-[0.1em] text-slate-300"
              >Display name
              <input
                v-model.trim="profile.username"
                :disabled="savingProfile"
                type="text"
                autocomplete="name"
                class="h-14 border-b border-slate-750 bg-slate-900 px-5 text-body-1 normal-case tracking-normal text-slate-100 outline-none focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <label class="grid gap-2 text-subtitle-2 uppercase tracking-[0.1em] text-slate-300"
              >Email address
              <input
                v-model.trim="profile.email"
                :disabled="savingProfile"
                type="email"
                autocomplete="email"
                class="h-14 border-b border-slate-750 bg-slate-900 px-5 text-body-1 normal-case tracking-normal text-slate-100 outline-none focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          </div>

          <label class="mt-8 grid gap-2 text-subtitle-2 uppercase tracking-[0.1em] text-slate-300"
            >Collector bio
            <textarea
              v-model.trim="profile.bio"
              :disabled="savingProfile"
              rows="4"
              class="resize-none border-b border-slate-750 bg-slate-900 px-5 py-4 text-body-1 normal-case leading-6 tracking-normal text-slate-100 outline-none focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <div class="mt-8 flex flex-wrap gap-5">
            <button
              type="button"
              class="h-12 border border-slate-800 px-8 text-subtitle-2 uppercase tracking-[0.12em]"
              @click="resetProfile"
            >
              Discard changes
            </button>
            <button
              type="submit"
              class="h-12 bg-slate-100 px-12 text-subtitle-2 uppercase tracking-[0.12em] text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="savingProfile"
            >
              {{ savingProfile ? "Saving..." : "Save changes" }}
            </button>
          </div>
        </form>

        <form
          :class="
            props.embedded
              ? 'mt-6 border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6'
              : 'mt-8 rounded-lg border border-slate-800 bg-slate-950/70 p-4 sm:p-6'
          "
          @submit.prevent="updatePassword"
        >
          <h2 class="text-title-3">Account Security</h2>
          <p class="mt-2 text-footer text-slate-500">
            Update the password associated with your account.
          </p>

          <div class="mt-8 grid gap-5">
            <label class="grid gap-2 text-subtitle-2 uppercase tracking-[0.1em] text-slate-300"
              >Current password
              <input
                v-model="password.current"
                :disabled="savingPassword"
                type="password"
                autocomplete="current-password"
                class="h-12 border-b border-slate-750 bg-slate-900 px-5 text-body-1 text-slate-100 outline-none focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <div class="grid gap-5 md:grid-cols-2">
              <label class="grid gap-2 text-subtitle-2 uppercase tracking-[0.1em] text-slate-300"
                >New password
                <input
                  v-model="password.next"
                  :disabled="savingPassword"
                  type="password"
                  autocomplete="new-password"
                  class="h-12 border-b border-slate-750 bg-slate-900 px-5 text-body-1 text-slate-100 outline-none focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
              <label class="grid gap-2 text-subtitle-2 uppercase tracking-[0.1em] text-slate-300"
                >Confirm password
                <input
                  v-model="password.confirmation"
                  :disabled="savingPassword"
                  type="password"
                  autocomplete="new-password"
                  class="h-12 border-b border-slate-750 bg-slate-900 px-5 text-body-1 text-slate-100 outline-none focus:border-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            class="mt-7 h-12 bg-violet-600 px-10 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="savingPassword"
          >
            {{ savingPassword ? "Updating..." : "Update password" }}
          </button>
        </form>

        <section
          v-if="showArtistContractSection"
          :class="
            props.embedded
              ? 'mt-6 border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6'
              : 'mt-8 rounded-lg border border-slate-800 bg-slate-950/70 p-6'
          "
        >
          <h2 class="text-title-3">Artist Contract</h2>
          <p v-if="artistContractSignedAtLabel" class="mt-3 text-footer text-slate-400">
            Signed on {{ artistContractSignedAtLabel }}
          </p>
          <div class="mt-6 flex flex-wrap gap-4">
            <a
              href="/api/artists/me/contract.pdf"
              target="_blank"
              rel="noreferrer"
              class="border border-violet-700 px-6 py-3 text-footer text-violet-200"
              >Open PDF</a
            ><a
              href="/api/artists/me/contract.pdf?download=1"
              class="border border-slate-800 px-6 py-3 text-footer"
              >Download PDF</a
            >
          </div>
        </section>

        <button
          v-if="!props.embedded"
          type="button"
          class="mt-10 ml-auto flex items-center gap-2 text-footer text-red-300"
          @click="handleLogout"
        >
          Sign Out
        </button>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watchEffect } from "vue";
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import AccountSettingsSidebar from "~/components/account/AccountSettingsSidebar.vue";
import { useAuthStore } from "~/stores/auth";
import {
  getPasswordConfirmationError,
  getPasswordValidationError
} from "~/utils/password-validation";

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
});

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const profile = reactive({ username: "", email: "", bio: "" });
const password = reactive({ current: "", next: "", confirmation: "" });
const savingProfile = ref(false);
const savingPassword = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const artistContractSignedAtLabel = computed(() => {
  const value = user.value?.artistApplication?.contractSignedAt;
  return value
    ? new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "long", year: "numeric" }).format(
        new Date(value)
      )
    : "";
});
const showArtistContractSection = computed(
  () => !auth.isAdmin && auth.isArtist && Boolean(user.value?.artistApplication?.hasContractPdf)
);

watchEffect(() => resetProfile());

function resetProfile() {
  profile.username = user.value?.username || "";
  profile.email = user.value?.email || "";
  profile.bio = user.value?.bio || "";
}

async function saveProfile() {
  savingProfile.value = true;
  successMessage.value = "";
  errorMessage.value = "";
  try {
    const response = await $fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      body: { username: profile.username, email: profile.email, bio: profile.bio }
    });
    auth.user = response.user;
    successMessage.value = "Profile updated successfully.";
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to update profile.";
  } finally {
    savingProfile.value = false;
  }
}

async function updatePassword() {
  successMessage.value = "";
  errorMessage.value = "";
  if (!password.current || !password.next || !password.confirmation) {
    errorMessage.value = "Please fill in all password fields.";
    return;
  }
  const validationError =
    getPasswordValidationError(password.next) ||
    getPasswordConfirmationError(password.next, password.confirmation);
  if (validationError) {
    errorMessage.value = validationError;
    return;
  }
  savingPassword.value = true;
  try {
    await $fetch("/api/auth/password", {
      method: "PATCH",
      credentials: "include",
      body: {
        currentPassword: password.current,
        newPassword: password.next,
        confirmPassword: password.confirmation
      }
    });
    password.current = "";
    password.next = "";
    password.confirmation = "";
    successMessage.value = "Password updated successfully.";
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to update password.";
  } finally {
    savingPassword.value = false;
  }
}

async function handleLogout() {
  await auth.logout();
  await navigateTo("/login");
}
</script>
