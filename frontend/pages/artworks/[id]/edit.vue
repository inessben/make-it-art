<template>
  <main class="min-h-screen bg-[#02040A] px-6 py-10 text-[#E6EDF7]">
    <section class="mx-auto grid w-full max-w-[860px] gap-8">
      <header
        class="rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.16),_transparent_30%),linear-gradient(180deg,_#070B14,_#04070D)] p-8"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Espace artiste</p>
        <h1 class="mt-4 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[0.98] text-white">
          Modifier l’œuvre
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-[#96A4B8]">
          Les changements sont autorisés uniquement tant qu’aucun achat ni paiement n’est lié à
          l’œuvre. Un nouveau visuel est facultatif.
        </p>
      </header>

      <AppStatePanel
        v-if="loading"
        type="loading"
        title="Chargement de l’œuvre"
        message="Préparation du formulaire d’édition."
      />

      <AppStatePanel
        v-else-if="loadError"
        type="error"
        title="Modification impossible"
        :message="loadError"
        action-label="Retour à la fiche"
        @action="navigateTo(`/artworks/${route.params.id}`)"
      />

      <section v-else-if="!canEdit" class="rounded-[28px] border border-[#5B4A1A] bg-[#2B220E] p-8">
        <h2 class="text-xl font-semibold text-white">Cette œuvre ne peut pas être modifiée</h2>
        <p class="mt-3 text-sm leading-7 text-[#F7D990]">{{ editBlockedReason }}</p>
        <NuxtLink
          :to="`/artworks/${route.params.id}`"
          class="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#806C31] px-6 text-sm font-semibold text-white"
        >
          Retour à la fiche
        </NuxtLink>
      </section>

      <form
        v-else
        class="grid gap-6 rounded-[28px] border border-[#151E30] bg-[#070B14] p-8"
        @submit.prevent="submitArtwork"
      >
        <div class="grid gap-4">
          <span class="text-sm font-medium text-[#E6EDF7]">Visuel de l’œuvre</span>
          <div class="overflow-hidden rounded-[20px] border border-[#1A2336] bg-[#050912]">
            <img
              v-if="displayedPreviewUrl"
              :src="displayedPreviewUrl"
              alt="Aperçu actuel de l’œuvre"
              class="max-h-[420px] w-full object-contain"
            />
            <div v-else class="grid min-h-[180px] place-items-center text-sm text-[#96A4B8]">
              Aucun aperçu disponible
            </div>
          </div>
          <label
            class="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:border-[#4A6CF7]"
          >
            Choisir un nouveau visuel
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="sr-only"
              @change="handleFileChange"
            />
          </label>
          <button
            v-if="selectedFile"
            type="button"
            class="justify-self-start text-sm font-semibold text-[#F7D990] underline"
            @click="clearSelectedFile"
          >
            Conserver le visuel actuel
          </button>
        </div>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Titre *</span>
          <input
            v-model.trim="form.title"
            type="text"
            maxlength="160"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            required
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Catégorie *</span>
          <select
            v-model="form.categoryId"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            required
          >
            <option value="" disabled>Choisir une catégorie</option>
            <option v-for="category in categories" :key="category.id" :value="String(category.id)">
              {{ category.name }}
            </option>
          </select>
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">
            Description{{ descriptionRequired ? " *" : "" }}
          </span>
          <textarea
            v-model.trim="form.description"
            rows="6"
            maxlength="4000"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            :required="descriptionRequired"
          />
          <span v-if="descriptionRequired" class="leading-6 text-[#8AA2FF]">
            Décris les conditions d’utilisation commerciale.
          </span>
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Prix en EUR *</span>
          <input
            v-model.trim="form.price"
            type="text"
            inputmode="decimal"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            required
          />
        </label>

        <fieldset class="grid gap-3 text-sm text-[#9EABBE]">
          <legend class="font-medium text-[#E6EDF7]">Type de licence *</legend>
          <label
            v-for="license in licenseOptions"
            :key="license.value"
            class="flex cursor-pointer gap-3 rounded-2xl border bg-[#03060D] px-4 py-4 transition"
            :class="
              form.licenseType === license.value
                ? 'border-[#4A6CF7] ring-1 ring-[#4A6CF7]/40'
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
          class="flex items-center gap-3 rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-sm text-[#D7E3FF]"
        >
          <input v-model="form.protection" type="checkbox" />
          <span>Activer la protection de l’œuvre</span>
        </label>

        <p
          v-if="formMessage"
          :role="formError ? 'alert' : 'status'"
          class="rounded-2xl border px-5 py-4 text-sm"
          :class="
            formError
              ? 'border-[#6C1F2D] bg-[#261018] text-[#FBC8D0]'
              : 'border-[#203357] bg-[#091121] text-[#BFD0FF]'
          "
        >
          {{ formMessage }}
        </p>

        <div class="flex flex-wrap gap-3">
          <button
            type="submit"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting"
          >
            {{ submitting ? "Enregistrement..." : "Enregistrer les modifications" }}
          </button>
          <NuxtLink
            :to="`/artworks/${route.params.id}`"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] px-6 text-sm font-semibold text-[#C9D6FF]"
          >
            Annuler
          </NuxtLink>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { navigateTo, useRoute } from "#app";
import {
  ARTWORK_LICENSE_OPTIONS,
  formatArtworkManagementReason,
  isArtworkDescriptionRequired
} from "~/utils/marketplace";

definePageMeta({
  middleware: ["auth", "artist"]
});

const route = useRoute();
const artwork = ref(null);
const categories = ref([]);
const loading = ref(true);
const loadError = ref("");
const submitting = ref(false);
const formMessage = ref("");
const formError = ref(false);
const selectedFile = ref(null);
const localPreviewUrl = ref("");
const fileInput = ref(null);
const licenseOptions = ARTWORK_LICENSE_OPTIONS;
const form = reactive({
  title: "",
  description: "",
  categoryId: "",
  price: "",
  licenseType: "",
  protection: false
});

const canEdit = computed(() => Boolean(artwork.value?.management?.capabilities?.canEdit));
const editBlockedReason = computed(() =>
  formatArtworkManagementReason(artwork.value?.management?.capabilities?.reasons?.edit)
);
const descriptionRequired = computed(() => isArtworkDescriptionRequired(form.licenseType));
const displayedPreviewUrl = computed(
  () => localPreviewUrl.value || artwork.value?.previewUrl || artwork.value?.imageUrl || ""
);

function revokeLocalPreview() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = "";
  }
}

function clearSelectedFile() {
  revokeLocalPreview();
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

function handleFileChange(event) {
  const file = event.target.files?.[0] || null;
  clearSelectedFile();
  if (!file) return;
  selectedFile.value = file;
  localPreviewUrl.value = URL.createObjectURL(file);
}

function populateForm(source) {
  form.title = source.title || "";
  form.description = source.description || "";
  form.categoryId = source.category?.id ? String(source.category.id) : "";
  form.price = Number.isFinite(Number(source.priceValue))
    ? String(source.priceValue)
    : source.price || "";
  form.licenseType = source.licenseType || "";
  form.protection = Boolean(source.protection);
}

onMounted(async () => {
  try {
    const [artworkResponse, categoryResponse] = await Promise.all([
      $fetch(`/api/artists/me/artworks/${route.params.id}`, { credentials: "include" }),
      $fetch("/api/categories", { credentials: "include" })
    ]);
    artwork.value = artworkResponse.artwork;
    categories.value = categoryResponse.categories || [];
    populateForm(artwork.value);
  } catch (error) {
    loadError.value = error?.data?.message || "Impossible de charger cette œuvre.";
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(revokeLocalPreview);

async function submitArtwork() {
  formMessage.value = "";
  formError.value = false;

  if (descriptionRequired.value && !form.description) {
    formError.value = true;
    formMessage.value = "Ajoute les conditions d’utilisation commerciale dans la description.";
    return;
  }

  submitting.value = true;

  try {
    const csrf = await $fetch("/api/v1/security/csrf-token", { credentials: "include" });
    const body = new FormData();
    body.append("title", form.title);
    body.append("description", form.description);
    body.append("categoryId", form.categoryId);
    body.append("price", form.price);
    body.append("licenseType", form.licenseType);
    body.append("protection", String(form.protection));
    body.append("expectedVersion", String(artwork.value.management.lifecycle.version));
    if (selectedFile.value) body.append("image", selectedFile.value);

    const response = await $fetch(`/api/artists/me/artworks/${route.params.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "x-csrf-token": csrf.csrfToken },
      body
    });

    formMessage.value = response.message || "Œuvre mise à jour.";
    artwork.value = response.artwork;
    await navigateTo(`/artworks/${route.params.id}`);
  } catch (error) {
    formError.value = true;
    formMessage.value = error?.data?.message || "Impossible de mettre à jour cette œuvre.";
  } finally {
    submitting.value = false;
  }
}
</script>
