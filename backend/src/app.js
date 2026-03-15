const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const apiRoutes = require("./routes");
const { getHealthPayload } = require("./services/health.service");

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    ...getHealthPayload(),
    scope: "root"
  });
});

app.use("/api", apiRoutes);

module.exports = app;

