# Product Hunt Launch — Paletteforge

## Name
Paletteforge

## Tagline (60 chars)
The color palette + brand kit tool you buy once. No cloud.

## Description (260 chars)
Paletteforge is a local-first desktop palette generator: harmony rules, image color extraction (real k-means), a built-in WCAG contrast checker, brand kits with fonts + logo, and CSS/Tailwind/JSON/ASE export. $15 once instead of $5–10/month forever.

## Full description

Paletteforge is a desktop color tool for people who are tired of renting a color wheel.

**Why another palette tool?** Because Coolors Pro and friends are subscriptions — $5–10/month for palette generation, image extraction, and export formats that used to just be... a feature. Paletteforge is $15 once, MIT-licensed, and every brand kit lives in a single human-readable JSON file on your machine.

**What's actually inside:**
- Harmony-based generation — complementary, analogous, triadic, monochrome — computed live from HSL hue math, with lock-and-regenerate on individual swatches and per-swatch HSL sliders
- Real image color extraction: drop a photo or logo, get a dominant palette via k-means clustering on the actual pixel data (not a canned "average color" trick)
- A genuine WCAG contrast checker — relative luminance, contrast ratio, AA/AAA pass/fail badges for normal and large text, right next to your palette
- Brand kits: name a palette, pick heading/body fonts from a bundled list, attach a logo file reference, tag it by client, and organize as many as you need
- Export to CSS custom properties, a Tailwind config snippet, JSON, and a real binary ASE file that opens in Illustrator/Photoshop — plus a PNG palette card for sharing

No account. No telemetry. No network calls — not even for the font list, which is bundled locally instead of hitting Google Fonts. Pay once. Own it forever.

## Maker first comment

Hey PH 👋

I kept hitting Coolors' paywall for stuff that's genuinely simple math: image color extraction and ASE export. $8/month for a color wheel started to feel absurd, so I built Paletteforge — a desktop app where the entire palette engine (harmony generation, k-means image extraction, WCAG contrast, even the ASE binary writer) is a set of dependency-free modules with a real unit test suite. No mocks — the tests actually run k-means on synthetic red/blue pixel clusters and assert it recovers them, and they actually parse the ASE bytes back out to verify the format is correct.

One deliberate cut: the "Google Fonts picker" people expect from tools like this would mean a network call, which breaks the whole "100% local" premise. So I bundled ~25 solid system/web-safe fonts instead — no fetch, no API key, works on a plane.

$15 once. Source is MIT on GitHub if you want to check my color math or the ASE format implementation.

## Gallery shots (5)

1. **Hero — Generator view**: dark UI, a 5-swatch analogous palette with one locked swatch (padlock icon), HSL sliders expanded on the active swatch. Caption: "Generate, lock, fine-tune — in seconds."
2. **Extract view**: a product photo dropped in, canvas pixel data flowing into a 6-color extracted palette with population percentages. Caption: "Real k-means, not a canned average."
3. **Contrast checker**: a live text-on-background preview with the ratio number and four AA/AAA badges (two pass, two fail) visible. Caption: "Accessibility built in, not an afterthought."
4. **Brand kits grid**: multiple named kit cards (client-tagged) each showing a palette strip and font pairing. Caption: "Every client, one place."
5. **Export row**: the export buttons (CSS / Tailwind / JSON / ASE / PNG) with a terminal-style snippet of the generated CSS custom properties behind it. Caption: "Drop straight into your codebase."
