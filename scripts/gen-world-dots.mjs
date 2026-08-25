/**
 * Generates public/world-dots-<v>.svg — the dotted world map behind the
 * homepage's Designer Discovery band.
 *
 * WHY A GENERATOR AND NOT A CHECKED-IN BLOB: the output is ~1,500 <circle>
 * elements. Nobody can review that by eye, and nobody could regenerate it at a
 * different density without this file. Run it, look at the result, commit both.
 *
 * WHY AN <img> AND NOT INLINE SVG: inline, this is ~50 KB of markup on the
 * HTML of the busiest page on the site, re-sent on every request and parsed on
 * the main thread. As a static file in public/ it is fetched once and cached
 * (Railway serves public/ with max-age=14400) and compresses to a fraction of
 * that, because it is the most repetitive markup imaginable.
 *
 * NOTE §6: a file in public/ is never replaced in place — it is not
 * fingerprinted and Railway caches it for four hours. Bump the version in
 * OUT_NAME and update the reference; never overwrite an existing one.
 *
 *   node scripts/gen-world-dots.mjs [--step 3.2] [--out public/world-dots-v1.svg]
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';
const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), [])
);
const STEP = Number(args.step ?? 3.2);          // degrees between dots
const OUT = args.out ?? 'public/world-dots-v1.svg';

// Clipped to the inhabited band. Antarctica is a third of the height of a full
// -90..90 map and carries no brands, so including it shrinks every other
// continent for nothing.
const LAT_TOP = 83, LAT_BOTTOM = -56;
const W = 1000;
const H = Math.round((W / 360) * (LAT_TOP - LAT_BOTTOM));

const res = await fetch(SRC);
if (!res.ok) throw new Error(`world-atlas fetch failed: ${res.status}`);
const topo = await res.json();

// TopoJSON arcs are quantised and delta-encoded; decode to absolute lon/lat.
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const arcPoints = (i) => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
const ringToPoints = (ring) => {
  const pts = [];
  for (const i of ring) {
    const p = arcPoints(i);
    pts.push(...(pts.length ? p.slice(1) : p));   // arcs share endpoints
  }
  return pts;
};

const geoms = topo.objects.land.geometries ?? [topo.objects.land];
const polygons = [];
for (const g of geoms) {
  for (const poly of g.type === 'MultiPolygon' ? g.arcs : [g.arcs]) polygons.push(poly.map(ringToPoints));
}

// Ray-casting point-in-polygon. Land is a single MultiPolygon here, so a point
// inside an odd number of rings is land — holes (lakes) fall out for free.
const inRing = (ring, lon, lat) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const isLand = (lon, lat) => polygons.some((rings) => rings.some((r) => inRing(r, lon, lat)));

const px = (lon) => ((lon + 180) / 360) * W;
const py = (lat) => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * H;

const dots = [];
for (let lat = LAT_TOP; lat > LAT_BOTTOM; lat -= STEP) {
  for (let lon = -180; lon < 180; lon += STEP) {
    if (isLand(lon + STEP / 2, lat - STEP / 2)) dots.push([Math.round(px(lon)), Math.round(py(lat))]);
  }
}

// currentColor so one asset works on parchment and on aubergine. An <img> does
// NOT inherit it — the fill is written literally below for that reason, and the
// colour is the band's own dot colour.
const FILL = '#cfc4ae';
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="World map">` +
  `<g fill="${FILL}">` +
  dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('') +
  `</g></svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log(`${OUT}  step=${STEP}°  dots=${dots.length}  ${(svg.length / 1024).toFixed(1)} KB  viewBox=0 0 ${W} ${H}`);
