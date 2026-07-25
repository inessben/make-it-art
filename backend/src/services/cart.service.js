const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const env = require("../config/env");
const { buildCartSummary } = require("../domain/cart-pricing");

const cartInclude = {
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
};

class CartError extends Error {
  constructor(code, message, status = 400, cart = undefined) {
    super(message);
    this.name = "CartError";
    this.code = code;
    this.status = status;
    this.cart = cart;
  }
}

function pricingPolicy() {
  return {
    vatRateBps: env.commerce.franceVatRateBps,
    commissionRateBps: env.commerce.commissionRateBps
  };
}

function createEmptyCartSummary() {
  return buildCartSummary(
    {
      version: 1,
      updatedAt: null,
      items: []
    },
    pricingPolicy()
  );
}

async function findCart(client, userId) {
  return client.cart.findUnique({
    where: { userId },
    include: cartInclude
  });
}

async function getCartSummary(userId) {
  const cart = await findCart(prisma, userId);
  return cart ? buildCartSummary(cart, pricingPolicy()) : createEmptyCartSummary();
}

async function getOrCreateCart(client, userId) {
  return client.cart.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

async function lockCart(client, cartId) {
  await client.$queryRaw(Prisma.sql`SELECT "id" FROM "cart" WHERE "id" = ${cartId} FOR UPDATE`);
}

async function lockArtworks(client, artworkIds) {
  if (artworkIds.length === 0) {
    return;
  }

  const sortedArtworkIds = [...artworkIds].sort((left, right) => left - right);

  await client.$queryRaw(
    Prisma.sql`SELECT "id" FROM "artwork" WHERE "id" IN (${Prisma.join(
      sortedArtworkIds
    )}) ORDER BY "id" FOR UPDATE`
  );
}

function assertArtworkCanBeAdded(artwork, quantity) {
  if (!artwork) {
    throw new CartError("ARTWORK_NOT_FOUND", "Artwork not found", 404);
  }

  if (artwork.saleStatus !== "AVAILABLE") {
    throw new CartError("ARTWORK_NOT_AVAILABLE", "Artwork is not available for purchase", 409);
  }

  if (!Number.isSafeInteger(artwork.priceAmount) || artwork.priceAmount <= 0) {
    throw new CartError(
      "ARTWORK_PRICE_UNAVAILABLE",
      "Artwork does not have a valid server price",
      409
    );
  }

  const availableQuantity = artwork.stockQuantity - artwork.reservedQuantity;

  if (quantity > availableQuantity) {
    throw new CartError("INSUFFICIENT_STOCK", "Requested quantity is not available", 409);
  }
}

async function setCartItem(userId, { artworkId, quantity }) {
  if (!Number.isSafeInteger(artworkId) || artworkId <= 0) {
    throw new CartError("INVALID_CART_INPUT", "artworkId must be a positive integer", 400);
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100) {
    throw new CartError("INVALID_CART_INPUT", "quantity must be an integer between 1 and 100", 400);
  }

  return prisma.$transaction(async (transaction) => {
    const cart = await getOrCreateCart(transaction, userId);
    await lockCart(transaction, cart.id);
    await lockArtworks(transaction, [artworkId]);

    const artwork = await transaction.artwork.findUnique({
      where: { id: artworkId }
    });
    assertArtworkCanBeAdded(artwork, quantity);

    await transaction.cartItem.upsert({
      where: {
        cartId_artworkId: {
          cartId: cart.id,
          artworkId
        }
      },
      update: { quantity },
      create: {
        cartId: cart.id,
        artworkId,
        quantity
      }
    });

    await transaction.cart.update({
      where: { id: cart.id },
      data: { version: { increment: 1 } }
    });

    return buildCartSummary(await findCart(transaction, userId), pricingPolicy());
  });
}

async function removeCartItem(userId, artworkId) {
  return prisma.$transaction(async (transaction) => {
    const cart = await transaction.cart.findUnique({ where: { userId } });

    if (!cart) {
      throw new CartError("CART_ITEM_NOT_FOUND", "Cart item not found", 404);
    }

    await lockCart(transaction, cart.id);
    const result = await transaction.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        artworkId
      }
    });

    if (result.count === 0) {
      throw new CartError("CART_ITEM_NOT_FOUND", "Cart item not found", 404);
    }

    await transaction.cart.update({
      where: { id: cart.id },
      data: { version: { increment: 1 } }
    });

    return buildCartSummary(await findCart(transaction, userId), pricingPolicy());
  });
}

async function clearCart(userId) {
  return prisma.$transaction(async (transaction) => {
    const cart = await transaction.cart.findUnique({ where: { userId } });

    if (!cart) {
      return createEmptyCartSummary();
    }

    await lockCart(transaction, cart.id);
    const result = await transaction.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    if (result.count > 0) {
      await transaction.cart.update({
        where: { id: cart.id },
        data: { version: { increment: 1 } }
      });
    }

    return buildCartSummary(await findCart(transaction, userId), pricingPolicy());
  });
}

async function withLockedPayableCart(
  { userId, expectedVersion, expectedPricingFingerprint },
  action = async (_transaction, cartSummary) => cartSummary,
  { beforePayabilityCheck } = {}
) {
  return prisma.$transaction(
    async (transaction) => {
      const cart = await transaction.cart.findUnique({ where: { userId } });

      if (!cart) {
        throw new CartError("CART_EMPTY", "Cart is empty", 409);
      }

      await lockCart(transaction, cart.id);
      const initialCart = await findCart(transaction, userId);
      await lockArtworks(
        transaction,
        initialCart.items.map((item) => item.artworkId)
      );

      const lockedCart = await findCart(transaction, userId);
      const cartSummary = buildCartSummary(lockedCart, pricingPolicy());

      if (cartSummary.items.length === 0) {
        throw new CartError("CART_EMPTY", "Cart is empty", 409, cartSummary);
      }

      if (cartSummary.version !== expectedVersion) {
        throw new CartError(
          "CART_CHANGED",
          "Cart changed and must be reviewed again",
          409,
          cartSummary
        );
      }

      if (cartSummary.pricingFingerprint !== expectedPricingFingerprint) {
        throw new CartError(
          "PRICE_CHANGED",
          "Cart price changed and must be confirmed again",
          409,
          cartSummary
        );
      }

      if (beforePayabilityCheck) {
        const existingResult = await beforePayabilityCheck(transaction, cartSummary, lockedCart);

        if (existingResult !== undefined) {
          return existingResult;
        }
      }

      if (!cartSummary.payable) {
        throw new CartError(
          "CART_NOT_PAYABLE",
          "Cart contains unavailable items",
          409,
          cartSummary
        );
      }

      return action(transaction, cartSummary, lockedCart);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    }
  );
}

async function validateCartForCheckout(input) {
  return withLockedPayableCart(input);
}

module.exports = {
  CartError,
  getCartSummary,
  setCartItem,
  removeCartItem,
  clearCart,
  validateCartForCheckout,
  withLockedPayableCart
};
