<template>
  <AdminShell
    title="Artist Applications"
    description="Review artist applications, signed PDF agreements, approvals and rejections."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadApplications"
      >
        {{ loading ? "Refreshing..." : "Refresh applications" }}
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

    <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Artist queue</p>
            <h2 class="mt-3 text-xl font-semibold text-slate-100">Artist applications</h2>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="border border-slate-800 bg-black px-4 py-3">
              <span class="sr-only">Search applications</span>
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search by name or email"
                class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>
            <label class="border border-slate-800 bg-black px-4 py-3">
              <span class="sr-only">Filter applications</span>
              <select
                v-model="statusFilter"
                class="w-full bg-transparent text-sm text-slate-100 outline-none"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="mt-6 border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
        >
          {{ errorMessage }}
        </div>
        <AppStatePanel
          v-if="successMessage"
          class="mt-6"
          compact
          type="success"
          :message="successMessage"
        />

        <div
          v-else-if="loading"
          class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
        >
          Loading applications...
        </div>

        <div
          v-else-if="filteredApplications.length === 0"
          class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
        >
          No applications match the current filters.
        </div>

        <div v-else class="mt-6 grid gap-4">
          <div
            v-for="application in filteredApplications"
            :key="application.id"
            class="border border-slate-800 bg-black/30 p-5"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="font-semibold text-slate-100">
                  {{ application.displayName }}
                </p>
                <p class="mt-1 text-sm text-slate-400">
                  {{ application.applicantName }} - {{ application.email }}
                </p>
                <p class="mt-2 text-sm leading-6 text-slate-400">
                  {{ application.bio }}
                </p>
              </div>
              <span
                class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusBadgeClass(application.status)"
              >
                {{ application.status }}
              </span>
            </div>

            <div class="mt-5 grid gap-3 border border-slate-800 bg-black p-4 text-sm">
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Art type</span>
                <span class="font-medium text-slate-100">{{ application.artType }}</span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Styles</span>
                <span class="font-medium text-slate-100">
                  {{ application.styles.join(", ") || "-" }}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Address</span>
                <span class="font-medium text-slate-100">
                  {{ formatAddress(application) }}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-slate-400">Submitted on</span>
                <span class="font-medium text-slate-100">
                  {{ formatDate(application.submittedAt) }}
                </span>
              </div>
              <div v-if="application.reviewNote" class="grid gap-1">
                <span class="text-slate-400">Admin note</span>
                <span class="leading-6 text-slate-100">{{ application.reviewNote }}</span>
              </div>
            </div>

            <label class="mt-5 grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Admin note (optional)</span>
              <textarea
                v-model="reviewNotes[application.id]"
                rows="3"
                class="field-control min-h-[96px] resize-y"
                placeholder="Add a note visible in the application history."
              />
            </label>

            <div class="mt-5 flex flex-wrap gap-3">
              <a
                v-if="application.hasContractPdf"
                :href="`/api/admin/artist-applications/${application.id}/contract.pdf`"
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-11 items-center justify-center border border-slate-800 bg-black px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-600"
              >
                Open PDF agreement
              </a>
              <NuxtLink
                v-if="application.artistId"
                :to="`/admin/artists/${application.artistId}`"
                class="inline-flex min-h-11 items-center justify-center border border-slate-800 bg-black px-5 text-sm font-semibold text-slate-100 transition hover:border-violet-600 hover:text-violet-300"
              >
                Open artist profile
              </NuxtLink>
              <button
                v-if="application.status !== 'approved'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center bg-violet-700 px-5 text-sm font-semibold text-black transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === application.id"
                @click="reviewApplication(application, 'approved')"
              >
                {{ reviewLoadingId === application.id ? "Updating..." : "Approve" }}
              </button>
              <button
                v-if="application.status !== 'rejected'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center border border-slate-800 bg-black px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === application.id"
                @click="reviewApplication(application, 'rejected')"
              >
                {{ reviewLoadingId === application.id ? "Updating..." : "Reject" }}
              </button>
            </div>
          </div>
        </div>
      </article>

      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Review flow</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-100">Agreement management</h2>

        <div class="mt-6 grid gap-4">
          <div
            v-for="action in actions"
            :key="action.title"
            class="border border-slate-800 bg-black/30 p-5"
          >
            <p class="font-semibold text-slate-100">{{ action.title }}</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              {{ action.description }}
            </p>
          </div>
        </div>
      </article>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const applications = ref([]);
const reviewLoadingId = ref(null);
const reviewNotes = ref({});
const summary = ref({
  totalApplications: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  rejectedApplications: 0
});

const summaries = computed(() => [
  {
    label: "Total applications",
    value: summary.value.totalApplications,
    description: "Total number of signed applications."
  },
  {
    label: "Pending",
    value: summary.value.pendingApplications,
    description: "Applications still awaiting a decision."
  },
  {
    label: "Approved",
    value: summary.value.approvedApplications,
    description: "Approved applications and activated artist profiles."
  },
  {
    label: "Rejected",
    value: summary.value.rejectedApplications,
    description: "Applications rejected by the administration."
  }
]);

const filteredApplications = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return applications.value.filter((application) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      application.displayName.toLowerCase().includes(normalizedSearch) ||
      application.applicantName.toLowerCase().includes(normalizedSearch) ||
      application.email.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter.value === "all" || application.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadApplications();
});

async function loadApplications() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/artist-applications", {
      credentials: "include"
    });

    applications.value = response.applications || [];
    summary.value = response.summary || summary.value;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to load artist applications.";
  } finally {
    loading.value = false;
  }
}

const actions = [
  {
    title: "Signed agreement",
    description: "Each application contains a PDF agreement signed by the artist."
  },
  {
    title: "Approval",
    description: "Approval activates the artist profile and grants access to the artist workspace."
  },
  {
    title: "Rejection",
    description: "Rejection blocks activation and keeps the application available for correction."
  }
];

function replaceApplication(updatedApplication) {
  applications.value = applications.value.map((application) =>
    application.id === updatedApplication.id ? updatedApplication : application
  );
  summary.value = {
    totalApplications: applications.value.length,
    pendingApplications: applications.value.filter((item) => item.status === "pending").length,
    approvedApplications: applications.value.filter((item) => item.status === "approved").length,
    rejectedApplications: applications.value.filter((item) => item.status === "rejected").length
  };
}

async function reviewApplication(application, status) {
  errorMessage.value = "";
  successMessage.value = "";
  reviewLoadingId.value = application.id;

  try {
    const response = await $fetch(`/api/admin/artist-applications/${application.id}`, {
      method: "PATCH",
      credentials: "include",
      body: {
        status,
        reviewNote: reviewNotes.value[application.id] || ""
      }
    });

    replaceApplication(response.application);
    successMessage.value =
      status === "approved"
        ? `${response.application.displayName} is now approved.`
        : `${response.application.displayName} was rejected.`;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to review artist application.";
  } finally {
    reviewLoadingId.value = null;
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

function formatAddress(application) {
  return [
    application.addressLine1,
    application.addressLine2,
    [application.postalCode, application.city].filter(Boolean).join(" "),
    application.region,
    application.country
  ]
    .filter(Boolean)
    .join(", ");
}

function statusBadgeClass(status) {
  if (status === "approved") {
    return "bg-violet-700/10 text-violet-700";
  }

  if (status === "rejected") {
    return "bg-red-950 text-red-300";
  }

  return "bg-amber-950 text-amber-300";
}
</script>

<style scoped>
.field-control {
  @apply w-full border border-slate-800 bg-black px-3.5 py-3 text-slate-100 outline-none;
}

.field-control:focus {
  @apply border-violet-700;
  box-shadow: 0 0 0 3px color-mix(in srgb, theme("colors.violet.700") 18%, transparent);
}
</style>
