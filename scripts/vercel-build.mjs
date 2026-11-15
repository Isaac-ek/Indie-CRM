import { spawnSync } from "node:child_process";

function run(script) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit" });
  if (result.error) {
    console.error(`Could not run ${script}: ${result.error.message}`);
  }
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

if (process.env.VERCEL_ENV === "production") {
  if (process.env.PUBLIC_DEMO_ENABLED === "true" && (!process.env.DATABASE_URL || !process.env.AUTH_SECRET)) {
    console.error("The public demo requires DATABASE_URL and AUTH_SECRET in production.");
    process.exit(1);
  }
  if (process.env.DATABASE_URL) {
    // migrate deploy respects the recorded baseline and stops on failed migrations.
    // Never reset, seed, or db push the production database during a release.
    console.log("Applying production database migrations before building Indie CRM.");
    run("db:deploy");
  } else {
    console.log("No production database configured; building the static preview mode.");
  }
}

run("build");
