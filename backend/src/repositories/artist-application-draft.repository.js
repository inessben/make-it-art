const prisma = require("../lib/prisma");

async function findByUserId(userId) {
  return prisma.artistApplicationDraft.findUnique({
    where: { userId }
  });
}

async function saveDraft({ userId, currentStep, payload }) {
  return prisma.artistApplicationDraft.upsert({
    where: { userId },
    create: {
      userId,
      currentStep,
      payload,
      completedAt: null
    },
    update: {
      currentStep,
      payload,
      completedAt: null
    }
  });
}

async function markCompleted(userId) {
  return prisma.artistApplicationDraft.upsert({
    where: { userId },
    create: {
      userId,
      currentStep: 3,
      payload: {},
      completedAt: new Date()
    },
    update: {
      completedAt: new Date()
    }
  });
}

module.exports = {
  findByUserId,
  saveDraft,
  markCompleted
};
