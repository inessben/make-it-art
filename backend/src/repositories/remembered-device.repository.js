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

module.exports = {
  createDevice,
  findValidDeviceByHash
};
