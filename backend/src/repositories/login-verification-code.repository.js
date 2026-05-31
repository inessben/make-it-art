const prisma = require("../lib/prisma");

async function createCode(data) {
  return prisma.loginVerificationCode.create({ data });
}

async function findValidCodeByHash({ codeHash }) {
  return prisma.loginVerificationCode.findFirst({
    where: {
      codeHash,
      usedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });
}

async function markCodeAsUsed(id) {
  return prisma.loginVerificationCode.update({
    where: { id },
    data: {
      usedAt: new Date()
    }
  });
}

async function markUnusedCodesAsUsed(userId) {
  return prisma.loginVerificationCode.updateMany({
    where: {
      userId,
      usedAt: null
    },
    data: {
      usedAt: new Date()
    }
  });
}

module.exports = {
  createCode,
  findValidCodeByHash,
  markCodeAsUsed,
  markUnusedCodesAsUsed
};
