<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1040px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <AppStatePanel
        v-if="pending"
        type="loading"
        title="Loading member profile"
        message="The public member profile is being retrieved."
      />

      <AppStatePanel
        v-else-if="errorMessage"
        type="error"
        title="Unable to load this member"
        :message="errorMessage"
        action-label="Try again"
        :action-disabled="pending"
        @action="refresh"
      />

      <AppStatePanel
        v-else-if="!member"
        type="empty"
        title="Member not found"
        message="This public profile is no longer available."
      />

      <template v-else>
        <section class="overflow-hidden rounded-[28px] border border-[#1A1F2A] bg-[#090017]">
          <div
            class="h-44 w-full bg-[radial-gradient(circle_at_top,_rgba(74,108,247,0.28),_transparent_55%),linear-gradient(180deg,_rgba(9,0,23,0.92),_rgba(1,5,14,1))]"
            :style="heroStyle"
          />

          <div class="grid gap-6 px-6 pb-6 pt-0 md:px-8">
            <div class="-mt-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div class="flex items-end gap-4">
                <div
                  class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#01050E] bg-[#10151E] text-3xl font-semibold text-white"
                >
                  <img
                    v-if="member.avatarUrl"
                    :src="member.avatarUrl"
                    :alt="member.displayName"
                    class="h-full w-full object-cover"
                  />
                  <template v-else>{{ initials }}</template>
                </div>

                <div class="pb-2">
                  <div class="flex flex-wrap items-center gap-3">
                    <h1 class="text-[clamp(2rem,3vw,3rem)] font-semibold leading-[1.05] text-white">
                      {{ member.displayName }}
                    </h1>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
                      :class="
                        member.isArtist
                          ? 'bg-[#4A6CF7]/12 text-[#9DB2FF]'
                          : 'bg-[#151B29] text-[#B8C2D8]'
                      "
                    >
                      {{ member.isArtist ? "Artist member" : "Collector member" }}
                    </span>
                  </div>

                  <p v-if="member.username" class="mt-3 text-sm text-[#8D98AA]">
                    @{{ member.username }}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap gap-3">
                <NuxtLink
                  v-if="member.profileUrl && member.profileUrl !== currentMemberRoute"
                  :to="member.profileUrl"
                  class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
                >
                  {{ member.isArtist ? "Open artist portfolio" : "Refresh profile" }}
                </NuxtLink>
                <NuxtLink
                  v-if="isOwnProfile"
                  to="/account-settings"
                  class="inline-flex items-center justify-center rounded-2xl bg-[#4A6CF7] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#6d8bff]"
                >
                  Open account settings
                </NuxtLink>
              </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <article class="rounded-[24px] border border-[#1A1F2A] bg-[#050916] p-6">
                <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Biography</p>
                <p class="mt-4 text-sm leading-7 text-[#A0ADB4]">
                  {{ member.bio || "This member has not added a public bio yet." }}
                </p>
              </article>

              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <article class="rounded-[24px] border border-[#1A1F2A] bg-[#050916] p-6">
                  <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Joined</p>
                  <p class="mt-4 text-lg font-semibold text-white">
                    {{ formatDate(member.joinedAt) }}
                  </p>
                </article>

                <article
                  v-if="member.isArtist && member.stats"
                  class="rounded-[24px] border border-[#1A1F2A] bg-[#050916] p-6"
                >
                  <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Artist stats</p>
                  <div class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div>
                      <p class="text-xs uppercase tracking-[0.14em] text-[#7F8A99]">Artworks</p>
                      <p class="mt-2 text-lg font-semibold text-white">
                        {{ member.stats.artworks }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs uppercase tracking-[0.14em] text-[#7F8A99]">Followers</p>
                      <p class="mt-2 text-lg font-semibold text-white">
                        {{ member.stats.followers }}
                      </p>
                    </div>
                    <div>
                      <p class="text-xs uppercase tracking-[0.14em] text-[#7F8A99]">Collections</p>
                      <p class="mt-2 text-lg font-semibold text-white">
                        {{ member.stats.collections }}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "#app";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const auth = useAuthStore();

const { data, pending, error, refresh } = await useFetch(`/api/members/${route.params.id}`, {
  credentials: "include",
  default: () => ({
    member: null
  })
});

const member = computed(() => data.value?.member || null);
const errorMessage = computed(() => error.value?.data?.message || "");
const currentMemberRoute = computed(() => `/members/${route.params.id}`);

const initials = computed(() => {
  const label = String(member.value?.displayName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return label || "M";
});

const heroStyle = computed(() => {
  return member.value?.coverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(9,0,23,0.2), rgba(1,5,14,0.92)), url(${member.value.coverUrl})`,
        backgroundPosition: "center",
        backgroundSize: "cover"
      }
    : {};
});

const isOwnProfile = computed(() => Number(auth.user?.id) === Number(member.value?.id));

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}
</script>
