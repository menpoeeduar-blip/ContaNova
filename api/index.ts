import type { VercelRequest, VercelResponse } from "@vercel/node";

// Dynamically import the built Express app to avoid bundling issues
async function createApp() {
  const { default: app } = await import("../artifacts/api-server/dist/index.mjs" as any);
  return app;
}

let appHandler: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appHandler) {
    appHandler = await createApp();
  }
  return appHandler(req, res);
}
