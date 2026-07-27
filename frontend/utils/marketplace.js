export function formatMarketplacePrice(value) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(",", "."))
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return "Price on request";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: numericValue % 1 === 0 ? 0 : 2
  }).format(numericValue);
}

export function formatMarketplaceDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

const ARTWORK_LICENSE_LABELS = Object.freeze({
  PERSONAL: "Licence personnelle",
  COMMERCIAL: "Licence commerciale",
  EXCLUSIVE: "Licence exclusive"
});

export const ARTWORK_LICENSE_OPTIONS = Object.freeze([
  Object.freeze({
    value: "PERSONAL",
    label: "Personnelle",
    description: "L'acheteur peut utiliser l'oeuvre dans un cadre personnel."
  }),
  Object.freeze({
    value: "COMMERCIAL",
    label: "Commerciale",
    description:
      "L'acheteur peut utiliser l'oeuvre dans un cadre commercial. Précise les conditions d'utilisation commerciale dans la description de l'oeuvre."
  }),
  Object.freeze({
    value: "EXCLUSIVE",
    label: "Exclusive",
    description: "Une seule personne pourra acheter cette oeuvre."
  })
]);

export function isArtworkDescriptionRequired(licenseType) {
  return String(licenseType || "").toUpperCase() === "COMMERCIAL";
}

export function formatArtworkLicenseType(value) {
  return ARTWORK_LICENSE_LABELS[String(value || "").toUpperCase()] || "Licence personnelle";
}

const ARTWORK_AVAILABILITY = Object.freeze({
  AVAILABLE: { status: "AVAILABLE", label: "Disponible", tone: "available" },
  RESERVED: { status: "RESERVED", label: "Réservée temporairement", tone: "reserved" },
  SOLD: { status: "SOLD", label: "Vendue", tone: "sold" },
  UNAVAILABLE: { status: "UNAVAILABLE", label: "Indisponible", tone: "unavailable" }
});

const ARTWORK_VISIBILITY = Object.freeze({
  PUBLISHED: { label: "Publiée", tone: "published" },
  HIDDEN: { label: "Masquée", tone: "hidden" },
  ARCHIVED: { label: "Archivée", tone: "archived" }
});

export const ARTIST_ARTWORK_VISIBILITY_FILTERS = Object.freeze([
  Object.freeze({ value: "PUBLISHED", label: "Actives" }),
  Object.freeze({ value: "HIDDEN", label: "Masquées" }),
  Object.freeze({ value: "ARCHIVED", label: "Archivées" })
]);

export function filterArtistArtworksByVisibility(artworks, visibility) {
  const normalizedVisibility = String(visibility || "PUBLISHED").toUpperCase();
  return (Array.isArray(artworks) ? artworks : []).filter(
    (artwork) => String(artwork?.visibility || "PUBLISHED").toUpperCase() === normalizedVisibility
  );
}

export function normalizeArtistArtworkCounts(source) {
  const counts = source && typeof source === "object" ? source : {};
  const normalizeCount = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
  const normalized = {
    PUBLISHED: normalizeCount(counts.PUBLISHED),
    HIDDEN: normalizeCount(counts.HIDDEN),
    ARCHIVED: normalizeCount(counts.ARCHIVED)
  };

  return {
    ...normalized,
    total: Number.isSafeInteger(counts.total)
      ? Math.max(0, counts.total)
      : normalized.PUBLISHED + normalized.HIDDEN + normalized.ARCHIVED
  };
}

const ARTWORK_MANAGEMENT_REASON_LABELS = Object.freeze({
  ARTWORK_ARCHIVED: "Restaurez d'abord cette œuvre.",
  ARTWORK_HAS_PURCHASES: "Cette œuvre a déjà été achetée.",
  ARTWORK_TRANSACTION_IN_PROGRESS: "Un paiement ou une réservation est en cours.",
  ARTWORK_NOT_PUBLISHED: "Cette œuvre n'est pas publiée.",
  ARTWORK_ALREADY_ARCHIVED: "Cette œuvre est déjà archivée.",
  ARTWORK_NOT_HIDDEN: "Seule une œuvre masquée peut être republiée.",
  ARTWORK_MODERATION_BLOCKED: "La modération ne permet pas la republication.",
  ARTWORK_NOT_ARCHIVED: "Seule une œuvre archivée peut être restaurée."
});

export function getArtworkVisibilityPresentation(value) {
  const visibility = String(value || "PUBLISHED").toUpperCase();
  return ARTWORK_VISIBILITY[visibility] || ARTWORK_VISIBILITY.PUBLISHED;
}

export function formatArtworkManagementReason(value) {
  return ARTWORK_MANAGEMENT_REASON_LABELS[String(value || "")] || "Action indisponible.";
}

export function getArtworkAvailabilityPresentation(artwork) {
  const fallbackStatus = artwork?.isAvailableForPurchase ? "AVAILABLE" : "UNAVAILABLE";
  const status = String(artwork?.availabilityStatus || fallbackStatus).toUpperCase();
  return ARTWORK_AVAILABILITY[status] || ARTWORK_AVAILABILITY.UNAVAILABLE;
}

export function getArtistInitials(name) {
  return String(name || "Artist")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function isArtworkOwnedByArtist(artwork, user) {
  const artworkArtistId = Number(artwork?.artist?.id);
  const userArtistId = Number(user?.artist?.id);

  return (
    Number.isSafeInteger(artworkArtistId) &&
    artworkArtistId > 0 &&
    Number.isSafeInteger(userArtistId) &&
    userArtistId > 0 &&
    artworkArtistId === userArtistId
  );
}
