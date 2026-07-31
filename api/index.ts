import { createRequire } from "node:module";

// Import the fully pre-built ESM bundle committed to git
const require = createRequire(import.meta.url);

export default async function handler(req: any, res: any) {
  // Load the pre-built Express app bundle
  const { default: app } = await import("../artifacts/api-server/dist/index.mjs" as string);
  return new Promise<void>((resolve) => {
    app(req, res, resolve);
  });
}
