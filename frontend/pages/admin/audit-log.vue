<template>
  <AdminShell
    title="Audit log"
    description="Trace who did what, when, and on which entity across users, artists, artworks, orders, and payments."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
        :disabled="loading"
        @click="loadAuditLog"
      >
        {{ loading ? "Refreshing..." : "Refresh" }}
      </button>
    </template>

    <div
      v-if="errorMessage"
      class="border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
    >
      {{ errorMessage }}
    </div>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="summaryCard in summaryCards"
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

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
      <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Filters</p>
      <h2 class="mt-3 text-xl font-semibold text-slate-100">Narrow the audit scope</h2>

      <div class="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <label class="grid gap-2">
          <span class="text-xs uppercase tracking-[0.12em] text-slate-500">Entity type</span>
          <select
            v-model="filters.entityType"
            class="min-h-11 border border-slate-800 bg-black px-3 text-sm text-slate-100 outline-none transition focus:border-violet-600"
          >
            <option value="">All entities</option>
            <option
              v-for="entityType in entityTypes"
              :key="entityType.value"
              :value="entityType.value"
            >
              {{ entityType.label }}
            </option>
          </select>
        </label>

        <label class="grid gap-2">
          <span class="text-xs uppercase tracking-[0.12em] text-slate-500">Entity ID</span>
          <input
            v-model.trim="filters.entityId"
            type="text"
            placeholder="7 or public id"
            class="min-h-11 border border-slate-800 bg-black px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-600"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-xs uppercase tracking-[0.12em] text-slate-500">Action</span>
          <input
            v-model.trim="filters.actionQuery"
            type="text"
            placeholder="ARTWORK_MODERATION"
            class="min-h-11 border border-slate-800 bg-black px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-600"
          />
        </label>

        <button
          type="button"
          class="min-h-11 border border-violet-700 bg-violet-950/40 px-4 text-subtitle-2 uppercase tracking-[0.12em] text-violet-200 transition hover:border-violet-500"
          :disabled="loading"
          @click="loadAuditLog"
        >
          Apply
        </button>

        <button
          type="button"
          class="min-h-11 border border-slate-800 bg-black px-4 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-slate-600"
          :disabled="loading"
          @click="resetFilters"
        >
          Reset
        </button>
      </div>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
      <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Breakdown</p>
      <h2 class="mt-3 text-xl font-semibold text-slate-100">Entries by entity type</h2>

      <div v-if="entityTypeCounts.length === 0" class="mt-6 text-sm text-slate-400">
        No entity breakdown is available for the current filter.
      </div>

      <div v-else class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article
          v-for="entryGroup in entityTypeCounts"
          :key="entryGroup.entityType"
          class="border border-slate-800 bg-black/30 p-4"
        >
          <p class="text-xs uppercase tracking-[0.12em] text-slate-500">{{ entryGroup.label }}</p>
          <p class="mt-3 text-xl font-semibold text-slate-100">{{ entryGroup.count }}</p>
        </article>
      </div>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-5">
      <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Entries</p>
      <h2 class="mt-3 text-xl font-semibold text-slate-100">Recent audit events</h2>

      <div v-if="loading && entries.length === 0" class="mt-6 text-sm text-slate-400">
        Loading audit log...
      </div>

      <div v-else-if="entries.length === 0" class="mt-6 text-sm text-slate-400">
        No audit entry matches the current filter.
      </div>

      <div v-else class="mt-6 grid gap-3">
        <article
          v-for="entry in entries"
          :key="entry.id"
          class="border border-slate-800 bg-black/30 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-slate-100">{{ entry.action }}</p>
              <p class="mt-1 text-sm text-slate-400">
                {{ entry.entityLabel || entry.entityType }} / {{ entry.entityId }}
              </p>
            </div>
            <span class="text-xs uppercase tracking-[0.12em] text-slate-500">
              {{ formatDateTime(entry.createdAt) }}
            </span>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="border border-slate-800 bg-slate-950/40 p-3">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Actor</p>
              <p class="mt-2 text-sm text-slate-100">{{ entry.actor?.username || "System" }}</p>
              <p v-if="entry.actor?.email" class="mt-1 text-sm text-slate-400">
                {{ entry.actor.email }}
              </p>
            </div>

            <div class="border border-slate-800 bg-slate-950/40 p-3">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">Entity type</p>
              <p class="mt-2 text-sm text-slate-100">{{ entry.entityType }}</p>
            </div>

            <div class="border border-slate-800 bg-slate-950/40 p-3">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-500">IP address</p>
              <p class="mt-2 text-sm text-slate-100">{{ entry.ipAddress || "Not recorded" }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { navigateTo, useRoute } from "#app";
import { formatAdminDateTime } from "~/utils/admin-format";

definePageMeta({
  middleware: "admin"
});

const route = useRoute();
const loading = ref(true);
const errorMessage = ref("");
const entries = ref([]);
const entityTypes = ref([]);
const entityTypeCounts = ref([]);
const summary = reactive({
  totalEntries: 0,
  latestEntryAt: null
});
const filters = reactive({
  entityType: normalizeQueryValue(route.query.entityType).toUpperCase(),
  entityId: normalizeQueryValue(route.query.entityId),
  actionQuery: normalizeQueryValue(route.query.action)
});

const summaryCards = computed(() => [
  {
    label: "Entries",
    value: summary.totalEntries,
    description: "Matching audit rows returned by the active filter."
  },
  {
    label: "Entity types",
    value: entityTypeCounts.value.length,
    description: "Different scopes touched in the current result set."
  },
  {
    label: "Latest action",
    value: entries.value[0]?.action || "None",
    description: "Most recent matching operation."
  },
  {
    label: "Latest event",
    value: summary.latestEntryAt ? formatDateTime(summary.latestEntryAt) : "No event",
    description: "Timestamp of the freshest recorded entry."
  }
]);

onMounted(async () => {
  await loadAuditLog();
});

async function loadAuditLog() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/audit-log", {
      credentials: "include",
      query: {
        limit: 160,
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.entityId ? { entityId: filters.entityId } : {}),
        ...(filters.actionQuery ? { action: filters.actionQuery } : {})
      }
    });

    summary.totalEntries = response.summary?.totalEntries || 0;
    summary.latestEntryAt = response.summary?.latestEntryAt || null;
    entityTypeCounts.value = response.summary?.entityTypeCounts || [];
    entityTypes.value = response.entityTypes || [];
    entries.value = response.entries || [];
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load admin audit log.";
  } finally {
    loading.value = false;
  }
}

async function resetFilters() {
  filters.entityType = "";
  filters.entityId = "";
  filters.actionQuery = "";
  await loadAuditLog();
}

function normalizeQueryValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateTime(value) {
  return formatAdminDateTime(value, "en-US");
}
</script>
