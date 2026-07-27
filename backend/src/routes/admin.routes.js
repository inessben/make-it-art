const express = require("express");
const prisma = require("../lib/prisma");
const { authRequired } = require("../middlewares/auth-required.middleware");
const {
  adminRequired,
  superAdminRequired,
  isAdminUser,
  isSuperAdminUser
} = require("../middlewares/admin-required.middleware");
const { ARTIST_APPLICATION_STATUS } = require("../constants/artist-application-status");
const {
  ARTWORK_MODERATION_STATUS,
  isArtworkModerationStatus
} = require("../constants/artwork-moderation-status");
const artistApplicationDraftRepository = require("../repositories/artist-application-draft.repository");
const userRepository = require("../repositories/user.repository");
const artistRepository = require("../repositories/artist.repository");
const artworkRepository = require("../repositories/artwork.repository");
const notificationRepository = require("../repositories/notification.repository");
const {
  ADMIN_AUDIT_ENTITY_LABELS,
  ADMIN_AUDIT_ENTITY_TYPES,
  isAdminAuditEntityType,
  listAdminAuditLogs,
  parseAuditLimit
} = require("../repositories/audit-log.repository");
const orderRepository = require("../repositories/order.repository");
const paymentRepository = require("../repositories/payment.repository");
const { ensureBuffer } = require("../utils/ensure-buffer");
const { inviteAdminUser } = require("../services/auth.service");
const { writeAdminAuditLog } = require("../services/admin-audit.service");
const {
  AdminUserManagementError,
  removeAdminAccess,
  removeSuperAdminAccess,
  updateUserAccountStatus
} = require("../services/admin-user-management.service");
const {
  extractArtistApplicationPayload,
  resolveContractSignedAt,
  generateArtistContractPdf
} = require("../services/artist-contract.service");
const {
  USER_ACCOUNT_STATUS,
  getUserAccountStatus,
  getUserAccountStatusLabel
} = require("../utils/user-account-status");
const {
  ArtistWithdrawalError,
  listAdminArtistWithdrawals,
  updateArtistWithdrawalStatus
} = require("../services/artist-withdrawal.service");

const router = express.Router();

const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: "Pending",
  PAYMENT_PROCESSING: "Pending",
  PAYMENT_FAILED: "Failed",
  PAYMENT_REVIEW: "Pending",
  PAID: "Paid",
  CANCELED: "Canceled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded"
};

const PAYMENT_STATUS_LABELS = {
  PENDING: "Pending",
  PROCESSING: "Pending",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELED: "Canceled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded"
};

function getAdminAuditEntityLabel(entityType) {
  return ADMIN_AUDIT_ENTITY_LABELS[entityType] || entityType || "Other";
}

function buildUserRole(user) {
  if (isSuperAdminUser(user)) {
    return "Super admin";
  }

  if (isAdminUser(user)) {
    return "Admin";
  }

  if (user.artist) {
    return "Artist";
  }

  if (user.role) {
    return user.role;
  }

  return "Collector";
}

function buildUserStatus(user) {
  return getUserAccountStatusLabel(user);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function parsePositiveInteger(value) {
  const parsedValue = Number.parseInt(String(value), 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function handleAdminUserManagementError(res, error, fallbackMessage) {
  if (
    error instanceof AdminUserManagementError ||
    (Number.isInteger(error?.statusCode) && typeof error?.code === "string")
  ) {
    return res.status(error.statusCode).json({
      code: error.code,
      message: error.message
    });
  }

  console.error(fallbackMessage, error);

  return res.status(500).json({
    message: "Unable to update this user"
  });
}

function buildArtworkStatus(artwork) {
  const status = String(
    artwork?.moderationStatus || ARTWORK_MODERATION_STATUS.PENDING
  ).toLowerCase();

  if (status === ARTWORK_MODERATION_STATUS.APPROVED) {
    return "Published";
  }

  if (status === ARTWORK_MODERATION_STATUS.REJECTED) {
    return "Rejected";
  }

  if (status === ARTWORK_MODERATION_STATUS.HIDDEN) {
    return "Hidden";
  }

  return "Pending review";
}

function buildOrderStatus(order) {
  if (order.status) {
    return ORDER_STATUS_LABELS[order.status] || order.status;
  }

  if (order.payments.some((payment) => buildPaymentStatus(payment) === "Succeeded")) {
    return "Paid";
  }

  if (order.payments.some((payment) => buildPaymentStatus(payment) === "Refunded")) {
    return "Refunded";
  }

  return "Pending";
}

function buildPaymentStatus(payment) {
  if (payment.status) {
    return PAYMENT_STATUS_LABELS[payment.status] || payment.status;
  }

  return "Pending";
}

async function resolveApplicationContractPdf(application) {
  const payload = extractArtistApplicationPayload(application);
  const existingPdf = ensureBuffer(application?.contractPdf);
  // A signed contract is an immutable legal artefact. Keep legacy PDFs available
  // instead of silently regenerating them with the current contract wording.
  const needsRegeneration = !existingPdf || existingPdf.length === 0;

  if (!needsRegeneration) {
    return {
      payload,
      pdfBuffer: existingPdf
    };
  }

  if (!application?.signatureDataUrl) {
    if (!existingPdf || existingPdf.length === 0) {
      throw new Error("Artist contract signature data is unavailable");
    }

    return {
      payload,
      pdfBuffer: existingPdf
    };
  }

  const signedAt = resolveContractSignedAt(application);
  const regeneratedContract = await generateArtistContractPdf({
    user: application.user,
    payload,
    signatureDataUrl: application.signatureDataUrl,
    signedAt
  });

  await artistApplicationDraftRepository.updateStoredContract({
    applicationId: application.id,
    contractVersion: regeneratedContract.contractVersion,
    contractPdf: regeneratedContract.pdfBuffer,
    contractSignedAt: signedAt,
    contractAcceptedAt: application.contractAcceptedAt || signedAt
  });

  return {
    payload,
    pdfBuffer: regeneratedContract.pdfBuffer
  };
}

function parseAmount(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalizedValue = String(value)
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrencyAmount(value) {
  return `EUR ${value.toFixed(2)}`;
}

function getPaymentAmountValue(payment) {
  if (Number.isSafeInteger(payment.amount) && payment.amount >= 0) {
    return payment.amount / 100;
  }

  return parseAmount(payment.price);
}

function getOrderAmountValue(order) {
  if (Number.isSafeInteger(order.totalAmount) && order.totalAmount >= 0) {
    return order.totalAmount / 100;
  }

  return order.payments.reduce((sum, payment) => sum + getPaymentAmountValue(payment), 0);
}

function getAdminRefundSummary(order) {
  const payment = order.payments.find(
    (candidate) =>
      candidate.providerPaymentId &&
      ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(candidate.status)
  );
  const refunds = payment?.refunds || [];
  const succeededAmount = refunds
    .filter((refund) => refund.status === "SUCCEEDED")
    .reduce((total, refund) => total + refund.amount, 0);
  const pendingAmount = refunds
    .filter((refund) => refund.status === "PENDING")
    .reduce((total, refund) => total + refund.amount, 0);
  const refundableAmount = payment
    ? Math.max(payment.amount - succeededAmount - pendingAmount, 0)
    : 0;

  return {
    currency: payment?.currency || order.currency || "EUR",
    refundedAmount: succeededAmount,
    pendingRefundAmount: pendingAmount,
    refundableAmount,
    canRefund: ["PAID", "PARTIALLY_REFUNDED"].includes(order.status) && refundableAmount > 0,
    refunds: refunds.map((refund) => ({
      id: refund.publicId,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reasonCode,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt
    }))
  };
}

function getArtworkPriceLabel(artwork) {
  if (Number.isSafeInteger(artwork.priceAmount) && artwork.priceAmount > 0) {
    return formatCurrencyAmount(artwork.priceAmount / 100);
  }

  return artwork.price || artwork.priceTokens || "Price not set";
}

function buildOrderReference(orderId) {
  return `#ORD-${String(orderId).padStart(4, "0")}`;
}

function buildPaymentReference(paymentId) {
  return `PAY-${String(paymentId).padStart(5, "0")}`;
}

function serializeAdminActor(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username || user.email || "User",
    email: user.email || "",
    isAdmin: isAdminUser(user),
    isSuperAdmin: isSuperAdminUser(user)
  };
}

function serializeAdminArtist(artist) {
  return {
    id: artist.id,
    userId: artist.userId,
    name: artist.displayName || artist.user?.username || "Unnamed artist",
    email: artist.user?.email || "Email not provided",
    bio: artist.user?.bio || "No bio yet.",
    verified: Boolean(artist.verified),
    isActive: Boolean(artist.user?.isActive),
    isAdmin: isAdminUser(artist.user),
    artworksCount: artist._count.artworks,
    followersCount: artist._count.followers,
    collectionsCount: artist._count.collections,
    createdAt: artist.createdAt || artist.user?.createdAt || null
  };
}

function serializeAdminUser(user) {
  return {
    id: user.id,
    username: user.username || "User",
    email: user.email || "Email not provided",
    phone: user.phone || "",
    role: buildUserRole(user),
    status: buildUserStatus(user),
    statusCode: getUserAccountStatus(user),
    isActive: Boolean(user.isActive),
    blockedAt: user.blockedAt || null,
    verified: Boolean(user.verified),
    isAdmin: isAdminUser(user),
    isSuperAdmin: isSuperAdminUser(user),
    isArtist: Boolean(user.artist),
    ordersCount: user._count?.orders || 0,
    createdAt: user.createdAt
  };
}

function serializeAdminArtistApplication(application) {
  const payload =
    application.payload && typeof application.payload === "object" ? application.payload : {};
  const applicantName = [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim();
  const displayName = payload.displayName || application.user?.username || "Unnamed artist";

  return {
    id: application.id,
    userId: application.userId,
    artistId: application.user?.artist?.id || null,
    applicantName: applicantName || application.user?.username || "User",
    displayName,
    email: application.user?.email || "Email not provided",
    phone: application.user?.phone || "Phone not provided",
    status: application.status || ARTIST_APPLICATION_STATUS.DRAFT,
    bio: payload.bio || application.user?.bio || "",
    artType: payload.artType || "Not provided",
    styles: Array.isArray(payload.styles) ? payload.styles : [],
    portfolioUrl: payload.portfolioUrl || "",
    socialHandle: payload.socialHandle || "",
    addressLine1: payload.addressLine1 || "",
    addressLine2: payload.addressLine2 || "",
    city: payload.city || "",
    region: payload.region || "",
    postalCode: payload.postalCode || "",
    country: payload.country || "",
    taxId: payload.taxId || "",
    hasContractPdf: Boolean(application.contractPdf),
    contractVersion: application.contractVersion || null,
    submittedAt: application.submittedAt || application.completedAt || application.updatedAt,
    reviewedAt: application.reviewedAt || null,
    reviewNote: application.reviewNote || "",
    reviewerName: application.reviewedByAdmin?.username || application.reviewedByAdmin?.email || "",
    artistActivated: Boolean(application.user?.artist),
    verified: Boolean(application.user?.artist?.verified)
  };
}

function serializeAdminArtwork(artwork) {
  return {
    id: artwork.id,
    title: artwork.title || "Untitled artwork",
    artistId: artwork.artistId,
    artistName: artwork.artist?.displayName || artwork.artist?.user?.username || "Unknown artist",
    category: artwork.category?.name || "No category",
    price: getArtworkPriceLabel(artwork),
    protection: Boolean(artwork.protection),
    favoriteCount: artwork.favoriteCount ?? artwork._count?.favorites ?? 0,
    ordersCount: artwork._count?.orderItems ?? 0,
    status: String(artwork.moderationStatus || ARTWORK_MODERATION_STATUS.PENDING).toLowerCase(),
    statusLabel: buildArtworkStatus(artwork),
    moderationNote: artwork.moderationNote || "",
    moderatedAt: artwork.moderatedAt || null,
    reviewerName: artwork.moderatedByAdmin?.username || artwork.moderatedByAdmin?.email || "",
    isPubliclyVisible:
      String(artwork.moderationStatus || "").toLowerCase() === ARTWORK_MODERATION_STATUS.APPROVED,
    createdAt: artwork.createdAt
  };
}

function serializeAdminArtistApplicationSummary(application) {
  if (!application) {
    return null;
  }

  const payload =
    application.payload && typeof application.payload === "object" ? application.payload : {};
  const applicantName = [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim();
  const displayName = payload.displayName || application.user?.username || "Unnamed artist";
  const hasContractPdf = Boolean(application.contractPdf || application.signatureDataUrl);

  return {
    id: application.id,
    status: application.status || ARTIST_APPLICATION_STATUS.DRAFT,
    applicantName: applicantName || application.user?.username || "User",
    displayName,
    artType: payload.artType || "Not provided",
    styles: Array.isArray(payload.styles) ? payload.styles : [],
    portfolioUrl: payload.portfolioUrl || "",
    socialHandle: payload.socialHandle || "",
    reviewNote: application.reviewNote || "",
    submittedAt: application.submittedAt || application.completedAt || application.updatedAt,
    reviewedAt: application.reviewedAt || null,
    contractSignedAt: application.contractSignedAt || null,
    contractAcceptedAt: application.contractAcceptedAt || null,
    reviewerName: application.reviewedByAdmin?.username || application.reviewedByAdmin?.email || "",
    hasContractPdf,
    contractPdfUrl: hasContractPdf
      ? `/api/admin/artist-applications/${application.id}/contract.pdf`
      : null
  };
}

function serializeAdminArtworkSummary(artwork) {
  if (!artwork) {
    return null;
  }

  return {
    id: artwork.id,
    title: artwork.title || "Untitled artwork",
    artistId: artwork.artistId,
    artistName: artwork.artist?.displayName || artwork.artist?.user?.username || "Unknown artist",
    category: artwork.category?.name || "No category",
    priceAmount: Number.isSafeInteger(artwork.priceAmount) ? artwork.priceAmount : null,
    priceLabel: getArtworkPriceLabel(artwork),
    currency: artwork.currency || "EUR",
    favoriteCount: artwork.favoriteCount ?? artwork._count?.favorites ?? 0,
    ordersCount: artwork._count?.orderItems ?? 0,
    moderationStatus: String(
      artwork.moderationStatus || ARTWORK_MODERATION_STATUS.APPROVED
    ).toLowerCase(),
    moderationLabel: buildArtworkStatus(artwork),
    saleStatus: artwork.saleStatus || "DRAFT",
    stockQuantity: artwork.stockQuantity ?? 0,
    reservedQuantity: artwork.reservedQuantity ?? 0,
    createdAt: artwork.createdAt
  };
}

function serializeAdminCollectionSummary(collection) {
  return {
    id: collection.id,
    title: collection.title || "Untitled collection",
    description: collection.description || "",
    isPrivate: Boolean(collection.isPrivate),
    isDefaultFavorites: Boolean(collection.isDefaultFavorites),
    itemsCount: collection._count?.items || 0,
    createdAt: collection.createdAt
  };
}

function serializeAdminFavoriteSummary(favorite) {
  return {
    id: favorite.id,
    createdAt: favorite.createdAt,
    artwork: serializeAdminArtworkSummary(favorite.artwork)
  };
}

function serializeAdminFollowSummary(follow) {
  return {
    id: follow.id,
    createdAt: follow.createdAt,
    artist: follow.artist
      ? {
          id: follow.artist.id,
          name: follow.artist.displayName || follow.artist.user?.username || "Unnamed artist",
          verified: Boolean(follow.artist.verified),
          artworksCount: follow.artist._count?.artworks || 0,
          followersCount: follow.artist._count?.followers || 0,
          collectionsCount: follow.artist._count?.collections || 0
        }
      : null
  };
}

function serializeAdminAuditLog(log) {
  return {
    id: log.id,
    action: log.action || "UNKNOWN_ACTION",
    entityType: log.entityType || "",
    entityLabel: getAdminAuditEntityLabel(log.entityType),
    entityId: log.entityId || "",
    ipAddress: log.ipAddress || "",
    createdAt: log.createdAt,
    actor: serializeAdminActor(log.user)
  };
}

function serializeAdminOrderSummary(order) {
  const amountValue = getOrderAmountValue(order);
  const refundSummary = getAdminRefundSummary(order);

  return {
    id: order.id,
    publicId: order.publicId,
    reference: buildOrderReference(order.id),
    status: buildOrderStatus(order),
    statusCode: order.status,
    totalAmount: Number.isSafeInteger(order.totalAmount)
      ? order.totalAmount
      : Math.round(amountValue * 100),
    currency: order.currency || refundSummary.currency || "EUR",
    itemsCount: order.items?.length || 0,
    paymentsCount: order.payments?.length || 0,
    refundedAmount: refundSummary.refundedAmount,
    pendingRefundAmount: refundSummary.pendingRefundAmount,
    refundableAmount: refundSummary.refundableAmount,
    createdAt: order.createdAt
  };
}

function serializeAdminPaymentSummary(payment) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    reference: buildPaymentReference(payment.id),
    orderId: payment.orderId,
    orderReference: buildOrderReference(payment.orderId),
    status: buildPaymentStatus(payment),
    statusCode: payment.status,
    provider: payment.provider || "STRIPE",
    method: payment.method || "Unknown",
    amount: payment.amount,
    refundedAmount: payment.refundedAmount ?? 0,
    currency: payment.currency || "EUR",
    providerPaymentId: payment.providerPaymentId || "",
    providerChargeId: payment.providerChargeId || "",
    providerStatus: payment.providerStatus || "",
    failureCode: payment.failureCode || "",
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    succeededAt: payment.succeededAt || null,
    failedAt: payment.failedAt || null,
    canceledAt: payment.canceledAt || null
  };
}

function serializeAdminArtistWithdrawalSummary(withdrawal) {
  return {
    id: withdrawal.id,
    publicId: withdrawal.publicId,
    status: withdrawal.status,
    amount: withdrawal.amount,
    amountValue: withdrawal.amountValue,
    amountLabel: withdrawal.amountLabel,
    currency: withdrawal.currency || "EUR",
    note: withdrawal.note || "",
    adminNote: withdrawal.adminNote || "",
    payoutReference: withdrawal.payoutReference || "",
    createdAt: withdrawal.createdAt,
    reviewedAt: withdrawal.reviewedAt || null,
    paidAt: withdrawal.paidAt || null,
    artist: withdrawal.artist || null,
    requestedBy: withdrawal.requestedBy || null,
    reviewedBy: withdrawal.reviewedBy || null
  };
}

function serializeAdminWebhookEvent(event) {
  return {
    id: event.id,
    eventId: event.eventId,
    eventType: event.eventType,
    stripeObjectId: event.stripeObjectId || "",
    status: event.status,
    attemptCount: event.attemptCount,
    lastErrorCode: event.lastErrorCode || "",
    createdAt: event.createdAt,
    processedAt: event.processedAt || null
  };
}

function serializeAdminRefundDetail(refund) {
  return {
    id: refund.id,
    publicId: refund.publicId,
    paymentId: refund.paymentId,
    paymentReference: refund.payment ? buildPaymentReference(refund.payment.id) : null,
    status: refund.status,
    providerRefundId: refund.providerRefundId || "",
    providerStatus: refund.providerStatus || "",
    providerReference: refund.providerReference || "",
    amount: refund.amount,
    currency: refund.currency || "EUR",
    reasonCode: refund.reasonCode || "",
    failureCode: refund.failureCode || "",
    requestedBy: serializeAdminActor(refund.requestedBy),
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
    succeededAt: refund.succeededAt || null,
    failedAt: refund.failedAt || null,
    webhookEvents: (refund.webhookEvents || []).map(serializeAdminWebhookEvent)
  };
}

function serializeAdminTransition(transition) {
  return {
    id: transition.id,
    paymentId: transition.paymentId || null,
    stripeEventId: transition.stripeEventId,
    stripeObjectId: transition.stripeObjectId,
    entityType: transition.entityType,
    previousStatus: transition.previousStatus,
    nextStatus: transition.nextStatus,
    reasonCode: transition.reasonCode,
    createdAt: transition.createdAt
  };
}

function serializeAdminFulfillmentTask(task) {
  return {
    id: task.id,
    taskType: task.taskType,
    taskKey: task.taskKey,
    status: task.status,
    attemptCount: task.attemptCount,
    availableAt: task.availableAt,
    lockedAt: task.lockedAt || null,
    lastErrorCode: task.lastErrorCode || "",
    effectReference: task.effectReference || "",
    createdAt: task.createdAt,
    processedAt: task.processedAt || null
  };
}

function serializeAdminOperatorAlert(alert) {
  return {
    id: alert.id,
    paymentId: alert.paymentId || null,
    code: alert.code,
    status: alert.status,
    stripeEventId: alert.stripeEventId,
    stripeObjectId: alert.stripeObjectId,
    createdAt: alert.createdAt,
    resolvedAt: alert.resolvedAt || null
  };
}

function serializeAdminDisputeEvidenceAudit(audit) {
  return {
    id: audit.id,
    providerStatus: audit.providerStatus,
    submissionCount: audit.submissionCount,
    hasEvidence: Boolean(audit.hasEvidence),
    fileReferences: Array.isArray(audit.fileReferences) ? audit.fileReferences : [],
    capturedAt: audit.capturedAt,
    capturedBy: serializeAdminActor(audit.capturedBy)
  };
}

function serializeAdminDispute(dispute) {
  return {
    id: dispute.id,
    paymentId: dispute.paymentId,
    providerDisputeId: dispute.providerDisputeId,
    providerChargeId: dispute.providerChargeId,
    status: dispute.status,
    providerStatus: dispute.providerStatus,
    reason: dispute.reason,
    amount: dispute.amount,
    currency: dispute.currency || "EUR",
    evidenceDueAt: dispute.evidenceDueAt || null,
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
    closedAt: dispute.closedAt || null,
    webhookEvents: (dispute.webhookEvents || []).map(serializeAdminWebhookEvent),
    evidenceAudits: (dispute.evidenceAudits || []).map(serializeAdminDisputeEvidenceAudit)
  };
}

function serializeAdminInvoice(invoice) {
  return {
    id: invoice.id,
    publicId: invoice.publicId,
    number: invoice.number,
    type: invoice.type,
    recipientReference: invoice.recipientReference,
    subtotalAmount: invoice.subtotalAmount,
    discountAmount: invoice.discountAmount,
    netAmount: invoice.netAmount,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency || "EUR",
    issuedAt: invoice.issuedAt,
    hasPdf: Boolean(invoice.pdf)
  };
}

function serializeAdminDigitalEntitlement(entitlement) {
  return {
    id: entitlement.id,
    orderItemId: entitlement.orderItemId,
    userId: entitlement.userId,
    artworkId: entitlement.artworkId,
    status: entitlement.status,
    sourceTaskKey: entitlement.sourceTaskKey,
    grantedAt: entitlement.grantedAt,
    suspendedAt: entitlement.suspendedAt || null,
    revokedAt: entitlement.revokedAt || null,
    updatedAt: entitlement.updatedAt,
    orderItem: entitlement.orderItem
      ? {
          id: entitlement.orderItem.id,
          artworkTitle: entitlement.orderItem.artworkTitle,
          artistName: entitlement.orderItem.artistName,
          quantity: entitlement.orderItem.quantity,
          unitAmount: entitlement.orderItem.unitAmount,
          subtotalAmount: entitlement.orderItem.subtotalAmount,
          currency: entitlement.orderItem.currency || "EUR"
        }
      : null,
    artwork: entitlement.artwork ? serializeAdminArtworkSummary(entitlement.artwork) : null,
    owner: serializeAdminActor(entitlement.user)
  };
}

function serializeAdminOwnershipCertificate(certificate) {
  return {
    id: certificate.id,
    publicId: certificate.publicId,
    certificateNumber: certificate.certificateNumber,
    orderItemId: certificate.orderItemId,
    userId: certificate.userId,
    artworkId: certificate.artworkId,
    status: certificate.status,
    issuedAt: certificate.issuedAt,
    suspendedAt: certificate.suspendedAt || null,
    revokedAt: certificate.revokedAt || null,
    updatedAt: certificate.updatedAt,
    orderItem: certificate.orderItem
      ? {
          id: certificate.orderItem.id,
          artworkTitle: certificate.orderItem.artworkTitle,
          artistName: certificate.orderItem.artistName,
          quantity: certificate.orderItem.quantity,
          unitAmount: certificate.orderItem.unitAmount,
          subtotalAmount: certificate.orderItem.subtotalAmount,
          currency: certificate.orderItem.currency || "EUR"
        }
      : null,
    artwork: certificate.artwork ? serializeAdminArtworkSummary(certificate.artwork) : null,
    owner: serializeAdminActor(certificate.user)
  };
}

function serializeAdminReservation(reservation) {
  return {
    id: reservation.id,
    artworkId: reservation.artworkId,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
    artwork: reservation.artwork ? serializeAdminArtworkSummary(reservation.artwork) : null
  };
}

function serializeAdminOrderItem(item) {
  return {
    id: item.id,
    artworkId: item.artworkId,
    artworkTitle: item.artworkTitle,
    artistName: item.artistName,
    quantity: item.quantity,
    unitAmount: item.unitAmount,
    subtotalAmount: item.subtotalAmount,
    discountAmount: item.discountAmount,
    netAmount: item.netAmount,
    taxAmount: item.taxAmount,
    taxRateBps: item.taxRateBps,
    commissionAmount: item.commissionAmount,
    commissionRateBps: item.commissionRateBps,
    currency: item.currency || "EUR",
    createdAt: item.createdAt,
    artwork: item.artwork ? serializeAdminArtworkSummary(item.artwork) : null
  };
}

function buildAdminUserDetailPayload(user) {
  return {
    user: {
      ...serializeAdminUser(user),
      bio: user.bio || "",
      phone: user.phone || "",
      artistProfile: user.artist
        ? {
            id: user.artist.id,
            name: user.artist.displayName || user.username || "Unnamed artist",
            verified: Boolean(user.artist.verified),
            artworksCount: user.artist._count?.artworks || 0,
            followersCount: user.artist._count?.followers || 0,
            collectionsCount: user.artist._count?.collections || 0,
            createdAt: user.artist.createdAt || null,
            artworksPreview: (user.artist.artworks || []).map(serializeAdminArtworkSummary),
            collectionsPreview: (user.artist.collections || []).map(serializeAdminCollectionSummary)
          }
        : null,
      artistApplication: serializeAdminArtistApplicationSummary(user.artistApplicationDraft)
    },
    metrics: {
      ordersCount: user._count?.orders || 0,
      collectionsCount: user._count?.personalCollections || 0,
      favoritesCount: user._count?.favorites || 0,
      followsCount: user._count?.follows || 0,
      activityCount: user._count?.auditLogs || 0,
      refundsRequestedCount: user._count?.refundsRequested || 0
    },
    recentOrders: (user.orders || []).map(serializeAdminOrderSummary),
    collections: (user.personalCollections || []).map(serializeAdminCollectionSummary),
    favorites: (user.favorites || []).map(serializeAdminFavoriteSummary),
    follows: (user.follows || []).map(serializeAdminFollowSummary),
    accountHistory: (user.accountAuditLogs || []).map(serializeAdminAuditLog),
    activityHistory: (user.auditLogs || []).map(serializeAdminAuditLog)
  };
}

function buildAdminArtistDetailPayload(artist) {
  const recentSales = (artist.recentSales || []).map((orderItem) => ({
    id: orderItem.id,
    artworkId: orderItem.artworkId,
    artworkTitle: orderItem.artworkTitle,
    artistName: orderItem.artistName,
    quantity: orderItem.quantity,
    unitAmount: orderItem.unitAmount,
    subtotalAmount: orderItem.subtotalAmount,
    currency: orderItem.currency || "EUR",
    createdAt: orderItem.createdAt,
    artwork: orderItem.artwork ? serializeAdminArtworkSummary(orderItem.artwork) : null,
    order: orderItem.order
      ? {
          id: orderItem.order.id,
          publicId: orderItem.order.publicId,
          reference: buildOrderReference(orderItem.order.id),
          status: ORDER_STATUS_LABELS[orderItem.order.status] || orderItem.order.status,
          totalAmount: orderItem.order.totalAmount,
          currency: orderItem.order.currency || "EUR",
          createdAt: orderItem.order.createdAt,
          customer: serializeAdminActor(orderItem.order.user)
        }
      : null
  }));

  return {
    artist: {
      ...serializeAdminArtist(artist),
      user: {
        ...serializeAdminActor(artist.user),
        phone: artist.user?.phone || "",
        role: buildUserRole({
          ...artist.user,
          artist: {
            id: artist.id
          }
        }),
        status: buildUserStatus(artist.user),
        verified: Boolean(artist.user?.verified),
        createdAt: artist.user?.createdAt || null
      },
      application: serializeAdminArtistApplicationSummary(artist.user?.artistApplicationDraft)
    },
    metrics: {
      artworksCount: artist._count?.artworks || 0,
      followersCount: artist._count?.followers || 0,
      collectionsCount: artist._count?.collections || 0,
      soldItemsCount: artist.soldItemsCount || 0
    },
    artworks: (artist.artworks || []).map(serializeAdminArtworkSummary),
    followers: (artist.followers || []).map((follow) => ({
      id: follow.id,
      createdAt: follow.createdAt,
      user: serializeAdminActor(follow.user)
    })),
    collections: (artist.collections || []).map(serializeAdminCollectionSummary),
    recentSales,
    auditLog: (artist.auditLogs || []).map(serializeAdminAuditLog)
  };
}

function buildAdminOrderDetailPayload(order) {
  return {
    order: {
      id: order.id,
      publicId: order.publicId,
      reference: buildOrderReference(order.id),
      status: buildOrderStatus(order),
      statusCode: order.status,
      customerType: order.customerType,
      marketCountry: order.marketCountry,
      currency: order.currency || "EUR",
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      subtotalExcludingTaxAmount: order.subtotalExcludingTaxAmount,
      taxAmount: order.taxAmount,
      taxRateBps: order.taxRateBps,
      taxBehavior: order.taxBehavior,
      feeAmount: order.feeAmount,
      commissionAmount: order.commissionAmount,
      commissionRateBps: order.commissionRateBps,
      totalAmount: order.totalAmount,
      pricingFingerprint: order.pricingFingerprint,
      billingSnapshot: order.billingSnapshot || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paidAt: order.paidAt || null,
      canceledAt: order.canceledAt || null,
      expiresAt: order.expiresAt,
      customer: serializeAdminActor(order.user)
    },
    items: (order.items || []).map(serializeAdminOrderItem),
    payments: (order.payments || []).map((payment) => ({
      ...serializeAdminPaymentSummary(payment),
      refunds: (payment.refunds || []).map(serializeAdminRefundDetail)
    })),
    refunds: (order.refunds || []).map(serializeAdminRefundDetail),
    transitions: (order.financialTransitions || []).map(serializeAdminTransition),
    fulfillmentTasks: (order.fulfillmentTasks || []).map(serializeAdminFulfillmentTask),
    alerts: (order.operatorAlerts || []).map(serializeAdminOperatorAlert),
    disputes: (order.disputes || []).map(serializeAdminDispute),
    invoices: (order.invoices || []).map(serializeAdminInvoice),
    entitlements: (order.digitalEntitlements || []).map(serializeAdminDigitalEntitlement),
    ownershipCertificates: (order.ownershipCertificates || []).map(
      serializeAdminOwnershipCertificate
    ),
    reservations: (order.reservations || []).map(serializeAdminReservation),
    auditLog: (order.auditLogs || []).map(serializeAdminAuditLog)
  };
}

function buildAdminPaymentDetailPayload(payment) {
  return {
    payment: {
      ...serializeAdminPaymentSummary(payment),
      order: payment.order
        ? {
            id: payment.order.id,
            publicId: payment.order.publicId,
            reference: buildOrderReference(payment.order.id),
            status: buildOrderStatus(payment.order),
            statusCode: payment.order.status,
            currency: payment.order.currency || "EUR",
            subtotalAmount: payment.order.subtotalAmount,
            taxAmount: payment.order.taxAmount,
            totalAmount: payment.order.totalAmount,
            createdAt: payment.order.createdAt,
            paidAt: payment.order.paidAt || null,
            customer: serializeAdminActor(payment.order.user),
            items: (payment.order.items || []).map(serializeAdminOrderItem)
          }
        : null
    },
    refunds: (payment.refunds || []).map(serializeAdminRefundDetail),
    webhookEvents: (payment.webhookEvents || []).map(serializeAdminWebhookEvent),
    transitions: (payment.financialTransitions || []).map(serializeAdminTransition),
    alerts: (payment.operatorAlerts || []).map(serializeAdminOperatorAlert),
    disputes: (payment.disputes || []).map(serializeAdminDispute),
    auditLog: (payment.auditLogs || []).map(serializeAdminAuditLog)
  };
}

router.get("/admin/users", authRequired, adminRequired, async (req, res) => {
  try {
    const users = await userRepository.listUsersForAdmin();
    const payload = users.map(serializeAdminUser);

    return res.status(200).json({
      summary: {
        totalUsers: payload.length,
        activeUsers: payload.filter((user) => user.statusCode === USER_ACCOUNT_STATUS.ACTIVE)
          .length,
        pendingVerificationUsers: payload.filter(
          (user) => user.statusCode === USER_ACCOUNT_STATUS.PENDING_VERIFICATION
        ).length,
        suspendedUsers: payload.filter((user) => user.statusCode === USER_ACCOUNT_STATUS.SUSPENDED)
          .length,
        blockedUsers: payload.filter((user) => user.statusCode === USER_ACCOUNT_STATUS.BLOCKED)
          .length,
        adminUsers: payload.filter((user) => user.isAdmin).length,
        superAdminUsers: payload.filter((user) => user.isSuperAdmin).length
      },
      permissions: {
        canManageAdmins: isSuperAdminUser(req.user),
        currentUserId: req.user.id,
        isSuperAdmin: isSuperAdminUser(req.user)
      },
      users: payload
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin users"
    });
  }
});

router.post(
  "/admin/users/admins",
  authRequired,
  adminRequired,
  superAdminRequired,
  async (req, res) => {
    try {
      const username = normalizeText(req.body.username);
      const email = normalizeEmail(req.body.email);
      const phone = normalizeText(req.body.phone);
      const isSuperAdmin = Boolean(req.body.isSuperAdmin);

      if (!username || !email) {
        return res.status(400).json({
          message: "Username and email are required"
        });
      }

      const invitedUser = await inviteAdminUser({
        username,
        email,
        phone,
        isSuperAdmin
      });

      await writeAdminAuditLog(prisma, {
        actorUser: req.user,
        action: isSuperAdmin ? "USER_SUPER_ADMIN_INVITED" : "USER_ADMIN_INVITED",
        entityType: "USER",
        entityId: invitedUser.id,
        ipAddress: req.ip
      });

      return res.status(201).json({
        message: isSuperAdmin ? "Super admin invitation sent" : "Admin invitation sent",
        user: serializeAdminUser(invitedUser)
      });
    } catch (error) {
      if (error.code === "P2002" || error.message === "Email already in use") {
        return res.status(409).json({
          message: "Email is already in use"
        });
      }

      console.error("Admin invitation error:", error);

      return res.status(500).json({
        message: "Unable to invite this admin"
      });
    }
  }
);

router.get("/admin/users/:userId", authRequired, adminRequired, async (req, res) => {
  const userId = parsePositiveInteger(req.params.userId);

  if (!userId) {
    return res.status(400).json({
      message: "Invalid user id"
    });
  }

  try {
    const user = await userRepository.findUserDetailForAdmin(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.status(200).json(buildAdminUserDetailPayload(user));
  } catch (error) {
    console.error("Admin user detail fetch error:", error);

    return res.status(500).json({
      message: "Unable to load this user"
    });
  }
});

router.patch(
  "/admin/users/:userId/account-status",
  authRequired,
  adminRequired,
  async (req, res) => {
    const targetUserId = parsePositiveInteger(req.params.userId);

    if (!targetUserId) {
      return res.status(400).json({
        message: "Invalid user id"
      });
    }

    try {
      const updatedUser = await updateUserAccountStatus({
        actorUser: req.user,
        targetUserId,
        nextStatus: String(req.body.status || "")
          .trim()
          .toLowerCase(),
        ipAddress: req.ip
      });

      const nextStatus = getUserAccountStatus(updatedUser);
      const successMessages = {
        [USER_ACCOUNT_STATUS.ACTIVE]: "User account reactivated",
        [USER_ACCOUNT_STATUS.SUSPENDED]: "User account suspended",
        [USER_ACCOUNT_STATUS.BLOCKED]: "User account blocked",
        [USER_ACCOUNT_STATUS.PENDING_VERIFICATION]: "User status updated"
      };

      return res.status(200).json({
        message: successMessages[nextStatus] || "User status updated",
        user: serializeAdminUser(updatedUser)
      });
    } catch (error) {
      return handleAdminUserManagementError(res, error, "Admin user account status update error:");
    }
  }
);

router.patch("/admin/users/:userId/admin-access", authRequired, adminRequired, async (req, res) => {
  const targetUserId = parsePositiveInteger(req.params.userId);

  if (!targetUserId) {
    return res.status(400).json({
      message: "Invalid user id"
    });
  }

  try {
    const action = String(req.body.action || "")
      .trim()
      .toLowerCase();
    let updatedUser = null;
    let successMessage = "Admin access updated";

    if (action === "remove_admin") {
      updatedUser = await removeAdminAccess({
        actorUser: req.user,
        targetUserId,
        ipAddress: req.ip
      });
      successMessage = "Admin access removed";
    } else if (action === "remove_super_admin") {
      updatedUser = await removeSuperAdminAccess({
        actorUser: req.user,
        targetUserId,
        ipAddress: req.ip
      });
      successMessage = "Super admin access removed";
    } else {
      return res.status(400).json({
        message: "Invalid admin access action"
      });
    }

    return res.status(200).json({
      message: successMessage,
      user: serializeAdminUser(updatedUser)
    });
  } catch (error) {
    return handleAdminUserManagementError(res, error, "Admin access update error:");
  }
});

router.get("/admin/artists", authRequired, adminRequired, async (_req, res) => {
  try {
    const artists = await artistRepository.listArtistsForAdmin();

    const payload = artists.map(serializeAdminArtist);

    return res.status(200).json({
      summary: {
        totalArtists: payload.length,
        verifiedArtists: payload.filter((artist) => artist.verified).length,
        pendingArtists: payload.filter((artist) => !artist.verified).length,
        totalArtworks: payload.reduce((sum, artist) => sum + artist.artworksCount, 0)
      },
      artists: payload
    });
  } catch (error) {
    console.error("Admin artists fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin artists"
    });
  }
});

router.get("/admin/artists/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const artistId = Number(req.params.id);

    if (!Number.isInteger(artistId) || artistId < 1) {
      return res.status(400).json({
        message: "Invalid artist id"
      });
    }

    const artist = await artistRepository.findArtistDetailForAdmin(artistId);

    if (!artist) {
      return res.status(404).json({
        message: "Artist profile not found"
      });
    }

    return res.status(200).json(buildAdminArtistDetailPayload(artist));
  } catch (error) {
    console.error("Admin artist detail fetch error:", error);

    return res.status(500).json({
      message: "Unable to load this artist profile"
    });
  }
});

router.patch("/admin/artists/:id/verification", authRequired, adminRequired, async (req, res) => {
  try {
    const artistId = Number(req.params.id);
    const { verified } = req.body;

    if (!Number.isInteger(artistId) || artistId < 1) {
      return res.status(400).json({
        message: "Invalid artist id"
      });
    }

    if (typeof verified !== "boolean") {
      return res.status(400).json({
        message: "Verified must be a boolean"
      });
    }

    const artist = await prisma.$transaction(async (transaction) => {
      const updatedArtist = await artistRepository.updateArtistVerification({
        artistId,
        verified,
        prismaClient: transaction
      });

      if (verified) {
        const pendingApplication = await transaction.artistApplicationDraft.findUnique({
          where: { userId: updatedArtist.userId }
        });

        if (pendingApplication?.status === ARTIST_APPLICATION_STATUS.PENDING) {
          await artistApplicationDraftRepository.markApproved({
            applicationId: pendingApplication.id,
            reviewedByAdminId: req.user.id,
            reviewNote: "Activated from artist verification",
            prismaClient: transaction
          });
        }
      }

      await writeAdminAuditLog(transaction, {
        actorUser: req.user,
        action: verified ? "ARTIST_VERIFIED" : "ARTIST_UNVERIFIED",
        entityType: "ARTIST",
        entityId: artistId,
        ipAddress: req.ip
      });

      return updatedArtist;
    });

    return res.status(200).json({
      message: verified ? "Artist profile verified" : "Artist profile moved to pending",
      artist: serializeAdminArtist(artist)
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Artist profile not found"
      });
    }

    console.error("Admin artist verification update error:", error);
    return res.status(500).json({
      message: "Unable to update artist verification"
    });
  }
});

router.get("/admin/artist-applications", authRequired, adminRequired, async (_req, res) => {
  try {
    const applications = await artistApplicationDraftRepository.listSubmittedApplications();
    const payload = applications.map(serializeAdminArtistApplication);

    return res.status(200).json({
      summary: {
        totalApplications: payload.length,
        pendingApplications: payload.filter(
          (application) => application.status === ARTIST_APPLICATION_STATUS.PENDING
        ).length,
        approvedApplications: payload.filter(
          (application) => application.status === ARTIST_APPLICATION_STATUS.APPROVED
        ).length,
        rejectedApplications: payload.filter(
          (application) => application.status === ARTIST_APPLICATION_STATUS.REJECTED
        ).length
      },
      applications: payload
    });
  } catch (error) {
    console.error("Admin artist applications fetch error:", error);

    return res.status(500).json({
      message: "Unable to load artist applications"
    });
  }
});

router.patch("/admin/artist-applications/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const status = String(req.body.status || "")
      .trim()
      .toLowerCase();
    const reviewNote = String(req.body.reviewNote || "").trim();

    if (!Number.isInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({
        message: "Invalid artist application id"
      });
    }

    if (
      ![ARTIST_APPLICATION_STATUS.APPROVED, ARTIST_APPLICATION_STATUS.REJECTED].includes(status)
    ) {
      return res.status(400).json({
        message: "Status must be approved or rejected"
      });
    }

    const application = await prisma.$transaction(async (transaction) => {
      const reviewedApplication =
        status === ARTIST_APPLICATION_STATUS.APPROVED
          ? await artistApplicationDraftRepository.markApproved({
              applicationId,
              reviewedByAdminId: req.user.id,
              reviewNote,
              prismaClient: transaction
            })
          : await artistApplicationDraftRepository.markRejected({
              applicationId,
              reviewedByAdminId: req.user.id,
              reviewNote,
              prismaClient: transaction
            });

      await writeAdminAuditLog(transaction, {
        actorUser: req.user,
        action: `ARTIST_APPLICATION_${status.toUpperCase()}`,
        entityType: "ARTIST_APPLICATION",
        entityId: applicationId,
        ipAddress: req.ip
      });

      if (status === ARTIST_APPLICATION_STATUS.APPROVED) {
        let artistId = reviewedApplication?.user?.artist?.id;

        if (!Number.isSafeInteger(artistId)) {
          const ensuredArtist = await transaction.artist.findUnique({
            where: { userId: reviewedApplication.userId },
            select: { id: true, verified: true }
          });
          artistId = ensuredArtist?.id;

          if (Number.isSafeInteger(artistId) && !ensuredArtist.verified) {
            await transaction.artist.update({
              where: { id: artistId },
              data: { verified: true }
            });
          }
        }

        if (Number.isSafeInteger(artistId)) {
          await writeAdminAuditLog(transaction, {
            actorUser: req.user,
            action: "ARTIST_PROFILE_ACTIVATED",
            entityType: "ARTIST",
            entityId: artistId,
            ipAddress: req.ip
          });
        }
      }

      return reviewedApplication;
    });

    if (status === ARTIST_APPLICATION_STATUS.APPROVED) {
      try {
        await notificationRepository.createNotificationOnce({
          userId: application.userId,
          type: "artist_application_approved",
          title: "Profil artiste valide",
          message:
            "Votre candidature artiste a ete approuvee. Votre espace artiste est maintenant accessible.",
          payload: {
            applicationId,
            artistId: application.user?.artist?.id || null
          },
          eventKey: `artist-application-approved:${applicationId}`
        });
      } catch (notificationError) {
        console.error("Artist approval notification failed:", notificationError);
      }
    }

    const refreshedApplication = await artistApplicationDraftRepository.findById(application.id);

    return res.status(200).json({
      message:
        status === ARTIST_APPLICATION_STATUS.APPROVED
          ? "Artist application approved"
          : "Artist application rejected",
      application: serializeAdminArtistApplication(refreshedApplication || application)
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Artist application not found"
      });
    }

    console.error("Admin artist application review error:", error);
    return res.status(500).json({
      message: "Unable to review artist application"
    });
  }
});

router.get(
  "/admin/artist-applications/:id/contract.pdf",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const applicationId = Number(req.params.id);

      if (!Number.isInteger(applicationId) || applicationId < 1) {
        return res.status(400).json({
          message: "Invalid artist application id"
        });
      }

      const application = await artistApplicationDraftRepository.findById(applicationId);

      if (!application || (!application.contractPdf && !application.signatureDataUrl)) {
        return res.status(404).json({
          message: "Artist contract not found"
        });
      }

      const { payload, pdfBuffer } = await resolveApplicationContractPdf(application);
      const nameSource =
        payload.displayName || application.user?.username || application.user?.email || "artist";
      const safeName = String(nameSource)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("Stored artist contract PDF is unreadable");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="make-it-art-artist-contract-${safeName || "artist"}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");

      return res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("Admin artist contract download error:", error);
      return res.status(500).json({
        message: "Unable to load artist contract"
      });
    }
  }
);

router.get("/admin/artworks", authRequired, adminRequired, async (_req, res) => {
  try {
    const artworks = await artworkRepository.listArtworksForAdmin();
    const payload = artworks.map(serializeAdminArtwork);

    return res.status(200).json({
      summary: {
        totalArtworks: payload.length,
        pendingArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.PENDING
        ).length,
        approvedArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.APPROVED
        ).length,
        rejectedArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.REJECTED
        ).length,
        hiddenArtworks: payload.filter(
          (artwork) => artwork.status === ARTWORK_MODERATION_STATUS.HIDDEN
        ).length,
        totalFavorites: payload.reduce((sum, artwork) => sum + (artwork.favoriteCount || 0), 0)
      },
      artworks: payload
    });
  } catch (error) {
    console.error("Admin artworks fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin artworks"
    });
  }
});

router.patch("/admin/artworks/:id/moderation", authRequired, adminRequired, async (req, res) => {
  try {
    const artworkId = Number(req.params.id);
    const status = String(req.body.status || "")
      .trim()
      .toLowerCase();
    const moderationNote = String(req.body.moderationNote || req.body.reviewNote || "").trim();

    if (!Number.isInteger(artworkId) || artworkId < 1) {
      return res.status(400).json({
        message: "Invalid artwork id"
      });
    }

    if (!isArtworkModerationStatus(status)) {
      return res.status(400).json({
        message: "Status must be pending, approved, rejected or hidden"
      });
    }

    const artwork = await prisma.$transaction(async (transaction) => {
      const updatedArtwork = await artworkRepository.updateArtworkModeration({
        artworkId,
        status,
        moderationNote,
        moderatedByAdminId: req.user.id,
        prismaClient: transaction
      });

      await writeAdminAuditLog(transaction, {
        actorUser: req.user,
        action: `ARTWORK_MODERATION_${status.toUpperCase()}`,
        entityType: "ARTWORK",
        entityId: artworkId,
        ipAddress: req.ip
      });

      return updatedArtwork;
    });

    return res.status(200).json({
      message: `Artwork marked as ${buildArtworkStatus(artwork).toLowerCase()}.`,
      artwork: serializeAdminArtwork(artwork)
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Artwork not found"
      });
    }

    console.error("Admin artwork moderation update error:", error);

    return res.status(500).json({
      message: "Unable to update artwork moderation"
    });
  }
});

router.get("/admin/orders", authRequired, adminRequired, async (_req, res) => {
  try {
    const orders = await orderRepository.listOrdersForAdmin();

    const payload = orders.map((order) => {
      const amountValue = getOrderAmountValue(order);
      const refundSummary = getAdminRefundSummary(order);

      return {
        id: order.id,
        publicId: order.publicId,
        reference: `#ORD-${String(order.id).padStart(4, "0")}`,
        customer: order.user?.username || order.user?.email || "User",
        customerEmail: order.user?.email || "Email not provided",
        status: buildOrderStatus(order),
        statusCode: order.status,
        totalAmount: Number.isSafeInteger(order.totalAmount)
          ? order.totalAmount
          : Math.round(amountValue * 100),
        amountValue,
        amount: formatCurrencyAmount(amountValue),
        itemsCount: order.items.length,
        paymentsCount: order.payments.length,
        createdAt: order.createdAt,
        ...refundSummary
      };
    });

    return res.status(200).json({
      summary: {
        totalOrders: payload.length,
        paidOrders: payload.filter((order) => order.status === "Paid").length,
        pendingOrders: payload.filter((order) => order.status === "Pending").length,
        refundedOrders: payload.filter((order) => order.status === "Refunded").length
      },
      orders: payload
    });
  } catch (error) {
    console.error("Admin orders fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin orders"
    });
  }
});

router.get("/admin/orders/:publicId", authRequired, adminRequired, async (req, res) => {
  const publicId = normalizeText(req.params.publicId);

  if (!publicId) {
    return res.status(400).json({
      message: "Invalid order id"
    });
  }

  try {
    const order = await orderRepository.findOrderDetailForAdmin(publicId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    return res.status(200).json(buildAdminOrderDetailPayload(order));
  } catch (error) {
    console.error("Admin order detail fetch error:", error);

    return res.status(500).json({
      message: "Unable to load this order"
    });
  }
});

router.get("/admin/payments", authRequired, adminRequired, async (_req, res) => {
  try {
    const payments = await paymentRepository.listPaymentsForAdmin();

    const payload = payments.map((payment) => {
      const amountValue = getPaymentAmountValue(payment);

      return {
        id: payment.id,
        reference: `PAY-${String(payment.id).padStart(5, "0")}`,
        orderReference: `#ORD-${String(payment.orderId).padStart(4, "0")}`,
        customer: payment.order?.user?.username || payment.order?.user?.email || "User",
        method: payment.method || "Unknown",
        status: buildPaymentStatus(payment),
        amountValue,
        amount: formatCurrencyAmount(amountValue),
        createdAt: payment.createdAt
      };
    });

    const grossRevenue = payload.reduce((sum, payment) => {
      return payment.status === "Succeeded" ? sum + payment.amountValue : sum;
    }, 0);

    return res.status(200).json({
      summary: {
        totalPayments: payload.length,
        succeededPayments: payload.filter((payment) => payment.status === "Succeeded").length,
        pendingPayments: payload.filter((payment) => payment.status === "Pending").length,
        grossRevenue: formatCurrencyAmount(grossRevenue)
      },
      payments: payload
    });
  } catch (error) {
    console.error("Admin payments fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin payments"
    });
  }
});

router.get("/admin/payments/:id", authRequired, adminRequired, async (req, res) => {
  const paymentId = parsePositiveInteger(req.params.id);

  if (!paymentId) {
    return res.status(400).json({
      message: "Invalid payment id"
    });
  }

  try {
    const payment = await paymentRepository.findPaymentDetailForAdmin(paymentId);

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found"
      });
    }

    return res.status(200).json(buildAdminPaymentDetailPayload(payment));
  } catch (error) {
    console.error("Admin payment detail fetch error:", error);

    return res.status(500).json({
      message: "Unable to load this payment"
    });
  }
});

router.get("/admin/artist-withdrawals", authRequired, adminRequired, async (_req, res) => {
  try {
    const payload = await listAdminArtistWithdrawals();

    return res.status(200).json({
      summary: payload.summary,
      withdrawals: payload.withdrawals.map(serializeAdminArtistWithdrawalSummary)
    });
  } catch (error) {
    console.error("Admin artist withdrawals fetch error:", error);

    return res.status(500).json({
      message: "Unable to load artist withdrawals"
    });
  }
});

router.patch(
  "/admin/artist-withdrawals/:publicId",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const publicId = normalizeText(req.params.publicId);
      const action = normalizeText(req.body?.action).toLowerCase();

      if (!publicId) {
        return res.status(400).json({
          message: "Invalid withdrawal id"
        });
      }

      if (!["approve", "reject", "mark_paid"].includes(action)) {
        return res.status(400).json({
          message: "Action must be approve, reject or mark_paid"
        });
      }

      const withdrawal = await updateArtistWithdrawalStatus({
        publicId,
        action,
        actorUserId: req.user.id,
        adminNote: req.body?.adminNote,
        payoutReference: req.body?.payoutReference
      });

      await writeAdminAuditLog(prisma, {
        actorUser: req.user,
        action: `ARTIST_WITHDRAWAL_${action.toUpperCase()}`,
        entityType: "ARTIST_WITHDRAWAL",
        entityId: publicId,
        ipAddress: req.ip
      });

      return res.status(200).json({
        message: "Artist withdrawal updated.",
        withdrawal: serializeAdminArtistWithdrawalSummary(withdrawal)
      });
    } catch (error) {
      if (error instanceof ArtistWithdrawalError) {
        return res.status(error.statusCode).json({
          code: error.code,
          message: error.message
        });
      }

      console.error("Admin artist withdrawal update error:", error);

      return res.status(500).json({
        message: "Unable to update this artist withdrawal"
      });
    }
  }
);

router.get("/admin/audit-log", authRequired, adminRequired, async (req, res) => {
  const entityType = normalizeText(req.query.entityType).toUpperCase();

  if (entityType && !isAdminAuditEntityType(entityType)) {
    return res.status(400).json({
      message: "Invalid audit entity type"
    });
  }

  try {
    const auditLog = await listAdminAuditLogs({
      entityType,
      entityId: normalizeText(req.query.entityId),
      actorUserId: parsePositiveInteger(req.query.actorUserId),
      actionQuery: normalizeText(req.query.action),
      limit: parseAuditLimit(req.query.limit, 120)
    });

    return res.status(200).json({
      summary: {
        totalEntries: auditLog.totalEntries,
        latestEntryAt: auditLog.entries[0]?.createdAt || null,
        entityTypeCounts: auditLog.groupedEntries
      },
      filters: auditLog.filters,
      entityTypes: ADMIN_AUDIT_ENTITY_TYPES.map((auditEntityType) => ({
        value: auditEntityType,
        label: getAdminAuditEntityLabel(auditEntityType)
      })),
      entries: auditLog.entries.map(serializeAdminAuditLog)
    });
  } catch (error) {
    console.error("Admin audit log fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin audit log"
    });
  }
});

router.get("/admin/dashboard", authRequired, adminRequired, async (_req, res) => {
  try {
    const [users, artists, orders, payments] = await Promise.all([
      userRepository.listUsersForAdmin(),
      artistRepository.listArtistsForAdmin(),
      orderRepository.listOrdersForAdmin(),
      paymentRepository.listPaymentsForAdmin()
    ]);

    const succeededPayments = payments.filter(
      (payment) => buildPaymentStatus(payment) === "Succeeded"
    );
    const grossRevenue = succeededPayments.reduce(
      (sum, payment) => sum + getPaymentAmountValue(payment),
      0
    );

    const latestUser = users[0];
    const latestArtist = artists[0];
    const latestOrder = orders[0];
    const latestPayment = payments[0];

    return res.status(200).json({
      stats: [
        {
          label: "Users",
          value: users.length,
          description: "All accounts registered on the platform."
        },
        {
          label: "Artists",
          value: artists.length,
          description: "Artist profiles to review or verify."
        },
        {
          label: "Orders",
          value: orders.length,
          description: "Orders currently stored in the database."
        },
        {
          label: "Revenue",
          value: formatCurrencyAmount(grossRevenue),
          description: "Total value of successful payments in the database."
        }
      ],
      activities: [
        {
          title: "Latest user",
          description: latestUser
            ? `${latestUser.username || latestUser.email || "User"} joined the platform.`
            : "No users are currently available.",
          tag: "US"
        },
        {
          title: "Latest artist profile",
          description: latestArtist
            ? `${latestArtist.displayName || latestArtist.user?.username || "Artist"} is the most recent artist profile.`
            : "No artist profiles have been created yet.",
          tag: "AR"
        },
        {
          title: "Latest order",
          description: latestOrder
            ? `Order #ORD-${String(latestOrder.id).padStart(4, "0")} has status ${buildOrderStatus(latestOrder)}.`
            : "No orders are currently available.",
          tag: "OR"
        },
        {
          title: "Latest payment",
          description: latestPayment
            ? `Payment PAY-${String(latestPayment.id).padStart(5, "0")} has status ${buildPaymentStatus(latestPayment)}.`
            : "No payments are currently available.",
          tag: "PY"
        }
      ],
      shortcuts: [
        {
          label: "Go to users",
          description: "Review accounts, statuses and roles.",
          route: "/admin/users"
        },
        {
          label: "Go to orders",
          description: "Review orders, statuses and associated customers.",
          route: "/admin/orders"
        },
        {
          label: "Go to payments",
          description: "Track transactions and recorded revenue.",
          route: "/admin/payments"
        },
        {
          label: "Go to settings",
          description: "Update the admin account and its security settings.",
          route: "/admin/settings"
        }
      ]
    });
  } catch (error) {
    console.error("Admin dashboard fetch error:", error);

    return res.status(500).json({
      message: "Unable to load admin dashboard"
    });
  }
});

module.exports = router;
