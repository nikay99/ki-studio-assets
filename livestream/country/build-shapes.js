// Baut public/shapes.json aus Natural Earth (gemeinfrei, über das npm-Paket world-atlas 2.0.2, Auflösung 1:50 Mio.).
// Nur einmal nötig, nicht auf der VM: npm i world-atlas@2.0.2 d3-geo@3.1.1 topojson-client@3.1.0 && node build-shapes.js
// Jedes Land bekommt eine eigene flächentreue Projektion um seine Mitte (kein Mercator-Zerrbild) und passt in W×H.
const fs = require('fs'), path = require('path');
const d3 = require('d3-geo'), topo = require('topojson-client');
const W = 820, H = 335, MW = 360, MH = 180;   // Umriss-Feld und kleine Weltkarte (Tipp 2)
const GAME = require('./countries-game.json');
const world = require('world-atlas/countries-50m.json'), world110 = require('world-atlas/land-110m.json');
const feats = topo.feature(world, world.objects.countries).features;
const ATLAS = { US: 'United States of America', GB: 'United Kingdom', AE: 'United Arab Emirates', BA: 'Bosnia and Herz.', CI: "Côte d'Ivoire",
  CD: 'Dem. Rep. Congo', MK: 'Macedonia', SS: 'S. Sudan' };
const { COUNTRY_LIST } = require('../public/countries.js');
const NAME = Object.fromEntries(COUNTRY_LIST.map(c => [c[0], c[1]]));
// Weit entfernte Inseln/Gebiete weglassen (Alaska, Hawaii, Französisch-Guayana, Svalbard, Galápagos …), sonst schrumpft das Land
const MAXKM = { US: 2600, FR: 1200, NO: 800, JP: 1200, NL: 400, ES: 1100, PT: 400, EC: 600, CL: 900, NZ: 1200, DK: 500, GB: 1000, IT: 1000, GR: 900, YE: 600, MX: 2400, CO: 1100, VE: 900 };

// Ein Pfad-Kontext, der Punkte unter 1,4 px Abstand auslässt (Datei bleibt klein, Umriss sieht gleich aus)
function pathStr(proj, geo) {
  let s = '', lx = 0, ly = 0, first = true, n = 0;
  const ctx = {
    moveTo(x, y) { s += 'M' + x.toFixed(1) + ' ' + y.toFixed(1); lx = x; ly = y; n = 0; },
    lineTo(x, y) { if (Math.hypot(x - lx, y - ly) < 1.4) return; s += 'L' + x.toFixed(1) + ' ' + y.toFixed(1); lx = x; ly = y; n++; },
    closePath() { s += 'Z'; }, arc() {},
  };
  d3.geoPath(proj, ctx)(geo); return s;
}
function polys(f) { return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; }

const out = {};
for (const [code] of GAME) {
  const nm = ATLAS[code] || NAME[code];
  const f = feats.find(x => x.properties.name === nm);
  if (!f) { console.error('fehlt im Atlas:', code, nm); continue; }
  const ps = polys(f).map(c => ({ c, g: { type: 'Polygon', coordinates: c } })).map(p => ({ ...p, a: d3.geoArea(p.g), m: d3.geoCentroid(p.g) }));
  const main = ps.reduce((a, b) => b.a > a.a ? b : a);
  const lim = (MAXKM[code] || 2000) / 6371;
  const keep = ps.filter(p => p === main || (d3.geoDistance(p.m, main.m) < lim && p.a > main.a * 0.0004) || (!MAXKM[code] && p.a > main.a * 0.1));
  const geo = { type: 'MultiPolygon', coordinates: keep.map(p => p.c) };
  const cen = d3.geoCentroid(geo);
  const proj = d3.geoAzimuthalEqualArea().rotate([-cen[0], -cen[1]]).fitExtent([[6, 6], [W - 6, H - 6]], geo);
  const [[x0, y0], [x1, y1]] = d3.geoPath(proj).bounds(geo);
  out[code] = { d: pathStr(proj, geo), box: [x0, y0, x1 - x0, y1 - y0].map(v => +v.toFixed(1)), ll: cen.map(v => +v.toFixed(2)) };
}
// Kleine Weltkarte (Equal Earth) als Ort-Tipp; der Punkt wird im Browser aus ll berechnet → Projektion hier fest mitgeben
const land = topo.feature(world110, world110.objects.land);
const wp = d3.geoEqualEarth().fitExtent([[2, 2], [MW - 2, MH - 2]], { type: 'Sphere' });
for (const c in out) { const p = wp(out[c].ll); out[c].dot = p.map(v => +v.toFixed(1)); }
const res = { W, H, MW, MH, world: pathStr(wp, land), shapes: out };
fs.writeFileSync(path.join(__dirname, 'public/shapes.json'), JSON.stringify(res));
console.log(Object.keys(out).length, 'Länder,', (JSON.stringify(res).length / 1024).toFixed(0), 'KB');
