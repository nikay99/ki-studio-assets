// Hauptstadt-Raten „Guess the Capital“ (Entwurf 10.10.): gleiches Muster wie country/server.js, eigener Server auf 127.0.0.1:8093.
// Zeigt Flagge, Namen und Umriss eines Landes; der Chat rät die Hauptstadt. Tipps mit der Zeit: Anfangsbuchstabe, Lage im Umriss,
// dann Endbuchstabe bzw. bei „Tricky“-Ländern die Falle („Not Sydney“). Alle Richtigen bekommen Punkte, die Schnellsten mehr.
const http = require('http'), fs = require('fs'), path = require('path');
const { COUNTRY_LIST, flagOf } = require('../public/countries.js');
const chat = require('../chat.js');

const DATA = process.env.DATA_DIR || '/var/lib/marble-capital';
const CHANNEL = process.env.CHANNEL || '';
const PORT = +process.env.PORT || 8093;
const PUB = path.join(__dirname, 'public');
const VERSION = String(Date.now());
fs.mkdirSync(DATA, { recursive: true });

const GAME = JSON.parse(fs.readFileSync(path.join(__dirname, 'capitals-game.json'), 'utf8'));   // [ISO2, Hauptstadt, Aliase, Stufe, Falle, Breite, Länge]
const DISPLAY = { GB: 'United Kingdom', US: 'United States', CF: 'Central African Republic', DO: 'Dominican Republic', BA: 'Bosnia & Herzegovina', CD: 'DR Congo' };
const BYCODE = Object.fromEntries(COUNTRY_LIST.map(c => [c[0], c]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const BAD = /fuck|shit|cunt|nigg|fag|retard|whore|slut|bitch|pussy|dick|porn|hitler|nazi|kkk|rape|wichs|fotze|hure|schlampe|hurensohn|nutte/i;
const cleanName = u => BAD.test(u.replace(/[^a-z]/gi, '')) ? 'viewer' : u;
const CHAT_BOTS = /^(nightbot|streamelements|moobot|fossabot)$/i;
const OWN_CHANNEL = 'UCG6xEYtopZcK66gz_biiIIA', HINT = /^\S{0,16}\s*(Type your|Every chat message|Points add up|Know the capital|The fastest answer)/u;
const isHint = m => m.channelId === OWN_CHANNEL && HINT.test(String(m.text || ''));

// Zeiten wie bei Guess the Country: Runde 65 s, Tipps nach 12 / 26 / 40 s, Buchstaben ab 20 s alle 6 s, nach erstem Treffer noch 15 s
const ROUND_MS = 65000, SHOW_MS = 9000, HINTS_AT = [12000, 26000, 40000], FIRST_REVEAL = 20000, REVEAL_EVERY = 6000;
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
const KNOWN_FILE = path.join(DATA, 'known.json');
let known = new Set(); try { known = new Set(JSON.parse(fs.readFileSync(KNOWN_FILE, 'utf8'))); } catch {}
let knownT = null;
const saveKnown = () => { if (!knownT) knownT = setTimeout(() => { knownT = null; fs.writeFile(KNOWN_FILE, JSON.stringify([...known].slice(-20000)), () => {}); }, 3000); };

// ---------- Runden ----------
let round = null, recent = [], feed = [], feedId = 0, msgCount = 0, chatStatus = { chat: CHANNEL ? 'startet' : 'kein Kanal' };
function nextCountry(n) {
  // Rhythmus: bekannt, bekannt, „Tricky“ (größte Stadt ist nicht die Hauptstadt) bzw. schwer im Wechsel
  const kind = n % 3 ? 'easy' : (n % 6 ? 'tricky' : 'hard');
  const ok = g => !recent.includes(g[0]) && (kind === 'easy' ? g[3] === 1 && !g[4] : kind === 'tricky' ? !!g[4] : g[3] === 2 && !g[4]);
  const pool = GAME.filter(ok);
  const forced = (process.env.FORCE || '').split(',').filter(Boolean);   // nur für lokale Vorschauen
  const [code, capital, al, tier, trap] = forced.length ? GAME.find(g => g[0] === forced[(n - 1) % forced.length]) : pool[Math.floor(Math.random() * pool.length)];
  const country = DISPLAY[code] || BYCODE[code][1];
  const shown = capital.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-]/g, ' ').replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
  return { code, country, capital, shown, w: norm(capital).replace(/ /g, ''), alias: [...new Set([norm(capital), ...al.map(norm)])], trap, hard: tier === 2, tricky: !!trap };
}
function startRound() {
  rollDay();
  const n = st.rounds + 1, q = nextCountry(n);
  recent = [...recent, q.code].slice(-60);
  const letters = [...q.shown];
  const idx = letters.map((ch, i) => i).filter(i => i > 0 && /[A-Z]/.test(letters[i])).sort(() => Math.random() - 0.5);
  const maxReveal = Math.max(1, Math.floor(idx.length * 0.5));
  round = { n, q, letters, order: idx.slice(0, maxReveal), revealed: [], start: Date.now(), end: Date.now() + ROUND_MS, solvers: [], phase: 'guess', hints: 0, wrong: {} };
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
  return t.split(' ').length <= 5 && q.alias.some(a => (' ' + t + ' ').includes(' ' + a + ' '));
}
function onChat(user, text) {
  msgCount++; rollDay();
  const push = f => { feed.push({ id: ++feedId, user, ...f }); if (feed.length > 200) feed = feed.slice(-100); };
  if (!known.has(user)) { known.add(user); saveKnown(); push({ welcome: 1 }); }
  if (round && round.phase === 'guess' && !round.solvers.some(s => s.user === user) && isCorrect(text)) {
    const place = round.solvers.length, ms = Date.now() - round.start;
    const pts = place < PTS.length ? PTS[place] : 3;
    round.solvers.push({ user, pts, ms, flag: st.flags[user] || '' });
    st.points[user] = (st.points[user] || 0) + pts;
    if (place === 0) { st.wins[user] = (st.wins[user] || 0) + 1; if (!st.fastest || ms < st.fastest.ms) st.fastest = { user, ms, word: round.q.shown }; }
    save(); push({ ok: 1, pts });
    if (place === 0) round.end = Math.min(round.end, Date.now() + 15000);
    return;
  }
  if (round && round.phase !== 'guess' && isCorrect(text)) return push({ late: 1 });
  if (round && round.solvers.some(s => s.user === user)) return;
  const cmd = /^\s*!/.test(text) ? norm(text) : '';
  if (cmd) { for (const [code, , al] of COUNTRY_LIST) if (al.map(norm).includes(cmd)) { if (st.flags[user] !== code) { st.flags[user] = code; save(); push({ flag: flagOf(code) }); } break; } return; }
  const g = norm(text).toUpperCase();
  if (g && !BAD.test(g.replace(/ /g, ''))) {
    push({ guess: g.length > 16 ? g.slice(0, 15) + '…' : g, flag: st.flags[user] ? flagOf(st.flags[user]) : '' });
    // häufigster falscher Tipp der Runde (wird bei der Auflösung gezeigt: „Most said SYDNEY“), nur kurze Tipps
    if (round && round.phase === 'guess' && g.split(' ').length <= 3 && g.length <= 18) round.wrong[g] = (round.wrong[g] || 0) + 1;
  }
}

function board() {
  rollDay();
  const top = Object.entries(st.points).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([u, p]) => ({ user: u, pts: p, wins: st.wins[u] || 0, flag: st.flags[u] ? flagOf(st.flags[u]) : '' }));
  return { top, players: Object.keys(st.points).length, rounds: st.rounds, fastest: st.fastest, streak: st.streak };
}
function view() {
  const r = round, show = r.phase === 'show', q = r.q;
  const mw = Object.entries(r.wrong).sort((a, b) => b[1] - a[1])[0];
  return {
    v: VERSION, now: Date.now(), n: r.n, phase: r.phase, code: q.code, country: q.country, hard: q.hard, tricky: q.tricky,
    tiles: r.letters.map((ch, i) => ch === ' ' ? ' ' : (show || r.revealed.includes(i) || (i === 0 && r.hints >= 1)) ? ch : ''),
    hints: { first: r.hints >= 1 ? q.shown[0] : null, map: r.hints >= 2, third: r.hints >= 3 ? (q.trap ? 'Not ' + q.trap : q.shown.replace(/ /g, '').slice(-1)) : null },
    hintsAt: HINTS_AT, end: r.end, start: r.start, showEnd: r.showEnd || 0,
    solvers: r.solvers.map(s => ({ ...s, flag: s.flag ? flagOf(s.flag) : '' })),
    answer: show ? { name: q.capital, mostWrong: mw && mw[1] >= 2 ? mw[0] : null } : null,
  };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const WORDS_PUB = path.join(__dirname, '../words/public');
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/state') return send(res, 200, view());
  if (u.pathname === '/api/board') return send(res, 200, board());
  if (u.pathname === '/api/feed') { const since = +u.searchParams.get('since') || 0; return send(res, 200, { last: feedId, feed: feed.filter(f => f.id > since).slice(-20) }); }
  if (u.pathname === '/api/status') return send(res, 200, { chatStatus, msgCount, round: round && round.n });
  if (u.pathname === '/api/music') return fs.readdir(path.join(process.env.MUSIC_DIR || '/var/lib/marble/music'), (e, f) => send(res, 200, (f || []).filter(x => /\.(mp3|ogg)$/.test(x))));
  if (u.pathname.startsWith('/music/')) { const f = path.join(process.env.MUSIC_DIR || '/var/lib/marble/music', path.basename(decodeURIComponent(u.pathname))); return fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); res.end(b); }); }
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
  const miss = ['london', 'paris', 'madrid', 'lagos', 'cairo'];
  for (const n of names.slice(0, 8)) onChat(n, '!' + ctry[Math.floor(Math.random() * ctry.length)]);
  setInterval(() => {
    if (!round || round.phase !== 'guess') return;
    const u = names[Math.floor(Math.random() * names.length)], el = Date.now() - round.start;
    const late = +process.env.DEMO_SOLVE_AFTER || 9000;
    if (el > late && Math.random() < Math.min(0.5, (el - late) / 20000)) onChat(u, round.q.capital);
    else onChat(u, round.q.trap && Math.random() < 0.6 ? round.q.trap : miss[Math.floor(Math.random() * miss.length)]);
  }, 1300);
}
const WATCH = ['server.js', 'capitals-game.json', 'public/vertical.html', 'public/shapes.json', '../chat.js'].map(f => path.join(__dirname, f));
const mtimes = () => WATCH.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }).join();
const M0 = mtimes(); setInterval(() => { if (mtimes() !== M0) { console.log('Dateien geändert, Neustart'); save(); setTimeout(() => process.exit(0), 2000); } }, 60000);
console.log('Hauptstadt-Raten auf http://127.0.0.1:' + PORT);
