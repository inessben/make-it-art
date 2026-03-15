const express = require("express");
const { getHealthPayload } = require("../services/health.service");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.status(200).json(getHealthPayload());
});

module.exports = router;
