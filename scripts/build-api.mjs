import { execSync } from "node:child_process";
import fs from "node:fs";

console.log("🚀 Starting Vercel API build process...");

try {
  console.log("1. Building API server bundle with esbuild...");
  execSync("pnpm --filter @workspace/api-server run build", { stdio: "inherit" });
} catch (err) {
  console.error("❌ Failed to build API server:", err.message);
  process.exit(1);
}

console.log("2. Preparing dist directory for Vercel...");
try {
  fs.mkdirSync("dist", { recursive: true });
  fs.cpSync("artifacts/api-server/dist", "dist", { recursive: true });
  console.log("✅ Vercel API build completed successfully!");
} catch (err) {
  console.error("❌ Error copying dist folder:", err.message);
  process.exit(1);
}
