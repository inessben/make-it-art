const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("../helpers/mock-require");
const { ARTIST_WITHDRAWAL_STATUS } = require("../../src/constants/artist-withdrawal-status");

const routesPath = require.resolve("../../src/routes/artist.routes");
const authRequiredPath = require.resolve("../../src/middlewares/auth-required.middleware");
const artistRequiredPath = require.resolve("../../src/middlewares/artist-required.middleware");
const csrfPath = require.resolve("../../src/middlewares/csrf.middleware");
const rateLimitPath = require.resolve("../../src/middlewares/rate-limit.middleware");
const adminRequiredPath = require.resolve("../../src/middlewares/admin-required.middleware");
const applicationRepositoryPath =
  require.resolve("../../src/repositories/artist-application-draft.repository");
const artistRepositoryPath = require.resolve("../../src/repositories/artist.repository");
const artworkRepositoryPath = require.resolve("../../src/repositories/artwork.repository");
const categoryRepositoryPath = require.resolve("../../src/repositories/category.repository");
const userRepositoryPath = require.resolve("../../src/repositories/user.repository");
const contractServicePath = require.resolve("../../src/services/artist-contract.service");
const serializeAuthUserPath = require.resolve("../../src/utils/serialize-auth-user");
const uploadArtworkMiddlewarePath =
  require.resolve("../../src/middlewares/upload-artwork.middleware");
const uploadImageMiddlewarePath = require.resolve("../../src/middlewares/upload-image.middleware");
const artworkMediaPipelinePath =
  require.resolve("../../src/services/artwork-media-pipeline.service");
const uploadedImageServicePath = require.resolve("../../src/services/uploaded-image.service");
const analyticsServicePath = require.resolve("../../src/services/artist-analytics.service");
const artistWithdrawalServicePath = require.resolve("../../src/services/artist-withdrawal.service");
const prismaPath = require.resolve("../../src/lib/prisma");
const serializeMarketplacePath = require.resolve("../../src/utils/serialize-marketplace");

/**
 * End-to-end artist withdrawal journey backed by an in-memory ledger
 * (no Postgres). Exercises the real HTTP routes contract.
 */
function createInMemoryWithdrawalLedger({ availableBalanceCents = 15_000 } = {}) {
  const withdrawals = new Map();

  return {
    list() {
      return [...withdrawals.values()].sort((left, right) => right.createdAt - left.createdAt);
    },
    create({ artist, user, amountMinor, note }) {
      const openAmount = [...withdrawals.values()]
        .filter((row) =>
          [ARTIST_WITHDRAWAL_STATUS.REQUESTED, ARTIST_WITHDRAWAL_STATUS.APPROVED].includes(
            row.status
          )
        )
        .reduce((total, row) => total + row.amount, 0);
      const paidAmount = [...withdrawals.values()]
        .filter((row) => row.status === ARTIST_WITHDRAWAL_STATUS.PAID)
        .reduce((total, row) => total + row.amount, 0);
      const available = availableBalanceCents - openAmount - paidAmount;

      if (amountMinor > available) {
        const error = new Error("Amount exceeds available balance");
        error.code = "WITHDRAWAL_AMOUNT_EXCEEDS_AVAILABLE";
        error.statusCode = 400;
        throw error;
      }

      const publicId = randomUUID();
      const withdrawal = {
        id: withdrawals.size + 1,
        publicId,
        amount: amountMinor,
        amountValue: amountMinor / 100,
        amountLabel: `EUR ${(amountMinor / 100).toFixed(2)}`,
        currency: "EUR",
        status: ARTIST_WITHDRAWAL_STATUS.REQUESTED,
        note,
        adminNote: "",
        payoutReference: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedAt: null,
        paidAt: null,
        artist: { id: artist.id, displayName: artist.displayName, email: user.email },
        requestedBy: { id: user.id, username: user.username, email: user.email },
        reviewedBy: null
      };
      withdrawals.set(publicId, withdrawal);
      return withdrawal;
    },
    cancel({ publicId }) {
      const withdrawal = withdrawals.get(publicId);
      if (!withdrawal) {
        const error = new Error("Withdrawal request not found.");
        error.code = "WITHDRAWAL_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }
      if (withdrawal.status !== ARTIST_WITHDRAWAL_STATUS.REQUESTED) {
        const error = new Error("Only requested withdrawals can be canceled.");
        error.code = "WITHDRAWAL_CANCEL_NOT_ALLOWED";
        error.statusCode = 409;
        throw error;
      }
      withdrawal.status = ARTIST_WITHDRAWAL_STATUS.CANCELED;
      withdrawal.updatedAt = new Date();
      return withdrawal;
    },
    workspace() {
      const requests = this.list();
      return {
        finance: {
          availableToWithdrawValue: availableBalanceCents / 100,
          availableToWithdraw: `EUR ${(availableBalanceCents / 100).toFixed(2)}`,
          pendingWithdrawalAmountValue: 0,
          pendingWithdrawalAmount: "EUR 0.00",
          minimumRequestAmountValue: 25,
          minimumRequestAmount: "EUR 25.00"
        },
        summary: {
          totalRequests: requests.length,
          requestedCount: requests.filter((row) => row.status === "REQUESTED").length,
          approvedCount: 0,
          rejectedCount: 0,
          paidCount: 0,
          canceledCount: requests.filter((row) => row.status === "CANCELED").length
        },
        requests
      };
    }
  };
}

async function startArtistWithdrawalE2E(t) {
  const authUser = { id: 7, email: "artist@example.com", username: "Ada Lovelace" };
  const verifiedArtist = {
    id: 3,
    userId: authUser.id,
    displayName: "Ada Art",
    verified: true,
    _count: { artworks: 1, followers: 0, collections: 0 }
  };
  const ledger = createInMemoryWithdrawalLedger();

  class ArtistWithdrawalError extends Error {
    constructor(code, message, statusCode = 400) {
      super(message);
      this.name = "ArtistWithdrawalError";
      this.code = code;
      this.statusCode = statusCode;
    }
  }

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [prismaPath]: {},
    [authRequiredPath]: {
      authRequired(req, _res, next) {
        req.user = authUser;
        next();
      }
    },
    [artistRequiredPath]: {
      async ensureVerifiedArtist(req, _res, next) {
        req.artist = verifiedArtist;
        next();
      }
    },
    [csrfPath]: {
      csrfProtection(_req, _res, next) {
        next();
      }
    },
    [rateLimitPath]: {
      artworkManagementRateLimit(_req, _res, next) {
        next();
      }
    },
    [adminRequiredPath]: {
      isAdminUser() {
        return false;
      }
    },
    [applicationRepositoryPath]: {
      async findByUserId() {
        return null;
      }
    },
    [artistRepositoryPath]: {
      async findByUserId() {
        return verifiedArtist;
      }
    },
    [artworkRepositoryPath]: {
      async listArtworksByArtistId() {
        return [];
      }
    },
    [categoryRepositoryPath]: {},
    [userRepositoryPath]: {},
    [contractServicePath]: {
      CONTRACT_VERSION: "v1",
      extractArtistApplicationPayload() {
        return {};
      },
      resolveContractSignedAt() {
        return null;
      },
      renderArtistContract() {
        return "";
      },
      async generateArtistContractPdf() {
        return Buffer.from("%PDF");
      }
    },
    [serializeAuthUserPath]: {
      serializeAuthUser(user) {
        return user;
      }
    },
    [serializeMarketplacePath]: {
      parsePriceValue(value) {
        return Number(value);
      },
      serializeArtwork(artwork) {
        return artwork;
      }
    },
    [uploadArtworkMiddlewarePath]: {
      handleArtworkUpload(_req, _res, next) {
        next();
      }
    },
    [uploadImageMiddlewarePath]: {
      createSingleImageUpload() {
        return (_req, _res, next) => next();
      },
      getUploadedImagePath() {
        return null;
      }
    },
    [artworkMediaPipelinePath]: {
      async processArtworkUpload() {
        return {};
      },
      async deleteArtworkMediaAssets() {}
    },
    [uploadedImageServicePath]: {
      buildUploadedImageUrl() {
        return null;
      },
      async removeUploadedImage() {}
    },
    [analyticsServicePath]: {
      async buildArtistDashboardPayload() {
        return { performance: {} };
      },
      async buildArtistSalesPayload() {
        return { summary: {} };
      }
    },
    [artistWithdrawalServicePath]: {
      ArtistWithdrawalError,
      async buildArtistWithdrawalWorkspace() {
        return ledger.workspace();
      },
      async createArtistWithdrawalRequest({ artist, user, amount, note }) {
        const amountMinor = Math.round(Number(String(amount).replace(",", ".")) * 100);
        try {
          return ledger.create({ artist, user, amountMinor, note: note || "" });
        } catch (error) {
          throw new ArtistWithdrawalError(error.code, error.message, error.statusCode);
        }
      },
      async cancelArtistWithdrawal({ publicId }) {
        try {
          return ledger.cancel({ publicId });
        } catch (error) {
          throw new ArtistWithdrawalError(error.code, error.message, error.statusCode);
        }
      }
    }
  });

  const app = express();
  app.use(express.json());
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    restore();
    server.close();
  });

  return { baseUrl: `http://127.0.0.1:${server.address().port}`, ledger };
}

test("e2e artist withdrawal journey on an in-memory ledger", async (t) => {
  const { baseUrl, ledger } = await startArtistWithdrawalE2E(t);

  const listBefore = await fetch(`${baseUrl}/artists/me/withdrawals`);
  assert.equal(listBefore.status, 200);
  assert.equal((await listBefore.json()).summary.totalRequests, 0);

  const createResponse = await fetch(`${baseUrl}/artists/me/withdrawals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: "40.00", note: "Monthly payout" })
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(created.withdrawal.status, "REQUESTED");
  assert.equal(created.withdrawal.amount, 4000);
  assert.equal(ledger.list().length, 1);

  const listAfter = await fetch(`${baseUrl}/artists/me/withdrawals`);
  const listed = await listAfter.json();
  assert.equal(listAfter.status, 200);
  assert.equal(listed.summary.totalRequests, 1);
  assert.equal(listed.summary.requestedCount, 1);

  const cancelResponse = await fetch(
    `${baseUrl}/artists/me/withdrawals/${created.withdrawal.publicId}/cancel`,
    { method: "PATCH" }
  );
  const canceled = await cancelResponse.json();
  assert.equal(cancelResponse.status, 200);
  assert.equal(canceled.withdrawal.status, "CANCELED");
  assert.equal(ledger.list()[0].status, "CANCELED");
});
