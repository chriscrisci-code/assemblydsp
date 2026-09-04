import { isAdminEnabled } from "./admin-enabled.js";
import { applySiteContent, loadSiteContent } from "./content.js";

loadSiteContent().then((content) => applySiteContent(content));

const header = document.querySelector(".site-header");
const onScroll = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/** Start Stripe Checkout for CHUNK ($39 one-time). */
async function startChunkCheckout(trigger) {
  const status = document.getElementById("checkout-status");
  const buttons = document.querySelectorAll(".js-buy-chunk");

  const setBusy = (busy) => {
    buttons.forEach((btn) => {
      btn.disabled = busy;
      if (btn.classList.contains("btn")) {
        btn.dataset.label ??= btn.textContent || "";
        btn.textContent = busy ? "Starting checkout…" : btn.dataset.label;
      }
    });
    if (status) {
      status.hidden = !busy && !status.dataset.error;
    }
  };

  setBusy(true);
  if (status) {
    status.hidden = false;
    status.dataset.error = "";
    status.textContent = "Opening Stripe Checkout…";
  }

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      throw new Error(data.error || "Checkout could not be started.");
    }
    window.location.assign(data.url);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Checkout could not be started.";
    if (status) {
      status.dataset.error = "1";
      status.hidden = false;
      status.textContent = message;
    } else {
      window.alert(message);
    }
    setBusy(false);
    trigger?.focus?.();
  }
}

document.querySelectorAll(".js-buy-chunk").forEach((btn) => {
  btn.addEventListener("click", () => startChunkCheckout(btn));
});

/** Mint a 14-day trial license and open the success page (key + download). */
async function startChunkTrial(trigger) {
  const status = document.getElementById("checkout-status");
  const buttons = document.querySelectorAll(".js-start-trial");

  const setBusy = (busy) => {
    buttons.forEach((btn) => {
      btn.disabled = busy;
      btn.dataset.label ??= btn.textContent || "";
      btn.textContent = busy ? "Starting trial…" : btn.dataset.label;
    });
  };

  setBusy(true);
  if (status) {
    status.hidden = false;
    status.dataset.error = "";
    status.textContent = "Creating your trial license…";
  }

  try {
    const response = await fetch("/api/license/trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.licenseKey) {
      throw new Error(data.error || "Trial could not be started.");
    }
    sessionStorage.setItem(
      "assemblydsp_trial",
      JSON.stringify({
        licenseKey: data.licenseKey,
        expiresAt: data.expiresAt,
        product: data.product,
      }),
    );
    window.location.assign("/trial-success.html");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Trial could not be started.";
    if (status) {
      status.dataset.error = "1";
      status.hidden = false;
      status.textContent = message;
    } else {
      window.alert(message);
    }
    setBusy(false);
    trigger?.focus?.();
  }
}

document.querySelectorAll(".js-start-trial").forEach((btn) => {
  btn.addEventListener("click", () => startChunkTrial(btn));
});

if (isAdminEnabled()) {
  const authDialog = document.getElementById("auth-dialog");
  const authForm = document.getElementById("auth-form");
  const authError = document.getElementById("auth-error");
  const authPassword = document.getElementById("auth-password");
  const authCancel = document.getElementById("auth-cancel");

  function openAuth() {
    if (!authDialog) return;
    if (authError) {
      authError.hidden = true;
      authError.textContent = "";
    }
    if (typeof authDialog.showModal === "function") authDialog.showModal();
    else authDialog.setAttribute("open", "");
    authPassword?.focus();
  }

  function closeAuth() {
    if (!authDialog) return;
    if (typeof authDialog.close === "function") authDialog.close();
    else authDialog.removeAttribute("open");
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".secret-t");
    if (!trigger) return;
    event.preventDefault();
    openAuth();
  });

  authCancel?.addEventListener("click", () => closeAuth());

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authError) {
      authError.hidden = true;
      authError.textContent = "";
    }
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: authPassword?.value || "" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Wrong password.");
      }
      window.location.assign("/admin.html");
    } catch (err) {
      if (authError) {
        authError.hidden = false;
        authError.textContent =
          err instanceof Error ? err.message : "Wrong password.";
      }
    }
  });

  if (window.location.hash === "#admin") openAuth();
} else {
  document.getElementById("auth-dialog")?.remove();
}

const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-in"));
}

/** Animated spectrum backdrop — nods to CHUNK's shared frequency graph. */
function initSpectrum() {
  const canvas = document.getElementById("spectrum");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let w = 0;
  let h = 0;
  let raf = 0;
  let t0 = performance.now();

  const bands = 96;
  const phases = Float32Array.from({ length: bands }, (_, i) => i * 0.37);
  const speeds = Float32Array.from({ length: bands }, (_, i) => 0.35 + (i % 7) * 0.07);
  const bases = Float32Array.from({ length: bands }, (_, i) => {
    const x = i / (bands - 1);
    // Slightly louder midrange, softer extremes — like a channel spectrum.
    return 0.22 + 0.55 * Math.sin(Math.PI * x) ** 1.4 + 0.08 * Math.sin(x * 18);
  });

  function resize() {
    const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(now) {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);

    // Soft grid
    ctx.strokeStyle = "rgba(74, 106, 112, 0.18)";
    ctx.lineWidth = 1;
    const vLines = 12;
    for (let i = 1; i < vLines; i++) {
      const x = (w * i) / vLines;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let db = 0; db < 5; db++) {
      const y = h * (0.18 + db * 0.16);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const barW = w / bands;
    const floor = h * 0.88;

    // Spectrum fill
    ctx.beginPath();
    ctx.moveTo(0, floor);
    for (let i = 0; i < bands; i++) {
      const pulse = reduceMotion
        ? 0
        : 0.18 * Math.sin(t * speeds[i] + phases[i]) +
          0.1 * Math.sin(t * 1.7 + i * 0.21);
      const amp = Math.max(0.05, Math.min(1, bases[i] + pulse));
      const y = floor - amp * h * 0.62;
      const x = i * barW + barW * 0.5;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(w, floor);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, h * 0.2, 0, floor);
    grad.addColorStop(0, "rgba(57, 174, 169, 0.55)");
    grad.addColorStop(0.45, "rgba(162, 213, 171, 0.22)");
    grad.addColorStop(1, "rgba(57, 174, 169, 0.02)");
    ctx.fillStyle = grad;
    ctx.fill();

    // EQ-ish curve overlay (gold)
    ctx.beginPath();
    for (let i = 0; i < bands; i++) {
      const xNorm = i / (bands - 1);
      const bump =
        0.12 * Math.exp(-((xNorm - 0.22) ** 2) / 0.008) -
        0.1 * Math.exp(-((xNorm - 0.48) ** 2) / 0.006) +
        0.14 * Math.exp(-((xNorm - 0.72) ** 2) / 0.01);
      const y = h * (0.42 - bump) + (reduceMotion ? 0 : Math.sin(t * 0.6 + i * 0.05) * 2);
      const x = i * barW + barW * 0.5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(212, 188, 93, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // COMP nodes (magenta)
    const comps = [0.18, 0.34, 0.5, 0.64, 0.78, 0.9];
    for (const c of comps) {
      const x = c * w;
      const y = h * (0.34 + 0.08 * Math.sin(t * 0.9 + c * 8));
      ctx.fillStyle = "rgba(242, 0, 133, 0.9)";
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }

    // RS reduction hints (green micro bars)
    ctx.fillStyle = "rgba(111, 221, 130, 0.35)";
    for (let i = 0; i < bands; i += 2) {
      const xNorm = i / (bands - 1);
      const depth =
        0.35 *
        Math.max(
          0,
          Math.sin(xNorm * Math.PI * 3 + t * 0.4) * 0.5 +
            0.35 +
            (reduceMotion ? 0 : 0.15 * Math.sin(t * 1.2 + i))
        );
      const bh = depth * h * 0.18;
      ctx.fillRect(i * barW + 1, h * 0.22, Math.max(1, barW - 2), bh);
    }

    if (!reduceMotion) raf = requestAnimationFrame(drawFrame);
  }

  resize();
  drawFrame(performance.now());

  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) drawFrame(performance.now());
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (!reduceMotion) {
      t0 = performance.now();
      raf = requestAnimationFrame(drawFrame);
    }
  });
}

initSpectrum();
