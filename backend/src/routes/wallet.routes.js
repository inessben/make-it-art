const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { walletWriteRateLimit } = require("../middlewares/rate-limit.middleware");
const cdpAuthService = require("../services/cdp-auth.service");
const walletService = require("../services/wallet.service");
const router = express.Router();
function sendError(res, error) {
  if (error instanceof walletService.WalletError || error instanceof cdpAuthService.CdpAuthError)
    return res.status(error.status).json({ message: error.message, code: error.code });
  console.error("Wallet operation failed:", error);
  return res
    .status(500)
    .json({ message: "Wallet operation failed", code: "WALLET_INTERNAL_ERROR" });
}
router.get("/.well-known/jwks.json", (_req, res) => {
  try {
    return res.status(200).json(cdpAuthService.getJwks());
  } catch (error) {
    return sendError(res, error);
  }
});
router.get("/wallets/me", authRequired, async (req, res) => {
  try {
    return res.status(200).json({ wallets: await walletService.listWallets(req.user) });
  } catch (error) {
    return sendError(res, error);
  }
});
router.post("/wallets/consent", authRequired, walletWriteRateLimit, async (req, res) => {
  try {
    if (typeof req.body?.accepted !== "boolean")
      return res
        .status(400)
        .json({
          message: "Wallet consent decision is required",
          code: "CONSENT_DECISION_REQUIRED"
        });
    return res
      .status(201)
      .json({ consent: await walletService.recordConsent(req.user, req.body.accepted) });
  } catch (error) {
    return sendError(res, error);
  }
});
router.post("/wallets", authRequired, walletWriteRateLimit, async (req, res) => {
  try {
    return res
      .status(202)
      .json({ wallet: await walletService.startCreation(req.user, req.body?.idempotencyKey) });
  } catch (error) {
    return sendError(res, error);
  }
});
router.post("/wallets/:id/cdp-token", authRequired, walletWriteRateLimit, async (req, res) => {
  try {
    return res.status(200).json(await walletService.issueCdpToken(req.user, req.params.id));
  } catch (error) {
    return sendError(res, error);
  }
});
router.post("/wallets/:id/complete", authRequired, walletWriteRateLimit, async (req, res) => {
  try {
    return res
      .status(200)
      .json({
        wallet: await walletService.completeCreation(req.user, req.params.id, {
          accessToken: req.body?.accessToken,
          address: req.body?.address
        })
      });
  } catch (error) {
    return sendError(res, error);
  }
});
router.post("/wallets/:id/failure", authRequired, walletWriteRateLimit, async (req, res) => {
  try {
    return res
      .status(200)
      .json({
        wallet: await walletService.markCreationFailed(req.user, req.params.id, req.body?.code)
      });
  } catch (error) {
    return sendError(res, error);
  }
});
router.post("/wallets/:id/retry", authRequired, walletWriteRateLimit, async (req, res) => {
  try {
    return res
      .status(202)
      .json({ wallet: await walletService.retryCreation(req.user, req.params.id) });
  } catch (error) {
    return sendError(res, error);
  }
});
module.exports = router;
