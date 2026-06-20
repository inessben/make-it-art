<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1120px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Become an artist</p>
          <h1 class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white">
            Creer votre profil artiste
          </h1>
          <p class="mt-4 max-w-2xl text-sm leading-6 text-[#A0ADB4]">
            Un parcours MVP en trois etapes pour ouvrir votre espace artiste.
          </p>
        </div>

        <NuxtLink
          to="/profile"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Retour au profil
        </NuxtLink>
      </header>

      <nav class="grid gap-3 sm:grid-cols-3" aria-label="Progression du formulaire artiste">
        <button
          v-for="item in steps"
          :key="item.id"
          type="button"
          class="min-h-14 rounded-2xl border px-4 py-3 text-left text-sm transition"
          :class="
            item.id === step
              ? 'border-[#4A6CF7] bg-[#4A6CF7]/15 text-white'
              : item.id < step
                ? 'border-[#1A1F2A] bg-[#0F1523] text-[#C9D4E3]'
                : 'border-[#1A1F2A] bg-[#050916] text-[#7F8A99]'
          "
          @click="goToStep(item.id)"
        >
          <span class="block text-xs uppercase tracking-[0.16em]">Etape {{ item.id }}</span>
          <span class="mt-1 block font-semibold">{{ item.label }}</span>
        </button>
      </nav>

      <form class="grid gap-7" @submit.prevent="submitApplication">
        <section v-if="step === 1" class="grid gap-6">
          <div>
            <h2 class="text-xl font-semibold text-white">Identite artiste</h2>
            <p class="mt-2 text-sm text-[#A0ADB4]">
              Ces informations servent a creer le profil public.
            </p>
          </div>

          <div class="grid gap-5 lg:grid-cols-2">
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Nom d'artiste *</span>
              <input
                v-model.trim="form.displayName"
                type="text"
                placeholder="Votre alias public"
                class="field-control"
                autocomplete="nickname"
              />
            </label>

            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Email du compte</span>
              <input
                :value="user?.email || ''"
                type="email"
                class="field-control bg-[#080D18] text-[#7F8A99]"
                readonly
              />
            </label>

            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Prenom</span>
              <input
                v-model.trim="form.firstName"
                type="text"
                placeholder="Prenom"
                class="field-control"
                autocomplete="given-name"
              />
            </label>

            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Nom</span>
              <input
                v-model.trim="form.lastName"
                type="text"
                placeholder="Nom"
                class="field-control"
                autocomplete="family-name"
              />
            </label>
          </div>
        </section>

        <section v-else-if="step === 2" class="grid gap-6">
          <div>
            <h2 class="text-xl font-semibold text-white">Profil public</h2>
            <p class="mt-2 text-sm text-[#A0ADB4]">
              Les visiteurs verront ces elements sur votre profil.
            </p>
          </div>

          <label class="grid gap-2 text-sm text-[#A0ADB4]">
            <span class="font-medium text-[#E6EDF7]">Bio artiste *</span>
            <textarea
              v-model.trim="form.bio"
              rows="5"
              placeholder="Parlez de votre univers, vos inspirations et votre approche artistique."
              class="field-control min-h-36 resize-y"
            />
          </label>

          <div class="grid gap-5 lg:grid-cols-2">
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Type d'art principal *</span>
              <select v-model="form.artType" class="field-control">
                <option value="">Selectionner un type</option>
                <option v-for="option in artTypeOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>

            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Portfolio</span>
              <input
                v-model.trim="form.portfolioUrl"
                type="url"
                placeholder="https://portfolio.example"
                class="field-control"
              />
            </label>
          </div>

          <div class="grid gap-3">
            <label class="grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]">Styles / specialites *</span>
              <span class="flex flex-col gap-3 sm:flex-row">
                <input
                  v-model.trim="styleInput"
                  type="text"
                  placeholder="Digital painting"
                  class="field-control"
                  @keydown.enter.prevent="addStyle"
                />
                <button
                  type="button"
                  class="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#4A6CF7] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/15"
                  @click="addStyle"
                >
                  Ajouter
                </button>
              </span>
            </label>

            <div v-if="form.styles.length" class="flex flex-wrap gap-2">
              <button
                v-for="style in form.styles"
                :key="style"
                type="button"
                class="rounded-full bg-[#4A6CF7]/10 px-4 py-2 text-sm font-semibold text-[#BFD0FF] transition hover:bg-[#4A6CF7]/20"
                @click="removeStyle(style)"
              >
                {{ style }}
              </button>
            </div>
          </div>

          <label class="grid gap-2 text-sm text-[#A0ADB4]">
            <span class="font-medium text-[#E6EDF7]">Reseau social principal</span>
            <input
              v-model.trim="form.socialHandle"
              type="text"
              placeholder="@username"
              class="field-control"
            />
          </label>
        </section>

        <section v-else class="grid gap-6">
          <div>
            <h2 class="text-xl font-semibold text-white">Validation</h2>
            <p class="mt-2 text-sm text-[#A0ADB4]">Verifiez les informations avant soumission.</p>
          </div>

          <dl class="grid gap-3 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-5 text-sm">
            <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt class="text-[#A0ADB4]">Nom d'artiste</dt>
              <dd class="font-semibold text-white">{{ form.displayName || "-" }}</dd>
            </div>
            <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt class="text-[#A0ADB4]">Type d'art</dt>
              <dd class="font-semibold text-white">{{ form.artType || "-" }}</dd>
            </div>
            <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt class="text-[#A0ADB4]">Styles</dt>
              <dd class="font-semibold text-white">{{ form.styles.join(", ") || "-" }}</dd>
            </div>
            <div class="grid gap-1">
              <dt class="text-[#A0ADB4]">Bio</dt>
              <dd class="leading-6 text-white">{{ form.bio || "-" }}</dd>
            </div>
          </dl>

          <div class="grid gap-4">
            <label
              class="flex gap-3 rounded-2xl border border-[#1A1F2A] bg-[#050916] p-4 text-sm text-[#A0ADB4]"
            >
              <input
                v-model="form.termsAccepted"
                type="checkbox"
                class="mt-1 h-4 w-4 accent-[#4A6CF7]"
              />
              <span>J'accepte les conditions et la politique de confidentialite *</span>
            </label>

            <label
              class="flex gap-3 rounded-2xl border border-[#1A1F2A] bg-[#050916] p-4 text-sm text-[#A0ADB4]"
            >
              <input
                v-model="form.commissionAccepted"
                type="checkbox"
                class="mt-1 h-4 w-4 accent-[#4A6CF7]"
              />
              <span>Je comprends que Make It Art applique une commission sur les ventes *</span>
            </label>
          </div>
        </section>

        <div
          v-if="message"
          class="rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
        >
          {{ message }}
        </div>

        <p class="min-h-5 text-sm text-[#7F8A99]">
          {{ draftStatusMessage }}
        </p>

        <footer class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="step === 1 || loading"
            @click="previousStep"
          >
            Precedent
          </button>

          <button
            v-if="step < steps.length"
            type="button"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6d8bff]"
            @click="nextStep"
          >
            Suivant
          </button>
          <button
            v-else
            type="submit"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6d8bff] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            {{ loading ? "Soumission..." : "Submit application" }}
          </button>
        </footer>
      </form>
    </section>
  </main>
</template>

<script setup>
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth"
});

const auth = useAuthStore();
const { user } = storeToRefs(auth);

const steps = [
  { id: 1, label: "Identite" },
  { id: 2, label: "Profil public" },
  { id: 3, label: "Validation" }
];

const artTypeOptions = [
  "Digital Art",
  "Photography",
  "3D Art",
  "Vector Art",
  "Illustration",
  "Graphic Design",
  "Mixed Media"
];

const step = ref(1);
const styleInput = ref("");
const message = ref("");
const loading = ref(false);
const draftLoaded = ref(false);
const draftCompleted = ref(false);
const draftStatusMessage = ref("");
let draftSaveTimeout = null;

const form = reactive({
  displayName: "",
  firstName: "",
  lastName: "",
  bio: "",
  artType: "",
  styles: [],
  portfolioUrl: "",
  socialHandle: "",
  termsAccepted: false,
  commissionAccepted: false
});

onMounted(async () => {
  const fullName = user.value?.username || "";
  const [firstName = "", ...lastNameParts] = fullName.split(" ");

  form.firstName = firstName;
  form.lastName = lastNameParts.join(" ");
  form.displayName = user.value?.artist?.displayName || user.value?.username || "";
  form.bio = user.value?.bio || "";

  await loadApplicationDraft();
  draftLoaded.value = true;
});

onBeforeUnmount(() => {
  if (draftSaveTimeout) {
    clearTimeout(draftSaveTimeout);
  }
});

watch(form, queueDraftSave, { deep: true });
watch(step, queueDraftSave);

function buildDraftPayload() {
  return {
    displayName: form.displayName,
    firstName: form.firstName,
    lastName: form.lastName,
    bio: form.bio,
    artType: form.artType,
    styles: form.styles,
    portfolioUrl: form.portfolioUrl,
    socialHandle: form.socialHandle,
    termsAccepted: form.termsAccepted,
    commissionAccepted: form.commissionAccepted
  };
}

function applyDraftPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  form.displayName =
    typeof payload.displayName === "string" ? payload.displayName : form.displayName;
  form.firstName = typeof payload.firstName === "string" ? payload.firstName : form.firstName;
  form.lastName = typeof payload.lastName === "string" ? payload.lastName : form.lastName;
  form.bio = typeof payload.bio === "string" ? payload.bio : form.bio;
  form.artType = typeof payload.artType === "string" ? payload.artType : form.artType;
  form.styles = Array.isArray(payload.styles) ? payload.styles : form.styles;
  form.portfolioUrl =
    typeof payload.portfolioUrl === "string" ? payload.portfolioUrl : form.portfolioUrl;
  form.socialHandle =
    typeof payload.socialHandle === "string" ? payload.socialHandle : form.socialHandle;
  form.termsAccepted = Boolean(payload.termsAccepted);
  form.commissionAccepted = Boolean(payload.commissionAccepted);
}

async function loadApplicationDraft() {
  try {
    const response = await $fetch("/api/artists/me/application-draft", {
      credentials: "include"
    });
    const draft = response.draft;

    if (!draft || draft.completedAt) {
      return;
    }

    applyDraftPayload(draft.payload);
    step.value = Math.min(Math.max(Number(draft.currentStep || 1), 1), steps.length);
    draftStatusMessage.value = "Brouillon restaure.";
  } catch {
    draftStatusMessage.value = "Brouillon indisponible pour le moment.";
  }
}

function queueDraftSave() {
  if (!draftLoaded.value || draftCompleted.value) {
    return;
  }

  if (draftSaveTimeout) {
    clearTimeout(draftSaveTimeout);
  }

  draftSaveTimeout = setTimeout(saveApplicationDraft, 700);
}

async function saveApplicationDraft() {
  if (draftCompleted.value) {
    return;
  }

  draftStatusMessage.value = "Sauvegarde du brouillon...";

  try {
    await $fetch("/api/artists/me/application-draft", {
      method: "PATCH",
      credentials: "include",
      body: {
        currentStep: step.value,
        payload: buildDraftPayload()
      }
    });

    draftStatusMessage.value = "Brouillon sauvegarde.";
  } catch {
    draftStatusMessage.value = "Impossible de sauvegarder le brouillon.";
  }
}

function addStyle() {
  const normalizedStyle = styleInput.value.trim();

  if (!normalizedStyle || form.styles.includes(normalizedStyle)) {
    return;
  }

  form.styles.push(normalizedStyle);
  styleInput.value = "";
}

function removeStyle(style) {
  form.styles = form.styles.filter((item) => item !== style);
}

function validateStep(targetStep = step.value) {
  message.value = "";

  if (targetStep >= 1 && !form.displayName.trim()) {
    message.value = "Le nom d'artiste est requis.";
    step.value = 1;
    return false;
  }

  if (targetStep >= 2) {
    if (!form.bio.trim()) {
      message.value = "La bio artiste est requise.";
      step.value = 2;
      return false;
    }

    if (!form.artType) {
      message.value = "Le type d'art principal est requis.";
      step.value = 2;
      return false;
    }

    if (form.styles.length === 0) {
      message.value = "Ajoutez au moins un style ou une specialite.";
      step.value = 2;
      return false;
    }
  }

  if (targetStep >= 3 && (!form.termsAccepted || !form.commissionAccepted)) {
    message.value = "Les validations obligatoires doivent etre cochees.";
    step.value = 3;
    return false;
  }

  return true;
}

function nextStep() {
  if (!validateStep(step.value)) {
    return;
  }

  step.value = Math.min(step.value + 1, steps.length);
}

function previousStep() {
  message.value = "";
  step.value = Math.max(step.value - 1, 1);
}

function goToStep(targetStep) {
  if (targetStep <= step.value || validateStep(targetStep - 1)) {
    step.value = targetStep;
  }
}

async function submitApplication() {
  if (!validateStep(3)) {
    return;
  }

  loading.value = true;
  message.value = "";

  try {
    const response = await $fetch("/api/artists/me", {
      method: "POST",
      credentials: "include",
      body: {
        displayName: form.displayName,
        bio: form.bio,
        artType: form.artType,
        styles: form.styles,
        portfolioUrl: form.portfolioUrl,
        socialHandle: form.socialHandle,
        termsAccepted: form.termsAccepted,
        commissionAccepted: form.commissionAccepted
      }
    });

    draftCompleted.value = true;
    if (draftSaveTimeout) {
      clearTimeout(draftSaveTimeout);
    }
    auth.user = response.user;
    await navigateTo("/artist-profile");
  } catch (error) {
    message.value = error?.data?.message || "Impossible de soumettre le profil artiste.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.field-control {
  min-height: 48px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid #1a1f2a;
  background: #01050e;
  padding: 12px 14px;
  color: #e6edf7;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.field-control:focus {
  border-color: #4a6cf7;
  box-shadow: 0 0 0 3px rgb(74 108 247 / 30%);
}
</style>
