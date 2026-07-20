const prisma = require("../lib/prisma");

async function createToken(data) {
  return prisma.emailVerificationToken.create({
    data
  });
}

async function findValidTokenByHash(tokenHash) {
  return prisma.emailVerificationToken.findFirst({
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
  return prisma.emailVerificationToken.update({
    where: { id },
    data: {
      usedAt: new Date()
    }
  });
}

async function markUnusedTokensAsUsed(userId) {
  return prisma.emailVerificationToken.updateMany({
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
