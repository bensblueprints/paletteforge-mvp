'use strict';

/**
 * Paletteforge smoke test — pure Node, no Electron.
 *   1. Color math: hex/rgb/hsl round-trips, harmony generators, WCAG contrast.
 *   2. K-means: recovers real clusters from synthetic pixel fixtures.
 *   3. Export: CSS vars, Tailwind snippet, JSON round-trip, ASE binary writer.
 *   4. Store: save/load round-trip, corrupt-file recovery.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const color = require('../src/color');
const { kmeans, mulberry32 } = require('../src/kmeans');
const exp = require('../src/export');
const store = require('../src/store');

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
  console.log('  ✔ ' + msg);
}
function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, `${msg} (expected ${expected}, got ${actual})`);
  passed++;
  console.log('  ✔ ' + msg);
}
function approx(actual, expected, tol, msg) {
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} (expected ~${expected} ±${tol}, got ${actual})`);
  passed++;
  console.log('  ✔ ' + msg);
}

console.log('\n— Color: hex/rgb/hsl round-trips —');
{
  const cases = ['#ff0000', '#00ff00', '#0000ff', '#7c3aed', '#123456', '#abc', '#000000', '#ffffff'];
  for (const hex of cases) {
    const { r, g, b } = color.hexToRgb(hex);
    const back = color.rgbToHex(r, g, b);
    eq(back, '#' + color.normalizeHex(hex), `hex→rgb→hex round-trip stable for ${hex}`);
  }
  // hsl round-trip (allow small rounding tolerance)
  for (const hex of ['#7c3aed', '#38bdf8', '#f43f5e', '#22c55e']) {
    const hsl = color.hexToHsl(hex);
    const back = color.hslToHex(hsl.h, hsl.s, hsl.l);
    const rgbA = color.hexToRgb(hex);
    const rgbB = color.hexToRgb(back);
    approx(rgbA.r, rgbB.r, 2, `hex→hsl→hex preserves R channel for ${hex}`);
    approx(rgbA.g, rgbB.g, 2, `hex→hsl→hex preserves G channel for ${hex}`);
    approx(rgbA.b, rgbB.b, 2, `hex→hsl→hex preserves B channel for ${hex}`);
  }
  ok((() => { try { color.normalizeHex('not-a-color'); return false; } catch (_) { return true; } })(),
    'normalizeHex rejects garbage input');
}

console.log('\n— Color: harmony generators —');
{
  const base = '#ff0000'; // hue 0
  const comp = color.complementary(base);
  eq(comp.length, 2, 'complementary returns 2 colors');
  const compHsl = color.hexToHsl(comp[1]);
  approx(compHsl.h, 180, 1, 'complementary color is 180deg from base hue');

  const tri = color.triadic(base);
  eq(tri.length, 3, 'triadic returns 3 colors');
  approx(color.hexToHsl(tri[1]).h, 120, 1, 'triadic 2nd color is +120deg');
  approx(color.hexToHsl(tri[2]).h, 240, 1, 'triadic 3rd color is +240deg');

  const ana = color.analogous(base, 5);
  eq(ana.length, 5, 'analogous returns requested count');
  const hues = ana.map(h => color.hexToHsl(h).h);
  for (let i = 1; i < hues.length; i++) {
    let diff = hues[i] - hues[i - 1];
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    approx(diff, 30, 1, `analogous step ${i} is ~30deg from previous`);
  }

  const mono = color.monochrome(base, 6);
  eq(mono.length, 6, 'monochrome returns requested count');
  const lights = mono.map(h => color.hexToHsl(h).l);
  for (let i = 1; i < lights.length; i++) {
    ok(lights[i] > lights[i - 1], `monochrome lightness strictly increases (step ${i})`);
  }
  for (const h of mono) {
    approx(color.hexToHsl(h).h, color.hexToHsl(base).h, 1, 'monochrome preserves base hue');
  }
}

console.log('\n— Color: WCAG contrast —');
{
  eq(color.contrastRatio('#000000', '#ffffff'), 21, 'black/white contrast ratio is exactly 21');
  eq(color.contrastRatio('#ffffff', '#ffffff'), 1, 'identical colors have contrast ratio 1');
  const rep = color.wcagReport('#000000', '#ffffff', 'normal');
  ok(rep.aa && rep.aaa, 'black on white passes both AA and AAA for normal text');
  const low = color.wcagReport('#777777', '#888888', 'normal');
  ok(!low.aa, 'near-identical grays fail AA normal text');
  const midGray = color.wcagReport('#767676', '#ffffff', 'normal');
  ok(midGray.aa, '#767676 on white passes AA normal text (known WCAG reference ~4.54:1)');
  ok(!midGray.aaa, '#767676 on white fails AAA normal text');
  approx(midGray.ratio, 4.54, 0.05, '#767676 on white contrast ratio matches known reference value');
}

console.log('\n— K-means: recovers synthetic clusters —');
{
  const rand = mulberry32(42); // fixed seed -> fully deterministic fixture
  const pixels = [];
  for (let i = 0; i < 100; i++) {
    pixels.push([
      clampByte(250 + (rand() * 10 - 5)),
      clampByte(5 + (rand() * 10 - 5)),
      clampByte(5 + (rand() * 10 - 5)),
    ]);
  }
  for (let i = 0; i < 100; i++) {
    pixels.push([
      clampByte(5 + (rand() * 10 - 5)),
      clampByte(5 + (rand() * 10 - 5)),
      clampByte(250 + (rand() * 10 - 5)),
    ]);
  }

  const clusters = kmeans(pixels, 2);
  eq(clusters.length, 2, 'kmeans(k=2) on two tight clusters returns 2 clusters');
  eq(clusters[0].count + clusters[1].count, 200, 'kmeans cluster counts sum to total pixel count');
  approx(clusters[0].count, 100, 15, 'kmeans first cluster population close to 100');
  approx(clusters[1].count, 100, 15, 'kmeans second cluster population close to 100');

  const redLike = clusters.find(c => c.rgb[0] > 200 && c.rgb[2] < 60);
  const blueLike = clusters.find(c => c.rgb[2] > 200 && c.rgb[0] < 60);
  ok(!!redLike, 'kmeans recovered a red-ish centroid');
  ok(!!blueLike, 'kmeans recovered a blue-ish centroid');
  approx(redLike.rgb[0], 250, 15, 'red-ish centroid R channel near 250');
  approx(blueLike.rgb[2], 250, 15, 'blue-ish centroid B channel near 250');

  eq(kmeans([], 3).length, 0, 'kmeans on empty pixel array returns empty result');
  eq(kmeans([[1, 2, 3]], 5).length, 1, 'kmeans clamps k to available pixel count');
}
function clampByte(v) { return Math.max(0, Math.min(255, Math.round(v))); }

console.log('\n— Export: CSS custom properties —');
{
  const palette = [{ hex: '#7c3aed', name: 'Primary' }, { hex: '#38bdf8', name: 'Accent' }];
  const css = exp.toCSSVariables(palette);
  ok(css.startsWith(':root {'), 'CSS export starts with :root block');
  ok(css.includes('--color-primary: #7c3aed;'), 'CSS export includes named custom property for Primary');
  ok(css.includes('--color-accent: #38bdf8;'), 'CSS export includes named custom property for Accent');
}

console.log('\n— Export: Tailwind config snippet —');
{
  const palette = [{ hex: '#7c3aed', name: 'Primary' }, { hex: '#38bdf8', name: 'Accent' }];
  const tw = exp.toTailwindConfig(palette, { groupName: 'brand' });
  ok(tw.includes('module.exports'), 'Tailwind export is a valid module.exports snippet');
  ok(tw.includes('"brand"'), 'Tailwind export nests colors under the group name');
  ok(tw.includes('"#7c3aed"'), 'Tailwind export includes the hex value for Primary');
}

console.log('\n— Export: JSON round-trip —');
{
  const kit = {
    id: 'k1', name: 'Acme Kit', client: 'Acme Inc.',
    palette: [{ hex: '#7c3aed', name: 'Primary', locked: false }],
    fonts: { heading: 'Inter', body: 'Georgia' },
    logoPath: 'C:\\logos\\acme.png',
  };
  const json = exp.toJSON(kit);
  const back = exp.fromJSON(json);
  assert.deepStrictEqual(back.palette, kit.palette);
  passed++; console.log('  ✔ JSON export→import: palette identical');
  eq(back.name, kit.name, 'JSON export→import: name identical');
  eq(back.fonts.heading, 'Inter', 'JSON export→import: fonts identical');

  let threw = false;
  try { exp.fromJSON('{"not":"a kit"}'); } catch (_) { threw = true; }
  ok(threw, 'fromJSON rejects data with no palette array');
}

console.log('\n— Export: ASE binary writer —');
{
  const palette = [
    { hex: '#ff0000', name: 'Red' },
    { hex: '#00ff00', name: 'Green' },
    { hex: '#0000ff', name: 'Blue' },
  ];
  const buf = exp.toASE(palette);
  ok(Buffer.isBuffer(buf), 'toASE returns a Buffer');
  eq(buf.slice(0, 4).toString('ascii'), 'ASEF', 'ASE buffer starts with the ASEF signature');
  eq(buf.readUInt16BE(4), 1, 'ASE major version is 1');
  eq(buf.readInt32BE(8), 3, 'ASE block count matches palette length (3)');

  // Verify byte-length consistency by walking the block structure.
  let expectedLen = 12;
  for (const c of palette) {
    const nameLen = c.name.length + 1;
    const dataLen = 2 + nameLen * 2 + 4 + 12 + 2;
    expectedLen += 6 + dataLen;
  }
  eq(buf.length, expectedLen, 'ASE buffer total length matches computed block structure');

  // Spot-check the first block decodes back to red.
  let off = 12;
  eq(buf.readUInt16BE(off), 0x0001, 'first ASE block type is color entry (0x0001)');
  const blockLen = buf.readInt32BE(off + 2);
  off += 6;
  const nameLen = buf.readUInt16BE(off);
  eq(nameLen, 'Red'.length + 1, 'first ASE block name length includes null terminator');
  off += 2 + nameLen * 2;
  eq(buf.slice(off, off + 4).toString('ascii'), 'RGB ', 'first ASE block declares RGB color model');
  off += 4;
  const r = buf.readFloatBE(off); off += 4;
  const g = buf.readFloatBE(off); off += 4;
  const b = buf.readFloatBE(off);
  approx(r, 1, 0.001, 'first ASE block red channel decodes to 1.0');
  approx(g, 0, 0.001, 'first ASE block green channel decodes to 0.0');
  approx(b, 0, 0.001, 'first ASE block blue channel decodes to 0.0');
}

console.log('\n— Store: round-trip —');
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paletteforge-test-'));
  const data = store.defaultData();
  data.kits.push({
    id: 'abc', name: 'Acme Rebrand', client: 'Acme Inc.',
    palette: [{ hex: '#7c3aed', name: 'Primary', locked: true }, { hex: '#38bdf8', name: 'Accent', locked: false }],
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    logoPath: 'C:\\logos\\acme.png',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', order: 0,
  });

  const file = store.save(dir, data);
  ok(fs.existsSync(file), 'store: save writes the data file');
  const loaded = store.load(dir);
  assert.deepStrictEqual(loaded.kits, data.kits);
  passed++; console.log('  ✔ store: kits survive round-trip byte-for-byte');

  // corrupt file -> safe default + .corrupt backup
  fs.writeFileSync(store.dataFile(dir), '{not json', 'utf8');
  const recovered = store.load(dir);
  eq(recovered.kits.length, 0, 'store: corrupt file recovers to safe defaults');
  ok(fs.readdirSync(dir).some(f => f.includes('.corrupt-')), 'store: corrupt file preserved as backup');

  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('\n— Store: export / import fidelity —');
{
  const data = store.defaultData();
  data.kits.push({
    id: 'x1', name: 'Client, "Redesign"', client: 'Beta Co.',
    palette: [{ hex: '#f43f5e', name: 'Alert', locked: false }],
    fonts: { heading: 'Lora', body: 'Roboto' },
    logoPath: null,
    createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z', order: 0,
  });

  const json = store.exportJSON(data);
  const back = store.importJSON(json);
  assert.deepStrictEqual(back.kits, data.kits);
  passed++; console.log('  ✔ store export→import: kits identical');

  let threw = false;
  try { store.importJSON('{"app":"something-else"}'); } catch (_) { threw = true; }
  ok(threw, 'store import: rejects non-Paletteforge JSON');
}

console.log(`\nAll good — ${passed} assertions passed.\n`);
