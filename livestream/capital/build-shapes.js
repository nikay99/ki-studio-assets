// Baut public/shapes.json für „Guess the Capital“ aus Natural Earth (gemeinfrei, npm world-atlas 2.0.2, 1:50 Mio.).
// Gleiche Projektion wie country/build-shapes.js (flächentreu um die Landesmitte), dazu die Lage der Hauptstadt im Umriss (cap).
// Nur einmal nötig, nicht auf der VM: npm i world-atlas@2.0.2 d3-geo@3.1.1 topojson-client@3.1.0 && node build-shapes.js
const fs = require('fs'), path = require('path');
const d3 = require('d3-geo'), topo = require('topojson-client');
const W = 820, H = 335;
const GAME = require('./capitals-game.json');   // [ISO2, Hauptstadt, Aliase, Stufe, Falle (größte Stadt), Breite, Länge]
const world = require('world-atlas/countries-50m.json');
const feats = topo.feature(world, world.objects.countries).features;
const ATLAS = { US: 'United States of America', GB: 'United Kingdom', AE: 'United Arab Emirates', BA: 'Bosnia and Herz.', CI: "Côte d'Ivoire",
  CD: 'Dem. Rep. Congo', MK: 'Macedonia', SS: 'S. Sudan' };
const { COUNTRY_LIST } = require('../public/countries.js');
const NAME = Object.fromEntries(COUNTRY_LIST.map(c => [c[0], c[1]]));
const MAXKM = { US: 2600, FR: 1200, NO: 800, JP: 1200, NL: 400, ES: 1100, PT: 400, EC: 600, CL: 900, NZ: 1200, DK: 500, GB: 1000, IT: 1000, GR: 900, YE: 600, MX: 2400, CO: 1100, VE: 900 };

function pathStr(proj, geo) {
  let s = '', lx = 0, ly = 0;
  const ctx = {
    moveTo(x, y) { s += 'M' + x.toFixed(1) + ' ' + y.toFixed(1); lx = x; ly = y; },
    lineTo(x, y) { if (Math.hypot(x - lx, y - ly) < 1.4) return; s += 'L' + x.toFixed(1) + ' ' + y.toFixed(1); lx = x; ly = y; },
    closePath() { s += 'Z'; }, arc() {},
  };
  d3.geoPath(proj, ctx)(geo); return s;
}
const polys = f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;

const out = {};
for (const [code, , , , , lat, lon] of GAME) {
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
  out[code] = { d: pathStr(proj, geo), cap: proj([lon, lat]).map(v => +v.toFixed(1)) };
}
fs.writeFileSync(path.join(__dirname, 'public/shapes.json'), JSON.stringify({ W, H, shapes: out }));
console.log(Object.keys(out).length, 'Länder');
