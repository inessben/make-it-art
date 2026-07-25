const { extractArtistApplicationPayload } = require("../services/artist-contract.service");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePriceValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function serializeArtistSummary(artist) {
  if (!artist) {
    return null;
  }

  const payload = extractArtistApplicationPayload(artist.user?.artistApplicationDraft);

  return {
    id: artist.id,
    displayName:
      normalizeText(artist.displayName) || normalizeText(artist.user?.username) || "Artist",
    verified: Boolean(artist.verified),
    bio: normalizeText(artist.user?.bio),
    artType: normalizeText(payload.artType),
    styles: Array.isArray(payload.styles) ? payload.styles.filter(Boolean) : [],
    portfolioUrl: normalizeText(payload.portfolioUrl),
    socialHandle: normalizeText(payload.socialHandle),
    stats: {
      artworks: Array.isArray(artist.artworks)
        ? artist.artworks.length
        : artist._count?.artworks || 0,
      followers: artist._count?.followers || 0,
      collections: Array.isArray(artist.collections)
        ? artist.collections.length
        : artist._count?.collections || 0
    },
    isFollowed: Array.isArray(artist.followers) ? artist.followers.length > 0 : false,
    createdAt: artist.createdAt || null
  };
}

function serializeArtwork(artwork, { includeArtist = true } = {}) {
  if (!artwork) {
    return null;
  }

  const price = normalizeText(artwork.price) || normalizeText(artwork.priceTokens);

  return {
    id: artwork.id,
    title: normalizeText(artwork.title) || "Untitled artwork",
    description: normalizeText(artwork.description),
    price,
    priceValue: parsePriceValue(price),
    protection: Boolean(artwork.protection),
    createdAt: artwork.createdAt || null,
    favoriteCount: artwork.favoriteCount ?? artwork._count?.favorites ?? 0,
    isFavorite: Array.isArray(artwork.favorites) ? artwork.favorites.length > 0 : false,
    moderationStatus: normalizeText(artwork.moderationStatus) || "pending",
    moderationNote: normalizeText(artwork.moderationNote),
    moderatedAt: artwork.moderatedAt || null,
    moderationReviewer: artwork.moderatedByAdmin
      ? normalizeText(artwork.moderatedByAdmin.username) ||
        normalizeText(artwork.moderatedByAdmin.email)
      : "",
    category: artwork.category
      ? {
          id: artwork.category.id,
          name: normalizeText(artwork.category.name) || "Uncategorized"
        }
      : null,
    artist: includeArtist ? serializeArtistSummary(artwork.artist) : null
  };
}

function serializeCollection(collection) {
  if (!collection) {
    return null;
  }

  const items = Array.isArray(collection.items)
    ? collection.items.map((item) => serializeArtwork(item.artwork)).filter(Boolean)
    : [];

  return {
    id: collection.id,
    title: normalizeText(collection.title) || "Untitled collection",
    description: normalizeText(collection.description),
    isPrivate: Boolean(collection.isPrivate),
    isDefaultFavorites: Boolean(collection.isDefaultFavorites),
    createdAt: collection.createdAt || null,
    itemsCount: items.length,
    ownerType: collection.artistId ? "artist" : "collector",
    items
  };
}

module.exports = {
  parsePriceValue,
  serializeArtistSummary,
  serializeArtwork,
  serializeCollection
};
