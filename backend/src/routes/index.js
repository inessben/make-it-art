const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const ordersRoutes = require("./orders.routes");
const adminRoutes = require("./admin.routes");
const adminAnalyticsRoutes = require("./admin-analytics.routes");
const artistRoutes = require("./artist.routes");
const marketplaceRoutes = require("./marketplace.routes");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(artistRoutes);
router.use(marketplaceRoutes);
router.use(ordersRoutes);
router.use(adminRoutes);
router.use(adminAnalyticsRoutes);
module.exports = router;
