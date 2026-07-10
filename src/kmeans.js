/**
 * Paletteforge — pure k-means clustering over [r,g,b] pixel triples.
 * No Electron, no DOM, no Canvas. The renderer pulls pixels out of an
 * image via Canvas2D getImageData and hands this module a plain array
 * of [r,g,b] triples; this module does the math.
 *
 * Deterministic: centroid initialization uses farthest-point sampling
 * (max-min distance), never Math.random(), so results are reproducible
 * and unit-testable.
 */

'use strict';

function distSq(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/** Deterministic farthest-point-sampling init: pick pixels that maximize
 *  the minimum distance to already-chosen centroids. */
function initCentroids(pixels, k) {
  const centroids = [pixels[0].slice()];
  while (centroids.length < k) {
    let bestPixel = null;
    let bestDist = -1;
    for (const p of pixels) {
      let minD = Infinity;
      for (const c of centroids) {
        const d = distSq(p, c);
        if (d < minD) minD = d;
      }
      if (minD > bestDist) {
        bestDist = minD;
        bestPixel = p;
      }
    }
    centroids.push(bestPixel.slice());
  }
  return centroids;
}

/**
 * K-means over pixel triples.
 * @param {Array<[number,number,number]>} pixels
 * @param {number} k
 * @param {{maxIterations?: number}} [opts]
 * @returns {Array<{rgb:[number,number,number], count:number, share:number}>}
 *   Sorted descending by cluster population (dominant color first).
 */
function kmeans(pixels, k, opts = {}) {
  if (!Array.isArray(pixels) || pixels.length === 0) return [];
  const maxIterations = opts.maxIterations || 25;
  k = Math.max(1, Math.min(Math.floor(k) || 1, pixels.length));

  let centroids = initCentroids(pixels, k);
  let assignments = new Array(pixels.length).fill(-1);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // assignment step
    for (let i = 0; i < pixels.length; i++) {
      let bestC = 0, bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = distSq(pixels[i], centroids[c]);
        if (d < bestD) { bestD = d; bestC = c; }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }

    // update step
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      sums[c][3] += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] > 0) {
        centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
      }
    }

    if (!changed && iter > 0) break;
  }

  const counts = new Array(centroids.length).fill(0);
  for (const a of assignments) counts[a]++;

  const total = pixels.length;
  return centroids
    .map((c, i) => ({
      rgb: [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])],
      count: counts[i],
      share: total === 0 ? 0 : counts[i] / total,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Small deterministic PRNG (mulberry32) — useful for generating
 *  reproducible synthetic test fixtures / jitter without Math.random(). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PaletteforgeKMeans = { kmeans, mulberry32, distSq };

if (typeof module !== 'undefined' && module.exports) module.exports = PaletteforgeKMeans;
if (typeof window !== 'undefined') window.PaletteforgeKMeans = PaletteforgeKMeans;
