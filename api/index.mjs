// Vercel serverless — imports the pre-built bundle (all workspace deps already inlined by esbuild)
import app from "../artifacts/api-server/dist/index.mjs";

export default app;
