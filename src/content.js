import { getPath, mergeContent } from "../lib/site-content.js";
import { isAdminEnabled } from "./admin-enabled.js";

const LETTER_CLASSES = ["c-teal", "c-eq", "c-comp", "c-rs", "c-teal"];

export function applySiteContent(content) {
  const data = mergeContent(content);

  if (data.meta?.title) document.title = data.meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && data.meta?.description) desc.setAttribute("content", data.meta.description);

  document.querySelectorAll("[data-content]").forEach((el) => {
    const value = getPath(data, el.dataset.content);
    if (value == null) return;
    el.textContent = String(value);
  });

  document.querySelectorAll("[data-content-alt]").forEach((el) => {
    const value = getPath(data, el.dataset.contentAlt);
    if (value == null) return;
    el.setAttribute("alt", String(value));
  });

  renderProductName(data.hero?.productName || "CHUNK");
  renderVstLine(data.footer?.vst || "");

  const email = data.pricing?.contactEmail || "hello@assemblydsp.com";
  document.querySelectorAll("[data-trial-mail]").forEach((el) => {
    el.setAttribute(
      "href",
      `mailto:${email}?subject=${encodeURIComponent("CHUNK 14-day trial")}`,
    );
  });

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

function renderProductName(name) {
  const mark = document.querySelector(".chunk-mark");
  if (!mark) return;
  mark.setAttribute("aria-label", name);
  mark.replaceChildren();
  [...name].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = LETTER_CLASSES[i % LETTER_CLASSES.length];
    span.textContent = ch;
    mark.appendChild(span);
  });
}

function renderVstLine(text) {
  const host = document.querySelector("[data-vst-line]");
  if (!host) return;

  if (!isAdminEnabled()) {
    host.textContent = text;
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "secret-t";
  button.setAttribute("aria-label", "Admin");
  button.textContent = "T";

  const match = text.match(/VST/i);
  if (!match) {
    host.replaceChildren(document.createTextNode(text), button);
    return;
  }

  const i = match.index;
  host.replaceChildren(
    document.createTextNode(text.slice(0, i + 2)),
    button,
    document.createTextNode(text.slice(i + 3)),
  );
}

export async function loadSiteContent() {
  try {
    const response = await fetch(`/content.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return mergeContent({});
    return mergeContent(await response.json());
  } catch {
    return mergeContent({});
  }
}
