const prisma = require("../lib/prisma");
const orderRepository = require("../repositories/order.repository");
const notificationRepository = require("../repositories/notification.repository");
const { sendArtistSaleEmail } = require("./mail.service");
const { parsePriceValue } = require("../utils/serialize-marketplace");
const {
  computeNetRevenue,
  formatOrderReference,
} = require("../utils/commerce");
const env = require("../config/env");

function normalizeCheckoutItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items
    .map((item) => ({
      artworkId: Number.parseInt(item.artworkId, 10),
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
    }))
    .filter((item) => Number.isInteger(item.artworkId) && item.artworkId > 0);
}

async function createCheckout({ userId, items, paymentMethod, billingEmail }) {
  const normalizedItems = normalizeCheckoutItems(items);

  if (normalizedItems.length === 0) {
    throw new Error("CHECKOUT_EMPTY");
  }

  const artworkIds = [...new Set(normalizedItems.map((item) => item.artworkId))];
  const artworks = await prisma.artwork.findMany({
    where: {
      id: {
        in: artworkIds,
      },
    },
    include: {
      artist: {
        include: {
          user: true,
        },
      },
    },
  });

  if (artworks.length !== artworkIds.length) {
    throw new Error("ARTWORK_NOT_FOUND");
  }

  const artworkById = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const lineItems = [];
  let totalAmount = 0;

  for (const item of normalizedItems) {
    const artwork = artworkById.get(item.artworkId);

    if (!artwork) {
      throw new Error("ARTWORK_NOT_FOUND");
    }

    if (artwork.artist?.userId === userId) {
      throw new Error("CANNOT_BUY_OWN_ARTWORK");
    }

    const unitPrice = parsePriceValue(artwork.price || artwork.priceTokens);

    if (unitPrice === null || unitPrice <= 0) {
      throw new Error("INVALID_ARTWORK_PRICE");
    }

    const lineTotal = unitPrice * item.quantity;
    totalAmount += lineTotal;

    for (let index = 0; index < item.quantity; index += 1) {
      lineItems.push({
        artworkId: artwork.id,
        artwork,
        quantity: 1,
        unitPrice,
        lineTotal: unitPrice,
      });
    }
  }

  const checkoutResult = await orderRepository.createCheckoutOrder({
    userId,
    lineItems: lineItems.map((lineItem) => ({
      artworkId: lineItem.artworkId,
      unitPrice: lineItem.unitPrice,
    })),
    paymentMethod: paymentMethod || "card",
    totalAmount,
  });

  const buyer = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  const buyerLabel = buyer?.username || buyer?.email || "Un collectionneur";
  const notificationsByArtistUser = new Map();

  for (const lineItem of lineItems) {
    const artistUserId = lineItem.artwork.artist?.userId;

    if (!artistUserId) {
      continue;
    }

    const existing = notificationsByArtistUser.get(artistUserId) || {
      artistUserId,
      artistEmail: lineItem.artwork.artist?.user?.email || null,
      artistDisplayName:
        lineItem.artwork.artist?.displayName ||
        lineItem.artwork.artist?.user?.username ||
        "Artiste",
      artworks: [],
      grossAmount: 0,
    };

    existing.artworks.push(lineItem.artwork.title || "Oeuvre");
    existing.grossAmount += lineItem.lineTotal;
    notificationsByArtistUser.set(artistUserId, existing);
  }

  for (const notificationData of notificationsByArtistUser.values()) {
    const artworkLabel =
      notificationData.artworks.length === 1
        ? `"${notificationData.artworks[0]}"`
        : `${notificationData.artworks.length} oeuvres`;
    const orderReference = formatOrderReference(checkoutResult.order.id);

    await notificationRepository.createNotification({
      userId: notificationData.artistUserId,
      type: "sale",
      title: "Nouvelle vente",
      message: `${buyerLabel} a achete ${artworkLabel} pour EUR ${notificationData.grossAmount.toFixed(2)}.`,
      payload: {
        orderId: checkoutResult.order.id,
        orderReference,
        grossAmount: notificationData.grossAmount,
        buyer: {
          id: buyer?.id || userId,
          username: buyer?.username || null,
          email: billingEmail || buyer?.email || null,
        },
        artworkTitles: notificationData.artworks,
      },
    });

    if (notificationData.artistEmail) {
      try {
        await sendArtistSaleEmail({
          to: notificationData.artistEmail,
          artistName: notificationData.artistDisplayName,
          orderReference,
          artworkTitles: notificationData.artworks,
          grossAmount: notificationData.grossAmount,
          netAmount: computeNetRevenue(notificationData.grossAmount),
          buyerLabel,
          salesUrl: `${env.appBaseUrl}/artist/sales`,
        });
      } catch (error) {
        console.error("Artist sale email error:", error);
      }
    }
  }

  return {
    order: checkoutResult.order,
    payment: checkoutResult.payment,
    totalAmount,
    billingEmail: billingEmail || buyer?.email || null,
  };
}

module.exports = {
  createCheckout,
};
