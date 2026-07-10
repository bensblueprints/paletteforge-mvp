/**
 * Paletteforge — bundled font list.
 *
 * The original plan called for a "Google Fonts picker," which implies a
 * live network call to fonts.googleapis.com. That conflicts with the
 * onetime-suite rule that every app is 100% local with no network calls.
 * Instead we ship a curated static list of ~25 popular, broadly-available
 * web-safe / system font family names. No fetch, no API key, no internet
 * required — pick a heading/body pairing and it just works, offline,
 * forever. See README "Deviations from the plan" for details.
 */

'use strict';

const FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Nunito',
  'Raleway',
  'Work Sans',
  'Rubik',
  'Playfair Display',
  'Merriweather',
  'Lora',
  'PT Serif',
  'Georgia',
  'Times New Roman',
  'Helvetica',
  'Helvetica Neue',
  'Arial',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Courier New',
  'Consolas',
  'Segoe UI',
  'system-ui',
];

const PaletteforgeFonts = { FONTS };

if (typeof module !== 'undefined' && module.exports) module.exports = PaletteforgeFonts;
if (typeof window !== 'undefined') window.PaletteforgeFonts = PaletteforgeFonts;
