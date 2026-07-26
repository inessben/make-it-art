<template>
  <AdminShell
    title="Analytics"
    description="Self-hosted Umami data, embedded directly - no separate dashboard to open."
  >
    <template #actions>
      <div class="flex flex-wrap gap-3">
        <select
          v-model="range"
          class="border border-slate-800 bg-black px-4 py-2 text-subtitle-2 text-slate-100"
        >
          <option v-for="option in rangeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button
          type="button"
          class="inline-flex items-center justify-center border border-slate-750 bg-black px-4 py-2 text-subtitle-2 uppercase tracking-[0.12em] text-slate-100 transition hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
          :disabled="loading"
          @click="loadAll"
        >
          {{ loading ? "Refreshing..." : "Refresh" }}
        </button>
      </div>
    </template>

    <div
      v-if="errorMessage"
      class="border border-red-900 bg-red-950 px-5 py-4 text-footer text-red-200"
    >
      {{ errorMessage }}
    </div>

    <section class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
      <article
        v-for="stat in kpiCards"
        :key="stat.label"
        class="min-h-[128px] border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6"
      >
        <p class="text-subtitle-2 uppercase tracking-[0.12em] text-slate-500">{{ stat.label }}</p>
        <p class="mt-5 text-title-3 text-slate-100">{{ loading ? "—" : stat.value }}</p>
      </article>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black">
      <div
        class="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Traffic over time</h2>
        <div class="flex gap-2">
          <button
            v-for="option in unitOptions"
            :key="option.value"
            type="button"
            class="border px-3 py-1 text-subtitle-3 uppercase"
            :class="
              unit === option.value
                ? 'border-violet-600 text-violet-300'
                : 'border-slate-800 text-slate-500'
            "
            @click="unit = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div class="p-6">
        <AdminLineChart :points="timeseriesPoints" aria-label="Pageviews over time" />
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-2">
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Top pages</h2>
        <div class="mt-5">
          <AdminBarList :items="toBarItems(pages)" />
        </div>
      </article>
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Traffic sources (referrers)</h2>
        <div class="mt-5">
          <AdminBarList :items="toBarItems(referrers, 'Direct / none')" />
        </div>
      </article>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
      <h2 class="text-body-1 uppercase tracking-[0.08em]">Campaigns (UTM)</h2>
      <div class="mt-5 grid gap-6 lg:grid-cols-3">
        <div>
          <p class="text-subtitle-3 uppercase tracking-[0.12em] text-slate-500">Source</p>
          <div class="mt-4">
            <AdminBarList :items="toBarItems(utmSources)" :max-items="5" />
          </div>
        </div>
        <div>
          <p class="text-subtitle-3 uppercase tracking-[0.12em] text-slate-500">Medium</p>
          <div class="mt-4">
            <AdminBarList :items="toBarItems(utmMediums)" :max-items="5" />
          </div>
        </div>
        <div>
          <p class="text-subtitle-3 uppercase tracking-[0.12em] text-slate-500">Campaign</p>
          <div class="mt-4">
            <AdminBarList :items="toBarItems(utmCampaigns)" :max-items="5" />
          </div>
        </div>
      </div>
      <p class="mt-4 text-subtitle-3 text-slate-500">
        An empty column just means no visits carried that UTM parameter in this period - add
        ?utm_source=...&utm_medium=...&utm_campaign=... to a campaign link to see it show up here.
      </p>
    </section>

    <section class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Browsers</h2>
        <div class="mt-5"><AdminBarList :items="toBarItems(browsers)" :max-items="5" /></div>
      </article>
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Operating systems</h2>
        <div class="mt-5"><AdminBarList :items="toBarItems(os)" :max-items="5" /></div>
      </article>
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Devices</h2>
        <div class="mt-5"><AdminBarList :items="toBarItems(devices)" :max-items="5" /></div>
      </article>
      <article class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Countries</h2>
        <div class="mt-5"><AdminBarList :items="toBarItems(countries)" :max-items="5" /></div>
      </article>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
      <h2 class="text-body-1 uppercase tracking-[0.08em]">Custom events</h2>
      <div class="mt-5">
        <AdminBarList :items="toBarItems(events)" />
      </div>
    </section>

    <section class="border border-slate-800 bg-gradient-to-br from-slate-950 to-black p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-body-1 uppercase tracking-[0.08em]">Conversion funnel</h2>
        <select
          v-model="selectedFunnel"
          class="border border-slate-800 bg-black px-4 py-2 text-subtitle-2 text-slate-100"
        >
          <option v-for="funnel in funnels" :key="funnel.key" :value="funnel.key">
            {{ funnel.label }}
          </option>
        </select>
      </div>
      <p v-if="funnelData" class="mt-4 text-body-1 text-slate-100">
        Overall conversion rate:
        <span class="text-violet-300">{{ funnelData.conversionRate }}%</span>
      </p>
      <div class="mt-5">
        <AdminFunnelChart :steps="funnelData?.steps || []" />
      </div>
    </section>
  </AdminShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { navigateTo } from "#app";
import AdminBarList from "~/components/admin/AdminBarList.vue";
import AdminFunnelChart from "~/components/admin/AdminFunnelChart.vue";
import AdminLineChart from "~/components/admin/AdminLineChart.vue";
import { useAdminAnalytics } from "~/composables/useAdminAnalytics";

definePageMeta({ middleware: "admin" });

const analytics = useAdminAnalytics();

const rangeOptions = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last 12 months" }
];
const unitOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" }
];

const range = ref("30d");
const unit = ref("day");
const loading = ref(true);
const errorMessage = ref("");

const overview = ref(null);
const activeVisitors = ref(0);
const timeseries = ref({ pageviews: [] });
const pages = ref([]);
const referrers = ref([]);
const utmSources = ref([]);
const utmMediums = ref([]);
const utmCampaigns = ref([]);
const browsers = ref([]);
const os = ref([]);
const devices = ref([]);
const countries = ref([]);
const events = ref([]);
const funnels = ref([]);
const selectedFunnel = ref("");
const funnelData = ref(null);

const kpiCards = computed(() => [
  { label: "Unique visitors", value: (overview.value?.uniqueVisitors ?? 0).toLocaleString() },
  { label: "Pageviews", value: (overview.value?.pageviews ?? 0).toLocaleString() },
  { label: "Sessions", value: (overview.value?.sessions ?? 0).toLocaleString() },
  {
    label: "Avg session duration",
    value: formatDuration(overview.value?.avgSessionDurationSeconds)
  },
  { label: "Bounce rate", value: `${overview.value?.bounceRate ?? 0}%` },
  { label: "Active now", value: (activeVisitors.value ?? 0).toLocaleString() }
]);

// Umami's pageviews endpoint has no native "week" unit: fetch daily data and
// bucket every 7 points client-side instead of pretending Umami supports it.
const timeseriesPoints = computed(() => {
  const rawPoints = (timeseries.value?.pageviews || []).map((point) => ({
    label: formatTimeseriesLabel(point.x),
    value: Number(point.y) || 0
  }));

  if (unit.value !== "week") return rawPoints;

  const buckets = [];
  for (let i = 0; i < rawPoints.length; i += 7) {
    const chunk = rawPoints.slice(i, i + 7);
    buckets.push({
      label: chunk[0]?.label,
      value: chunk.reduce((sum, point) => sum + point.value, 0)
    });
  }
  return buckets;
});

function toBarItems(list, emptyLabel = "(none)") {
  return (list?.data || []).map((entry) => ({
    label: entry.x || emptyLabel,
    value: Number(entry.y) || 0
  }));
}

function formatDuration(seconds) {
  if (!seconds) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function formatTimeseriesLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" }).format(date);
}

async function loadAll() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const requestUnit = unit.value === "week" ? "day" : unit.value;
    const [
      overviewResponse,
      activeResponse,
      timeseriesResponse,
      pagesResponse,
      referrersResponse,
      utmSourcesResponse,
      utmMediumsResponse,
      utmCampaignsResponse,
      browsersResponse,
      osResponse,
      devicesResponse,
      countriesResponse,
      eventsResponse
    ] = await Promise.all([
      analytics.getOverview(range.value),
      analytics.getActive(),
      analytics.getTimeseries(range.value, requestUnit),
      analytics.getPages(range.value),
      analytics.getReferrers(range.value),
      analytics.getUtmSources(range.value),
      analytics.getUtmMediums(range.value),
      analytics.getUtmCampaigns(range.value),
      analytics.getBrowsers(range.value),
      analytics.getOs(range.value),
      analytics.getDevices(range.value),
      analytics.getCountries(range.value),
      analytics.getEvents(range.value)
    ]);

    overview.value = overviewResponse;
    activeVisitors.value = activeResponse.activeVisitors;
    timeseries.value = timeseriesResponse;
    pages.value = pagesResponse;
    referrers.value = referrersResponse;
    utmSources.value = utmSourcesResponse;
    utmMediums.value = utmMediumsResponse;
    utmCampaigns.value = utmCampaignsResponse;
    browsers.value = browsersResponse;
    os.value = osResponse;
    devices.value = devicesResponse;
    countries.value = countriesResponse;
    events.value = eventsResponse;

    if (!funnels.value.length) {
      const funnelsResponse = await analytics.listFunnels();
      funnels.value = funnelsResponse.funnels || [];
      selectedFunnel.value = funnels.value[0]?.key || "";
    }

    if (selectedFunnel.value) {
      funnelData.value = await analytics.getFunnel(selectedFunnel.value, range.value);
    }
  } catch (error) {
    if (error?.statusCode === 401) return navigateTo("/login");
    if (error?.statusCode === 403) return navigateTo("/forbidden");
    errorMessage.value =
      error?.data?.message || "Unable to load analytics data. Is Umami configured and reachable?";
  } finally {
    loading.value = false;
  }
}

watch(range, loadAll);
watch(selectedFunnel, async () => {
  if (!selectedFunnel.value) return;
  funnelData.value = await analytics.getFunnel(selectedFunnel.value, range.value);
});

onMounted(loadAll);
</script>
