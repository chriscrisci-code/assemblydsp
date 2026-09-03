import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

function storePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "assembly-dsp-purchases.jsonl");
  }
  return path.join(process.cwd(), "data", "purchases.jsonl");
}

/**
 * Append a purchase record. Durable enough to confirm webhooks locally;
 * on Vercel /tmp is ephemeral until a real store (DB/email) is added.
 */
export async function recordPurchase(record) {
  const line = JSON.stringify({
    ...record,
    recordedAt: new Date().toISOString(),
  });
  const file = storePath();
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${line}\n`, "utf8");
  console.log("[purchase]", line);
  return file;
}
