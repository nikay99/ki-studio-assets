// Länder-Kugelrennen: lokaler Server für die Rennseite (127.0.0.1:8080) + Statusseite nach außen (Port 80, nur mit Token).
// Liest den YouTube-Chat (chat.js), ordnet Nachrichten Ländern zu und merkt sich Tagesranglisten.
const http = require('http'), fs = require('fs'), path = require('path');
const { COUNTRY_LIST, flagOf } = require('./public/countries.js');
const chat = require('./chat.js');
const clips = require('./clips.js');

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
let chatDelays = [];   // ms vom Absenden im YouTube-Chat bis zur Ankunft hier (Teil der Gesamtverzögerung)
let evId = 0, chatStatus = { chat: CHANNEL ? 'startet' : 'kein Kanal gesetzt' }, msgCount = 0, joinCount = 0;
function fanPoint(user, code) {
  // +1 Fanpunkt fürs Land, höchstens einmal pro Minute und Zuschauer – auch beim Länderwechsel (gegen Hin-und-her-Spam)
  if (Date.now() - (lastFan.get(user) || 0) > 60000) { rollDay(); st.fans = st.fans || {}; st.fans[code] = (st.fans[code] || 0) + 1; lastFan.set(user, Date.now()); save(); }
}
// Spieler am Kanal erkennen, nicht nur am Anzeigenamen: gleicher Name, anderer Kanal → „name#2“ (kein Mitnehmen fremder Siege)
function uniqueName(name, cid) {
  if (!cid) return name;
  st.ids = st.ids || {};
  let n = name, i = 2;
  while (st.ids[n] && st.ids[n] !== cid) n = `${name.slice(0, 17)}#${i++}`;
  if (!st.ids[n]) { st.ids[n] = cid; save(); }
  return n;
}
function addPick(user, code) {
  fanPoint(user, code);
  picks.set(user, { code, ts: Date.now() });
  events.push({ id: ++evId, user, code }); if (events.length > 500) events.shift();
  joinCount++; hourStat.joins++;
}
// CHEER: jede weitere Nachricht eines Mitspielers gibt seiner Kugel einen Schub – höchstens alle 10 s pro Person,
// damit mehr verschiedene Fans zählen, nicht schnelles Tippen
const lastCheer = new Map();
let cheerCount = 0;
function cheer(user) {
  const p = picks.get(user); if (!p) return;
  fanPoint(user, p.code); p.ts = Date.now();
  if (Date.now() - (lastCheer.get(user) || 0) < 10000) return;
  lastCheer.set(user, Date.now());
  events.push({ id: ++evId, user, code: p.code, cheer: 1 }); if (events.length > 500) events.shift();
  cheerCount++; hourStat.cheers++;
}
// Stundenprotokoll (stats.csv): Nachrichten, Beitritte, Boosts, verschiedene Chatter, davon Rückkehrer aus früheren Stunden.
// Bleibt über Neustarts und Tageswechsel erhalten (Zähler im Speicher fangen sonst bei jedem Neustart neu an).
const STATS = path.join(DATA, 'stats.csv'), SEEN = path.join(DATA, 'seen.json');
let hourStat = { hour: new Date().toISOString().slice(0, 13), msgs: 0, joins: 0, cheers: 0, users: new Set() }, races0 = st.totalRaces, seen = new Set();
try { seen = new Set(JSON.parse(fs.readFileSync(SEEN, 'utf8'))); } catch {}
function flushHour() {
  const h = new Date().toISOString().slice(0, 13); if (h === hourStat.hour) return;
  const u = [...hourStat.users], back = u.filter(x => seen.has(x)).length;
  try {
    if (!fs.existsSync(STATS)) fs.writeFileSync(STATS, 'stunde_utc,nachrichten,beitritte,boosts,chatter,rueckkehrer,rennen\n');
    fs.appendFileSync(STATS, `${hourStat.hour}:00,${hourStat.msgs},${hourStat.joins},${hourStat.cheers},${u.length},${back},${st.totalRaces - races0}\n`);
    for (const x of u) seen.add(x); fs.writeFileSync(SEEN, JSON.stringify([...seen]));
  } catch (e) { console.log('stats', e.message); }
  hourStat = { hour: h, msgs: 0, joins: 0, cheers: 0, users: new Set() }; races0 = st.totalRaces;
}
setInterval(flushHour, 60000);
function onChat(user, text) {
  hourStat.msgs++; hourStat.users.add(user);
  const c = countryOf(text), prev = picks.get(user);
  if (c && (!prev || prev.code !== c)) addPick(user, c); else if (prev) cheer(user);
}
if (CHANNEL) chat.start({ channel: CHANNEL, log: m => console.log('[chat]', m), status: s => { chatStatus = { ...s, since: new Date().toISOString() }; },
  onMessage: m => { msgCount++; if (m.ts) { chatDelays.push(Date.now() - m.ts); chatDelays = chatDelays.slice(-30); } onChat(uniqueName(cleanName(m.user.replace(/^@/, '').slice(0, 20)), m.channelId), m.text); } });

// Demo-Zuschauer, solange niemand im Chat ist (DEMO=1): damit die Seitenleiste im Test nicht leer bleibt.
if (process.env.DEMO === '1') {
  const names = ['lena_k', 'mike_tx', 'joao.br', 'aziz99', 'tom_uk', 'sakura', 'pierre', 'marta_pl', 'ravi', 'kim.s'];
  setInterval(() => { if (Math.random() < 0.5) addPick(names[Math.floor(Math.random() * names.length)], COUNTRY_LIST[Math.floor(Math.random() * COUNTRY_LIST.length)][0]); }, 9000);
  setInterval(() => { const u = names[Math.floor(Math.random() * names.length)]; if (picks.has(u)) onChat(u, 'go go go'); }, 1500);
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
  return codes.map(c => ({ code: c, players: (recent.get(c) || []).slice(0, 8) }));
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
    const k = r.double ? 2 : 1;   // Chaos-Rennen zählt doppelt
    if (r.winner) { st.countryWins[r.winner] = (st.countryWins[r.winner] || 0) + k; st.hourWins[r.winner] = (st.hourWins[r.winner] || 0) + k; }
    for (const p of r.players || []) st.playerWins[p] = (st.playerWins[p] || 0) + k;
    st.races++; st.totalRaces++; save(); return send(res, 200, board());
  }
  // Highlight-Clips: Rennseite meldet Spalten-Lage und spannende Rennen (clips.js)
  if (u.pathname === '/api/clipgeom' && req.method === 'POST') { clips.setGeom(await body(req)); return send(res, 200, { ok: true }); }
  if (u.pathname === '/api/highlight' && req.method === 'POST') { clips.highlight(await body(req)); return send(res, 200, { ok: true }); }
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
      load, chat: chatStatus, chatMessages: msgCount, joins: joinCount, cheers: cheerCount, chatDelayMs: chatDelays.length ? chatDelays.slice().sort((a, b) => a - b)[chatDelays.length >> 1] : null, chatDelaysMs: chatDelays.slice(-10), board: board(), totalRaces: st.totalRaces, clips: clips.status() });
  }
  if (['snap.jpg', 'log.txt'].includes(p) || /^test\d\.mp4$/.test(p)) return file(res, path.join(DATA, p));
  if (p === 'diag') return execFile('bash', ['-c', `echo "git: ${gitHead}"; uptime; nproc; free -m | head -2; ps -eo pcpu,pmem,comm --sort=-pcpu | head -8; echo; tail -20 ${DATA}/ffmpeg.err; echo; tail -5 ${DATA}/log.txt`], { timeout: 10000 }, (e, out) => send(res, 200, out || String(e), 'text/plain; charset=utf-8'));
  if (p === 'update.txt') return file(res, path.join(DATA, 'update.log'));
  if (p === 'stats.csv') return file(res, STATS);
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
    logLine(`update ${remote}`);
    process.exit(0);
  }, 120000);
}

// update.log kann root gehören (Cron) – Schreibfehler dürfen den Server nie stoppen
function logLine(t) {
  const line = `${new Date().toISOString()} ${t}`;
  try { fs.appendFileSync(path.join(DATA, 'update.log'), line + '\n'); } catch { console.log(line); }
}

// Musik aus music.json nachladen (fehlende Stücke laden, entfernte löschen) – bei jedem Start, im Hintergrund
execFile('bash', [path.join(__dirname, 'sync-music.sh')], { timeout: 900000, env: { ...process.env, DATA_DIR: DATA } },
  (e, out, err) => logLine(`musik ${e ? 'Fehler ' + (err || e.message).slice(0, 200) : (out.trim() || 'ok')}`));
// Selbstheiler (Niklas-Ja 06.10.): YouTube schaltet eine neue Sendung manchmal nicht live, obwohl das Signal ankommt
// (06.10. 04:05–07:13 MESZ). Zeigt die Kanalseite 4 Minuten lang eindeutig keine Sendung, während run.sh sendet,
// wird das Sende-ffmpeg beendet; run.sh verbindet nach 60 s neu (frische Verbindung → YouTube startet die Sendung).
let healNone = 0, healLast = 0;
if (CHANNEL && process.env.SELF_HEAL !== '0') setInterval(async () => {
  let run = {}; try { run = JSON.parse(fs.readFileSync(path.join(DATA, 'run.json'), 'utf8')); } catch {}
  if (run.mode !== 'live' || Date.now() - Date.parse(run.block_start) < 5 * 60e3) { healNone = 0; return; }
  const state = await chat.channelLiveState(CHANNEL);
  healNone = state === 'none' && chatStatus.chat !== 'verbunden' ? healNone + 1 : 0;   // Chat an einer laufenden Sendung → alles gut
  if (healNone >= 4 && Date.now() - healLast > 15 * 60e3) {
    healNone = 0; healLast = Date.now();
    logLine('selbstheiler: seit 4 Min. keine Sendung auf dem Kanal, Verbindung zu YouTube wird neu aufgebaut');
    execFile('pkill', ['-TERM', '-f', 'a.rtmp.youtube.com/live2'], () => {});
  }
}, 60e3);
const NAMES = Object.fromEntries(COUNTRY_LIST.map(c => [c[0], c[1]]));
clips.init({ data: DATA, log: logLine, state: () => { rollDay(); const [l] = Object.entries(st.countryWins).sort((a, b) => b[1] - a[1]);
  return { videoId: chatStatus.videoId, leader: l ? { code: l[0], flag: flagOf(l[0]), name: NAMES[l[0]] || l[0] } : null }; } });
console.log('server läuft', { CHANNEL, DATA });
module.exports = { countryOf };
