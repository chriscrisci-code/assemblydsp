export function adminApiPlugin() {
  return {
    name: "assembly-admin-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0] || "";
        if (!path.startsWith("/api/admin")) {
          next();
          return;
        }
        try {
          const { isAdminEnabled } = await import("./lib/admin-enabled.js");
          if (!isAdminEnabled()) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Not found." }));
            return;
          }
          const { handleAdminRequest } = await import("./lib/admin.js");
          const handled = await handleAdminRequest(req, res);
          if (!handled) next();
        } catch (err) {
          console.error("[admin api]", err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.end("Admin API error.");
          }
        }
      });
    },
  };
}
