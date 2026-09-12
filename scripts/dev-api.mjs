/**
 * Local API server so Vite can proxy /api/* during development.
 * Production uses Vercel serverless handlers in /api.
 *
 * Usage: node --env-file=.env.local scripts/dev-api.mjs
 */
import { createServer } from "node:http";
import checkout from "../api/checkout.js";
import webhook from "../api/webhook.js";
import activate from "../api/license/activate.js";
import bySession from "../api/license/by-session.js";
import trial from "../api/license/trial.js";
import recover from "../api/license/recover.js";
import emailStatus from "../api/license/email-status.js";
import download from "../api/download.js";
import { handleAdminRequest } from "../lib/admin.js";

const port = Number(process.env.API_PORT || 8787);

const routes = {
  "/api/checkout": checkout,
  "/api/webhook": webhook,
  "/api/license/activate": activate,
  "/api/license/by-session": bySession,
  "/api/license/trial": trial,
  "/api/license/recover": recover,
  "/api/license/email-status": emailStatus,
  "/api/download": download,
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

  // Strip query for route table (by-session uses query string)
  const pathname = url.pathname;
  const handler = routes[pathname];

  if (!handler) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found." }));
    return;
  }

  try {
    // Preserve full URL with query for by-session
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
