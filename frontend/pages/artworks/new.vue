<template>
  <main class="min-h-screen bg-[#02040A] px-4 py-8 text-[#E6EDF7] sm:px-6 lg:px-8">
    <section class="mx-auto grid w-full max-w-[1320px] gap-8 xl:grid-cols-[minmax(0,1.2fr)_380px]">
      <div class="space-y-8">
        <header
          class="overflow-hidden rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.18),_transparent_32%),linear-gradient(180deg,_#070B14,_#04070D)] p-7 sm:p-8 lg:p-10"
        >
          <div class="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div class="max-w-[760px]">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#8AA2FF]">
                Artist workspace
              </p>
              <h1
                class="mt-4 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-white"
              >
                Publish a new artwork
              </h1>
              <p class="mt-4 max-w-3xl text-sm leading-7 text-[#96A4B8] sm:text-[0.95rem]">
                Upload your original master file, define the licence terms and release the piece to
                your public portfolio. The platform automatically generates a protected public
                preview while keeping the HD source reserved for you and your verified buyers.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3 xl:max-w-[430px]">
              <article
                v-for="step in publicationSteps"
                :key="step.title"
                class="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
              >
                <p class="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
                  {{ step.eyebrow }}
                </p>
                <p class="mt-3 text-sm font-semibold text-white">{{ step.title }}</p>
                <p class="mt-2 text-xs leading-6 text-[#96A4B8]">
                  {{ step.copy }}
                </p>
              </article>
            </div>
          </div>
        </header>

        <form
          class="overflow-hidden rounded-[32px] border border-[#151E30] bg-[#070B14]"
          @submit.prevent="submitArtwork"
        >
          <section class="border-b border-[#141B2B] px-6 py-7 sm:px-8 sm:py-8">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
                  01 Upload
                </p>
                <h2 class="mt-3 text-[1.5rem] font-semibold text-white">Artwork master file</h2>
                <p class="mt-2 max-w-2xl text-sm leading-7 text-[#96A4B8]">
                  Use a clean source image. Supported formats: JPG, PNG, WEBP or GIF. Maximum file
                  size: 25 MB.
                </p>
              </div>

              <span
                class="inline-flex min-h-10 items-center rounded-full border border-[#28407A] bg-[#081121] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#BDD0FF]"
              >
                HD source protected
              </span>
            </div>

            <div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <label
                class="grid cursor-pointer gap-4 rounded-[28px] border border-dashed border-[#253251] bg-[#03060D] p-5 transition hover:border-[#4A6CF7]"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="sr-only"
                  @change="handleFileChange"
                />

                <div
                  v-if="previewUrl"
                  class="overflow-hidden rounded-[24px] border border-[#1A2336] bg-[#050912]"
                >
                  <img
                    :src="previewUrl"
                    alt="Selected artwork preview"
                    class="max-h-[520px] w-full object-contain"
                  />
                </div>

                <div
                  v-else
                  class="grid min-h-[300px] place-items-center rounded-[24px] border border-[#1A2336] bg-[radial-gradient(circle_at_top,_rgba(74,108,247,0.14),_transparent_35%),linear-gradient(180deg,_#050912,_#03050A)] px-6 text-center"
                >
                  <div class="max-w-md">
                    <div
                      class="mx-auto grid h-16 w-16 place-items-center rounded-[20px] border border-[#24314F] bg-[#0B101A] text-2xl font-semibold text-[#C9D6FF]"
                    >
                      +
                    </div>
                    <p class="mt-5 text-base font-semibold text-white">
                      Drag your file here or click to browse
                    </p>
                    <p class="mt-2 text-sm leading-7 text-[#96A4B8]">
                      We will build the public preview, preserve your HD source and attach download
                      rights to future confirmed orders.
                    </p>
                  </div>
                </div>

                <div
                  class="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#12192A] bg-[#060A12] px-4 py-3"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-white">
                      {{ selectedFile?.name || "No file selected yet" }}
                    </p>
                    <p class="mt-1 text-xs uppercase tracking-[0.14em] text-[#7E8AA3]">
                      {{ selectedFile ? formatBytes(selectedFile.size) : "Ready for upload" }}
                    </p>
                  </div>
                  <span class="text-xs uppercase tracking-[0.14em] text-[#8AA2FF]">
                    Public preview generated automatically
                  </span>
                </div>
              </label>

              <div class="grid gap-3 self-start">
                <button
                  type="button"
                  class="inline-flex min-h-12 items-center justify-center rounded-[18px] bg-[#7B2CFF] px-5 text-sm font-semibold text-white transition hover:bg-[#8D47FF]"
                  @click="openFilePicker"
                >
                  Choose image
                </button>
                <button
                  v-if="selectedFile"
                  type="button"
                  class="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-[#24314F] bg-[#0C111D] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:border-[#4A6CF7] hover:bg-[#141C2E]"
                  @click="clearSelectedFile"
                >
                  Remove selection
                </button>

                <article class="rounded-[22px] border border-[#151E30] bg-[#050912] p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
                    Upload notes
                  </p>
                  <ul class="mt-3 grid gap-2 text-sm leading-6 text-[#96A4B8]">
                    <li v-for="note in uploadNotes" :key="note" class="flex gap-2">
                      <span class="mt-[0.42rem] h-1.5 w-1.5 rounded-full bg-[#7B2CFF]" />
                      <span>{{ note }}</span>
                    </li>
                  </ul>
                </article>
              </div>
            </div>
          </section>

          <section class="border-b border-[#141B2B] px-6 py-7 sm:px-8 sm:py-8">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">02 Info</p>
            <h2 class="mt-3 text-[1.5rem] font-semibold text-white">Artwork details</h2>
            <p class="mt-2 max-w-2xl text-sm leading-7 text-[#96A4B8]">
              Describe the piece clearly so collectors understand what they are purchasing and how
              the work fits into your catalog.
            </p>

            <div class="mt-6 grid gap-6 lg:grid-cols-2">
              <label class="grid gap-2 text-sm text-[#9EABBE] lg:col-span-2">
                <span class="font-medium text-[#E6EDF7]">Title *</span>
                <input
                  v-model.trim="form.title"
                  type="text"
                  maxlength="160"
                  placeholder="Example: Neon Bloom 01"
                  class="rounded-[18px] border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
                  required
                />
              </label>

              <label class="grid gap-2 text-sm text-[#9EABBE]">
                <span class="font-medium text-[#E6EDF7]">Category *</span>
                <select
                  v-model="form.categoryId"
                  class="rounded-[18px] border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
                  required
                >
                  <option value="" disabled>Select a category</option>
                  <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="String(category.id)"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </label>

              <label class="grid gap-2 text-sm text-[#9EABBE]">
                <span class="font-medium text-[#E6EDF7]">Price *</span>
                <input
                  v-model.trim="form.price"
                  type="text"
                  inputmode="decimal"
                  placeholder="20"
                  class="rounded-[18px] border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
                  required
                />
              </label>

              <label class="grid gap-2 text-sm text-[#9EABBE] lg:col-span-2">
                <span class="font-medium text-[#E6EDF7]">
                  Description{{ descriptionRequired ? " *" : "" }}
                </span>
                <textarea
                  v-model.trim="form.description"
                  rows="6"
                  maxlength="4000"
                  :placeholder="
                    descriptionRequired
                      ? 'Describe the allowed commercial use, restrictions, territory, duration or support limitations...'
                      : 'Describe the visual world, technique, inspiration or story behind this piece...'
                  "
                  class="rounded-[18px] border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
                  :required="descriptionRequired"
                  :aria-required="descriptionRequired"
                />
                <span v-if="descriptionRequired" class="leading-6 text-[#8AA2FF]">
                  Commercial licences require clear usage terms for the buyer.
                </span>
              </label>
            </div>
          </section>

          <section class="border-b border-[#141B2B] px-6 py-7 sm:px-8 sm:py-8">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
              03 Rights
            </p>
            <h2 class="mt-3 text-[1.5rem] font-semibold text-white">Licence and protection</h2>
            <p class="mt-2 max-w-2xl text-sm leading-7 text-[#96A4B8]">
              Choose the access level you want to grant to the collector after purchase.
            </p>

            <fieldset class="mt-6 grid gap-3 text-sm text-[#9EABBE]">
              <legend class="sr-only">Artwork licence type</legend>
              <label
                v-for="license in licenseOptions"
                :key="license.value"
                class="flex cursor-pointer gap-4 rounded-[22px] border bg-[#03060D] px-4 py-4 transition sm:px-5"
                :class="
                  form.licenseType === license.value
                    ? 'border-[#7B2CFF] bg-[linear-gradient(180deg,rgba(123,44,255,0.12),rgba(5,8,15,0.92))] ring-1 ring-[#7B2CFF]/35'
                    : 'border-[#1A2336] hover:border-[#24314F]'
                "
              >
                <input v-model="form.licenseType" type="radio" :value="license.value" required />
                <span class="grid gap-1">
                  <strong class="font-semibold text-[#E6EDF7]">{{ license.label }}</strong>
                  <span class="leading-6 text-[#96A4B8]">{{ license.description }}</span>
                </span>
              </label>
            </fieldset>

            <label
              class="mt-5 flex items-start gap-3 rounded-[22px] border border-[#1A2336] bg-[#03060D] px-4 py-4 text-sm text-[#D7E3FF] sm:px-5"
            >
              <input v-model="form.protection" type="checkbox" class="mt-1" />
              <span>
                Enable reinforced AI protection for this artwork. Public previews are already
                watermarked by default, and this adds a stronger collector-facing protection badge.
              </span>
            </label>
          </section>

          <section class="px-6 py-7 sm:px-8 sm:py-8">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
              04 Release
            </p>
            <h2 class="mt-3 text-[1.5rem] font-semibold text-white">Publish to your catalog</h2>
            <p class="mt-2 max-w-2xl text-sm leading-7 text-[#96A4B8]">
              Once submitted, the artwork is prepared for public discovery and connected to your
              artist workspace.
            </p>

            <div
              v-if="formMessage"
              class="mt-6 rounded-[20px] border px-5 py-4 text-sm"
              :class="
                formError
                  ? 'border-[#6C1F2D] bg-[#261018] text-[#FBC8D0]'
                  : 'border-[#203357] bg-[#091121] text-[#BFD0FF]'
              "
            >
              {{ formMessage }}
            </div>

            <div class="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                class="inline-flex min-h-12 items-center justify-center rounded-[18px] bg-[#7B2CFF] px-6 text-sm font-semibold text-white transition hover:bg-[#8D47FF] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="submitting || categoriesLoading"
              >
                {{ submitting ? "Publishing..." : "Publish artwork" }}
              </button>
              <NuxtLink
                to="/artist"
                class="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-[#24314F] bg-transparent px-6 text-sm font-semibold text-[#C9D6FF] transition hover:border-[#4A6CF7]"
              >
                Back to artist workspace
              </NuxtLink>
            </div>
          </section>
        </form>
      </div>

      <aside class="space-y-6 xl:sticky xl:top-28 xl:self-start">
        <section class="overflow-hidden rounded-[32px] border border-[#151E30] bg-[#070B14]">
          <div class="border-b border-[#141B2B] px-6 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
              Live preview
            </p>
            <h2 class="mt-3 text-[1.35rem] font-semibold text-white">
              {{ form.title || "Untitled artwork" }}
            </h2>
            <p class="mt-2 text-sm text-[#96A4B8]">
              {{ selectedCategoryLabel || "Choose a category to complete the card." }}
            </p>
          </div>

          <div class="px-6 py-6">
            <div
              class="overflow-hidden rounded-[24px] border border-[#1A2336] bg-[radial-gradient(circle_at_top,_rgba(123,44,255,0.16),_transparent_38%),linear-gradient(180deg,_#050912,_#03050A)]"
            >
              <img
                v-if="previewUrl"
                :src="previewUrl"
                alt="Artwork live preview"
                class="max-h-[360px] w-full object-contain"
              />
              <div
                v-else
                class="grid min-h-[280px] place-items-center px-6 text-center text-sm leading-7 text-[#96A4B8]"
              >
                Your uploaded artwork will appear here instantly before publication.
              </div>
            </div>

            <dl class="mt-5 grid gap-3">
              <div
                class="flex items-center justify-between gap-4 rounded-[18px] bg-[#050912] px-4 py-3"
              >
                <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8AA3]">
                  Price
                </dt>
                <dd class="text-sm font-semibold text-white">{{ formattedPricePreview }}</dd>
              </div>
              <div
                class="flex items-center justify-between gap-4 rounded-[18px] bg-[#050912] px-4 py-3"
              >
                <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8AA3]">
                  Licence
                </dt>
                <dd class="text-sm font-semibold text-white">{{ selectedLicenseLabel }}</dd>
              </div>
              <div
                class="flex items-center justify-between gap-4 rounded-[18px] bg-[#050912] px-4 py-3"
              >
                <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8AA3]">
                  Protection
                </dt>
                <dd class="text-sm font-semibold text-white">
                  {{ form.protection ? "Enhanced" : "Standard" }}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="rounded-[32px] border border-[#151E30] bg-[#070B14] px-6 py-6">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
            Publishing rules
          </p>
          <ul class="mt-4 grid gap-3 text-sm leading-7 text-[#96A4B8]">
            <li v-for="rule in publishingRules" :key="rule" class="flex gap-3">
              <span class="mt-[0.55rem] h-1.5 w-1.5 rounded-full bg-[#7B2CFF]" />
              <span>{{ rule }}</span>
            </li>
          </ul>
        </section>

        <section class="rounded-[32px] border border-[#151E30] bg-[#070B14] px-6 py-6">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#8AA2FF]">
            Commercial note
          </p>
          <p class="mt-4 text-sm leading-7 text-[#96A4B8]">
            If you select a commercial licence, specify the exact usage rights in the description:
            channels, formats, duration, territory and any exclusions.
          </p>
        </section>
      </aside>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";
import { formatMarketplacePrice, isArtworkDescriptionRequired } from "~/utils/marketplace";

definePageMeta({
  middleware: ["auth", "artist"]
});

const publicationSteps = Object.freeze([
  {
    eyebrow: "File",
    title: "Upload the master",
    copy: "Start from the original image you want to protect and sell."
  },
  {
    eyebrow: "Rights",
    title: "Set the licence",
    copy: "Choose personal, commercial or exclusive collector access."
  },
  {
    eyebrow: "Release",
    title: "Go live",
    copy: "The piece is published to your artist catalog after submission."
  }
]);

const uploadNotes = Object.freeze([
  "The HD source remains private and is not shown in the public catalog.",
  "A protected preview is generated automatically for storefront use.",
  "Only you and eligible buyers can access the original download later."
]);

const publishingRules = Object.freeze([
  "Use artwork you own or have the right to distribute.",
  "Titles and descriptions should match the actual content of the file.",
  "Exclusive licences should only be used when you want a single buyer."
]);

const licenseOptions = Object.freeze([
  {
    value: "PERSONAL",
    label: "Personal licence",
    description: "The collector can use the artwork for private and non-commercial purposes."
  },
  {
    value: "COMMERCIAL",
    label: "Commercial licence",
    description:
      "The collector can use the artwork professionally. You must describe the allowed commercial scope in the artwork description."
  },
  {
    value: "EXCLUSIVE",
    label: "Exclusive licence",
    description: "Only one collector will be able to purchase this artwork."
  }
]);

const categories = ref([]);
const auth = useAuthStore();
const categoriesLoading = ref(true);
const submitting = ref(false);
const formMessage = ref("");
const formError = ref(false);
const fileInput = ref(null);
const selectedFile = ref(null);
const previewUrl = ref("");

const form = reactive({
  title: "",
  description: "",
  categoryId: "",
  price: "",
  licenseType: "",
  protection: false
});

const descriptionRequired = computed(() => isArtworkDescriptionRequired(form.licenseType));
const selectedCategoryLabel = computed(
  () => categories.value.find((category) => String(category.id) === form.categoryId)?.name || ""
);
const selectedLicense = computed(
  () => licenseOptions.find((license) => license.value === form.licenseType) || null
);
const selectedLicenseLabel = computed(() => selectedLicense.value?.label || "Not selected");
const formattedPricePreview = computed(() => {
  const value = String(form.price || "").trim();
  return value ? formatMarketplacePrice(value) : "Price not set";
});

function openFilePicker() {
  fileInput.value?.click();
}

function revokePreviewUrl() {
  if (previewUrl.value) {
    if (previewUrl.value.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = "";
  }
}

function readPreviewImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Preview data is unavailable."));
    };

    reader.onerror = () => {
      reject(reader.error || new Error("Unable to load image preview."));
    };

    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes) {
  const numericValue = Number(bytes);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "0 MB";
  }

  if (numericValue < 1024 * 1024) {
    return `${(numericValue / 1024).toFixed(1)} KB`;
  }

  return `${(numericValue / (1024 * 1024)).toFixed(1)} MB`;
}

function clearSelectedFile() {
  revokePreviewUrl();
  selectedFile.value = null;

  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

async function handleFileChange(event) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) {
    clearSelectedFile();
    return;
  }

  revokePreviewUrl();
  selectedFile.value = file;

  try {
    previewUrl.value = await readPreviewImageAsDataUrl(file);
  } catch {
    clearSelectedFile();
    formError.value = true;
    formMessage.value = "Unable to generate a local preview for this image.";
    return;
  }

  input.value = "";
}

onMounted(async () => {
  try {
    const response = await $fetch("/api/categories", {
      credentials: "include"
    });

    categories.value = response.categories || [];
  } catch {
    categories.value = [];
    formError.value = true;
    formMessage.value = "Unable to load artwork categories.";
  } finally {
    categoriesLoading.value = false;
  }
});

onBeforeUnmount(() => {
  revokePreviewUrl();
});

async function submitArtwork() {
  formMessage.value = "";
  formError.value = false;

  if (!selectedFile.value) {
    formError.value = true;
    formMessage.value = "Please add an artwork image before publishing.";
    return;
  }

  if (descriptionRequired.value && !form.description) {
    formError.value = true;
    formMessage.value =
      "Please describe the commercial usage terms inside the artwork description.";
    return;
  }

  submitting.value = true;

  try {
    // The access cookie expires after 15 minutes, while preparing an artwork can take longer.
    // Reuse the refresh-cookie flow before uploading so the protected route does not reject a
    // still signed-in artist with "Not authenticated".
    await auth.fetchCurrentUser();

    const formData = new FormData();
    formData.append("image", selectedFile.value);
    formData.append("title", form.title);
    formData.append("categoryId", form.categoryId);
    formData.append("price", form.price);
    formData.append("licenseType", form.licenseType);
    formData.append("protection", String(form.protection));

    if (form.description) {
      formData.append("description", form.description);
    }

    const response = await $fetch("/api/artists/me/artworks", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    formMessage.value = response.message || "Artwork published successfully.";

    if (response.artwork?.id) {
      await navigateTo(`/artworks/${response.artwork.id}`);
    }
  } catch (error) {
    formError.value = true;
    formMessage.value =
      Number(error?.statusCode ?? error?.status) === 401
        ? "Your session expired. Please sign in again and retry the publication."
        : error?.data?.message || "Unable to publish this artwork.";
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
