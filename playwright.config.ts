import { defineConfig, devices } from "@playwright/test";
import { workflowDatabaseUrl } from "./e2e/fixtures/workflow-database";

const databaseUrl = workflowDatabaseUrl();
const port = Number(process.env.E2E_PORT ?? 3180);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid E2E_PORT.");
// Next normalizes loopback redirect hosts to localhost; use one cookie origin.
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["workflow-proof.spec.ts", "public-demo.spec.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "test-results/workflow",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    channel: process.env.E2E_BROWSER_CHANNEL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: `npm run build && node e2e/fixtures/start-production.mjs ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: "local-workflow-tests-only-not-a-production-secret",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      PUBLIC_DEMO_ENABLED: "true",
      OPENAI_API_KEY: "",
      REDIS_URL: "",
      LOG_LEVEL: "warn",
      NEXT_TELEMETRY_DISABLED: "1",
      // Prisma's test-runner loader must not replace Next.js's own module/stack handling.
      NODE_OPTIONS: "",
    },
  },
});
