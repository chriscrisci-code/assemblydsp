import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { adminApiPlugin } from "./vite-admin-plugin.js";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [adminApiPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, "index.html"),
        success: resolve(rootDir, "success.html"),
        admin: resolve(rootDir, "admin.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        bypass(req) {
          if (req.url?.startsWith("/api/admin")) return req.url;
        },
      },
    },
  },
});
