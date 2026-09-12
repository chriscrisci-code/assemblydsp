const CHUNK_CURRENT_JSON =
  "https://qtfjgaysjfkipfdiaeyc.supabase.co/storage/v1/object/public/plugin-builds/chunk-current.json";

function versionFromFilename(filename) {
  const stem = String(filename || "").replace(/\.(zip|vst3)$/i, "");
  const match = stem.match(/(\d+\.\d+\.\d+(?:[-.][A-Za-z0-9]+)*)$/);
  return match ? match[1] : "";
}

/**
 * Public current CHUNK build for download buttons and the footer.
 * Reads plugin-builds/chunk-current.json directly (no serverless function).
 * @returns {Promise<{ product: string, version: string, filename: string, releasedAt: string | null } | null>}
 */
export async function loadCurrentBuild() {
  try {
    const response = await fetch(CHUNK_CURRENT_JSON, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data !== "object") return null;
    const filename = String(data.filename || "").trim();
    const version =
      String(data.version || "").trim() ||
      versionFromFilename(filename) ||
      versionFromFilename(String(data.url || ""));
    return {
      product: String(data.product || "chunk"),
      version,
      filename,
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
