const prisma = require("../lib/prisma");

async function createDevice(data) {
  return prisma.remembered_device.create({ data });
}

async function findValidDeviceByHash(tokenHash) {
  return prisma.remembered_device.findFirst({
    where: {
      token_hash: tokenHash,
      expires_at: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });
}

async function deleteDeviceByHash(tokenHash) {
  return prisma.remembered_device.deleteMany({
    where: {
      token_hash: tokenHash
    }
  });
}

module.exports = {
  createDevice,
  findValidDeviceByHash,
  deleteDeviceByHash
};
