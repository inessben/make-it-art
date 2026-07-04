<template>
  <AdminShell
    title="Artist Applications"
    description="File admin des candidatures artistes avec contrat PDF, approbation et refus."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
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
        class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
          {{ summaryCard.label }}
        </p>
        <p class="mt-4 text-3xl font-semibold text-white">
          {{ summaryCard.value }}
        </p>
        <p class="mt-3 text-sm leading-6 text-[#A0ADB4]">
          {{ summaryCard.description }}
        </p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
              Artist queue
            </p>
            <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">
              Demandes artistes
            </h2>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label
              class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3"
            >
              <span class="sr-only">Search applications</span>
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search by name or email"
                class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none placeholder:text-[#6D7A88]"
              />
            </label>
            <label
              class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3"
            >
              <span class="sr-only">Filter applications</span>
              <select
                v-model="statusFilter"
                class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
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
          class="mt-6 rounded-2xl border border-[#7f1d1d] bg-[#2b1014] px-5 py-4 text-sm text-[#FECACA]"
        >
          {{ errorMessage }}
        </div>
        <div
          v-if="successMessage"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#11243a] px-5 py-4 text-sm text-[#B9E3FF]"
        >
          {{ successMessage }}
        </div>

        <div
          v-else-if="loading"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Chargement des candidatures...
        </div>

        <div
          v-else-if="filteredApplications.length === 0"
          class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
        >
          Aucune candidature ne correspond aux filtres actuels.
        </div>

        <div v-else class="mt-6 grid gap-4">
          <div
            v-for="application in filteredApplications"
            :key="application.id"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
          >
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p class="font-semibold text-[#E6EDF7]">
                  {{ application.displayName }}
                </p>
                <p class="mt-1 text-sm text-[#8E9AA7]">
                  {{ application.applicantName }} - {{ application.email }}
                </p>
                <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
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

            <div
              class="mt-5 grid gap-3 rounded-[18px] border border-[#1A1F2A] bg-[#090017] p-4 text-sm"
            >
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-[#8E9AA7]">Type d'art</span>
                <span class="font-medium text-[#E6EDF7]">{{
                  application.artType
                }}</span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-[#8E9AA7]">Styles</span>
                <span class="font-medium text-[#E6EDF7]">
                  {{ application.styles.join(", ") || "-" }}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-[#8E9AA7]">Adresse</span>
                <span class="font-medium text-[#E6EDF7]">
                  {{ formatAddress(application) }}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <span class="text-[#8E9AA7]">Soumise le</span>
                <span class="font-medium text-[#E6EDF7]">
                  {{ formatDate(application.submittedAt) }}
                </span>
              </div>
              <div v-if="application.reviewNote" class="grid gap-1">
                <span class="text-[#8E9AA7]">Note admin</span>
                <span class="leading-6 text-[#E6EDF7]">{{
                  application.reviewNote
                }}</span>
              </div>
            </div>

            <label class="mt-5 grid gap-2 text-sm text-[#A0ADB4]">
              <span class="font-medium text-[#E6EDF7]"
                >Note admin (optionnelle)</span
              >
              <textarea
                v-model="reviewNotes[application.id]"
                rows="3"
                class="field-control min-h-[96px] resize-y"
                placeholder="Ajouter un commentaire visible dans le suivi."
              />
            </label>

            <div class="mt-5 flex flex-wrap gap-3">
              <a
                v-if="application.hasContractPdf"
                :href="`/api/admin/artist-applications/${application.id}/contract.pdf`"
                target="_blank"
                rel="noreferrer"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
              >
                Ouvrir le contrat PDF
              </a>
              <button
                v-if="application.status !== 'approved'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#4A6CF7] px-5 text-sm font-semibold text-black transition hover:bg-[#6d8bff] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === application.id"
                @click="reviewApplication(application, 'approved')"
              >
                {{
                  reviewLoadingId === application.id
                    ? "Mise a jour..."
                    : "Approuver"
                }}
              </button>
              <button
                v-if="application.status !== 'rejected'"
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewLoadingId === application.id"
                @click="reviewApplication(application, 'rejected')"
              >
                {{
                  reviewLoadingId === application.id
                    ? "Mise a jour..."
                    : "Refuser"
                }}
              </button>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
          Review flow
        </p>
        <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">
          Gestion des contrats
        </h2>

        <div class="mt-6 grid gap-4">
          <div
            v-for="action in actions"
            :key="action.title"
            class="rounded-[20px] border border-[#1A1F2A] bg-[#01050E] p-5"
          >
            <p class="font-semibold text-[#E6EDF7]">{{ action.title }}</p>
            <p class="mt-2 text-sm leading-6 text-[#A0ADB4]">
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
  middleware: "admin",
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
  rejectedApplications: 0,
});

const summaries = computed(() => [
  {
    label: "Total applications",
    value: summary.value.totalApplications,
    description: "Nombre total de candidatures signees.",
  },
  {
    label: "Pending",
    value: summary.value.pendingApplications,
    description: "Demandes encore en attente de decision.",
  },
  {
    label: "Approved",
    value: summary.value.approvedApplications,
    description: "Demandes acceptees et profils artistes actives.",
  },
  {
    label: "Rejected",
    value: summary.value.rejectedApplications,
    description: "Demandes refusees par l'administration.",
  },
]);

const filteredApplications = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return applications.value.filter((application) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      application.displayName.toLowerCase().includes(normalizedSearch) ||
      application.applicantName.toLowerCase().includes(normalizedSearch) ||
      application.email.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter.value === "all" || application.status === statusFilter.value;

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
      credentials: "include",
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

    errorMessage.value =
      error?.data?.message || "Unable to load artist applications.";
  } finally {
    loading.value = false;
  }
}

const actions = [
  {
    title: "Contrat signe",
    description: "Chaque demande contient un contrat PDF signe par l'artiste.",
  },
  {
    title: "Approbation",
    description:
      "Approuver active le profil artiste et donne acces a l'espace artiste.",
  },
  {
    title: "Refus",
    description:
      "Refuser bloque l'activation et laisse le dossier visible pour correction.",
  },
];

function replaceApplication(updatedApplication) {
  applications.value = applications.value.map((application) =>
    application.id === updatedApplication.id ? updatedApplication : application,
  );
  summary.value = {
    totalApplications: applications.value.length,
    pendingApplications: applications.value.filter(
      (item) => item.status === "pending",
    ).length,
    approvedApplications: applications.value.filter(
      (item) => item.status === "approved",
    ).length,
    rejectedApplications: applications.value.filter(
      (item) => item.status === "rejected",
    ).length,
  };
}

async function reviewApplication(application, status) {
  errorMessage.value = "";
  successMessage.value = "";
  reviewLoadingId.value = application.id;

  try {
    const response = await $fetch(
      `/api/admin/artist-applications/${application.id}`,
      {
        method: "PATCH",
        credentials: "include",
        body: {
          status,
          reviewNote: reviewNotes.value[application.id] || "",
        },
      },
    );

    replaceApplication(response.application);
    successMessage.value =
      status === "approved"
        ? `${response.application.displayName} est maintenant approuve.`
        : `${response.application.displayName} a ete refuse.`;
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value =
      error?.data?.message || "Unable to review artist application.";
  } finally {
    reviewLoadingId.value = null;
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

function formatAddress(application) {
  return [
    application.addressLine1,
    application.addressLine2,
    [application.postalCode, application.city].filter(Boolean).join(" "),
    application.region,
    application.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function statusBadgeClass(status) {
  if (status === "approved") {
    return "bg-[#4A6CF7]/10 text-[#4A6CF7]";
  }

  if (status === "rejected") {
    return "bg-[#3A1017] text-[#FCA5A5]";
  }

  return "bg-[#3F2A11] text-[#F2C97D]";
}
</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: 14px;
  border: 1px solid #1a1f2a;
  background: #050916;
  padding: 12px 14px;
  color: #e6edf7;
  outline: none;
}

.field-control:focus {
  border-color: #4a6cf7;
  box-shadow: 0 0 0 3px rgb(74 108 247 / 18%);
}
</style>
