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

const adminUser = {
  id: 1,
  email: "admin@example.com",
  username: "Admin"
};

function authMiddleware(req, _res, next) {
  req.user = adminUser;
  next();
}

function adminMiddleware(_req, _res, next) {
  next();
}

async function startAdminRoutesApp(t, overrides = {}) {
  const calls = {
    markApproved: [],
    markRejected: []
  };

  const applicationRepository = {
    async listSubmittedApplications() {
      return (
        overrides.listSubmittedApplicationsResult || [
          {
            id: 44,
            userId: 7,
            status: "pending",
            payload: {
              displayName: "Ada Art",
              firstName: "Ada",
              lastName: "Lovelace",
              artType: "Digital Art",
              styles: ["Digital painting"],
              addressLine1: "1 rue de Paris",
              city: "Paris",
              postalCode: "75001",
              country: "France"
            },
            user: {
              email: "artist@example.com",
              phone: "0102030405",
              username: "Ada Lovelace",
              artist: null
            },
            contractPdf: Buffer.from("pdf"),
            submittedAt: new Date("2026-07-04T11:00:00.000Z"),
            reviewedAt: null,
            reviewNote: ""
          }
        ]
      );
    },
    async markApproved(payload) {
      calls.markApproved.push(payload);

      return {
        id: payload.applicationId,
        userId: 7,
        status: "approved",
        payload: {
          displayName: "Ada Art",
          firstName: "Ada",
          lastName: "Lovelace",
          artType: "Digital Art",
          styles: ["Digital painting"]
        },
        user: {
          email: "artist@example.com",
          phone: "0102030405",
          username: "Ada Lovelace",
          artist: {
            verified: true
          }
        },
        contractPdf: Buffer.from("pdf"),
        submittedAt: new Date("2026-07-04T11:00:00.000Z"),
        reviewedAt: new Date("2026-07-04T12:00:00.000Z"),
        reviewNote: payload.reviewNote,
        reviewedByAdmin: {
          username: adminUser.username
        }
      };
    },
    async markRejected(payload) {
      calls.markRejected.push(payload);

      return {
        id: payload.applicationId,
        userId: 7,
        status: "rejected",
        payload: {
          displayName: "Ada Art",
          firstName: "Ada",
          lastName: "Lovelace",
          artType: "Digital Art",
          styles: ["Digital painting"]
        },
        user: {
          email: "artist@example.com",
          phone: "0102030405",
          username: "Ada Lovelace",
          artist: null
        },
        contractPdf: Buffer.from("pdf"),
        submittedAt: new Date("2026-07-04T11:00:00.000Z"),
        reviewedAt: new Date("2026-07-04T12:00:00.000Z"),
        reviewNote: payload.reviewNote,
        reviewedByAdmin: {
          username: adminUser.username
        }
      };
    },
    async findById() {
      return overrides.findByIdResult || null;
    }
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: {
      authRequired: authMiddleware
    },
    [adminRequiredPath]: {
      adminRequired: adminMiddleware,
      superAdminRequired: adminMiddleware,
      isAdminUser() {
        return true;
      },
      isSuperAdminUser() {
        return false;
      }
    },
    [applicationRepositoryPath]: applicationRepository,
    [userRepositoryPath]: {
      async listUsersForAdmin() {
        return [];
      }
    },
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
      async inviteAdminUser() {
        return null;
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

async function requestBinary(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    status: response.status,
    headers: response.headers,
    body: buffer
  };
}

test("GET /admin/artist-applications returns the artist application queue", async (t) => {
  const { baseUrl } = await startAdminRoutesApp(t);
  const response = await requestJson(baseUrl, "/admin/artist-applications");

  assert.equal(response.status, 200);
  assert.equal(response.body.summary.totalApplications, 1);
  assert.equal(response.body.applications[0].displayName, "Ada Art");
  assert.equal(response.body.applications[0].status, "pending");
});

test("PATCH /admin/artist-applications/:id approves an application", async (t) => {
  const { baseUrl, calls } = await startAdminRoutesApp(t);
  const response = await requestJson(baseUrl, "/admin/artist-applications/44", {
    method: "PATCH",
    body: {
      status: "approved",
      reviewNote: "Profil valide."
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.application.status, "approved");
  assert.equal(calls.markApproved.length, 1);
  assert.equal(calls.markApproved[0].applicationId, 44);
  assert.equal(calls.markApproved[0].reviewedByAdminId, adminUser.id);
});

test("GET /admin/artist-applications/:id/contract.pdf returns a valid PDF response for Uint8Array data", async (t) => {
  const pdfBytes = new Uint8Array(Buffer.from("%PDF-1.4\nadmin-artist-contract"));
  const { baseUrl } = await startAdminRoutesApp(t, {
    findByIdResult: {
      id: 44,
      userId: 7,
      status: "pending",
      payload: {
        displayName: "Ada Art"
      },
      user: {
        email: "artist@example.com",
        username: "Ada Lovelace"
      },
      contractPdf: pdfBytes
    }
  });

  const response = await requestBinary(baseUrl, "/admin/artist-applications/44/contract.pdf");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.deepEqual(response.body, Buffer.from(pdfBytes));
});
