const { randomUUID } = require("node:crypto");

function requestContext(req, res, next) {
  req.supportReference = randomUUID();
  res.set("X-Support-Reference", req.supportReference);
  return next();
}

module.exports = { requestContext };
