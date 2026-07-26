<template>
  <main class="min-h-screen bg-black px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_32px_90px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-7"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-widest text-violet-700">Artist onboarding</p>
          <h1 class="mt-4 text-title-2 text-white">Submit your artist application</h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            Complete your application, review and sign the agreement, then submit it to the
            administration for approval.
          </p>
        </div>

        <NuxtLink
          to="/account-settings"
          class="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
        >
          Back to account
        </NuxtLink>
      </header>

      <section
        v-if="pageLoading"
        class="rounded-[24px] border border-slate-800 bg-violet-950 px-6 py-5 text-sm text-slate-400"
      >
        Loading your application...
      </section>

      <section
        v-else-if="pendingApplication"
        class="grid gap-5 rounded-[28px] border border-slate-800 bg-violet-950 p-7"
      >
        <div>
          <p class="text-xs uppercase tracking-widest text-violet-700">Application under review</p>
          <h2 class="mt-4 text-3xl font-semibold text-white">
            Your signed agreement is being reviewed
          </h2>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            The administration will approve or reject your application. Your artist profile remains
            inactive until the review is complete.
          </p>
        </div>

        <dl class="grid gap-3 rounded-[24px] border border-slate-800 bg-slate-950 p-5 text-sm">
          <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt class="text-slate-400">Artist name</dt>
            <dd class="font-semibold text-white">
              {{ pendingApplication.payload?.displayName || "-" }}
            </dd>
          </div>
          <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt class="text-slate-400">Status</dt>
            <dd class="font-semibold text-amber-300">Under review</dd>
          </div>
          <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt class="text-slate-400">Submitted on</dt>
            <dd class="font-semibold text-white">
              {{ formatDate(pendingApplication.submittedAt) }}
            </dd>
          </div>
        </dl>

        <div class="flex flex-wrap gap-3">
          <NuxtLink
            to="/artist-profile"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600"
          >
            View application status
          </NuxtLink>
          <a
            href="/api/artists/me/contract.pdf"
            target="_blank"
            rel="noreferrer"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
          >
            Open PDF agreement
          </a>
        </div>
      </section>

      <template v-else>
        <section
          v-if="rejectedApplication"
          class="rounded-[24px] border border-amber-900 bg-amber-950 px-6 py-5 text-sm text-amber-200"
        >
          <p class="font-semibold text-white">Your previous application was rejected.</p>
          <p class="mt-2 leading-6">
            Update your application, review the agreement and submit a new version.
          </p>
          <p v-if="rejectedApplication.reviewNote" class="mt-3 leading-6 text-amber-100">
            Admin reason: {{ rejectedApplication.reviewNote }}
          </p>
        </section>

        <nav class="grid gap-3 sm:grid-cols-4" aria-label="Artist application progress">
          <button
            v-for="item in steps"
            :key="item.id"
            type="button"
            class="min-h-14 rounded-2xl border px-4 py-3 text-left text-sm transition"
            :class="
              item.id === step
                ? 'border-violet-700 bg-violet-700/15 text-white'
                : item.id < step
                  ? 'border-slate-800 bg-slate-850 text-slate-100'
                  : 'border-slate-800 bg-slate-950 text-slate-500'
            "
            @click="goToStep(item.id)"
          >
            <span class="block text-xs uppercase tracking-widest">Step {{ item.id }}</span>
            <span class="mt-1 block font-semibold">{{ item.label }}</span>
          </button>
        </nav>

        <form class="grid gap-7" @submit.prevent="submitApplication">
          <section v-if="step === 1" class="grid gap-6">
            <div>
              <h2 class="text-xl font-semibold text-white">Legal identity</h2>
              <p class="mt-2 text-sm text-slate-400">
                This information will be included automatically in the artist agreement.
              </p>
            </div>

            <div class="grid gap-5 lg:grid-cols-2">
              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Artist name *</span>
                <input
                  v-model.trim="form.displayName"
                  type="text"
                  placeholder="Your public alias"
                  class="field-control"
                  autocomplete="nickname"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Account email</span>
                <input
                  :value="user?.email || ''"
                  type="email"
                  class="field-control bg-slate-900 text-slate-500"
                  readonly
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Legal first name *</span>
                <input
                  v-model.trim="form.firstName"
                  type="text"
                  placeholder="First name"
                  class="field-control"
                  autocomplete="given-name"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Legal last name *</span>
                <input
                  v-model.trim="form.lastName"
                  type="text"
                  placeholder="Last name"
                  class="field-control"
                  autocomplete="family-name"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400 lg:col-span-2">
                <span class="font-medium text-slate-100">Legal address *</span>
                <input
                  v-model.trim="form.addressLine1"
                  type="text"
                  placeholder="Street and number"
                  class="field-control"
                  autocomplete="address-line1"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400 lg:col-span-2">
                <span class="font-medium text-slate-100">Address line 2</span>
                <input
                  v-model.trim="form.addressLine2"
                  type="text"
                  placeholder="Apartment, building, etc."
                  class="field-control"
                  autocomplete="address-line2"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">City *</span>
                <input
                  v-model.trim="form.city"
                  type="text"
                  placeholder="Paris"
                  class="field-control"
                  autocomplete="address-level2"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Region / State</span>
                <input
                  v-model.trim="form.region"
                  type="text"
                  placeholder="California"
                  class="field-control"
                  autocomplete="address-level1"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Postal code *</span>
                <input
                  v-model.trim="form.postalCode"
                  type="text"
                  placeholder="75000"
                  class="field-control"
                  autocomplete="postal-code"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Country *</span>
                <input
                  v-model.trim="form.country"
                  type="text"
                  placeholder="United States"
                  class="field-control"
                  autocomplete="country-name"
                />
              </label>

              <label class="grid gap-2 text-sm text-slate-400 lg:col-span-2">
                <span class="font-medium text-slate-100"> Tax identification number * </span>
                <input
                  v-model.trim="form.taxId"
                  type="text"
                  placeholder="SIREN, VAT, EIN, etc."
                  class="field-control"
                />
              </label>
            </div>
          </section>

          <section v-else-if="step === 2" class="grid gap-6">
            <div>
              <h2 class="text-xl font-semibold text-white">Public profile</h2>
              <p class="mt-2 text-sm text-slate-400">
                These details will introduce your creative universe on the platform.
              </p>
            </div>

            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Artist bio *</span>
              <textarea
                v-model.trim="form.bio"
                rows="5"
                placeholder="Describe your creative universe, inspirations and artistic approach."
                class="field-control min-h-36 resize-y"
              />
            </label>

            <div class="grid gap-5 lg:grid-cols-2">
              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Primary art type *</span>
                <select v-model="form.artType" class="field-control">
                  <option value="">Select a type</option>
                  <option v-for="option in artTypeOptions" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </label>

              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Portfolio</span>
                <input
                  v-model.trim="form.portfolioUrl"
                  type="url"
                  placeholder="https://portfolio.example"
                  class="field-control"
                />
              </label>
            </div>

            <div class="grid gap-3">
              <label class="grid gap-2 text-sm text-slate-400">
                <span class="font-medium text-slate-100">Styles / specialties *</span>
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
                    class="inline-flex min-h-12 items-center justify-center rounded-xl border border-violet-700 px-5 text-sm font-semibold text-slate-100 transition hover:bg-violet-700/15"
                    @click="addStyle"
                  >
                    Add
                  </button>
                </span>
              </label>

              <div v-if="form.styles.length" class="flex flex-wrap gap-2">
                <button
                  v-for="style in form.styles"
                  :key="style"
                  type="button"
                  class="rounded-full bg-violet-700/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-700/20"
                  @click="removeStyle(style)"
                >
                  {{ style }}
                </button>
              </div>
            </div>

            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Primary social network</span>
              <input
                v-model.trim="form.socialHandle"
                type="text"
                placeholder="@username"
                class="field-control"
              />
            </label>
          </section>

          <section v-else-if="step === 3" class="grid gap-6">
            <div>
              <h2 class="text-xl font-semibold text-white">Application review</h2>
              <p class="mt-2 text-sm text-slate-400">
                Review your information before opening the agreement.
              </p>
            </div>

            <dl class="grid gap-3 rounded-[24px] border border-slate-800 bg-violet-950 p-5 text-sm">
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-slate-400">Legal name</dt>
                <dd class="font-semibold text-white">
                  {{ `${form.firstName} ${form.lastName}`.trim() || "-" }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-slate-400">Artist name</dt>
                <dd class="font-semibold text-white">
                  {{ form.displayName || "-" }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-slate-400">Address</dt>
                <dd class="font-semibold text-white">
                  {{ legalAddressSummary }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-slate-400">Art type</dt>
                <dd class="font-semibold text-white">
                  {{ form.artType || "-" }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-slate-400">Styles</dt>
                <dd class="font-semibold text-white">
                  {{ form.styles.join(", ") || "-" }}
                </dd>
              </div>
              <div class="grid gap-1">
                <dt class="text-slate-400">Bio</dt>
                <dd class="leading-6 text-white">{{ form.bio || "-" }}</dd>
              </div>
            </dl>

            <div class="grid gap-4">
              <label
                class="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400"
              >
                <input
                  v-model="form.termsAccepted"
                  type="checkbox"
                  class="mt-1 h-4 w-4 accent-violet-700"
                />
                <span>I accept the terms and privacy policy *</span>
              </label>

              <label
                class="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400"
              >
                <input
                  v-model="form.commissionAccepted"
                  type="checkbox"
                  class="mt-1 h-4 w-4 accent-violet-700"
                />
                <span>I understand that Make It Art charges a commission on sales *</span>
              </label>
            </div>
          </section>

          <section v-else class="grid gap-6">
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 class="text-xl font-semibold text-white">Artist agreement</h2>
                <p class="mt-2 text-sm text-slate-400">
                  Review the generated agreement, accept it and sign before submitting.
                </p>
              </div>

              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-5 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
                :disabled="contractPreviewLoading"
                @click="ensureContractPreview(true)"
              >
                {{ contractPreviewLoading ? "Generating..." : "Refresh agreement" }}
              </button>
            </div>

            <div
              v-if="contractPreviewLoading"
              class="rounded-[24px] border border-slate-800 bg-slate-950 px-5 py-4 text-sm text-slate-400"
            >
              Generating agreement...
            </div>

            <div
              v-else-if="contractPreviewError"
              class="rounded-[24px] border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
            >
              {{ contractPreviewError }}
            </div>

            <div
              v-else
              class="max-h-[520px] overflow-y-auto rounded-[24px] border border-slate-800 bg-slate-950 p-5"
            >
              <pre class="whitespace-pre-wrap font-mono text-subtitle-2 leading-6 text-slate-100">{{
                contractPreview
              }}</pre>
            </div>

            <div class="grid gap-4 rounded-[24px] border border-slate-800 bg-violet-950 p-5">
              <label
                class="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400"
              >
                <input
                  v-model="contractAccepted"
                  type="checkbox"
                  class="mt-1 h-4 w-4 accent-violet-700"
                />
                <span>
                  I have read and accepted the agreement and authorize Make It Art to submit it to
                  the administration for review.
                </span>
              </label>

              <div class="grid gap-3">
                <div>
                  <p class="text-sm font-medium text-slate-100">Artist signature *</p>
                  <p class="mt-1 text-sm text-slate-400">
                    This signature will be added to the PDF submitted to the administration.
                  </p>
                </div>

                <SignaturePad v-model="signatureDataUrl" />
              </div>
            </div>
          </section>

          <div
            v-if="message"
            class="rounded-2xl border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
          >
            {{ message }}
          </div>

          <p class="min-h-5 text-sm text-slate-500">
            {{ draftStatusMessage }}
          </p>

          <footer
            class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-850 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-750 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="step === 1 || loading"
              @click="previousStep"
            >
              Previous
            </button>

            <button
              v-if="step < steps.length"
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading || contractPreviewLoading"
              @click="nextStep"
            >
              Next
            </button>
            <button
              v-else
              type="submit"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading || contractPreviewLoading"
            >
              {{ loading ? "Submitting..." : "Submit signed application" }}
            </button>
          </footer>
        </form>
      </template>
    </section>
  </main>
</template>

<script setup>
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth"
});

const auth = useAuthStore();
const { user } = storeToRefs(auth);

const steps = [
  { id: 1, label: "Legal identity" },
  { id: 2, label: "Public profile" },
  { id: 3, label: "Validations" },
  { id: 4, label: "Agreement & signature" }
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
const pageLoading = ref(true);
const draftLoaded = ref(false);
const draftCompleted = ref(false);
const draftStatusMessage = ref("");
const contractPreview = ref("");
const contractPreviewLoading = ref(false);
const contractPreviewError = ref("");
const contractPreviewDirty = ref(true);
const contractAccepted = ref(false);
const signatureDataUrl = ref("");
const applicationState = ref(null);
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
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "France",
  taxId: "",
  termsAccepted: false,
  commissionAccepted: false
});

const pendingApplication = computed(() =>
  applicationState.value?.status === "pending" ? applicationState.value : null
);
const rejectedApplication = computed(() =>
  applicationState.value?.status === "rejected" ? applicationState.value : null
);
const legalAddressSummary = computed(
  () =>
    [
      form.addressLine1,
      form.addressLine2,
      [form.postalCode, form.city].filter(Boolean).join(" "),
      form.region,
      form.country
    ]
      .filter(Boolean)
      .join(", ") || "-"
);

onMounted(async () => {
  prefillFromUser();
  await loadArtistState();

  if (auth.isArtist) {
    await navigateTo("/artist-profile");
    return;
  }

  if (!pendingApplication.value) {
    await loadApplicationDraft();
  }

  draftLoaded.value = true;
  pageLoading.value = false;
});

onBeforeUnmount(() => {
  if (draftSaveTimeout) {
    clearTimeout(draftSaveTimeout);
  }
});

watch(
  form,
  () => {
    contractPreviewDirty.value = true;
    queueDraftSave();
  },
  { deep: true }
);

watch(step, () => {
  queueDraftSave();
});

function prefillFromUser() {
  const fullName = user.value?.username || "";
  const [firstName = "", ...lastNameParts] = fullName.split(" ");

  form.firstName = firstName;
  form.lastName = lastNameParts.join(" ");
  form.displayName = user.value?.artist?.displayName || user.value?.username || "";
  form.bio = user.value?.bio || "";
}

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
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2,
    city: form.city,
    region: form.region,
    postalCode: form.postalCode,
    country: form.country,
    taxId: form.taxId,
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
  form.addressLine1 =
    typeof payload.addressLine1 === "string" ? payload.addressLine1 : form.addressLine1;
  form.addressLine2 =
    typeof payload.addressLine2 === "string" ? payload.addressLine2 : form.addressLine2;
  form.city = typeof payload.city === "string" ? payload.city : form.city;
  form.region = typeof payload.region === "string" ? payload.region : form.region;
  form.postalCode = typeof payload.postalCode === "string" ? payload.postalCode : form.postalCode;
  form.country = typeof payload.country === "string" ? payload.country : form.country;
  form.taxId = typeof payload.taxId === "string" ? payload.taxId : form.taxId;
  form.termsAccepted = Boolean(payload.termsAccepted);
  form.commissionAccepted = Boolean(payload.commissionAccepted);
}

async function loadArtistState() {
  try {
    const response = await $fetch("/api/artists/me", {
      credentials: "include"
    });

    applicationState.value = response.application;
  } catch {
    applicationState.value = null;
  }
}

async function loadApplicationDraft() {
  try {
    const response = await $fetch("/api/artists/me/application-draft", {
      credentials: "include"
    });
    const draft = response.draft;

    if (!draft) {
      return;
    }

    if (draft.payload) {
      applyDraftPayload(draft.payload);
    }

    if (draft.status === "rejected") {
      applicationState.value = draft;
    }

    if (draft.status !== "pending" && draft.status !== "approved") {
      step.value = Math.min(Math.max(Number(draft.currentStep || 1), 1), steps.length);
    }

    draftStatusMessage.value = "Draft restored.";
  } catch {
    draftStatusMessage.value = "Draft unavailable at the moment.";
  }
}

function queueDraftSave() {
  if (!draftLoaded.value || draftCompleted.value || pendingApplication.value) {
    return;
  }

  if (draftSaveTimeout) {
    clearTimeout(draftSaveTimeout);
  }

  draftSaveTimeout = setTimeout(saveApplicationDraft, 700);
}

async function saveApplicationDraft() {
  if (draftCompleted.value || pendingApplication.value) {
    return;
  }

  draftStatusMessage.value = "Saving draft...";

  try {
    await $fetch("/api/artists/me/application-draft", {
      method: "PATCH",
      credentials: "include",
      body: {
        currentStep: step.value,
        payload: buildDraftPayload()
      }
    });

    draftStatusMessage.value = "Draft saved.";
  } catch {
    draftStatusMessage.value = "Unable to save the draft.";
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

  if (targetStep >= 1) {
    if (!form.displayName.trim()) {
      message.value = "Artist name is required.";
      step.value = 1;
      return false;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      message.value = "Legal first and last names are required.";
      step.value = 1;
      return false;
    }

    if (
      !form.addressLine1.trim() ||
      !form.city.trim() ||
      !form.postalCode.trim() ||
      !form.country.trim()
    ) {
      message.value = "A complete legal address is required.";
      step.value = 1;
      return false;
    }

    if (!form.taxId.trim()) {
      message.value = "A tax identification number is required.";
      step.value = 1;
      return false;
    }
  }

  if (targetStep >= 2) {
    if (!form.bio.trim()) {
      message.value = "Artist bio is required.";
      step.value = 2;
      return false;
    }

    if (!form.artType) {
      message.value = "A primary art type is required.";
      step.value = 2;
      return false;
    }

    if (form.styles.length === 0) {
      message.value = "Add at least one style or specialty.";
      step.value = 2;
      return false;
    }
  }

  if (targetStep >= 3 && (!form.termsAccepted || !form.commissionAccepted)) {
    message.value = "All required confirmations must be checked.";
    step.value = 3;
    return false;
  }

  if (targetStep >= 4) {
    if (!contractAccepted.value) {
      message.value = "You must accept the agreement before submitting.";
      step.value = 4;
      return false;
    }

    if (!signatureDataUrl.value) {
      message.value = "Artist signature is required.";
      step.value = 4;
      return false;
    }
  }

  return true;
}

async function ensureContractPreview(force = false) {
  if (!force && !contractPreviewDirty.value && contractPreview.value) {
    return true;
  }

  contractPreviewLoading.value = true;
  contractPreviewError.value = "";

  try {
    const response = await $fetch("/api/artists/me/contract-preview", {
      method: "POST",
      credentials: "include",
      body: buildDraftPayload()
    });

    contractPreview.value = response.contractText || "";
    contractPreviewDirty.value = false;
    return true;
  } catch (error) {
    contractPreviewError.value =
      error?.data?.message || "Unable to generate the agreement preview.";
    return false;
  } finally {
    contractPreviewLoading.value = false;
  }
}

async function nextStep() {
  if (!validateStep(step.value)) {
    return;
  }

  const targetStep = Math.min(step.value + 1, steps.length);

  if (targetStep === 4) {
    const previewReady = await ensureContractPreview();

    if (!previewReady) {
      message.value = contractPreviewError.value;
      return;
    }
  }

  step.value = targetStep;
}

function previousStep() {
  message.value = "";
  step.value = Math.max(step.value - 1, 1);
}

async function goToStep(targetStep) {
  if (targetStep <= step.value) {
    step.value = targetStep;
    return;
  }

  if (!validateStep(targetStep - 1)) {
    return;
  }

  if (targetStep === 4) {
    const previewReady = await ensureContractPreview();

    if (!previewReady) {
      message.value = contractPreviewError.value;
      return;
    }
  }

  step.value = targetStep;
}

async function submitApplication() {
  if (!validateStep(4)) {
    return;
  }

  const previewReady = await ensureContractPreview();

  if (!previewReady) {
    message.value = contractPreviewError.value;
    return;
  }

  loading.value = true;
  message.value = "";

  try {
    const response = await $fetch("/api/artists/me", {
      method: "POST",
      credentials: "include",
      body: {
        ...buildDraftPayload(),
        contractAccepted: contractAccepted.value,
        signatureDataUrl: signatureDataUrl.value
      }
    });

    draftCompleted.value = true;
    if (draftSaveTimeout) {
      clearTimeout(draftSaveTimeout);
    }

    applicationState.value = response.application;
    auth.user = response.user;
    await navigateTo("/artist-profile");
  } catch (error) {
    message.value =
      error?.data?.details || error?.data?.message || "Unable to submit the artist application.";
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}
</script>

<style scoped>
.field-control {
  @apply min-h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-3 text-slate-100 outline-none;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.field-control:focus {
  @apply border-violet-700;
  box-shadow: 0 0 0 3px color-mix(in srgb, theme("colors.violet.700") 30%, transparent);
}
</style>
