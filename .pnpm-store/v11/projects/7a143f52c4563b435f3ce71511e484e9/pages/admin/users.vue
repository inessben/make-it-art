<template>
  <AdminShell
    title="Users"
    description="Manage platform accounts, supervise admin access and create new admin operators."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadUsers(true)"
      >
        {{ loading ? "Refreshing..." : "Refresh users" }}
      </button>
    </template>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
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

    <section class="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
              Admin access
            </p>
            <h2 class="mt-3 text-xl font-semibold text-slate-100">Create an admin account</h2>
          </div>
          <span
            class="inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
            :class="
              canManageAdmins
                ? 'border-emerald-900 bg-emerald-950 text-emerald-300'
                : 'border-slate-800 bg-black text-slate-400'
            "
          >
            {{ canManageAdmins ? "Super admin session" : "Standard admin session" }}
          </span>
        </div>

        <AppStatePanel
          v-if="!canManageAdmins"
          class="mt-6"
          type="disabled"
          title="Restricted action"
          message="Only super admins can create new admin accounts or grant super admin rights."
        />

        <form v-else class="mt-6 grid gap-4" @submit.prevent="createAdminAccount">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Username</span>
              <input
                v-model.trim="adminForm.username"
                type="text"
                class="field-control"
                placeholder="Admin username"
                autocomplete="name"
              />
            </label>
            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Email</span>
              <input
                v-model.trim="adminForm.email"
                type="email"
                class="field-control"
                placeholder="admin@example.com"
                autocomplete="email"
              />
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Phone (optional)</span>
              <input
                v-model.trim="adminForm.phone"
                type="tel"
                class="field-control"
                placeholder="+33 6 00 00 00 00"
                autocomplete="tel"
              />
            </label>
            <label class="grid gap-2 text-sm text-slate-400">
              <span class="font-medium text-slate-100">Access level</span>
              <span class="border border-slate-800 bg-black px-4 py-3 text-sm text-slate-300">
                {{ adminForm.isSuperAdmin ? "Super admin" : "Standard admin" }}
              </span>
            </label>
          </div>

          <label class="flex items-start gap-3 border border-slate-800 bg-black/40 px-4 py-4">
            <input
              v-model="adminForm.isSuperAdmin"
              type="checkbox"
              class="mt-1 h-4 w-4 accent-violet-500"
            />
            <span class="text-sm leading-6 text-slate-300">
              Grant super admin access. If enabled, this admin can also create other admins.
            </span>
          </label>

          <div class="grid gap-2 text-xs leading-5 text-slate-500">
            <p>The invited admin receives an email to activate the account and choose a password.</p>
            <p>Until that step is completed, the account stays pending and cannot log in.</p>
          </div>

          <AppStatePanel
            v-if="formErrorMessage"
            compact
            type="error"
            :message="formErrorMessage"
          />

          <div class="flex flex-wrap gap-3">
            <button
              type="submit"
              class="inline-flex min-h-11 items-center justify-center bg-violet-700 px-5 text-sm font-semibold text-black transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="creatingAdmin"
            >
              {{ creatingAdmin ? "Sending..." : "Send invitation" }}
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center border border-slate-800 bg-black px-5 text-sm font-semibold text-slate-100 transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="creatingAdmin"
              @click="resetAdminForm"
            >
              Reset form
            </button>
          </div>
        </form>
      </article>

      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Permission model</p>
        <h2 class="mt-3 text-xl font-semibold text-slate-100">Admin roles</h2>

        <div class="mt-6 grid gap-4">
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Super admin</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              Full back-office access plus the right to invite new admins and delegate super admin
              capability.
            </p>
          </div>
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Standard admin</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              Can use moderation, users, artists, orders and payments pages, but cannot create new
              admin invitations.
            </p>
          </div>
          <div class="border border-slate-800 bg-black/30 p-5">
            <p class="font-semibold text-slate-100">Current account</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">
              {{ auth.user?.username || "Admin" }} is currently signed in as
              <span class="font-semibold text-slate-100">
                {{ auth.isSuperAdmin ? "a super admin" : "a standard admin" }}.
              </span>
            </p>
          </div>
        </div>
      </article>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Listing</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">User directory</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Search users</span>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search by name or email"
              class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
          <label class="border border-slate-800 bg-black px-4 py-3">
            <span class="sr-only">Filter by status</span>
            <select
              v-model="statusFilter"
              class="w-full bg-transparent text-sm text-slate-100 outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Pending verification">Pending verification</option>
              <option value="Inactive">Inactive</option>
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
        Loading users...
      </div>

      <div
        v-else-if="filteredUsers.length === 0"
        class="mt-6 border border-slate-800 bg-black px-5 py-4 text-sm text-slate-400"
      >
        No users match the current filters.
      </div>

      <div v-else class="mt-6 overflow-hidden border border-slate-800">
        <p class="border-b border-slate-800 px-4 py-3 text-subtitle-3 text-slate-500 sm:hidden">
          Swipe horizontally to view every column.
        </p>
        <div class="overflow-x-auto">
          <table class="min-w-[720px] divide-y divide-slate-800 sm:min-w-full">
            <thead class="bg-slate-950">
              <tr class="text-left text-xs uppercase tracking-widest text-slate-500">
                <th class="px-5 py-4 font-medium">User</th>
                <th class="px-5 py-4 font-medium">Role</th>
                <th class="px-5 py-4 font-medium">Status</th>
                <th class="px-5 py-4 font-medium">Orders</th>
                <th class="px-5 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 bg-black/20">
              <tr v-for="user in filteredUsers" :key="user.id">
                <td class="px-5 py-4">
                  <p class="font-semibold text-slate-100">
                    {{ user.username }}
                  </p>
                  <p class="mt-1 text-sm text-slate-400">{{ user.email }}</p>
                </td>
                <td class="px-5 py-4 text-sm text-slate-100">
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
                <td class="px-5 py-4 text-sm text-slate-100">
                  {{ user.ordersCount }}
                </td>
                <td class="px-5 py-4 text-sm text-slate-400">
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
import { computed, onMounted, reactive, ref } from "vue";
import { navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "admin"
});

const auth = useAuthStore();
const loading = ref(true);
const creatingAdmin = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const formErrorMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const users = ref([]);
const permissions = ref({
  canManageAdmins: false,
  isSuperAdmin: false
});
const summary = ref({
  totalUsers: 0,
  activeUsers: 0,
  pendingVerificationUsers: 0,
  adminUsers: 0,
  superAdminUsers: 0
});
const adminForm = reactive({
  username: "",
  email: "",
  phone: "",
  isSuperAdmin: false
});

const canManageAdmins = computed(
  () => auth.isSuperAdmin || permissions.value.canManageAdmins === true
);

const summaries = computed(() => [
  {
    label: "Total users",
    value: summary.value.totalUsers,
    description: "Total number of accounts in the database."
  },
  {
    label: "Active users",
    value: summary.value.activeUsers,
    description: "Accounts currently active on the platform."
  },
  {
    label: "Pending verification",
    value: summary.value.pendingVerificationUsers,
    description: "Users who still need verification."
  },
  {
    label: "Admins",
    value: summary.value.adminUsers,
    description: "Accounts with back-office access."
  },
  {
    label: "Super admins",
    value: summary.value.superAdminUsers,
    description: "Admins who can create and delegate other admin accounts."
  }
]);

const filteredUsers = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase();

  return users.value.filter((user) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      user.username.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter.value === "all" || user.status === statusFilter.value;

    return matchesSearch && matchesStatus;
  });
});

onMounted(async () => {
  await loadUsers();
});

async function loadUsers(showSuccess = false) {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch("/api/admin/users", {
      credentials: "include"
    });

    users.value = response.users || [];
    summary.value = response.summary || buildSummary(users.value);
    permissions.value = response.permissions || permissions.value;
    if (showSuccess) {
      successMessage.value = "User data refreshed successfully.";
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

    errorMessage.value = error?.data?.message || "Unable to load admin users.";
  } finally {
    loading.value = false;
  }
}

async function createAdminAccount() {
  creatingAdmin.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  formErrorMessage.value = "";

  try {
    const response = await $fetch("/api/admin/users/admins", {
      method: "POST",
      credentials: "include",
      body: {
        username: adminForm.username,
        email: adminForm.email,
        phone: adminForm.phone,
        isSuperAdmin: adminForm.isSuperAdmin
      }
    });

    if (response.user) {
      users.value = [response.user, ...users.value.filter((user) => user.id !== response.user.id)];
      summary.value = buildSummary(users.value);
    }

    resetAdminForm();
    successMessage.value = response.message || "Admin invitation sent.";
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    formErrorMessage.value = error?.data?.message || "Unable to create the admin account.";
  } finally {
    creatingAdmin.value = false;
  }
}

function resetAdminForm() {
  adminForm.username = "";
  adminForm.email = "";
  adminForm.phone = "";
  adminForm.isSuperAdmin = false;
  formErrorMessage.value = "";
}

function buildSummary(items) {
  return {
    totalUsers: items.length,
    activeUsers: items.filter((user) => user.isActive).length,
    pendingVerificationUsers: items.filter((user) => !user.verified).length,
    adminUsers: items.filter((user) => user.isAdmin).length,
    superAdminUsers: items.filter((user) => user.isSuperAdmin).length
  };
}

function statusClass(status) {
  if (status === "Active") {
    return "bg-violet-700/10 text-violet-700";
  }

  if (status === "Pending verification") {
    return "bg-amber-950 text-amber-300";
  }

  if (status === "Inactive") {
    return "bg-red-950 text-red-300";
  }

  return "bg-slate-800 text-slate-100";
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
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
