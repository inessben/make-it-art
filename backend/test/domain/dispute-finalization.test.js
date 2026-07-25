const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DisputeFinalizationError,
  rightsTaskForDispute,
  targetDisputeStatus
} = require("../../src/services/dispute-finalization.service");
const {
  isTransactionWriteConflict,
  transactionRetryDelayMs
} = require("../../src/lib/transaction-retry");

test("Stripe dispute states map to explicit local open and terminal states", () => {
  assert.equal(targetDisputeStatus("needs_response"), "NEEDS_RESPONSE");
  assert.equal(targetDisputeStatus("warning_under_review"), "UNDER_REVIEW");
  assert.equal(targetDisputeStatus("won"), "WON");
  assert.equal(targetDisputeStatus("lost"), "LOST");
  assert.equal(targetDisputeStatus("warning_closed"), "CLOSED");
  assert.equal(targetDisputeStatus("prevented"), "CLOSED");
});

test("unknown dispute states fail safely instead of granting a terminal outcome", () => {
  assert.throws(
    () => targetDisputeStatus("future_unknown_state"),
    (error) =>
      error instanceof DisputeFinalizationError && error.code === "UNSUPPORTED_DISPUTE_STATUS"
  );
});

test("Prisma and PostgreSQL serialization conflicts are treated as retryable", () => {
  assert.equal(isTransactionWriteConflict({ code: "P2034" }), true);
  assert.equal(
    isTransactionWriteConflict({
      cause: { originalCode: "40001", kind: "TransactionWriteConflict" }
    }),
    true
  );
  assert.equal(isTransactionWriteConflict(new Error("network failure")), false);
  assert.equal(transactionRetryDelayMs(1), 10);
  assert.equal(transactionRetryDelayMs(10), 100);
});

test("dispute rights tasks are created only for the explicitly selected policy", () => {
  const input = {
    status: "NEEDS_RESPONSE",
    disputeId: "dp_test_123",
    orderPublicId: "75ad34cf-5ee4-4838-b36f-fac65a40f1e9"
  };
  assert.equal(rightsTaskForDispute({ ...input, disputeRightsPolicy: "KEEP_ACTIVE" }), null);
  assert.deepEqual(rightsTaskForDispute({ ...input, disputeRightsPolicy: "SUSPEND_ON_OPEN" }), {
    taskType: "SUSPEND_DOWNLOAD_RIGHTS",
    taskKey: "dispute:dp_test_123:SUSPEND_DOWNLOAD_RIGHTS"
  });
  assert.deepEqual(
    rightsTaskForDispute({
      ...input,
      status: "WON",
      disputeRightsPolicy: "SUSPEND_ON_OPEN"
    }),
    {
      taskType: "RESTORE_DOWNLOAD_RIGHTS",
      taskKey: "dispute:dp_test_123:RESTORE_DOWNLOAD_RIGHTS"
    }
  );
  assert.deepEqual(
    rightsTaskForDispute({
      ...input,
      status: "LOST",
      disputeRightsPolicy: "SUSPEND_ON_OPEN"
    }),
    {
      taskType: "REVOKE_DOWNLOAD_RIGHTS",
      taskKey: "dispute:dp_test_123:REVOKE_DOWNLOAD_RIGHTS"
    }
  );
});
