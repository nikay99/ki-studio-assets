// Länder-Kugelrennen: lokaler Server für die Rennseite (127.0.0.1:8080) + Statusseite nach außen (Port 80, nur mit Token).
// Liest den YouTube-Chat (chat.js), ordnet Nachrichten Ländern zu und merkt sich Tagesranglisten.
const http = require('http'), fs = require('fs'), path = require('path');
const { COUNTRY_LIST } = require('./public/countries.js');
const chat = require('./chat.js');

const DATA = process.env.DATA_DIR || '/var/lib/marble';
const TOKEN = process.env.STATUS_TOKEN || '';
const CHANNEL = process.env.CHANNEL || '';
const PUB = path.join(__dirname, 'public');
const VERSION = String(Date.now());   // neue Version nach jedem Neustart → Rennseite lädt sich neu
fs.mkdirSync(DATA, { recursive: true });

// ---------- Länder aus Chat-Text erkennen ----------
const ALIAS = new Map(), CODES = new Set(COUNTRY_LIST.map(c => c[0]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zЀ-ӿ' ]+/g, ' ').replace(/\s+/g, ' ').trim();
for (const [code, , al] of COUNTRY_LIST) for (const a of al) ALIAS.set(norm(a), code);
function countryOf(text) {
  const ri = [...text].map(ch => ch.codePointAt(0)).filter(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF);
  if (ri.length >= 2) { const c = String.fromCharCode(ri[0] - 0x1F1E6 + 65, ri[1] - 0x1F1E6 + 65); if (CODES.has(c)) return c; }
  const raw = text.trim();
  if (/^[A-Z]{2}$/.test(raw) && CODES.has(raw)) return raw;
  const words = norm(text).split(' ').filter(Boolean).slice(0, 12);
  for (let n = Math.min(4, words.length); n >= 1; n--)          // längste Wortfolge zuerst ("south africa" vor "africa")
    for (let i = 0; i + n <= words.length; i++) { const c = ALIAS.get(words.slice(i, i + n).join(' ')); if (c) return c; }
  return null;
}

// ---------- Zustand ----------
const STATE_FILE = path.join(DATA, 'state.json');
const lastFan = new Map();        // user → Zeit des letzten Fanpunkts
let st = { day: '', countryWins: {}, playerWins: {}, fans: {}, races: 0, totalRaces: 0 };
try { st = { ...st, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch {}
const today = () => new Date().toISOString().slice(0, 10);
function rollDay() { if (st.day !== today()) { st.day = today(); st.countryWins = {}; st.playerWins = {}; st.fans = {}; st.races = 0; lastFan.clear(); } }
const save = () => fs.writeFile(STATE_FILE, JSON.stringify(st), () => {});
rollDay();
// Nation of the Hour: Siege pro volle Stunde (UTC); beim Stundenwechsel wird der Stundensieger festgehalten
const hourKey = () => new Date().toISOString().slice(0, 13);
function rollHour() {
  if (st.hour === hourKey()) return;
  const fans = st.fans || {}, best = Object.entries(st.hourWins || {}).sort((a, b) => b[1] - a[1] || (fans[b[0]] || 0) - (fans[a[0]] || 0))[0];
  if (best && st.hour) st.champ = { code: best[0], wins: best[1], hour: st.hour };
  st.hour = hourKey(); st.hourWins = {}; save();
}
rollHour(); setInterval(rollHour, 5000);

const picks = new Map();          // user → {code, ts}
const events = [];                // {id, user, code}
// Namen erscheinen groß im Stream: grobe Beleidigungen nicht anzeigen (zusätzlich YouTube-Studio „Blockierte Wörter“ nutzen)
const BAD = /fuck|shit|cunt|nigg|fag|retard|whore|slut|bitch|pussy|dick|porn|hitler|nazi|kkk|rape|wichs|fotze|hure|schlampe|hurensohn|nutte/i;
const cleanName = u => BAD.test(u.replace(/[^a-z]/gi, '')) ? 'viewer' : u;
let evId = 0, chatStatus = { chat: CHANNEL ? 'startet' : 'kein Kanal gesetzt' }, msgCount = 0, joinCount = 0;
function addPick(user, code) {
  const prev = picks.get(user);
  // +1 Fanpunkt fürs Land, höchstens einmal pro Minute und Zuschauer (gegen Spam)
  if (!prev || prev.code !== code || Date.now() - (lastFan.get(user) || 0) > 60000) { rollDay(); st.fans = st.fans || {}; st.fans[code] = (st.fans[code] || 0) + 1; lastFan.set(user, Date.now()); save(); }
  picks.set(user, { code, ts: Date.now() });
  events.push({ id: ++evId, user, code }); if (events.length > 500) events.shift();
  joinCount++;
}
if (CHANNEL) chat.start({ channel: CHANNEL, log: m => console.log('[chat]', m), status: s => { chatStatus = { ...s, since: new Date().toISOString() }; },
  onMessage: m => { msgCount++; const c = countryOf(m.text); if (c) addPick(cleanName(m.user.replace(/^@/, '').slice(0, 20)), c); } });

// Demo-Zuschauer, solange niemand im Chat ist (DEMO=1): damit die Seitenleiste im Test nicht leer bleibt.
if (process.env.DEMO === '1') {
  const names = ['lena_k', 'mike_tx', 'joao.br', 'aziz99', 'tom_uk', 'sakura', 'pierre', 'marta_pl', 'ravi', 'kim.s'];
  setInterval(() => { if (Math.random() < 0.5) addPick(names[Math.floor(Math.random() * names.length)], COUNTRY_LIST[Math.floor(Math.random() * COUNTRY_LIST.length)][0]); }, 9000);
}

const DEFAULT_POOL = ['US','GB','DE','AT','FR','IT','ES','NL','PL','UA','TR','BR','MX','CA','AR','JP','KR','IN','ID','UZ','AU','SE','NO','CH','PT','EG','NG','PH','VN','SA','CO','CL','ZA','MA','GR','IE','RO','HU','CZ','PK','BD','TH','MY','NZ','DK','FI','BE','IL','KE','PE'];
function lineup(n = 30) {
  const cutoff = Date.now() - 20 * 60 * 1000, recent = new Map();
  for (const [user, p] of [...picks.entries()].sort((a, b) => b[1].ts - a[1].ts)) {
    if (p.ts < cutoff) { picks.delete(user); continue; }
    if (!recent.has(p.code)) recent.set(p.code, []);
    recent.get(p.code).push(user);
  }
  const codes = [...recent.keys()].slice(0, n);
  const pool = DEFAULT_POOL.filter(c => !codes.includes(c));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  while (codes.length < n) codes.push(pool.shift());
  return codes.map(c => ({ code: c, players: (recent.get(c) || []).slice(0, 5) }));
}

// ---------- HTTP ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8' };
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
function file(res, p) { fs.readFile(p, (e, b) => e ? send(res, 404, 'not found', 'text/plain') : send(res, 200, b, TYPES[path.extname(p)] || 'application/octet-stream')); }
function body(req) { return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { r(JSON.parse(d)); } catch { r({}); } }); }); }

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/') return file(res, path.join(PUB, 'race.html'));
  if (u.pathname === '/matter.min.js') return file(res, require.resolve('matter-js/build/matter.min.js'));
  if (u.pathname === '/api/version') return send(res, 200, { v: VERSION });
  if (u.pathname === '/api/lineup') return send(res, 200, lineup());
  if (u.pathname === '/api/events') { const since = +u.searchParams.get('since') || 0; return send(res, 200, { last: evId, events: events.filter(e => e.id > since) }); }
  if (u.pathname === '/api/board') { rollDay(); return send(res, 200, board()); }
  if (u.pathname === '/api/music') return fs.readdir(path.join(DATA, 'music'), (e, f) => send(res, 200, (f || []).filter(x => /\.(mp3|ogg)$/.test(x))));
  if (u.pathname.startsWith('/music/')) return file(res, path.join(DATA, 'music', path.basename(u.pathname)));
  if (u.pathname === '/api/result' && req.method === 'POST') {
    const r = await body(req); rollDay();
    rollHour();
    if (r.winner) { st.countryWins[r.winner] = (st.countryWins[r.winner] || 0) + 1; st.hourWins[r.winner] = (st.hourWins[r.winner] || 0) + 1; }
    for (const p of r.players || []) st.playerWins[p] = (st.playerWins[p] || 0) + 1;
    st.races++; st.totalRaces++; save(); return send(res, 200, board());
  }
  if (u.pathname.startsWith('/')) return file(res, path.join(PUB, path.normalize(u.pathname).replace(/^(\.\.[/\\])+/, '')));
}).listen(8080, '127.0.0.1');

function board() {
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const hourEnds = new Date(st.hour + ':00:00Z').getTime() + 3600000;
  return { races: st.races, countries: top(st.countryWins, 10), players: top(st.playerWins, 5), fans: top(st.fans || {}, 5),
    hour: top(st.hourWins || {}, 3), hourEnds, champ: st.champ || null };
}

// Statusseite nach außen: nur /s/<TOKEN>/…
if (TOKEN) http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), pre = `/s/${TOKEN}/`;
  if (!u.pathname.startsWith(pre)) return send(res, 404, 'not found', 'text/plain');
  const p = u.pathname.slice(pre.length);
  if (p === '' || p === 'status') {
    let prog = ''; try { prog = fs.readFileSync(path.join(DATA, 'progress.txt'), 'utf8').split('progress=').slice(-2, -1)[0] || ''; } catch {}
    let run = {}; try { run = JSON.parse(fs.readFileSync(path.join(DATA, 'run.json'), 'utf8')); } catch {}
    const load = fs.readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3);
    return send(res, 200, { time: new Date().toISOString(), run, ffmpeg: Object.fromEntries(prog.trim().split('\n').map(l => l.split('=')).filter(x => x.length === 2)),
      load, chat: chatStatus, chatMessages: msgCount, joins: joinCount, board: board(), totalRaces: st.totalRaces });
  }
  if (['snap.jpg', 'log.txt'].includes(p) || /^test\d\.mp4$/.test(p)) return file(res, path.join(DATA, p));
  if (p === 'diag') return execFile('bash', ['-c', `echo "git: ${gitHead}"; uptime; nproc; free -m | head -2; ps -eo pcpu,pmem,comm --sort=-pcpu | head -8; echo; tail -20 ${DATA}/ffmpeg.err; echo; tail -5 ${DATA}/log.txt`], { timeout: 10000 }, (e, out) => send(res, 200, out || String(e), 'text/plain; charset=utf-8'));
  if (p === 'update.txt') return file(res, path.join(DATA, 'update.log'));
  if (p === 'setup.txt') return file(res, '/var/log/marble-setup.log');
  send(res, 404, 'not found', 'text/plain');
}).listen(+process.env.STATUS_PORT || 80, '0.0.0.0');


// ---------- Selbst-Update (ohne cron): alle 2 Min. Repo prüfen; bei Änderung beendet sich der Server, systemd startet ihn neu ----------
const { execFile } = require('child_process');
const REPO = path.resolve(__dirname, '..');
const git = (...a) => new Promise(r => execFile('git', ['-C', REPO, ...a], { timeout: 60000 }, (e, out) => r(e ? '' : out.trim())));
let gitHead = '';
if (fs.existsSync(path.join(REPO, '.git')) && process.env.SELF_UPDATE !== '0') {
  git('rev-parse', 'HEAD:livestream').then(h => gitHead = h);
  setInterval(async () => {
    await git('fetch', '-q', '--depth', '1', 'origin', 'main');
    const now = await git('rev-parse', 'HEAD:livestream'), remote = await git('rev-parse', 'origin/main:livestream');
    if (!remote || remote === now) return;
    const pkgOld = await git('rev-parse', 'HEAD:livestream/package.json');
    await git('reset', '-q', '--hard', 'origin/main');
    if (pkgOld !== await git('rev-parse', 'HEAD:livestream/package.json'))
      await new Promise(r => execFile('npm', ['install', '--omit=dev', '-q'], { cwd: __dirname, timeout: 300000 }, r));
    fs.appendFileSync(path.join(DATA, 'update.log'), `${new Date().toISOString()} update ${remote}\n`);
    process.exit(0);
  }, 120000);
}

console.log('server läuft', { CHANNEL, DATA });
module.exports = { countryOf };
