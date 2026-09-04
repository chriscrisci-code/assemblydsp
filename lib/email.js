/**
 * Outbound transactional email via Resend.
 * ImprovMX handles inbound/forwarding; this module is send-only.
 */

/** Bare address avoids Vercel env UIs stripping `<...>` from Name <email> values. */
const DEFAULT_FROM = "support@assemblydsp.com";

/**
 * @returns {boolean}
 */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && emailFromAddress());
}

/** Resolved From header; falls back if EMAIL_FROM is missing or invalid. */
export function emailFromAddress() {
  const raw = String(process.env.EMAIL_FROM || "").trim();
  if (raw.includes("@")) return raw;
  return DEFAULT_FROM;
}

export function siteBaseUrl() {
  const explicit = process.env.PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://www.assemblydsp.com";
}

/**
 * @param {{ to: string, subject: string, html: string, text: string }} options
 */
export async function sendEmail(options) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = emailFromAddress();

  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      error: "Email not configured (RESEND_API_KEY).",
    };
  }
  if (!from || !from.includes("@")) {
    return {
      ok: false,
      skipped: true,
      error: "Email not configured (EMAIL_FROM).",
    };
  }

  const to = String(options.to || "").trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "Invalid recipient email." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        data.message ||
        data.error ||
        (typeof data === "string" ? data : null) ||
        `Email failed (${response.status}).`;
      console.error("[email] resend", response.status, detail, data);
      return {
        ok: false,
        error: detail,
        status: response.status,
      };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    console.error("[email] resend exception", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email failed.",
    };
  }
}

/**
 * @param {{
 *   to: string,
 *   licenseKey: string,
 *   licenseType?: 'trial' | 'paid' | string,
 *   expiresAt?: string | null,
 *   trialDays?: number,
 * }} opts
 */
export async function sendLicenseKeyEmail(opts) {
  const to = String(opts.to || "").trim().toLowerCase();
  const key = String(opts.licenseKey || "").trim();
  if (!to || !key) {
    return { ok: false, error: "Missing email or license key." };
  }

  const isTrial = opts.licenseType === "trial";
  const base = siteBaseUrl();
  const downloadPath = `/api/download?license_key=${encodeURIComponent(key)}`;
  const downloadUrl = `${base}${downloadPath}`;
  const supportUrl = `${base}/support.html`;

  let expiryLine = "";
  if (isTrial) {
    const days = opts.trialDays || 14;
    if (opts.expiresAt) {
      const when = new Date(opts.expiresAt).toUTCString();
      expiryLine = `This trial expires on ${when} (${days}-day trial).`;
    } else {
      expiryLine = `This is a ${days}-day trial license.`;
    }
  } else {
    expiryLine = "This is a full CHUNK license (up to 2 machines).";
  }

  const subject = isTrial
    ? "Your CHUNK trial license key"
    : "Your CHUNK license key";

  const text = [
    isTrial ? "Thanks for trying CHUNK." : "Thanks for buying CHUNK.",
    "",
    `Your license key:`,
    key,
    "",
    expiryLine,
    "",
    "Download:",
    downloadUrl,
    "",
    "In CHUNK: License → paste this key → Activate.",
    "",
    `Questions? Reply to this email or visit ${supportUrl}`,
    "",
    "— Assembly DSP",
  ].join("\n");

  const html = `
    <p>${isTrial ? "Thanks for trying <strong>CHUNK</strong>." : "Thanks for buying <strong>CHUNK</strong>."}</p>
    <p>Your license key:</p>
    <p style="font-family:ui-monospace,monospace;font-size:16px;letter-spacing:0.04em"><strong>${escapeHtml(key)}</strong></p>
    <p>${escapeHtml(expiryLine)}</p>
    <p><a href="${escapeHtml(downloadUrl)}">Download CHUNK</a></p>
    <p>In CHUNK: <strong>License</strong> → paste this key → <strong>Activate</strong>.</p>
    <p>Questions? Reply to this email or visit <a href="${escapeHtml(supportUrl)}">assemblydsp.com</a>.</p>
    <p>— Assembly DSP</p>
  `.trim();

  return sendEmail({ to, subject, html, text });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
