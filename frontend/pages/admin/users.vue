<template>
  <AdminShell
    title="Users"
    description="Gestion des utilisateurs avec vraies donnees backend, recherche simple et filtre de statut."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-2xl border border-[#4A6CF7] bg-[#4A6CF7]/10 px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#4A6CF7]/20"
        :disabled="loading"
        @click="loadUsers"
      >
        {{ loading ? "Refreshing..." : "Refresh users" }}
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

    <section class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">
            Listing
          </p>
          <h2 class="mt-3 text-xl font-semibold text-[#E6EDF7]">
            Tableau utilisateurs
          </h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label
            class="rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-4 py-3"
          >
            <span class="sr-only">Search users</span>
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
            <span class="sr-only">Filter by status</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-[#E6EDF7] outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Pending verification">Pending verification</option>
              <option value="Inactive">Inactive</option>
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
        v-else-if="loading"
        class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        Chargement des utilisateurs...
      </div>

      <div
        v-else-if="filteredUsers.length === 0"
        class="mt-6 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4 text-sm text-[#A0ADB4]"
      >
        Aucun utilisateur ne correspond aux filtres actuels.
      </div>

      <div
        v-else
        class="mt-6 overflow-hidden rounded-[22px] border border-[#1A1F2A]"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#1A1F2A]">
            <thead class="bg-[#01050E]">
              <tr
                class="text-left text-xs uppercase tracking-[0.18em] text-[#6D7A88]"
              >
                <th class="px-5 py-4 font-medium">User</th>
                <th class="px-5 py-4 font-medium">Role</th>
                <th class="px-5 py-4 font-medium">Status</th>
                <th class="px-5 py-4 font-medium">Orders</th>
                <th class="px-5 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1A1F2A] bg-[#090017]">
              <tr v-for="user in filteredUsers" :key="user.id">
                <td class="px-5 py-4">
                  <p class="font-semibold text-[#E6EDF7]">
                    {{ user.username }}
                  </p>
                  <p class="mt-1 text-sm text-[#8E9AA7]">{{ user.email }}</p>
                </td>
                <td class="px-5 py-4 text-sm text-[#D8E1F0]">
                  {{ user.role }}
                </td>
                <td class="px-5 py-4">
                  <span
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    :class="statusClass(user.status)"
                  >
                    {{ user.status }}
                  </span>
                </td>
                <td class="px-5 py-4 text-sm text-[#D8E1F0]">
                  {{ user.ordersCount }}
                </td>
                <td class="px-5 py-4 text-sm text-[#8E9AA7]">
                  {{ formatDate(user.createdAt) }}
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

definePageMeta({
  middleware: "admin",
});

const loading = ref(true);
const errorMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const users = ref([]);
const summary = ref({
  totalUsers: 0,
  activeUsers: 0,
  pendingVerificationUsers: 0,
  adminUsers: 0,
});

const summaries = computed(() => [
  {
    label: "Total users",
    value: summary.value.totalUsers,
    description: "Nombre total de comptes en base.",
  },
  {
    label: "Active users",
    value: summary.value.activeUsers,
    description: "Comptes actuellement actifs sur la plateforme.",
  },
  {
    label: "Pending verification",
    value: summary.value.pendingVerificationUsers,
    description: "Utilisateurs encore non verifies.",
  },
  {
    label: "Admins",
    value: summary.value.adminUsers,
    description: "Comptes ayant acces au backoffice.",
  },
]);

const filteredUsers = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return users.value.filter((user) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      user.username.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);

    const matchesStatus =
      statusFilter.value === "all" || user.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadUsers();
});

async function loadUsers() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/users", {
      credentials: "include",
    });

    users.value = response.users || [];
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

    errorMessage.value = error?.data?.message || "Unable to load admin users.";
  } finally {
    loading.value = false;
  }
}

function statusClass(status) {
  if (status === "Active") {
    return "bg-[#4A6CF7]/10 text-[#4A6CF7]";
  }

  if (status === "Pending verification") {
    return "bg-[#3F2A11] text-[#F2C97D]";
  }

  if (status === "Inactive") {
    return "bg-[#3A1016] text-[#FCA5A5]";
  }

  return "bg-[#1F2937] text-[#D8E1F0]";
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
}
</script>
