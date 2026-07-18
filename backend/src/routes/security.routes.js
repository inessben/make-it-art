const express = require("express");
const { authRequired } = require("../middlewares/auth-required.middleware");
const { securityRateLimit } = require("../middlewares/rate-limit.middleware");
const { issueCsrfToken } = require("../middlewares/csrf.middleware");

const router = express.Router();

router.get("/security/csrf-token", authRequired, securityRateLimit, issueCsrfToken);

module.exports = router;
