<template>
  <main class="min-h-screen bg-black px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
    <section class="mx-auto grid w-full max-w-[1240px] gap-8">
      <header
        class="rounded-[32px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p class="text-xs uppercase tracking-widest text-violet-400">
              Collections personnelles
            </p>
            <h1
              class="mt-4 text-title-1 text-white"
            >
              Organize your curation
            </h1>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
              Create collections, keep them private when needed, and organize
              artworks for future acquisitions.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <NuxtLink
              to="/wishlist"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
            >
              My wishlist
            </NuxtLink>
            <NuxtLink
              to="/account-settings"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-750 bg-transparent px-6 text-sm font-semibold text-violet-200 transition hover:border-violet-700"
            >
              Back to profile
            </NuxtLink>
          </div>
        </div>

        <div
          v-if="pageMessage"
          class="mt-8 inline-flex rounded-2xl border border-slate-750 bg-slate-850 px-5 py-3 text-sm text-violet-200"
        >
          {{ pageMessage }}
        </div>
      </header>

      <section
        class="grid gap-4 rounded-[28px] border border-slate-800 bg-slate-900 p-6 lg:grid-cols-[1fr_1fr_0.7fr_auto]"
      >
        <label class="grid gap-2 text-sm text-slate-400">
          <span class="font-medium text-slate-100">Title</span>
          <input
            v-model.trim="newCollection.title"
            type="text"
            placeholder="Cyber discoveries"
            class="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-700"
          />
        </label>

        <label class="grid gap-2 text-sm text-slate-400">
          <span class="font-medium text-slate-100">Description</span>
          <input
            v-model.trim="newCollection.description"
            type="text"
            placeholder="My references for future acquisitions"
            class="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-700"
          />
        </label>

        <label
          class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-violet-200"
        >
          <input v-model="newCollection.isPrivate" type="checkbox" />
          <span>Private collection</span>
        </label>

        <button
          type="button"
          class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600"
          :disabled="createLoading"
          @click="createCollection"
        >
          {{ createLoading ? "Creating..." : "Create collection" }}
        </button>
      </section>

      <section
        v-if="pending"
        class="rounded-[28px] border border-slate-800 bg-slate-900 p-8 text-slate-400"
      >
        Loading your collections...
      </section>
      <section
        v-else-if="errorMessage"
        class="rounded-[28px] border border-red-900 bg-red-950 p-8 text-red-200"
      >
        {{ errorMessage }}
      </section>
      <section
        v-else-if="!collections.length"
        class="rounded-[28px] border border-slate-800 bg-slate-900 p-8 text-slate-400"
      >
        No collections yet. Create your first list to organize your favorites.
      </section>
      <section v-else class="grid gap-6">
        <article
          v-for="collection in collections"
          :key="collection.id"
          class="grid gap-6 rounded-[32px] border border-slate-800 bg-slate-900 p-6"
        >
          <div class="grid gap-4 lg:grid-cols-[1fr_1fr_0.7fr_auto]">
            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Title</span>
              <input
                v-model.trim="drafts[collection.id].title"
                type="text"
                class="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-700"
              />
            </label>

            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Description</span>
              <input
                v-model.trim="drafts[collection.id].description"
                type="text"
                class="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-700"
              />
            </label>

            <label
              class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-violet-200"
            >
              <input
                v-model="drafts[collection.id].isPrivate"
                type="checkbox"
              />
              <span>Private collection</span>
            </label>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 px-5 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
                :disabled="Boolean(saveLoading[collection.id])"
                @click="saveCollection(collection.id)"
              >
                {{
                  saveLoading[collection.id] ? "Saving..." : "Save"
                }}
              </button>
              <button
                type="button"
                class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-red-900 bg-red-950 px-5 text-sm font-semibold text-red-200 transition hover:bg-red-950/80"
                :disabled="Boolean(deleteLoading[collection.id])"
                @click="deleteCollection(collection.id)"
              >
                {{
                  deleteLoading[collection.id] ? "Deleting..." : "Delete"
                }}
              </button>
            </div>
          </div>

          <div
            class="grid gap-4 rounded-[28px] border border-slate-800 bg-slate-950 p-5 lg:grid-cols-[1fr_auto]"
          >
            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Add an artwork</span>
              <select
                v-model="drafts[collection.id].selectedArtworkId"
                class="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-700"
              >
                <option value="">Choose an artwork</option>
                <option
                  v-for="artwork in artworkOptions"
                  :key="artwork.id"
                  :value="String(artwork.id)"
                >
                  {{ artwork.title }} -
                  {{ artwork.artist?.displayName || "Artist" }}
                </option>
              </select>
            </label>

            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-700 px-6 text-sm font-semibold text-black transition hover:bg-violet-600"
              :disabled="Boolean(addArtworkLoading[collection.id])"
              @click="addArtwork(collection.id)"
            >
              {{
                addArtworkLoading[collection.id]
                  ? "Adding..."
                  : "Add artwork"
              }}
            </button>
          </div>

          <div v-if="collection.items.length" class="grid gap-4 lg:grid-cols-3">
            <article
              v-for="item in collection.items"
              :key="item.id"
              class="grid gap-4 rounded-[24px] border border-slate-800 bg-slate-950 p-5"
            >
              <div>
                <NuxtLink
                  :to="`/artworks/${item.id}`"
                  class="text-lg font-semibold text-white transition hover:text-violet-200"
                >
                  {{ item.title }}
                </NuxtLink>
                <p class="mt-2 text-sm text-slate-500">
                  {{ item.artist?.displayName || "Artist" }}
                </p>
                <p class="mt-2 text-sm text-slate-400">
                  {{ item.category?.name || "Digital artwork" }}
                </p>
              </div>

              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-750 bg-slate-850 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-750"
                :disabled="
                  Boolean(removeArtworkLoading[`${collection.id}-${item.id}`])
                "
                @click="removeArtwork(collection.id, item.id)"
              >
                {{
                  removeArtworkLoading[`${collection.id}-${item.id}`]
                    ? "Removing..."
                    : "Remove from collection"
                }}
              </button>
            </article>
          </div>
          <div
            v-else
            class="rounded-[24px] border border-dashed border-slate-750 bg-slate-950 p-5 text-sm text-slate-400"
          >
            This collection is empty. Use the selector above to add an artwork.
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watchEffect } from "vue";
import { navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth",
});

const auth = useAuthStore();

if (auth.isAdmin) {
  await navigateTo("/admin");
}

const pageMessage = ref("");
const createLoading = ref(false);
const saveLoading = ref({});
const deleteLoading = ref({});
const addArtworkLoading = ref({});
const removeArtworkLoading = ref({});
const drafts = ref({});
const newCollection = ref({
  title: "",
  description: "",
  isPrivate: false,
});

const { data, pending, error } = await useFetch("/api/collections/me", {
  credentials: "include",
  default: () => ({
    collections: [],
    artworkOptions: [],
  }),
});

const collections = computed(() => data.value?.collections || []);
const artworkOptions = computed(() => data.value?.artworkOptions || []);
const errorMessage = computed(() => error.value?.data?.message || "");

function setLoading(target, key, value) {
  target.value = {
    ...target.value,
    [key]: value,
  };
}

function ensureDraft(collection) {
  if (!drafts.value[collection.id]) {
    drafts.value = {
      ...drafts.value,
      [collection.id]: {
        title: collection.title,
        description: collection.description,
        isPrivate: collection.isPrivate,
        selectedArtworkId: "",
      },
    };
  }
}

function replaceCollection(updatedCollection) {
  data.value = {
    ...(data.value || {}),
    collections: collections.value.map((collection) =>
      collection.id === updatedCollection.id ? updatedCollection : collection,
    ),
  };
  ensureDraft(updatedCollection);
}

watchEffect(() => {
  collections.value.forEach((collection) => {
    ensureDraft(collection);
  });
});

async function createCollection() {
  pageMessage.value = "";

  if (!newCollection.value.title.trim()) {
    pageMessage.value = "The collection title is required.";
    return;
  }

  createLoading.value = true;

  try {
    const response = await $fetch("/api/collections/me", {
      method: "POST",
      credentials: "include",
      body: {
        title: newCollection.value.title,
        description: newCollection.value.description,
        isPrivate: newCollection.value.isPrivate,
      },
    });

    data.value = {
      ...(data.value || {}),
      collections: [response.collection, ...collections.value],
    };
    drafts.value = {
      ...drafts.value,
      [response.collection.id]: {
        title: response.collection.title,
        description: response.collection.description,
        isPrivate: response.collection.isPrivate,
        selectedArtworkId: "",
      },
    };
    newCollection.value = {
      title: "",
      description: "",
      isPrivate: false,
    };
    pageMessage.value = "Collection created.";
  } catch (error) {
    pageMessage.value =
      error?.data?.message || "Unable to create this collection.";
  } finally {
    createLoading.value = false;
  }
}

async function saveCollection(collectionId) {
  pageMessage.value = "";
  const draft = drafts.value[collectionId];

  if (!draft?.title?.trim()) {
    pageMessage.value = "The collection title is required.";
    return;
  }

  setLoading(saveLoading, collectionId, true);

  try {
    const response = await $fetch(`/api/collections/me/${collectionId}`, {
      method: "PATCH",
      credentials: "include",
      body: {
        title: draft.title,
        description: draft.description,
        isPrivate: draft.isPrivate,
      },
    });

    replaceCollection(response.collection);
    pageMessage.value = "Collection updated.";
  } catch (error) {
    pageMessage.value =
      error?.data?.message || "Unable to update this collection.";
  } finally {
    setLoading(saveLoading, collectionId, false);
  }
}

async function deleteCollection(collectionId) {
  pageMessage.value = "";
  setLoading(deleteLoading, collectionId, true);

  try {
    await $fetch(`/api/collections/me/${collectionId}`, {
      method: "DELETE",
      credentials: "include",
    });

    data.value = {
      ...(data.value || {}),
      collections: collections.value.filter(
        (collection) => collection.id !== collectionId,
      ),
    };
    const nextDrafts = {
      ...drafts.value,
    };
    delete nextDrafts[collectionId];
    drafts.value = nextDrafts;
    pageMessage.value = "Collection deleted.";
  } catch (error) {
    pageMessage.value =
      error?.data?.message || "Unable to delete this collection.";
  } finally {
    setLoading(deleteLoading, collectionId, false);
  }
}

async function addArtwork(collectionId) {
  pageMessage.value = "";
  const draft = drafts.value[collectionId];

  if (!draft?.selectedArtworkId) {
    pageMessage.value = "Choose an artwork to add.";
    return;
  }

  setLoading(addArtworkLoading, collectionId, true);

  try {
    const response = await $fetch(
      `/api/collections/me/${collectionId}/artworks`,
      {
        method: "POST",
        credentials: "include",
        body: {
          artworkId: Number(draft.selectedArtworkId),
        },
      },
    );

    replaceCollection(response.collection);
    drafts.value[collectionId].selectedArtworkId = "";
    pageMessage.value = "Artwork added to the collection.";
  } catch (error) {
    pageMessage.value =
      error?.data?.message ||
      "Unable to add this artwork to the collection.";
  } finally {
    setLoading(addArtworkLoading, collectionId, false);
  }
}

async function removeArtwork(collectionId, artworkId) {
  const loadingKey = `${collectionId}-${artworkId}`;
  pageMessage.value = "";
  setLoading(removeArtworkLoading, loadingKey, true);

  try {
    const response = await $fetch(
      `/api/collections/me/${collectionId}/artworks/${artworkId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    replaceCollection(response.collection);
    pageMessage.value = "Artwork removed from the collection.";
  } catch (error) {
    pageMessage.value =
      error?.data?.message ||
      "Unable to remove this artwork from the collection.";
  } finally {
    setLoading(removeArtworkLoading, loadingKey, false);
  }
}
</script>
