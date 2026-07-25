<template>
  <main class="min-h-screen bg-black px-4 py-6 text-slate-100 sm:px-5 sm:py-8">
    <div
      class="mx-auto grid w-full max-w-[1280px] border border-slate-900 lg:grid-cols-[320px_minmax(0,1fr)]"
    >
      <AdminSidebar class="lg:hidden" />
      <aside
        class="hidden min-h-[1160px] flex-col border-r border-slate-800 bg-slate-950/80 lg:flex"
      >
        <div class="flex min-h-[116px] items-center gap-4 border-b border-slate-800 px-8">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-750 text-title-4 text-violet-400"
          >
            {{ adminInitials }}
          </div>
          <div class="min-w-0">
            <p class="truncate text-body-1 uppercase">
              {{ auth.user?.username || "Administrator" }}
            </p>
            <span
              class="mt-2 inline-flex border border-slate-750 px-2 py-0.5 text-subtitle-3 uppercase text-slate-400"
              >Admin</span
            >
          </div>
        </div>

        <nav class="px-4 py-8" aria-label="Admin navigation">
          <p class="px-4 text-subtitle-3 uppercase tracking-[0.25em] text-slate-500">Main menu</p>
          <div class="mt-5 grid">
            <NuxtLink
              v-for="item in mainNavigation"
              :key="item.route"
              :to="item.route"
              class="flex min-h-12 items-center gap-4 border-l-4 px-4 text-body-1 transition-colors"
              :class="
                item.route === '/admin'
                  ? 'border-slate-100 bg-slate-850 text-slate-100'
                  : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              "
            >
              <span class="w-7 text-center text-subtitle-2">{{ item.icon }}</span
              >{{ item.label }}
            </NuxtLink>
          </div>

          <p class="mt-10 px-4 text-subtitle-3 uppercase tracking-[0.25em] text-slate-500">
            System
          </p>
          <div class="mt-5 grid">
            <NuxtLink
              v-for="item in systemNavigation"
              :key="item.route"
              :to="item.route"
              class="flex min-h-12 items-center gap-4 border-l-4 border-transparent px-4 text-body-1 text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-100"
            >
              <span class="w-7 text-center text-subtitle-2">{{ item.icon }}</span
              >{{ item.label }}
            </NuxtLink>
          </div>
        </nav>

        <div class="mt-auto flex items-center justify-between border-t border-slate-800 px-8 py-7">
          <div>
            <p class="text-subtitle-3 uppercase text-slate-500">Admin session</p>
            <p class="mt-1 text-subtitle-2 text-green-400">● Authenticated</p>
          </div>
          <button
            type="button"
            class="text-title-3 text-slate-300"
            aria-label="Sign out"
            @click="handleLogout"
          >
            ↪
          </button>
        </div>
      </aside>

      <section class="min-w-0 bg-black">
        <header
          class="flex min-h-[64px] flex-col gap-4 border-b border-slate-800 bg-slate-950/60 px-5 py-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <p class="text-title-3 uppercase">
            Make It Art / <span class="text-violet-600">Admin</span>
          </p>
          <label
            class="flex h-11 w-full items-center gap-3 border border-slate-800 bg-black px-4 xl:max-w-[310px]"
          >
            <span aria-hidden="true">⌕</span
            ><input
              v-model.trim="searchTerm"
              type="search"
              placeholder="Global Search..."
              class="min-w-0 flex-1 bg-transparent text-footer text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
        </header>

        <div class="p-5 lg:p-8">
          <div
            v-if="errorMessage"
            class="mb-6 border border-red-900 bg-red-950 px-5 py-4 text-footer text-red-200"
          >
            {{ errorMessage }}
          </div>

          <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article
              v-for="stat in stats"
              :key="stat.label"
              class="min-h-[128px] border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6"
            >
              <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">
                {{ stat.label }}
              </p>
              <p class="mt-5 text-title-3 text-slate-100">{{ loading ? "—" : stat.value }}</p>
              <p class="mt-2 line-clamp-2 text-subtitle-3 text-slate-500">{{ stat.description }}</p>
            </article>
          </section>

          <section class="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_278px]">
            <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black">
              <div class="flex items-center justify-between border-b border-slate-800 px-6 py-5">
                <h2 class="text-body-1 uppercase tracking-[0.08em]">Platform overview</h2>
                <button
                  type="button"
                  class="border border-slate-750 px-4 py-1 text-subtitle-2"
                  :disabled="loading"
                  @click="loadDashboard"
                >
                  {{ loading ? "..." : "Refresh" }}
                </button>
              </div>
              <div class="flex min-h-[340px] items-end gap-7 px-8 pb-10 pt-14">
                <div
                  v-for="bar in chartBars"
                  :key="bar.label"
                  class="flex flex-1 flex-col items-center justify-end gap-4 self-stretch"
                >
                  <span class="text-subtitle-2 text-slate-400">{{ bar.value }}</span>
                  <div
                    class="w-full max-w-16 bg-violet-700/60"
                    :style="{ height: `${bar.height}%` }"
                  />
                  <span class="text-subtitle-3 uppercase text-slate-500">{{ bar.label }}</span>
                </div>
              </div>
            </article>

            <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black">
              <div class="flex items-center justify-between border-b border-slate-800 px-6 py-5">
                <h2 class="text-body-1 uppercase">Moderation queue</h2>
                <span
                  class="border border-amber-900 bg-amber-950 px-3 py-1 text-subtitle-3 text-amber-300"
                  >{{ pendingApplications.length }} Pending</span
                >
              </div>
              <div v-if="!pendingApplications.length" class="p-6 text-footer text-slate-500">
                No pending applications.
              </div>
              <div v-else class="divide-y divide-slate-800">
                <article
                  v-for="application in pendingApplications.slice(0, 4)"
                  :key="application.id"
                  class="p-6"
                >
                  <p class="truncate text-body-1">{{ application.displayName }}</p>
                  <p class="mt-2 truncate text-subtitle-2 text-slate-500">
                    {{ application.artType }} · {{ application.email }}
                  </p>
                  <div class="mt-4 flex gap-3">
                    <button
                      type="button"
                      class="border border-green-900 bg-green-950 px-3 py-1 text-subtitle-3 text-green-300"
                      :disabled="reviewingId === application.id"
                      @click="reviewApplication(application.id, 'approved')"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      class="border border-red-900 bg-red-950 px-3 py-1 text-subtitle-3 text-red-300"
                      :disabled="reviewingId === application.id"
                      @click="reviewApplication(application.id, 'rejected')"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              </div>
            </article>
          </section>

          <section class="mt-8 border border-slate-800 bg-gradient-to-br from-slate-950 to-black">
            <div class="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <h2 class="text-body-1 uppercase tracking-[0.08em]">User management</h2>
              <NuxtLink
                to="/admin/users"
                class="border border-violet-700 px-4 py-2 text-subtitle-2 text-violet-400"
                >View all users</NuxtLink
              >
            </div>
            <p class="border-b border-slate-800 px-5 py-3 text-subtitle-3 text-slate-500 sm:hidden">
              Swipe horizontally to view every column.
            </p>
            <div class="overflow-x-auto">
              <table class="min-w-[760px] sm:min-w-full">
                <thead
                  class="border-b border-slate-800 bg-slate-950 text-left text-subtitle-3 uppercase tracking-[0.12em] text-slate-500"
                >
                  <tr>
                    <th class="px-6 py-4">User</th>
                    <th class="px-6 py-4">Role</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4">Orders</th>
                    <th class="px-6 py-4">Joining date</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  <tr v-for="user in filteredUsers.slice(0, 5)" :key="user.id">
                    <td class="px-6 py-4">
                      <p class="text-footer text-slate-100">{{ user.username }}</p>
                      <p class="mt-1 text-subtitle-3 text-slate-500">{{ user.email }}</p>
                    </td>
                    <td class="px-6 py-4 text-footer text-slate-400">{{ user.role }}</td>
                    <td class="px-6 py-4">
                      <span
                        class="border px-3 py-1 text-subtitle-3"
                        :class="statusClass(user.status)"
                        >{{ user.status }}</span
                      >
                    </td>
                    <td class="px-6 py-4 text-footer text-slate-400">{{ user.ordersCount }}</td>
                    <td class="px-6 py-4 text-footer text-slate-500">
                      {{ formatDate(user.createdAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!loading && !filteredUsers.length" class="p-6 text-footer text-slate-500">
                No users found.
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { navigateTo } from "#app";
import { useAuthStore } from "~/stores/auth";
import { getArtistInitials } from "~/utils/marketplace";

definePageMeta({ middleware: "admin" });

const auth = useAuthStore();
const loading = ref(true);
const reviewingId = ref(null);
const errorMessage = ref("");
const searchTerm = ref("");
const stats = ref([]);
const users = ref([]);
const applications = ref([]);
const adminInitials = computed(() => getArtistInitials(auth.user?.username || "Admin"));
const pendingApplications = computed(() =>
  applications.value.filter((application) => application.status === "pending")
);
const filteredUsers = computed(() => {
  const search = searchTerm.value.toLowerCase();
  if (!search) return users.value;
  return users.value.filter(
    (user) =>
      user.username.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)
  );
});
const chartBars = computed(() => {
  const numericStats = stats.value.map((stat) => ({
    label: stat.label,
    value: parseMetricValue(stat.value)
  }));
  const maximum = Math.max(...numericStats.map((stat) => stat.value), 1);
  return numericStats.map((stat) => ({
    ...stat,
    height: Math.max((stat.value / maximum) * 100, stat.value ? 8 : 2)
  }));
});
const mainNavigation = [
  { label: "Analytics", route: "/admin", icon: "▦" },
  { label: "Users", route: "/admin/users", icon: "US" },
  { label: "Artists", route: "/admin/artists", icon: "AR" },
  { label: "Artworks", route: "/admin/artworks", icon: "AW" },
  { label: "Orders", route: "/admin/orders", icon: "OR" },
  { label: "Payments", route: "/admin/payments", icon: "PY" },
  { label: "Audit", route: "/admin/audit-log", icon: "LG" }
];
const systemNavigation = [
  { label: "Applications", route: "/admin/artist-applications", icon: "AP" },
  { label: "Settings", route: "/admin/settings", icon: "ST" }
];

onMounted(loadDashboard);

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const [dashboard, usersResponse, applicationsResponse] = await Promise.all([
      $fetch("/api/admin/dashboard", { credentials: "include" }),
      $fetch("/api/admin/users", { credentials: "include" }),
      $fetch("/api/admin/artist-applications", { credentials: "include" })
    ]);
    stats.value = dashboard.stats || [];
    users.value = usersResponse.users || [];
    applications.value = applicationsResponse.applications || [];
  } catch (error) {
    if (error?.statusCode === 401) return navigateTo("/login");
    if (error?.statusCode === 403) return navigateTo("/forbidden");
    errorMessage.value = error?.data?.message || "Unable to load admin dashboard.";
  } finally {
    loading.value = false;
  }
}

async function reviewApplication(id, status) {
  reviewingId.value = id;
  try {
    const response = await $fetch(`/api/admin/artist-applications/${id}`, {
      method: "PATCH",
      credentials: "include",
      body: { status }
    });
    applications.value = applications.value.map((application) =>
      application.id === id ? response.application : application
    );
  } catch (error) {
    errorMessage.value = error?.data?.message || "Unable to review artist application.";
  } finally {
    reviewingId.value = null;
  }
}

function parseMetricValue(value) {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function statusClass(status) {
  if (status === "Active") return "border-green-900 bg-green-950 text-green-300";
  if (status === "Inactive") return "border-red-900 bg-red-950 text-red-300";
  return "border-amber-900 bg-amber-950 text-amber-300";
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value)
      )
    : "—";
}

async function handleLogout() {
  await auth.logout();
  await navigateTo("/login");
}
</script>
