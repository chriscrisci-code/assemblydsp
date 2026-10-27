/** Magnitude curves for the EQ graph. Bells use the analog peaking response. */

const LN2 = Math.LN2;

export function bellDb(freq, center, q, gainDb) {
  const safeQ = Math.max(0.2, q);
  const w = freq / center;
  const A = 10 ** (gainDb / 40);
  const a = w * w - 1;
  const bw = w / safeQ;
  const num = a * a + (bw * A) ** 2;
  const den = a * a + (bw / A) ** 2;
  return 10 * Math.log10(num / den);
}

/**
 * Shelf that has reached the requested gain at the node and holds it
 * on the plateau side. Q sets how fast the curve leaves 0 dB.
 */
export function shelfDb(freq, center, q, gainDb, high) {
  const octaves = Math.log(freq / center) / LN2;
  const side = high ? octaves : -octaves;
  const steep = 1.15 + Math.max(0.2, q) * 1.7;
  const shift = 3.9 / steep;
  const t = 1 / (1 + Math.exp(-steep * (side + shift)));
  return gainDb * t;
}

export function bandDb(node, freq) {
  if (node.type === "lowshelf") return shelfDb(freq, node.freq, node.q, node.gain, false);
  if (node.type === "highshelf") return shelfDb(freq, node.freq, node.q, node.gain, true);
  return bellDb(freq, node.freq, node.q, node.gain);
}
