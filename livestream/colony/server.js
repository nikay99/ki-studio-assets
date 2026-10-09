// Chat Colony (dritter Livestream, Test ab 09.10., Niklas „wir probieren es auf dem N95“): eigener Server auf 127.0.0.1:8091.
// Die Spiel-Logik läuft in der Seite (public/index.html). Der Server liest den YouTube-Chat (../chat.js), reicht die
// Nachrichten an die Seite weiter (/api/chat) und speichert den Dorf-Zustand (/api/save, /api/load → DATA_DIR/state.json).
const http = require('http'), fs = require('fs'), path = require('path');
const chat = require('../chat.js');

const DATA = process.env.DATA_DIR || '/var/lib/marble-colony';
const CHANNEL = process.env.CHANNEL || '';
const PORT = +process.env.PORT || 8091;
const PUB = path.join(__dirname, 'public');
const VERSION = String(Date.now());
fs.mkdirSync(DATA, { recursive: true });
const STATE_FILE = path.join(DATA, 'state.json');

const BAD = /fuck|shit|cunt|nigg|fag|retard|whore|slut|bitch|pussy|dick|porn|hitler|nazi|kkk|rape|wichs|fotze|hure|schlampe|hurensohn|nutte/i;
const cleanName = u => BAD.test(u.replace(/[^a-z]/gi, '')) ? 'viewer' : u;
const CHAT_BOTS = /^(nightbot|streamelements|moobot|fossabot)$/i;
// Chat-Hinweise des Wächters kommen vom eigenen Kanal: lange Nachrichten von dort zählen nicht als Spieler
const OWN_CHANNEL = 'UCG6xEYtopZcK66gz_biiIIA';

let msgs = [], lastId = 0, msgCount = 0, chatStatus = { chat: CHANNEL ? 'startet' : 'kein Kanal' }, lastPage = 0;
function onChat(user, text) {
  msgCount++;
  text = String(text || '').trim().slice(0, 60);
  if (!text) return;
  msgs.push({ id: ++lastId, user, text });
  if (msgs.length > 300) msgs = msgs.slice(-150);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain', '.json': 'application/json' };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/chat') {
    lastPage = Date.now();
    const since = +u.searchParams.get('since');
    return send(res, 200, { v: VERSION, last: lastId, msgs: since >= 0 ? msgs.filter(m => m.id > since) : [] });
  }
  if (u.pathname === '/api/alive') { lastPage = Date.now(); return send(res, 200, { ok: 1 }); }
  if (u.pathname === '/api/load') return fs.readFile(STATE_FILE, 'utf8', (e, b) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(e ? '{}' : b); });
  if (u.pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', () => {
      try { const o = JSON.parse(body); if (!o || !Array.isArray(o.people)) throw 0;
        // erst in eine Hilfsdatei, dann umbenennen: ein Absturz mitten im Schreiben zerstört das Dorf nicht
        fs.writeFile(STATE_FILE + '.tmp', body, e => { if (!e) fs.rename(STATE_FILE + '.tmp', STATE_FILE, () => {}); });
        send(res, 200, { ok: 1 });
      } catch { send(res, 400, { ok: 0 }); }
    });
    return;
  }
  // run-colony.sh (Kugelrennen-Thread) wartet auf /api/state, bevor Chrome startet
  if (u.pathname === '/api/state' || u.pathname === '/api/status') return send(res, 200, { chatStatus, msgCount, lastPage, version: VERSION });
  if (u.pathname === '/api/say' && process.env.DEMO === '1') { onChat(u.searchParams.get('u') || 'tester', u.searchParams.get('t') || ''); return send(res, 200, { ok: 1 }); }
  const file = path.join(PUB, path.normalize(u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(b); });
}).listen(PORT, '127.0.0.1');

if (CHANNEL) chat.start({ channel: CHANNEL, log: m => console.log('[chat]', m), status: s => { chatStatus = s; },
  onMessage: m => {
    const name = String(m.user).replace(/^@/, '');
    if (CHAT_BOTS.test(name)) return;
    if (m.channelId === OWN_CHANNEL && String(m.text || '').length > 40) return;
    onChat(cleanName(name.replace(/\s+/g, '_').slice(0, 20)), m.text);
  } });

// Selbst-Update wie beim Wortraten: ändert sich eine Datei, beendet sich der Server, systemd startet ihn neu,
// und die Seite lädt die neue Version zwischen zwei Runden.
const WATCH = ['server.js', 'public/index.html', '../chat.js'].map(f => path.join(__dirname, f));
const mtimes = () => WATCH.map(f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }).join();
const M0 = mtimes(); setInterval(() => { if (mtimes() !== M0) { console.log('Dateien geändert, Neustart'); setTimeout(() => process.exit(0), 2000); } }, 60000);
console.log('Chat Colony auf http://127.0.0.1:' + PORT);
