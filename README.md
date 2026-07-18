# 🎨 Paletteforge

## Demo



https://github.com/user-attachments/assets/398c8423-02b8-4d78-a78e-60aa5d7eb7ab



[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**The desktop color palette generator and brand kit organizer you buy once and own forever.** Harmony-based palette generation, image color extraction, a real WCAG contrast checker, brand kits with fonts and logo references, and export to CSS/Tailwind/JSON/ASE — 100% local, zero subscription, zero cloud, zero telemetry.

Coolors Pro charges **$5–10/month, forever**, for a color wheel and an export button. Paletteforge is **$15 once**. Your brand assets are not a subscription.

![Paletteforge screenshot](docs/screenshot.png)

## ☕ Skip the setup — get the 1-click installer

Don't want to touch a terminal? Grab the packaged Windows installer (and support development):

**→ [Get Paletteforge on Whop](https://whop.com/benjisaiempire/paletteforge)** — pay once, own it forever.

## Features

- 🎨 **Palette generator** — complementary, analogous, triadic, and monochrome harmony rules computed from a base color via HSL hue-rotation math
- 🔒 **Lock & regenerate** — lock the swatches you love, shuffle the rest
- 🎚️ **Per-swatch HSL sliders** — fine-tune hue, saturation, and lightness on any color, or type a hex directly
- 🖼️ **Image color extraction** — drop an image, pull a dominant-color palette via real k-means clustering on the pixel data (Canvas2D `getImageData` in the renderer, pure Node-testable k-means in `src/kmeans.js`)
- ✅ **WCAG contrast checker** — relative-luminance + contrast-ratio math for any two colors, with live AA/AAA pass/fail badges for normal text (4.5:1 / 7:1) and large text (3:1 / 4.5:1)
- 🗂️ **Brand kits** — save a named palette + heading/body font pairing + a logo file-path reference into a kit; organize multiple kits, optionally tagged by client name
- 📤 **Export everything** — CSS custom properties, a Tailwind config color-extension snippet, JSON, a real binary ASE (Adobe Swatch Exchange) file readable by Illustrator/Photoshop, and a PNG palette card
- 🌑 Premium dark UI with a live palette preview, keyboard-friendly, fast

## Quick start

```bash
git clone https://github.com/bensblueprints/paletteforge
cd paletteforge
npm i
npm start
```

Run the tests (color math + k-means + export formats + store round-trip):

```bash
npm test
```

Build the Windows installer:

```bash
npm run dist
```

## Paletteforge vs Coolors Pro

| | **Paletteforge** | Coolors Pro |
|---|---|---|
| Price | **$15 once** | $5–10/mo ($60–120/yr) |
| Cost after 3 years | **$15** | $180–360 |
| Your data lives | **On your machine** | Their cloud |
| Works offline | **Always** | Partially |
| Account required | **No** | Yes |
| Telemetry | **None** | Analytics SDKs |
| Image color extraction (k-means) | **Yes** | Yes (Pro) |
| WCAG AA/AAA contrast checker | **Yes, built in** | Limited |
| Brand kits (palette + fonts + logo) | **Yes** | Pro-tier |
| ASE export (Illustrator/Photoshop) | **Yes** | Pro-tier |
| Export your data | **JSON, one click** | Limited |
| Source code | **MIT, right here** | Closed |

## Tech stack

- **Electron** — main + preload (context-isolated, sandboxed) + plain HTML/CSS/JS renderer. No framework, no build step.
- **Pure color engine** (`src/color.js`) — zero dependencies: hex/RGB/HSL conversion, harmony generators, WCAG relative luminance + contrast ratio. Runs identically in the renderer and under Node for tests.
- **Pure k-means module** (`src/kmeans.js`) — zero dependencies, deterministic farthest-point centroid init, operates on plain `[r,g,b]` pixel arrays. The renderer only supplies pixels (via Canvas2D); all the clustering math is independently Node-testable.
- **Pure export module** (`src/export.js`) — CSS variables, Tailwind snippet, JSON round-trip, and a hand-written minimal ASE binary writer (no library — the format is simple enough to implement correctly: `ASEF` signature, version, block count, then UTF-16BE-named RGB float color blocks).
- **JSON store** (`src/store.js`) — atomic writes, corrupt-file recovery, schema normalization. Data lives in Electron `userData` as `paletteforge-data.json`.
- **electron-builder** — Windows NSIS one-click installer.

## Deviations from the original plan

The plan file called for two things that don't fit the onetime-suite build spec, and both were changed on purpose:

1. **SQLite → single JSON file.** The plan specified a SQLite `kits`/`colors`/`fonts` schema. Paletteforge instead uses one JSON file (`src/store.js`) holding all brand kits, matching the pattern used across this suite (e.g. `habit-tracker`): atomic writes (write-to-`.tmp`-then-rename), corrupt-file detection with an automatic `.corrupt-<timestamp>` backup, and schema normalization on load. For a data set this size (a handful of brand kits per user), a JSON file is simpler, has zero native-module build headaches, and is trivially human-readable/portable.
2. **Google Fonts picker → bundled static font list.** The plan mentioned a "Google Fonts picker," which implies a live network call to `fonts.googleapis.com` — that conflicts with this suite's "100% local, no network calls" rule. Paletteforge instead ships a curated static list of ~25 popular web-safe/system font family names (`src/fonts.js`) — Inter, Roboto, Georgia, Helvetica, and so on. Pick a heading/body pairing from the list; it works fully offline, with no API key and no fetch, forever.

## Data & privacy

Everything stays on your machine. Paletteforge makes **no network calls at all** — image color extraction runs entirely in-process via Canvas2D pixel data and a local k-means implementation. Your brand kits are one human-readable JSON file in your user folder.

## License

[MIT](LICENSE) © 2026 Ben (bensblueprints)

## macOS build

See [MAC-BUILD.md](MAC-BUILD.md). Quickest path: GitHub **Actions** tab -> run the **Mac Build** (`mac-build.yml`) workflow to get a downloadable `.dmg` (unsigned - right-click -> Open on first launch).
