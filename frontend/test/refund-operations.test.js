import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminRefundRequest,
  canRequestRefund,
  parseRefundAmountToCents,
  refundOperationErrorMessage
} from "../utils/refund-operations.js";

const orderPublicId = "b5cb23ef-d417-4ad4-af3f-0e8f3394262e";
const idempotencyKey = "d78ff548-6138-46d9-8f55-f8a819e4a8af";

test("refund amounts accept euros with at most two decimals", () => {
  assert.equal(parseRefundAmountToCents("5"), 500);
  assert.equal(parseRefundAmountToCents("5,2"), 520);
  assert.equal(parseRefundAmountToCents("5.20"), 520);
  assert.equal(parseRefundAmountToCents("0"), null);
  assert.equal(parseRefundAmountToCents("5.201"), null);
  assert.equal(parseRefundAmountToCents("-5"), null);
  assert.equal(parseRefundAmountToCents("not-a-number"), null);
});

test("only server-approved orders with a positive balance are refundable", () => {
  assert.equal(
    canRequestRefund({
      canRefund: true,
      publicId: orderPublicId,
      refundableAmount: 1490
    }),
    true
  );
  assert.equal(
    canRequestRefund({
      canRefund: false,
      publicId: orderPublicId,
      refundableAmount: 1490
    }),
    false
  );
  assert.equal(
    canRequestRefund({
      canRefund: true,
      publicId: orderPublicId,
      refundableAmount: 0
    }),
    false
  );
});

test("refund requests contain only amount, reason and security headers", () => {
  assert.deepEqual(
    buildAdminRefundRequest({
      orderPublicId,
      amount: 500,
      reason: "CUSTOMER_REQUEST",
      idempotencyKey,
      csrfToken: "csrf-safe"
    }),
    {
      url: `/api/v1/admin/orders/${orderPublicId}/refunds`,
      options: {
        method: "POST",
        credentials: "include",
        headers: {
          "x-csrf-token": "csrf-safe",
          "idempotency-key": idempotencyKey
        },
        body: {
          amount: 500,
          reason: "CUSTOMER_REQUEST"
        }
      }
    }
  );
});

test("refund request construction rejects unsafe inputs", () => {
  const valid = {
    orderPublicId,
    amount: 500,
    reason: "CUSTOMER_REQUEST",
    idempotencyKey,
    csrfToken: "csrf-safe"
  };

  assert.throws(() => buildAdminRefundRequest({ ...valid, orderPublicId: "42" }), /Invalid order/);
  assert.throws(() => buildAdminRefundRequest({ ...valid, amount: 5.5 }), /Invalid refund amount/);
  assert.throws(
    () => buildAdminRefundRequest({ ...valid, reason: "OTHER" }),
    /Invalid refund reason/
  );
  assert.throws(
    () => buildAdminRefundRequest({ ...valid, idempotencyKey: "not-a-uuid" }),
    /idempotency/
  );
  assert.throws(() => buildAdminRefundRequest({ ...valid, csrfToken: "" }), /CSRF/);
});

test("refund errors explain recent authentication and uncertain provider responses", () => {
  assert.match(
    refundOperationErrorMessage({
      data: { code: "RECENT_AUTHENTICATION_REQUIRED" }
    }),
    /moins de dix minutes/
  );
  assert.match(
    refundOperationErrorMessage({
      data: { code: "REFUND_PROVIDER_PENDING" }
    }),
    /sans modifier le montant/
  );
  assert.match(
    refundOperationErrorMessage({
      data: { code: "REFUND_AMOUNT_EXCEEDS_BALANCE" }
    }),
    /solde remboursable/
  );
});
