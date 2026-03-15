function getHealthPayload() {
  return {
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getHealthPayload
};

