import { test as setup } from "@playwright/test";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8180";

setup("authenticate via Keycloak", async ({ page }) => {
  // Navigate to the app — Keycloak will redirect to its login page
  await page.goto("/");

  // Wait for the Keycloak login form
  await page.waitForURL(`${KEYCLOAK_URL}/**`, { timeout: 15_000 });

  // Fill in credentials and submit
  await page.getByLabel("Username or email").fill("ops");
  await page.getByLabel("Password").fill("test");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for redirect back to the app
  await page.waitForURL("http://localhost:3000/**", { timeout: 15_000 });

  // Save signed-in state
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
