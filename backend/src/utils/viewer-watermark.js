/**
 * Forensic viewer watermark helpers (Node / admin tooling).
 * Mirrors frontend/utils/viewerWatermark.js encoding so leaked IDs can be decoded.
 */

function toBase36(value) {
  return Number(value).toString(36).toUpperCase();
}

function simpleChecksum(parts) {
  let hash = 2166136261;
  const input = String(parts);

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

function buildViewerWatermarkId({ userId = null, artworkId = null, guestToken = null } = {}) {
  const artworkPart = artworkId ? `-A${toBase36(artworkId)}` : "";

  if (userId != null && Number.isFinite(Number(userId)) && Number(userId) > 0) {
    const uid = toBase36(userId);
    const checksum = simpleChecksum(`U:${Number(userId)}:A:${artworkId || 0}`);
    return `MIA-U${uid}${artworkPart}-${checksum}`;
  }

  const guest = String(guestToken || "UNKNOWN")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  const checksum = simpleChecksum(`G:${guest}:A:${artworkId || 0}`);
  return `MIA-G${guest}${artworkPart}-${checksum}`;
}

function parseViewerWatermarkId(watermarkId) {
  const raw = String(watermarkId || "")
    .trim()
    .toUpperCase();
  const userMatch = raw.match(/^MIA-U([A-Z0-9]+)(?:-A([A-Z0-9]+))?-([A-Z0-9]{4,8})$/);
  if (userMatch) {
    const userId = Number.parseInt(userMatch[1], 36);
    const artworkId = userMatch[2] ? Number.parseInt(userMatch[2], 36) : null;
    const expected = simpleChecksum(`U:${userId}:A:${artworkId || 0}`);
    return {
      kind: "user",
      userId,
      artworkId,
      guestToken: null,
      checksumValid: userMatch[3] === expected
    };
  }

  const guestMatch = raw.match(/^MIA-G([A-Z0-9]+)(?:-A([A-Z0-9]+))?-([A-Z0-9]{4,8})$/);
  if (guestMatch) {
    const guestToken = guestMatch[1];
    const artworkId = guestMatch[2] ? Number.parseInt(guestMatch[2], 36) : null;
    const expected = simpleChecksum(`G:${guestToken}:A:${artworkId || 0}`);
    return {
      kind: "guest",
      userId: null,
      artworkId,
      guestToken,
      checksumValid: guestMatch[3] === expected
    };
  }

  return {
    kind: "unknown",
    userId: null,
    artworkId: null,
    guestToken: null,
    checksumValid: false
  };
}

module.exports = {
  buildViewerWatermarkId,
  parseViewerWatermarkId
};
