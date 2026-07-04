import { navigateTo } from "#app";
import { ref } from "vue";

export function useMarketplaceActions(auth) {
  const favoriteLoading = ref({});
  const followLoading = ref({});
  const actionMessage = ref("");

  function setLoading(target, id, value) {
    target.value = {
      ...target.value,
      [id]: value,
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
      followers: Math.max(0, currentCount + (nextState ? 1 : -1)),
    };
  }

  async function toggleFavorite(artwork) {
    actionMessage.value = "";

    if (!(await ensureCollectorSession())) {
      return false;
    }

    setLoading(favoriteLoading, artwork.id, true);

    try {
      const nextState = !artwork.isFavorite;

      await $fetch(`/api/artworks/${artwork.id}/favorite`, {
        method: nextState ? "POST" : "DELETE",
        credentials: "include",
      });

      updateArtworkFavoriteState(artwork, nextState);
      actionMessage.value = nextState
        ? "Oeuvre ajoutee a vos favoris."
        : "Oeuvre retiree de vos favoris.";

      return true;
    } catch (error) {
      actionMessage.value =
        error?.data?.message || "Impossible de mettre a jour vos favoris.";
      return false;
    } finally {
      setLoading(favoriteLoading, artwork.id, false);
    }
  }

  async function toggleFollow(artist) {
    actionMessage.value = "";

    if (!(await ensureCollectorSession())) {
      return false;
    }

    setLoading(followLoading, artist.id, true);

    try {
      const nextState = !artist.isFollowed;

      await $fetch(`/api/artists/${artist.id}/follow`, {
        method: nextState ? "POST" : "DELETE",
        credentials: "include",
      });

      updateArtistFollowState(artist, nextState);
      actionMessage.value = nextState
        ? "Vous suivez maintenant cet artiste."
        : "Vous ne suivez plus cet artiste.";

      return true;
    } catch (error) {
      actionMessage.value =
        error?.data?.message || "Impossible de mettre a jour ce suivi.";
      return false;
    } finally {
      setLoading(followLoading, artist.id, false);
    }
  }

  return {
    actionMessage,
    favoriteLoading,
    followLoading,
    toggleFavorite,
    toggleFollow,
  };
}
