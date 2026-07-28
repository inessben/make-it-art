/**
 * Singleton hooks for in-browser screen capture / cast (best-effort).
 * OS-level capture (Discord desktop, Teams, OBS window capture) is not exposed
 * to web pages — Netflix-style blackouts there rely on DRM (Widevine/FairPlay).
 */

import { ref } from "vue";

export const screenCaptureActive = ref(false);
export const screenCaptureSource = ref(null);

let installed = false;
let activeDisplayTracks = 0;
let presentationListenerBound = false;

function syncCaptureState() {
  screenCaptureActive.value = activeDisplayTracks > 0;
  if (!screenCaptureActive.value) {
    screenCaptureSource.value = null;
  }
}

function registerDisplayTrack(track) {
  if (!track || track.kind !== "video") {
    return;
  }

  activeDisplayTracks += 1;
  screenCaptureSource.value = "display-media";
  screenCaptureActive.value = true;

  const release = () => {
    activeDisplayTracks = Math.max(0, activeDisplayTracks - 1);
    syncCaptureState();
  };

  track.addEventListener("ended", release, { once: true });
  track.addEventListener("mute", () => {
    if (track.readyState === "ended") {
      release();
    }
  });
}

function isScreenCaptureUserMedia(constraints) {
  if (!constraints || typeof constraints !== "object") {
    return false;
  }

  const video = constraints.video;
  if (!video) {
    return false;
  }

  if (typeof video === "object") {
    if (video.mediaSource === "screen" || video.mediaSource === "window") {
      return true;
    }
    const mandatory = video.mandatory || video.required;
    if (mandatory?.chromeMediaSource === "desktop" || mandatory?.chromeMediaSource === "screen") {
      return true;
    }
    if (video.displaySurface === "monitor" || video.displaySurface === "window") {
      return true;
    }
  }

  return false;
}

function registerStreamDisplayTracks(stream) {
  if (!stream?.getVideoTracks) {
    return;
  }
  for (const track of stream.getVideoTracks()) {
    registerDisplayTrack(track);
  }
}

export function installScreenCaptureGuard() {
  if (installed || import.meta.server) {
    return;
  }
  installed = true;

  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices) {
    return;
  }

  if (typeof mediaDevices.getDisplayMedia === "function") {
    const originalGetDisplayMedia = mediaDevices.getDisplayMedia.bind(mediaDevices);
    mediaDevices.getDisplayMedia = async function patchedGetDisplayMedia(constraints) {
      activeDisplayTracks += 1;
      screenCaptureSource.value = "display-media";
      screenCaptureActive.value = true;

      try {
        const stream = await originalGetDisplayMedia(constraints);
        activeDisplayTracks = Math.max(0, activeDisplayTracks - 1);
        registerStreamDisplayTracks(stream);
        syncCaptureState();
        return stream;
      } catch (error) {
        activeDisplayTracks = Math.max(0, activeDisplayTracks - 1);
        syncCaptureState();
        throw error;
      }
    };
  }

  if (typeof mediaDevices.getUserMedia === "function") {
    const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
    mediaDevices.getUserMedia = async function patchedGetUserMedia(constraints) {
      const isScreen = isScreenCaptureUserMedia(constraints);
      if (isScreen) {
        activeDisplayTracks += 1;
        screenCaptureSource.value = "display-media";
        screenCaptureActive.value = true;
      }

      try {
        const stream = await originalGetUserMedia(constraints);
        if (isScreen) {
          activeDisplayTracks = Math.max(0, activeDisplayTracks - 1);
          registerStreamDisplayTracks(stream);
          syncCaptureState();
        }
        return stream;
      } catch (error) {
        if (isScreen) {
          activeDisplayTracks = Math.max(0, activeDisplayTracks - 1);
          syncCaptureState();
        }
        throw error;
      }
    };
  }

  if (typeof mediaDevices.addEventListener === "function") {
    mediaDevices.addEventListener("devicechange", () => {
      // Reserved for future heuristics; OS-level Discord/Teams capture is not exposed here.
    });
  }

  bindPresentationGuard();
}

function bindPresentationGuard() {
  if (presentationListenerBound || import.meta.server) {
    return;
  }
  presentationListenerBound = true;

  if (typeof PresentationRequest === "undefined") {
    return;
  }

  try {
    const request = new PresentationRequest([`${window.location.origin}/`]);
    request.addEventListener("connectionavailable", (event) => {
      const connection = event.connection;
      if (!connection) {
        return;
      }

      activeDisplayTracks += 1;
      screenCaptureSource.value = "cast";
      screenCaptureActive.value = true;

      const release = () => {
        activeDisplayTracks = Math.max(0, activeDisplayTracks - 1);
        syncCaptureState();
      };

      connection.addEventListener("close", release, { once: true });
      connection.addEventListener("terminate", release, { once: true });
    });
  } catch {
    // Cast / Presentation API unavailable for this origin.
  }
}

export function teardownScreenCaptureGuardForTests() {
  installed = false;
  presentationListenerBound = false;
  activeDisplayTracks = 0;
  screenCaptureActive.value = false;
  screenCaptureSource.value = null;
}
