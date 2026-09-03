/**
 * Local API server so Vite can proxy /api/* during development.
 * Production uses Vercel serverless handlers in /api.
 *
 * Usage: node --env-file=.env.local scripts/dev-api.mjs
 */
import { createServer } from "node:http";
import checkout from "../api/checkout.js";
import webhook from "../api/webhook.js";
import { handleAdminRequest } from "../lib/admin.js";

const port = Number(process.env.API_PORT || 8787);

const routes = {
  "/api/checkout": checkout,
  "/api/webhook": webhook,
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);

  if (url.pathname.startsWith("/api/admin")) {
    try {
      const handled = await handleAdminRequest(req, res);
      if (!handled) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Not found." }));
      }
    } catch (err) {
      console.error("[dev-api]", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal error.");
      }
    }
    return;
  }

  const handler = routes[url.pathname];

  if (!handler) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found." }));
    return;
  }

  try {
    await handler(req, res);
  } catch (err) {
    console.error("[dev-api]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal error.");
    }
  }
});

server.listen(port, () => {
  console.log(`Assembly DSP API listening on http://localhost:${port}`);
});
