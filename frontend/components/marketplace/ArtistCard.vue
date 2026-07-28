<template>
  <article
    class="grid min-w-0 gap-5 rounded-[24px] border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-slate-750 sm:rounded-[28px] sm:p-6"
  >
    <div class="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold text-violet-200 ring-1 ring-violet-700/30"
        >
          <img
            v-if="artist.avatarUrl"
            :src="artist.avatarUrl"
            :alt="artist.displayName"
            class="h-full w-full rounded-full object-cover"
          />
          <template v-else>{{ initials }}</template>
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              :to="`/artists/${artist.id}`"
              class="text-lg font-semibold text-white transition hover:text-violet-200"
            >
              {{ artist.displayName }}
            </NuxtLink>
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              :class="
                artist.verified ? 'bg-violet-700/10 text-violet-200' : 'bg-amber-950 text-amber-300'
              "
            >
              {{ artist.verified ? "Verified" : "Under review" }}
            </span>
          </div>
          <p class="mt-2 text-sm text-slate-500">
            {{ artist.artType || "Digital art" }}
          </p>
        </div>
      </div>

      <button
        v-if="showFollowAction"
        type="button"
        class="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        :class="
          artist.isFollowed
            ? 'border-amber-300 bg-amber-300/10 text-amber-200'
            : 'border-slate-750 bg-slate-850 text-slate-100 hover:border-violet-700'
        "
        :disabled="followLoading"
        @click="$emit('toggle-follow', artist)"
      >
        {{ followLoading ? "..." : artist.isFollowed ? "Following" : "Follow" }}
      </button>
    </div>

    <p class="line-clamp-4 text-sm leading-7 text-slate-400">
      {{ artist.bio || "Profile details coming soon." }}
    </p>

    <div class="flex flex-wrap gap-2">
      <span
        v-for="style in limitedStyles"
        :key="style"
        class="rounded-full bg-slate-850 px-3 py-1 text-xs font-medium text-slate-100"
      >
        {{ style }}
      </span>
      <span
        v-if="!limitedStyles.length"
        class="rounded-full bg-slate-850 px-3 py-1 text-xs font-medium text-slate-500"
      >
        Creative universe in progress
      </span>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
        <p class="text-xs uppercase tracking-widest text-slate-500">Artworks</p>
        <p class="mt-2 text-xl font-semibold text-slate-100">
          {{ artist.stats?.artworks || 0 }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
        <p class="text-xs uppercase tracking-widest text-slate-500">Followers</p>
        <p class="mt-2 text-xl font-semibold text-slate-100">
          {{ artist.stats?.followers || 0 }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
        <p class="text-xs uppercase tracking-widest text-slate-500">Collections</p>
        <p class="mt-2 text-xl font-semibold text-slate-100">
          {{ artist.stats?.collections || 0 }}
        </p>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { getArtistInitials } from "~/utils/marketplace";

const props = defineProps({
  artist: {
    type: Object,
    required: true
  },
  followLoading: {
    type: Boolean,
    default: false
  },
  showFollowAction: {
    type: Boolean,
    default: false
  }
});

defineEmits(["toggle-follow"]);

const limitedStyles = computed(() => {
  return Array.isArray(props.artist.styles) ? props.artist.styles.slice(0, 4) : [];
});

const initials = computed(() => getArtistInitials(props.artist.displayName));
</script>
