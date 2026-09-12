/**
 * Public current CHUNK build for download buttons and the footer.
 * @returns {Promise<{ product: string, version: string, filename: string, releasedAt: string | null } | null>}
 */
export async function loadCurrentBuild() {
  try {
    const response = await fetch("/api/build", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data !== "object") return null;
    return {
      product: String(data.product || "chunk"),
      version: String(data.version || "").trim(),
      filename: String(data.filename || "").trim(),
      releasedAt: data.releasedAt ? String(data.releasedAt) : null,
    };
  } catch {
    return null;
  }
}

export function formatChunkVersion(build) {
  const version = build?.version;
  return version ? `v${version}` : "";
}

export function applyDownloadButton(button, hint, build) {
  if (!button) return;
  const version = formatChunkVersion(build);
  button.textContent = version ? `Download CHUNK ${version}` : "Download CHUNK";
  if (hint) {
    const bits = ["Windows VST3"];
    if (build?.filename) bits.push(build.filename);
    else if (version) bits.push(version);
    hint.textContent = bits.join(" · ");
    hint.hidden = false;
  }
}

export function applyFooterBuild(el, build) {
  if (!el) return;
  const version = formatChunkVersion(build);
  if (!version) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = `CHUNK ${version} · Windows VST3`;
}
