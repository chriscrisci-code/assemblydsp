import { handleAdminRequest } from "../../lib/admin.js";

export default async function handler(req, res) {
  const handled = await handleAdminRequest(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found." }));
  }
}
