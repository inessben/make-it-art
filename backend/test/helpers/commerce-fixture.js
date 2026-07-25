const {
  calculateCommissionAmount,
  calculateIncludedTax
} = require("../../src/domain/commerce-policy");

function franceB2COrderFields({ buyer, grossAmount, vatRateBps = 2000 }) {
  const { netAmount, taxAmount } = calculateIncludedTax(grossAmount, vatRateBps);

  return {
    customerType: "B2C",
    marketCountry: "FR",
    billingSnapshot: {
      customerType: "B2C",
      name: buyer.username || "Test buyer",
      email: buyer.email,
      address: {
        line1: "1 rue de Paris",
        postalCode: "75001",
        city: "Paris",
        country: "FR"
      }
    },
    discountAmount: 0,
    subtotalExcludingTaxAmount: netAmount,
    taxAmount,
    taxRateBps: vatRateBps,
    taxBehavior: "INCLUSIVE",
    commissionAmount: calculateCommissionAmount(netAmount, 700),
    commissionRateBps: 700
  };
}

function franceB2COrderItemFields({ grossAmount, vatRateBps = 2000 }) {
  const { netAmount, taxAmount } = calculateIncludedTax(grossAmount, vatRateBps);

  return {
    discountAmount: 0,
    netAmount,
    taxAmount,
    taxRateBps: vatRateBps,
    commissionAmount: calculateCommissionAmount(netAmount, 700),
    commissionRateBps: 700
  };
}

module.exports = {
  franceB2COrderFields,
  franceB2COrderItemFields
};
