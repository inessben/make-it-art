const { test, expect } = require("@playwright/test");
const { readE2eFixture } = require("../helpers/fixture");

test("guest visitors can browse the homepage and the seeded public artwork", async ({ page }) => {
  const fixture = readE2eFixture();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Featured artworks/i })).toBeVisible();

  await page.goto(fixture.routes.artwork);
  await expect(page.getByRole("heading", { name: fixture.artwork.title })).toBeVisible();
  await expect(page.getByText(fixture.artist.displayName, { exact: true })).toBeVisible();
});
