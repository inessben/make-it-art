const { ARTWORK_MODERATION_STATUS } = require("../constants/artwork-moderation-status");
const {
  ARTWORK_VISIBILITY,
  normalizeArtworkVisibility
} = require("../constants/artwork-visibility");

const CONFIRMED_PURCHASE_STATUSES = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);
const TRANSACTION_IN_PROGRESS_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAYMENT_REVIEW"
]);

function collectOrderStatuses(artwork) {
  if (!Array.isArray(artwork?.orderItems)) {
    return [];
  }

  return artwork.orderItems.map((item) => item?.order?.status).filter(Boolean);
}

function hasConfirmedPurchase(artwork) {
  return collectOrderStatuses(artwork).some((status) => CONFIRMED_PURCHASE_STATUSES.has(status));
}

function hasTransactionInProgress(artwork) {
  const hasOpenOrder = collectOrderStatuses(artwork).some((status) =>
    TRANSACTION_IN_PROGRESS_STATUSES.has(status)
  );
  const hasActiveReservation = Array.isArray(artwork?.reservations)
    ? artwork.reservations.some((reservation) => reservation?.status === "ACTIVE")
    : Number(artwork?.reservedQuantity || 0) > 0;

  return hasOpenOrder || hasActiveReservation;
}

function firstBlockedReason({ purchased, transactionInProgress, archived }) {
  if (archived) return "ARTWORK_ARCHIVED";
  if (purchased) return "ARTWORK_HAS_PURCHASES";
  if (transactionInProgress) return "ARTWORK_TRANSACTION_IN_PROGRESS";
  return null;
}

function buildArtworkManagement(artwork) {
  const visibility = normalizeArtworkVisibility(artwork?.visibility);
  const purchased = hasConfirmedPurchase(artwork);
  const transactionInProgress = hasTransactionInProgress(artwork);
  const archived = visibility === ARTWORK_VISIBILITY.ARCHIVED;
  const hidden = visibility === ARTWORK_VISIBILITY.HIDDEN;
  const published = visibility === ARTWORK_VISIBILITY.PUBLISHED;
  const moderationApproved =
    String(artwork?.moderationStatus || "").toLowerCase() === ARTWORK_MODERATION_STATUS.APPROVED;
  const editReason = firstBlockedReason({ purchased, transactionInProgress, archived });
  const archiveReason = archived
    ? "ARTWORK_ALREADY_ARCHIVED"
    : transactionInProgress
      ? "ARTWORK_TRANSACTION_IN_PROGRESS"
      : null;
  const publishReason = !hidden
    ? "ARTWORK_NOT_HIDDEN"
    : !moderationApproved
      ? "ARTWORK_MODERATION_BLOCKED"
      : null;
  const reasons = {};

  if (editReason) {
    reasons.edit = editReason;
    reasons.delete = editReason;
  }
  if (!published) reasons.hide = "ARTWORK_NOT_PUBLISHED";
  if (archiveReason) reasons.archive = archiveReason;
  if (publishReason) reasons.publish = publishReason;
  if (!archived) reasons.restore = "ARTWORK_NOT_ARCHIVED";

  return {
    lifecycle: {
      visibility,
      archivedAt: artwork?.archivedAt || null,
      hasConfirmedPurchase: purchased,
      hasTransactionInProgress: transactionInProgress
    },
    capabilities: {
      canEdit: !editReason,
      canDelete: !editReason,
      canHide: published,
      canArchive: !archiveReason,
      canPublish: !publishReason,
      canRestore: archived,
      reasons
    }
  };
}

module.exports = {
  CONFIRMED_PURCHASE_STATUSES,
  TRANSACTION_IN_PROGRESS_STATUSES,
  buildArtworkManagement,
  hasConfirmedPurchase,
  hasTransactionInProgress
};
