<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <header
        class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
            Artist onboarding
          </p>
          <h1
            class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white"
          >
            Deposer votre candidature artiste
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Remplissez votre dossier, lisez le contrat, signez-le puis envoyez
            votre demande a l'administration pour validation.
          </p>
        </div>

        <NuxtLink
          to="/profile"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Retour au profil
        </NuxtLink>
      </header>

      <section
        v-if="pageLoading"
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] px-6 py-5 text-sm text-[#A0ADB4]"
      >
        Chargement de votre candidature...
      </section>

      <section
        v-else-if="pendingApplication"
        class="grid gap-5 rounded-[28px] border border-[#1A1F2A] bg-[#090017] p-7"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
            Demande en cours
          </p>
          <h2 class="mt-4 text-3xl font-semibold text-white">
            Votre contrat signe est en cours d'examen
          </h2>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            L'administration doit maintenant accepter ou refuser votre demande.
            Tant que la revue n'est pas terminee, votre profil artiste reste
            inactif.
          </p>
        </div>

        <dl
          class="grid gap-3 rounded-[24px] border border-[#1A1F2A] bg-[#050916] p-5 text-sm"
        >
          <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt class="text-[#A0ADB4]">Nom d'artiste</dt>
            <dd class="font-semibold text-white">
              {{ pendingApplication.payload?.displayName || "-" }}
            </dd>
          </div>
          <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt class="text-[#A0ADB4]">Statut</dt>
            <dd class="font-semibold text-[#F2C97D]">En cours de validation</dd>
          </div>
          <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt class="text-[#A0ADB4]">Soumis le</dt>
            <dd class="font-semibold text-white">
              {{ formatDate(pendingApplication.submittedAt) }}
            </dd>
          </div>
        </dl>

        <div class="flex flex-wrap gap-3">
          <NuxtLink
            to="/artist-profile"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6d8bff]"
          >
            Voir le suivi
          </NuxtLink>
          <a
            href="/api/artists/me/contract.pdf"
            target="_blank"
            rel="noreferrer"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-6 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
          >
            Ouvrir le contrat PDF
          </a>
        </div>
      </section>

      <template v-else>
        <section
          v-if="rejectedApplication"
          class="rounded-[24px] border border-[#5A2C14] bg-[#28150A] px-6 py-5 text-sm text-[#F7C9A8]"
        >
          <p class="font-semibold text-white">
            Votre precedente demande a ete refusee.
          </p>
          <p class="mt-2 leading-6">
            Corrigez votre dossier, relisez le contrat puis renvoyez une
            nouvelle candidature.
          </p>
          <p
            v-if="rejectedApplication.reviewNote"
            class="mt-3 leading-6 text-[#FFDDBA]"
          >
            Motif admin : {{ rejectedApplication.reviewNote }}
          </p>
        </section>

        <nav
          class="grid gap-3 sm:grid-cols-4"
          aria-label="Progression du formulaire artiste"
        >
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
            <span class="block text-xs uppercase tracking-[0.16em]"
              >Etape {{ item.id }}</span
            >
            <span class="mt-1 block font-semibold">{{ item.label }}</span>
          </button>
        </nav>

        <form class="grid gap-7" @submit.prevent="submitApplication">
          <section v-if="step === 1" class="grid gap-6">
            <div>
              <h2 class="text-xl font-semibold text-white">Identite legale</h2>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                Ces informations seront integrees automatiquement dans le
                contrat artiste.
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
                <span class="font-medium text-[#E6EDF7]">E-mail du compte</span>
                <input
                  :value="user?.email || ''"
                  type="email"
                  class="field-control bg-[#080D18] text-[#7F8A99]"
                  readonly
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4]">
                <span class="font-medium text-[#E6EDF7]">Prenom legal *</span>
                <input
                  v-model.trim="form.firstName"
                  type="text"
                  placeholder="Prenom"
                  class="field-control"
                  autocomplete="given-name"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4]">
                <span class="font-medium text-[#E6EDF7]">Nom legal *</span>
                <input
                  v-model.trim="form.lastName"
                  type="text"
                  placeholder="Nom"
                  class="field-control"
                  autocomplete="family-name"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4] lg:col-span-2">
                <span class="font-medium text-[#E6EDF7]">Adresse legale *</span>
                <input
                  v-model.trim="form.addressLine1"
                  type="text"
                  placeholder="Numero, rue"
                  class="field-control"
                  autocomplete="address-line1"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4] lg:col-span-2">
                <span class="font-medium text-[#E6EDF7]"
                  >Complement d'adresse</span
                >
                <input
                  v-model.trim="form.addressLine2"
                  type="text"
                  placeholder="Appartement, batiment, etc."
                  class="field-control"
                  autocomplete="address-line2"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4]">
                <span class="font-medium text-[#E6EDF7]">Ville *</span>
                <input
                  v-model.trim="form.city"
                  type="text"
                  placeholder="Paris"
                  class="field-control"
                  autocomplete="address-level2"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4]">
                <span class="font-medium text-[#E6EDF7]"
                  >Region / departement</span
                >
                <input
                  v-model.trim="form.region"
                  type="text"
                  placeholder="Ile-de-France"
                  class="field-control"
                  autocomplete="address-level1"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4]">
                <span class="font-medium text-[#E6EDF7]">Code postal *</span>
                <input
                  v-model.trim="form.postalCode"
                  type="text"
                  placeholder="75000"
                  class="field-control"
                  autocomplete="postal-code"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4]">
                <span class="font-medium text-[#E6EDF7]">Pays *</span>
                <input
                  v-model.trim="form.country"
                  type="text"
                  placeholder="France"
                  class="field-control"
                  autocomplete="country-name"
                />
              </label>

              <label class="grid gap-2 text-sm text-[#A0ADB4] lg:col-span-2">
                <span class="font-medium text-[#E6EDF7]">
                  Numero d'identification fiscale *
                </span>
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
              <h2 class="text-xl font-semibold text-white">Profil public</h2>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                Ces elements serviront a presenter votre univers artistique sur
                la plateforme.
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
                <span class="font-medium text-[#E6EDF7]"
                  >Type d'art principal *</span
                >
                <select v-model="form.artType" class="field-control">
                  <option value="">Selectionner un type</option>
                  <option
                    v-for="option in artTypeOptions"
                    :key="option"
                    :value="option"
                  >
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
                <span class="font-medium text-[#E6EDF7]"
                  >Styles / specialites *</span
                >
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
              <span class="font-medium text-[#E6EDF7]"
                >Reseau social principal</span
              >
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
              <h2 class="text-xl font-semibold text-white">
                Validation du dossier
              </h2>
              <p class="mt-2 text-sm text-[#A0ADB4]">
                Verifiez les informations avant d'ouvrir le contrat.
              </p>
            </div>

            <dl
              class="grid gap-3 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-5 text-sm"
            >
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-[#A0ADB4]">Nom legal</dt>
                <dd class="font-semibold text-white">
                  {{ `${form.firstName} ${form.lastName}`.trim() || "-" }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-[#A0ADB4]">Nom d'artiste</dt>
                <dd class="font-semibold text-white">
                  {{ form.displayName || "-" }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-[#A0ADB4]">Adresse</dt>
                <dd class="font-semibold text-white">
                  {{ legalAddressSummary }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-[#A0ADB4]">Type d'art</dt>
                <dd class="font-semibold text-white">
                  {{ form.artType || "-" }}
                </dd>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt class="text-[#A0ADB4]">Styles</dt>
                <dd class="font-semibold text-white">
                  {{ form.styles.join(", ") || "-" }}
                </dd>
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
                <span
                  >J'accepte les conditions et la politique de confidentialite
                  *</span
                >
              </label>

              <label
                class="flex gap-3 rounded-2xl border border-[#1A1F2A] bg-[#050916] p-4 text-sm text-[#A0ADB4]"
              >
                <input
                  v-model="form.commissionAccepted"
                  type="checkbox"
                  class="mt-1 h-4 w-4 accent-[#4A6CF7]"
                />
                <span
                  >Je comprends que Make It Art applique une commission sur les
                  ventes *</span
                >
              </label>
            </div>
          </section>

          <section v-else class="grid gap-6">
            <div
              class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <h2 class="text-xl font-semibold text-white">
                  Contrat artiste
                </h2>
                <p class="mt-2 text-sm text-[#A0ADB4]">
                  Lisez le contrat dynamique, acceptez-le puis signez avant
                  l'envoi.
                </p>
              </div>

              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
                :disabled="contractPreviewLoading"
                @click="ensureContractPreview(true)"
              >
                {{
                  contractPreviewLoading
                    ? "Generation..."
                    : "Rafraichir le contrat"
                }}
              </button>
            </div>

            <div
              v-if="contractPreviewLoading"
              class="rounded-[24px] border border-[#1A1F2A] bg-[#050916] px-5 py-4 text-sm text-[#A0ADB4]"
            >
              Generation du contrat en cours...
            </div>

            <div
              v-else-if="contractPreviewError"
              class="rounded-[24px] border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
            >
              {{ contractPreviewError }}
            </div>

            <div
              v-else
              class="max-h-[520px] overflow-y-auto rounded-[24px] border border-[#1A1F2A] bg-[#050916] p-5"
            >
              <pre
                class="whitespace-pre-wrap font-mono text-[13px] leading-6 text-[#E6EDF7]"
                >{{ contractPreview }}</pre
              >
            </div>

            <div
              class="grid gap-4 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-5"
            >
              <label
                class="flex gap-3 rounded-2xl border border-[#1A1F2A] bg-[#050916] p-4 text-sm text-[#A0ADB4]"
              >
                <input
                  v-model="contractAccepted"
                  type="checkbox"
                  class="mt-1 h-4 w-4 accent-[#4A6CF7]"
                />
                <span>
                  J'ai lu le contrat, j'accepte son contenu et j'autorise Make
                  it Art a le transmettre a l'administration pour decision.
                </span>
              </label>

              <div class="grid gap-3">
                <div>
                  <p class="text-sm font-medium text-[#E6EDF7]">
                    Signature de l'artiste *
                  </p>
                  <p class="mt-1 text-sm text-[#A0ADB4]">
                    Cette signature sera placee en bas du PDF transmis a
                    l'administration.
                  </p>
                </div>

                <SignaturePad v-model="signatureDataUrl" />
              </div>
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

          <footer
            class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
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
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6d8bff] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading || contractPreviewLoading"
              @click="nextStep"
            >
              Suivant
            </button>
            <button
              v-else
              type="submit"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6d8bff] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading || contractPreviewLoading"
            >
              {{ loading ? "Envoi..." : "Envoyer la demande signee" }}
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
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth",
});

const auth = useAuthStore();
const { user } = storeToRefs(auth);

const steps = [
  { id: 1, label: "Identite legale" },
  { id: 2, label: "Profil public" },
  { id: 3, label: "Validations" },
  { id: 4, label: "Contrat & signature" },
];

const artTypeOptions = [
  "Digital Art",
  "Photography",
  "3D Art",
  "Vector Art",
  "Illustration",
  "Graphic Design",
  "Mixed Media",
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
  commissionAccepted: false,
});

const pendingApplication = computed(() =>
  applicationState.value?.status === "pending" ? applicationState.value : null,
);
const rejectedApplication = computed(() =>
  applicationState.value?.status === "rejected" ? applicationState.value : null,
);
const legalAddressSummary = computed(
  () =>
    [
      form.addressLine1,
      form.addressLine2,
      [form.postalCode, form.city].filter(Boolean).join(" "),
      form.region,
      form.country,
    ]
      .filter(Boolean)
      .join(", ") || "-",
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
  { deep: true },
);

watch(step, () => {
  queueDraftSave();
});

function prefillFromUser() {
  const fullName = user.value?.username || "";
  const [firstName = "", ...lastNameParts] = fullName.split(" ");

  form.firstName = firstName;
  form.lastName = lastNameParts.join(" ");
  form.displayName =
    user.value?.artist?.displayName || user.value?.username || "";
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
    commissionAccepted: form.commissionAccepted,
  };
}

function applyDraftPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  form.displayName =
    typeof payload.displayName === "string"
      ? payload.displayName
      : form.displayName;
  form.firstName =
    typeof payload.firstName === "string" ? payload.firstName : form.firstName;
  form.lastName =
    typeof payload.lastName === "string" ? payload.lastName : form.lastName;
  form.bio = typeof payload.bio === "string" ? payload.bio : form.bio;
  form.artType =
    typeof payload.artType === "string" ? payload.artType : form.artType;
  form.styles = Array.isArray(payload.styles) ? payload.styles : form.styles;
  form.portfolioUrl =
    typeof payload.portfolioUrl === "string"
      ? payload.portfolioUrl
      : form.portfolioUrl;
  form.socialHandle =
    typeof payload.socialHandle === "string"
      ? payload.socialHandle
      : form.socialHandle;
  form.addressLine1 =
    typeof payload.addressLine1 === "string"
      ? payload.addressLine1
      : form.addressLine1;
  form.addressLine2 =
    typeof payload.addressLine2 === "string"
      ? payload.addressLine2
      : form.addressLine2;
  form.city = typeof payload.city === "string" ? payload.city : form.city;
  form.region =
    typeof payload.region === "string" ? payload.region : form.region;
  form.postalCode =
    typeof payload.postalCode === "string"
      ? payload.postalCode
      : form.postalCode;
  form.country =
    typeof payload.country === "string" ? payload.country : form.country;
  form.taxId = typeof payload.taxId === "string" ? payload.taxId : form.taxId;
  form.termsAccepted = Boolean(payload.termsAccepted);
  form.commissionAccepted = Boolean(payload.commissionAccepted);
}

async function loadArtistState() {
  try {
    const response = await $fetch("/api/artists/me", {
      credentials: "include",
    });

    applicationState.value = response.application;
  } catch {
    applicationState.value = null;
  }
}

async function loadApplicationDraft() {
  try {
    const response = await $fetch("/api/artists/me/application-draft", {
      credentials: "include",
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
      step.value = Math.min(
        Math.max(Number(draft.currentStep || 1), 1),
        steps.length,
      );
    }

    draftStatusMessage.value = "Brouillon restaure.";
  } catch {
    draftStatusMessage.value = "Brouillon indisponible pour le moment.";
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

  draftStatusMessage.value = "Sauvegarde du brouillon...";

  try {
    await $fetch("/api/artists/me/application-draft", {
      method: "PATCH",
      credentials: "include",
      body: {
        currentStep: step.value,
        payload: buildDraftPayload(),
      },
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

  if (targetStep >= 1) {
    if (!form.displayName.trim()) {
      message.value = "Le nom d'artiste est requis.";
      step.value = 1;
      return false;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      message.value = "Le prenom et le nom legal sont requis.";
      step.value = 1;
      return false;
    }

    if (
      !form.addressLine1.trim() ||
      !form.city.trim() ||
      !form.postalCode.trim() ||
      !form.country.trim()
    ) {
      message.value = "L'adresse legale complete est requise.";
      step.value = 1;
      return false;
    }

    if (!form.taxId.trim()) {
      message.value = "Le numero d'identification fiscale est requis.";
      step.value = 1;
      return false;
    }
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

  if (targetStep >= 4) {
    if (!contractAccepted.value) {
      message.value = "Vous devez accepter le contrat avant l'envoi.";
      step.value = 4;
      return false;
    }

    if (!signatureDataUrl.value) {
      message.value = "La signature de l'artiste est requise.";
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
      body: buildDraftPayload(),
    });

    contractPreview.value = response.contractText || "";
    contractPreviewDirty.value = false;
    return true;
  } catch (error) {
    contractPreviewError.value =
      error?.data?.message || "Impossible de generer l'aperu du contrat.";
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
        signatureDataUrl: signatureDataUrl.value,
      },
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
      error?.data?.details ||
      error?.data?.message ||
      "Impossible de soumettre la candidature artiste.";
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
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
