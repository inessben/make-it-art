const { expect } = require("@playwright/test");
const { pollMailpitLoginCode } = require("./mailpit");

async function loginWithEmailCode(page, credentials, { expectedPath } = {}) {
  const requestedAt = Date.now();

  await page.goto("/login");
  await page.waitForFunction(
    () => {
      const nuxtRoot = document.querySelector("#__nuxt");
      const emailInput = document.querySelector("#email");

      return Boolean(
        nuxtRoot?.__vue_app__?._instance?.isMounted &&
        emailInput &&
        Object.prototype.hasOwnProperty.call(emailInput, "_value")
      );
    },
    null,
    { timeout: 30_000 }
  );
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/auth/login",
    { timeout: 30_000 }
  );

  await page.locator("button[type='submit']").click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok(), await responseFailureMessage(loginResponse)).toBe(true);

  const codeInput = page.locator("#code");

  await page.waitForFunction(
    () => window.location.pathname !== "/login" || document.querySelector("#code")?.offsetParent,
    null,
    { timeout: 20_000 }
  );

  if (await codeInput.isVisible()) {
    const code = await pollMailpitLoginCode(credentials.email, {
      after: requestedAt
    });

    await codeInput.fill(code);

    const verificationResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/auth/verify-login-code",
      { timeout: 30_000 }
    );

    await page.locator("button[type='submit']").click();
    const verificationResponse = await verificationResponsePromise;
    expect(verificationResponse.ok(), await responseFailureMessage(verificationResponse)).toBe(
      true
    );
  }

  await page.waitForLoadState("networkidle");

  if (expectedPath) {
    await page.waitForURL(
      (currentUrl) => new URL(currentUrl.toString()).pathname === expectedPath,
      { timeout: 15_000 }
    );
    return;
  }

  await expect
    .poll(() => new URL(page.url()).pathname, {
      timeout: 15_000
    })
    .not.toBe("/login");
}

async function responseFailureMessage(response) {
  if (response.ok()) {
    return "";
  }

  const body = await response.text().catch(() => "");
  return `${response.request().method()} ${response.url()} returned ${response.status()}${
    body ? `: ${body}` : ""
  }`;
}

module.exports = {
  loginWithEmailCode
};
