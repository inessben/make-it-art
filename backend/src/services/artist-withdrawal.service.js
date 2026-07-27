const env = require("../config/env");
const artistWithdrawalRepository = require("../repositories/artist-withdrawal.repository");
const notificationRepository = require("../repositories/notification.repository");
const { ARTIST_WITHDRAWAL_STATUS, OPEN_ARTIST_WITHDRAWAL_STATUSES } = require("../constants/artist-withdrawal-status");
const { buildArtistSalesPayload } = require("./artist-analytics.service");
const {
  formatCurrencyAmount
} = require("../utils/commerce");
const {
  sendArtistWithdrawalRequestAlert,
  sendArtistWithdrawalStatusEmail
} = require("./mail.service");

const MONEY_PATTERN = /^(\d{1,7})(?:[.,](\d{1,2}))?\s*(?:€|eur)?$/i;

class ArtistWithdrawalError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "ArtistWithdrawalError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseMinorAmount(value) {
  const normalized =
    typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  const match = normalized.match(MONEY_PATTERN);

  if (!match) {
    throw new ArtistWithdrawalError(
      "INVALID_WITHDRAWAL_AMOUNT",
      "Withdrawal amount must be a valid positive EUR amount."
    );
  }

  const majorAmount = Number(match[1]);
  const minorAmount = Number((match[2] || "").padEnd(2, "0") || "0");
  const amount = majorAmount * 100 + minorAmount;

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new ArtistWithdrawalError(
      "INVALID_WITHDRAWAL_AMOUNT",
      "Withdrawal amount must be greater than zero."
    );
  }

  return amount;
}

function serializeWithdrawal(withdrawal) {
  return {
    id: withdrawal.id,
    publicId: withdrawal.publicId,
    amount: withdrawal.amount,
    amountValue: withdrawal.amount / 100,
    amountLabel: formatCurrencyAmount(withdrawal.amount / 100),
    currency: withdrawal.currency || "EUR",
    status: withdrawal.status,
    note: withdrawal.note || "",
    adminNote: withdrawal.adminNote || "",
    payoutReference: withdrawal.payoutReference || "",
    createdAt: withdrawal.createdAt,
    updatedAt: withdrawal.updatedAt,
    reviewedAt: withdrawal.reviewedAt || null,
    paidAt: withdrawal.paidAt || null,
    artist: withdrawal.artist
      ? {
          id: withdrawal.artist.id,
          displayName:
            withdrawal.artist.displayName || withdrawal.artist.user?.username || "Artist",
          email: withdrawal.artist.user?.email || ""
        }
      : null,
    requestedBy: withdrawal.requestedBy
      ? {
          id: withdrawal.requestedBy.id,
          username: withdrawal.requestedBy.username || withdrawal.requestedBy.email || "User",
          email: withdrawal.requestedBy.email || ""
        }
      : null,
    reviewedBy: withdrawal.reviewedBy
      ? {
          id: withdrawal.reviewedBy.id,
          username: withdrawal.reviewedBy.username || withdrawal.reviewedBy.email || "Admin",
          email: withdrawal.reviewedBy.email || ""
        }
      : null
  };
}

function summarizeRequestedAmounts(groupedRows) {
  const summary = new Map(groupedRows.map((row) => [row.status, row]));

  const amountFor = (status) => Number(summary.get(status)?._sum?.amount || 0);
  const countFor = (status) => Number(summary.get(status)?._count?._all || 0);

  return {
    requestedAmount: amountFor(ARTIST_WITHDRAWAL_STATUS.REQUESTED),
    approvedAmount: amountFor(ARTIST_WITHDRAWAL_STATUS.APPROVED),
    rejectedAmount: amountFor(ARTIST_WITHDRAWAL_STATUS.REJECTED),
    paidAmount: amountFor(ARTIST_WITHDRAWAL_STATUS.PAID),
    canceledAmount: amountFor(ARTIST_WITHDRAWAL_STATUS.CANCELED),
    requestedCount: countFor(ARTIST_WITHDRAWAL_STATUS.REQUESTED),
    approvedCount: countFor(ARTIST_WITHDRAWAL_STATUS.APPROVED),
    rejectedCount: countFor(ARTIST_WITHDRAWAL_STATUS.REJECTED),
    paidCount: countFor(ARTIST_WITHDRAWAL_STATUS.PAID),
    canceledCount: countFor(ARTIST_WITHDRAWAL_STATUS.CANCELED)
  };
}

async function buildArtistWithdrawalWorkspace(artistId, { limit = 50 } = {}) {
  const [salesPayload, groupedRows, withdrawals] = await Promise.all([
    buildArtistSalesPayload(artistId),
    artistWithdrawalRepository.summarizeWithdrawalsForArtist(artistId),
    artistWithdrawalRepository.listWithdrawalsForArtist(artistId, { limit })
  ]);

  const summary = summarizeRequestedAmounts(groupedRows);
  const lifetimeAvailableBalanceValue = Number(salesPayload.summary?.availableBalanceValue || 0);
  const pendingWithdrawalAmountValue = summary.requestedAmount + summary.approvedAmount;
  const paidOutAmountValue = summary.paidAmount;
  const availableToWithdrawValue = Math.max(
    lifetimeAvailableBalanceValue - pendingWithdrawalAmountValue - paidOutAmountValue,
    0
  );

  return {
    finance: {
      lifetimeAvailableBalanceValue,
      lifetimeAvailableBalance: formatCurrencyAmount(lifetimeAvailableBalanceValue),
      availableToWithdrawValue,
      availableToWithdraw: formatCurrencyAmount(availableToWithdrawValue),
      pendingWithdrawalAmountValue,
      pendingWithdrawalAmount: formatCurrencyAmount(pendingWithdrawalAmountValue),
      paidOutAmountValue,
      paidOutAmount: formatCurrencyAmount(paidOutAmountValue),
      minimumRequestAmountValue: env.artistWithdrawals.minimumAmount / 100,
      minimumRequestAmount: formatCurrencyAmount(env.artistWithdrawals.minimumAmount / 100)
    },
    summary: {
      totalRequests: withdrawals.length,
      requestedCount: summary.requestedCount,
      approvedCount: summary.approvedCount,
      rejectedCount: summary.rejectedCount,
      paidCount: summary.paidCount,
      canceledCount: summary.canceledCount
    },
    requests: withdrawals.map(serializeWithdrawal)
  };
}

async function createArtistWithdrawalRequest({ artist, user, amount, note }) {
  const workspace = await buildArtistWithdrawalWorkspace(artist.id, { limit: 10 });
  const amountMinor = parseMinorAmount(amount);
  const trimmedNote = normalizeText(note);

  if (amountMinor < env.artistWithdrawals.minimumAmount) {
    throw new ArtistWithdrawalError(
      "WITHDRAWAL_AMOUNT_TOO_LOW",
      `The minimum withdrawal amount is ${workspace.finance.minimumRequestAmount}.`
    );
  }

  if (amountMinor > Math.round(workspace.finance.availableToWithdrawValue * 100)) {
    throw new ArtistWithdrawalError(
      "WITHDRAWAL_AMOUNT_EXCEEDS_AVAILABLE",
      "The requested amount exceeds the artist balance currently available for withdrawal."
    );
  }

  if (trimmedNote.length > 1000) {
    throw new ArtistWithdrawalError(
      "WITHDRAWAL_NOTE_TOO_LONG",
      "Withdrawal note cannot exceed 1000 characters."
    );
  }

  const withdrawal = await artistWithdrawalRepository.createWithdrawal({
    artistId: artist.id,
    requestedByUserId: user.id,
    amount: amountMinor,
    currency: "EUR",
    note: trimmedNote
  });

  await notificationRepository.createNotificationOnce({
    userId: user.id,
    type: "withdrawal",
    title: "Withdrawal request submitted",
    message: `Your withdrawal request for ${formatCurrencyAmount(amountMinor / 100)} is now pending review.`,
    payload: {
      withdrawalPublicId: withdrawal.publicId,
      status: withdrawal.status,
      amount: amountMinor,
      artistId: artist.id
    },
    eventKey: `withdrawal:${withdrawal.publicId}:REQUESTED`
  });

  try {
    await sendArtistWithdrawalRequestAlert({
      artistName: artist.displayName || user.username || user.email || "Artist",
      artistEmail: user.email || "",
      amount: amountMinor,
      note: trimmedNote,
      withdrawalPublicId: withdrawal.publicId
    });
  } catch (error) {
    console.error("Artist withdrawal alert email error:", error);
  }

  return serializeWithdrawal(withdrawal);
}

function assertTransitionAllowed(withdrawal, action) {
  if (action === "approve" && withdrawal.status !== ARTIST_WITHDRAWAL_STATUS.REQUESTED) {
    throw new ArtistWithdrawalError(
      "WITHDRAWAL_APPROVE_NOT_ALLOWED",
      "Only requested withdrawals can be approved.",
      409
    );
  }

  if (action === "reject" && withdrawal.status !== ARTIST_WITHDRAWAL_STATUS.REQUESTED) {
    throw new ArtistWithdrawalError(
      "WITHDRAWAL_REJECT_NOT_ALLOWED",
      "Only requested withdrawals can be rejected.",
      409
    );
  }

  if (action === "mark_paid" && withdrawal.status !== ARTIST_WITHDRAWAL_STATUS.APPROVED) {
    throw new ArtistWithdrawalError(
      "WITHDRAWAL_PAY_NOT_ALLOWED",
      "Only approved withdrawals can be marked as paid.",
      409
    );
  }

  if (action === "cancel" && withdrawal.status !== ARTIST_WITHDRAWAL_STATUS.REQUESTED) {
    throw new ArtistWithdrawalError(
      "WITHDRAWAL_CANCEL_NOT_ALLOWED",
      "Only requested withdrawals can be canceled.",
      409
    );
  }
}

async function notifyWithdrawalStatus(withdrawal) {
  const artistUserId = withdrawal.artist?.userId;
  const artistEmail = withdrawal.artist?.user?.email || "";
  const artistName =
    withdrawal.artist?.displayName || withdrawal.artist?.user?.username || "Artist";

  if (Number.isSafeInteger(artistUserId) && artistUserId > 0) {
    await notificationRepository.createNotificationOnce({
      userId: artistUserId,
      type: "withdrawal",
      title: "Withdrawal request updated",
      message: `Your withdrawal request for ${formatCurrencyAmount(withdrawal.amount / 100)} is now ${String(withdrawal.status || "").toLowerCase()}.`,
      payload: {
        withdrawalPublicId: withdrawal.publicId,
        status: withdrawal.status,
        amount: withdrawal.amount,
        payoutReference: withdrawal.payoutReference || null
      },
      eventKey: `withdrawal:${withdrawal.publicId}:${withdrawal.status}`
    });
  }

  if (!artistEmail) {
    return;
  }

  try {
    await sendArtistWithdrawalStatusEmail({
      to: artistEmail,
      artistName,
      amount: withdrawal.amount,
      status: withdrawal.status,
      withdrawalPublicId: withdrawal.publicId,
      payoutReference: withdrawal.payoutReference || "",
      adminNote: withdrawal.adminNote || ""
    });
  } catch (error) {
    console.error("Artist withdrawal status email error:", error);
  }
}

async function updateArtistWithdrawalStatus({
  publicId,
  action,
  actorUserId,
  adminNote,
  payoutReference
}) {
  const withdrawal = await artistWithdrawalRepository.findWithdrawalForAdmin(publicId);

  if (!withdrawal) {
    throw new ArtistWithdrawalError("WITHDRAWAL_NOT_FOUND", "Withdrawal request not found.", 404);
  }

  assertTransitionAllowed(withdrawal, action);

  const trimmedAdminNote = normalizeText(adminNote);
  const trimmedPayoutReference = normalizeText(payoutReference);
  const now = new Date();
  let nextStatus = withdrawal.status;

  if (action === "approve") {
    nextStatus = ARTIST_WITHDRAWAL_STATUS.APPROVED;
  } else if (action === "reject") {
    nextStatus = ARTIST_WITHDRAWAL_STATUS.REJECTED;
  } else if (action === "mark_paid") {
    nextStatus = ARTIST_WITHDRAWAL_STATUS.PAID;
  } else if (action === "cancel") {
    nextStatus = ARTIST_WITHDRAWAL_STATUS.CANCELED;
  } else {
    throw new ArtistWithdrawalError(
      "INVALID_WITHDRAWAL_ACTION",
      "Unsupported withdrawal action."
    );
  }

  const updated = await artistWithdrawalRepository.updateWithdrawal({
    withdrawalId: withdrawal.id,
    data: {
      status: nextStatus,
      reviewedByUserId: Number.isSafeInteger(actorUserId) ? actorUserId : null,
      reviewedAt: now,
      adminNote: trimmedAdminNote || null,
      payoutReference: trimmedPayoutReference || null,
      ...(action === "mark_paid" ? { paidAt: now } : {})
    }
  });

  await notifyWithdrawalStatus(updated);

  return serializeWithdrawal(updated);
}

async function cancelArtistWithdrawal({ artistId, publicId, actorUserId }) {
  const withdrawal = await artistWithdrawalRepository.findWithdrawalForArtist({
    artistId,
    publicId
  });

  if (!withdrawal) {
    throw new ArtistWithdrawalError("WITHDRAWAL_NOT_FOUND", "Withdrawal request not found.", 404);
  }

  const updated = await updateArtistWithdrawalStatus({
    publicId,
    action: "cancel",
    actorUserId
  });

  return updated;
}

async function listAdminArtistWithdrawals({ limit = 100 } = {}) {
  const withdrawals = await artistWithdrawalRepository.listWithdrawalsForAdmin({ limit });
  const counts = withdrawals.reduce(
    (summary, withdrawal) => {
      summary.total += 1;
      summary[withdrawal.status] = (summary[withdrawal.status] || 0) + 1;
      summary.totalAmount += withdrawal.amount;
      return summary;
    },
    {
      total: 0,
      totalAmount: 0
    }
  );

  return {
    summary: {
      totalRequests: counts.total,
      requestedCount: counts.REQUESTED || 0,
      approvedCount: counts.APPROVED || 0,
      rejectedCount: counts.REJECTED || 0,
      paidCount: counts.PAID || 0,
      canceledCount: counts.CANCELED || 0,
      totalAmountValue: counts.totalAmount / 100,
      totalAmount: formatCurrencyAmount(counts.totalAmount / 100)
    },
    withdrawals: withdrawals.map(serializeWithdrawal)
  };
}

module.exports = {
  ArtistWithdrawalError,
  OPEN_ARTIST_WITHDRAWAL_STATUSES,
  buildArtistWithdrawalWorkspace,
  createArtistWithdrawalRequest,
  updateArtistWithdrawalStatus,
  cancelArtistWithdrawal,
  listAdminArtistWithdrawals,
  serializeWithdrawal
};
