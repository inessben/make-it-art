/**
 * Forensic viewer watermark identifiers.
 * Format for authenticated users: MIA-U{userIdBase36}-{checksum}
 * Format for guests: MIA-G{sessionToken}-{checksum}
 *
 * The checksum lets support reverse-check a leak without trusting a forged ID alone.
 */

const GUEST_STORAGE_KEY = "mia_viewer_wm_guest";

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

function readOrCreateGuestToken() {
  if (import.meta.server) {
    return "SSR";
  }

  try {
    const existing = window.sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (existing && /^[A-Z0-9]{8,16}$/i.test(existing)) {
      return existing.toUpperCase();
    }

    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);
    window.sessionStorage.setItem(GUEST_STORAGE_KEY, token);
    return token;
  } catch {
    return `T${Date.now().toString(36).toUpperCase()}`;
  }
}

/**
 * @param {{ userId?: number|string|null, artworkId?: number|string|null }} options
 * @returns {string}
 */
export function buildViewerWatermarkId({ userId = null, artworkId = null } = {}) {
  const artworkPart = artworkId ? `-A${toBase36(artworkId)}` : "";

  if (userId != null && Number.isFinite(Number(userId)) && Number(userId) > 0) {
    const uid = toBase36(userId);
    const checksum = simpleChecksum(`U:${Number(userId)}:A:${artworkId || 0}`);
    return `MIA-U${uid}${artworkPart}-${checksum}`;
  }

  const guest = readOrCreateGuestToken();
  const checksum = simpleChecksum(`G:${guest}:A:${artworkId || 0}`);
  return `MIA-G${guest}${artworkPart}-${checksum}`;
}

/**
 * Best-effort parse for support / moderation tooling.
 * @param {string} watermarkId
 * @returns {{ kind: 'user'|'guest'|'unknown', userId: number|null, artworkId: number|null, guestToken: string|null }}
 */
export function parseViewerWatermarkId(watermarkId) {
  const raw = String(watermarkId || "").trim().toUpperCase();
  const userMatch = raw.match(/^MIA-U([A-Z0-9]+)(?:-A([A-Z0-9]+))?-([A-Z0-9]{4,8})$/);
  if (userMatch) {
    return {
      kind: "user",
      userId: Number.parseInt(userMatch[1], 36),
      artworkId: userMatch[2] ? Number.parseInt(userMatch[2], 36) : null,
      guestToken: null
    };
  }

  const guestMatch = raw.match(/^MIA-G([A-Z0-9]+)(?:-A([A-Z0-9]+))?-([A-Z0-9]{4,8})$/);
  if (guestMatch) {
    return {
      kind: "guest",
      userId: null,
      artworkId: guestMatch[2] ? Number.parseInt(guestMatch[2], 36) : null,
      guestToken: guestMatch[1]
    };
  }

  return { kind: "unknown", userId: null, artworkId: null, guestToken: null };
}
