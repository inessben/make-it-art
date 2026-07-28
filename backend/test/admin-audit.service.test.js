const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  sanitizeAuditMetadata,
  writeAdminAuditLog
} = require("../src/services/admin-audit.service");

test("audit metadata removes secrets while preserving lifecycle evidence", async () => {
  const calls = [];
  const prismaClient = {
    auditLog: {
      async create(payload) {
        calls.push(payload);
        return payload.data;
      }
    }
  };

  await writeAdminAuditLog(prismaClient, {
    actorUserId: 7,
    action: "artwork_hidden",
    entityType: "artwork",
    entityId: 42,
    correlationId: "019fa4e4-8646-70a3-8218-11eb680966e4",
    metadata: {
      before: { visibility: "PUBLISHED", version: 2 },
      after: { visibility: "HIDDEN", version: 3 },
      clientSecret: "pi_secret_forbidden",
      nested: { authorization: "Bearer forbidden", reasonCode: "ARTWORK_HIDDEN" }
    }
  });

  assert.equal(calls[0].data.action, "ARTWORK_HIDDEN");
  assert.equal(calls[0].data.entityType, "ARTWORK");
  assert.equal(calls[0].data.correlationId, "019fa4e4-8646-70a3-8218-11eb680966e4");
  assert.deepEqual(calls[0].data.metadata, {
    before: { visibility: "PUBLISHED", version: 2 },
    after: { visibility: "HIDDEN", version: 3 },
    nested: { reasonCode: "ARTWORK_HIDDEN" }
  });
  assert.doesNotMatch(JSON.stringify(calls[0]), /pi_secret|Bearer forbidden/);
});

test("audit metadata is bounded and rejects unsupported values", () => {
  assert.deepEqual(sanitizeAuditMetadata({ title: "a".repeat(800) }), {
    title: "a".repeat(500)
  });
  assert.deepEqual(sanitizeAuditMetadata({ callback() {}, missing: undefined }), {
    callback: null,
    missing: null
  });
});
