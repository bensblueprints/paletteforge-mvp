/**
 * Paletteforge — pure color math module.
 * No Electron, no DOM. Hex/RGB/HSL conversions, harmony generators, and
 * WCAG contrast math. Dependency-free so it can be unit-tested directly
 * under Node and reused unchanged in the sandboxed renderer via <script>.
 */

'use strict';

// ---------- hex <-> rgb ----------

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function normalizeHex(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid hex color: ${hex}`);
  return h.toLowerCase();
}

function hexToRgb(hex) {
  const h = normalizeHex(hex);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const c = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ---------- rgb <-> hsl ----------

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// ---------- harmony generators ----------
// All take a base hex and return an array of hex strings (base first).

function complementary(hex) {
  const { h, s, l } = hexToHsl(hex);
  return [normalizeToHex(hex), hslToHex(h + 180, s, l)];
}

function analogous(hex, count = 5, step = 30) {
  count = Math.max(2, Math.floor(count));
  const { h, s, l } = hexToHsl(hex);
  const half = Math.floor(count / 2);
  const out = [];
  for (let i = 0; i < count; i++) {
    const offset = (i - half) * step;
    out.push(hslToHex(h + offset, s, l));
  }
  return out;
}

function triadic(hex) {
  const { h, s, l } = hexToHsl(hex);
  return [normalizeToHex(hex), hslToHex(h + 120, s, l), hslToHex(h + 240, s, l)];
}

function monochrome(hex, count = 5) {
  count = Math.max(2, Math.floor(count));
  const { h, s, l } = hexToHsl(hex);
  const out = [];
  // Spread lightness across a wide, usable range while keeping hue/sat fixed.
  const minL = 12, maxL = 92;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    out.push(hslToHex(h, s, minL + t * (maxL - minL)));
  }
  return out;
}

function normalizeToHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r, g, b);
}

const HARMONIES = { complementary, analogous, triadic, monochrome };

function generateHarmony(name, hex, count) {
  const fn = HARMONIES[name];
  if (!fn) throw new Error(`Unknown harmony: ${name}`);
  return name === 'complementary' || name === 'triadic' ? fn(hex) : fn(hex, count);
}

// ---------- WCAG contrast ----------

function srgbChannelToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0..1) of a hex color. */
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio between two hex colors, 1..21. */
function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

const WCAG_THRESHOLDS = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
};

/**
 * WCAG pass/fail for a contrast ratio.
 * size: 'normal' | 'large'
 * returns { ratio, aa, aaa }
 */
function wcagReport(hexA, hexB, size = 'normal') {
  const ratio = contrastRatio(hexA, hexB);
  const t = size === 'large' ? WCAG_THRESHOLDS.AA.large : WCAG_THRESHOLDS.AA.normal;
  const t3 = size === 'large' ? WCAG_THRESHOLDS.AAA.large : WCAG_THRESHOLDS.AAA.normal;
  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= t,
    aaa: ratio >= t3,
  };
}

const PaletteforgeColor = {
  clamp,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  complementary,
  analogous,
  triadic,
  monochrome,
  generateHarmony,
  relativeLuminance,
  contrastRatio,
  wcagReport,
  WCAG_THRESHOLDS,
};

/* Works as a CommonJS module (main process, tests) and as a plain
   <script> in the sandboxed renderer (attaches to window). */
if (typeof module !== 'undefined' && module.exports) module.exports = PaletteforgeColor;
if (typeof window !== 'undefined') window.PaletteforgeColor = PaletteforgeColor;
