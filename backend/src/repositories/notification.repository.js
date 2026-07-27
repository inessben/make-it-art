const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");

async function listNotificationsForUser(userId, { limit = 50 } = {}) {
  return prisma.notification.findMany({
    where: {
      userId
    },
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    take: limit
  });
}

async function countUnreadForUser(userId) {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null
    }
  });
}

async function createNotification({ userId, type, title, message, payload = null }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      payload,
      createdAt: new Date()
    }
  });
}

async function createNotificationOnce({
  userId,
  type,
  title,
  message,
  payload = null,
  eventKey,
  prismaClient = prisma
}) {
  const normalizedPayload =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...payload, eventKey }
      : { eventKey };

  const insertedRows = await prismaClient.$executeRaw(
    Prisma.sql`
      INSERT INTO "notification" ("user_id", "type", "title", "message", "payload", "created_at")
      VALUES (
        ${userId},
        ${type},
        ${title},
        ${message},
        CAST(${JSON.stringify(normalizedPayload)} AS jsonb),
        ${new Date()}
      )
      ON CONFLICT DO NOTHING
    `
  );

  return insertedRows > 0;
}

async function markNotificationRead({ notificationId, userId }) {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId
    }
  });
}

async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return result.count;
}

module.exports = {
  listNotificationsForUser,
  countUnreadForUser,
  createNotification,
  createNotificationOnce,
  markNotificationRead,
  markAllNotificationsRead
};
