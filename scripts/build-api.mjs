import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

console.log("🚀 Starting Vercel API build process (Pure Node)...");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  console.log("1. Running esbuild for API server...");
  const buildScriptPath = path.resolve(__dirname, "../artifacts/api-server/build.mjs");
  await import(`file://${buildScriptPath}`);
} catch (err) {
  console.error("❌ Failed to build API server:", err);
  process.exit(1);
}

console.log("2. Preparing dist directory for Vercel...");
try {
  fs.mkdirSync("dist", { recursive: true });
  fs.cpSync("artifacts/api-server/dist", "dist", { recursive: true });
  console.log("✅ Vercel API build completed successfully!");
} catch (err) {
  console.error("❌ Error copying dist folder:", err);
  process.exit(1);
}
