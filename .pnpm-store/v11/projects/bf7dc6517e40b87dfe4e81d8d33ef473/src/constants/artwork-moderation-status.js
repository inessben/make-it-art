const ARTWORK_MODERATION_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  HIDDEN: "hidden"
});

const ARTWORK_MODERATION_STATUS_VALUES = Object.freeze(Object.values(ARTWORK_MODERATION_STATUS));

function isArtworkModerationStatus(value) {
  return ARTWORK_MODERATION_STATUS_VALUES.includes(value);
}

module.exports = {
  ARTWORK_MODERATION_STATUS,
  ARTWORK_MODERATION_STATUS_VALUES,
  isArtworkModerationStatus
};
