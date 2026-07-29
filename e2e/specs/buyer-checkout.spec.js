const { test, expect } = require("@playwright/test");
const { readE2eFixture } = require("../helpers/fixture");
const { loginWithEmailCode } = require("../helpers/auth");

test("a collector can sign in, open the seeded cart and continue to checkout", async ({ page }) => {
  const fixture = readE2eFixture();

  await loginWithEmailCode(page, fixture.buyer);
  await page.goto(fixture.cart.path);

  await expect(page.getByRole("heading", { name: /Shopping Basket/i })).toBeVisible();
  await expect(page.getByText(fixture.artwork.title, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Proceed to checkout/i }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: /Finalize Your Order/i })).toBeVisible();
});
