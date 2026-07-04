<template>
  <article
    class="grid gap-5 rounded-[28px] border border-[#1A1F2A] bg-[linear-gradient(160deg,_rgba(74,108,247,0.12),_rgba(5,8,16,0.95)_42%),linear-gradient(180deg,_#090D17,_#05070D)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-[#34405B]"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#141C34] text-lg font-semibold text-[#D7E3FF] ring-1 ring-[#4A6CF7]/30"
        >
          {{ initials }}
        </div>

        <div>
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              :to="`/artists/${artist.id}`"
              class="text-lg font-semibold text-white transition hover:text-[#D2DEFF]"
            >
              {{ artist.displayName }}
            </NuxtLink>
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
              :class="
                artist.verified
                  ? 'bg-[#4A6CF7]/12 text-[#BCD0FF]'
                  : 'bg-[#3F2A11] text-[#F3D38A]'
              "
            >
              {{ artist.verified ? "Verifie" : "En revue" }}
            </span>
          </div>
          <p class="mt-2 text-sm text-[#8D9BB2]">
            {{ artist.artType || "Art numerique" }}
          </p>
        </div>
      </div>

      <button
        v-if="showFollowAction"
        type="button"
        class="inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition"
        :class="
          artist.isFollowed
            ? 'border-[#F2C97D] bg-[#F2C97D]/10 text-[#F7D990]'
            : 'border-[#1F2A44] bg-[#0D1220] text-[#D3DCEE] hover:border-[#4A6CF7]'
        "
        :disabled="followLoading"
        @click="$emit('toggle-follow', artist)"
      >
        {{ followLoading ? "..." : artist.isFollowed ? "Suivi" : "Suivre" }}
      </button>
    </div>

    <p class="line-clamp-4 text-sm leading-7 text-[#A4B0C0]">
      {{ artist.bio || "Presentation a venir." }}
    </p>

    <div class="flex flex-wrap gap-2">
      <span
        v-for="style in limitedStyles"
        :key="style"
        class="rounded-full bg-[#101728] px-3 py-1 text-xs font-medium text-[#C7D4EA]"
      >
        {{ style }}
      </span>
      <span
        v-if="!limitedStyles.length"
        class="rounded-full bg-[#101728] px-3 py-1 text-xs font-medium text-[#8D9BB2]"
      >
        Univers en construction
      </span>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl border border-[#151B29] bg-[#0B101A] px-4 py-3">
        <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">Oeuvres</p>
        <p class="mt-2 text-xl font-semibold text-[#EFF4FF]">{{ artist.stats?.artworks || 0 }}</p>
      </div>
      <div class="rounded-2xl border border-[#151B29] bg-[#0B101A] px-4 py-3">
        <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">Followers</p>
        <p class="mt-2 text-xl font-semibold text-[#EFF4FF]">
          {{ artist.stats?.followers || 0 }}
        </p>
      </div>
      <div class="rounded-2xl border border-[#151B29] bg-[#0B101A] px-4 py-3">
        <p class="text-xs uppercase tracking-[0.16em] text-[#63728B]">Collections</p>
        <p class="mt-2 text-xl font-semibold text-[#EFF4FF]">
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
