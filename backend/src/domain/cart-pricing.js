const crypto = require("node:crypto");
const { isUnlimitedArtworkLicenseType } = require("../constants/artwork-license-types");
const {
  INCLUSIVE_TAX_BEHAVIOR,
  PLATFORM_COMMISSION_RATE_BPS,
  calculateCommissionAmount,
  calculateIncludedTax
} = require("./commerce-policy");

function getArtworkIssue(artwork, quantity, buyerUserId = null) {
  const artistUserId = artwork.artist?.userId ?? artwork.artist?.user?.id;

  if (Number.isSafeInteger(buyerUserId) && artistUserId === buyerUserId) {
    return "SELF_PURCHASE_NOT_ALLOWED";
  }

  if (artwork.saleStatus !== "AVAILABLE") {
    return "ARTWORK_NOT_AVAILABLE";
  }

  if (!Number.isSafeInteger(artwork.priceAmount) || artwork.priceAmount <= 0) {
    return "ARTWORK_PRICE_UNAVAILABLE";
  }

  const isUnlimited = isUnlimitedArtworkLicenseType(artwork.licenseType);
  const availableQuantity = isUnlimited
    ? null
    : Math.max(artwork.stockQuantity - artwork.reservedQuantity, 0);

  if (!isUnlimited && quantity > availableQuantity) {
    return "INSUFFICIENT_STOCK";
  }

  return null;
}

function createPricingFingerprint(version, items, summary) {
  const pricingSnapshot = {
    version,
    subtotalAmount: summary.subtotalAmount,
    discountAmount: summary.discountAmount,
    netAmount: summary.netAmount,
    taxAmount: summary.taxAmount,
    taxRateBps: summary.taxRateBps,
    taxBehavior: summary.taxBehavior,
    commissionAmount: summary.commissionAmount,
    commissionRateBps: summary.commissionRateBps,
    totalAmount: summary.totalAmount,
    items: items.map((item) => ({
      artworkId: item.artworkId,
      licenseType: item.licenseType,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      discountAmount: item.discountAmount,
      netAmount: item.netAmount,
      taxAmount: item.taxAmount,
      taxRateBps: item.taxRateBps,
      commissionAmount: item.commissionAmount,
      commissionRateBps: item.commissionRateBps,
      currency: item.currency
    }))
  };

  return crypto.createHash("sha256").update(JSON.stringify(pricingSnapshot)).digest("hex");
}

function buildCartSummary(
  cart,
  { vatRateBps = 2000, commissionRateBps = PLATFORM_COMMISSION_RATE_BPS, buyerUserId = null } = {}
) {
  const issues = [];
  const items = [...cart.items]
    .sort((left, right) => left.artworkId - right.artworkId)
    .map((cartItem) => {
      const { artwork } = cartItem;
      const issue = getArtworkIssue(artwork, cartItem.quantity, buyerUserId);
      const unitAmount = Number.isSafeInteger(artwork.priceAmount) ? artwork.priceAmount : 0;
      const subtotalAmount = unitAmount * cartItem.quantity;
      const discountAmount = 0;
      const grossAfterDiscountAmount = subtotalAmount - discountAmount;
      const { netAmount, taxAmount } = calculateIncludedTax(grossAfterDiscountAmount, vatRateBps);
      const commissionAmount = calculateCommissionAmount(netAmount, commissionRateBps);
      const isUnlimited = isUnlimitedArtworkLicenseType(artwork.licenseType);
      const availableQuantity = isUnlimited
        ? null
        : Math.max(artwork.stockQuantity - artwork.reservedQuantity, 0);

      if (issue) {
        issues.push({
          artworkId: artwork.id,
          code: issue
        });
      }

      return {
        artworkId: artwork.id,
        title: artwork.title,
        licenseType: artwork.licenseType,
        isUnlimited,
        artistName: artwork.artist.displayName || artwork.artist.user.username || "Unknown artist",
        quantity: cartItem.quantity,
        availableQuantity,
        unitAmount,
        subtotalAmount,
        discountAmount,
        netAmount,
        taxAmount,
        taxRateBps: vatRateBps,
        commissionAmount,
        commissionRateBps,
        currency: artwork.currency,
        issue
      };
    });

  const subtotalAmount = items.reduce((total, item) => total + item.subtotalAmount, 0);
  const discountAmount = items.reduce((total, item) => total + item.discountAmount, 0);
  const netAmount = items.reduce((total, item) => total + item.netAmount, 0);
  const taxAmount = items.reduce((total, item) => total + item.taxAmount, 0);
  const commissionAmount = items.reduce((total, item) => total + item.commissionAmount, 0);
  const totalAmount = subtotalAmount - discountAmount;
  const summary = {
    subtotalAmount,
    discountAmount,
    netAmount,
    taxAmount,
    taxRateBps: vatRateBps,
    taxBehavior: INCLUSIVE_TAX_BEHAVIOR,
    commissionAmount,
    commissionRateBps,
    totalAmount
  };

  return {
    version: cart.version,
    updatedAt: cart.updatedAt,
    currency: "EUR",
    ...summary,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    payable: items.length > 0 && issues.length === 0,
    pricingFingerprint: createPricingFingerprint(cart.version, items, summary),
    issues,
    items
  };
}

module.exports = {
  PLATFORM_COMMISSION_RATE_BPS,
  calculateCommissionAmount,
  buildCartSummary
};
