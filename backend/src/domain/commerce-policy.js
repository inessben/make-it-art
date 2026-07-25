const LAUNCH_CUSTOMER_TYPE = "B2C";
const LAUNCH_MARKET_COUNTRY = "FR";
const INCLUSIVE_TAX_BEHAVIOR = "INCLUSIVE";
const PLATFORM_COMMISSION_RATE_BPS = 700;

class CommercePolicyError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "CommercePolicyError";
    this.code = code;
    this.status = status;
  }
}

function normalizeText(value, maximumLength = 160) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maximumLength) : "";
}

function assertOnlyFields(value, allowedFields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CommercePolicyError("INVALID_BILLING_DETAILS", "Billing details are required");
  }

  const unexpectedFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unexpectedFields.length > 0) {
    throw new CommercePolicyError(
      "B2B_NOT_AVAILABLE",
      "Professional billing is not available during the France B2C launch"
    );
  }
}

function normalizeFranceCountry(value) {
  const normalized = normalizeText(value, 32).toUpperCase();
  if (normalized === "FR" || normalized === "FRANCE") return LAUNCH_MARKET_COUNTRY;
  throw new CommercePolicyError(
    "COUNTRY_NOT_SUPPORTED",
    "Purchases are currently limited to consumers with a French billing address",
    409
  );
}

function normalizeFrenchBillingDetails(input, { email } = {}) {
  assertOnlyFields(input, [
    "customerType",
    "consumerConfirmed",
    "name",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "city",
    "country"
  ]);

  if (input.customerType !== LAUNCH_CUSTOMER_TYPE || input.consumerConfirmed !== true) {
    throw new CommercePolicyError(
      "B2B_NOT_AVAILABLE",
      "Professional purchases are not available during the initial launch",
      409
    );
  }

  const name = normalizeText(input.name, 120);
  const addressLine1 = normalizeText(input.addressLine1, 160);
  const addressLine2 = normalizeText(input.addressLine2, 160);
  const postalCode = normalizeText(input.postalCode, 12);
  const city = normalizeText(input.city, 120);
  const country = normalizeFranceCountry(input.country);

  if (name.length < 2 || addressLine1.length < 3 || city.length < 2) {
    throw new CommercePolicyError(
      "INVALID_BILLING_DETAILS",
      "A complete billing name and address are required"
    );
  }
  if (!/^\d{5}$/.test(postalCode)) {
    throw new CommercePolicyError(
      "INVALID_BILLING_DETAILS",
      "A valid five-digit French postal code is required"
    );
  }

  return {
    customerType: LAUNCH_CUSTOMER_TYPE,
    name,
    email: normalizeText(email, 254).toLowerCase(),
    address: {
      line1: addressLine1,
      ...(addressLine2 ? { line2: addressLine2 } : {}),
      postalCode,
      city,
      country
    }
  };
}

function assertBasisPoints(value, field) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10000) {
    throw new CommercePolicyError(
      "INVALID_COMMERCE_POLICY",
      `${field} must be an integer between 0 and 10000`,
      500
    );
  }
}

function calculateIncludedTax(grossAmount, taxRateBps) {
  if (!Number.isSafeInteger(grossAmount) || grossAmount < 0) {
    throw new CommercePolicyError(
      "INVALID_COMMERCE_AMOUNT",
      "Gross amount must be a non-negative integer",
      500
    );
  }
  assertBasisPoints(taxRateBps, "taxRateBps");
  if (taxRateBps === 0) return { netAmount: grossAmount, taxAmount: 0 };

  const netAmount = Math.round((grossAmount * 10000) / (10000 + taxRateBps));
  return { netAmount, taxAmount: grossAmount - netAmount };
}

function calculateCommissionAmount(netAfterDiscountAmount, commissionRateBps) {
  if (!Number.isSafeInteger(netAfterDiscountAmount) || netAfterDiscountAmount < 0) {
    throw new CommercePolicyError(
      "INVALID_COMMERCE_AMOUNT",
      "Commission basis must be a non-negative integer",
      500
    );
  }
  assertBasisPoints(commissionRateBps, "commissionRateBps");
  return Math.round((netAfterDiscountAmount * commissionRateBps) / 10000);
}

function isFranceB2COrder(order) {
  return (
    order?.customerType === LAUNCH_CUSTOMER_TYPE &&
    order?.marketCountry === LAUNCH_MARKET_COUNTRY &&
    order?.taxBehavior === INCLUSIVE_TAX_BEHAVIOR
  );
}

module.exports = {
  CommercePolicyError,
  INCLUSIVE_TAX_BEHAVIOR,
  LAUNCH_CUSTOMER_TYPE,
  LAUNCH_MARKET_COUNTRY,
  PLATFORM_COMMISSION_RATE_BPS,
  calculateCommissionAmount,
  calculateIncludedTax,
  isFranceB2COrder,
  normalizeFrenchBillingDetails
};
