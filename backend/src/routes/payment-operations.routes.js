const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { adminRequired } = require("../middlewares/admin-required.middleware");
const { csrfProtection } = require("../middlewares/csrf.middleware");
const {
  paymentOperationsAdminRequired
} = require("../middlewares/payment-operations-admin.middleware");
const { paymentOperationsRateLimit } = require("../middlewares/rate-limit.middleware");
const {
  PaymentOperationsError,
  listPaymentAnomalies,
  reconcileOrderWithStripe,
  replayStripeWebhook,
  requeueFulfillmentTask,
  resolveOperatorAlert,
  syncDisputeEvidenceAudit
} = require("../services/payment-operations.service");

const router = express.Router();

function noStore(_req, res, next) {
  res.set("Cache-Control", "private, no-store");
  next();
}

function rejectUnexpectedBody(req, res, next) {
  const body = req.body;
  if (body === undefined || body === null) return next();
  if (typeof body !== "object" || Array.isArray(body) || Object.keys(body).length > 0) {
    return res.status(400).json({
      message: "This operation does not accept a request body",
      code: "UNEXPECTED_PAYMENT_OPERATION_INPUT"
    });
  }
  return next();
}

function operationError(res, error, supportReference) {
  if (error instanceof PaymentOperationsError) {
    return res.status(error.status).json({ message: error.message, code: error.code });
  }
  console.error("Payment operation failed", {
    name: error.name,
    code: error.code || "PAYMENT_OPERATION_FAILED",
    supportReference
  });
  return res.status(500).json({
    message: "Payment operation failed",
    code: "PAYMENT_OPERATION_FAILED",
    supportReference
  });
}

router.get("/admin/payments/anomalies", noStore, authRequired, adminRequired, async (req, res) => {
  try {
    return res.status(200).json(await listPaymentAnomalies());
  } catch (error) {
    return operationError(res, error, req.supportReference);
  }
});

router.post(
  "/admin/payments/anomalies/tasks/:taskId/replay",
  noStore,
  authRequired,
  paymentOperationsAdminRequired,
  paymentOperationsRateLimit,
  csrfProtection,
  rejectUnexpectedBody,
  async (req, res) => {
    try {
      const result = await requeueFulfillmentTask({
        taskId: Number(req.params.taskId),
        requestedByUserId: req.user.id,
        ipAddress: req.ip
      });
      return res.status(result.queued ? 202 : 200).json(result);
    } catch (error) {
      return operationError(res, error, req.supportReference);
    }
  }
);

router.post(
  "/admin/payments/anomalies/webhooks/:eventId/replay",
  noStore,
  authRequired,
  paymentOperationsAdminRequired,
  paymentOperationsRateLimit,
  csrfProtection,
  rejectUnexpectedBody,
  async (req, res) => {
    try {
      const result = await replayStripeWebhook({
        eventId: req.params.eventId,
        requestedByUserId: req.user.id,
        ipAddress: req.ip
      });
      return res.status(200).json(result);
    } catch (error) {
      return operationError(res, error, req.supportReference);
    }
  }
);

router.post(
  "/admin/payments/anomalies/orders/:publicId/reconcile",
  noStore,
  authRequired,
  paymentOperationsAdminRequired,
  paymentOperationsRateLimit,
  csrfProtection,
  rejectUnexpectedBody,
  async (req, res) => {
    try {
      const result = await reconcileOrderWithStripe({
        orderPublicId: req.params.publicId,
        requestedByUserId: req.user.id,
        ipAddress: req.ip
      });
      return res.status(200).json(result);
    } catch (error) {
      return operationError(res, error, req.supportReference);
    }
  }
);

router.post(
  "/admin/payments/anomalies/disputes/:disputeId/sync-evidence",
  noStore,
  authRequired,
  paymentOperationsAdminRequired,
  paymentOperationsRateLimit,
  csrfProtection,
  rejectUnexpectedBody,
  async (req, res) => {
    try {
      return res.status(200).json(
        await syncDisputeEvidenceAudit({
          disputeId: req.params.disputeId,
          requestedByUserId: req.user.id,
          ipAddress: req.ip
        })
      );
    } catch (error) {
      return operationError(res, error, req.supportReference);
    }
  }
);

router.post(
  "/admin/payments/anomalies/alerts/:alertId/resolve",
  noStore,
  authRequired,
  paymentOperationsAdminRequired,
  paymentOperationsRateLimit,
  csrfProtection,
  async (req, res) => {
    try {
      const fields = req.body && typeof req.body === "object" ? Object.keys(req.body) : [];
      if (fields.some((field) => field !== "resolutionCode")) {
        return res.status(400).json({
          message: "Unknown fields are not allowed",
          code: "UNEXPECTED_PAYMENT_OPERATION_INPUT"
        });
      }
      const result = await resolveOperatorAlert({
        alertId: Number(req.params.alertId),
        resolutionCode: String(req.body?.resolutionCode || ""),
        requestedByUserId: req.user.id,
        ipAddress: req.ip
      });
      return res.status(200).json(result);
    } catch (error) {
      return operationError(res, error, req.supportReference);
    }
  }
);

module.exports = router;
