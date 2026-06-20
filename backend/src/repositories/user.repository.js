const prisma = require("../lib/prisma");

async function findByEmail(email) {
  return prisma.user.findFirst({
    where: { email },
    include: {
      admin: true,
      artist: true
    }
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
    where: { id },
    include: {
      admin: true,
      artist: true
    }
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
    data,
    include: {
      admin: true,
      artist: true
    }
  });
}

async function listUsersForAdmin() {
  return prisma.user.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    include: {
      admin: true,
      artist: true,
      _count: {
        select: {
          orders: true
        }
      }
    }
  });
}

module.exports = {
  findByEmail,
  createUser,
  verifyEmail,
  findById,
  updatePassword,
  updateUser,
  listUsersForAdmin
};
