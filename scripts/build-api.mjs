import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("🚀 Starting Vercel API build process...");

try {
  console.log("1. Compiling workspace TypeScript packages...");
  execSync("npx tsc --build tsconfig.json", { stdio: "inherit" });
} catch (err) {
  console.log("Note on tsc build step:", err.message);
}

try {
  console.log("2. Building API server bundle with esbuild...");
  execSync("pnpm --filter @workspace/api-server run build", { stdio: "inherit" });
} catch (err) {
  console.error("❌ Failed to build API server:", err.message);
  process.exit(1);
}

console.log("3. Preparing dist directory for Vercel...");
fs.mkdirSync("dist", { recursive: true });
fs.cpSync("artifacts/api-server/dist", "dist", { recursive: true });

console.log("✅ Vercel API build completed successfully!");
