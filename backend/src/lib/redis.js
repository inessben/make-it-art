const { createClient } = require("redis");
const env = require("../config/env");

const redis = createClient({
  url: env.redisUrl
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

module.exports = {
  redis,
  connectRedis
};
