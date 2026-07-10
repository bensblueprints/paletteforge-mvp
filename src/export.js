/**
 * Paletteforge — pure export module.
 * CSS custom properties, Tailwind config snippet, JSON round-trip, and a
 * minimal-but-correct ASE (Adobe Swatch Exchange) binary writer.
 * No Electron, no DOM — everything here operates on plain arrays/strings
 * and Node Buffers so it is directly unit-testable.
 */

'use strict';

/* Works as a CommonJS module (main process, tests) and as a plain
   <script> in the sandboxed renderer (where color.js already attached
   itself to window as PaletteforgeColor). */
const color = (typeof module !== 'undefined' && module.exports)
  ? require('./color')
  : window.PaletteforgeColor;

// ---------- helpers ----------

function slugify(name, fallback) {
  const s = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return s || fallback;
}

// ---------- CSS custom properties ----------

/**
 * @param {Array<{hex:string,name?:string}>} palette
 * @param {{selector?: string}} [opts]
 * @returns {string}
 */
function toCSSVariables(palette, opts = {}) {
  const selector = opts.selector || ':root';
  const lines = palette.map((c, i) => {
    const varName = c.name ? `--color-${slugify(c.name, `swatch-${i + 1}`)}` : `--color-${i + 1}`;
    return `  ${varName}: #${color.normalizeHex(c.hex)};`;
  });
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

// ---------- Tailwind config snippet ----------

/**
 * @param {Array<{hex:string,name?:string}>} palette
 * @param {{groupName?: string}} [opts]
 * @returns {string}
 */
function toTailwindConfig(palette, opts = {}) {
  const groupName = opts.groupName || 'brand';
  const entries = palette.map((c, i) => {
    const key = c.name ? slugify(c.name, `${i + 1}`) : String(i + 1);
    return `        ${JSON.stringify(key)}: ${JSON.stringify('#' + color.normalizeHex(c.hex))},`;
  });
  return [
    '/** Add to tailwind.config.js theme.extend.colors */',
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    `        ${JSON.stringify(groupName)}: {`,
    entries.map(e => '  ' + e).join('\n'),
    '        },',
    '      },',
    '    },',
    '  },',
    '};',
    '',
  ].join('\n');
}

// ---------- JSON export / import ----------

const KIT_SCHEMA_VERSION = 1;

/** @param {object} kit */
function toJSON(kit) {
  return JSON.stringify({ ...kit, schema: KIT_SCHEMA_VERSION, exportedAt: new Date().toISOString() }, null, 2);
}

/** Parse a Paletteforge kit export back into an object. Throws on bad input. */
function fromJSON(str) {
  const parsed = JSON.parse(str);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.palette)) {
    throw new Error('Not a valid Paletteforge kit export');
  }
  return parsed;
}

// ---------- ASE (Adobe Swatch Exchange) binary writer ----------
// Format: 4-byte 'ASEF' signature, 2x uint16BE version, uint32BE block count,
// then one "color entry" block per swatch:
//   uint16BE blockType (0x0001)
//   int32BE  blockLength (bytes following this field)
//   uint16BE nameLength (UTF-16 code units, INCLUDING the null terminator)
//   name in UTF-16BE + null terminator (2 bytes)
//   4 ASCII bytes color model ("RGB ")
//   3x float32BE color components (0..1)
//   uint16BE color type (0 = Global, 1 = Spot, 2 = Process/Normal)

const ASE_SIGNATURE = 'ASEF';

function buildColorEntryBlock(name, hex) {
  const { r, g, b } = color.hexToRgb(hex);
  const nameStr = String(name || hex);
  const nameLen = nameStr.length + 1; // includes null terminator

  const nameBuf = Buffer.alloc(nameLen * 2);
  for (let i = 0; i < nameStr.length; i++) nameBuf.writeUInt16BE(nameStr.charCodeAt(i), i * 2);
  // final 2 bytes stay zero (null terminator)

  const dataBuf = Buffer.alloc(2 + nameBuf.length + 4 + 12 + 2);
  let off = 0;
  dataBuf.writeUInt16BE(nameLen, off); off += 2;
  nameBuf.copy(dataBuf, off); off += nameBuf.length;
  dataBuf.write('RGB ', off, 'ascii'); off += 4;
  dataBuf.writeFloatBE(r / 255, off); off += 4;
  dataBuf.writeFloatBE(g / 255, off); off += 4;
  dataBuf.writeFloatBE(b / 255, off); off += 4;
  dataBuf.writeUInt16BE(0, off); off += 2; // Global

  const header = Buffer.alloc(6);
  header.writeUInt16BE(0x0001, 0);
  header.writeInt32BE(dataBuf.length, 2);

  return Buffer.concat([header, dataBuf]);
}

/**
 * @param {Array<{hex:string,name?:string}>} palette
 * @returns {Buffer}
 */
function toASE(palette) {
  const blocks = palette.map(c => buildColorEntryBlock(c.name, c.hex));
  const fileHeader = Buffer.alloc(12);
  fileHeader.write(ASE_SIGNATURE, 0, 'ascii');
  fileHeader.writeUInt16BE(1, 4); // major version
  fileHeader.writeUInt16BE(0, 6); // minor version
  fileHeader.writeInt32BE(palette.length, 8); // block count
  return Buffer.concat([fileHeader, ...blocks]);
}

const PaletteforgeExport = {
  slugify,
  toCSSVariables,
  toTailwindConfig,
  toJSON,
  fromJSON,
  toASE,
  ASE_SIGNATURE,
  KIT_SCHEMA_VERSION,
};

/* Works as a CommonJS module (main process, tests) and as a plain
   <script> in the sandboxed renderer (attaches to window).
   NOTE: toASE() uses Node's Buffer and is only safe to call from the
   main process (or under Node in tests) — the sandboxed renderer has
   no Buffer global. The renderer calls window.paletteforge.exportASE()
   instead, which round-trips the palette to main over IPC and runs
   toASE() there. */
if (typeof module !== 'undefined' && module.exports) module.exports = PaletteforgeExport;
if (typeof window !== 'undefined') window.PaletteforgeExport = PaletteforgeExport;
