/**
 * Dry-run E2E for trial → activate → simulated expiry → (optional) paid session download authz.
 *
 * Usage (from Assembly DSP Website root):
 *   node --env-file=.env.local scripts/e2e-trial-loop.mjs
 *
 * Requires SUPABASE_* + LICENSE_TOKEN_SECRET. CHUNK_BUILD_URL optional (download step soft-skips).
 */
import { createTrialLicense, activateLicense, isLicenseConfigured } from "../lib/license.js";
import {
  authorizeDownload,
  isDownloadConfigured,
  issueDownloadToken,
  verifyDownloadToken,
} from "../lib/download.js";
import { getSupabase } from "../lib/supabase.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("E2E: CHUNK trial / purchase loop (API-level)\n");

  if (!isLicenseConfigured()) {
    console.error("FAIL: Licensing is not configured (SUPABASE_* / LICENSE_TOKEN_SECRET).");
    process.exit(1);
  }

  const email = `e2e-trial-${Date.now()}@example.com`;
  console.log("1) Mint trial…");
  const minted = await createTrialLicense({
    email,
    note: "e2e trial",
    clientKey: `e2e-${Date.now()}`,
  });
  assert(minted.licenseKey?.startsWith("CHUNK-"), "trial key missing");
  const expAt = minted.license.expires_at;
  assert(expAt, "trial expires_at missing");
  console.log("   key:", minted.licenseKey);
  console.log("   expires:", expAt);
  console.log("   source:", minted.license.source);

  console.log("2) Activate on fake machine…");
  const machineId = `e2e-machine-${Date.now()}`;
  const activated = await activateLicense({
    licenseKey: minted.licenseKey,
    machineId,
    machineLabel: "E2E / test",
  });
  assert(activated.token, "token missing");
  assert(activated.licenseType === "trial", "licenseType should be trial");
  assert(Date.parse(activated.expiresAt) > Date.now(), "token should be valid now");
  console.log("   token ok, expiresAt:", activated.expiresAt);

  console.log("3) Simulate expiry…");
  const supabase = getSupabase();
  const past = new Date(Date.now() - 60_000).toISOString();
  // Prefer column update; fall back to note encoding if migration not applied
  let { error: updErr } = await supabase
    .from("licenses")
    .update({ expires_at: past })
    .eq("id", minted.license.id);
  if (updErr) {
    const note = `e2e trial | expires:${past}`;
    const again = await supabase
      .from("licenses")
      .update({ note })
      .eq("id", minted.license.id);
    updErr = again.error;
  }
  assert(!updErr, updErr?.message || "update failed");

  let rejected = false;
  try {
    await activateLicense({
      licenseKey: minted.licenseKey,
      machineId: `${machineId}-b`,
      machineLabel: "E2E expired",
    });
  } catch (err) {
    rejected = /expired/i.test(err.message || "");
    console.log("   activate rejected:", err.message);
  }
  assert(rejected, "expired trial should reject activate");

  console.log("4) Download authz with trial key (should fail after expiry)…");
  if (isDownloadConfigured()) {
    const denied = await authorizeDownload({ licenseKey: minted.licenseKey });
    assert(!denied.ok && denied.status === 403, "expired key must not download");
    console.log("   download correctly denied");

    const token = issueDownloadToken({ reason: "e2e", product: "chunk" });
    assert(verifyDownloadToken(token), "fresh download token should verify");
    console.log("   signed download token ok");
  } else {
    console.log("   SKIP (set CHUNK_BUILD_URL to exercise download)");
  }

  console.log("\nPASS: trial mint → activate → expiry enforcement OK.");
  console.log("Manual remaining: Stripe Checkout → success.html download → plugin Activate paid key.");
  console.log("Plugin local expiry: set expiresAt in %AppData%/Assembly DSP/CHUNK/license.json to the past.");
}

main().catch((err) => {
  console.error("\nFAIL:", err);
  process.exit(1);
});
