// Highlight-Clips + Live-Titel.
// Mitschnitt: zweites ffmpeg greift nur die 9:16-Mittelspalte vom Bildschirm :99 ab (Quick Sync, 2-s-Stücke im Ring, ~80 s).
// Die Rennseite meldet nach jedem Rennen, wie spannend es war (POST /api/highlight); gute Rennen werden ohne
// Neukodieren aus dem Ring kopiert und als Kandidaten für Shorts behalten (beste 6 pro Tag).
// Mit FAL_KEY + MAKE_HOOK aus /etc/marble/clips.env (trägt Niklas selbst ein: sudo marble-clipkey) werden einmal pro Tag
// die besten Clips zu fal hochgeladen und an Make gemeldet, und der Live-Titel folgt der führenden Nation des Tages.
const fs = require('fs'), path = require('path'), { spawn, execFile } = require('child_process');

const SEG_S = 2, RING = 40, KEEP = 6, SECRETS = '/etc/marble/clips.env';
let DATA, CLIPS, BUF, rec = null, geom = null, log = console.log, recState = 'aus';

function secrets() {
  const o = {};
  try { for (const l of fs.readFileSync(SECRETS, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim(); } } catch {}
  return o;
}

// ---------- Mitschnitt ----------
function startRecorder() {
  if (rec || !geom || process.env.CLIPS === '0' || fs.existsSync(path.join(__dirname, 'NOCLIPS'))) return;   // Notaus: Datei livestream/NOCLIPS ins Repo
  if (!fs.existsSync('/tmp/.X11-unix/X99')) { recState = 'kein Bildschirm :99'; return setTimeout(startRecorder, 60000); }
  // ein Mitschnitt von einem abgestürzten Server darf nicht weiter in denselben Ring schreiben
  const pidFile = path.join(DATA, 'clipbuf.pid');
  try { const old = +fs.readFileSync(pidFile, 'utf8'); if (old && fs.readFileSync(`/proc/${old}/cmdline`, 'utf8').includes('clipbuf')) process.kill(old, 'SIGKILL'); } catch {}
  for (const f of fs.readdirSync(BUF)) fs.rmSync(path.join(BUF, f), { force: true });
  const hw = fs.existsSync('/dev/dri/renderD128');
  const args = ['-nostdin', '-hide_banner', '-loglevel', 'error',
    ...(hw ? ['-vaapi_device', '/dev/dri/renderD128'] : []),
    '-thread_queue_size', '1024', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', '30',
    '-video_size', `${geom.w}x${geom.h}`, '-grab_x', String(geom.x), '-grab_y', '0', '-i', ':99.0',
    '-thread_queue_size', '1024', '-f', 'pulse', '-i', 'race.monitor',
    ...(hw ? ['-vf', 'format=nv12,hwupload', '-c:v', 'h264_vaapi', '-qp', '18']
           : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p']),
    '-g', String(30 * SEG_S), '-keyint_min', String(30 * SEG_S), '-force_key_frames', `expr:gte(t,n_forced*${SEG_S})`,
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2',
    '-f', 'segment', '-segment_time', String(SEG_S), '-segment_wrap', String(RING), '-reset_timestamps', '1',
    '-segment_list', path.join(BUF, 'list.csv'), '-segment_list_type', 'csv', '-segment_list_size', String(RING),
    path.join(BUF, 'seg%02d.ts')];
  const env = { ...process.env, DISPLAY: ':99', XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || path.join(DATA, 'xdg') };
  let err = '';
  rec = spawn('ffmpeg', args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
  try { fs.writeFileSync(pidFile, String(rec.pid)); } catch {}
  recState = 'läuft'; log(`clips: Mitschnitt ${geom.w}x${geom.h}+${geom.x} ${hw ? 'vaapi' : 'x264'}`);
  rec.stderr.on('data', d => { err = (err + d).slice(-400); });
  rec.on('exit', code => { rec = null; recState = `beendet (${code}) ${err.trim().slice(-160)}`; log('clips: ' + recState); setTimeout(startRecorder, 30000); });
}
process.on('exit', () => { try { rec && rec.kill('SIGKILL'); } catch {} });

// Seite meldet, wo die Mittelspalte auf dem Bildschirm liegt (gerade Zahlen für h264)
function setGeom(g) {
  const even = n => Math.max(2, Math.round(n / 2) * 2);
  const ng = { x: even(g.x), w: even(g.w), h: even(g.h) };
  if (!(ng.w > 100 && ng.h > 100)) return;
  if (geom && geom.x === ng.x && geom.w === ng.w && geom.h === ng.h) return;
  geom = ng; if (rec) rec.kill(); else startRecorder();   // exit-Handler startet mit neuer Geometrie neu
}

// ---------- Clip ausschneiden ----------
// Die Stücke aus der Segmentliste: [{file, s, e}] mit Zeiten relativ zum Mitschnittbeginn.
function segments() {
  try {
    return fs.readFileSync(path.join(BUF, 'list.csv'), 'utf8').trim().split('\n').map(l => { const [f, s, e] = l.split(','); return { file: f, s: +s, e: +e }; })
      .filter(x => fs.existsSync(path.join(BUF, x.file)));
  } catch { return []; }
}
// h = {score, kind, title, goAgoMs, endAgoMs} – Zeiten relativ zum Meldezeitpunkt (echte Zeit, Zeitlupe eingerechnet)
function highlight(h) {
  if (!rec || !(h.score > 0)) return;
  const now = Date.now(), from = now - (h.goAgoMs || 30000) - 1500, to = now + 6000;   // Start bis Sieger-Ansage + Jubel
  setTimeout(() => cut(h, from, to).catch(e => log('clips: Schnitt ' + e.message)), to - now + 2 * SEG_S * 1000 + 1000);
}
async function cut(h, from, to) {
  // Wanduhr ↔ Segmentzeit: das neueste fertige Stück endet ungefähr jetzt
  const segs = segments(); if (!segs.length) return;
  const last = segs[segs.length - 1], st = fs.statSync(path.join(BUF, last.file));
  const offs = st.mtimeMs - last.e * 1000;          // Wanduhr bei Mitschnitt-Zeit 0
  const pick = segs.filter(x => offs + x.e * 1000 > from && offs + x.s * 1000 < to);
  if (pick.length < 5) return log(`clips: zu wenig Material (${pick.length} Stücke)`);
  const day = new Date().toISOString().slice(0, 10), id = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}_${h.kind}_${h.score}`;
  const dir = path.join(CLIPS, day); fs.mkdirSync(dir, { recursive: true });
  const listFile = path.join(dir, id + '.txt');
  fs.writeFileSync(listFile, pick.map(x => `file '${path.join(BUF, x.file)}'`).join('\n'));
  await new Promise((ok, bad) => execFile('ffmpeg', ['-nostdin', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', '-y', path.join(dir, id + '.mp4')],
    { timeout: 60000 }, e => e ? bad(e) : ok()));
  fs.rmSync(listFile, { force: true });
  const clipStart = offs + pick[0].s * 1000;
  fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify({ ...h, id, day, goAt: (from + 1500 - clipStart) / 1000, len: (offs + pick[pick.length - 1].e * 1000 - clipStart) / 1000, geom }, null, 1));
  // nur die besten KEEP pro Tag behalten
  const all = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).sort((a, b) => b.score - a.score);
  for (const c of all.slice(KEEP)) for (const ext of ['.mp4', '.json']) fs.rmSync(path.join(dir, c.id + ext), { force: true });
  log(`clips: ${id} gespeichert (${pick.length} Stücke)`);
  // alte Tage nach 3 Tagen löschen
  for (const d of fs.readdirSync(CLIPS)) if (d < new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)) fs.rmSync(path.join(CLIPS, d), { recursive: true, force: true });
}

// ---------- Täglich: beste Clips von gestern zu fal + an Make melden ----------
async function falUpload(file, key) {
  const name = path.basename(file);
  const init = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3', {
    method: 'POST', headers: { Authorization: 'Key ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ content_type: 'video/mp4', file_name: name }) });
  if (!init.ok) throw new Error('fal initiate ' + init.status);
  const { upload_url, file_url } = await init.json();
  const put = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: fs.readFileSync(file) });
  if (!put.ok) throw new Error('fal put ' + put.status);
  return file_url;
}
async function hook(payload) {
  const { MAKE_HOOK } = secrets(); if (!MAKE_HOOK) return false;
  const r = await fetch(MAKE_HOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error('make ' + r.status); return true;
}
let sentDay = '';
async function dailySend() {
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (sentDay === y || new Date().getUTCHours() < 2) return;
  const { FAL_KEY, MAKE_HOOK } = secrets(); if (!FAL_KEY || !MAKE_HOOK) return;
  const dir = path.join(CLIPS, y), mark = path.join(dir, 'sent.txt');
  if (!fs.existsSync(dir) || fs.existsSync(mark)) { sentDay = y; return; }
  const list = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).sort((a, b) => b.score - a.score).slice(0, 3);
  const out = [];
  for (const c of list) out.push({ ...c, url: await falUpload(path.join(dir, c.id + '.mp4'), FAL_KEY) });
  await hook({ action: 'clips', day: y, clips: JSON.stringify(out) });
  fs.writeFileSync(mark, new Date().toISOString()); sentDay = y; log(`clips: ${out.length} Clips von ${y} gemeldet`);
}

// ---------- Live-Titel ----------
// Höchstens stündlich, und nur wenn sich die führende Nation des Tages oder die Sendung geändert hat.
let lastTitle = { key: '', at: 0 };
async function titleTick(videoId, leader) {
  if (!videoId || !secrets().MAKE_HOOK) return;
  const key = videoId + '|' + (leader ? leader.code : '');
  const fresh = !lastTitle.key.startsWith(videoId + '|');      // neue Sendung → sofort
  if (key === lastTitle.key || (!fresh && Date.now() - lastTitle.at < 3600e3)) return;
  const title = leader ? `🔴 Country Marble Race LIVE – ${leader.flag} ${leader.name} leads today! Type your country`
                       : '🔴 Country Marble Race LIVE – Type your country & get your own ball!';
  await hook({ action: 'title', video_id: videoId, title: title.slice(0, 100) });
  lastTitle = { key, at: Date.now() }; log(`clips: Titel → ${title}`);
}

function init(opts) {
  DATA = opts.data; log = opts.log || log;
  CLIPS = path.join(DATA, 'clips'); BUF = path.join(DATA, 'clipbuf');
  fs.mkdirSync(CLIPS, { recursive: true }); fs.mkdirSync(BUF, { recursive: true });
  setInterval(() => dailySend().catch(e => log('clips: täglich ' + e.message)), 10 * 60e3);
  setInterval(() => { const s = opts.state(); titleTick(s.videoId, s.leader).catch(e => log('clips: Titel ' + e.message)); }, 5 * 60e3);
}
const status = () => ({ recorder: recState, geom, keys: Object.keys(secrets()).filter(k => /^(FAL_KEY|MAKE_HOOK)$/.test(k)), title: lastTitle.key ? lastTitle : null });

module.exports = { init, setGeom, highlight, status };
