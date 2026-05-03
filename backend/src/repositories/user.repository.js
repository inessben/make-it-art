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
      is_active: true
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
      password_hash: passwordHash
    }
  });
}

module.exports = {
  findByEmail,
  createUser,
  verifyEmail,
  findById,
  updatePassword
};
