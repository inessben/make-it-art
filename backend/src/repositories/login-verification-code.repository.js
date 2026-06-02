const prisma = require("../lib/prisma");

async function createCode(data) {
  // Accept either `codeHash` (used in service) or `tokenHash` (Prisma model).
  const payload = { ...data };
  if (payload.codeHash && !payload.tokenHash) {
    payload.tokenHash = payload.codeHash;
    delete payload.codeHash;
  }
  return prisma.loginVerificationCode.create({ data: payload });
}

async function findValidCodeByHash({ codeHash, userId } = {}) {
  const where = {
    tokenHash: codeHash,
    usedAt: null,
    expiresAt: {
      gt: new Date()
    }
  };

  if (userId) {
    where.userId = userId;
  }

  return prisma.loginVerificationCode.findFirst({
    where,
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
