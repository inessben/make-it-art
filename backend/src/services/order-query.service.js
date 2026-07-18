const prisma = require("../lib/prisma");

function serializeOrder(order) {
  const payment = order.payments[0] || null;

  return {
    id: order.publicId,
    status: order.status,
    amount: order.totalAmount,
    currency: order.currency,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt,
    payment: payment ? { status: payment.status } : null,
    refunds: order.refunds.map((refund) => ({
      id: refund.publicId,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
      reference: refund.providerReference || null,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt
    })),
    items: order.items.map((item) => ({
      title: item.artworkTitle,
      artistName: item.artistName,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      currency: item.currency
    }))
  };
}

const safeOrderInclude = {
  items: {
    orderBy: { id: "asc" }
  },
  payments: {
    orderBy: { checkoutVersion: "desc" },
    take: 1
  },
  refunds: { orderBy: { createdAt: "desc" } }
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
