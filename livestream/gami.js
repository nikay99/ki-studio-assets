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
  // Zähler und Bonus-Takt je Spiel: alle drei Server laufen dauernd, auch wenn nur eines auf Sendung ist (Stream-Technik 11.10.)
  const GAME = path.basename(ownDataDir);
  let db = { seqs: {}, nextBonus: {}, players: {}, names: {} }, mtime = 0, saveT = null;

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
  db.seqs = db.seqs || {}; db.nextBonus = db.nextBonus || {};

  // Schlüssel eines Spielers = YouTube-Kanal-ID (bleibt bei Namenswechsel gleich); ohne ID der Anzeigename.
  // Bekannte Namenswechsel: neuer Name → frühere Namen, deren Stand beim ersten Auftreten der Kanal-ID übernommen wird.
  const ALIASES = { NikayStudio: ['Nikay99'] };
  const key = u => db.names[u] || u;
  const P = u => { const k = key(u); return db.players[k] || (db.players[k] = { pts: 0, streak: 0, last: 0, best: 0, rounds: 0 }); };
  const badge = u => LEVELS[levelOf((db.players[key(u)] || {}).pts || 0)][2];

  return {
    LEVELS, dir,
    // Beim Start jeder Runde aufrufen. Liefert { seq, bonus }.
    roundStart() {
      load(); const seq = db.seqs[GAME] = (db.seqs[GAME] || 0) + 1;
      if (!db.nextBonus[GAME]) db.nextBonus[GAME] = Date.now() + everyMs;
      const bonus = Date.now() >= db.nextBonus[GAME];
      if (bonus) db.nextBonus[GAME] = Date.now() + everyMs;
      save(); return { seq, bonus };
    },
    // Richtige Antwort: base = normale Punkte. Liefert die tatsächlichen Punkte und Anzeigewerte.
    award(user, base, round) {
      load(); const p = P(user), before = levelOf(p.pts);
      p.streak = p.lastG === GAME && (p.last === round.seq - 1 || p.last === round.seq) ? p.streak + 1 : 1; p.last = round.seq; p.lastG = GAME; p.rounds++;
      p.best = Math.max(p.best, p.streak);
      const sb = streakBonus(p.streak), mult = round.bonus ? 2 : 1, pts = (base + sb) * mult;
      p.pts += pts; const after = levelOf(p.pts); save();
      return { pts, sb, mult, streak: p.streak, badge: LEVELS[after][2], level: LEVELS[after][0], up: after > before ? LEVELS[after] : null, total: p.pts };
    },
    // Bei jeder Chat-Nachricht vor der Auswertung aufrufen: ordnet Anzeigename und Kanal-ID zu, übernimmt alte Namens-Einträge einmalig.
    seen(name, cid) {
      if (!cid) return; load();
      if (db.names[name] !== cid) { db.names[name] = cid; save(); }
      if (!db.players[cid]) for (const old of [name, ...(ALIASES[name] || [])]) {
        if (old !== cid && db.players[old]) { db.players[cid] = db.players[old]; delete db.players[old]; save(); break; }
      }
      if (db.players[cid] && db.players[cid].name !== name) { db.players[cid].name = name; save(); }
    },
    badge(u) { load(); return badge(u); },
    // Fürs Bild: Countdown bis zur nächsten Bonusrunde
    info(round) { load(); return { bonus: !!(round && round.bonus), nextAt: db.nextBonus[GAME] || 0, now: Date.now(), levels: LEVELS.map(l => [l[0], l[1], l[2]]) }; },
  };
};
module.exports.LEVELS = LEVELS; module.exports.streakBonus = streakBonus;
