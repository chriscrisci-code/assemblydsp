import { bandDb } from "./eq-curve.js";

const F_MIN = 20;
const F_MAX = 20000;
const DB_MIN = -24;
const DB_MAX = 24;
const SAMPLE_COUNT = 360;
const GOLD = "#e4c27a";
const SWATCHES = ["#e4c27a", "#39aea9", "#f20085", "#6fdd82", "#f3eee4", "#7eb6ff"];

const FREQUENCIES = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
  const t = i / (SAMPLE_COUNT - 1);
  return F_MIN * (F_MAX / F_MIN) ** t;
});

const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const DB_TICKS = [24, 18, 12, 6, 0, -6, -12, -18, -24];

function createNodes() {
  return [
    { id: "n1", type: "bell", freq: 62, gain: -3.4, q: 1.1, color: GOLD },
    { id: "n2", type: "bell", freq: 145, gain: 5.2, q: 1.5, color: GOLD },
    { id: "n3", type: "bell", freq: 310, gain: -6.1, q: 1.15, color: GOLD },
    { id: "n4", type: "highshelf", freq: 2140, gain: 1.6, q: 0.9, color: GOLD },
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatFreq(freq) {
  if (freq >= 1000) {
    const khz = freq / 1000;
    const text = khz >= 10 ? khz.toFixed(1) : khz.toFixed(2);
    return `${text.replace(/\.?0+$/, "")} kHz`;
  }
  return `${Math.round(freq)} Hz`;
}

function formatGain(gain) {
  const rounded = gain.toFixed(1);
  return `${gain > 0 ? "+" : ""}${rounded} dB`;
}

function kindLabel(type) {
  if (type === "highshelf") return "high shelf";
  if (type === "lowshelf") return "low shelf";
  return "bell";
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hashUnit(i) {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function mountEqGraph(root) {
  const nodes = createNodes();
  let width = 1;
  let height = 1;
  let selected = null;
  let menuNode = null;
  let dragging = null;

  const wrap = document.createElement("div");
  wrap.className = "eq-canvas-wrap";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "application");
  canvas.setAttribute(
    "aria-label",
    "EQ graph. Right-click a node to choose its color. That color paints the node's curve and shaded area.",
  );
  const menu = document.createElement("div");
  menu.className = "eq-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <p class="eq-menu-title"></p>
    <p class="eq-menu-detail"></p>
    <label class="eq-menu-color">
      <span>Color</span>
      <input type="color" value="${GOLD}" aria-label="Node color" />
    </label>
    <div class="eq-swatches" role="group" aria-label="Color presets"></div>
  `;
  const live = document.createElement("p");
  live.className = "eq-live";
  live.setAttribute("aria-live", "polite");
  wrap.append(canvas, live);
  root.append(wrap, menu);

  const ctx = canvas.getContext("2d");
  const titleEl = menu.querySelector(".eq-menu-title");
  const detailEl = menu.querySelector(".eq-menu-detail");
  const colorInput = menu.querySelector('input[type="color"]');
  const swatchRow = menu.querySelector(".eq-swatches");

  for (const swatch of SWATCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "eq-swatch";
    button.dataset.color = swatch;
    button.style.background = swatch;
    button.setAttribute("aria-label", swatch);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      colorInput.value = swatch;
      applyMenuColor(swatch);
    });
    swatchRow.append(button);
  }

  function pad() {
    return {
      l: 46,
      r: 18,
      t: 22,
      b: 32,
    };
  }

  function plotSize() {
    const p = pad();
    return {
      p,
      plotW: Math.max(1, width - p.l - p.r),
      plotH: Math.max(1, height - p.t - p.b),
    };
  }

  function freqToX(freq) {
    const { p, plotW } = plotSize();
    const t = Math.log(freq / F_MIN) / Math.log(F_MAX / F_MIN);
    return p.l + clamp(t, 0, 1) * plotW;
  }

  function dbToY(db) {
    const { p, plotH } = plotSize();
    const t = (clamp(db, DB_MIN, DB_MAX) - DB_MIN) / (DB_MAX - DB_MIN);
    return p.t + (1 - t) * plotH;
  }

  function xToFreq(x) {
    const { p, plotW } = plotSize();
    const t = clamp((x - p.l) / plotW, 0, 1);
    return F_MIN * (F_MAX / F_MIN) ** t;
  }

  function yToDb(y) {
    const { p, plotH } = plotSize();
    const t = clamp((y - p.t) / plotH, 0, 1);
    return DB_MAX - t * (DB_MAX - DB_MIN);
  }

  function nodeIndex(node) {
    const ordered = nodes.slice().sort((a, b) => a.freq - b.freq);
    return ordered.indexOf(node) + 1;
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hitHandle(point) {
    let best = null;
    let bestDistance = 18;
    for (const node of nodes) {
      const distance = Math.hypot(point.x - node.x, point.y - node.y);
      if (distance <= bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }
    return best;
  }

  function hitCurve(point) {
    let best = null;
    let bestDistance = 14;
    for (const node of nodes) {
      if (!node.samples) continue;
      for (const sample of node.samples) {
        const distance = Math.hypot(point.x - sample.x, point.y - sample.y);
        if (distance < bestDistance) {
          best = node;
          bestDistance = distance;
        }
      }
    }
    return best;
  }

  function syncMenu() {
    if (!menuNode || menu.hidden) return;
    titleEl.textContent = `Node ${nodeIndex(menuNode)}`;
    detailEl.textContent = `${formatFreq(menuNode.freq)} · ${formatGain(menuNode.gain)} · ${kindLabel(menuNode.type)}`;
    for (const button of swatchRow.children) {
      button.setAttribute("aria-pressed", button.dataset.color === menuNode.color ? "true" : "false");
    }
  }

  function applyMenuColor(color) {
    if (!menuNode) return;
    menuNode.color = color.toLowerCase();
    live.textContent = `Node ${nodeIndex(menuNode)} color ${color}`;
    syncMenu();
    draw();
  }

  function placeMenu(clientX, clientY) {
    menu.hidden = false;
    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;
    const rect = menu.getBoundingClientRect();
    const margin = 8;
    let x = clientX;
    let y = clientY;
    if (x + rect.width + margin > window.innerWidth) x = window.innerWidth - rect.width - margin;
    if (y + rect.height + margin > window.innerHeight) y = window.innerHeight - rect.height - margin;
    menu.style.left = `${Math.max(margin, x)}px`;
    menu.style.top = `${Math.max(margin, y)}px`;
  }

  function openMenu(node, clientX, clientY) {
    menuNode = node;
    selected = node;
    colorInput.value = node.color;
    syncMenu();
    placeMenu(clientX, clientY);
    draw();
  }

  function closeMenu() {
    menu.hidden = true;
    menuNode = null;
  }

  function drawGrid() {
    const { p } = plotSize();
    ctx.save();
    ctx.font = "12px 'Source Sans 3', sans-serif";
    ctx.lineWidth = 1;
    ctx.textBaseline = "middle";

    for (const db of DB_TICKS) {
      const y = dbToY(db);
      ctx.strokeStyle = db === 0 ? "rgba(228, 194, 122, 0.45)" : "rgba(120, 140, 130, 0.22)";
      ctx.beginPath();
      ctx.moveTo(p.l, y);
      ctx.lineTo(width - p.r, y);
      ctx.stroke();
      ctx.fillStyle = "rgba(196, 186, 174, 0.72)";
      ctx.textAlign = "right";
      ctx.fillText(String(db), p.l - 8, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const freq of FREQ_TICKS) {
      const x = freqToX(freq);
      ctx.strokeStyle = "rgba(120, 140, 130, 0.18)";
      ctx.beginPath();
      ctx.moveTo(x, p.t);
      ctx.lineTo(x, height - p.b);
      ctx.stroke();
      ctx.fillStyle = "rgba(196, 186, 174, 0.72)";
      ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : String(freq), x, height - p.b + 8);
    }
    ctx.restore();
  }

  function drawSpectrum() {
    const { p } = plotSize();
    const floor = dbToY(-18);
    ctx.beginPath();
    ctx.moveTo(p.l, floor);
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const freq = FREQUENCIES[i];
      const t = i / (SAMPLE_COUNT - 1);
      const env = Math.sin(Math.PI * t) ** 1.15;
      const wobble = 0.35 + hashUnit(i) * 0.65;
      const db = -16 + env * wobble * 14;
      ctx.lineTo(freqToX(freq), dbToY(db));
    }
    ctx.lineTo(width - p.r, floor);
    ctx.closePath();
    ctx.fillStyle = "rgba(186, 196, 188, 0.08)";
    ctx.fill();
  }

  function traceBand(node) {
    node.samples = FREQUENCIES.map((freq) => {
      const db = bandDb(node, freq);
      return { freq, db, x: freqToX(freq), y: dbToY(db) };
    });
    node.x = freqToX(node.freq);
    node.y = dbToY(node.gain);
  }

  function strokeSamples(samples) {
    ctx.beginPath();
    samples.forEach((sample, index) => {
      if (index === 0) ctx.moveTo(sample.x, sample.y);
      else ctx.lineTo(sample.x, sample.y);
    });
  }

  function drawTotal() {
    ctx.beginPath();
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      let db = 0;
      for (const node of nodes) db += node.samples[i].db;
      const x = freqToX(FREQUENCIES[i]);
      const y = dbToY(db);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(243, 238, 228, 0.55)";
    ctx.lineWidth = 1.25;
    ctx.stroke();
  }

  function drawHandle(node) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node === selected ? 7 : 6, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#141816";
    ctx.stroke();
    if (node === selected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(243, 238, 228, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#121614";
    ctx.fillRect(0, 0, width, height);
    drawSpectrum();
    drawGrid();
    for (const node of nodes) traceBand(node);
    for (const node of nodes) {
      const zeroY = dbToY(0);
      const samples = node.samples;
      ctx.beginPath();
      samples.forEach((sample, index) => {
        if (index === 0) ctx.moveTo(sample.x, sample.y);
        else ctx.lineTo(sample.x, sample.y);
      });
      ctx.lineTo(samples[samples.length - 1].x, zeroY);
      ctx.lineTo(samples[0].x, zeroY);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(node.color, 0.34);
      ctx.fill();
    }
    drawTotal();
    for (const node of nodes) {
      strokeSamples(node.samples);
      ctx.strokeStyle = node.color;
      ctx.lineWidth = node === selected ? 2.75 : 2.15;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
    for (const node of nodes) drawHandle(node);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  colorInput.addEventListener("input", () => applyMenuColor(colorInput.value));

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const hit = hitHandle(eventPoint(event));
    selected = hit;
    if (!hit) {
      closeMenu();
      draw();
      return;
    }
    dragging = hit;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
    if (menuNode && menuNode !== hit) closeMenu();
    draw();
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = eventPoint(event);
    if (!dragging) {
      canvas.style.cursor = hitHandle(point) ? "grab" : "default";
      return;
    }
    dragging.freq = clamp(xToFreq(point.x), F_MIN, F_MAX);
    dragging.gain = clamp(yToDb(point.y), DB_MIN, DB_MAX);
    syncMenu();
    draw();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = null;
    canvas.style.cursor = "grab";
  }

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  canvas.addEventListener("contextmenu", (event) => {
    const point = eventPoint(event);
    const hit = hitHandle(point) || hitCurve(point);
    if (!hit) return;
    event.preventDefault();
    openMenu(hit, event.clientX, event.clientY);
  });

  document.addEventListener("pointerdown", (event) => {
    if (menu.hidden || menu.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const observer = new ResizeObserver(resize);
  observer.observe(wrap);
  resize();

  return {
    destroy() {
      observer.disconnect();
      wrap.remove();
      menu.remove();
    },
  };
}

const stage = document.querySelector("[data-eq-graph]");
if (stage) mountEqGraph(stage);
