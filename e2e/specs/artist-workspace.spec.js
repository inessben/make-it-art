const { test, expect } = require("@playwright/test");
const { readE2eFixture } = require("../helpers/fixture");
const { loginWithEmailCode } = require("../helpers/auth");

test("an artist can authenticate and access the workspace dashboard", async ({ page }) => {
  const fixture = readE2eFixture();

  await loginWithEmailCode(page, fixture.artist);
  await page.goto(fixture.routes.artistDashboard);

  await expect(page.getByRole("heading", { name: /Artist dashboard/i })).toBeVisible();
  await expect(page.getByText("Sales momentum")).toBeVisible();
  await expect(page.getByText("Catalogue performance")).toBeVisible();
});
