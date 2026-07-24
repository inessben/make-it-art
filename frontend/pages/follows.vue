<template>
  <main class="min-h-screen bg-black px-6 py-10 text-[#E6EDF7]">
    <section
      class="mx-auto grid w-full max-w-[1160px] gap-8 rounded-[32px] border border-[#1A1F2A] bg-[#01050E] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.22)]"
    >
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-[#4A6CF7]">Mon compte</p>
          <h1 class="mt-4 text-[clamp(2rem,2.6vw,3rem)] font-semibold leading-[1.05] text-white">
            Follows & Followers
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-6 text-[#A0ADB4]">
            Consultez les artistes que vous suivez et, si vous avez un profil artiste, les membres
            qui vous suivent.
          </p>
        </div>

        <NuxtLink
          to="/account-settings"
          class="inline-flex items-center justify-center rounded-2xl border border-[#1A1F2A] bg-[#10151E] px-5 py-3 text-sm font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
        >
          Retour au profil
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
          @click="activeTab = 'following'"
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
          @click="activeTab = 'followers'"
        >
          Followers
        </button>
      </section>

      <section v-if="activeTab === 'following'" class="grid gap-4">
        <div v-if="followingPending" class="text-sm text-[#A0ADB4]">
          Chargement de vos follows...
        </div>
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
          Vous ne suivez encore aucun artiste.
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <ArtistCard
            v-for="artist in followedArtists"
            :key="artist.id"
            :artist="artist"
            :follow-loading="Boolean(followLoading[artist.id])"
            :show-follow-action="true"
            @toggle-follow="toggleFollow"
          />
        </div>
      </section>

      <section v-else class="grid gap-4">
        <div v-if="followersPending" class="text-sm text-[#A0ADB4]">
          Chargement de vos followers...
        </div>
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
          Les followers sont disponibles uniquement si vous avez un profil artiste.
        </div>
        <div
          v-else-if="!followers.length"
          class="rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6 text-[#A0ADB4]"
        >
          Aucun follower pour le moment.
        </div>
        <div v-else class="grid gap-3 rounded-[24px] border border-[#1A1F2A] bg-[#090017] p-6">
          <div
            v-for="follower in followers"
            :key="follower.id"
            class="flex flex-col gap-1 rounded-2xl border border-[#1A1F2A] bg-[#01050E] px-5 py-4"
          >
            <p class="text-sm font-semibold text-white">
              {{ follower.username || "Utilisateur" }}
            </p>
            <p class="text-sm text-[#A0ADB4]">
              {{ follower.email || "" }}
            </p>
          </div>
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
import { computed, ref } from "vue";
import { navigateTo } from "#app";
import { storeToRefs } from "pinia";
import ArtistCard from "~/components/marketplace/ArtistCard.vue";
import { useMarketplaceActions } from "~/composables/useMarketplaceActions";
import { useAuthStore } from "~/stores/auth";

definePageMeta({
  middleware: "auth"
});

const auth = useAuthStore();
const { user } = storeToRefs(auth);

if (auth.isAdmin) {
  await navigateTo("/admin");
}

const activeTab = ref("following");
const { actionMessage, followLoading, toggleFollow } = useMarketplaceActions(auth);

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
</script>
