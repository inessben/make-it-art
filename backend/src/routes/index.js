const express = require("express");
const path = require("path");
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

const router = express.Router();

router.use(
  "/uploads",
  express.static(path.resolve(__dirname, "../../uploads"), {
    fallthrough: false,
    maxAge: "7d",
  }),
);

router.use(healthRoutes);
router.use(authRoutes);
router.use(artistRoutes);
router.use(marketplaceRoutes);
router.use(ordersRoutes);
router.use(notificationsRoutes);
router.use(adminRoutes);
router.use(adminAnalyticsRoutes);
router.use("/v1", cartRoutes);
router.use("/v1", securityRoutes);
router.use("/v1", orderRoutes);
router.use("/v1", refundRoutes);
router.use("/v1", paymentOperationsRoutes);
module.exports = router;
