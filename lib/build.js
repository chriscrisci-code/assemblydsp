/**
 * Current CHUNK build. Source of truth:
 * 1. Optional env overrides (CHUNK_VERSION, CHUNK_BUILD_URL)
 * 2. Public manifest JSON in Supabase Storage (chunk-current.json)
 * 3. Version parsed from the zip URL (CHUNK-0.9.46.zip)
 */

const DEFAULT_CHUNK_BUILD_URL =
  "https://qtfjgaysjfkipfdiaeyc.supabase.co/storage/v1/object/public/plugin-builds/CHUNK-0.9.46.zip";

const DEFAULT_CHUNK_MANIFEST_URL =
  "https://qtfjgaysjfkipfdiaeyc.supabase.co/storage/v1/object/public/plugin-builds/chunk-current.json";

const CACHE_MS = 60 * 1000;

/** @type {{ at: number, build: CurrentBuild } | null} */
let cache = null;

/**
 * @typedef {{
 *   product: string,
 *   version: string,
 *   filename: string,
 *   url: string,
 *   releasedAt: string | null,
 * }} CurrentBuild
 */

/** Explicit env pin. Empty means follow the public manifest. */
export function envBuildUrl() {
  return String(process.env.CHUNK_BUILD_URL || "").trim();
}

export function configuredBuildUrl() {
  return envBuildUrl() || DEFAULT_CHUNK_BUILD_URL;
}

export function configuredManifestUrl() {
  return String(process.env.CHUNK_BUILD_MANIFEST_URL || DEFAULT_CHUNK_MANIFEST_URL).trim();
}

export function parseBuildMeta(url) {
  const filename = filenameFromUrl(url);
  return {
    filename,
    version: versionFromFilename(filename),
  };
}

export function filenameFromUrl(url) {
  try {
    const path = new URL(url).pathname;
    const name = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
    return name || "CHUNK.zip";
  } catch {
    const name = String(url || "").split("/").filter(Boolean).pop() || "";
    return name || "CHUNK.zip";
  }
}

export function versionFromFilename(filename) {
  const stem = String(filename || "").replace(/\.(zip|vst3)$/i, "");
  const match = stem.match(/(\d+\.\d+\.\d+(?:[-.][A-Za-z0-9]+)*)$/);
  return match ? match[1] : "";
}

/**
 * @returns {Promise<CurrentBuild>}
 */
export async function getCurrentBuild() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.build;

  const envUrl = envBuildUrl();
  /** @type {Partial<CurrentBuild>} */
  let manifest = {};

  const manifestUrl = configuredManifestUrl();
  if (manifestUrl) {
    try {
      const response = await fetch(manifestUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === "object") {
          manifest = {
            product: data.product ? String(data.product) : undefined,
            version: data.version ? String(data.version).trim() : undefined,
            filename: data.filename ? String(data.filename).trim() : undefined,
            url: data.url ? String(data.url).trim() : undefined,
            releasedAt: data.releasedAt ? String(data.releasedAt) : undefined,
          };
        }
      }
    } catch {
      /* keep fallback */
    }
  }

  const envVersion = String(process.env.CHUNK_VERSION || "").trim();
  const url = envUrl || manifest.url || DEFAULT_CHUNK_BUILD_URL;
  const fromUrl = parseBuildMeta(url);
  const version =
    envVersion ||
    (envUrl ? fromUrl.version : "") ||
    manifest.version ||
    fromUrl.version ||
    "";
  const filename =
    (envUrl ? fromUrl.filename : manifest.filename || fromUrl.filename) ||
    `CHUNK-${version || "latest"}.zip`;

  const build = {
    product: manifest.product || "chunk",
    version,
    filename,
    url,
    releasedAt: manifest.releasedAt || null,
  };

  cache = { at: now, build };
  return build;
}

export function publicBuildInfo(build) {
  return {
    product: build.product || "chunk",
    version: build.version || "",
    filename: build.filename || "",
    releasedAt: build.releasedAt || null,
  };
}
