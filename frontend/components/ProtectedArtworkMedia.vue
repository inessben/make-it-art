<template>
  <div
    class="mia-protected-media relative overflow-hidden"
    :class="{ 'mia-protected-media--blackout': isBlackedOut }"
    @contextmenu.prevent
    @dragstart.prevent
  >
    <!-- Unmount pixels while locked so delayed OS captures cannot grab the image. -->
    <img
      v-if="src && !isBlackedOut"
      :src="src"
      :alt="alt"
      :loading="loading"
      :fetchpriority="fetchPriority"
      :class="imgClass"
      class="mia-protected-media__image pointer-events-none select-none"
      draggable="false"
      decoding="async"
    />
    <div
      v-else-if="src && isBlackedOut"
      :class="imgClass"
      class="mia-protected-media__image mia-protected-media__image--blank bg-black"
      aria-hidden="true"
    />
    <div v-else :class="fallbackClass">
      <slot name="fallback" />
    </div>

    <div
      v-show="!isBlackedOut"
      class="mia-protected-media__watermark mia-protected-media__watermark--brand"
      aria-hidden="true"
    >
      <span v-for="n in 12" :key="`brand-${n}`" class="mia-protected-media__watermark-tile">
        {{ brandWatermarkText }}
      </span>
    </div>

    <div
      v-show="!isBlackedOut"
      class="mia-protected-media__watermark mia-protected-media__watermark--viewer"
      aria-hidden="true"
    >
      <span
        v-for="n in 9"
        :key="`viewer-${n}`"
        class="mia-protected-media__watermark-tile mia-protected-media__watermark-tile--viewer"
      >
        {{ viewerWatermarkId }}
      </span>
    </div>

    <div v-show="!isBlackedOut" class="mia-protected-media__viewer-badge" aria-hidden="true">
      {{ viewerWatermarkId }}
    </div>

    <div
      class="mia-protected-media__shield absolute inset-0 z-[2]"
      aria-hidden="true"
      @contextmenu.prevent
      @dragstart.prevent
    />

    <div
      class="mia-protected-media__blackout absolute inset-0 z-[3] grid place-items-center bg-black px-4"
      :class="
        isBlackedOut
          ? 'opacity-100'
          : 'pointer-events-none opacity-0 transition-opacity duration-100'
      "
    >
      <div v-show="isBlackedOut" class="max-w-sm text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
          {{ blackoutMessage }}
        </p>
        <p
          v-if="blackoutMode === 'screen-share' || blackoutMode === 'cast'"
          class="mt-3 text-[11px] leading-5 text-slate-500"
        >
          Stop screen sharing or recording to reveal the preview again.
        </p>
        <p v-else-if="blackoutMode === 'sticky'" class="mt-3 text-[11px] leading-5 text-slate-500">
          Capture tool or focus loss detected. Reveal the preview again when you are done.
        </p>
        <button
          v-if="canDismissBlackout"
          type="button"
          class="mia-protected-media__unlock mt-4 inline-flex min-h-10 items-center justify-center border border-slate-600 bg-slate-950 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-violet-500"
          @click.stop.prevent="dismissBlackout"
        >
          Reveal preview
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useScreenshotGuard } from "~/composables/useScreenshotGuard";
import { useAuthStore } from "~/stores/auth";
import { buildViewerWatermarkId } from "~/utils/viewerWatermark";

const props = defineProps({
  src: {
    type: String,
    default: ""
  },
  alt: {
    type: String,
    default: ""
  },
  artworkId: {
    type: [Number, String],
    default: null
  },
  artistName: {
    type: String,
    default: ""
  },
  traceId: {
    type: String,
    default: ""
  },
  protectionLevel: {
    type: String,
    default: "soft"
  },
  imgClass: {
    type: String,
    default: "h-full w-full object-cover"
  },
  loading: {
    type: String,
    default: "lazy"
  },
  fetchPriority: {
    type: String,
    default: "auto"
  },
  fallbackClass: {
    type: String,
    default: "grid aspect-square place-items-center"
  }
});

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const { isBlackedOut, blackoutMessage, blackoutMode, canDismissBlackout, dismissBlackout } =
  useScreenshotGuard({ protectionLevel: props.protectionLevel });

const brandWatermarkText = computed(() => {
  const normalizedArtistName = String(props.artistName || "").trim();
  return normalizedArtistName ? `${normalizedArtistName} - No AI` : "Make It Art - No AI";
});

const viewerWatermarkId = computed(() => {
  if (props.traceId) {
    return props.traceId;
  }
  return buildViewerWatermarkId({
    userId: user.value?.id || null,
    artworkId: props.artworkId
  });
});
</script>

<style scoped>
.mia-protected-media {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  background: #000;
}

.mia-protected-media__image {
  -webkit-user-drag: none;
  user-drag: none;
}

.mia-protected-media__image--blank {
  min-height: 8rem;
  background: #000;
}

.mia-protected-media__watermark {
  pointer-events: none;
  position: absolute;
  inset: -20%;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem 1.5rem;
}

.mia-protected-media__watermark--brand {
  transform: rotate(-28deg);
  opacity: 0.2;
}

.mia-protected-media__watermark--viewer {
  transform: rotate(18deg);
  opacity: 0.28;
  gap: 3.5rem 2rem;
  z-index: 1;
}

.mia-protected-media__watermark-tile {
  white-space: nowrap;
  font-size: clamp(0.7rem, 2.2vw, 0.95rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}

.mia-protected-media__watermark-tile--viewer {
  font-size: clamp(0.55rem, 1.6vw, 0.72rem);
  letter-spacing: 0.08em;
  font-weight: 600;
  color: #dbe7ff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
}

.mia-protected-media__viewer-badge {
  pointer-events: none;
  position: absolute;
  right: 0.65rem;
  bottom: 0.65rem;
  z-index: 1;
  max-width: calc(100% - 1.3rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 0.35rem;
  background: rgba(5, 9, 18, 0.72);
  padding: 0.28rem 0.45rem;
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #c9d7f0;
}

.mia-protected-media__unlock {
  pointer-events: auto;
  position: relative;
  z-index: 4;
}

.mia-protected-media--blackout .mia-protected-media__shield {
  pointer-events: none;
}
</style>
