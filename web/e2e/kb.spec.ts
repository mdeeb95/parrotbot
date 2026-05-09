import { test, expect } from "@playwright/test";

test("save game change shows Saved indicator", async ({ page }) => {
  await page.goto("/dashboard/kb");
  // Game accordion is closed by default; open it.
  await page.getByRole("button", { name: "Game" }).click();
  const game = page.getByPlaceholder("Path of Exile 2 — Hardcore SSF");
  await game.fill("WoW Classic");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/Saved (just now|\d+s ago)/)).toBeVisible();
});

test("invalid input names the field in the banner", async ({ page }) => {
  await page.goto("/dashboard/kb");
  await page.getByRole("button", { name: "Schedule" }).click();
  await page.getByPlaceholder(/Mon\/Wed\/Fri/).fill("x".repeat(2001));
  await page.getByRole("button", { name: /save changes/i }).click();
  const banner = page.getByRole("alert").first();
  await expect(banner).toContainText("schedule");
});
