const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(adminRoutes);
module.exports = router;
