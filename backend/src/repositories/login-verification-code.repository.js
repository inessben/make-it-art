const prisma = require("../lib/prisma");

async function createCode(data) {
  return prisma.login_verification_code.create({ data });
}

async function findValidCodeByHash({ codeHash }) {
  return prisma.login_verification_code.findFirst({
    where: {
      code_hash: codeHash,
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

async function markCodeAsUsed(id) {
  return prisma.login_verification_code.update({
    where: { id },
    data: {
      used_at: new Date()
    }
  });
}

async function markUnusedCodesAsUsed(userId) {
  return prisma.login_verification_code.updateMany({
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
  createCode,
  findValidCodeByHash,
  markCodeAsUsed,
  markUnusedCodesAsUsed
};
