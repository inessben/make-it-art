const prisma = require("../lib/prisma");

async function listNotificationsForUser(userId, { limit = 50 } = {}) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: limit,
  });
}

async function countUnreadForUser(userId) {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

async function createNotification({
  userId,
  type,
  title,
  message,
  payload = null,
}) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      payload,
      createdAt: new Date(),
    },
  });
}

async function markNotificationRead({ notificationId, userId }) {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });
}

async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

module.exports = {
  listNotificationsForUser,
  countUnreadForUser,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
};
