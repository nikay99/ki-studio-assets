// Pixi-Zeichenschicht (Test, Niklas 07.10.): Hintergrund, Bahn und Kugeln laufen auf der Grafikkarte (WebGL),
// alles mit Text (Kopfzeile, Seitenleisten, Ansagen, Namen) zeichnet race-pixi.html weiter auf das 2D-Canvas darüber.
// Neu gegenüber Canvas 2D: echtes Leuchten (Bloom), Lichtspuren hinter den Kugeln, Funken an den Stiften,
// weiche Kugel-Schatten und ruhig schwebende Jahrmarkt-Lichter im Hintergrund.
(() => {
const PX = window.PX = { ready: false };
const softDot = (() => {   // weicher runder Lichtpunkt als Textur (für Lichter, Spuren, Funken, Schatten)
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
})();
let app, root, bgSprite, bgKey = '', lights, col, world, glowC, trackC, dyn, trails, shadows, ballsC, sparksC, bloom;
let dotTex, trackFor = null, sparks = [], lightList = [];
const ballTex = new Map();
const hex = s => parseInt(s.slice(1), 16);

PX.init = async (canvas, outW, outH, sc, geo) => {
  Object.assign(PX, geo);
  app = new PIXI.Application();
  await app.init({ canvas, width: outW, height: outH, antialias: true, autoStart: false, background: '#000000', preference: 'webgl', powerPreference: 'high-performance' });
  dotTex = PIXI.Texture.from(softDot);
  root = new PIXI.Container(); root.scale.set(sc); app.stage.addChild(root);
  bgSprite = new PIXI.Sprite(); root.addChild(bgSprite);
  lights = new PIXI.Container(); root.addChild(lights);
  col = new PIXI.Container(); col.x = geo.CX; root.addChild(col);
  const mask = new PIXI.Graphics().rect(geo.CX, 0, geo.CW, geo.H).fill(0xffffff); root.addChild(mask); col.mask = mask;
  world = new PIXI.Container(); col.addChild(world);
  trackC = new PIXI.Container(); dyn = new PIXI.Graphics(); trails = new PIXI.Container(); shadows = new PIXI.Container();
  ballsC = new PIXI.Container(); sparksC = new PIXI.Container();
  trails.blendMode = 'add'; sparksC.blendMode = 'add';
  glowC = new PIXI.Container(); glowC.addChild(trackC, dyn, trails, sparksC);   // nur Bahn, Spuren und Funken leuchten, Kugeln bleiben scharf
  world.addChild(glowC, shadows, ballsC);
  if (PIXI.filters && PIXI.filters.AdvancedBloomFilter) {
    bloom = new PIXI.filters.AdvancedBloomFilter({ threshold: 0.6, bloomScale: 0.55, brightness: 1.0, blur: 4, quality: 4 });
    glowC.filters = [bloom];
  }
  // Jahrmarkt-Lichter: wenige große, unscharfe Lichtpunkte, die langsam schweben und sanft auf- und abglimmen (kein Blinken)
  for (let i = 0; i < 34; i++) {
    const s = new PIXI.Sprite(dotTex); s.anchor.set(0.5); s.blendMode = 'add';
    const L = { s, x: Math.random() * geo.W, y: Math.random() * geo.H, r: 40 + Math.random() * 120, vx: (Math.random() - 0.5) * 0.15, vy: -0.05 - Math.random() * 0.15, ph: Math.random() * 6.3, sp: 0.004 + Math.random() * 0.006, k: i % 3 };
    lights.addChild(s); lightList.push(L);
  }
  PX.ready = true;
};

function background(pal) {   // Verlauf einmal pro Palette als Textur
  const key = pal.bg.join(); if (key === bgKey) return; bgKey = key;
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, pal.bg[0]); gr.addColorStop(1, pal.bg[1]);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  bgSprite.texture = PIXI.Texture.from(c); bgSprite.width = PX.W; bgSprite.height = PX.H;
}

// Bahn: die vorgezeichnete Strecke (trackLayer) in Streifen als Texturen (WebGL-Höchstmaß 8192 px Höhe)
function setTrack(layer) {
  if (trackFor === layer) return; trackFor = layer;
  for (const ch of trackC.removeChildren()) ch.destroy({ texture: true, textureSource: true });
  const STRIP = 2048;
  for (let y = 0; y < layer.height; y += STRIP) {
    const h = Math.min(STRIP, layer.height - y), c = document.createElement('canvas'); c.width = layer.width; c.height = h;
    c.getContext('2d').drawImage(layer, 0, y, layer.width, h, 0, 0, layer.width, h);
    const s = new PIXI.Sprite(PIXI.Texture.from(c)); s.y = y; trackC.addChild(s);
  }
  for (const ch of ballsC.removeChildren()) ch.destroy(); for (const ch of shadows.removeChildren()) ch.destroy();
  for (const ch of trails.removeChildren()) ch.destroy(); for (const ch of sparksC.removeChildren()) ch.destroy(); sparks = [];
}

PX.spark = (x, y, col) => {   // Funken, wenn eine Kugel einen Stift trifft
  if (sparks.length > 160) return;
  for (let i = 0; i < 5; i++) {
    const s = new PIXI.Sprite(dotTex); s.anchor.set(0.5); s.tint = hex(col); const a = Math.random() * 6.3, v = 1.5 + Math.random() * 3;
    sparksC.addChild(s); sparks.push({ s, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, t: 0, life: 18 + Math.random() * 14 });
  }
};

PX.draw = st => {   // st: {pal, camY, trackLayer, statics, spinners, balls, rank, phase, R, ballSprite}
  background(st.pal); setTrack(st.trackLayer);
  const now = performance.now(), cols = [hex(st.pal.peg), hex(st.pal.ramp), hex(st.pal.paddle)];
  for (const L of lightList) {
    L.x += L.vx; L.y += L.vy; if (L.y < -L.r) { L.y = PX.H + L.r; L.x = Math.random() * PX.W }
    L.s.x = L.x; L.s.y = L.y; L.s.width = L.s.height = L.r * 2; L.s.tint = cols[L.k];
    L.s.alpha = 0.03 + 0.05 * (1 + Math.sin(now * L.sp * 0.06 + L.ph)) / 2;
  }
  world.y = -st.camY;
  // Paddel und Startgitter bewegen sich → jedes Bild neu
  dyn.clear();
  for (const s of st.spinners.concat(st.statics.filter(s => s.gate))) {
    const v = s.vertices; dyn.poly(v.flatMap(p => [p.x, p.y])).fill(hex(s.col));
  }
  // Kugeln, Schatten und Lichtspuren
  const vis = st.balls.filter(b => b.position.y > st.camY - 60 && b.position.y < st.camY + PX.H + 60);
  const top = new Map(st.phase === 'race' ? st.rank.slice(0, 3).map((b, i) => [b, [0xffd700, 0xe5e7eb, 0xcd7f32][i]]) : []);
  while (ballsC.children.length < vis.length) { const s = new PIXI.Sprite(); s.anchor.set(0.5); ballsC.addChild(s) }
  while (shadows.children.length < vis.length) { const s = new PIXI.Sprite(dotTex); s.anchor.set(0.5); s.tint = 0x000000; shadows.addChild(s) }
  const nTrail = vis.reduce((n, b) => n + Math.min(b.trail.length, 14), 0);
  while (trails.children.length < nTrail) { const s = new PIXI.Sprite(dotTex); s.anchor.set(0.5); trails.addChild(s) }
  ballsC.children.forEach((s, i) => s.visible = i < vis.length);
  shadows.children.forEach((s, i) => s.visible = i < vis.length);
  let ti = 0;
  vis.forEach((b, i) => {
    const r = b.circleRadius, key = b.code;
    if (!ballTex.has(key)) ballTex.set(key, PIXI.Texture.from(st.ballSprite(b, st.R)));
    const s = ballsC.children[i]; s.texture = ballTex.get(key); s.x = b.position.x; s.y = b.position.y; s.rotation = b.angle; s.scale.set(r / st.R);
    const sh = shadows.children[i]; sh.x = b.position.x + r * 0.25; sh.y = b.position.y + r * 0.45; sh.width = sh.height = r * 2.9; sh.alpha = 0.55;
    const tc = top.get(b), speed = Math.hypot(b.velocity.x, b.velocity.y);
    if (tc || speed > 6 || b.turboT > 0) b.trail.forEach((p, j) => {   // Lichtspur: Top 3 in Gold/Silber/Bronze, schnelle Kugeln in der Bahnfarbe
      const t = trails.children[ti++], k = (j + 1) / b.trail.length;
      t.visible = true; t.x = p.x; t.y = p.y; t.width = t.height = r * (0.8 + 1.4 * k) * (tc ? 1.25 : 1);
      t.tint = b.turboT > 0 ? 0xfb923c : tc || cols[1]; t.alpha = (tc ? 0.38 : 0.2) * k;
    });
  });
  for (let i = ti; i < trails.children.length; i++) trails.children[i].visible = false;
  sparks = sparks.filter(p => {
    p.t++; p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.96;
    const k = 1 - p.t / p.life; p.s.x = p.x; p.s.y = p.y; p.s.width = p.s.height = 10 * k + 3; p.s.alpha = k;
    if (p.t >= p.life) { p.s.destroy(); return false } return true;
  });
  app.render();
};
})();
