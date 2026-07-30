const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModuleWithMocks } = require("./helpers/mock-require");
const { ARTIST_WITHDRAWAL_STATUS } = require("../src/constants/artist-withdrawal-status");

const servicePath = require.resolve("../src/services/artist-withdrawal.service");
const envPath = require.resolve("../src/config/env");
const withdrawalRepositoryPath =
  require.resolve("../src/repositories/artist-withdrawal.repository");
const notificationRepositoryPath = require.resolve("../src/repositories/notification.repository");
const analyticsServicePath = require.resolve("../src/services/artist-analytics.service");
const mailServicePath = require.resolve("../src/services/mail.service");

const artist = { id: 3, displayName: "Ada Art", userId: 7 };
const user = { id: 7, email: "artist@example.com", username: "Ada" };

function buildWithdrawal(overrides = {}) {
  return {
    id: 11,
    publicId: "wd_test_public",
    artistId: artist.id,
    amount: 5000,
    currency: "EUR",
    status: ARTIST_WITHDRAWAL_STATUS.REQUESTED,
    note: "",
    adminNote: null,
    payoutReference: null,
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    reviewedAt: null,
    paidAt: null,
    artist: {
      id: artist.id,
      displayName: artist.displayName,
      userId: artist.userId,
      user: { email: user.email, username: user.username }
    },
    requestedBy: { id: user.id, email: user.email, username: user.username },
    reviewedBy: null,
    ...overrides
  };
}

function loadService({
  availableBalanceValue = 150,
  existingWithdrawals = [],
  groupedRows = [],
  createResult = null,
  findForAdmin = null,
  findForArtist = null,
  updateResult = null
} = {}) {
  const calls = {
    createWithdrawal: [],
    createNotificationOnce: [],
    updateWithdrawal: [],
    sendAlert: 0
  };

  const { moduleExports, restore } = loadModuleWithMocks(servicePath, {
    [envPath]: {
      artistWithdrawals: {
        minimumAmount: 2500
      }
    },
    [analyticsServicePath]: {
      async buildArtistSalesPayload() {
        return {
          summary: {
            availableBalanceValue
          }
        };
      }
    },
    [withdrawalRepositoryPath]: {
      async summarizeWithdrawalsForArtist() {
        return groupedRows;
      },
      async listWithdrawalsForArtist() {
        return existingWithdrawals;
      },
      async createWithdrawal(payload) {
        calls.createWithdrawal.push(payload);
        return (
          createResult ||
          buildWithdrawal({
            amount: payload.amount,
            note: payload.note || ""
          })
        );
      },
      async findWithdrawalForAdmin(publicId) {
        if (findForAdmin === null) {
          return null;
        }
        return typeof findForAdmin === "function" ? findForAdmin(publicId) : findForAdmin;
      },
      async findWithdrawalForArtist({ publicId }) {
        if (findForArtist === null) {
          return null;
        }
        return typeof findForArtist === "function" ? findForArtist(publicId) : findForArtist;
      },
      async updateWithdrawal(payload) {
        calls.updateWithdrawal.push(payload);
        return updateResult || buildWithdrawal({ ...payload.data, id: payload.withdrawalId });
      },
      async listWithdrawalsForAdmin() {
        return existingWithdrawals;
      }
    },
    [notificationRepositoryPath]: {
      async createNotificationOnce(payload) {
        calls.createNotificationOnce.push(payload);
        return { id: 1 };
      }
    },
    [mailServicePath]: {
      async sendArtistWithdrawalRequestAlert() {
        calls.sendAlert += 1;
      },
      async sendArtistWithdrawalStatusEmail() {}
    }
  });

  return { service: moduleExports, restore, calls };
}

test("createArtistWithdrawalRequest rejects an invalid amount format", async () => {
  const loaded = loadService();
  try {
    await assert.rejects(
      () =>
        loaded.service.createArtistWithdrawalRequest({
          artist,
          user,
          amount: "not-a-price",
          note: ""
        }),
      (error) => error.code === "INVALID_WITHDRAWAL_AMOUNT" && error.statusCode === 400
    );
    assert.equal(loaded.calls.createWithdrawal.length, 0);
  } finally {
    loaded.restore();
  }
});

test("createArtistWithdrawalRequest rejects amounts below the configured minimum", async () => {
  const loaded = loadService({ availableBalanceValue: 150 });
  try {
    await assert.rejects(
      () =>
        loaded.service.createArtistWithdrawalRequest({
          artist,
          user,
          amount: "10.00",
          note: ""
        }),
      (error) => error.code === "WITHDRAWAL_AMOUNT_TOO_LOW"
    );
    assert.equal(loaded.calls.createWithdrawal.length, 0);
  } finally {
    loaded.restore();
  }
});

test("createArtistWithdrawalRequest rejects amounts above the available balance", async () => {
  const loaded = loadService({ availableBalanceValue: 40 });
  try {
    await assert.rejects(
      () =>
        loaded.service.createArtistWithdrawalRequest({
          artist,
          user,
          amount: "50.00",
          note: ""
        }),
      (error) => error.code === "WITHDRAWAL_AMOUNT_EXCEEDS_AVAILABLE"
    );
    assert.equal(loaded.calls.createWithdrawal.length, 0);
  } finally {
    loaded.restore();
  }
});

test("createArtistWithdrawalRequest persists a valid request and notifies the artist", async () => {
  const loaded = loadService({ availableBalanceValue: 150 });
  try {
    const result = await loaded.service.createArtistWithdrawalRequest({
      artist,
      user,
      amount: "50,00 €",
      note: "  Monthly payout  "
    });

    assert.equal(result.status, ARTIST_WITHDRAWAL_STATUS.REQUESTED);
    assert.equal(result.amount, 5000);
    assert.equal(result.note, "Monthly payout");
    assert.equal(loaded.calls.createWithdrawal.length, 1);
    assert.equal(loaded.calls.createWithdrawal[0].amount, 5000);
    assert.equal(loaded.calls.createWithdrawal[0].artistId, artist.id);
    assert.equal(loaded.calls.createNotificationOnce.length, 1);
    assert.equal(loaded.calls.sendAlert, 1);
  } finally {
    loaded.restore();
  }
});

test("updateArtistWithdrawalStatus refuses to approve a non-requested withdrawal", async () => {
  const loaded = loadService({
    findForAdmin: buildWithdrawal({ status: ARTIST_WITHDRAWAL_STATUS.APPROVED })
  });
  try {
    await assert.rejects(
      () =>
        loaded.service.updateArtistWithdrawalStatus({
          publicId: "wd_test_public",
          action: "approve",
          actorUserId: 99
        }),
      (error) => error.code === "WITHDRAWAL_APPROVE_NOT_ALLOWED" && error.statusCode === 409
    );
    assert.equal(loaded.calls.updateWithdrawal.length, 0);
  } finally {
    loaded.restore();
  }
});

test("updateArtistWithdrawalStatus refuses to mark unpaid withdrawals as paid", async () => {
  const loaded = loadService({
    findForAdmin: buildWithdrawal({ status: ARTIST_WITHDRAWAL_STATUS.REQUESTED })
  });
  try {
    await assert.rejects(
      () =>
        loaded.service.updateArtistWithdrawalStatus({
          publicId: "wd_test_public",
          action: "mark_paid",
          actorUserId: 99
        }),
      (error) => error.code === "WITHDRAWAL_PAY_NOT_ALLOWED" && error.statusCode === 409
    );
  } finally {
    loaded.restore();
  }
});
