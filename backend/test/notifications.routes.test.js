const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/notifications.routes");
const authRequiredPath =
  require.resolve("../src/middlewares/auth-required.middleware");
const notificationRepositoryPath = require.resolve(
  "../src/repositories/notification.repository",
);

const authUser = {
  id: 12,
  email: "artist@example.com",
};

function buildAuthMiddleware(user) {
  return {
    authRequired(req, _res, next) {
      req.user = user;
      next();
    },
  };
}

async function startNotificationsApp(t, overrides = {}) {
  const calls = {
    listNotificationsForUser: [],
    countUnreadForUser: [],
    markNotificationRead: [],
    markAllNotificationsRead: [],
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware(overrides.authUser || authUser),
    [notificationRepositoryPath]: {
      async listNotificationsForUser(userId, options) {
        calls.listNotificationsForUser.push({ userId, options });
        return overrides.notifications || [
          {
            id: 1,
            userId,
            type: "sale",
            title: "Nouvelle vente",
            message: "Test",
            payload: { orderId: 5 },
            readAt: null,
            createdAt: new Date("2026-07-14T10:00:00.000Z"),
          },
        ];
      },
      async countUnreadForUser(userId) {
        calls.countUnreadForUser.push(userId);
        return overrides.unreadCount ?? 1;
      },
      async markNotificationRead({ notificationId, userId }) {
        calls.markNotificationRead.push({ notificationId, userId });
        return overrides.markReadResult || {
          id: notificationId,
          userId,
          type: "sale",
          title: "Nouvelle vente",
          message: "Test",
          payload: null,
          readAt: new Date(),
          createdAt: new Date(),
        };
      },
      async markAllNotificationsRead(userId) {
        calls.markAllNotificationsRead.push(userId);
        return overrides.markAllCount ?? 2;
      },
    },
  });

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  t.after(async () => {
    restore();
    await new Promise((resolve) => server.close(resolve));
  });

  return { port, calls };
}

test("GET /notifications/me returns notifications and unread count", async (t) => {
  const { port, calls } = await startNotificationsApp(t);

  const response = await fetch(`http://127.0.0.1:${port}/notifications/me`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.unreadCount, 1);
  assert.equal(body.notifications.length, 1);
  assert.equal(body.notifications[0].type, "sale");
  assert.equal(calls.listNotificationsForUser.length, 1);
});

test("PATCH /notifications/:id/read marks one notification", async (t) => {
  const { port, calls } = await startNotificationsApp(t);

  const response = await fetch(`http://127.0.0.1:${port}/notifications/1/read`, {
    method: "PATCH",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.notification.id, 1);
  assert.deepEqual(calls.markNotificationRead[0], {
    notificationId: 1,
    userId: authUser.id,
  });
});
