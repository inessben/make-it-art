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

export function formatArtworkLicenseType(value) {
  return ARTWORK_LICENSE_LABELS[String(value || "").toUpperCase()] || "Licence personnelle";
}

const ARTWORK_AVAILABILITY = Object.freeze({
  AVAILABLE: { status: "AVAILABLE", label: "Disponible", tone: "available" },
  RESERVED: { status: "RESERVED", label: "Réservée temporairement", tone: "reserved" },
  SOLD: { status: "SOLD", label: "Vendue", tone: "sold" },
  UNAVAILABLE: { status: "UNAVAILABLE", label: "Indisponible", tone: "unavailable" }
});

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
