const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const ordersRoutes = require("./orders.routes");
const artistRoutes = require("./artist.routes");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(artistRoutes);
router.use(ordersRoutes);
module.exports = router;
