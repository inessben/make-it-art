const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const apiRoutes = require("./routes");
const stripeWebhookRoutes = require("./routes/stripe-webhook.routes");
const { getHealthPayload } = require("./services/health.service");
const cookieParser = require("cookie-parser");
const { requestContext } = require("./middlewares/request-context.middleware");
const { securityHeaders } = require("./middlewares/security-headers.middleware");

const app = express();
app.set("trust proxy", 1);
app.use(requestContext);
app.use(securityHeaders);

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = env.corsOrigin
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject without throwing: a thrown Error becomes an Express 500.
      return callback(null, false);
    },
    credentials: true
  })
);

// Stripe signs the exact request bytes. This route must stay before every body parser.
app.use("/api/v1/webhooks/stripe", stripeWebhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({
    ...getHealthPayload(),
    scope: "root"
  });
});

app.use("/api", apiRoutes);

module.exports = app;
