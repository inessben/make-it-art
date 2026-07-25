import { navigateTo } from "#app";
import { ref } from "vue";
import { useAnalyticsEvent } from "~/composables/useAnalyticsEvent";

export function useMarketplaceActions(auth) {
  const { trackEvent } = useAnalyticsEvent();
  const favoriteLoading = ref({});
  const followLoading = ref({});
  const actionMessage = ref("");
  const actionStatus = ref("");

  function setLoading(target, id, value) {
    target.value = {
      ...target.value,
      [id]: value
    };
  }

  async function ensureCollectorSession() {
    if (!auth.user) {
      try {
        await auth.fetchCurrentUser();
      } catch {
        await navigateTo("/login");
        return false;
      }
    }

    if (auth.isAdmin) {
      await navigateTo("/admin");
      return false;
    }

    return true;
  }

  function updateArtworkFavoriteState(artwork, nextState) {
    const currentCount = Number(artwork.favoriteCount || 0);

    artwork.isFavorite = nextState;
    artwork.favoriteCount = Math.max(0, currentCount + (nextState ? 1 : -1));
  }

  function updateArtistFollowState(artist, nextState) {
    const currentCount = Number(artist.stats?.followers || 0);

    artist.isFollowed = nextState;
    artist.stats = {
      ...(artist.stats || {}),
      followers: Math.max(0, currentCount + (nextState ? 1 : -1))
    };
  }

  async function toggleFavorite(artwork) {
    actionMessage.value = "";
    actionStatus.value = "";

    if (!(await ensureCollectorSession())) {
      return false;
    }

    setLoading(favoriteLoading, artwork.id, true);

    try {
      const nextState = !artwork.isFavorite;

      await $fetch(`/api/artworks/${artwork.id}/favorite`, {
        method: nextState ? "POST" : "DELETE",
        credentials: "include"
      });

      updateArtworkFavoriteState(artwork, nextState);
      actionMessage.value = nextState
        ? "Artwork added to your favorites."
        : "Artwork removed from your favorites.";
      actionStatus.value = "success";

      if (nextState) {
        trackEvent("add_to_wishlist", { artworkId: artwork.id });
      }

      return true;
    } catch (error) {
      actionMessage.value = error?.data?.message || "Unable to update your favorites.";
      actionStatus.value = "error";
      return false;
    } finally {
      setLoading(favoriteLoading, artwork.id, false);
    }
  }

  async function toggleFollow(artist) {
    actionMessage.value = "";
    actionStatus.value = "";

    if (!(await ensureCollectorSession())) {
      return false;
    }

    setLoading(followLoading, artist.id, true);

    try {
      const nextState = !artist.isFollowed;

      await $fetch(`/api/artists/${artist.id}/follow`, {
        method: nextState ? "POST" : "DELETE",
        credentials: "include"
      });

      updateArtistFollowState(artist, nextState);
      actionMessage.value = nextState
        ? "You are now following this artist."
        : "You are no longer following this artist.";
      actionStatus.value = "success";

      if (nextState) {
        trackEvent("follow_artist", { artistId: artist.id });
      }

      return true;
    } catch (error) {
      actionMessage.value = error?.data?.message || "Unable to update this follow status.";
      actionStatus.value = "error";
      return false;
    } finally {
      setLoading(followLoading, artist.id, false);
    }
  }

  return {
    actionMessage,
    actionStatus,
    favoriteLoading,
    followLoading,
    toggleFavorite,
    toggleFollow
  };
}
