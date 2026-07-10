/**
 * Paletteforge — local JSON store for brand kits.
 * Pure Node (no Electron imports) so it is testable and reusable. The
 * Electron main process passes in the userData path. Single JSON file,
 * atomic writes, corrupt-file recovery — same pattern as Streakly.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;

function defaultData() {
  return {
    schema: SCHEMA_VERSION,
    app: 'paletteforge',
    kits: [], // see shape below
    settings: { theme: 'dark' },
  };
}

/**
 * Kit shape:
 * {
 *   id, name, client,
 *   palette: [{ hex, name, locked }],
 *   fonts: { heading: 'Inter', body: 'Inter' },
 *   logoPath: string | null,
 *   createdAt, updatedAt,
 * }
 */

function dataFile(dir) {
  return path.join(dir, 'paletteforge-data.json');
}

function load(dir) {
  const file = dataFile(dir);
  if (!fs.existsSync(file)) return defaultData();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return normalize(JSON.parse(raw));
  } catch (err) {
    // Corrupt file: keep it aside instead of silently destroying data.
    try { fs.copyFileSync(file, file + '.corrupt-' + Date.now()); } catch (_) {}
    return defaultData();
  }
}

function save(dir, data) {
  fs.mkdirSync(dir, { recursive: true });
  const file = dataFile(dir);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file); // atomic-ish swap
  return file;
}

function isHex(v) {
  return typeof v === 'string' && /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v);
}

function normalizeHexLoose(v, fallback) {
  if (!isHex(v)) return fallback;
  let h = v.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return '#' + h.toLowerCase();
}

function normalizePalette(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(c => c && isHex(c.hex))
    .map((c, i) => ({
      hex: normalizeHexLoose(c.hex, '#000000'),
      name: c.name ? String(c.name) : `Color ${i + 1}`,
      locked: !!c.locked,
    }));
}

function normalizeFonts(f) {
  const d = { heading: 'Inter', body: 'Inter' };
  if (!f || typeof f !== 'object') return d;
  return {
    heading: f.heading ? String(f.heading) : d.heading,
    body: f.body ? String(f.body) : d.body,
  };
}

function todayISO() {
  return new Date().toISOString();
}

/** Coerce arbitrary parsed JSON into a valid store shape. Throws if hopeless. */
function normalize(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Not a Paletteforge data object');
  const d = defaultData();
  if (Array.isArray(obj.kits)) {
    d.kits = obj.kits
      .filter(k => k && k.id && k.name)
      .map((k, i) => ({
        id: String(k.id),
        name: String(k.name),
        client: k.client ? String(k.client) : '',
        palette: normalizePalette(k.palette),
        fonts: normalizeFonts(k.fonts),
        logoPath: k.logoPath ? String(k.logoPath) : null,
        createdAt: k.createdAt || todayISO(),
        updatedAt: k.updatedAt || todayISO(),
        order: Number.isFinite(k.order) ? k.order : i,
      }));
  }
  if (obj.settings && typeof obj.settings === 'object') {
    d.settings = { ...d.settings, ...obj.settings };
  }
  return d;
}

// ---------- export / import ----------

function exportJSON(data) {
  return JSON.stringify({ ...data, exportedAt: todayISO() }, null, 2);
}

/** Parse an exported JSON string back into a valid store. Throws on bad input. */
function importJSON(str) {
  const parsed = JSON.parse(str);
  if (parsed.app !== 'paletteforge') throw new Error('Not a Paletteforge export file');
  return normalize(parsed);
}

module.exports = {
  defaultData, dataFile, load, save, normalize, exportJSON, importJSON, SCHEMA_VERSION,
};
