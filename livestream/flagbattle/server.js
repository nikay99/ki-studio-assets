// Flag Battle LIVE (Entwurf 14.10.): gleiches Muster wie capital/server.js, eigener Server auf 127.0.0.1:8094.
// Zwei Flaggen, der Chat schreibt nur A oder B (oder den Landesnamen). Mehr Stimmen gewinnt; wer für den Sieger gestimmt hat, bekommt Punkte
// (der Schnellste am meisten). Level, Serien und Bonusrunde kommen aus ../gami.js, Spieler nach Kanal-ID.
const http = require('http'), fs = require('fs'), path = require('path');
const { COUNTRY_LIST, flagOf } = require('../public/countries.js');
const chat = require('../chat.js');

const DATA = process.env.DATA_DIR || '/var/lib/marble-flagbattle';
const musicDir = () => { const own = path.join(DATA, 'music'); try { if (fs.readdirSync(own).some(x => /\.mp3$/.test(x))) return own; } catch {} return process.env.MUSIC_DIR || '/var/lib/marble/music'; };
const CHANNEL = process.env.CHANNEL || '';
const PORT = +process.env.PORT || 8094;
const PUB = path.join(__dirname, 'public');
const VERSION = String(Date.now());
fs.mkdirSync(DATA, { recursive: true });
const gami = require('../gami.js')(DATA);

const DISPLAY = { GB: 'United Kingdom', US: 'United States', CF: 'Central African Rep.', DO: 'Dominican Rep.', BA: 'Bosnia', CD: 'DR Congo', AE: 'UAE', KR: 'South Korea', KP: 'North Korea' };
const BYCODE = Object.fromEntries(COUNTRY_LIST.map(c => [c[0], c]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const BAD = /fuck|shit|cunt|nigg|fag|retard|whore|slut|bitch|pussy|dick|porn|hitler|nazi|kkk|rape|wichs|fotze|hure|schlampe|hurensohn|nutte/i;
const cleanName = u => BAD.test(u.replace(/[^a-z]/gi, '')) ? 'viewer' : u;
const CHAT_BOTS = /^(nightbot|streamelements|moobot|fossabot)$/i;
const OWN_CHANNEL = 'UCG6xEYtopZcK66gz_biiIIA', HINT = /^\S{0,16}\s*(Type your|Every chat message|Points add up|Know the capital|The fastest answer|Type A or B|Pick A or B)/u;
const isHint = m => m.channelId === OWN_CHANNEL && HINT.test(String(m.text || ''));

// Beliebte Länder (Hauptmärkte laut Marketing) kommen dreimal so oft vor; nur Länder mit Flagge im Spiel (keine winzigen Gebiete)
const TOP = new Set('IN US BR JP FR DE PK BD VN GB TR ID MX NG PH EG IT ES RU CN KR CA AU AR PL UA SA ZA'.split(' '));
const SKIP = new Set('HK MO PR GL VA GI FO IM BM KY CW AW RE NC PF GU VI PS XK TW'.split(' '));
const POOL = COUNTRY_LIST.map(c => c[0]).filter(c => !SKIP.has(c));
const WEIGHTED = POOL.flatMap(c => TOP.has(c) ? [c, c, c] : [c]);
const nameOf = c => DISPLAY[c] || BYCODE[c][1];

// Runde 30 s: 20 s abstimmen, 10 s Kampf + Ergebnis
const VOTE_MS = 20000, SHOW_MS = 10000, PTS = [10, 7, 5];

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
const pick = () => { for (let i = 0; i < 50; i++) { const c = WEIGHTED[Math.floor(Math.random() * WEIGHTED.length)]; if (!recent.includes(c)) return c; } return WEIGHTED[0]; };
function startRound() {
  rollDay();
  const forced = (process.env.FORCE || '').split(',').filter(Boolean);   // nur für lokale Vorschauen: FORCE=BR,JP,FR,DE
  let a, b;
  if (forced.length >= 2) { const k = (st.rounds * 2) % forced.length; a = forced[k]; b = forced[(k + 1) % forced.length]; }
  else { a = pick(); recent.push(a); b = pick(); recent.push(b); recent = recent.slice(-60); }
  const n = st.rounds + 1;
  round = { n, a, b, aName: nameOf(a), bName: nameOf(b), votes: {}, start: Date.now(), end: Date.now() + VOTE_MS, ...gami.roundStart(), phase: 'vote', winner: null, solvers: [], coin: false };
  st.rounds = n; save();
}
const counts = () => { let A = 0, B = 0; for (const v of Object.values(round.votes)) v.s === 'A' ? A++ : B++; return { A, B }; };
function finish() {
  const { A, B } = counts();
  round.coin = A === B;
  round.winner = A > B ? 'A' : B > A ? 'B' : (Math.random() < 0.5 ? 'A' : 'B');
  round.phase = 'show'; round.showEnd = Date.now() + SHOW_MS; round.fa = A; round.fb = B;
  // Punkte: alle, die für den Sieger gestimmt haben, in der Reihenfolge ihrer (letzten) Stimme
  const win = Object.entries(round.votes).filter(([, v]) => v.s === round.winner).sort((x, y) => x[1].t - y[1].t);
  win.forEach(([user], place) => {
    const gm = gami.award(user, place < PTS.length ? PTS[place] : 3, round), pts = gm.pts;
    round.solvers.push({ user, pts, flag: st.flags[user] || '', b: gm.badge, streak: gm.streak, sb: gm.sb, mult: gm.mult });
    st.points[user] = (st.points[user] || 0) + pts;
    if (place === 0) st.wins[user] = (st.wins[user] || 0) + 1;
    if (gm.up) feed.push({ id: ++feedId, user, levelUp: gm.up[0], badge: gm.up[2] });
    if (!st.bestStreak || gm.streak > st.bestStreak.n) st.bestStreak = { user, n: gm.streak };
  });
  save();
}
function tick() {
  if (!round) return startRound();
  const now = Date.now();
  if (round.phase === 'vote' && now >= round.end) finish();
  else if (round.phase === 'show' && now >= round.showEnd) startRound();
}
setInterval(tick, 250); tick();

// Stimme: A / B (auch "a!", "🅰") oder der Landesname einer der beiden Flaggen
function parseVote(text) {
  if (/^\s*!/.test(text)) return null;
  const t = norm(text.replace(/🅰️?/g, ' a ').replace(/🅱️?/g, ' b '));
  if (t === 'a' || t === 'b') return t.toUpperCase();
  const has = code => (BYCODE[code][2] || []).map(norm).concat(norm(nameOf(code))).includes(t);
  if (t.length > 2 && has(round.a) !== has(round.b)) return has(round.a) ? 'A' : 'B';
  return null;
}
function onChat(user, text) {
  msgCount++; rollDay();
  const push = f => { feed.push({ id: ++feedId, user, ...f }); if (feed.length > 200) feed = feed.slice(-100); };
  if (!known.has(user)) { known.add(user); saveKnown(); push({ welcome: 1 }); }
  const cmd = /^\s*!/.test(text) ? norm(text) : '';
  if (cmd) { for (const [code, , al] of COUNTRY_LIST) if (al.map(norm).includes(cmd)) { if (st.flags[user] !== code) { st.flags[user] = code; save(); push({ flag: flagOf(code) }); } break; } return; }
  if (!round) return;
  const v = parseVote(text);
  if (!v) return;
  if (round.phase !== 'vote') return push({ late: 1, side: v });
  const old = round.votes[user];
  round.votes[user] = { s: v, t: old && old.s === v ? old.t : Date.now() };   // gleiche Seite behält ihre Zeit, Wechsel zählt neu
  push({ vote: v, flag: st.flags[user] ? flagOf(st.flags[user]) : '' });
}

function board() {
  rollDay();
  const top = Object.entries(st.points).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([u, p]) => ({ user: u, pts: p, wins: st.wins[u] || 0, flag: (gami.badge(u) + ' ' + (st.flags[u] ? flagOf(st.flags[u]) : '')).trim() }));
  return { top, players: Object.keys(st.points).length, rounds: st.rounds, bestStreak: st.bestStreak };
}
function view() {
  const r = round, show = r.phase === 'show', c = counts();
  return {
    v: VERSION, now: Date.now(), n: r.n, phase: r.phase, a: r.a, b: r.b, aName: r.aName, bName: r.bName,
    votesA: c.A, votesB: c.B, start: r.start, end: r.end, showEnd: r.showEnd || 0,
    winner: show ? r.winner : null, coin: show ? r.coin : false,
    solvers: show ? r.solvers.slice(0, 3).map(s => ({ ...s, flag: ((s.b || '') + ' ' + (s.flag ? flagOf(s.flag) : '')).trim() })) : [], nSolvers: show ? r.solvers.length : 0,
    gami: gami.info(r),
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
  if (u.pathname.startsWith('/fonts/')) return fs.readFile(path.join(WORDS_PUB, 'fonts', path.basename(u.pathname)), (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'font/woff2' }); res.end(b); });
  const file = path.join(PUB, path.normalize(u.pathname === '/' ? '/vertical.html' : u.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(b); });
}).listen(PORT, '127.0.0.1');

if (CHANNEL) chat.start({ channel: CHANNEL, log: m => console.log('[chat]', m), status: s => { chatStatus = s; },
  onMessage: m => { const name = String(m.user).replace(/^@/, ''); if (CHAT_BOTS.test(name) || isHint(m)) return; const nm = cleanName(name.slice(0, 20)); gami.seen(nm, m.channelId); onChat(nm, m.text); } });

// Test-Zuschauer (DEMO=1): stimmen meist für die „beliebtere“ Seite, damit Balken und Ergebnis nach etwas aussehen
if (process.env.DEMO === '1') {
  const names = ['lena_k', 'mike_tx', 'joao.br', 'aziz99', 'tom_uk', 'sakura', 'pierre', 'marta_pl', 'ravi', 'kim.s', 'emma.rose', 'lucia'];
  const ctry = ['brazil', 'germany', 'japan', 'france', 'india', 'poland', 'mexico', 'italy'];
  for (const n of names.slice(0, 8)) onChat(n, '!' + ctry[Math.floor(Math.random() * ctry.length)]);
  const lean = Math.random();
  setInterval(() => {
    if (!round || round.phase !== 'vote') return;
    const u = names[Math.floor(Math.random() * names.length)];
    onChat(u, Math.random() < (round.n % 2 ? 0.7 : 0.4) ? 'A' : 'b');
  }, 900);
}
const WATCH = ['server.js', 'public/vertical.html', '../chat.js', '../gami.js', '../gami-ui.js'].map(f => path.join(__dirname, f));
const mtimes = () => WATCH.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }).join();
const M0 = mtimes(); setInterval(() => { if (mtimes() !== M0) { console.log('Dateien geändert, Neustart'); save(); setTimeout(() => process.exit(0), 2000); } }, 60000);
console.log('Flag Battle auf http://127.0.0.1:' + PORT);
