/** Default marketing copy. public/content.json is the live override. */

export const defaultContent = {
  meta: {
    title: "CHUNK VST3 — Multiband Channel Strip | Assembly DSP",
    description:
      "CHUNK is a Windows VST3 multiband channel strip from Assembly DSP. EQ, compressor, and spectral RS on one graph. $39 launch price. 30-day free trial.",
  },
  header: {
    logo: "Assembly DSP",
    navChunk: "CHUNK",
    navLayers: "Layers",
    navCompare: "Compare",
    navPricing: "Pricing",
    navSupport: "Support",
    buy: "Buy · $39",
  },
  hero: {
    brand: "Assembly DSP",
    productName: "CHUNK",
    lede: "A multiband channel processor — EQ, COMP, and spectral RS sharing one frequency graph.",
    ctaTrial: "Start free trial",
    ctaLearn: "See what it does",
  },
  product: {
    eyebrow: "The first plugin",
    headline: "Shape the whole channel without leaving the graph.",
    lede: "CHUNK stacks an 8-band EQ, 6-band compressor, and a split-band spectral compressor (RS) on a shared spectrum view — so you carve, control, and clean in the same place.",
    chainIn: "In",
    chainHarmonics: "Harmonics",
    chainEq: "EQ",
    chainComp: "COMP",
    chainRs: "RS",
    chainWidth: "Width",
    chainOut: "Out",
  },
  layers: {
    eyebrow: "Three layers",
    headline: "One graph. Three jobs.",
    eqName: "EQ",
    eqHeadline: "Eight bands of surgical tone",
    eqBody:
      "Bell, shelves, high/low pass, and plateau filters — drag nodes on the spectrum, solo bands, and sculpt without jumping between plugins.",
    eqAlt: "CHUNK EQ window — multiband equalizer with spectrum graph and band controls",
    compName: "COMP",
    compHeadline: "Six-band dynamics with sidechain",
    compBody:
      "Threshold, ratio, attack, release, knee, makeup, range, and gate per region — plus external sidechain when you need to duck with intention.",
    compAlt: "CHUNK COMP window — multiband compressor with transfer curve and dynamics controls",
    rsName: "RS",
    rsHeadline: "Spectral compression that follows the sound",
    rsBody:
      "RS splits each region into ~80 narrow log-spaced bands that compress independently — gain reduction traces the inverse of the spectrum for transparent leveling and resonance control.",
    rsAlt: "CHUNK RS window — resonance suppressor with spectral gain reduction",
  },
  extras: {
    eyebrow: "Around the edges",
    headline: "Input color. Output polish.",
    item1: "Input & output harmonic drive with even/odd balance",
    item2: "Stereo width and continuous phase control",
    item3: "Output ceiling / brickwall for clean peaks",
    item4: "Live spectrum analyzer under every layer",
    item5: "VST3 for Windows (macOS AU coming later)",
    inAlt: "CHUNK input page — level, harmonics, gain, and phase",
    outAlt: "CHUNK output page — level, brickwall limiter, width, and harmonics",
  },
  compare: {
    eyebrow: "One plugin. The whole channel.",
    headline: "The channel strip grew up.",
    lede: "Traditional strips give you EQ, compression, and a gate. CHUNK keeps that one-window workflow and adds multiband, spectral, and resonance tools — without assembling a chain.",
    noteDeess: "CHUNK de-essing is via a high COMP band or an RS region, not a dedicated de-esser module.",
    noteFabMb: "FabFilter Mixing Bundle includes Saturn 2 (multiband saturation) and Pro-Q 4, but not Pro-MB.",
    noteFabRs: "Pro-Q 4 Spectral Dynamics can treat varying problem frequencies. It is not a dedicated automatic resonance-suppression module.",
    notePrice: "Prices are manufacturer regular / MSRP. Sale prices vary; Waves regularly discounts Scheps Omni Channel 2.",
    closeKicker: "CHUNK",
    closePrice: "$39",
    closeLine: "One plugin. One window. The whole channel.",
    closeLede: "Everything you need to shape a channel without building a plugin chain.",
  },
  pricing: {
    eyebrow: "Get CHUNK",
    headline: "Launch pricing.",
    lede: "Full license, 30-day free trial — no commitment while you put it on real sessions.",
    was: "$79",
    now: "$39",
    note: "Launch offer · Regular price $79 · 30-day free trial",
    trial: "Start 30-day trial",
    buy: "Buy CHUNK — $39",
    contactEmail: "support@assemblydsp.com",
  },
  footer: {
    logo: "Assembly DSP",
    tag: "Audio plugins, assembled.",
    copyright: "Assembly DSP. CHUNK is a trademark of Assembly DSP.",
    vst: "VST is a trademark of Steinberg Media Technologies GmbH.",
  },
};

export const contentFields = [
  { section: "Meta", key: "meta.title", label: "Browser title", type: "text" },
  { section: "Meta", key: "meta.description", label: "Search description", type: "textarea" },
  { section: "Header", key: "header.logo", label: "Logo", type: "text" },
  { section: "Header", key: "header.navChunk", label: "Nav: CHUNK", type: "text" },
  { section: "Header", key: "header.navLayers", label: "Nav: Layers", type: "text" },
  { section: "Header", key: "header.navCompare", label: "Nav: Compare", type: "text" },
  { section: "Header", key: "header.navPricing", label: "Nav: Pricing", type: "text" },
  { section: "Header", key: "header.navSupport", label: "Nav: Support", type: "text" },
  { section: "Header", key: "header.buy", label: "Buy button", type: "text" },
  { section: "Hero", key: "hero.brand", label: "Brand", type: "text" },
  { section: "Hero", key: "hero.productName", label: "Product name", type: "text" },
  { section: "Hero", key: "hero.lede", label: "Supporting line", type: "textarea" },
  { section: "Hero", key: "hero.ctaTrial", label: "Trial button", type: "text" },
  { section: "Hero", key: "hero.ctaLearn", label: "Learn button", type: "text" },
  { section: "Product", key: "product.eyebrow", label: "Eyebrow", type: "text" },
  { section: "Product", key: "product.headline", label: "Headline", type: "textarea" },
  { section: "Product", key: "product.lede", label: "Body", type: "textarea" },
  { section: "Product", key: "product.chainIn", label: "Chain: In", type: "text" },
  { section: "Product", key: "product.chainHarmonics", label: "Chain: Harmonics", type: "text" },
  { section: "Product", key: "product.chainEq", label: "Chain: EQ", type: "text" },
  { section: "Product", key: "product.chainComp", label: "Chain: COMP", type: "text" },
  { section: "Product", key: "product.chainRs", label: "Chain: RS", type: "text" },
  { section: "Product", key: "product.chainWidth", label: "Chain: Width", type: "text" },
  { section: "Product", key: "product.chainOut", label: "Chain: Out", type: "text" },
  { section: "Layers", key: "layers.eyebrow", label: "Eyebrow", type: "text" },
  { section: "Layers", key: "layers.headline", label: "Headline", type: "text" },
  { section: "Layers", key: "layers.eqName", label: "EQ name", type: "text" },
  { section: "Layers", key: "layers.eqHeadline", label: "EQ headline", type: "text" },
  { section: "Layers", key: "layers.eqBody", label: "EQ body", type: "textarea" },
  { section: "Layers", key: "layers.eqAlt", label: "EQ image alt", type: "text" },
  { section: "Layers", key: "layers.compName", label: "COMP name", type: "text" },
  { section: "Layers", key: "layers.compHeadline", label: "COMP headline", type: "text" },
  { section: "Layers", key: "layers.compBody", label: "COMP body", type: "textarea" },
  { section: "Layers", key: "layers.compAlt", label: "COMP image alt", type: "text" },
  { section: "Layers", key: "layers.rsName", label: "RS name", type: "text" },
  { section: "Layers", key: "layers.rsHeadline", label: "RS headline", type: "text" },
  { section: "Layers", key: "layers.rsBody", label: "RS body", type: "textarea" },
  { section: "Layers", key: "layers.rsAlt", label: "RS image alt", type: "text" },
  { section: "Extras", key: "extras.eyebrow", label: "Eyebrow", type: "text" },
  { section: "Extras", key: "extras.headline", label: "Headline", type: "text" },
  { section: "Extras", key: "extras.item1", label: "Item 1", type: "text" },
  { section: "Extras", key: "extras.item2", label: "Item 2", type: "text" },
  { section: "Extras", key: "extras.item3", label: "Item 3", type: "text" },
  { section: "Extras", key: "extras.item4", label: "Item 4", type: "text" },
  { section: "Extras", key: "extras.item5", label: "Item 5", type: "text" },
  { section: "Extras", key: "extras.inAlt", label: "Input image alt", type: "text" },
  { section: "Extras", key: "extras.outAlt", label: "Output image alt", type: "text" },
  { section: "Compare", key: "compare.eyebrow", label: "Eyebrow", type: "text" },
  { section: "Compare", key: "compare.headline", label: "Headline", type: "text" },
  { section: "Compare", key: "compare.lede", label: "Body", type: "textarea" },
  { section: "Compare", key: "compare.noteDeess", label: "Note: de-essing", type: "textarea" },
  { section: "Compare", key: "compare.noteFabMb", label: "Note: FabFilter multiband", type: "textarea" },
  { section: "Compare", key: "compare.noteFabRs", label: "Note: FabFilter RS", type: "textarea" },
  { section: "Compare", key: "compare.notePrice", label: "Note: pricing", type: "textarea" },
  { section: "Compare", key: "compare.closeKicker", label: "Close kicker", type: "text" },
  { section: "Compare", key: "compare.closePrice", label: "Close price", type: "text" },
  { section: "Compare", key: "compare.closeLine", label: "Close line", type: "text" },
  { section: "Compare", key: "compare.closeLede", label: "Close body", type: "textarea" },
  { section: "Pricing", key: "pricing.eyebrow", label: "Eyebrow", type: "text" },
  { section: "Pricing", key: "pricing.headline", label: "Headline", type: "text" },
  { section: "Pricing", key: "pricing.lede", label: "Body", type: "textarea" },
  { section: "Pricing", key: "pricing.was", label: "List price", type: "text" },
  { section: "Pricing", key: "pricing.now", label: "Sale price", type: "text" },
  { section: "Pricing", key: "pricing.note", label: "Price note", type: "text" },
  { section: "Pricing", key: "pricing.trial", label: "Trial button", type: "text" },
  { section: "Pricing", key: "pricing.buy", label: "Buy button", type: "text" },
  { section: "Pricing", key: "pricing.contactEmail", label: "Contact email", type: "text" },
  { section: "Footer", key: "footer.logo", label: "Logo", type: "text" },
  { section: "Footer", key: "footer.tag", label: "Tagline", type: "text" },
  { section: "Footer", key: "footer.copyright", label: "Copyright line (year is added automatically)", type: "text" },
  { section: "Footer", key: "footer.vst", label: "VST trademark line", type: "text" },
];

export function getPath(obj, path) {
  return path.split(".").reduce((cur, key) => cur?.[key], obj);
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (cur[key] == null || typeof cur[key] !== "object") cur[key] = {};
    cur = cur[key];
  }
  cur[keys[keys.length - 1]] = value;
}

export function mergeContent(overlay) {
  return structuredClone
    ? structuredClone({ ...deepMerge(defaultContent, overlay || {}) })
    : deepMerge(defaultContent, overlay || {});
}

function deepMerge(base, overlay) {
  const out = { ...base };
  if (!overlay || typeof overlay !== "object") return out;
  for (const [key, value] of Object.entries(overlay)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(base[key] && typeof base[key] === "object" ? base[key] : {}, value);
    } else if (value != null) {
      out[key] = value;
    }
  }
  return out;
}
