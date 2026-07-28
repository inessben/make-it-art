import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const authMiddleware = new URL("../middleware/auth.js", import.meta.url);
const guestMiddleware = new URL("../middleware/guest.js", import.meta.url);
const loginPage = new URL("../pages/login.vue", import.meta.url);

test("protected pages send guests to login with their requested destination", async () => {
  const source = await readFile(authMiddleware, "utf8");

  assert.match(source, /buildLoginLocation\(to\.fullPath\)/);
});

test("the requested destination survives every supported sign-in step", async () => {
  const [guestSource, loginSource] = await Promise.all([
    readFile(guestMiddleware, "utf8"),
    readFile(loginPage, "utf8")
  ]);

  assert.match(guestSource, /resolvePostAuthDestination\(\s*to\.query\.redirect/);
  assert.match(
    loginSource,
    /getGoogleLoginUrl\(window\.location\.origin, requestedRedirect\.value\)/
  );
  assert.equal(
    loginSource.match(/redirectTo = authenticatedDestination\(response\.redirectTo\);/g)?.length,
    3
  );
});
