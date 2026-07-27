const prisma = require("../lib/prisma");

function serializeOrder(order) {
  const payment = order.payments[0] || null;
  const entitlements = new Map(
    (order.digitalEntitlements || []).map((entitlement) => [entitlement.orderItemId, entitlement])
  );
  const certificates = new Map(
    (order.ownershipCertificates || []).map((certificate) => [certificate.orderItemId, certificate])
  );

  return {
    id: order.publicId,
    status: order.status,
    amount: order.totalAmount,
    currency: order.currency,
    pricing: {
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      netAmount: order.subtotalExcludingTaxAmount,
      taxAmount: order.taxAmount,
      taxRateBps: order.taxRateBps,
      taxBehavior: order.taxBehavior,
      totalAmount: order.totalAmount
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt,
    payment: payment ? { status: payment.status } : null,
    invoices: (order.invoices || []).map((invoice) => ({
      id: invoice.publicId,
      number: invoice.number,
      type: invoice.type,
      issuedAt: invoice.issuedAt,
      available: true
    })),
    refunds: order.refunds.map((refund) => ({
      id: refund.publicId,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      reference: refund.providerReference || null,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt
    })),
    items: order.items.map((item) => {
      const entitlement = entitlements.get(item.id) || null;
      const certificate = certificates.get(item.id) || null;
      const publicDetailAvailable =
        item.artwork?.visibility === "PUBLISHED" &&
        String(item.artwork?.moderationStatus || "").toLowerCase() === "approved";
      return {
        artworkId: item.artworkId,
        title: item.artworkTitle,
        artistName: item.artistName,
        licenseType: item.licenseType,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        currency: item.currency,
        publicAccess: {
          publicDetailAvailable,
          withdrawnFromPublic: !publicDetailAvailable
        },
        delivery: {
          downloadRights: entitlement
            ? {
                status: entitlement.status,
                grantedAt: entitlement.grantedAt,
                suspendedAt: entitlement.suspendedAt,
                revokedAt: entitlement.revokedAt,
                downloadUrl:
                  entitlement.status === "ACTIVE" && item.artworkId
                    ? `/api/artworks/${item.artworkId}/media/hd`
                    : null
              }
            : null,
          certificate: certificate
            ? {
                id: certificate.publicId,
                number: certificate.certificateNumber,
                status: certificate.status,
                fingerprint: certificate.fingerprint,
                issuedAt: certificate.issuedAt,
                snapshot: certificate.snapshot
              }
            : null
        }
      };
    })
  };
}

const safeOrderInclude = {
  items: {
    orderBy: { id: "asc" },
    include: {
      artwork: {
        select: {
          visibility: true,
          moderationStatus: true
        }
      }
    }
  },
  payments: {
    orderBy: { checkoutVersion: "desc" },
    take: 1
  },
  refunds: { orderBy: { createdAt: "desc" } },
  digitalEntitlements: { orderBy: { orderItemId: "asc" } },
  ownershipCertificates: { orderBy: { orderItemId: "asc" } },
  invoices: {
    where: { type: "SALE", pdf: { not: null } },
    orderBy: { issuedAt: "desc" },
    select: {
      publicId: true,
      number: true,
      type: true,
      issuedAt: true
    }
  }
};

async function getOwnedOrder(userId, publicId, prismaClient = prisma) {
  const order = await prismaClient.order.findFirst({
    where: { publicId, userId },
    include: safeOrderInclude
  });

  return order ? serializeOrder(order) : null;
}

async function listOwnedOrders(userId, prismaClient = prisma) {
  const orders = await prismaClient.order.findMany({
    where: { userId },
    include: safeOrderInclude,
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return orders.map(serializeOrder);
}

module.exports = {
  getOwnedOrder,
  listOwnedOrders,
  serializeOrder
};
