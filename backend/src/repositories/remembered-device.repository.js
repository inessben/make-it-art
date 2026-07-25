const prisma = require("../lib/prisma");

async function createDevice(data) {
  return prisma.rememberedDevice.create({ data });
}

async function findValidDeviceByHash(tokenHash) {
  return prisma.rememberedDevice.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });
}

async function updateDeviceExpiry({ deviceId, expiresAt }) {
  return prisma.rememberedDevice.update({
    where: {
      id: deviceId
    },
    data: {
      expiresAt
    }
  });
}

module.exports = {
  createDevice,
  findValidDeviceByHash,
  updateDeviceExpiry
};
