const test = require("node:test");
const assert = require("node:assert/strict");

const {
  InvoiceError,
  invoiceNumber,
  invoiceYear,
  issueCommissionInvoices,
  saleInvoiceInput
} = require("../../src/services/invoice.service");

function paidOrder(overrides = {}) {
  return {
    id: 12,
    userId: 7,
    subtotalAmount: 2500,
    discountAmount: 0,
    subtotalExcludingTaxAmount: 2083,
    taxAmount: 417,
    totalAmount: 2500,
    currency: "EUR",
    billingSnapshot: {
      customerType: "B2C",
      name: "Ada Lovelace",
      email: "buyer@example.test",
      address: {
        line1: "1 rue de Paris",
        postalCode: "75001",
        city: "Paris",
        country: "FR"
      }
    },
    user: { email: "buyer@example.test" },
    items: [
      {
        artworkId: 31,
        artworkTitle: "Night Study",
        artistName: "Artist",
        quantity: 2,
        unitAmount: 1250,
        subtotalAmount: 2500,
        discountAmount: 0,
        netAmount: 2083,
        taxRateBps: 2000,
        taxAmount: 417
      }
    ],
    ...overrides
  };
}

test("invoice numbering is sequential by type and uses the Europe/Paris year", () => {
  assert.equal(invoiceNumber("SALE", 2027, 42), "MIA-VTE-2027-000042");
  assert.equal(invoiceNumber("COMMISSION", 2027, 3), "MIA-COM-2027-000003");
  assert.equal(invoiceYear(new Date("2026-12-31T23:30:00.000Z")), 2027);
});

test("a sale invoice is built only from the immutable order and billing snapshots", () => {
  const invoice = saleInvoiceInput(paidOrder());

  assert.equal(invoice.type, "SALE");
  assert.equal(invoice.recipientReference, "buyer:7");
  assert.equal(invoice.recipientSnapshot.customerType, "B2C");
  assert.equal(invoice.netAmount, 2083);
  assert.equal(invoice.taxAmount, 417);
  assert.equal(invoice.totalAmount, 2500);
  assert.equal(invoice.lineItems[0].totalAmount, 2500);
});

test("inconsistent tax totals cannot produce a sale invoice", () => {
  assert.throws(
    () => saleInvoiceInput(paidOrder({ taxAmount: 416 })),
    (error) => error instanceof InvoiceError && error.code === "SALE_INVOICE_TOTALS_MISMATCH"
  );
});

test("inconsistent line totals cannot produce a sale invoice", () => {
  const order = paidOrder();
  order.items[0].taxAmount = 416;

  assert.throws(
    () => saleInvoiceInput(order),
    (error) => error instanceof InvoiceError && error.code === "SALE_INVOICE_LINE_TOTALS_MISMATCH"
  );
});

test("commission invoicing stays disabled until the later commission phase", async () => {
  await assert.rejects(
    issueCommissionInvoices({ task: { orderId: 12 } }),
    (error) =>
      error instanceof InvoiceError &&
      error.code === "COMMISSION_PHASE_DISABLED" &&
      error.canceled === true
  );
});
