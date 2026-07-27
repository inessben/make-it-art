<template>
  <main class="min-h-screen bg-[#02040A] px-6 py-10 text-[#E6EDF7]">
    <section class="mx-auto grid w-full max-w-[860px] gap-8">
      <header
        class="rounded-[32px] border border-[#151E30] bg-[radial-gradient(circle_at_top_left,_rgba(74,108,247,0.16),_transparent_30%),linear-gradient(180deg,_#070B14,_#04070D)] p-8"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#8AA2FF]">Espace artiste</p>
        <h1 class="mt-4 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[0.98] text-white">
          Publier une oeuvre
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-[#96A4B8]">
          Dépose le visuel HD de ton œuvre. Le serveur génère automatiquement un aperçu public
          filigrané pour le catalogue. Le fichier HD reste séparé et n'est téléchargeable que par
          toi et tes acheteurs. JPG, PNG, WEBP ou GIF · 25 Mo max.
        </p>
      </header>

      <form
        class="grid gap-6 rounded-[28px] border border-[#151E30] bg-[#070B14] p-8"
        @submit.prevent="submitArtwork"
      >
        <div class="grid gap-4">
          <span class="text-sm font-medium text-[#E6EDF7]">Visuel de l'oeuvre *</span>
          <label
            class="grid cursor-pointer gap-4 rounded-[24px] border border-dashed border-[#24314F] bg-[#03060D] p-6 transition hover:border-[#4A6CF7]"
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
              class="overflow-hidden rounded-[20px] border border-[#1A2336] bg-[#050912]"
            >
              <img
                :src="previewUrl"
                alt="Aperçu de l'oeuvre"
                class="max-h-[420px] w-full object-contain"
              />
              <p class="border-t border-[#1A2336] px-4 py-3 text-sm text-[#96A4B8]">
                Aperçu · {{ selectedFile?.name || "image sélectionnée" }}
              </p>
            </div>

            <div
              v-else
              class="grid min-h-[220px] place-items-center rounded-[20px] border border-[#1A2336] bg-[#050912] px-6 text-center"
            >
              <div>
                <p class="text-sm font-semibold text-white">
                  Glisse une image ou clique pour parcourir
                </p>
                <p class="mt-2 text-sm text-[#96A4B8]">
                  JPG, PNG, WEBP ou GIF · 25 Mo max · HD conservé
                </p>
              </div>
            </div>
          </label>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#4A6CF7] px-5 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
              @click="openFilePicker"
            >
              Choisir une image
            </button>
            <button
              v-if="selectedFile"
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
              @click="clearSelectedFile"
            >
              Retirer
            </button>
          </div>
        </div>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Titre *</span>
          <input
            v-model.trim="form.title"
            type="text"
            maxlength="160"
            placeholder="Nom de l'oeuvre"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            required
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Categorie *</span>
          <select
            v-model="form.categoryId"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            required
          >
            <option value="" disabled>Choisir une categorie</option>
            <option v-for="category in categories" :key="category.id" :value="String(category.id)">
              {{ category.name }}
            </option>
          </select>
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Description</span>
          <textarea
            v-model.trim="form.description"
            rows="5"
            maxlength="4000"
            placeholder="Decris ton univers, ta technique ou l'histoire de cette oeuvre..."
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
          />
        </label>

        <label class="grid gap-2 text-sm text-[#9EABBE]">
          <span class="font-medium text-[#E6EDF7]">Prix *</span>
          <input
            v-model.trim="form.price"
            type="text"
            placeholder="120 tokens"
            class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            required
          />
        </label>

        <label
          class="flex items-center gap-3 rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-sm text-[#D7E3FF]"
        >
          <input v-model="form.protection" type="checkbox" />
          <span>
            Signaler la protection anti-IA (filigrane, métadonnées et accès contrôlé déjà
            appliqués à toutes les œuvres)
          </span>
        </label>

        <div
          v-if="formMessage"
          class="rounded-2xl border px-5 py-4 text-sm"
          :class="
            formError
              ? 'border-[#6C1F2D] bg-[#261018] text-[#FBC8D0]'
              : 'border-[#203357] bg-[#091121] text-[#BFD0FF]'
          "
        >
          {{ formMessage }}
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="submit"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting || categoriesLoading"
          >
            {{ submitting ? "Publication..." : "Publier l'oeuvre" }}
          </button>
          <NuxtLink
            to="/artist-profile"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-transparent px-6 text-sm font-semibold text-[#C9D6FF] transition hover:border-[#4A6CF7]"
          >
            Retour au profil artiste
          </NuxtLink>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: ["auth", "artist"]
});

const categories = ref([]);
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
  protection: false
});

function openFilePicker() {
  fileInput.value?.click();
}

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
}

function clearSelectedFile() {
  revokePreviewUrl();
  selectedFile.value = null;

  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function handleFileChange(event) {
  const file = event.target.files?.[0];

  if (!file) {
    clearSelectedFile();
    return;
  }

  // Ne pas vider l'input ici: ça peut relancer un change vide et effacer l'aperçu.
  revokePreviewUrl();
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
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
    formMessage.value = "Impossible de charger les categories.";
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
    formMessage.value = "Ajoute une image pour publier ton oeuvre.";
    return;
  }

  submitting.value = true;

  try {
    const formData = new FormData();
    formData.append("image", selectedFile.value);
    formData.append("title", form.title);
    formData.append("categoryId", form.categoryId);
    formData.append("price", form.price);
    formData.append("protection", String(form.protection));

    if (form.description) {
      formData.append("description", form.description);
    }

    const response = await $fetch("/api/artists/me/artworks", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    formMessage.value = response.message || "Oeuvre publiee avec succes.";

    if (response.artwork?.id) {
      await navigateTo(`/artworks/${response.artwork.id}`);
    }
  } catch (error) {
    formError.value = true;
    formMessage.value = error?.data?.message || "Impossible de publier cette oeuvre.";
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
