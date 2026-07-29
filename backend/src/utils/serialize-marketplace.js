const { extractArtistApplicationPayload } = require("../services/artist-contract.service");
const {
  buildArtworkImageUrl,
  buildArtworkPreviewUrl
} = require("../services/artwork-media.service");
const { buildUploadedImageUrl } = require("../services/uploaded-image.service");
const { isUnlimitedArtworkLicenseType } = require("../constants/artwork-license-types");
const { normalizeArtworkVisibility } = require("../constants/artwork-visibility");
const { buildArtworkManagement } = require("../services/artwork-lifecycle.service");
const { formatMarketplaceCategoryLabel } = require("./marketplace-category-groups");
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
    avatarUrl: buildUploadedImageUrl(artist.avatarPath),
    coverUrl: buildUploadedImageUrl(artist.coverPath),
    artType: formatMarketplaceCategoryLabel(payload.artType, normalizeText(payload.artType)),
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

function resolveArtworkAvailabilityStatus({
  isUnlimited,
  saleStatus,
  isSold,
  stockQuantity,
  reservedQuantity,
  hasFiatPrice
}) {
  if (!isUnlimited && (isSold || saleStatus === "SOLD_OUT")) {
    return "SOLD";
  }

  if (saleStatus !== "AVAILABLE" || !hasFiatPrice) {
    return "UNAVAILABLE";
  }

  if (isUnlimited) {
    return "AVAILABLE";
  }

  if (stockQuantity === 0 && reservedQuantity === 0) {
    return "SOLD";
  }

  if (reservedQuantity > 0) {
    return "RESERVED";
  }

  return stockQuantity > 0 ? "AVAILABLE" : "UNAVAILABLE";
}

function serializeArtwork(
  artwork,
  { includeArtist = true, includeManagement = false, canDownloadHd = false } = {}
) {
  if (!artwork) {
    return null;
  }

  const hasFiatPrice = Number.isSafeInteger(artwork.priceAmount) && artwork.priceAmount > 0;
  const stockQuantity = Number.isSafeInteger(artwork.stockQuantity) ? artwork.stockQuantity : 0;
  const reservedQuantity = Number.isSafeInteger(artwork.reservedQuantity)
    ? artwork.reservedQuantity
    : 0;
  const availableQuantity = Math.max(0, stockQuantity - reservedQuantity);
  const saleStatus = normalizeText(artwork.saleStatus) || "DRAFT";
  const visibility = normalizeArtworkVisibility(artwork.visibility);
  const licenseType = normalizeText(artwork.licenseType) || "PERSONAL";
  const isUnlimited = isUnlimitedArtworkLicenseType(licenseType);
  const availabilityStatus = resolveArtworkAvailabilityStatus({
    isUnlimited,
    saleStatus,
    isSold: Boolean(artwork.isSold),
    stockQuantity,
    reservedQuantity,
    hasFiatPrice
  });
  const isAvailableForPurchase = visibility === "PUBLISHED" && availabilityStatus === "AVAILABLE";
  const priceValue = hasFiatPrice
    ? artwork.priceAmount / 100
    : parsePriceValue(artwork.price || artwork.priceTokens);
  const price = hasFiatPrice
    ? `${priceValue.toFixed(2).replace(".", ",")} €`
    : normalizeText(artwork.price) || normalizeText(artwork.priceTokens);
  const publicPreviewUrl =
    buildArtworkPreviewUrl(artwork.previewPath, artwork.imagePath) ||
    buildArtworkImageUrl(artwork.previewPath || artwork.imagePath);
  const protectedPreviewUrl = artwork.id
    ? `/api/artworks/${artwork.id}/media/preview`
    : publicPreviewUrl;
  const hasDownloadableOriginal = Boolean(artwork.hdPath || artwork.imagePath);

  return {
    id: artwork.id,
    title: normalizeText(artwork.title) || "Untitled artwork",
    description: normalizeText(artwork.description),
    price,
    priceValue,
    priceAmount: hasFiatPrice ? artwork.priceAmount : null,
    currency: hasFiatPrice ? artwork.currency || "EUR" : null,
    licenseType,
    isUnlimited,
    protection: Boolean(artwork.protection),
    createdAt: artwork.createdAt || null,
    imageUrl: publicPreviewUrl || protectedPreviewUrl,
    previewUrl: publicPreviewUrl || protectedPreviewUrl,
    protectedPreviewUrl,
    forensicWatermark: Boolean(artwork.id),
    hasHdFile: hasDownloadableOriginal,
    canDownloadHd: hasDownloadableOriginal && Boolean(canDownloadHd),
    hdDownloadUrl:
      artwork.id && hasDownloadableOriginal && canDownloadHd
        ? `/api/artworks/${artwork.id}/media/hd`
        : null,
    storageProvider: normalizeText(artwork.storageProvider) || "local",
    mediaStatus: normalizeText(artwork.mediaStatus) || "ready",
    watermarkApplied: Boolean(artwork.watermarkApplied),
    favoriteCount: artwork.favoriteCount ?? artwork._count?.favorites ?? 0,
    isSold: isUnlimited ? false : Boolean(artwork.isSold),
    saleStatus,
    visibility,
    stockQuantity,
    reservedQuantity,
    availableQuantity: isUnlimited ? null : availableQuantity,
    availabilityStatus,
    isAvailableForPurchase,
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
          name: formatMarketplaceCategoryLabel(
            artwork.category.name,
            normalizeText(artwork.category.name) || "Uncategorized"
          ),
          imageUrl: buildUploadedImageUrl(artwork.category.imagePath)
        }
      : null,
    artist: includeArtist ? serializeArtistSummary(artwork.artist) : null,
    ...(includeManagement ? { management: buildArtworkManagement(artwork) } : {})
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
