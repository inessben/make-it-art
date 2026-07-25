<template>
  <AdminShell
    title="Users"
    description="Manage users with live backend data, search and status filters."
  >
    <template #actions>
      <button
        type="button"
        class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        :disabled="loading"
        @click="loadUsers({ showSuccess: true })"
      >
        {{ loading ? "Refreshing..." : "Refresh users" }}
      </button>
    </template>

    <section
      v-if="canManageAdmins"
      class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6"
    >
      <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div class="max-w-2xl">
          <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Admin access</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-100">Invite a new admin</h2>
          <p class="mt-3 text-sm leading-6 text-slate-400">
            Send an activation email to a new admin account. Enable the super admin option only when
            this person must also be able to invite other admins.
          </p>
        </div>

        <form class="w-full max-w-3xl" @submit.prevent="submitAdminInvite">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="border border-slate-800 bg-black px-4 py-3">
              <span class="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-500"
                >Full name</span
              >
              <input
                v-model="inviteForm.username"
                type="text"
                autocomplete="name"
                placeholder="Operations Lead"
                class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>

            <label class="border border-slate-800 bg-black px-4 py-3">
              <span class="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-500"
                >Email</span
              >
              <input
                v-model="inviteForm.email"
                type="email"
                autocomplete="email"
                placeholder="ops@example.com"
                class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>

            <label class="border border-slate-800 bg-black px-4 py-3 md:col-span-2">
              <span class="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-500"
                >Phone (optional)</span
              >
              <input
                v-model="inviteForm.phone"
                type="tel"
                autocomplete="tel"
                placeholder="+33600000000"
                class="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>

            <label
              class="flex items-start gap-3 border border-slate-800 bg-black px-4 py-4 md:col-span-2"
            >
              <input
                v-model="inviteForm.isSuperAdmin"
                type="checkbox"
                class="mt-1 h-4 w-4 border-slate-700 bg-black text-violet-600"
              />
              <span>
                <span class="block text-sm font-semibold text-slate-100">Grant super admin</span>
                <span class="mt-1 block text-sm leading-6 text-slate-400">
                  Super admins can invite other admins and grant the same elevated access.
                </span>
              </span>
            </label>
          </div>

          <AppStatePanel
            v-if="inviteSuccessMessage"
            class="mt-4"
            compact
            type="success"
            :message="inviteSuccessMessage"
          />
          <div
            v-if="inviteErrorMessage"
            class="mt-4 border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200"
          >
            {{ inviteErrorMessage }}
          </div>

          <div class="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              class="inline-flex items-center justify-center border border-violet-600 bg-violet-600 px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:bg-violet-500 disabled:opacity-50"
              :disabled="inviteLoading"
            >
              {{ inviteLoading ? "Sending invitation..." : "Invite admin" }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
              :disabled="inviteLoading"
              @click="resetInviteForm"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </section>

    <section
      v-else-if="!loading"
      class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-4 sm:p-6"
    >
      <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">Admin access</p>
      <h2 class="mt-3 text-xl font-semibold text-slate-100">Invitations locked</h2>
      <p class="mt-3 text-sm leading-6 text-slate-400">
        Only super admins can invite another admin or grant super admin access.
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
              <option value="Suspended">Suspended</option>
              <option value="Blocked">Blocked</option>
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
          <table class="min-w-[980px] divide-y divide-slate-800 sm:min-w-full">
            <thead class="bg-slate-950">
              <tr class="text-left text-xs uppercase tracking-widest text-slate-500">
                <th class="px-5 py-4 font-medium">User</th>
                <th class="px-5 py-4 font-medium">Role</th>
                <th class="px-5 py-4 font-medium">Status</th>
                <th class="px-5 py-4 font-medium">Orders</th>
                <th class="px-5 py-4 font-medium">Joined</th>
                <th class="px-5 py-4 font-medium">Actions</th>
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
                <td class="px-5 py-4">
                  <div class="flex max-w-[280px] flex-wrap gap-2">
                    <button
                      v-for="action in getUserActions(user)"
                      :key="action.key"
                      type="button"
                      class="inline-flex items-center justify-center border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50"
                      :class="actionClass(action)"
                      :disabled="actionLoadingUserId === user.id"
                      @click="handleUserAction(user, action)"
                    >
                      {{ action.label }}
                    </button>
                    <span
                      v-if="getUserActions(user).length === 0"
                      class="text-xs leading-5 text-slate-500"
                    >
                      {{
                        user.id === permissions.currentUserId
                          ? "Current session"
                          : "No direct action"
                      }}
                    </span>
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

definePageMeta({
  middleware: "admin"
});

const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const searchTerm = ref("");
const statusFilter = ref("all");
const users = ref([]);
const permissions = ref({
  canManageAdmins: false,
  currentUserId: null,
  isSuperAdmin: false
});
const actionLoadingUserId = ref(null);
const inviteLoading = ref(false);
const inviteErrorMessage = ref("");
const inviteSuccessMessage = ref("");
const inviteForm = ref(createInviteForm());
const summary = ref({
  totalUsers: 0,
  activeUsers: 0,
  pendingVerificationUsers: 0,
  suspendedUsers: 0,
  blockedUsers: 0,
  adminUsers: 0,
  superAdminUsers: 0
});

const canManageAdmins = computed(() => permissions.value.canManageAdmins === true);

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
    label: "Suspended",
    value: summary.value.suspendedUsers,
    description: "Accounts temporarily disabled by an admin."
  },
  {
    label: "Blocked",
    value: summary.value.blockedUsers,
    description: "Accounts explicitly blocked from the platform."
  },
  {
    label: "Admins",
    value: summary.value.adminUsers,
    description: "Accounts with back-office access."
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

function createInviteForm() {
  return {
    username: "",
    email: "",
    phone: "",
    isSuperAdmin: false
  };
}

function resetInviteForm() {
  inviteForm.value = createInviteForm();
  inviteErrorMessage.value = "";
  inviteSuccessMessage.value = "";
}

async function loadUsers(options = {}) {
  const { showSuccess = false, preserveFeedback = false } = options;

  loading.value = true;
  if (!preserveFeedback) {
    errorMessage.value = "";
    successMessage.value = "";
  }

  try {
    const response = await $fetch("/api/admin/users", {
      credentials: "include"
    });

    users.value = response.users || [];
    summary.value = response.summary || summary.value;
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

async function submitAdminInvite() {
  if (!canManageAdmins.value || inviteLoading.value) {
    return;
  }

  inviteLoading.value = true;
  inviteErrorMessage.value = "";
  inviteSuccessMessage.value = "";

  try {
    const response = await $fetch("/api/admin/users/admins", {
      method: "POST",
      credentials: "include",
      body: {
        username: inviteForm.value.username.trim(),
        email: inviteForm.value.email.trim(),
        phone: inviteForm.value.phone.trim(),
        isSuperAdmin: Boolean(inviteForm.value.isSuperAdmin)
      }
    });

    inviteSuccessMessage.value =
      response?.message || "Admin invitation sent. The new admin can now activate their account.";
    inviteForm.value = createInviteForm();
    await loadUsers({ preserveFeedback: true });
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    inviteErrorMessage.value = error?.data?.message || "Unable to invite this admin.";
  } finally {
    inviteLoading.value = false;
  }
}

function statusClass(status) {
  if (status === "Active") {
    return "bg-violet-700/10 text-violet-700";
  }

  if (status === "Pending verification") {
    return "bg-amber-950 text-amber-300";
  }

  if (status === "Suspended") {
    return "bg-amber-950 text-amber-300";
  }

  if (status === "Blocked") {
    return "bg-red-950 text-red-300";
  }

  return "bg-slate-800 text-slate-100";
}

function actionClass(action) {
  if (action.tone === "danger") {
    return "border-red-900 bg-red-950/50 text-red-200 hover:border-red-700 hover:text-red-100";
  }

  if (action.tone === "warning") {
    return "border-amber-900 bg-amber-950/40 text-amber-200 hover:border-amber-700 hover:text-amber-100";
  }

  return "border-slate-750 bg-black text-slate-100 hover:border-violet-600 hover:text-violet-300";
}

function getUserActions(user) {
  if (user.id === permissions.value.currentUserId) {
    return [];
  }

  const actions = [];
  const isSuperAdmin = permissions.value.isSuperAdmin === true;

  if (!user.isAdmin || isSuperAdmin) {
    if (user.statusCode === "active") {
      actions.push({
        key: "suspend",
        kind: "account-status",
        label: "Suspend",
        tone: "warning",
        value: "suspended"
      });
      actions.push({
        key: "block",
        kind: "account-status",
        label: "Block",
        tone: "danger",
        value: "blocked"
      });
    } else if (user.statusCode === "suspended") {
      actions.push({
        key: "reactivate",
        kind: "account-status",
        label: "Reactivate",
        tone: "primary",
        value: "active"
      });
      actions.push({
        key: "block",
        kind: "account-status",
        label: "Block",
        tone: "danger",
        value: "blocked"
      });
    } else if (user.statusCode === "blocked") {
      actions.push({
        key: "reactivate",
        kind: "account-status",
        label: "Reactivate",
        tone: "primary",
        value: "active"
      });
    } else if (user.statusCode === "pending_verification") {
      actions.push({
        key: "block",
        kind: "account-status",
        label: "Block",
        tone: "danger",
        value: "blocked"
      });
    }
  }

  if (isSuperAdmin && user.isAdmin) {
    if (user.isSuperAdmin) {
      actions.push({
        key: "remove-super-admin",
        kind: "admin-access",
        label: "Remove super admin",
        tone: "warning",
        value: "remove_super_admin"
      });
    }

    actions.push({
      key: "remove-admin",
      kind: "admin-access",
      label: "Remove admin",
      tone: "danger",
      value: "remove_admin"
    });
  }

  return actions;
}

function getActionConfirmation(user, action) {
  if (action.kind === "account-status" && action.value === "active") {
    return `Reactivate ${user.username}?`;
  }

  if (action.kind === "account-status" && action.value === "suspended") {
    return `Suspend ${user.username}? They will no longer be able to sign in.`;
  }

  if (action.kind === "account-status" && action.value === "blocked") {
    return `Block ${user.username}? This will immediately prevent access to the platform.`;
  }

  if (action.value === "remove_super_admin") {
    return `Remove super admin access for ${user.username}?`;
  }

  return `Remove admin access for ${user.username}?`;
}

async function handleUserAction(user, action) {
  if (actionLoadingUserId.value === user.id) {
    return;
  }

  if (typeof window !== "undefined" && !window.confirm(getActionConfirmation(user, action))) {
    return;
  }

  actionLoadingUserId.value = user.id;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const route =
      action.kind === "account-status"
        ? `/api/admin/users/${user.id}/account-status`
        : `/api/admin/users/${user.id}/admin-access`;
    const body =
      action.kind === "account-status" ? { status: action.value } : { action: action.value };
    const response = await $fetch(route, {
      method: "PATCH",
      credentials: "include",
      body
    });

    await loadUsers({ preserveFeedback: true });
    successMessage.value = response?.message || "User updated successfully.";
  } catch (error) {
    if (error?.statusCode === 401) {
      await navigateTo("/login");
      return;
    }

    if (error?.statusCode === 403) {
      await navigateTo("/forbidden");
      return;
    }

    errorMessage.value = error?.data?.message || "Unable to update this user.";
  } finally {
    actionLoadingUserId.value = null;
  }
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
