const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CommercePolicyError,
  calculateCommissionAmount,
  calculateIncludedTax,
  normalizeFrenchBillingDetails
} = require("../../src/domain/commerce-policy");

test("French B2C billing details are normalized into an immutable checkout snapshot", () => {
  assert.deepEqual(
    normalizeFrenchBillingDetails(
      {
        customerType: "B2C",
        consumerConfirmed: true,
        name: "  Ada   Lovelace ",
        addressLine1: " 1 rue de Paris ",
        addressLine2: " Bâtiment A ",
        postalCode: "75001",
        city: " Paris ",
        country: "France"
      },
      { email: " BUYER@EXAMPLE.TEST " }
    ),
    {
      customerType: "B2C",
      name: "Ada Lovelace",
      email: "buyer@example.test",
      address: {
        line1: "1 rue de Paris",
        line2: "Bâtiment A",
        postalCode: "75001",
        city: "Paris",
        country: "FR"
      }
    }
  );
});

test("professional and non-French purchases fail closed during the initial launch", () => {
  const base = {
    customerType: "B2C",
    consumerConfirmed: true,
    name: "Ada Lovelace",
    addressLine1: "1 rue de Paris",
    postalCode: "75001",
    city: "Paris",
    country: "FR"
  };

  assert.throws(
    () => normalizeFrenchBillingDetails({ ...base, customerType: "B2B" }),
    (error) => error instanceof CommercePolicyError && error.code === "B2B_NOT_AVAILABLE"
  );
  assert.throws(
    () => normalizeFrenchBillingDetails({ ...base, country: "BE" }),
    (error) => error instanceof CommercePolicyError && error.code === "COUNTRY_NOT_SUPPORTED"
  );
  assert.throws(
    () => normalizeFrenchBillingDetails({ ...base, companyName: "Example SAS" }),
    (error) => error instanceof CommercePolicyError && error.code === "B2B_NOT_AVAILABLE"
  );
});

test("inclusive tax and the 7 percent commission use integer minor units", () => {
  assert.deepEqual(calculateIncludedTax(2500, 2000), {
    netAmount: 2083,
    taxAmount: 417
  });
  assert.equal(calculateCommissionAmount(2083, 700), 146);
});
