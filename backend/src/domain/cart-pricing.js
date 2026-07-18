const crypto = require("node:crypto");

const STANDARD_COMMISSION_BPS = 1500;
const VERIFIED_ARTIST_COMMISSION_BPS = 1000;

function calculateCommissionAmount(amount, artistVerified) {
  const basisPoints = artistVerified ? VERIFIED_ARTIST_COMMISSION_BPS : STANDARD_COMMISSION_BPS;

  return Math.round((amount * basisPoints) / 10000);
}

function getArtworkIssue(artwork, quantity) {
  if (artwork.saleStatus !== "AVAILABLE") {
    return "ARTWORK_NOT_AVAILABLE";
  }

  if (!Number.isSafeInteger(artwork.priceAmount) || artwork.priceAmount <= 0) {
    return "ARTWORK_PRICE_UNAVAILABLE";
  }

  const availableQuantity = Math.max(artwork.stockQuantity - artwork.reservedQuantity, 0);

  if (quantity > availableQuantity) {
    return "INSUFFICIENT_STOCK";
  }

  return null;
}

function createPricingFingerprint(version, items, totalAmount) {
  const pricingSnapshot = {
    version,
    totalAmount,
    items: items.map((item) => ({
      artworkId: item.artworkId,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      commissionAmount: item.commissionAmount,
      currency: item.currency
    }))
  };

  return crypto.createHash("sha256").update(JSON.stringify(pricingSnapshot)).digest("hex");
}

function buildCartSummary(cart) {
  const issues = [];
  const items = [...cart.items]
    .sort((left, right) => left.artworkId - right.artworkId)
    .map((cartItem) => {
      const { artwork } = cartItem;
      const issue = getArtworkIssue(artwork, cartItem.quantity);
      const unitAmount = Number.isSafeInteger(artwork.priceAmount) ? artwork.priceAmount : 0;
      const subtotalAmount = unitAmount * cartItem.quantity;
      const commissionAmount = calculateCommissionAmount(
        subtotalAmount,
        artwork.artist.verified === true
      );
      const availableQuantity = Math.max(artwork.stockQuantity - artwork.reservedQuantity, 0);

      if (issue) {
        issues.push({
          artworkId: artwork.id,
          code: issue
        });
      }

      return {
        artworkId: artwork.id,
        title: artwork.title,
        artistName: artwork.artist.displayName || artwork.artist.user.username || "Unknown artist",
        quantity: cartItem.quantity,
        availableQuantity,
        unitAmount,
        subtotalAmount,
        commissionAmount,
        currency: artwork.currency,
        issue
      };
    });

  const subtotalAmount = items.reduce((total, item) => total + item.subtotalAmount, 0);
  const commissionAmount = items.reduce((total, item) => total + item.commissionAmount, 0);
  const totalAmount = subtotalAmount;

  return {
    version: cart.version,
    updatedAt: cart.updatedAt,
    currency: "EUR",
    subtotalAmount,
    commissionAmount,
    totalAmount,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    payable: items.length > 0 && issues.length === 0,
    pricingFingerprint: createPricingFingerprint(cart.version, items, totalAmount),
    issues,
    items
  };
}

module.exports = {
  STANDARD_COMMISSION_BPS,
  VERIFIED_ARTIST_COMMISSION_BPS,
  calculateCommissionAmount,
  buildCartSummary
};
