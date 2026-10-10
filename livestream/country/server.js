// Länderraten-Stream „Guess the Country“ (Entwurf 10.10.): Spiel nach dem Muster von words/server.js, eigener Server auf 127.0.0.1:8092.
// Zeigt den Umriss eines Landes (Natural Earth, public/shapes.json); mit der Zeit kommen Tipps (Kontinent, Weltkarte, Hauptstadt)
// und einzelne Buchstaben. Alle Richtigen einer Runde bekommen Punkte, die Schnellsten mehr. Flagge erst bei der Auflösung.
const http = require('http'), fs = require('fs'), path = require('path');
const { COUNTRY_LIST, flagOf } = require('../public/countries.js');
const chat = require('../chat.js');

const DATA = process.env.DATA_DIR || '/var/lib/marble-country';
// Eigene Musik dieses Streams (DATA/music, von sync-music.sh aus country/music.json), sonst die gemeinsame Playlist
const musicDir = () => { const own = path.join(DATA, 'music'); try { if (fs.readdirSync(own).some(x => /\.mp3$/.test(x))) return own; } catch {} return process.env.MUSIC_DIR || '/var/lib/marble/music'; };
const CHANNEL = process.env.CHANNEL || '';
const PORT = +process.env.PORT || 8092;
const PUB = path.join(__dirname, 'public');
const VERSION = String(Date.now());
fs.mkdirSync(DATA, { recursive: true });
const gami = require('../gami.js')(DATA);   // gemeinsame Level/Serien/Bonusrunde (Niklas 10.10.)

const GAME = JSON.parse(fs.readFileSync(path.join(__dirname, 'countries-game.json'), 'utf8'));   // [ISO2, Hauptstadt, Kontinent, Stufe 1 = bekannt]
const DISPLAY = { CF: 'Central African Republic', DO: 'Dominican Republic' };
const BYCODE = Object.fromEntries(COUNTRY_LIST.map(c => [c[0], c]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const BAD = /fuck|shit|cunt|nigg|fag|retard|whore|slut|bitch|pussy|dick|porn|hitler|nazi|kkk|rape|wichs|fotze|hure|schlampe|hurensohn|nutte/i;
const cleanName = u => BAD.test(u.replace(/[^a-z]/gi, '')) ? 'viewer' : u;
const CHAT_BOTS = /^(nightbot|streamelements|moobot|fossabot)$/i;
const OWN_CHANNEL = 'UCG6xEYtopZcK66gz_biiIIA', HINT = /^\S{0,16}\s*(Type your|Every chat message|Points add up|Know the country|The fastest answer)/u;
const isHint = m => m.channelId === OWN_CHANNEL && HINT.test(String(m.text || ''));

// Zeiten (Bild hängt hinter dem Chat): Runde 65 s, Tipps nach 12 / 26 / 40 s, Buchstaben ab 20 s alle 6 s
const ROUND_MS = 65000, SHOW_MS = 8000, HINTS_AT = [12000, 26000, 40000], FIRST_REVEAL = 20000, REVEAL_EVERY = 6000;   // Niklas 10.10.: mehr Zeit (vorher 47 s)
const PTS = [10, 7, 5];

// ---------- Tageszustand ----------
const STATE_FILE = path.join(DATA, 'state.json');
let st = { day: '', points: {}, wins: {}, flags: {}, rounds: 0, fastest: null, streak: null };
try { st = { ...st, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch {}
const today = () => new Date().toISOString().slice(0, 10);
function rollDay() { if (st.day !== today()) st = { day: today(), points: {}, wins: {}, flags: st.flags || {}, rounds: 0, fastest: null, streak: null }; }
let saveT = null;
const save = () => { if (!saveT) saveT = setTimeout(() => { saveT = null; fs.writeFile(STATE_FILE, JSON.stringify(st), () => {}); }, 1500); };
rollDay();
// Wer hier schon einmal geschrieben hat (über Tage, wie beim Wortraten): nur echte Neue werden begrüßt
const KNOWN_FILE = path.join(DATA, 'known.json');
let known = new Set(); try { known = new Set(JSON.parse(fs.readFileSync(KNOWN_FILE, 'utf8'))); } catch {}
let knownT = null;
const saveKnown = () => { if (!knownT) knownT = setTimeout(() => { knownT = null; fs.writeFile(KNOWN_FILE, JSON.stringify([...known].slice(-20000)), () => {}); }, 3000); };

// ---------- Runden ----------
let round = null, recent = [], feed = [], feedId = 0, msgCount = 0, chatStatus = { chat: CHANNEL ? 'startet' : 'kein Kanal' };
function nextCountry(n) {
  // 2 von 3 Runden bekannte Länder (schnelle Erfolgsmomente), jede 3. ein schwereres
  const tier = n % 3 === 0 ? 2 : 1;
  const pool = GAME.filter(g => g[3] === tier && !recent.includes(g[0]));
  // FORCE=ZA,MK nur für lokale Vorschauen: diese Länder der Reihe nach
  const forced = (process.env.FORCE || '').split(',').filter(Boolean);
  const [code, capital, continent] = forced.length ? GAME.find(g => g[0] === forced[(n - 1) % forced.length]) : pool[Math.floor(Math.random() * pool.length)];
  const [, n0, al] = BYCODE[code], name = DISPLAY[code] || n0;   // Anzeige ohne Abkürzungspunkte (Kacheln kennen nur Buchstaben)
  return { code, name, shown: name.toUpperCase(), w: norm(name).replace(/ /g, ''), alias: [...new Set([norm(name), ...al.map(norm)])], capital, continent, hard: tier === 2 };
}
function startRound() {
  rollDay();
  const n = st.rounds + 1, q = nextCountry(n);
  recent = [...recent, q.code].slice(-60);
  const letters = [...q.shown];
  const idx = letters.map((ch, i) => i).filter(i => /[A-Z]/.test(letters[i])).sort(() => Math.random() - 0.5);
  const maxReveal = Math.max(1, Math.floor(idx.length * 0.5));
  round = { n, q, letters, order: idx.slice(0, maxReveal), revealed: [], start: Date.now(), end: Date.now() + ROUND_MS, solvers: [], ...gami.roundStart(), phase: 'guess', hints: 0 };
  st.rounds = n; save();
}
function tick() {
  if (!round) return startRound();
  const now = Date.now();
  if (round.phase === 'guess') {
    const el = now - round.start;
    round.hints = HINTS_AT.filter(t => el >= t).length;
    if (el >= FIRST_REVEAL) round.revealed = round.order.slice(0, Math.min(round.order.length, Math.floor((el - FIRST_REVEAL) / REVEAL_EVERY) + 1));
    if (now >= round.end) finish();
  } else if (round.phase === 'show' && now >= round.showEnd) startRound();
}
function finish() {
  round.phase = 'show'; round.showEnd = Date.now() + SHOW_MS; round.hints = 3;
  const first = round.solvers[0];
  st.streak = first ? (st.streak && st.streak.user === first.user ? { user: first.user, n: st.streak.n + 1 } : { user: first.user, n: 1 }) : null;
  save();
}
setInterval(tick, 250); tick();

function isCorrect(text) {
  if (/^\s*!/.test(text)) return false;
  const t = norm(text); if (!t) return false;
  const q = round.q;
  if (t.replace(/ /g, '') === q.w || q.alias.includes(t)) return true;
  // „it's brazil“ / „brazil?“ zählt, lange Sätze nicht
  return t.split(' ').length <= 4 && q.alias.some(a => (' ' + t + ' ').includes(' ' + a + ' '));
}
function onChat(user, text) {
  msgCount++; rollDay();
  // Jede Nachricht wird unten als „Live guesses“ sichtbar (Niklas 10.10.: „trys sehen, was Leute geraten haben“)
  const push = f => { feed.push({ id: ++feedId, user, ...f }); if (feed.length > 200) feed = feed.slice(-100); };
  // Neue Mitspieler (heute zum ersten Mal im Chat) werden oben im Handy-Bereich begrüßt, damit sie sehen, dass ihr Chat ankommt
  if (!known.has(user)) { known.add(user); saveKnown(); push({ welcome: 1 }); }
  if (round && round.phase === 'guess' && !round.solvers.some(s => s.user === user) && isCorrect(text)) {
    const place = round.solvers.length, ms = Date.now() - round.start;
    const gm = gami.award(user, place < PTS.length ? PTS[place] : 3, round), pts = gm.pts;
    round.solvers.push({ user, pts, ms, flag: st.flags[user] || '', b: gm.badge, streak: gm.streak, sb: gm.sb, mult: gm.mult });
    st.points[user] = (st.points[user] || 0) + pts;
    if (place === 0) { st.wins[user] = (st.wins[user] || 0) + 1; if (!st.fastest || ms < st.fastest.ms) st.fastest = { user, ms, word: round.q.shown }; }
    save(); push({ ok: 1, pts });
    if (gm.up) push({ levelUp: gm.up[0], badge: gm.up[2] }); else if (gm.streak >= 3) push({ streakPop: gm.streak, sb: gm.sb, badge: gm.badge });
    if (place === 0) round.end = Math.min(round.end, Date.now() + 15000);
    return;
  }
  if (round && round.phase !== 'guess' && isCorrect(text)) return push({ late: 1 });   // richtig, aber Bild hing hinterher
  if (round && round.solvers.some(s => s.user === user)) return;                        // hat schon, kein Spoiler
  // eigene Flagge für die Bestenliste nur mit „!“ (z. B. !germany), sonst wäre jeder Rateversuch ein Flaggenwechsel
  const cmd = /^\s*!/.test(text) ? norm(text) : '';
  if (cmd) { for (const [code, , al] of COUNTRY_LIST) if (al.map(norm).includes(cmd)) { if (st.flags[user] !== code) { st.flags[user] = code; save(); push({ flag: flagOf(code) }); } break; } return; }
  const g = norm(text).toUpperCase();
  if (g && !BAD.test(g.replace(/ /g, ''))) push({ guess: g.length > 16 ? g.slice(0, 15) + '…' : g, flag: st.flags[user] ? flagOf(st.flags[user]) : '' });
}

function board() {
  rollDay();
  const top = Object.entries(st.points).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([u, p]) => ({ user: u, pts: p, wins: st.wins[u] || 0, flag: (gami.badge(u) + ' ' + (st.flags[u] ? flagOf(st.flags[u]) : '')).trim() }));
  return { top, players: Object.keys(st.points).length, rounds: st.rounds, fastest: st.fastest, streak: st.streak };
}
function view() {
  const r = round, show = r.phase === 'show', q = r.q;
  return {
    v: VERSION, now: Date.now(), n: r.n, phase: r.phase, code: q.code, hard: q.hard,
    tiles: r.letters.map((ch, i) => ch === ' ' ? ' ' : (show || r.revealed.includes(i)) ? ch : ''),
    hints: { continent: r.hints >= 1 ? q.continent : null, map: r.hints >= 2, capital: r.hints >= 3 ? q.capital : null },
    hintsAt: HINTS_AT, end: r.end, start: r.start, showEnd: r.showEnd || 0,
    solvers: r.solvers.map(s => ({ ...s, flag: ((s.b || '') + ' ' + (s.flag ? flagOf(s.flag) : '')).trim() })), gami: gami.info(r),
    answer: show ? { name: q.shown, flag: q.code } : null,
  };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const WORDS_PUB = path.join(__dirname, '../words/public');
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/gami-ui.js') return fs.readFile(path.join(__dirname, '..', 'gami-ui.js'), (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); res.end(b); });
  if (u.pathname === '/api/state') return send(res, 200, view());
  if (u.pathname === '/api/board') return send(res, 200, board());
  if (u.pathname === '/api/feed') { const since = +u.searchParams.get('since') || 0; return send(res, 200, { last: feedId, feed: feed.filter(f => f.id > since).slice(-20) }); }
  if (u.pathname === '/api/status') return send(res, 200, { chatStatus, msgCount, round: round && round.n });
  if (u.pathname === '/api/music') return fs.readdir(musicDir(), (e, f) => send(res, 200, (f || []).filter(x => /\.(mp3|ogg)$/.test(x))));
  if (u.pathname.startsWith('/music/')) { const f = path.join(musicDir(), path.basename(decodeURIComponent(u.pathname))); return fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); res.end(b); }); }
  // Schrift aus dem Wortraten-Ordner mitnutzen (nur lesen, keine Kopie)
  if (u.pathname.startsWith('/fonts/')) return fs.readFile(path.join(WORDS_PUB, 'fonts', path.basename(u.pathname)), (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'font/woff2' }); res.end(b); });
  const file = path.join(PUB, path.normalize(u.pathname === '/' ? '/vertical.html' : u.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(b); });
}).listen(PORT, '127.0.0.1');

if (CHANNEL) chat.start({ channel: CHANNEL, log: m => console.log('[chat]', m), status: s => { chatStatus = s; },
  onMessage: m => { const name = String(m.user).replace(/^@/, ''); if (CHAT_BOTS.test(name) || isHint(m)) return; onChat(cleanName(name.slice(0, 20)), m.text); } });

// Test-Zuschauer (DEMO=1)
if (process.env.DEMO === '1') {
  const names = ['lena_k', 'mike_tx', 'joao.br', 'aziz99', 'tom_uk', 'sakura', 'pierre', 'marta_pl', 'ravi', 'kim.s', 'emma.rose', 'lucia'];
  const ctry = ['brazil', 'germany', 'japan', 'france', 'india', 'poland', 'mexico', 'italy'];
  for (const n of names.slice(0, 8)) onChat(n, '!' + ctry[Math.floor(Math.random() * ctry.length)]);
  setInterval(() => {
    if (!round || round.phase !== 'guess') return;
    const u = names[Math.floor(Math.random() * names.length)], el = Date.now() - round.start;
    if (el > 9000 && Math.random() < Math.min(0.5, (el - 9000) / 20000)) onChat(u, round.q.name);
    else onChat(u, ctry[Math.floor(Math.random() * ctry.length)]);
  }, 1300);
}
// Selbst-Update wie beim Wortraten: Repo wird alle 3 Min. gezogen, bei Änderung Neustart über systemd, Seite lädt neu
const WATCH = ['server.js', 'countries-game.json', 'public/vertical.html', 'public/shapes.json', '../chat.js', '../gami.js', '../gami-ui.js'].map(f => path.join(__dirname, f));
const mtimes = () => WATCH.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }).join();
const M0 = mtimes(); setInterval(() => { if (mtimes() !== M0) { console.log('Dateien geändert, Neustart'); save(); setTimeout(() => process.exit(0), 2000); } }, 60000);
console.log('Länderraten auf http://127.0.0.1:' + PORT);
