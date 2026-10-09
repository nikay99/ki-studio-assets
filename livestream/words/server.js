// Wortraten-Stream (Entwurf 09.10.): zweites Spiel neben dem Kugelrennen, eigener Server auf 127.0.0.1:8090.
// Liest den YouTube-Chat (../chat.js), deckt ein Wort Buchstabe für Buchstabe auf; alle Richtigen einer Runde bekommen Punkte,
// die Schnellsten mehr. Jede dritte Runde ist eine Flaggen-Runde (Länder samt Schreibweisen aus ../public/countries.js).
const http = require('http'), fs = require('fs'), path = require('path');
const { COUNTRY_LIST, flagOf } = require('../public/countries.js');
const chat = require('../chat.js');

const DATA = process.env.DATA_DIR || '/var/lib/marble-words';
const CHANNEL = process.env.CHANNEL || '';
const PORT = +process.env.PORT || 8090;
const PUB = path.join(__dirname, 'public');
const VERSION = String(Date.now());
fs.mkdirSync(DATA, { recursive: true });

const WORDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf8'));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
const BAD = /fuck|shit|cunt|nigg|fag|retard|whore|slut|bitch|pussy|dick|porn|hitler|nazi|kkk|rape|wichs|fotze|hure|schlampe|hurensohn|nutte/i;
const cleanName = u => BAD.test(u.replace(/[^a-z]/gi, '')) ? 'viewer' : u;
const CHAT_BOTS = /^(nightbot|streamelements|moobot|fossabot)$/i;
// Chat-Hinweise der Wächter (ensure-live.py) kommen vom eigenen Kanal: nicht als Spieler-Nachricht zählen
const OWN_CHANNEL = 'UCG6xEYtopZcK66gz_biiIIA', HINT = /^\S{0,16}\s*(Type your|Every chat message|Points add up|Know the word|The fastest answer)/u;
const isHint = m => m.channelId === OWN_CHANNEL && HINT.test(String(m.text || ''));

// Zeiten: das Videobild hängt einige Sekunden hinter dem Chat, Runden bleiben deshalb lange offen
const ROUND_MS = 47000, REVEAL_EVERY = 5000, SHOW_MS = 7000, FIRST_REVEAL = 7000;   // Stream läuft mit ultra-niedriger Latenz (Niklas 09.10.)
const PTS = [10, 7, 5];             // Platz 1–3, danach je 3 Punkte für alle weiteren Richtigen

// ---------- Tageszustand ----------
const STATE_FILE = path.join(DATA, 'state.json');
let st = { day: '', points: {}, wins: {}, flags: {}, rounds: 0, fastest: null, streak: null };
try { st = { ...st, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch {}
const today = () => new Date().toISOString().slice(0, 10);
function rollDay() { if (st.day !== today()) { st = { day: today(), points: {}, wins: {}, flags: st.flags || {}, rounds: 0, fastest: null, streak: null }; } }
let saveT = null;
const save = () => { if (!saveT) saveT = setTimeout(() => { saveT = null; fs.writeFile(STATE_FILE, JSON.stringify(st), () => {}); }, 1500); };
rollDay();

// ---------- Runden ----------
let round = null, recent = [], deck = [], feed = [], feedId = 0, msgCount = 0, chatStatus = { chat: CHANNEL ? 'startet' : 'kein Kanal' };
function nextWord() {
  if (!deck.length) deck = WORDS.map((_, i) => i).sort(() => Math.random() - 0.5);
  return WORDS[deck.pop()];
}
const EASY = new Set('US GB DE AT FR IT ES NL PL UA TR BR MX CA AR JP KR IN ID AU SE NO CH PT EG NG PH VN SA CO CL ZA MA GR IE RO HU CZ PK TH MY NZ DK FI BE IL KE PE CN RU JM CU IS HR RS QA AE SG NP BD LK CM GH SN'.split(' '));
function nextFlag() {
  // bekannte Länder, damit schnelle Erfolgsmomente kommen (Kirgisistan & Co. sind zu schwer)
  const pool = COUNTRY_LIST.filter(c => EASY.has(c[0]) && !recent.includes(c[0]));
  const [code, name, al] = pool[Math.floor(Math.random() * pool.length)];
  return { w: norm(name).replace(/ /g, ''), shown: name.toUpperCase(), c: 'Which country?', e: flagOf(code), flag: code, alias: al.map(norm) };
}
function startRound() {
  rollDay();
  const n = st.rounds + 1, isFlag = n % 3 === 0;
  const q = isFlag ? nextFlag() : (() => { const x = nextWord(); return { w: x.w, shown: x.w.toUpperCase(), c: x.c, e: x.e, r: x.r }; })();   // r = Emoji-Rebus (Niklas 09.10.: Einzel-Emojis zu leicht)
  recent = [...recent, q.flag || q.w].slice(-40);
  const letters = [...q.shown];
  // Reihenfolge des Aufdeckens: nie mehr als gut die Hälfte, Leerzeichen sind immer sichtbar
  const idx = letters.map((ch, i) => i).filter(i => /[A-Z]/.test(letters[i])).sort(() => Math.random() - 0.5);
  const maxReveal = Math.max(1, Math.floor(idx.length * 0.6));
  round = { n, q, letters, order: idx.slice(0, maxReveal), revealed: [], start: Date.now(), end: Date.now() + ROUND_MS, solvers: [], phase: 'guess' };
  st.rounds = n; save();
}
function tick() {
  if (!round) return startRound();
  const now = Date.now();
  if (round.phase === 'guess') {
    const want = Math.min(round.order.length, Math.max(0, Math.floor((now - round.start - FIRST_REVEAL) / REVEAL_EVERY) + 1));
    if (now - round.start >= FIRST_REVEAL) round.revealed = round.order.slice(0, want);
    if (now >= round.end) finish();
  } else if (round.phase === 'show' && now >= round.showEnd) startRound();
}
function finish() {
  round.phase = 'show'; round.showEnd = Date.now() + SHOW_MS;
  const first = round.solvers[0];
  if (first) {
    st.streak = st.streak && st.streak.user === first.user ? { user: first.user, n: st.streak.n + 1 } : { user: first.user, n: 1 };
  } else st.streak = null;
  save();
}
setInterval(tick, 250); tick();

function isCorrect(text) {
  const t = norm(text); if (!t) return false;
  const q = round.q, flat = t.replace(/ /g, '');
  if (flat === q.w) return true;
  if (q.alias && q.alias.includes(t)) return true;
  return t.split(' ').includes(q.w) && t.split(' ').length <= 4;   // „it's a cat“ zählt, lange Sätze nicht
}
function onChat(user, text) {
  msgCount++;
  rollDay();
  // Jede Nachricht bekommt eine sichtbare Rückmeldung (Niklas 09.10.: sonst wirkt der Chat „tot“)
  const late = round && round.phase !== 'guess' && isCorrect(text);
  if (round && round.phase === 'guess' && !round.solvers.some(s => s.user === user) && isCorrect(text)) {
    const place = round.solvers.length, ms = Date.now() - round.start;
    const pts = place < PTS.length ? PTS[place] : 3;
    round.solvers.push({ user, pts, ms, flag: st.flags[user] || '' });
    st.points[user] = (st.points[user] || 0) + pts;
    if (place === 0) { st.wins[user] = (st.wins[user] || 0) + 1; if (!st.fastest || ms < st.fastest.ms) st.fastest = { user, ms, word: round.q.shown }; }
    feed.push({ id: ++feedId, user, ok: 1, pts, place }); save();
    if (place === 0) round.end = Math.min(round.end, Date.now() + 12000);   // nach dem ersten Treffer noch 12 s für alle anderen
  } else if (late) {
    feed.push({ id: ++feedId, user, late: 1 });   // richtig, aber nach Rundenende (Bildverzögerung) – freundlich quittieren
  } else if (!round || !round.solvers.some(s => s.user === user)) {
    // Flagge fürs Leaderboard: wer ein Land schreibt (und nicht gerade richtig rät), bekommt sie sofort sichtbar
    let flag = null;
    for (const [code, , al] of COUNTRY_LIST) if (al.map(norm).includes(norm(text))) { flag = code; break; }
    if (flag && st.flags[user] !== flag) { st.flags[user] = flag; save(); feed.push({ id: ++feedId, user, flag: flagOf(flag) }); }
    else {
      const g = norm(text).toUpperCase();
      if (g && !BAD.test(g.replace(/ /g, ''))) feed.push({ id: ++feedId, user, guess: g.length > 14 ? g.slice(0, 13) + '…' : g });
    }
  }
  if (feed.length > 200) feed = feed.slice(-100);
}

function board() {
  rollDay();
  const top = Object.entries(st.points).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([u, p]) => ({ user: u, pts: p, wins: st.wins[u] || 0, flag: st.flags[u] ? flagOf(st.flags[u]) : '' }));
  return { top, players: Object.keys(st.points).length, rounds: st.rounds, fastest: st.fastest, streak: st.streak };
}
function view() {
  const r = round, show = r.phase === 'show';
  return {
    v: VERSION, now: Date.now(), n: r.n, phase: r.phase, cat: r.q.c, emoji: r.q.e, rebus: r.q.r || null, flagRound: !!r.q.flag,
    tiles: r.letters.map((ch, i) => ch === ' ' ? ' ' : (show || r.revealed.includes(i)) ? ch : ''),
    end: r.end, start: r.start, showEnd: r.showEnd || 0,
    solvers: r.solvers.map(s => ({ ...s, flag: s.flag ? flagOf(s.flag) : '' })),
    answer: show ? r.q.shown : null,
  };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json' };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/state') return send(res, 200, view());
  if (u.pathname === '/api/board') return send(res, 200, board());
  if (u.pathname === '/api/feed') { const since = +u.searchParams.get('since') || 0; return send(res, 200, { last: feedId, feed: feed.filter(f => f.id > since) }); }
  if (u.pathname === '/api/status') return send(res, 200, { chatStatus, msgCount, round: round && round.n });
  if (u.pathname === '/api/music') return fs.readdir(path.join(process.env.MUSIC_DIR || '/var/lib/marble/music'), (e, f) => send(res, 200, (f || []).filter(x => /\.(mp3|ogg)$/.test(x))));
  if (u.pathname.startsWith('/music/')) { const f = path.join(process.env.MUSIC_DIR || '/var/lib/marble/music', path.basename(decodeURIComponent(u.pathname))); return fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); res.end(b); }); }
  const file = path.join(PUB, path.normalize(u.pathname === '/' ? '/index.html' : u.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(b); });
}).listen(PORT, '127.0.0.1');

if (CHANNEL) chat.start({ channel: CHANNEL, log: m => console.log('[chat]', m), status: s => { chatStatus = s; },
  onMessage: m => { const name = String(m.user).replace(/^@/, ''); if (CHAT_BOTS.test(name) || isHint(m)) return; onChat(cleanName(name.slice(0, 20)), m.text); } });

// Test-Zuschauer (DEMO=1): raten mal falsch, mal richtig
if (process.env.DEMO === '1') {
  const names = ['lena_k', 'mike_tx', 'joao.br', 'aziz99', 'tom_uk', 'sakura', 'pierre', 'marta_pl', 'ravi', 'kim.s', 'emma.rose', 'lucia'];
  const ctry = ['brazil', 'germany', 'japan', 'france', 'india', 'poland', 'mexico', 'italy'];
  for (const n of names.slice(0, 8)) onChat(n, ctry[Math.floor(Math.random() * ctry.length)]);
  setInterval(() => {
    const u = names[Math.floor(Math.random() * names.length)], el = Date.now() - round.start;
    if (!round || round.phase !== 'guess') { if (round && Math.random() < 0.3) onChat(u, round.q.w); return; }
    if (Math.random() < 0.12) return onChat(u, ['hello!', 'no idea lol', 'canada', 'is it a fish?'][Math.floor(Math.random() * 4)]);
    if (el > 9000 && Math.random() < Math.min(0.5, (el - 9000) / 20000)) onChat(u, round.q.w);
    else onChat(u, round.q.w.split('').sort(() => Math.random() - 0.5).join(''));
  }, 1300);
}
// Selbst-Update: Das Repo wird auf dem N95 alle 3 Min. gezogen. Ändert sich eine Datei des Wortratens, beendet sich der Server,
// systemd startet ihn neu, und die Seite lädt bei neuer Version selbst neu.
const WATCH = ['server.js', 'words.json', 'public/index.html', '../chat.js'].map(f => path.join(__dirname, f));
const mtimes = () => WATCH.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }).join();
const M0 = mtimes(); setInterval(() => { if (mtimes() !== M0) { console.log('Dateien geändert, Neustart'); save(); setTimeout(() => process.exit(0), 2000); } }, 60000);
console.log('Wortraten auf http://127.0.0.1:' + PORT);
