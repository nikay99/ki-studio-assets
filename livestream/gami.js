// Gemeinsame Spielmechanik für Guess the Word / Country / Capital (Niklas 10.10. 16:50Z):
//  1) Level über alle Spiele (Lebenspunkte, Abzeichen am Namen)  2) Serien (richtig in Folge → Bonuspunkte)  3) Bonusrunde ×2 etwa alle 10 Min.
// Speicher: GAMI_DIR (Standard /var/lib/marble-gami, von allen drei Spiel-Benutzern beschreibbar). Fehlt das Verzeichnis oder ist es nicht
// beschreibbar, wird das DATA-Verzeichnis des Spiels genommen – dann zählt nur dieses Spiel, aber nichts bricht.
// Keine Vorteile für Abo/Like (YouTube-Regel): Punkte gibt es nur fürs Raten.
const fs = require('fs'), path = require('path');

const LEVELS = [   // [Name, Lebenspunkte ab, Abzeichen]
  ['Rookie', 0, '🌱'], ['Regular', 100, '🔷'], ['Pro', 400, '🏅'], ['Expert', 1200, '💎'], ['Quiz Legend', 3000, '👑'],
];
const BONUS_EVERY_MS = 10 * 60 * 1000;
const streakBonus = n => n >= 12 ? 5 : n >= 8 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0;
const levelOf = pts => { let l = 0; LEVELS.forEach((x, i) => { if (pts >= x[1]) l = i; }); return l; };

module.exports = function create(ownDataDir, opts = {}) {
  let dir = process.env.GAMI_DIR || '/var/lib/marble-gami';
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); } catch { dir = path.join(ownDataDir, 'gami'); fs.mkdirSync(dir, { recursive: true }); }
  const FILE = path.join(dir, 'gami.json');
  const everyMs = opts.bonusEveryMs || BONUS_EVERY_MS;
  let db = { seq: 0, nextBonusAt: 0, players: {} }, mtime = 0, saveT = null;

  function load(force) {
    try { const m = fs.statSync(FILE).mtimeMs; if (!force && m === mtime) return; mtime = m; db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}
  }
  function save() {
    if (saveT) return;
    saveT = setTimeout(() => {
      saveT = null; const tmp = FILE + '.' + process.pid;
      try { fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, FILE); mtime = fs.statSync(FILE).mtimeMs; try { fs.chmodSync(FILE, 0o664); } catch {} } catch {}
    }, 1500);
  }
  load(true);
  if (!db.nextBonusAt) { db.nextBonusAt = Date.now() + everyMs; }

  const P = u => db.players[u] || (db.players[u] = { pts: 0, streak: 0, last: 0, best: 0, rounds: 0 });
  const badge = u => LEVELS[levelOf((db.players[u] || {}).pts || 0)][2];

  return {
    LEVELS, dir,
    // Beim Start jeder Runde aufrufen. Liefert { seq, bonus }.
    roundStart() {
      load(); db.seq++;
      const bonus = Date.now() >= db.nextBonusAt;
      if (bonus) db.nextBonusAt = Date.now() + everyMs;
      save(); return { seq: db.seq, bonus };
    },
    // Richtige Antwort: base = normale Punkte. Liefert die tatsächlichen Punkte und Anzeigewerte.
    award(user, base, round) {
      load(); const p = P(user), before = levelOf(p.pts);
      p.streak = p.last === round.seq - 1 || p.last === round.seq ? p.streak + 1 : 1; p.last = round.seq; p.rounds++;
      p.best = Math.max(p.best, p.streak);
      const sb = streakBonus(p.streak), mult = round.bonus ? 2 : 1, pts = (base + sb) * mult;
      p.pts += pts; const after = levelOf(p.pts); save();
      return { pts, sb, mult, streak: p.streak, badge: LEVELS[after][2], level: LEVELS[after][0], up: after > before ? LEVELS[after] : null, total: p.pts };
    },
    badge(u) { load(); return badge(u); },
    // Fürs Bild: Countdown bis zur nächsten Bonusrunde
    info(round) { load(); return { bonus: !!(round && round.bonus), nextAt: db.nextBonusAt, now: Date.now(), levels: LEVELS.map(l => [l[0], l[1], l[2]]) }; },
  };
};
module.exports.LEVELS = LEVELS; module.exports.streakBonus = streakBonus;
