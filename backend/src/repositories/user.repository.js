const prisma = require("../lib/prisma");

async function findByEmail(email) {
  return prisma.user.findFirst({
    where: { email }
  });
}

async function createUser(data) {
  return prisma.user.create({
    data
  });
}
async function verifyEmail(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      verified: true,
      isActive: true
    }
  });
}
async function findById(id) {
  return prisma.user.findUnique({
    where: { id }
  });
}
async function updatePassword(userId, passwordHash) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: passwordHash
    }
  });
}

async function updateUser(userId, data) {
  return prisma.user.update({
    where: { id: userId },
    data
  });
}

module.exports = {
  findByEmail,
  createUser,
  verifyEmail,
  findById,
  updatePassword,
  updateUser
};
