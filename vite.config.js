import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Ensure ENABLE_*/ADMIN_* from .env.local are on process.env for the dev server.
  const env = loadEnv(mode, rootDir, "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    root: ".",
    publicDir: "public",
    envPrefix: ["VITE_", "ENABLE_"],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(rootDir, "index.html"),
          success: resolve(rootDir, "success.html"),
          trialSuccess: resolve(rootDir, "trial-success.html"),
          support: resolve(rootDir, "support.html"),
          admin: resolve(rootDir, "admin.html"),
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        // All /api/* (including admin) → scripts/dev-api.mjs which loads .env.local
        "/api": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
      },
    },
  };
});
