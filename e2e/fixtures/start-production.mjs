import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Match the deployed standalone server, including its separately emitted assets.
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
process.env.PORT = process.argv[2];
process.env.HOSTNAME = "127.0.0.1";
await import(pathToFileURL(resolve(".next/standalone/server.js")).href);
