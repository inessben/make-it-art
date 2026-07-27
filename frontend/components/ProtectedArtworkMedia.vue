<template>
  <div
    class="mia-protected-media relative overflow-hidden"
    :class="{ 'mia-protected-media--blackout': isBlackedOut }"
    @contextmenu.prevent
    @dragstart.prevent
  >
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      :class="imgClass"
      class="mia-protected-media__image pointer-events-none select-none"
      draggable="false"
      decoding="async"
    />
    <div v-else :class="fallbackClass">
      <slot name="fallback" />
    </div>

    <!-- Transparent shield: blocks casual save / inspect of the visual surface -->
    <div
      class="mia-protected-media__shield absolute inset-0 z-[1]"
      aria-hidden="true"
      @contextmenu.prevent
      @dragstart.prevent
    />

    <div
      class="mia-protected-media__blackout absolute inset-0 z-[2] grid place-items-center bg-black transition-opacity duration-150"
      :class="isBlackedOut ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
    >
      <p
        v-show="isBlackedOut"
        class="px-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
      >
        Capture bloquée
      </p>
    </div>
  </div>
</template>

<script setup>
import { useScreenshotGuard } from "~/composables/useScreenshotGuard";

defineProps({
  src: {
    type: String,
    default: ""
  },
  alt: {
    type: String,
    default: ""
  },
  imgClass: {
    type: String,
    default: "h-full w-full object-cover"
  },
  fallbackClass: {
    type: String,
    default: "grid aspect-square place-items-center"
  }
});

const { isBlackedOut } = useScreenshotGuard();
</script>

<style scoped>
.mia-protected-media {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.mia-protected-media__image {
  -webkit-user-drag: none;
  user-drag: none;
}

.mia-protected-media--blackout .mia-protected-media__image {
  visibility: hidden;
}
</style>
