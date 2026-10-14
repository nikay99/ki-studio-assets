// Flag Circle Survival (Entwurf 14.10.): Kreis-Arena mit wanderndem Loch, 16 Flaggen-Bälle, alle paar Sekunden fällt einer raus, der letzte gewinnt.
// Die Physik läuft in der Seite (public/vertical.html), der Server hält Runde, Chat-Tipps und Punkte. Eigener Server auf 127.0.0.1:8095.
// Chat (optional): Landesname oder Kürzel der Flagge, die gewinnen soll (DE, brazil …). Früher getippt = mehr Punkte. Level/Serien/Bonusrunde aus ../gami.js.
const http = require('http'), fs = require('fs'), path = require('path');
const { COUNTRY_LIST, flagOf } = require('../public/countries.js');
const chat = require('../chat.js');

const DATA = process.env.DATA_DIR || '/var/lib/marble-flagcircle';
const musicDir = () => { const own = path.join(DATA, 'music'); try { if (fs.readdirSync(own).some(x => /\.mp3$/.test(x))) return own; } catch {} return process.env.MUSIC_DIR || '/var/lib/marble/music'; };
const CHANNEL = process.env.CHANNEL || '';
const PORT = +process.env.PORT || 8095;
const PUB = path.join(__dirname, 'public');
const VERSION = String(Date.now());
fs.mkdirSync(DATA, { recursive: true });
const gami = require('../gami.js')(DATA);

const DISPLAY = { GB: 'United Kingdom', US: 'United States', CF: 'Central African Rep.', DO: 'Dominican Rep.', BA: 'Bosnia', CD: 'DR Congo', AE: 'UAE', KR: 'South Korea', KP: 'North Korea' };
const BYCODE = Object.fromEntries(COUNTRY_LIST.map(c => [c[0], c]));
const nameOf = c => DISPLAY[c] || BYCODE[c][1];
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const BAD = /fuck|shit|cunt|nigg|fag|retard|whore|slut|bitch|pussy|dick|porn|hitler|nazi|kkk|rape|wichs|fotze|hure|schlampe|hurensohn|nutte/i;
const cleanName = u => BAD.test(u.replace(/[^a-z]/gi, '')) ? 'viewer' : u;
const CHAT_BOTS = /^(nightbot|streamelements|moobot|fossabot)$/i;
const OWN_CHANNEL = 'UCG6xEYtopZcK66gz_biiIIA', HINT = /^\S{0,16}\s*(Type your|Every chat message|Points add up|Know the capital|The fastest answer|Type A or B|Pick A or B|Tip the winner)/u;
const isHint = m => m.channelId === OWN_CHANNEL && HINT.test(String(m.text || ''));

const TOP = new Set('IN US BR JP FR DE PK BD VN GB TR ID MX NG PH EG IT ES RU CN KR CA AU AR PL UA SA ZA'.split(' '));
const SKIP = new Set('HK MO PR GL VA GI FO IM BM KY CW AW RE NC PF GU VI PS XK TW'.split(' '));
const POOL = COUNTRY_LIST.map(c => c[0]).filter(c => !SKIP.has(c));
const N_BALLS = 16, SHOW_MS = 10000, MAX_RUN_MS = 100000, TIP_UNTIL_LEFT = 4;

const STATE_FILE = path.join(DATA, 'state.json');
let st = { day: '', points: {}, wins: {}, flags: {}, rounds: 0, bestStreak: null };
try { st = { ...st, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch {}
const today = () => new Date().toISOString().slice(0, 10);
function rollDay() { if (st.day !== today()) st = { day: today(), points: {}, wins: {}, flags: st.flags || {}, rounds: 0, bestStreak: null }; }
let saveT = null;
const save = () => { if (!saveT) saveT = setTimeout(() => { saveT = null; fs.writeFile(STATE_FILE, JSON.stringify(st), () => {}); }, 1500); };
rollDay();
const KNOWN_FILE = path.join(DATA, 'known.json');
let known = new Set(); try { known = new Set(JSON.parse(fs.readFileSync(KNOWN_FILE, 'utf8'))); } catch {}
let knownT = null;
const saveKnown = () => { if (!knownT) knownT = setTimeout(() => { knownT = null; fs.writeFile(KNOWN_FILE, JSON.stringify([...known].slice(-20000)), () => {}); }, 3000); };

let round = null, recent = [], feed = [], feedId = 0, msgCount = 0, chatStatus = { chat: CHANNEL ? 'startet' : 'kein Kanal' };
function pickCodes() {
  const forced = (process.env.FORCE || '').split(',').filter(Boolean);   // nur für lokale Vorschauen
  if (forced.length) return forced.slice(0, N_BALLS);
  const out = [], tops = POOL.filter(c => TOP.has(c) && !recent.includes(c)), rest = POOL.filter(c => !TOP.has(c) && !recent.includes(c));
  const take = (arr, n) => { for (let i = 0; i < n && arr.length; i++) out.push(arr.splice(Math.floor(Math.random() * arr.length), 1)[0]); };
  take(tops, 8); take(rest, N_BALLS - out.length);
  recent = [...recent, ...out].slice(-80);
  return out.sort(() => Math.random() - 0.5);
}
function startRound() {
  rollDay();
  const n = st.rounds + 1, codes = pickCodes();
  round = { n, codes, names: codes.map(nameOf), start: Date.now(), phase: 'run', out: [], tips: {}, winner: null, solvers: [], ...gami.roundStart() };
  st.rounds = n; save();
}
const alive = () => round.codes.filter(c => !round.out.includes(c));
function finish(win) {
  if (round.phase !== 'run') return;
  round.winner = win; round.phase = 'show'; round.showEnd = Date.now() + SHOW_MS;
  if (!round.out.includes(win)) round.out.push(win);
  const right = Object.entries(round.tips).filter(([, t]) => t.code === win).sort((a, b) => a[1].t - b[1].t);
  right.forEach(([user, t]) => {
    const gm = gami.award(user, t.base, round), pts = gm.pts;
    round.solvers.push({ user, pts, flag: st.flags[user] || '', b: gm.badge, streak: gm.streak, sb: gm.sb, mult: gm.mult });
    st.points[user] = (st.points[user] || 0) + pts; st.wins[user] = (st.wins[user] || 0) + 1;
    if (gm.up) feed.push({ id: ++feedId, user, levelUp: gm.up[0], badge: gm.up[2] });
    if (!st.bestStreak || gm.streak > st.bestStreak.n) st.bestStreak = { user, n: gm.streak };
  });
  save();
}
function tick() {
  if (!round) return startRound();
  const now = Date.now();
  if (round.phase === 'run' && now - round.start > MAX_RUN_MS) { const a = alive(); finish(a[Math.floor(Math.random() * a.length)]); }   // Seite hängt: Zufallssieger
  else if (round.phase === 'show' && now >= round.showEnd) startRound();
}
setInterval(tick, 500); tick();

// Tipp: ISO-Kürzel (2 Buchstaben) oder Landesname/Alias einer der Flaggen, die gerade im Spiel sind
function parseTip(text) {
  if (/^\s*!/.test(text)) return null;
  const t = norm(text); if (!t) return null;
  const inPlay = round.codes;
  for (const c of inPlay) { if (t === c.toLowerCase()) return c; }
  for (const c of inPlay) { const al = (BYCODE[c][2] || []).map(norm).concat(norm(nameOf(c))); if (al.includes(t)) return c; }
  return null;
}
function onChat(user, text) {
  msgCount++; rollDay();
  const push = f => { feed.push({ id: ++feedId, user, ...f }); if (feed.length > 200) feed = feed.slice(-100); };
  if (!known.has(user)) { known.add(user); saveKnown(); push({ welcome: 1 }); }
  const cmd = /^\s*!/.test(text) ? norm(text) : '';
  if (cmd) { for (const [code, , al] of COUNTRY_LIST) if (al.map(norm).includes(cmd)) { if (st.flags[user] !== code) { st.flags[user] = code; save(); push({ flag: flagOf(code) }); } break; } return; }
  if (!round) return;
  const code = parseTip(text); if (!code) return;
  if (round.phase !== 'run') return push({ late: 1, tip: flagOf(code) });
  const left = alive().length;
  if (left <= TIP_UNTIL_LEFT) return push({ late: 1, tip: flagOf(code) });
  if (round.out.includes(code)) return push({ dead: 1, tip: flagOf(code) });
  if (round.tips[user]) return;   // erster Tipp zählt (kein Umentscheiden, sonst gewinnt jeder spät)
  round.tips[user] = { code, t: Date.now(), base: left >= 12 ? 10 : left >= 8 ? 7 : 5 };
  push({ tip: flagOf(code), name: nameOf(code), flag: st.flags[user] ? flagOf(st.flags[user]) : '' });
}

function board() {
  rollDay();
  const top = Object.entries(st.points).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([u, p]) => ({ user: u, pts: p, wins: st.wins[u] || 0, flag: (gami.badge(u) + ' ' + (st.flags[u] ? flagOf(st.flags[u]) : '')).trim() }));
  return { top, players: Object.keys(st.points).length, rounds: st.rounds, bestStreak: st.bestStreak };
}
function view() {
  const r = round, show = r.phase === 'show', tally = {};
  for (const t of Object.values(r.tips)) tally[t.code] = (tally[t.code] || 0) + 1;
  return {
    v: VERSION, now: Date.now(), n: r.n, phase: r.phase, start: r.start, codes: r.codes, names: r.names, out: r.out, left: alive().length,
    tips: tally, nTips: Object.keys(r.tips).length, winner: show ? r.winner : null, winnerName: show ? nameOf(r.winner) : null, showEnd: r.showEnd || 0,
    solvers: show ? r.solvers.slice(0, 3).map(s => ({ ...s, flag: ((s.b || '') + ' ' + (s.flag ? flagOf(s.flag) : '')).trim() })) : [], nSolvers: show ? r.solvers.length : 0,
    gami: gami.info(r),
  };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const WORDS_PUB = path.join(__dirname, '../words/public');
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  // Die Seite meldet Ausscheiden und Sieger (nur lokal erreichbar, Server hört auf 127.0.0.1)
  if (u.pathname === '/api/out' && req.method === 'POST') {
    let b = ''; req.on('data', d => { b += d; if (b.length > 1000) req.destroy(); }); req.on('end', () => {
      try { const j = JSON.parse(b);
        if (round && j.n === round.n && round.phase === 'run' && round.codes.includes(j.code) && !round.out.includes(j.code)) { round.out.push(j.code); push2({ out: j.code }); if (alive().length <= 1) finish(alive()[0] || j.code); }
        if (round && j.n === round.n && j.win && round.codes.includes(j.win)) finish(j.win);
      } catch {} send(res, 200, { ok: 1 }); }); return;
  }
  if (u.pathname === '/gami-ui.js') return fs.readFile(path.join(__dirname, '..', 'gami-ui.js'), (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }); res.end(b); });
  if (u.pathname === '/api/state') return send(res, 200, view());
  if (u.pathname === '/api/board') return send(res, 200, board());
  if (u.pathname === '/api/feed') { const since = +u.searchParams.get('since') || 0; return send(res, 200, { last: feedId, feed: feed.filter(f => f.id > since).slice(-20) }); }
  if (u.pathname === '/api/status') return send(res, 200, { chatStatus, msgCount, round: round && round.n });
  if (u.pathname === '/api/music') return fs.readdir(musicDir(), (e, f) => send(res, 200, (f || []).filter(x => /\.(mp3|ogg)$/.test(x))));
  if (u.pathname.startsWith('/music/')) { const f = path.join(musicDir(), path.basename(decodeURIComponent(u.pathname))); return fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); res.end(b); }); }
  if (u.pathname.startsWith('/fonts/')) return fs.readFile(path.join(WORDS_PUB, 'fonts', path.basename(u.pathname)), (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'font/woff2' }); res.end(b); });
  const file = path.join(PUB, path.normalize(u.pathname === '/' ? '/vertical.html' : u.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(b); });
}).listen(PORT, '127.0.0.1');
function push2(f) { feed.push({ id: ++feedId, user: '', ...f }); if (feed.length > 200) feed = feed.slice(-100); }

if (CHANNEL) chat.start({ channel: CHANNEL, log: m => console.log('[chat]', m), status: s => { chatStatus = s; },
  onMessage: m => { const name = String(m.user).replace(/^@/, ''); if (CHAT_BOTS.test(name) || isHint(m)) return; const nm = cleanName(name.slice(0, 20)); gami.seen(nm, m.channelId); onChat(nm, m.text); } });

if (process.env.DEMO === '1') {
  const names = ['lena_k', 'mike_tx', 'joao.br', 'aziz99', 'tom_uk', 'sakura', 'pierre', 'marta_pl', 'ravi', 'kim.s', 'emma.rose', 'lucia'];
  for (const n of names.slice(0, 6)) onChat(n, '!' + ['brazil', 'germany', 'japan', 'france', 'india', 'poland'][Math.floor(Math.random() * 6)]);
  setInterval(() => { if (!round || round.phase !== 'run') return; const u = names[Math.floor(Math.random() * names.length)]; onChat(u, round.codes[Math.floor(Math.random() * round.codes.length)]); }, 2500);
}
const WATCH = ['server.js', 'public/vertical.html', '../chat.js', '../gami.js', '../gami-ui.js'].map(f => path.join(__dirname, f));
const mtimes = () => WATCH.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }).join();
const M0 = mtimes(); setInterval(() => { if (mtimes() !== M0) { console.log('Dateien geändert, Neustart'); save(); setTimeout(() => process.exit(0), 2000); } }, 60000);
console.log('Flag Circle Survival auf http://127.0.0.1:' + PORT);
