import test from "node:test";
import assert from "node:assert/strict";

import {
  getOrderPollingDelay,
  getOrderStatusPresentation,
  MAX_ORDER_POLL_ATTEMPTS
} from "../utils/order-status.js";

test("customer-visible payment states never claim success before PAID", () => {
  for (const status of [
    "PENDING_PAYMENT",
    "PAYMENT_PROCESSING",
    "PAYMENT_FAILED",
    "PAYMENT_REVIEW",
    "CANCELED"
  ]) {
    assert.doesNotMatch(getOrderStatusPresentation(status).title, /confirmed/i);
  }
  assert.match(getOrderStatusPresentation("PAID").title, /confirmed/i);
});

test("only processing orders poll with a bounded exponential backoff", () => {
  assert.equal(getOrderStatusPresentation("PAYMENT_PROCESSING").poll, true);
  assert.equal(getOrderStatusPresentation("PAID").poll, false);
  assert.deepEqual(
    Array.from({ length: MAX_ORDER_POLL_ATTEMPTS }, (_, attempt) => getOrderPollingDelay(attempt)),
    [1500, 3000, 6000, 12000, 12000]
  );
});
