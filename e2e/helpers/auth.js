const { expect } = require("@playwright/test");
const { pollMailpitLoginCode } = require("./mailpit");

async function loginWithEmailCode(page, credentials, { expectedPath } = {}) {
  const requestedAt = Date.now();

  await page.goto("/login");
  await page.waitForFunction(() => Boolean(document.querySelector("#__nuxt")?.__vue_app__), null, {
    timeout: 30_000
  });
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page.locator("button[type='submit']").click();

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
    await page.locator("button[type='submit']").click();
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

module.exports = {
  loginWithEmailCode
};
