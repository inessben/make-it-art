const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/admin.routes");
const authRequiredPath = require.resolve("../src/middlewares/auth-required.middleware");
const adminRequiredPath = require.resolve("../src/middlewares/admin-required.middleware");
const applicationRepositoryPath =
  require.resolve("../src/repositories/artist-application-draft.repository");
const userRepositoryPath = require.resolve("../src/repositories/user.repository");
const artistRepositoryPath = require.resolve("../src/repositories/artist.repository");
const artworkRepositoryPath = require.resolve("../src/repositories/artwork.repository");
const orderRepositoryPath = require.resolve("../src/repositories/order.repository");
const paymentRepositoryPath = require.resolve("../src/repositories/payment.repository");
const authServicePath = require.resolve("../src/services/auth.service");

function buildAdminUser({ isSuperAdmin }) {
  return {
    id: isSuperAdmin ? 1 : 2,
    email: isSuperAdmin ? "super-admin@example.com" : "admin@example.com",
    username: isSuperAdmin ? "Super Admin" : "Admin",
    role: "admin",
    admin: {
      isSuperAdmin
    }
  };
}

function buildAuthMiddleware(adminUser) {
  return {
    authRequired(req, _res, next) {
      req.user = adminUser;
      next();
    }
  };
}

function buildAdminMiddleware(adminUser) {
  return {
    adminRequired(_req, _res, next) {
      next();
    },
    superAdminRequired(_req, res, next) {
      if (!adminUser.admin?.isSuperAdmin) {
        return res.status(403).json({
          message: "Super admin access required"
        });
      }

      return next();
    },
    isAdminUser(user) {
      return user?.role === "admin" || Boolean(user?.admin);
    },
    isSuperAdminUser(user) {
      return user?.admin?.isSuperAdmin === true;
    }
  };
}

async function startAdminUsersApp(t, overrides = {}) {
  const adminUser = overrides.authUser || buildAdminUser({ isSuperAdmin: true });
  const calls = {
    inviteAdminUser: []
  };

  const userRepository = {
    async listUsersForAdmin() {
      return (
        overrides.listUsersForAdminResult || [
          {
            id: 10,
            username: "Collector",
            email: "collector@example.com",
            phone: null,
            verified: true,
            isActive: true,
            role: null,
            admin: null,
            artist: null,
            _count: {
              orders: 2
            },
            createdAt: new Date("2026-07-10T09:00:00.000Z")
          },
          {
            id: 11,
            username: "Backoffice Admin",
            email: "admin2@example.com",
            phone: null,
            verified: true,
            isActive: true,
            role: "admin",
            admin: {
              isSuperAdmin: false
            },
            artist: null,
            _count: {
              orders: 0
            },
            createdAt: new Date("2026-07-11T09:00:00.000Z")
          },
          {
            id: 12,
            username: "Lead Admin",
            email: "lead-admin@example.com",
            phone: null,
            verified: true,
            isActive: true,
            role: "admin",
            admin: {
              isSuperAdmin: true
            },
            artist: null,
            _count: {
              orders: 0
            },
            createdAt: new Date("2026-07-12T09:00:00.000Z")
          }
        ]
      );
    }
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware(adminUser),
    [adminRequiredPath]: buildAdminMiddleware(adminUser),
    [applicationRepositoryPath]: {
      async listSubmittedApplications() {
        return [];
      },
      async findById() {
        return null;
      }
    },
    [userRepositoryPath]: userRepository,
    [artistRepositoryPath]: {
      async listArtistsForAdmin() {
        return [];
      },
      async updateArtistVerification() {
        return null;
      }
    },
    [artworkRepositoryPath]: {
      async listArtworksForAdmin() {
        return [];
      }
    },
    [orderRepositoryPath]: {
      async listOrdersForAdmin() {
        return [];
      }
    },
    [paymentRepositoryPath]: {
      async listPaymentsForAdmin() {
        return [];
      }
    },
    [authServicePath]: {
      async inviteAdminUser(payload) {
        calls.inviteAdminUser.push(payload);

        return (
          overrides.inviteAdminUserResult || {
            id: 99,
            username: payload.username,
            email: payload.email,
            phone: payload.phone,
            verified: false,
            isActive: false,
            role: "admin",
            admin: {
              isSuperAdmin: payload.isSuperAdmin
            },
            artist: null,
            _count: {
              orders: 0
            },
            createdAt: new Date("2026-07-24T10:00:00.000Z")
          }
        );
      }
    }
  });

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    restore();
  });

  return {
    calls,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  };
}

async function requestJson(baseUrl, path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json();

  return {
    status: response.status,
    body: payload
  };
}

test("GET /admin/users exposes super admin counts and permissions", async (t) => {
  const { baseUrl } = await startAdminUsersApp(t);
  const response = await requestJson(baseUrl, "/admin/users");

  assert.equal(response.status, 200);
  assert.equal(response.body.summary.totalUsers, 3);
  assert.equal(response.body.summary.adminUsers, 2);
  assert.equal(response.body.summary.superAdminUsers, 1);
  assert.equal(response.body.permissions.canManageAdmins, true);
  assert.equal(response.body.users[2].role, "Super admin");
  assert.equal(response.body.users[2].isSuperAdmin, true);
});

test("POST /admin/users/admins lets a super admin create another admin", async (t) => {
  const { baseUrl, calls } = await startAdminUsersApp(t);
  const response = await requestJson(baseUrl, "/admin/users/admins", {
    method: "POST",
    body: {
      username: "Operations Lead",
      email: "ops@example.com",
      phone: "+33600000000",
      isSuperAdmin: true
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.message, "Super admin invitation sent");
  assert.equal(calls.inviteAdminUser.length, 1);
  assert.equal(calls.inviteAdminUser[0].username, "Operations Lead");
  assert.equal(calls.inviteAdminUser[0].email, "ops@example.com");
  assert.equal(calls.inviteAdminUser[0].phone, "+33600000000");
  assert.equal(calls.inviteAdminUser[0].isSuperAdmin, true);
  assert.equal(response.body.user.role, "Super admin");
  assert.equal(response.body.user.isSuperAdmin, true);
  assert.equal(response.body.user.status, "Pending verification");
});

test("POST /admin/users/admins rejects standard admins", async (t) => {
  const { baseUrl, calls } = await startAdminUsersApp(t, {
    authUser: buildAdminUser({ isSuperAdmin: false })
  });
  const response = await requestJson(baseUrl, "/admin/users/admins", {
    method: "POST",
    body: {
      username: "Support Admin",
      email: "support@example.com",
      isSuperAdmin: false
    }
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "Super admin access required");
  assert.equal(calls.inviteAdminUser.length, 0);
});
