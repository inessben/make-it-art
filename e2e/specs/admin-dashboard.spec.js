const { test, expect } = require("@playwright/test");
const { readE2eFixture } = require("../helpers/fixture");
const { loginWithEmailCode } = require("../helpers/auth");

test("an admin can authenticate and load the operational dashboard", async ({ page }) => {
  const fixture = readE2eFixture();

  await loginWithEmailCode(page, fixture.admin);
  await page.goto("/admin");

  await expect(page.getByText("Moderation queue")).toBeVisible();
  await expect(page.getByText("User management")).toBeVisible();
  await expect(page.getByPlaceholder("Search users...")).toBeVisible();
});
