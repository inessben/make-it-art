const prisma = require("../lib/prisma");

async function listOrdersForAdmin() {
  return prisma.order.findMany({
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    include: {
      user: true,
      items: true,
      payments: true,
    },
  });
}

async function listOrderItemsForArtist(artistId) {
  return prisma.orderItem.findMany({
    where: {
      artwork: {
        artistId,
      },
    },
    orderBy: [
      {
        order: {
          createdAt: "desc",
        },
      },
      {
        id: "desc",
      },
    ],
    include: {
      artwork: {
        include: {
          artist: {
            include: {
              user: true,
            },
          },
        },
      },
      order: {
        include: {
          user: true,
          payments: true,
        },
      },
    },
  });
}

async function createCheckoutOrder({
  userId,
  lineItems,
  paymentMethod,
  totalAmount,
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        status: "Paid",
        totalToken: Math.round(totalAmount),
        createdAt: new Date(),
      },
    });

    const orderItems = [];

    for (const lineItem of lineItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          artworkId: lineItem.artworkId,
          priceTokens: String(lineItem.unitPrice),
        },
      });

      orderItems.push(orderItem);

      await tx.artwork.update({
        where: {
          id: lineItem.artworkId,
        },
        data: {
          isSold: true,
        },
      });

      await tx.ownershipToken.updateMany({
        where: {
          artworkId: lineItem.artworkId,
          isCurrentOwner: true,
        },
        data: {
          isCurrentOwner: false,
        },
      });

      await tx.ownershipToken.create({
        data: {
          artworkId: lineItem.artworkId,
          ownerId: userId,
          acquiredAt: new Date(),
          isCurrentOwner: true,
        },
      });
    }

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        method: paymentMethod,
        price: formatCheckoutPrice(totalAmount),
        status: "Succeeded",
        createdAt: new Date(),
      },
    });

    return {
      order,
      orderItems,
      payment,
    };
  });
}

function formatCheckoutPrice(value) {
  return `EUR ${Number(value).toFixed(2)}`;
}

module.exports = {
  listOrdersForAdmin,
  listOrderItemsForArtist,
  createCheckoutOrder,
};
