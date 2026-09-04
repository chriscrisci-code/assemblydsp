import { isAdminEnabled } from "./admin-enabled.js";
import { contentFields, getPath, mergeContent, setPath } from "../lib/site-content.js";

const form = document.getElementById("admin-form");
const statusEl = document.getElementById("admin-status");

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.hidden = !message;
  statusEl.textContent = message || "";
  statusEl.dataset.error = isError ? "1" : "";
}

async function requireSession() {
  const response = await fetch("/api/admin/session", { credentials: "same-origin" });
  if (response.ok) return true;
  window.location.replace("/");
  return false;
}

function buildForm(content) {
  if (!form) return;
  form.replaceChildren();
  let lastSection = "";

  for (const field of contentFields) {
    if (field.section !== lastSection) {
      lastSection = field.section;
      const heading = document.createElement("h2");
      heading.className = "admin-section";
      heading.textContent = field.section;
      form.appendChild(heading);
    }

    const label = document.createElement("label");
    label.className = "admin-label";
    const caption = document.createElement("span");
    caption.textContent = field.label;
    label.appendChild(caption);

    const control =
      field.type === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");
    if (field.type !== "textarea") control.type = "text";
    control.name = field.key;
    control.className = field.type === "textarea" ? "admin-textarea" : "admin-input";
    control.value = String(getPath(content, field.key) ?? "");
    if (field.type === "textarea") control.rows = 4;
    label.appendChild(control);
    form.appendChild(label);
  }
}

function readForm() {
  const content = mergeContent({});
  if (!form) return content;
  const fields = form.querySelectorAll("input[name], textarea[name]");
  fields.forEach((el) => {
    setPath(content, el.name, el.value);
  });
  return content;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Saving…");
  try {
    const response = await fetch("/api/admin/content", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: readForm() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Save failed.");
    }
    setStatus("Saved. Open the site to see it.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Save failed.", true);
  }
});

const grantForm = document.getElementById("grant-form");
const grantStatus = document.getElementById("grant-status");
const grantResult = document.getElementById("grant-result");
const grantKey = document.getElementById("grant-key");
const grantCopy = document.getElementById("grant-copy");

function setGrantStatus(message, isError = false) {
  if (!grantStatus) return;
  grantStatus.hidden = !message;
  grantStatus.textContent = message || "";
  grantStatus.dataset.error = isError ? "1" : "";
}

grantForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setGrantStatus("Granting…");
  if (grantResult) grantResult.hidden = true;
  const fd = new FormData(grantForm);
  try {
    const response = await fetch("/api/admin/license/grant", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        note: fd.get("note"),
        maxActivations: Number(fd.get("maxActivations") || 2),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.licenseKey) {
      throw new Error(data.error || "Grant failed.");
    }
    setGrantStatus(`Granted for ${data.email}. Copy the key below.`);
    if (grantKey) grantKey.textContent = data.licenseKey;
    if (grantResult) grantResult.hidden = false;
    if (grantCopy) {
      grantCopy.textContent = "Copy key";
      grantCopy.onclick = async () => {
        await navigator.clipboard.writeText(data.licenseKey);
        grantCopy.textContent = "Copied";
      };
    }
  } catch (err) {
    setGrantStatus(err instanceof Error ? err.message : "Grant failed.", true);
  }
});

async function bootAdmin() {
  if (!isAdminEnabled()) {
    window.location.replace("/");
    return;
  }
  const ok = await requireSession();
  if (!ok) return;
  try {
    const response = await fetch("/api/admin/content", { credentials: "same-origin" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load content.");
    buildForm(mergeContent(data.content));
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Could not load content.", true);
  }
}

bootAdmin();
