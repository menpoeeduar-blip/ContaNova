import { execSync } from "node:child_process";
import fs from "node:fs";

console.log("🚀 Starting Vercel API build process...");

try {
  console.log("1. Building database workspace...");
  execSync("pnpm --filter @workspace/db run build", { stdio: "inherit" });
} catch (err) {
  console.log("Note on db build step:", err.message);
}

console.log("2. Building API server...");
execSync("pnpm --filter @workspace/api-server run build", { stdio: "inherit" });

console.log("3. Preparing dist directory for Vercel...");
fs.mkdirSync("dist", { recursive: true });
fs.cpSync("artifacts/api-server/dist", "dist", { recursive: true });

console.log("✅ Vercel API build completed successfully!");
