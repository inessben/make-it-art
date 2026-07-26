<template>
  <AdminShell
    title="Artists"
    description="Explore real artist profiles, verification state and linked activity."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadArtists(true)"
      >
        {{ loading ? "Refreshing..." : "Refresh artists" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <article
        v-for="summaryCard in summaries"
        :key="summaryCard.label"
        class="min-h-[128px] border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6"
      >
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
          {{ summaryCard.label }}
        </p>
        <p class="mt-5 text-title-3 text-slate-100">
          {{ summaryCard.value }}
        </p>
        <p class="mt-2 text-subtitle-3 text-slate-500">
          {{ summaryCard.description }}
        </p>
      </article>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Profiles</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Artist directory</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Search artists</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search by artist or email"
              class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Filter artists</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-slate-100 outline-none"
            >
              <option value="all">All artists</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending verification</option>
            </select>
          </label>
        </div>
      </div>

      <AppStatePanel
        v-if="successMessage"
        class="mt-6"
        compact
        type="success"
        :message="successMessage"
      />
      <div
        v-if="errorMessage"
        class="mt-6 border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="loading"
        class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
      >
        Loading artists...
      </div>

      <div
        v-else-if="filteredArtists.length === 0"
        class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
      >
        No artist matches the current filters.
      </div>

      <div v-else class="mt-6 overflow-hidden border border-slate-800">
        <p class="border-b border-slate-800 px-4 py-3 text-subtitle-3 text-slate-500 sm:hidden">
          Swipe horizontally to view every column.
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-[1100px] divide-y divide-slate-800 sm:min-w-full">
            <thead class="bg-slate-950">
              <tr class="text-left text-xs uppercase tracking-widest text-slate-500">
                <th class="px-5 py-4 font-medium">Artist</th>
                <th class="px-5 py-4 font-medium">Verification</th>
                <th class="px-5 py-4 font-medium">Portfolio</th>
                <th class="px-5 py-4 font-medium">Access</th>
                <th class="px-5 py-4 font-medium">Created</th>
                <th class="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 bg-black/20">
              <tr v-for="artist in filteredArtists" :key="artist.id">
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-100">
                    {{ artist.name }}
                  </p>
                  <p class="mt-1 text-sm text-slate-400">{{ artist.email }}</p>
                  <p class="mt-2 line-clamp-2 text-sm text-slate-500">
                    {{ artist.bio }}
                  </p>
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    :class="
                      artist.verified
                        ? 'bg-violet-700/10 text-violet-300'
                        : 'bg-amber-950 text-amber-300'
                    "
                  >
                    {{ artist.verified ? "Verified" : "Pending" }}
                  </span>
                </td>
                <td class="px-5 py-4 text-sm text-slate-100">
                  <p>{{ artist.artworksCount }} artworks</p>
                  <p class="mt-1 text-slate-400">{{ artist.collectionsCount }} collections</p>
                  <p class="mt-1 text-slate-400">{{ artist.followersCount }} followers</p>
                </td>
                <td class="px-5 py-4 text-sm text-slate-100">
                  <p>{{ artist.isActive ? "User active" : "User inactive" }}</p>
                  <p class="mt-1 text-slate-400">
                    {{ artist.isAdmin ? "Admin-linked account" : "Standard account" }}
                  </p>
                </td>
                <td class="px-5 py-4 text-sm text-slate-400">
                  {{ formatDate(artist.createdAt) }}
                </td>
                <td class="px-5 py-4">
                  <div class="flex flex-wrap gap-2">
                    <NuxtLink
                      :to="`/admin/artists/${artist.id}`"
                      class="inline-flex min-h-10 items-center justify-center border border-slate-750 bg-black px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
                    >
                      View profile
                    </NuxtLink>
                    <button
                      type="button"
                      class="inline-flex min-h-10 items-center justify-center border px-4 text-[11px] font-semibold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50"
                      :class="
                        artist.verified
                          ? 'border-amber-900 bg-amber-950/40 text-amber-200 hover:border-amber-700 hover:text-amber-100'
                          : 'border-violet-700 bg-violet-700/10 text-violet-200 hover:border-violet-500 hover:text-violet-100'
                      "
                      :disabled="reviewLoadingId === artist.id"
                      @click="updateVerification(artist, !artist.verified)"
                    >
                      {{
                        reviewLoadingId === artist.id
                          ? "Updating..."
                          : artist.verified
                            ? "Move to pending"
                            : "Verify"
                      }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";
import { formatAdminDate } from "~/utils/admin-format";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const artists = ref([]);
const reviewLoadingId = ref(null);
const summary = ref({
  totalArtists: 0,
  verifiedArtists: 0,
  pendingArtists: 0,
  totalArtworks: 0
});

const summaries = computed(() => [
  {
    label: "Total artists",
    value: summary.value.totalArtists,
    description: "Artist profiles currently linked to user accounts."
  },
  {
    label: "Verified",
    value: summary.value.verifiedArtists,
    description: "Artists already cleared for the platform."
  },
  {
    label: "Pending",
    value: summary.value.pendingArtists,
    description: "Profiles still waiting for verification."
  },
  {
    label: "Portfolio items",
    value: summary.value.totalArtworks,
    description: "Total artworks currently connected to artists."
  }
]);

const filteredArtists = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return artists.value.filter((artist) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      artist.name.toLowerCase().includes(normalizedSearch) ||
      artist.email.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter.value === "all" ||
      (statusFilter.value === "verified" && artist.verified) ||
      (statusFilter.value === "pending" && !artist.verified);

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadArtists();
});

async function loadArtists(showSuccess = false) {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/artists", {
      credentials: "include"
    });

    artists.value = response.artists || [];
    summary.value = response.summary || summary.value;
    if (showSuccess) {
      successMessage.value = "Artist data refreshed successfully.";
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

    errorMessage.value = error?.data?.message || "Unable to load admin artists.";
  } finally {
    loading.value = false;
  }
}

async function updateVerification(artist, verified) {
  if (reviewLoadingId.value === artist.id) {
    return;
  }

  reviewLoadingId.value = artist.id;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch(`/api/admin/artists/${artist.id}/verification`, {
      method: "PATCH",
      credentials: "include",
      body: {
        verified
      }
    });

    artists.value = artists.value.map((entry) =>
      entry.id === artist.id ? response.artist : entry
    );
    summary.value = {
      totalArtists: artists.value.length,
      verifiedArtists: artists.value.filter((entry) => entry.verified).length,
      pendingArtists: artists.value.filter((entry) => !entry.verified).length,
      totalArtworks: artists.value.reduce((total, entry) => total + entry.artworksCount, 0)
    };
    successMessage.value = response.message || "Artist updated successfully.";
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to update this artist.";
  } finally {
    reviewLoadingId.value = null;
  }
}

function formatDate(value) {
  return formatAdminDate(value, "en-US");
}
</script>
