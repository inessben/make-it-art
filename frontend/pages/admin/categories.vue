<template>
  <AdminShell
    title="Categories"
    description="Manage the visuals used for category highlights on the homepage."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadCategories(true)"
      >
        {{ loading ? "Refreshing..." : "Refresh categories" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="min-h-[128px] border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6"
      >
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">{{ card.label }}</p>
        <p class="mt-5 text-title-3 text-slate-100">{{ card.value }}</p>
        <p class="mt-2 text-subtitle-3 text-slate-500">{{ card.description }}</p>
      </article>
    </section>

    <AppStatePanel v-if="successMessage" compact type="success" :message="successMessage" />
    <AppStatePanel v-if="errorMessage" compact type="error" :message="errorMessage" />

    <section class="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="category in categories"
        :key="category.id"
        class="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-slate-950 to-black"
      >
        <div class="aspect-[1.45/1] border-b border-slate-800 bg-slate-900">
          <img
            v-if="category.imageUrl"
            :src="category.imageUrl"
            :alt="`${category.name} category image`"
            class="h-full w-full object-cover"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(123,44,255,0.18),transparent_55%)] px-6 text-center"
          >
            <div>
              <p class="font-geist text-base font-semibold text-slate-100">{{ category.name }}</p>
              <p class="mt-2 text-sm text-slate-500">No homepage image yet</p>
            </div>
          </div>
        </div>

        <div class="grid gap-5 p-6">
          <div>
            <p class="text-title-3 text-slate-100">{{ category.name }}</p>
            <p class="mt-2 text-sm text-slate-400">
              {{ category.artworksCount }} linked artwork(s)
            </p>
          </div>

          <div class="rounded-2xl border border-slate-800 bg-black/40 p-4">
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Selected file</p>
            <p class="mt-2 text-sm text-slate-100">
              {{ selectedFileName(category.id) || "No file selected" }}
            </p>
          </div>

          <input
            :id="`category-image-${category.id}`"
            class="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="onFileSelected(category.id, $event)"
          />

          <div class="grid gap-3 sm:grid-cols-2">
            <label
              :for="`category-image-${category.id}`"
              class="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-750 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
            >
              Choose image
            </label>

            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-2xl bg-violet-700 px-4 text-sm font-semibold text-black transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!selectedFiles[category.id] || Boolean(uploading[category.id])"
              @click="uploadCategoryImage(category)"
            >
              {{ uploading[category.id] ? "Uploading..." : "Save image" }}
            </button>
          </div>

          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-900 bg-red-950/40 px-4 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!category.imageUrl || Boolean(uploading[category.id])"
            @click="removeCategoryImage(category)"
          >
            {{ uploading[category.id] ? "Updating..." : "Remove image" }}
          </button>
        </div>
      </article>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const categories = ref([]);
const summary = ref({
  totalCategories: 0,
  categoriesWithImage: 0,
  totalArtworks: 0
});
const selectedFiles = reactive({});
const uploading = reactive({});

const summaryCards = computed(() => [
  {
    label: "Total categories",
    value: summary.value.totalCategories,
    description: "Predefined categories available across the marketplace."
  },
  {
    label: "With homepage image",
    value: summary.value.categoriesWithImage,
    description: "Categories already configured with a curated visual."
  },
  {
    label: "Linked artworks",
    value: summary.value.totalArtworks,
    description: "Current artwork volume attached to those categories."
  }
]);

onMounted(async () => {
  await loadCategories();
});

function selectedFileName(categoryId) {
  return selectedFiles[categoryId]?.name || "";
}

function onFileSelected(categoryId, event) {
  const [file] = event?.target?.files || [];
  selectedFiles[categoryId] = file || null;
  successMessage.value = "";
  errorMessage.value = "";
}

async function loadCategories(showSuccess = false) {
  loading.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/categories", {
      credentials: "include"
    });

    categories.value = response.categories || [];
    summary.value = response.summary || summary.value;

    if (showSuccess) {
      successMessage.value = "Category visuals refreshed successfully.";
    }
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load admin categories.";
  } finally {
    loading.value = false;
  }
}

async function fetchCsrfToken() {
  const response = await $fetch("/api/v1/security/csrf-token", {
    credentials: "include"
  });

  return response.csrfToken;
}

function replaceCategory(updatedCategory) {
  categories.value = categories.value.map((entry) =>
    entry.id === updatedCategory.id ? updatedCategory : entry
  );

  summary.value = {
    totalCategories: categories.value.length,
    categoriesWithImage: categories.value.filter((entry) => Boolean(entry.imageUrl)).length,
    totalArtworks: categories.value.reduce((total, entry) => total + (entry.artworksCount || 0), 0)
  };
}

async function uploadCategoryImage(category) {
  const file = selectedFiles[category.id];

  if (!file) {
    errorMessage.value = "Choose an image before saving.";
    return;
  }

  uploading[category.id] = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const csrfToken = await fetchCsrfToken();
    const formData = new FormData();
    formData.append("image", file);

    const response = await $fetch(`/api/admin/categories/${category.id}/image`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "x-csrf-token": csrfToken
      },
      body: formData
    });

    replaceCategory(response.category);
    selectedFiles[category.id] = null;
    successMessage.value = response.message || "Category image updated.";
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to update this category image.";
  } finally {
    uploading[category.id] = false;
  }
}

async function removeCategoryImage(category) {
  uploading[category.id] = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const csrfToken = await fetchCsrfToken();
    const formData = new FormData();
    formData.append("removeImage", "true");

    const response = await $fetch(`/api/admin/categories/${category.id}/image`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "x-csrf-token": csrfToken
      },
      body: formData
    });

    replaceCategory(response.category);
    selectedFiles[category.id] = null;
    successMessage.value = response.message || "Category image removed.";
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to remove this category image.";
  } finally {
    uploading[category.id] = false;
  }
}
</script>
