const { buildCartSummary } = require("../../src/domain/cart-pricing");

/**
 * Lightweight in-memory stand-in for commerce persistence.
 * Used by e2e tests so the full HTTP cart contract can run without Postgres.
 */
function createInMemoryCommerceDb() {
  const artworks = new Map();
  const carts = new Map();

  function getOrCreateCart(userId) {
    if (!carts.has(userId)) {
      carts.set(userId, {
        userId,
        version: 1,
        updatedAt: new Date(),
        items: new Map()
      });
    }
    return carts.get(userId);
  }

  function toPricingCart(userId) {
    const cart = carts.get(userId);
    if (!cart) {
      return { version: 1, updatedAt: null, items: [] };
    }

    return {
      version: cart.version,
      updatedAt: cart.updatedAt,
      items: [...cart.items.entries()].map(([artworkId, quantity]) => ({
        artworkId,
        quantity,
        artwork: artworks.get(artworkId)
      }))
    };
  }

  return {
    seedArtwork(artwork) {
      artworks.set(artwork.id, structuredClone(artwork));
      return artwork;
    },
    getArtwork(artworkId) {
      return artworks.get(artworkId) || null;
    },
    summarizeCart(userId, pricingPolicy = {}) {
      return buildCartSummary(toPricingCart(userId), pricingPolicy);
    },
    setCartItem(userId, artworkId, quantity) {
      const artwork = artworks.get(artworkId);
      if (!artwork) {
        const error = new Error("Artwork not found");
        error.code = "ARTWORK_NOT_FOUND";
        error.status = 404;
        throw error;
      }

      if (artwork.artist?.userId === userId) {
        const error = new Error("Vous ne pouvez pas acheter votre propre œuvre.");
        error.code = "SELF_PURCHASE_NOT_ALLOWED";
        error.status = 403;
        throw error;
      }

      if (artwork.visibility !== "PUBLISHED" || artwork.saleStatus !== "AVAILABLE") {
        const error = new Error("Artwork is not available for purchase");
        error.code = "ARTWORK_NOT_AVAILABLE";
        error.status = 409;
        throw error;
      }

      const cart = getOrCreateCart(userId);
      cart.items.set(artworkId, quantity);
      cart.version += 1;
      cart.updatedAt = new Date();
      return this.summarizeCart(userId, { buyerUserId: userId });
    },
    removeCartItem(userId, artworkId) {
      const cart = carts.get(userId);
      if (!cart || !cart.items.has(artworkId)) {
        const error = new Error("Cart item not found");
        error.code = "CART_ITEM_NOT_FOUND";
        error.status = 404;
        throw error;
      }
      cart.items.delete(artworkId);
      cart.version += 1;
      cart.updatedAt = new Date();
      return this.summarizeCart(userId, { buyerUserId: userId });
    },
    clearCart(userId) {
      const cart = carts.get(userId);
      if (!cart) {
        return buildCartSummary({ version: 1, updatedAt: null, items: [] }, { buyerUserId: userId });
      }
      if (cart.items.size > 0) {
        cart.items.clear();
        cart.version += 1;
        cart.updatedAt = new Date();
      }
      return this.summarizeCart(userId, { buyerUserId: userId });
    },
    validateForCheckout(userId, { expectedVersion, expectedPricingFingerprint }) {
      const summary = this.summarizeCart(userId, { buyerUserId: userId });

      if (summary.items.length === 0) {
        const error = new Error("Cart is empty");
        error.code = "CART_EMPTY";
        error.status = 409;
        error.cart = summary;
        throw error;
      }

      if (summary.version !== expectedVersion) {
        const error = new Error("Cart changed and must be reviewed again");
        error.code = "CART_CHANGED";
        error.status = 409;
        error.cart = summary;
        throw error;
      }

      if (summary.pricingFingerprint !== expectedPricingFingerprint) {
        const error = new Error("Cart price changed and must be confirmed again");
        error.code = "PRICE_CHANGED";
        error.status = 409;
        error.cart = summary;
        throw error;
      }

      if (!summary.payable) {
        const error = new Error("Cart contains unavailable items");
        error.code = "CART_NOT_PAYABLE";
        error.status = 409;
        error.cart = summary;
        throw error;
      }

      return summary;
    },
    snapshot() {
      return {
        artworkCount: artworks.size,
        cartCount: carts.size,
        carts: [...carts.entries()].map(([userId, cart]) => ({
          userId,
          version: cart.version,
          itemCount: cart.items.size
        }))
      };
    }
  };
}

function createSamplePublishedArtwork(overrides = {}) {
  return {
    id: 101,
    title: "In-memory neon skyline",
    priceAmount: 4200,
    currency: "EUR",
    licenseType: "COMMERCIAL",
    visibility: "PUBLISHED",
    saleStatus: "AVAILABLE",
    stockQuantity: 5,
    reservedQuantity: 0,
    storageProvider: "local",
    previewPath: null,
    imagePath: null,
    artist: {
      displayName: "Nova Artist",
      userId: 900,
      user: { id: 900, username: "nova" }
    },
    ...overrides
  };
}

module.exports = {
  createInMemoryCommerceDb,
  createSamplePublishedArtwork
};
