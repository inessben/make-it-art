<template>
  <div class="grid gap-8">
    <section
      class="grid gap-4 rounded-[28px] border border-[#151E30] bg-[#070B14] p-6 lg:grid-cols-[1fr_1fr_0.7fr_auto]"
    >
      <label class="grid gap-2 text-sm text-[#9EABBE]">
        <span class="font-medium text-[#E6EDF7]">Titre</span>
        <input
          v-model.trim="newCollection.title"
          type="text"
          placeholder="Cyber discoveries"
          class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
        />
      </label>

      <label class="grid gap-2 text-sm text-[#9EABBE]">
        <span class="font-medium text-[#E6EDF7]">Description</span>
        <input
          v-model.trim="newCollection.description"
          type="text"
          placeholder="Mes reperes pour de futures acquisitions"
          class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
        />
      </label>

      <label
        class="flex items-center gap-3 rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-sm text-[#D7E3FF]"
      >
        <input v-model="newCollection.isPrivate" type="checkbox" />
        <span>Collection privee</span>
      </label>

      <button
        type="button"
        class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
        :disabled="createLoading"
        @click="createCollection"
      >
        {{ createLoading ? "Creation..." : "Creer la collection" }}
      </button>
    </section>

    <section
      v-if="pending"
      class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
    >
      Chargement de vos collections...
    </section>
    <section
      v-else-if="errorMessage"
      class="rounded-[28px] border border-[#6C1F2D] bg-[#261018] p-8 text-[#FBC8D0]"
    >
      {{ errorMessage }}
    </section>
    <section
      v-else-if="!customCollections.length"
      class="rounded-[28px] border border-[#151E30] bg-[#070B14] p-8 text-[#96A4B8]"
    >
      Aucune collection personnelle pour le moment. Cree ta premiere liste pour structurer tes coups
      de coeur. Les favoris restent disponibles dans l'onglet Favoris.
    </section>
    <section v-else class="grid gap-6">
      <article
        v-for="collection in customCollections"
        :key="collection.id"
        class="grid gap-6 rounded-[32px] border border-[#151E30] bg-[#070B14] p-6"
      >
        <div class="grid gap-4 lg:grid-cols-[1fr_1fr_0.7fr_auto]">
          <label class="grid gap-2 text-sm text-[#9EABBE]">
            <span class="font-medium text-[#E6EDF7]">Titre</span>
            <input
              v-model.trim="drafts[collection.id].title"
              type="text"
              class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            />
          </label>

          <label class="grid gap-2 text-sm text-[#9EABBE]">
            <span class="font-medium text-[#E6EDF7]">Description</span>
            <input
              v-model.trim="drafts[collection.id].description"
              type="text"
              class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            />
          </label>

          <label
            class="flex items-center gap-3 rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-sm text-[#D7E3FF]"
          >
            <input v-model="drafts[collection.id].isPrivate" type="checkbox" />
            <span>Collection privee</span>
          </label>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
              :disabled="Boolean(saveLoading[collection.id])"
              @click="saveCollection(collection.id)"
            >
              {{ saveLoading[collection.id] ? "Sauvegarde..." : "Sauvegarder" }}
            </button>
            <button
              type="button"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#6C1F2D] bg-[#1D0B10] px-5 text-sm font-semibold text-[#FBC8D0] transition hover:bg-[#2A1218]"
              :disabled="Boolean(deleteLoading[collection.id])"
              @click="deleteCollection(collection.id)"
            >
              {{ deleteLoading[collection.id] ? "Suppression..." : "Supprimer" }}
            </button>
          </div>
        </div>

        <div
          class="grid gap-4 rounded-[28px] border border-[#151E30] bg-[#050912] p-5 lg:grid-cols-[1fr_auto]"
        >
          <label class="grid gap-2 text-sm text-[#9EABBE]">
            <span class="font-medium text-[#E6EDF7]">Ajouter une oeuvre</span>
            <select
              v-model="drafts[collection.id].selectedArtworkId"
              class="rounded-2xl border border-[#1A2336] bg-[#03060D] px-4 py-3 text-[#E6EDF7] outline-none transition focus:border-[#4A6CF7]"
            >
              <option value="">Choisir une oeuvre</option>
              <option
                v-for="artwork in artworkOptions"
                :key="artwork.id"
                :value="String(artwork.id)"
              >
                {{ artwork.title }} -
                {{ artwork.artist?.displayName || "Artiste" }}
              </option>
            </select>
          </label>

          <button
            type="button"
            class="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#4A6CF7] px-6 text-sm font-semibold text-black transition hover:bg-[#6D8BFF]"
            :disabled="Boolean(addArtworkLoading[collection.id])"
            @click="addArtwork(collection.id)"
          >
            {{ addArtworkLoading[collection.id] ? "Ajout..." : "Ajouter l'oeuvre" }}
          </button>
        </div>

        <div v-if="collection.items.length" class="grid gap-4 lg:grid-cols-3">
          <article
            v-for="item in collection.items"
            :key="item.id"
            class="grid gap-4 rounded-[24px] border border-[#151E30] bg-[#050912] p-5"
          >
            <div>
              <NuxtLink
                :to="`/artworks/${item.id}`"
                class="text-lg font-semibold text-white transition hover:text-[#D2DEFF]"
              >
                {{ item.title }}
              </NuxtLink>
              <p class="mt-2 text-sm text-[#8D9BB2]">
                {{ item.artist?.displayName || "Artiste" }}
              </p>
              <p class="mt-2 text-sm text-[#A4B0C0]">
                {{ item.category?.name || "Oeuvre numerique" }}
              </p>
            </div>

            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#24314F] bg-[#0C111D] px-4 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#141C2E]"
              :disabled="Boolean(removeArtworkLoading[`${collection.id}-${item.id}`])"
              @click="removeArtwork(collection.id, item.id)"
            >
              {{
                removeArtworkLoading[`${collection.id}-${item.id}`]
                  ? "Retrait..."
                  : "Retirer de la collection"
              }}
            </button>
          </article>
        </div>
        <div
          v-else
          class="rounded-[24px] border border-dashed border-[#1F2A44] bg-[#040811] p-5 text-sm text-[#96A4B8]"
        >
          Cette collection est encore vide. Utilise le select ci-dessus pour y ajouter une oeuvre.
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watchEffect } from "vue";

const pageMessage = defineModel("pageMessage", {
  type: String,
  default: ""
});

const createLoading = ref(false);
const saveLoading = ref({});
const deleteLoading = ref({});
const addArtworkLoading = ref({});
const removeArtworkLoading = ref({});
const drafts = ref({});
const newCollection = ref({
  title: "",
  description: "",
  isPrivate: false
});

const { data, pending, error } = await useFetch("/api/collections/me", {
  credentials: "include",
  default: () => ({
    collections: [],
    artworkOptions: []
  })
});

const collections = computed(() => data.value?.collections || []);
const customCollections = computed(() =>
  collections.value.filter((collection) => !collection.isDefaultFavorites)
);
const artworkOptions = computed(() => data.value?.artworkOptions || []);
const errorMessage = computed(() => error.value?.data?.message || "");

function setLoading(target, key, value) {
  target.value = {
    ...target.value,
    [key]: value
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
        selectedArtworkId: ""
      }
    };
  }
}

function replaceCollection(updatedCollection) {
  data.value = {
    ...(data.value || {}),
    collections: collections.value.map((collection) =>
      collection.id === updatedCollection.id ? updatedCollection : collection
    )
  };
  ensureDraft(updatedCollection);
}

watchEffect(() => {
  customCollections.value.forEach((collection) => {
    ensureDraft(collection);
  });
});

async function createCollection() {
  pageMessage.value = "";

  if (!newCollection.value.title.trim()) {
    pageMessage.value = "Le titre de la collection est requis.";
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
        isPrivate: newCollection.value.isPrivate
      }
    });

    data.value = {
      ...(data.value || {}),
      collections: [response.collection, ...collections.value]
    };
    drafts.value = {
      ...drafts.value,
      [response.collection.id]: {
        title: response.collection.title,
        description: response.collection.description,
        isPrivate: response.collection.isPrivate,
        selectedArtworkId: ""
      }
    };
    newCollection.value = {
      title: "",
      description: "",
      isPrivate: false
    };
    pageMessage.value = "Collection creee.";
  } catch (fetchError) {
    pageMessage.value = fetchError?.data?.message || "Impossible de creer cette collection.";
  } finally {
    createLoading.value = false;
  }
}

async function saveCollection(collectionId) {
  pageMessage.value = "";
  const draft = drafts.value[collectionId];

  if (!draft?.title?.trim()) {
    pageMessage.value = "Le titre de la collection est requis.";
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
        isPrivate: draft.isPrivate
      }
    });

    replaceCollection(response.collection);
    pageMessage.value = "Collection mise a jour.";
  } catch (fetchError) {
    pageMessage.value =
      fetchError?.data?.message || "Impossible de mettre a jour cette collection.";
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
      credentials: "include"
    });

    data.value = {
      ...(data.value || {}),
      collections: collections.value.filter((collection) => collection.id !== collectionId)
    };
    const nextDrafts = {
      ...drafts.value
    };
    delete nextDrafts[collectionId];
    drafts.value = nextDrafts;
    pageMessage.value = "Collection supprimee.";
  } catch (fetchError) {
    pageMessage.value = fetchError?.data?.message || "Impossible de supprimer cette collection.";
  } finally {
    setLoading(deleteLoading, collectionId, false);
  }
}

async function addArtwork(collectionId) {
  pageMessage.value = "";
  const draft = drafts.value[collectionId];

  if (!draft?.selectedArtworkId) {
    pageMessage.value = "Choisis une oeuvre a ajouter.";
    return;
  }

  setLoading(addArtworkLoading, collectionId, true);

  try {
    const response = await $fetch(`/api/collections/me/${collectionId}/artworks`, {
      method: "POST",
      credentials: "include",
      body: {
        artworkId: Number(draft.selectedArtworkId)
      }
    });

    replaceCollection(response.collection);
    drafts.value[collectionId].selectedArtworkId = "";
    pageMessage.value = "Oeuvre ajoutee a la collection.";
  } catch (fetchError) {
    pageMessage.value =
      fetchError?.data?.message || "Impossible d'ajouter cette oeuvre a la collection.";
  } finally {
    setLoading(addArtworkLoading, collectionId, false);
  }
}

async function removeArtwork(collectionId, artworkId) {
  const loadingKey = `${collectionId}-${artworkId}`;
  pageMessage.value = "";
  setLoading(removeArtworkLoading, loadingKey, true);

  try {
    const response = await $fetch(`/api/collections/me/${collectionId}/artworks/${artworkId}`, {
      method: "DELETE",
      credentials: "include"
    });

    replaceCollection(response.collection);
    pageMessage.value = "Oeuvre retiree de la collection.";
  } catch (fetchError) {
    pageMessage.value =
      fetchError?.data?.message || "Impossible de retirer cette oeuvre de la collection.";
  } finally {
    setLoading(removeArtworkLoading, loadingKey, false);
  }
}
</script>
