const crypto = require("node:crypto");
const prisma = require("../lib/prisma");
const env = require("../config/env");

const ELIGIBLE_ORDER_STATUSES = new Set(["PAID", "PARTIALLY_REFUNDED"]);
const OPEN_DISPUTE_STATUSES = new Set(["NEEDS_RESPONSE", "UNDER_REVIEW"]);

class DigitalDeliveryError extends Error {
  constructor(code, message, { retryable = true, canceled = false } = {}) {
    super(message);
    this.name = "DigitalDeliveryError";
    this.code = code;
    this.retryable = retryable;
    this.canceled = canceled;
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function certificateNumber(orderPublicId, orderItemId) {
  return `MIA-${hash(`${orderPublicId}:${orderItemId}`).slice(0, 20).toUpperCase()}`;
}

function certificateSnapshot(order, item) {
  return {
    version: 1,
    orderId: order.publicId,
    orderItemId: item.id,
    artworkId: item.artworkId,
    artworkTitle: item.artworkTitle,
    artistName: item.artistName,
    licenseType: item.licenseType,
    owner: order.user.username,
    quantity: item.quantity,
    unitAmount: item.unitAmount,
    currency: item.currency,
    paidAt: order.paidAt?.toISOString() || null
  };
}

function deliveryState(order, disputeRightsPolicy) {
  if (
    order.status === "REFUNDED" ||
    (disputeRightsPolicy === "SUSPEND_ON_OPEN" &&
      order.disputes.some(({ status }) => status === "LOST"))
  ) {
    return "REVOKED";
  }
  if (
    disputeRightsPolicy === "SUSPEND_ON_OPEN" &&
    order.disputes.some(({ status }) => OPEN_DISPUTE_STATUSES.has(status))
  ) {
    return "SUSPENDED";
  }
  return "ACTIVE";
}

function assertDeliveryAllowed(order) {
  if (ELIGIBLE_ORDER_STATUSES.has(order.status)) return;
  const terminal = ["REFUNDED", "CANCELED"].includes(order.status);
  throw new DigitalDeliveryError(
    terminal ? "DIGITAL_DELIVERY_CANCELED" : "ORDER_NOT_READY_FOR_DIGITAL_DELIVERY",
    "The order is not eligible for digital delivery",
    { retryable: !terminal, canceled: terminal }
  );
}

async function lockedOrder(transaction, orderId) {
  await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${orderId})::text AS lock`;
  const order = await transaction.order.findUnique({
    where: { id: orderId },
    include: {
      items: { orderBy: { id: "asc" } },
      user: { select: { username: true } },
      disputes: { select: { providerDisputeId: true, status: true } }
    }
  });
  if (!order) {
    throw new DigitalDeliveryError(
      "DIGITAL_DELIVERY_ORDER_NOT_FOUND",
      "The order no longer exists",
      {
        retryable: false
      }
    );
  }
  return order;
}

async function grantDownloadRights({
  task,
  prismaClient = prisma,
  disputeRightsPolicy = env.paymentOperations.disputeRightsPolicy,
  now = new Date()
}) {
  return prismaClient.$transaction(async (transaction) => {
    const order = await lockedOrder(transaction, task.orderId);
    assertDeliveryAllowed(order);
    const status = deliveryState(order, disputeRightsPolicy);

    for (const item of order.items) {
      await transaction.digitalEntitlement.upsert({
        where: { orderItemId: item.id },
        create: {
          orderId: order.id,
          orderItemId: item.id,
          userId: order.userId,
          artworkId: item.artworkId,
          status,
          sourceTaskKey: task.taskKey,
          grantedAt: now,
          ...(status === "SUSPENDED" ? { suspendedAt: now } : {}),
          ...(status === "REVOKED" ? { revokedAt: now } : {})
        },
        update: {}
      });
    }

    return { effectReference: `rights:${order.publicId}:grant` };
  });
}

async function generateCertificates({
  task,
  prismaClient = prisma,
  disputeRightsPolicy = env.paymentOperations.disputeRightsPolicy,
  now = new Date()
}) {
  return prismaClient.$transaction(async (transaction) => {
    const order = await lockedOrder(transaction, task.orderId);
    assertDeliveryAllowed(order);
    const status = deliveryState(order, disputeRightsPolicy);

    for (const item of order.items) {
      const snapshot = certificateSnapshot(order, item);
      await transaction.ownershipCertificate.upsert({
        where: { orderItemId: item.id },
        create: {
          certificateNumber: certificateNumber(order.publicId, item.id),
          orderId: order.id,
          orderItemId: item.id,
          userId: order.userId,
          artworkId: item.artworkId,
          status,
          snapshot,
          fingerprint: hash(JSON.stringify(snapshot)),
          issuedAt: now,
          ...(status === "SUSPENDED" ? { suspendedAt: now } : {}),
          ...(status === "REVOKED" ? { revokedAt: now } : {})
        },
        update: {}
      });
    }

    return { effectReference: `certificates:${order.publicId}:generate` };
  });
}

function disputeIdFromTask(task, expectedAction) {
  const match = new RegExp(`^dispute:([^:]+):${expectedAction}$`).exec(task.taskKey);
  if (!match || !/^(?:dp|du)_[A-Za-z0-9]+$/.test(match[1])) {
    throw new DigitalDeliveryError(
      "INVALID_DISPUTE_RIGHTS_TASK_KEY",
      "Invalid dispute rights task key",
      {
        retryable: false
      }
    );
  }
  return match[1];
}

async function suspendDownloadRights({ task, prismaClient = prisma, now = new Date() }) {
  const providerDisputeId = disputeIdFromTask(task, "SUSPEND_DOWNLOAD_RIGHTS");
  return prismaClient.$transaction(async (transaction) => {
    const order = await lockedOrder(transaction, task.orderId);
    const dispute = order.disputes.find((item) => item.providerDisputeId === providerDisputeId);
    if (!dispute || !OPEN_DISPUTE_STATUSES.has(dispute.status)) {
      throw new DigitalDeliveryError(
        "DISPUTE_NO_LONGER_REQUIRES_SUSPENSION",
        "The dispute no longer requires suspension",
        { retryable: false, canceled: true }
      );
    }
    await transaction.digitalEntitlement.updateMany({
      where: { orderId: order.id, status: "ACTIVE" },
      data: { status: "SUSPENDED", suspendedAt: now }
    });
    await transaction.ownershipCertificate.updateMany({
      where: { orderId: order.id, status: "ACTIVE" },
      data: { status: "SUSPENDED", suspendedAt: now }
    });
    return { effectReference: `rights:${order.publicId}:suspend:${providerDisputeId}` };
  });
}

async function restoreDownloadRights({ task, prismaClient = prisma, now = new Date() }) {
  const providerDisputeId = disputeIdFromTask(task, "RESTORE_DOWNLOAD_RIGHTS");
  return prismaClient.$transaction(async (transaction) => {
    const order = await lockedOrder(transaction, task.orderId);
    assertDeliveryAllowed(order);
    const dispute = order.disputes.find((item) => item.providerDisputeId === providerDisputeId);
    const blockingDispute = order.disputes.some(({ status }) =>
      ["NEEDS_RESPONSE", "UNDER_REVIEW", "LOST"].includes(status)
    );
    if (!dispute || !["WON", "CLOSED"].includes(dispute.status) || blockingDispute) {
      throw new DigitalDeliveryError(
        "DIGITAL_RIGHTS_RESTORE_BLOCKED",
        "Digital rights cannot be restored while another dispute remains blocking",
        { retryable: false, canceled: true }
      );
    }
    await transaction.digitalEntitlement.updateMany({
      where: { orderId: order.id, status: "SUSPENDED" },
      data: { status: "ACTIVE", suspendedAt: null, revokedAt: null, updatedAt: now }
    });
    await transaction.ownershipCertificate.updateMany({
      where: { orderId: order.id, status: "SUSPENDED" },
      data: { status: "ACTIVE", suspendedAt: null, revokedAt: null, updatedAt: now }
    });
    return { effectReference: `rights:${order.publicId}:restore:${providerDisputeId}` };
  });
}

async function revokeDownloadRights({ task, prismaClient = prisma, now = new Date() }) {
  return prismaClient.$transaction(async (transaction) => {
    const order = await lockedOrder(transaction, task.orderId);
    const revocationRequired =
      order.status === "REFUNDED" || order.disputes.some(({ status }) => status === "LOST");
    if (!revocationRequired) {
      throw new DigitalDeliveryError(
        "DIGITAL_RIGHTS_REVOCATION_NOT_READY",
        "The order does not currently require rights revocation"
      );
    }
    await transaction.digitalEntitlement.updateMany({
      where: { orderId: order.id, status: { not: "REVOKED" } },
      data: { status: "REVOKED", suspendedAt: null, revokedAt: now }
    });
    await transaction.ownershipCertificate.updateMany({
      where: { orderId: order.id, status: { not: "REVOKED" } },
      data: { status: "REVOKED", suspendedAt: null, revokedAt: now }
    });
    return { effectReference: `rights:${order.publicId}:revoke` };
  });
}

module.exports = {
  DigitalDeliveryError,
  certificateNumber,
  certificateSnapshot,
  deliveryState,
  generateCertificates,
  grantDownloadRights,
  restoreDownloadRights,
  revokeDownloadRights,
  suspendDownloadRights
};
