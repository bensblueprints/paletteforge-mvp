# Launch Strategy — Paletteforge

## Positioning
"Coolors is $5–10/mo forever for a color wheel and an export button." Target freelance designers, indie devs, and small agencies who generate palettes constantly but resent paying rent for commodity color math. Named competitor: **Coolors Pro ($5–10/mo)**; secondary: Adobe Color, Khroma, Paletton.

## Target communities

| Community | Angle (rules-aware) |
|---|---|
| r/web_design | "What finally got me off Coolors Pro" post focused on the WCAG contrast checker + ASE export being built in, not paywalled. Mention the tool in comments per self-promo norms. |
| r/graphic_design | Brand-kit organization angle — client-tagged kits with fonts + logo in one place. Lead with a before/after workflow screenshot. |
| r/webdev | CSS custom properties + Tailwind config export straight from the palette — dev-facing angle, show the generated snippet. |
| r/selfhosted | "Local-first" resonates even as a desktop app — no cloud, no account, MIT source, zero network calls (even the font list is bundled, not fetched). |
| r/SideProject + r/opensource | Straight "I built this" posts are welcome; lead with the MIT repo and the k-means/ASE implementation details, not the paid installer. |
| Hacker News | Show HN (draft below) — HN likes correctly-implemented file formats (the hand-written ASE writer) and dependency-free logic modules. |

## Show HN draft

**Title:** Show HN: Paletteforge – a local-first color palette + brand kit tool you buy once

**Body:**
I kept hitting Coolors' paywall for things that are genuinely simple: image color extraction and ASE export. $8/month for a color wheel started to feel absurd, so I built Paletteforge — an Electron desktop app where the entire palette engine is a set of dependency-free, unit-tested modules: HSL-hue-math harmony generation, a from-scratch k-means implementation for image color extraction (deterministic farthest-point centroid init, no `Math.random()` in the algorithm itself), WCAG relative-luminance/contrast-ratio math, and a hand-written minimal ASE (Adobe Swatch Exchange) binary writer — no library, just the documented byte format.

Brand kits (palette + font pairing + logo reference, organized by client) live in one JSON file on disk. No account, no telemetry, no network calls at all — I even skipped the "Google Fonts picker" from my original plan because it implied a live fetch, and bundled a static font list instead.

Source is MIT on GitHub. There's a $15 packaged installer for people who don't want to `npm i`, which is the business model: pay once, own it forever.

## SEO keywords (10)

1. coolors alternative free
2. color palette generator offline
3. brand kit tool desktop
4. contrast checker wcag tool
5. one time purchase color palette tool
6. image color extraction app
7. k-means color palette generator
8. ase file export tool
9. offline design tool no subscription
10. local color palette generator windows

## AppSumo / PitchGround pitch

Paletteforge is the anti-subscription color tool: a polished, dark-mode desktop app with harmony-based palette generation, real k-means image color extraction, a built-in WCAG AA/AAA contrast checker, and client-organized brand kits (palette + fonts + logo) — exporting to CSS custom properties, a Tailwind config snippet, JSON, and a genuine binary ASE file that opens in Illustrator and Photoshop. The design-tool category prints subscription revenue ($5–10/mo) on commodity color math, which makes a lifetime deal irresistible to your audience: they instantly understand "Coolors Pro costs $180–360 over 3 years; this is $15 once." MIT-licensed source doubles as trust and community moat. Zero infrastructure cost per user means deep discount headroom for a launch campaign.

## Pricing math

- **Price: $15 one-time** (launch: $9)
- Coolors Pro: $8/mo (mid-tier) → Paletteforge **pays for itself in under 2 months**
- 1-year Coolors Pro: $96 (6.4× Paletteforge) · 3-year: $288 (19× Paletteforge)
- Anchor line for all copy: "Cheaper than 2 months of Coolors Pro. Yours for life."
