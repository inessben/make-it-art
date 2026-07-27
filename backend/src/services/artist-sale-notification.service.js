const prisma = require("../lib/prisma");
const notificationRepository = require("../repositories/notification.repository");
const { sendArtistSaleEmail } = require("./mail.service");
const {
  formatOrderReference,
  getOrderItemGrossAmountValue,
  getOrderItemNetAmountValue,
  getOrderItemCommissionAmountValue,
  roundCurrency,
  formatCurrencyAmount
} = require("../utils/commerce");

function buyerLabel(order) {
  return order.user?.username || order.user?.email || "A collector";
}

function computeArtistEarnings(orderItem) {
  const grossAmount = getOrderItemGrossAmountValue(orderItem);
  const netAmount = getOrderItemNetAmountValue(orderItem, grossAmount);
  const commissionAmount = getOrderItemCommissionAmountValue(orderItem, netAmount);

  return roundCurrency(Math.max(netAmount - commissionAmount, 0));
}

function formatArtworkTitles(titles = []) {
  if (titles.length === 0) {
    return "one of your artworks";
  }

  if (titles.length === 1) {
    return `"${titles[0]}"`;
  }

  return `${titles.length} artworks`;
}

async function loadOrderForSaleNotifications(orderId, prismaClient = prisma) {
  return prismaClient.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      items: {
        include: {
          artwork: {
            include: {
              artist: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      }
    }
  });
}

async function notifyArtistsForOrderSale({ orderId, prismaClient = prisma }) {
  const order = await loadOrderForSaleNotifications(orderId, prismaClient);

  if (!order) {
    throw new Error("SALE_NOTIFICATION_ORDER_NOT_FOUND");
  }

  const groupedArtists = new Map();

  for (const orderItem of order.items) {
    const artistUserId = orderItem.artwork?.artist?.userId;

    if (!Number.isSafeInteger(artistUserId) || artistUserId <= 0) {
      continue;
    }

    const existing = groupedArtists.get(artistUserId) || {
      artistUserId,
      artistName:
        orderItem.artwork?.artist?.displayName ||
        orderItem.artwork?.artist?.user?.username ||
        "Artist",
      artistEmail: orderItem.artwork?.artist?.user?.email || "",
      artworkTitles: [],
      grossAmount: 0,
      netAmount: 0
    };

    existing.artworkTitles.push(orderItem.artwork?.title || orderItem.artworkTitle || "Artwork");
    existing.grossAmount = roundCurrency(
      existing.grossAmount + getOrderItemGrossAmountValue(orderItem)
    );
    existing.netAmount = roundCurrency(existing.netAmount + computeArtistEarnings(orderItem));
    groupedArtists.set(artistUserId, existing);
  }

  const orderReference = formatOrderReference(order.id);
  const readableBuyer = buyerLabel(order);

  for (const entry of groupedArtists.values()) {
    await notificationRepository.createNotificationOnce({
      userId: entry.artistUserId,
      type: "sale",
      title: "New sale",
      message: `${readableBuyer} purchased ${formatArtworkTitles(entry.artworkTitles)} for ${formatCurrencyAmount(entry.grossAmount)}.`,
      payload: {
        orderId: order.id,
        orderPublicId: order.publicId,
        orderReference,
        grossAmount: entry.grossAmount,
        netAmount: entry.netAmount,
        artworkTitles: entry.artworkTitles,
        buyer: {
          id: order.user?.id || null,
          username: order.user?.username || null,
          email: order.user?.email || null
        }
      },
      eventKey: `sale:${order.publicId}:${entry.artistUserId}`,
      prismaClient
    });

    if (!entry.artistEmail) {
      continue;
    }

    try {
      await sendArtistSaleEmail({
        to: entry.artistEmail,
        artistName: entry.artistName,
        orderReference,
        artworkTitles: entry.artworkTitles,
        grossAmount: entry.grossAmount,
        netAmount: entry.netAmount
      });
    } catch (error) {
      console.error("Artist sale email error:", error);
    }
  }

  return {
    orderId: order.id,
    notifiedArtists: groupedArtists.size
  };
}

module.exports = {
  notifyArtistsForOrderSale
};
