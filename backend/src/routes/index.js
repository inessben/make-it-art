const express = require("express");
const path = require("path");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const ordersRoutes = require("./orders.routes");
const notificationsRoutes = require("./notifications.routes");
const adminRoutes = require("./admin.routes");
const artistRoutes = require("./artist.routes");
const marketplaceRoutes = require("./marketplace.routes");

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
router.use(marketplaceRoutes);
router.use(artistRoutes);
router.use(ordersRoutes);
router.use(notificationsRoutes);
router.use(adminRoutes);
module.exports = router;
