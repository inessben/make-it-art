const express = require("express");
const docsRoutes = require("./docs.routes");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const ordersRoutes = require("./orders.routes");
const notificationsRoutes = require("./notifications.routes");
const adminRoutes = require("./admin.routes");
const adminAnalyticsRoutes = require("./admin-analytics.routes");
const artistRoutes = require("./artist.routes");
const marketplaceRoutes = require("./marketplace.routes");
const cartRoutes = require("./cart.routes");
const securityRoutes = require("./security.routes");
const orderRoutes = require("./order.routes");
const refundRoutes = require("./refund.routes");
const paymentOperationsRoutes = require("./payment-operations.routes");
const artworkMediaRoutes = require("./artwork-media.routes");
const savedPaymentMethodRoutes = require("./saved-payment-method.routes");
const { blockAiTrainingBots } = require("../middlewares/artwork-media-guard.middleware");

const router = express.Router();

router.use(blockAiTrainingBots);
router.use("/uploads", artworkMediaRoutes);
router.use("/uploads", artworkMediaRoutes.uploadsStatic);

router.use(docsRoutes);
router.use(healthRoutes);
router.use(authRoutes);
router.use(artistRoutes);
router.use(marketplaceRoutes);
// Media streaming/protection routes (no static catch-all — that stays under /uploads).
router.use(artworkMediaRoutes);
router.use(ordersRoutes);
router.use(notificationsRoutes);
router.use(adminRoutes);
router.use(adminAnalyticsRoutes);
router.use("/v1", cartRoutes);
router.use("/v1", securityRoutes);
router.use("/v1", orderRoutes);
router.use("/v1", refundRoutes);
router.use("/v1", paymentOperationsRoutes);
router.use("/v1", savedPaymentMethodRoutes);
module.exports = router;
