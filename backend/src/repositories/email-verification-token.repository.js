const prisma = require("../lib/prisma");

async function createToken(data) {
  return prisma.email_verification_token.create({
    data
  });
}

async function findValidTokenByHash(tokenHash) {
  return prisma.email_verification_token.findFirst({
    where: {
      token_hash: tokenHash,
      used_at: null,
      expires_at: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });
}
async function markTokenAsUsed(id) {
  return prisma.email_verification_token.update({
    where: { id },
    data: {
      used_at: new Date()
    }
  });
}

async function markUnusedTokensAsUsed(userId) {
  return prisma.email_verification_token.updateMany({
    where: {
      user_id: userId,
      used_at: null
    },
    data: {
      used_at: new Date()
    }
  });
}

module.exports = {
  createToken,
  findValidTokenByHash,
  markTokenAsUsed,
  markUnusedTokensAsUsed
};
