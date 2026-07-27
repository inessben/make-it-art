const prisma = require("../lib/prisma");
const { getArtworkStorageProvider } = require("./artwork-storage");
const { buildArtworkImageUrl } = require("./artwork-media.service");

class ArtworkMediaAccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ArtworkMediaAccessError";
    this.status = status;
    this.code = code;
  }
}

async function userOwnsArtistArtwork(userId, artwork) {
  if (!userId || !artwork?.artistId) {
    return false;
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artwork.artistId },
    select: { userId: true }
  });

  return artist?.userId === userId;
}

async function userHasPurchaseEntitlement(userId, artworkId) {
  if (!userId || !artworkId) {
    return false;
  }

  const entitlement = await prisma.digitalEntitlement.findFirst({
    where: {
      artworkId,
      userId,
      status: "ACTIVE",
      order: {
        status: {
          in: ["PAID", "PARTIALLY_REFUNDED"]
        }
      }
    },
    select: { id: true }
  });

  return Boolean(entitlement);
}

async function assertCanAccessHd(user, artwork) {
  if (!user?.id) {
    throw new ArtworkMediaAccessError(401, "AUTH_REQUIRED", "Authentication required.");
  }

  if (await userOwnsArtistArtwork(user.id, artwork)) {
    return;
  }

  if (await userHasPurchaseEntitlement(user.id, artwork.id)) {
    return;
  }

  throw new ArtworkMediaAccessError(
    403,
    "HD_FORBIDDEN",
    "Le fichier HD est reserve a l'artiste et aux acheteurs."
  );
}

async function resolveArtworkMediaUrl(artwork, variant = "preview") {
  if (!artwork) {
    return null;
  }

  if (variant === "hd") {
    if (!artwork.hdPath) {
      return artwork.imagePath ? buildArtworkImageUrl(artwork.imagePath) : null;
    }

    const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
    return storage.getPublicUrl(artwork.hdPath);
  }

  const previewKey = artwork.previewPath || artwork.imagePath;
  if (!previewKey) {
    return null;
  }

  if ((artwork.storageProvider || "local") === "local") {
    return buildArtworkImageUrl(previewKey);
  }

  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
  return storage.getPublicUrl(previewKey);
}

async function openArtworkMediaStream(artwork, variant = "preview") {
  const key =
    variant === "hd"
      ? artwork.hdPath || artwork.imagePath
      : artwork.previewPath || artwork.imagePath;

  if (!key) {
    throw new ArtworkMediaAccessError(404, "MEDIA_NOT_FOUND", "Media file not found.");
  }

  const storage = getArtworkStorageProvider(artwork.storageProvider || "local");
  const stream = await storage.getReadableStream(key);

  return {
    stream,
    key,
    contentType: variant === "preview" ? "image/jpeg" : "application/octet-stream"
  };
}

module.exports = {
  ArtworkMediaAccessError,
  assertCanAccessHd,
  resolveArtworkMediaUrl,
  openArtworkMediaStream
};
