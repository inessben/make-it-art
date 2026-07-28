const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/order.routes");
const authPath = require.resolve("../src/middlewares/auth-required.middleware");
const csrfPath = require.resolve("../src/middlewares/csrf.middleware");
const cartServicePath = require.resolve("../src/services/cart.service");
const checkoutServicePath = require.resolve("../src/services/checkout.service");
const orderQueryPath = require.resolve("../src/services/order-query.service");
const checkoutRecoveryPath = require.resolve("../src/services/checkout-recovery.service");
const checkoutAvailabilityPath = require.resolve("../src/services/checkout-availability.service");
const commercePolicyPath = require.resolve("../src/domain/commerce-policy");
const invoiceServicePath = require.resolve("../src/services/invoice.service");
const certificateServicePath = require.resolve("../src/services/ownership-certificate-pdf.service");
const rateLimitPath = require.resolve("../src/middlewares/rate-limit.middleware");
const downloadServicePath = require.resolve("../src/services/artwork-download.service");
const mediaGuardPath = require.resolve("../src/middlewares/artwork-media-guard.middleware");

class TestServiceError extends Error {}

function passThrough(_req, _res, next) {
  next();
}

async function startOrderRoutesApp(t, certificateResult) {
  const calls = [];
  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authPath]: {
      authRequired(req, _res, next) {
        req.user = { id: 7 };
        next();
      }
    },
    [csrfPath]: { csrfProtection: passThrough },
    [cartServicePath]: { CartError: TestServiceError },
    [checkoutServicePath]: {
      CheckoutError: TestServiceError,
      async initializeCheckout() {
        throw new Error("Unexpected checkout call");
      }
    },
    [orderQueryPath]: {
      async getOwnedOrder() {
        return null;
      },
      async listOwnedOrders() {
        return [];
      }
    },
    [checkoutRecoveryPath]: {
      CheckoutRecoveryError: TestServiceError,
      async resumeCheckout() {
        return null;
      }
    },
    [checkoutAvailabilityPath]: { assertCheckoutEnabled() {} },
    [commercePolicyPath]: { CommercePolicyError: TestServiceError },
    [invoiceServicePath]: {
      async getOwnedSaleInvoicePdf() {
        return null;
      }
    },
    [certificateServicePath]: {
      async getOwnedOwnershipCertificatePdf(input) {
        calls.push(input);
        return certificateResult;
      }
    },
    [rateLimitPath]: {
      checkoutIpRateLimit: passThrough,
      checkoutUserRateLimit: passThrough,
      artworkDownloadRateLimit: passThrough
    },
    [downloadServicePath]: {
      ArtworkDownloadError: TestServiceError,
      async consumeArtworkDownload() {
        throw new Error("Unexpected artwork download call");
      },
      sendArtworkFile() {}
    },
    [mediaGuardPath]: { blockAiTrainingBots: passThrough }
  });

  const app = express();
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    restore();
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    calls
  };
}

test("collector downloads an owned purchase certificate as a private PDF", async (t) => {
  const { baseUrl, calls } = await startOrderRoutesApp(t, {
    number: "MIA/0123456789ABCDEF0123",
    pdf: Buffer.from("%PDF-1.7\ncertificate")
  });
  const response = await fetch(
    `${baseUrl}/orders/75ad34cf-5ee4-4838-b36f-fac65a40f1e9/certificates/1b5d0a0c-d743-4a0b-aed4-e6402058dd77.pdf`
  );
  const body = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(
    response.headers.get("content-disposition"),
    'attachment; filename="certificat-achat-MIA_0123456789ABCDEF0123.pdf"'
  );
  assert.equal(body.subarray(0, 4).toString("ascii"), "%PDF");
  assert.deepEqual(calls, [
    {
      userId: 7,
      orderPublicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
      certificatePublicId: "1b5d0a0c-d743-4a0b-aed4-e6402058dd77"
    }
  ]);
});

test("missing or malformed certificate identifiers remain indistinguishable", async (t) => {
  const { baseUrl, calls } = await startOrderRoutesApp(t, null);
  const missing = await fetch(
    `${baseUrl}/orders/75ad34cf-5ee4-4838-b36f-fac65a40f1e9/certificates/1b5d0a0c-d743-4a0b-aed4-e6402058dd77.pdf`
  );
  const malformed = await fetch(
    `${baseUrl}/orders/75ad34cf-5ee4-4838-b36f-fac65a40f1e9/certificates/not-a-uuid.pdf`
  );

  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { message: "Certificate not found" });
  assert.equal(malformed.status, 404);
  assert.deepEqual(await malformed.json(), { message: "Certificate not found" });
  assert.equal(calls.length, 1);
});
