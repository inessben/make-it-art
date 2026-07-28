<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Account</p>
          <h1 class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white">
            Follows & Followers
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Explore the artists you follow and, if you have an artist profile, the collectors who
            follow you.
          </p>
        </div>

        <NuxtLink
          to="/account-settings"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Back to account
        </NuxtLink>
      </header>

      <section class="flex flex-wrap gap-2 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-2">
        <button
          type="button"
          class="rounded-[16px] px-5 py-2.5 text-sm font-semibold transition"
          :class="
            activeTab === 'following'
              ? 'bg-[#4A6CF7] text-black'
              : 'text-[#C9D6FF] hover:bg-[#101827]'
          "
          @click="setActiveTab('following')"
        >
          Following
        </button>
        <button
          type="button"
          class="rounded-[16px] px-5 py-2.5 text-sm font-semibold transition"
          :class="
            activeTab === 'followers'
              ? 'bg-[#4A6CF7] text-black'
              : 'text-[#C9D6FF] hover:bg-[#101827]'
          "
          @click="setActiveTab('followers')"
        >
          Followers
        </button>
      </section>

      <section v-if="activeTab === 'following'" class="grid gap-4">
        <div v-if="followingPending" class="text-sm text-[#A0ADB4]">Loading your follows...</div>
        <div
          v-else-if="followingErrorMessage"
          class="rounded-[24px] border border-[#6C1F2D] bg-[#261018] p-6 text-[#FBC8D0]"
        >
          {{ followingErrorMessage }}
        </div>
        <div
          v-else-if="!followedArtists.length"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
        >
          You are not following any artist yet.
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <ArtistCard
            v-for="artist in followedArtists"
            :key="artist.id"
            :artist="artist"
            :follow-loading="Boolean(followLoading[artist.id])"
            :show-follow-action="canFollowArtist(artist)"
            @toggle-follow="toggleFollow"
          />
        </div>
      </section>

      <section v-else class="grid gap-4">
        <div v-if="followersPending" class="text-sm text-[#A0ADB4]">Loading your followers...</div>
        <div
          v-else-if="followersErrorMessage"
          class="rounded-[24px] border border-[#6C1F2D] bg-[#261018] p-6 text-[#FBC8D0]"
        >
          {{ followersErrorMessage }}
        </div>
        <div
          v-else-if="followersUnavailable"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
        >
          Followers are available only if you have an artist profile.
        </div>
        <div
          v-else-if="!followers.length"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
        >
          No followers yet.
        </div>
        <div class="overflow-hidden rounded-[24px] border border-[#1A1F2A] bg-[#090017]">
          <NuxtLink
            v-for="follower in followers"
            :key="follower.id"
            :to="follower.profileUrl"
            class="group flex items-center justify-between gap-4 border-b border-[#1A1F2A] px-5 py-4 transition hover:bg-[#0B1020] last:border-b-0"
          >
            <div class="flex min-w-0 items-center gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2A3144] bg-[#10151E] text-sm font-semibold text-[#E6EDF7]"
              >
                <img
                  v-if="follower.avatarUrl"
                  :src="follower.avatarUrl"
                  :alt="follower.displayName"
                  class="h-full w-full object-cover"
                />
                <template v-else>{{ getInitials(follower.displayName) }}</template>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-semibold text-white sm:text-base">
                    {{ follower.displayName }}
                  </p>
                  <span
                    class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    :class="
                      follower.isArtist
                        ? 'bg-[#4A6CF7]/12 text-[#9DB2FF]'
                        : 'bg-[#151B29] text-[#B8C2D8]'
                    "
                  >
                    {{ follower.isArtist ? "Artist" : "Collector" }}
                  </span>
                </div>

                <p v-if="follower.username" class="mt-1 text-xs text-[#8D98AA] sm:text-sm">
                  @{{ follower.username }}
                </p>
              </div>
            </div>
            <span
              class="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-[#C9D6FF] transition group-hover:text-white"
            >
              Open
            </span>
          </NuxtLink>
        </div>
      </section>

      <div
        v-if="actionMessage"
        class="rounded-2xl border border-[#203357] bg-[#091121] px-5 py-4 text-sm text-[#BFD0FF]"
      >
        {{ actionMessage }}
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { navigateTo, useRoute, useRouter } from "#app";
import { storeToRefs } from "pinia";
import ArtistCard from "~/components/marketplace/ArtistCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth"
});

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const route = useRoute();
const router = useRouter();

if (auth.isAdmin) {
  await navigateTo("/admin");
}

function normalizeTab(value) {
  return value === "followers" ? "followers" : "following";
}

const activeTab = ref(normalizeTab(route.query.tab));
const { actionMessage, followLoading, canFollowArtist, toggleFollow } = useMarketplaceActions(auth);

const {
  data: followingData,
  pending: followingPending,
  error: followingError
} = await useFetch("/api/follows/me", {
  credentials: "include",
  default: () => ({
    artists: []
  })
});

const followedArtists = computed(() => followingData.value?.artists || []);
const followingErrorMessage = computed(() => followingError.value?.data?.message || "");

const followersUnavailable = computed(() => !user.value?.artist);

const followersData = ref({ followers: [] });
const followersPending = ref(false);
const followersErrorMessage = ref("");

if (!followersUnavailable.value) {
  const { data, pending, error } = await useFetch("/api/artists/me/followers", {
    credentials: "include",
    default: () => ({
      followers: []
    })
  });

  followersData.value = data.value;
  followersPending.value = pending.value;
  followersErrorMessage.value = error.value?.data?.message || "";
}

const followers = computed(() => followersData.value?.followers || []);

watch(
  () => route.query.tab,
  (value) => {
    activeTab.value = normalizeTab(value);
  }
);

watch(activeTab, async (value) => {
  if (normalizeTab(route.query.tab) === value) {
    return;
  }

  await router.replace({
    query: {
      ...route.query,
      tab: value
    }
  });
});

function setActiveTab(value) {
  activeTab.value = normalizeTab(value);
}

function getInitials(value) {
  const label = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return label || "M";
}
</script>
