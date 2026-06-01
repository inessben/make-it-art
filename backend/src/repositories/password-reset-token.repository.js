const prisma = require("../lib/prisma");

async function createToken(data) {
  return prisma.passwordResetToken.create({
    data
  });
}

async function findValidTokenByHash(tokenHash) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
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

async function markTokenAsUsed(id) {
  return prisma.passwordResetToken.update({
    where: { id },
    data: {
      usedAt: new Date()
    }
  });
}

async function markUnusedTokensAsUsed(userId) {
  return prisma.passwordResetToken.updateMany({
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
  createToken,
  findValidTokenByHash,
  markTokenAsUsed,
  markUnusedTokensAsUsed
};
