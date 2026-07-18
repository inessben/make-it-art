const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const ordersRoutes = require("./orders.routes");
const adminRoutes = require("./admin.routes");
const adminAnalyticsRoutes = require("./admin-analytics.routes");
const artistRoutes = require("./artist.routes");
const marketplaceRoutes = require("./marketplace.routes");
const cartRoutes = require("./cart.routes");
const securityRoutes = require("./security.routes");
const orderRoutes = require("./order.routes");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(artistRoutes);
router.use(marketplaceRoutes);
router.use(ordersRoutes);
router.use(adminRoutes);
router.use(adminAnalyticsRoutes);
router.use("/v1", cartRoutes);
router.use("/v1", securityRoutes);
router.use("/v1", orderRoutes);
module.exports = router;
