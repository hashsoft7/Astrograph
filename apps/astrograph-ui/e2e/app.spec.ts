import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplePath = path.resolve(
  __dirname,
  "../../examples/sample-output.json"
);

test("loads analysis file and shows stats", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Astrograph/i)).toBeVisible();

  const input = page.locator('input[type="file"]');
  await input.setInputFiles(samplePath);

  const meta = page.locator(".header-meta");
  await expect(meta).toContainText("2 files");
  await expect(meta).toContainText("2 symbols");
  await expect(meta).toContainText("1 calls");
});
