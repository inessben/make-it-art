import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const authMiddleware = new URL("../middleware/auth.js", import.meta.url);
const guestMiddleware = new URL("../middleware/guest.js", import.meta.url);
const loginPage = new URL("../pages/login.vue", import.meta.url);
const registerPage = new URL("../pages/register.vue", import.meta.url);
const verifyEmailPage = new URL("../pages/verify-email.vue", import.meta.url);

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

test("artist onboarding survives registration and email verification only when requested", async () => {
  const [loginSource, registerSource, verifyEmailSource] = await Promise.all([
    readFile(loginPage, "utf8"),
    readFile(registerPage, "utf8"),
    readFile(verifyEmailPage, "utf8")
  ]);

  assert.match(loginSource, /<NuxtLink :to="registerLocation">Create one<\/NuxtLink>/);
  assert.match(registerSource, /redirect: requestedRedirect\.value/);
  assert.match(registerSource, /buildLoginLocation\(requestedRedirect\.value\)/);
  assert.match(verifyEmailSource, /buildLoginLocation\(route\.query\.redirect\)/);
});
