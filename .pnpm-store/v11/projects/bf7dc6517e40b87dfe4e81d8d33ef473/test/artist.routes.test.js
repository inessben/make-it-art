const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");
const { loadModuleWithMocks } = require("./helpers/mock-require");

const routesPath = require.resolve("../src/routes/artist.routes");
const authRequiredPath =
  require.resolve("../src/middlewares/auth-required.middleware");
const applicationRepositoryPath =
  require.resolve("../src/repositories/artist-application-draft.repository");
const artistRepositoryPath =
  require.resolve("../src/repositories/artist.repository");
const userRepositoryPath =
  require.resolve("../src/repositories/user.repository");
const contractServicePath =
  require.resolve("../src/services/artist-contract.service");
const serializeAuthUserPath =
  require.resolve("../src/utils/serialize-auth-user");

const authUser = {
  id: 7,
  email: "artist@example.com",
  username: "Ada Lovelace",
  phone: "0102030405",
};

function buildAuthMiddleware(authUser) {
  return {
    authRequired(req, _res, next) {
      req.user = authUser;
      next();
    },
  };
}

async function startArtistRoutesApp(t, overrides = {}) {
  const currentAuthUser = overrides.authUser || authUser;
  const calls = {
    submitApplication: [],
  };

  const applicationRepository = {
    async findByUserId() {
      return overrides.findByUserIdResult || null;
    },
    async saveDraft({ userId, currentStep, payload }) {
      return {
        id: 10,
        userId,
        status: "draft",
        currentStep,
        payload,
        createdAt: new Date("2026-07-04T10:00:00.000Z"),
        updatedAt: new Date("2026-07-04T10:00:00.000Z"),
      };
    },
    async submitApplication(payload) {
      calls.submitApplication.push(payload);

      return (
        overrides.submitApplicationResult || {
          id: 10,
          userId: currentAuthUser.id,
          status: "pending",
          currentStep: 4,
          payload: payload.payload,
          submittedAt: new Date("2026-07-04T12:00:00.000Z"),
          contractVersion: payload.contractVersion,
          contractPdf: Buffer.from("pdf"),
        }
      );
    },
    async updateStoredContract(payload) {
      calls.updateStoredContract = payload;

      return {
        id: payload.applicationId,
        userId: currentAuthUser.id,
        status: "pending",
        currentStep: 4,
        payload: overrides.findByUserIdResult?.payload || {},
        contractVersion: payload.contractVersion,
        contractPdf: payload.contractPdf,
      };
    },
  };

  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware(currentAuthUser),
    [applicationRepositoryPath]: applicationRepository,
    [artistRepositoryPath]: {
      async findByUserId() {
        return overrides.artistResult || null;
      },
    },
    [userRepositoryPath]: {
      async findById() {
        return (
          overrides.updatedUserResult || {
            ...currentAuthUser,
            artist: null,
            artistApplicationDraft: {
              id: 10,
              status: "pending",
              currentStep: 4,
              submittedAt: new Date("2026-07-04T12:00:00.000Z"),
            },
          }
        );
      },
    },
    [contractServicePath]: {
      CONTRACT_VERSION: "make-it-art-artist-contract-v2",
      extractArtistApplicationPayload(application) {
        return application?.payload || {};
      },
      resolveContractSignedAt(application) {
        return (
          application?.contractSignedAt ||
          application?.contractAcceptedAt ||
          application?.submittedAt ||
          new Date("2026-07-04T12:34:00.000Z")
        );
      },
      renderArtistContract() {
        return {
          contractText: "CONTRAT TEST",
          contractVersion: "make-it-art-artist-contract-v2",
        };
      },
      async generateArtistContractPdf() {
        return {
          contractVersion: "make-it-art-artist-contract-v2",
          contractText: "CONTRAT TEST",
          pdfBuffer: Buffer.from("pdf"),
          signedAt: new Date("2026-07-04T12:34:00.000Z"),
        };
      },
    },
    [serializeAuthUserPath]: {
      serializeAuthUser(user) {
        return {
          id: user.id,
          email: user.email,
          artistApplication: user.artistApplicationDraft
            ? {
                id: user.artistApplicationDraft.id,
                status: user.artistApplicationDraft.status,
              }
            : null,
        };
      },
    },
  });

  const app = express();
  app.use(express.json({ limit: "2mb" }));
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
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

async function requestJson(baseUrl, path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();

  return {
    status: response.status,
    body: payload,
  };
}

async function requestBinary(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    status: response.status,
    headers: response.headers,
    body: buffer,
  };
}

test("POST /artists/me/contract-preview validates required legal fields", async (t) => {
  const { baseUrl } = await startArtistRoutesApp(t);
  const response = await requestJson(baseUrl, "/artists/me/contract-preview", {
    method: "POST",
    body: {
      displayName: "Ada Art",
    },
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Le prenom et le nom legal sont requis.");
});

test("POST /artists/me submits a pending artist application with a signed contract", async (t) => {
  const { baseUrl, calls } = await startArtistRoutesApp(t);
  const response = await requestJson(baseUrl, "/artists/me", {
    method: "POST",
    body: {
      displayName: "Ada Art",
      firstName: "Ada",
      lastName: "Lovelace",
      bio: "Digital artist",
      artType: "Digital Art",
      styles: ["Digital painting"],
      portfolioUrl: "https://portfolio.example",
      socialHandle: "@ada",
      addressLine1: "1 rue de Paris",
      city: "Paris",
      postalCode: "75001",
      country: "France",
      taxId: "FR123",
      termsAccepted: true,
      commissionAccepted: true,
      contractAccepted: true,
      signatureDataUrl: "data:image/png;base64,QUJD",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.application.status, "pending");
  assert.equal(response.body.user.artistApplication.status, "pending");
  assert.equal(calls.submitApplication.length, 1);
  assert.equal(calls.submitApplication[0].currentStep, 4);
  assert.equal(
    calls.submitApplication[0].contractVersion,
    "make-it-art-artist-contract-v2",
  );
  assert.equal(
    calls.submitApplication[0].submittedAt.toISOString(),
    "2026-07-04T12:34:00.000Z",
  );
  assert.ok(Buffer.isBuffer(calls.submitApplication[0].contractPdf));
});

test("GET /artists/me returns both artist profile and application state", async (t) => {
  const { baseUrl } = await startArtistRoutesApp(t, {
    artistResult: {
      id: 3,
      userId: authUser.id,
      displayName: "Ada Art",
      verified: true,
      createdAt: new Date("2026-07-04T12:00:00.000Z"),
      user: {
        email: authUser.email,
        username: authUser.username,
        bio: "Digital artist",
      },
      _count: {
        artworks: 0,
        followers: 0,
        collections: 0,
      },
    },
    findByUserIdResult: {
      id: 10,
      userId: authUser.id,
      status: "approved",
      currentStep: 4,
      payload: {
        displayName: "Ada Art",
      },
    },
  });

  const response = await requestJson(baseUrl, "/artists/me");

  assert.equal(response.status, 200);
  assert.equal(response.body.artist.displayName, "Ada Art");
  assert.equal(response.body.application.status, "approved");
});

test("artist application routes reject admin accounts", async (t) => {
  const { baseUrl } = await startArtistRoutesApp(t, {
    authUser: {
      id: 1,
      email: "admin@example.com",
      username: "Admin",
      role: "admin",
    },
  });

  const response = await requestJson(baseUrl, "/artists/me");

  assert.equal(response.status, 403);
  assert.equal(
    response.body.message,
    "Admin accounts cannot access artist application routes",
  );
});

test("artist router does not intercept unrelated admin routes", async (t) => {
  const { moduleExports: router, restore } = loadModuleWithMocks(routesPath, {
    [authRequiredPath]: buildAuthMiddleware({
      id: 1,
      email: "admin@example.com",
      username: "Admin",
      role: "admin",
    }),
    [applicationRepositoryPath]: {
      async findByUserId() {
        return null;
      },
    },
    [artistRepositoryPath]: {
      async findByUserId() {
        return null;
      },
    },
    [userRepositoryPath]: {
      async findById() {
        return null;
      },
    },
    [contractServicePath]: {
      renderArtistContract() {
        return {
          contractText: "CONTRAT TEST",
          contractVersion: "make-it-art-artist-contract-v1",
        };
      },
      async generateArtistContractPdf() {
        return {
          contractVersion: "make-it-art-artist-contract-v1",
          contractText: "CONTRAT TEST",
          pdfBuffer: Buffer.from("pdf"),
          signedAt: new Date("2026-07-04T12:34:00.000Z"),
        };
      },
    },
    [serializeAuthUserPath]: {
      serializeAuthUser(user) {
        return user;
      },
    },
  });

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(router);
  app.get("/admin/dashboard", (_req, res) => {
    res.status(200).json({
      ok: true,
    });
  });

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

  const response = await requestJson(
    `http://127.0.0.1:${server.address().port}`,
    "/admin/dashboard",
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test("GET /artists/me/contract.pdf returns a valid PDF response for Uint8Array data", async (t) => {
  const pdfBytes = new Uint8Array(Buffer.from("%PDF-1.4\nartist-contract"));
  const { baseUrl } = await startArtistRoutesApp(t, {
    findByUserIdResult: {
      id: 10,
      userId: authUser.id,
      status: "pending",
      currentStep: 4,
      payload: {
        displayName: "Ada Art",
        firstName: "Ada",
        lastName: "Lovelace",
      },
      contractPdf: pdfBytes,
    },
  });

  const response = await requestBinary(baseUrl, "/artists/me/contract.pdf");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.deepEqual(response.body, Buffer.from(pdfBytes));
});

test("GET /artists/me/contract.pdf supports forced download mode", async (t) => {
  const pdfBytes = new Uint8Array(
    Buffer.from("%PDF-1.4\nartist-contract-download"),
  );
  const { baseUrl } = await startArtistRoutesApp(t, {
    findByUserIdResult: {
      id: 11,
      userId: authUser.id,
      status: "approved",
      currentStep: 4,
      payload: {
        displayName: "Ada Art",
        firstName: "Ada",
        lastName: "Lovelace",
      },
      contractVersion: "make-it-art-artist-contract-v2",
      contractPdf: pdfBytes,
      user: authUser,
    },
  });

  const response = await requestBinary(
    baseUrl,
    "/artists/me/contract.pdf?download=1",
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /^attachment;/);
  assert.deepEqual(response.body, Buffer.from(pdfBytes));
});

test("GET /artists/me/contract.pdf regenerates legacy contracts with the stored signature timestamp", async (t) => {
  const { baseUrl, calls } = await startArtistRoutesApp(t, {
    findByUserIdResult: {
      id: 10,
      userId: authUser.id,
      status: "pending",
      currentStep: 4,
      payload: {
        displayName: "Ada Art",
        firstName: "Ada",
        lastName: "Lovelace",
      },
      contractVersion: "make-it-art-artist-contract-v1",
      contractPdf: Buffer.from("legacy-pdf"),
      signatureDataUrl: "data:image/png;base64,QUJD",
      contractSignedAt: new Date("2026-07-04T12:34:00.000Z"),
      contractAcceptedAt: new Date("2026-07-04T12:34:00.000Z"),
      user: authUser,
    },
  });

  const response = await requestBinary(baseUrl, "/artists/me/contract.pdf");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, Buffer.from("pdf"));
  assert.equal(calls.updateStoredContract.applicationId, 10);
  assert.equal(
    calls.updateStoredContract.contractVersion,
    "make-it-art-artist-contract-v2",
  );
  assert.equal(
    calls.updateStoredContract.contractSignedAt.toISOString(),
    "2026-07-04T12:34:00.000Z",
  );
});
