'use strict';

/* Paletteforge renderer. Plain JS, no framework, no build step.
   Pulls pure logic from src/color.js, src/kmeans.js, src/export.js,
   src/fonts.js (all attached to window by their own <script> tags). */

const C = window.PaletteforgeColor;
const K = window.PaletteforgeKMeans;
const X = window.PaletteforgeExport;
const FONT_LIST = window.PaletteforgeFonts.FONTS;

const state = {
  view: 'generator',
  base: '#7c3aed',
  harmony: 'analogous',
  count: 5,
  palette: [],           // [{hex, name, locked}]
  expandedIndex: -1,
  extracted: [],         // last k-means extraction result
  extractK: 5,
  extractImgSrc: null,
  contrast: { a: '#0b0f14', b: '#f4f6fb' },
  data: { kits: [] },
  editingKitId: null,
  editingKitPalette: [],
  editingLogoPath: null,
};

const viewEl = document.getElementById('view');
const toastEl = document.getElementById('toast');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.add('hidden'), 2400);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- harmony generation ----------

function computeHarmony(base, harmony, count) {
  if (harmony === 'complementary') return C.complementary(base);
  if (harmony === 'triadic') return C.triadic(base);
  if (harmony === 'analogous') return C.analogous(base, count);
  if (harmony === 'monochrome') return C.monochrome(base, count);
  return [base];
}

function regeneratePalette({ newBaseHex } = {}) {
  const base = newBaseHex || state.base;
  const hexes = computeHarmony(base, state.harmony, state.count);
  const next = hexes.map((hex, i) => {
    const existing = state.palette[i];
    if (existing && existing.locked) return existing;
    return { hex, name: (existing && existing.name) || `Color ${i + 1}`, locked: false };
  });
  state.palette = next;
  if (newBaseHex) state.base = newBaseHex;
  renderView();
}

function randomHex() {
  const h = Math.floor(Math.random() * 360);
  const s = 45 + Math.floor(Math.random() * 45);
  const l = 35 + Math.floor(Math.random() * 30);
  return C.hslToHex(h, s, l);
}

// ---------- view switching ----------

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  state.view = btn.dataset.view;
  renderView();
});

function renderView() {
  if (state.view === 'generator') return renderGenerator();
  if (state.view === 'extract') return renderExtract();
  if (state.view === 'contrast') return renderContrast();
  if (state.view === 'kits') return renderKits();
}

// ---------- GENERATOR ----------

const HARMONY_LABELS = {
  complementary: 'Complementary',
  analogous: 'Analogous',
  triadic: 'Triadic',
  monochrome: 'Monochrome',
};

function renderGenerator() {
  const showCount = state.harmony === 'analogous' || state.harmony === 'monochrome';
  viewEl.innerHTML = `
    <div class="panel">
      <h2>Palette Generator</h2>
      <div class="gen-controls">
        <div>
          <span class="field-label">Base color</span>
          <div class="base-color-picker">
            <input type="color" id="g-base-color" value="${state.base}">
            <input type="text" id="g-base-hex" value="${state.base}">
          </div>
        </div>
        <div>
          <span class="field-label">Harmony</span>
          <div class="seg" id="g-harmony">
            ${Object.entries(HARMONY_LABELS).map(([k, label]) => `
              <button data-h="${k}" class="${state.harmony === k ? 'active' : ''}">${label}</button>
            `).join('')}
          </div>
        </div>
        ${showCount ? `
        <div>
          <span class="field-label">Swatches</span>
          <div class="count-slider">
            <input type="range" id="g-count" min="3" max="8" value="${state.count}">
            <span>${state.count}</span>
          </div>
        </div>` : ''}
        <div>
          <button class="btn primary" id="g-shuffle">🎲 Shuffle</button>
        </div>
      </div>

      <div class="swatch-row" id="g-swatches"></div>

      <div class="export-row">
        <button class="btn" id="g-export-css">Export CSS</button>
        <button class="btn" id="g-export-tw">Export Tailwind</button>
        <button class="btn" id="g-export-json">Export JSON</button>
        <button class="btn" id="g-export-ase">Export ASE</button>
        <button class="btn" id="g-export-png">Export PNG card</button>
        <button class="btn primary" id="g-save-kit">Save as Brand Kit</button>
      </div>
    </div>
  `;

  if (state.palette.length === 0) regeneratePalette();
  else renderSwatches();

  document.getElementById('g-base-color').addEventListener('input', (e) => {
    document.getElementById('g-base-hex').value = e.target.value;
    regeneratePalette({ newBaseHex: e.target.value });
  });
  document.getElementById('g-base-hex').addEventListener('change', (e) => {
    try {
      const hex = C.normalizeHex(e.target.value);
      regeneratePalette({ newBaseHex: '#' + hex });
    } catch (_) { toast('Not a valid hex color'); }
  });
  document.getElementById('g-harmony').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    state.harmony = btn.dataset.h;
    state.palette = [];
    renderGenerator();
  });
  const countInput = document.getElementById('g-count');
  if (countInput) {
    countInput.addEventListener('input', (e) => {
      state.count = Number(e.target.value);
      state.palette = [];
      renderGenerator();
    });
  }
  document.getElementById('g-shuffle').addEventListener('click', () => {
    regeneratePalette({ newBaseHex: randomHex() });
  });

  document.getElementById('g-export-css').addEventListener('click', () => doExportText(
    X.toCSSVariables(state.palette), 'paletteforge-colors.css', 'CSS', ['css']
  ));
  document.getElementById('g-export-tw').addEventListener('click', () => doExportText(
    X.toTailwindConfig(state.palette), 'paletteforge-tailwind.js', 'JS', ['js']
  ));
  document.getElementById('g-export-json').addEventListener('click', () => doExportText(
    X.toJSON({ id: uid(), name: 'Palette Export', palette: state.palette }),
    'paletteforge-palette.json', 'JSON', ['json']
  ));
  document.getElementById('g-export-ase').addEventListener('click', () => doExportASE(state.palette));
  document.getElementById('g-export-png').addEventListener('click', () => exportPaletteCardPNG(state.palette));
  document.getElementById('g-save-kit').addEventListener('click', () => openKitModal(null, state.palette));
}

function renderSwatches() {
  const el = document.getElementById('g-swatches');
  if (!el) return;
  el.innerHTML = state.palette.map((c, i) => {
    const hsl = C.hexToHsl(c.hex);
    const expanded = state.expandedIndex === i;
    return `
      <div class="swatch ${expanded ? 'expanded' : ''}" data-i="${i}">
        <div class="swatch-color" style="background:${c.hex}" data-toggle="${i}">
          <div class="swatch-lock ${c.locked ? 'locked' : ''}" data-lock="${i}" title="Lock swatch">${c.locked ? '🔒' : '🔓'}</div>
        </div>
        <div class="swatch-body">
          <input class="swatch-hex-input" data-hexedit="${i}" value="${c.hex}">
          <div class="swatch-hsl">H${Math.round(hsl.h)} S${Math.round(hsl.s)}% L${Math.round(hsl.l)}%</div>
        </div>
        <div class="swatch-sliders">
          <label>Hue <span>${Math.round(hsl.h)}</span>
            <input type="range" min="0" max="359" value="${Math.round(hsl.h)}" data-slider="h" data-i="${i}">
          </label>
          <label>Saturation <span>${Math.round(hsl.s)}%</span>
            <input type="range" min="0" max="100" value="${Math.round(hsl.s)}" data-slider="s" data-i="${i}">
          </label>
          <label>Lightness <span>${Math.round(hsl.l)}%</span>
            <input type="range" min="0" max="100" value="${Math.round(hsl.l)}" data-slider="l" data-i="${i}">
          </label>
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('[data-toggle]').forEach(node => {
    node.addEventListener('click', () => {
      const i = Number(node.dataset.toggle);
      state.expandedIndex = state.expandedIndex === i ? -1 : i;
      renderSwatches();
    });
  });
  el.querySelectorAll('[data-lock]').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(node.dataset.lock);
      state.palette[i].locked = !state.palette[i].locked;
      renderSwatches();
    });
  });
  el.querySelectorAll('[data-hexedit]').forEach(node => {
    node.addEventListener('change', () => {
      const i = Number(node.dataset.hexedit);
      try {
        const hex = '#' + C.normalizeHex(node.value);
        state.palette[i].hex = hex;
        state.palette[i].locked = true;
        renderSwatches();
      } catch (_) { toast('Not a valid hex color'); renderSwatches(); }
    });
  });
  el.querySelectorAll('[data-slider]').forEach(node => {
    node.addEventListener('input', () => {
      const i = Number(node.dataset.i);
      const hsl = C.hexToHsl(state.palette[i].hex);
      const kind = node.dataset.slider;
      const v = Number(node.value);
      const next = {
        h: kind === 'h' ? v : hsl.h,
        s: kind === 's' ? v : hsl.s,
        l: kind === 'l' ? v : hsl.l,
      };
      state.palette[i].hex = C.hslToHex(next.h, next.s, next.l);
      state.palette[i].locked = true;
      renderSwatches();
    });
  });
}

// ---------- EXTRACT ----------

function renderExtract() {
  viewEl.innerHTML = `
    <div class="panel">
      <h2>Extract from Image</h2>
      <div class="dropzone" id="dz">
        <span class="dz-icon">🖼️</span>
        <div>Drop an image here, or click to browse</div>
        <div style="font-size:11px;margin-top:6px;">Processed locally with k-means — nothing leaves your machine</div>
        <input type="file" id="dz-input" accept="image/*">
      </div>
      <div class="panel-row" style="margin-top:16px;">
        <span class="field-label">Colors to extract</span>
        <div class="count-slider">
          <input type="range" id="ex-k" min="2" max="10" value="${state.extractK}">
          <span>${state.extractK}</span>
        </div>
      </div>
      <div class="extract-preview" id="ex-preview"></div>
    </div>
  `;

  const dz = document.getElementById('dz');
  const input = document.getElementById('dz-input');
  dz.addEventListener('click', () => input.click());
  ['dragenter', 'dragover'].forEach(evt => dz.addEventListener(evt, (e) => {
    e.preventDefault(); dz.classList.add('drag-over');
  }));
  ['dragleave', 'drop'].forEach(evt => dz.addEventListener(evt, (e) => {
    e.preventDefault(); dz.classList.remove('drag-over');
  }));
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });
  input.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleImageFile(file);
  });
  document.getElementById('ex-k').addEventListener('input', (e) => {
    state.extractK = Number(e.target.value);
    if (state.extractImgSrc) runExtraction();
    else renderExtract();
  });

  if (state.extractImgSrc) renderExtractPreview();
}

function handleImageFile(file) {
  const url = URL.createObjectURL(file);
  state.extractImgSrc = url;
  runExtraction();
}

function runExtraction() {
  const img = new Image();
  img.onload = () => {
    const maxDim = 220;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = [];
    // sample every pixel (image already downsized) skipping fully transparent
    for (let i = 0; i < imageData.data.length; i += 4) {
      const a = imageData.data[i + 3];
      if (a < 32) continue;
      pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
    }
    const clusters = K.kmeans(pixels, state.extractK);
    state.extracted = clusters.map(c => ({
      hex: C.rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]),
      name: 'Extracted',
      share: c.share,
      locked: false,
    }));
    renderExtractPreview();
  };
  img.src = state.extractImgSrc;
}

function renderExtractPreview() {
  const el = document.getElementById('ex-preview');
  if (!el) return;
  el.innerHTML = `
    <img src="${state.extractImgSrc}" alt="source">
    <div style="flex:1;">
      <div class="swatch-row" id="ex-swatches"></div>
      <div class="export-row">
        <button class="btn primary" id="ex-use">Use in Generator</button>
        <button class="btn" id="ex-save-kit">Save as Brand Kit</button>
      </div>
    </div>
  `;
  const swEl = document.getElementById('ex-swatches');
  swEl.innerHTML = state.extracted.map((c, i) => `
    <div class="swatch">
      <div class="swatch-color" style="background:${c.hex}"></div>
      <div class="swatch-body">
        <div class="swatch-hex">${c.hex}</div>
        <div class="swatch-hsl">${Math.round(c.share * 100)}% of pixels</div>
      </div>
    </div>
  `).join('');
  document.getElementById('ex-use').addEventListener('click', () => {
    state.palette = state.extracted.map((c, i) => ({ hex: c.hex, name: `Color ${i + 1}`, locked: false }));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'generator'));
    state.view = 'generator';
    renderView();
    toast('Palette loaded into Generator');
  });
  document.getElementById('ex-save-kit').addEventListener('click', () => {
    openKitModal(null, state.extracted.map((c, i) => ({ hex: c.hex, name: `Color ${i + 1}`, locked: false })));
  });
}

// ---------- CONTRAST ----------

function renderContrast() {
  const { a, b } = state.contrast;
  const normal = C.wcagReport(a, b, 'normal');
  const large = C.wcagReport(a, b, 'large');

  viewEl.innerHTML = `
    <div class="panel">
      <h2>Contrast Checker (WCAG)</h2>
      <div class="contrast-pickers">
        <div>
          <span class="field-label">Text color</span>
          <div class="base-color-picker">
            <input type="color" id="cx-a" value="${a}">
            <input type="text" id="cx-a-hex" value="${a}">
          </div>
        </div>
        <div>
          <span class="field-label">Background color</span>
          <div class="base-color-picker">
            <input type="color" id="cx-b" value="${b}">
            <input type="text" id="cx-b-hex" value="${b}">
          </div>
        </div>
        <button class="btn ghost" id="cx-swap">⇄ Swap</button>
      </div>

      <div class="contrast-card" style="margin-top:20px;">
        <div class="contrast-preview" style="background:${b};color:${a};">
          <div class="big">The quick brown fox jumps</div>
          <div class="small">over the lazy dog — 14px body text sample.</div>
        </div>
        <div class="contrast-meta">
          <div class="ratio-num">${normal.ratio}:1</div>
          <div class="badges">
            <span class="badge ${normal.aa ? 'pass' : 'fail'}">Normal text AA ${normal.aa ? 'PASS' : 'FAIL'}</span>
            <span class="badge ${normal.aaa ? 'pass' : 'fail'}">Normal text AAA ${normal.aaa ? 'PASS' : 'FAIL'}</span>
            <span class="badge ${large.aa ? 'pass' : 'fail'}">Large text AA ${large.aa ? 'PASS' : 'FAIL'}</span>
            <span class="badge ${large.aaa ? 'pass' : 'fail'}">Large text AAA ${large.aaa ? 'PASS' : 'FAIL'}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const syncA = (v) => { state.contrast.a = v; renderContrast(); };
  const syncB = (v) => { state.contrast.b = v; renderContrast(); };
  document.getElementById('cx-a').addEventListener('input', (e) => syncA(e.target.value));
  document.getElementById('cx-b').addEventListener('input', (e) => syncB(e.target.value));
  document.getElementById('cx-a-hex').addEventListener('change', (e) => {
    try { syncA('#' + C.normalizeHex(e.target.value)); } catch (_) { toast('Not a valid hex color'); }
  });
  document.getElementById('cx-b-hex').addEventListener('change', (e) => {
    try { syncB('#' + C.normalizeHex(e.target.value)); } catch (_) { toast('Not a valid hex color'); }
  });
  document.getElementById('cx-swap').addEventListener('click', () => {
    const t = state.contrast.a;
    state.contrast.a = state.contrast.b;
    state.contrast.b = t;
    renderContrast();
  });
}

// ---------- KITS ----------

function renderKits() {
  const kits = state.data.kits || [];
  viewEl.innerHTML = `
    <div class="panel">
      <div class="panel-row" style="justify-content:space-between;">
        <h2 style="margin:0;">Brand Kits</h2>
        <button class="btn primary" id="kit-new">+ New Kit</button>
      </div>
      ${kits.length === 0 ? `
        <div class="empty-state">
          <span class="dz-icon">🗂️</span>
          No brand kits yet. Build a palette in the Generator or Extract tab, then "Save as Brand Kit".
        </div>
      ` : `<div class="kits-grid" id="kits-grid" style="margin-top:16px;"></div>`}
    </div>
  `;
  document.getElementById('kit-new').addEventListener('click', () => openKitModal(null, state.palette.length ? state.palette : [
    { hex: '#7c3aed', name: 'Color 1', locked: false },
    { hex: '#38bdf8', name: 'Color 2', locked: false },
  ]));

  const grid = document.getElementById('kits-grid');
  if (grid) {
    grid.innerHTML = kits.map(k => `
      <div class="kit-card" data-kit="${k.id}">
        <div class="kit-swatches">${k.palette.map(c => `<span style="background:${c.hex}"></span>`).join('')}</div>
        <div class="kit-card-body">
          <h3>${escapeHtml(k.name)}</h3>
          <div class="client">${escapeHtml(k.client || 'No client')}</div>
          <div class="fonts">${escapeHtml(k.fonts.heading)} / ${escapeHtml(k.fonts.body)}</div>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('[data-kit]').forEach(card => {
      card.addEventListener('click', () => {
        const kit = kits.find(k => k.id === card.dataset.kit);
        if (kit) openKitModal(kit, kit.palette);
      });
    });
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- kit modal ----------

const modal = document.getElementById('modal');
const fName = document.getElementById('f-name');
const fClient = document.getElementById('f-client');
const fPalette = document.getElementById('f-palette');
const fFontHeading = document.getElementById('f-font-heading');
const fFontBody = document.getElementById('f-font-body');
const fLogoPath = document.getElementById('f-logo-path');
const btnDelete = document.getElementById('btn-delete');

[fFontHeading, fFontBody].forEach(sel => {
  sel.innerHTML = FONT_LIST.map(f => `<option value="${f}">${f}</option>`).join('');
});

function openKitModal(kit, palette) {
  state.editingKitId = kit ? kit.id : null;
  state.editingKitPalette = (palette || []).map(c => ({ ...c }));
  state.editingLogoPath = kit ? kit.logoPath : null;

  document.getElementById('modal-title').textContent = kit ? 'Edit Brand Kit' : 'Save Brand Kit';
  fName.value = kit ? kit.name : '';
  fClient.value = kit ? kit.client || '' : '';
  fFontHeading.value = kit ? kit.fonts.heading : 'Inter';
  fFontBody.value = kit ? kit.fonts.body : 'Inter';
  fLogoPath.value = state.editingLogoPath || '';
  document.getElementById('f-clear-logo').classList.toggle('hidden', !state.editingLogoPath);
  btnDelete.classList.toggle('hidden', !kit);

  fPalette.innerHTML = state.editingKitPalette.map(c => `<span style="background:${c.hex}" title="${c.hex}"></span>`).join('');

  modal.classList.remove('hidden');
}

function closeKitModal() {
  modal.classList.add('hidden');
}

document.getElementById('btn-cancel').addEventListener('click', closeKitModal);

document.getElementById('f-pick-logo').addEventListener('click', async () => {
  const res = await window.paletteforge.pickLogo();
  if (res.ok) {
    state.editingLogoPath = res.path;
    fLogoPath.value = res.path;
    document.getElementById('f-clear-logo').classList.remove('hidden');
  }
});
document.getElementById('f-clear-logo').addEventListener('click', () => {
  state.editingLogoPath = null;
  fLogoPath.value = '';
  document.getElementById('f-clear-logo').classList.add('hidden');
});

btnDelete.addEventListener('click', async () => {
  if (!state.editingKitId) return;
  state.data.kits = state.data.kits.filter(k => k.id !== state.editingKitId);
  await persist();
  closeKitModal();
  renderKits();
  toast('Kit deleted');
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const name = fName.value.trim();
  if (!name) { toast('Give the kit a name'); return; }
  if (!state.editingKitPalette.length) { toast('Palette is empty'); return; }

  const now = new Date().toISOString();
  if (state.editingKitId) {
    const kit = state.data.kits.find(k => k.id === state.editingKitId);
    kit.name = name;
    kit.client = fClient.value.trim();
    kit.palette = state.editingKitPalette;
    kit.fonts = { heading: fFontHeading.value, body: fFontBody.value };
    kit.logoPath = state.editingLogoPath;
    kit.updatedAt = now;
  } else {
    state.data.kits.push({
      id: uid(),
      name,
      client: fClient.value.trim(),
      palette: state.editingKitPalette,
      fonts: { heading: fFontHeading.value, body: fFontBody.value },
      logoPath: state.editingLogoPath,
      createdAt: now,
      updatedAt: now,
      order: state.data.kits.length,
    });
  }
  await persist();
  closeKitModal();
  state.view = 'kits';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'kits'));
  renderKits();
  toast('Brand kit saved');
});

// ---------- export helpers ----------

async function doExportText(content, defaultPath, filterName, extensions) {
  const res = await window.paletteforge.exportText({ content, defaultPath, filterName, extensions, title: 'Export' });
  if (res.ok) toast('Exported to ' + res.path);
  else if (!res.canceled) toast('Export failed: ' + (res.error || 'unknown error'));
}

async function doExportASE(palette) {
  // ASE encoding uses Node's Buffer, which the sandboxed renderer doesn't
  // have — hand the plain palette data to main and let it build + write
  // the binary file (see src/export.js toASE(), invoked from main.js).
  const res = await window.paletteforge.exportASE(palette, 'paletteforge-palette.ase');
  if (res.ok) toast('Exported to ' + res.path);
  else if (!res.canceled) toast('Export failed: ' + (res.error || 'unknown error'));
}

function exportPaletteCardPNG(palette) {
  const w = 900, swatchH = 220, labelH = 60;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = swatchH + labelH;
  const ctx = canvas.getContext('2d');
  const n = palette.length;
  const cw = w / n;
  palette.forEach((c, i) => {
    ctx.fillStyle = c.hex;
    ctx.fillRect(i * cw, 0, cw, swatchH);
    const hsl = C.hexToHsl(c.hex);
    ctx.fillStyle = hsl.l > 55 ? '#111' : '#fff';
    ctx.font = '13px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(c.hex.toUpperCase(), i * cw + cw / 2, swatchH - 14);
  });
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, swatchH, w, labelH);
  ctx.fillStyle = '#e7edf3';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Made with Paletteforge', 16, swatchH + 36);

  const dataUrl = canvas.toDataURL('image/png');
  window.paletteforge.exportPNG({ dataUrl, defaultPath: 'paletteforge-card.png', title: 'Export palette card' })
    .then(res => {
      if (res.ok) toast('Exported to ' + res.path);
      else if (!res.canceled) toast('Export failed: ' + (res.error || 'unknown error'));
    });
}

// ---------- import / persist ----------

document.getElementById('btn-import').addEventListener('click', async () => {
  const res = await window.paletteforge.importJSON();
  if (res.ok) {
    state.data = res.data;
    toast('Data imported');
    if (state.view === 'kits') renderKits();
  } else if (!res.canceled) {
    toast('Import failed: ' + (res.error || 'unknown error'));
  }
});

async function persist() {
  await window.paletteforge.saveData(state.data);
}

// ---------- boot ----------

(async function boot() {
  try {
    state.data = await window.paletteforge.loadData();
  } catch (_) {
    state.data = { kits: [] };
  }
  renderView();
})();
