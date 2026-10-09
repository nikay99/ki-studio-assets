// Liest den öffentlichen Live-Chat eines YouTube-Kanals (Web-Endpunkt wie im Chat-Popout, kein API-Schlüssel, keine Quota).
// start({channel, onMessage, log}) – channel = "@handle" oder "UC…"-Kanal-ID.
// Fallback mit offizieller API: YT_API_KEY gesetzt → liveChatMessages.list (5 Einheiten/Abruf, daher nur alle 45 s).
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
if (process.env.HTTPS_PROXY) { try { const u = require('undici'); u.setGlobalDispatcher(new u.EnvHttpProxyAgent()); } catch {} }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const hdr = { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+1; SOCS=CAI' };

async function hasChat(videoId) {
  const html = await (await fetch(`https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`, { headers: hdr })).text();
  return /"continuation":"/.test(html);
}

// Sendungs-ID aus der Datei des Wächters (VIDEO_ID_FILE), sonst null
function fileVideoId() {
  if (!process.env.VIDEO_ID_FILE) return null;
  try { const f = require('fs').readFileSync(process.env.VIDEO_ID_FILE, 'utf8').trim(); return /^[\w-]{11}$/.test(f) ? f : null; } catch { return null; }
}

async function findLiveVideo(channel) {
  if (process.env.VIDEO_ID) return process.env.VIDEO_ID;
  // Zwei Streams auf einem Kanal (09.10.): /live zeigt nur einen davon. Der Wächter schreibt die aktuelle Sendungs-ID in eine Datei;
  // mit VIDEO_ID_ONLY=1 wird nie auf /live ausgewichen (sonst liest das Wortraten womöglich den Chat vom Kugelrennen).
  if (process.env.VIDEO_ID_FILE) {
    try { const f = require('fs').readFileSync(process.env.VIDEO_ID_FILE, 'utf8').trim(); if (/^[\w-]{11}$/.test(f) && await hasChat(f)) return f; } catch {}
    if (process.env.VIDEO_ID_ONLY === '1') return null;
  }
  // Erst die Kanalseite (öffentliche Sendung, auch nach dem automatischen Neustart mit neuer ID),
  // dann video_id.txt – aber nur, wenn diese Sendung gerade wirklich live ist (nicht gelistete Sendungen fehlen unter /live).
  const v = await liveOnChannel(channel).catch(() => null);
  if (v) return v;
  try {
    const f = require('fs').readFileSync(__dirname + '/video_id.txt', 'utf8').trim();
    if (/^[\w-]{11}$/.test(f)) {
      const html = await (await fetch(`https://www.youtube.com/watch?v=${f}`, { headers: hdr })).text();
      if (/"isLiveNow":true/.test(html)) return f;
    }
  } catch {}
  return null;
}

// Für den Selbstheiler: 'none' nur, wenn die Kanalseite eindeutig keine Sendung zeigt (canonical = Kanal, nicht watch?v=).
// Login-/Bot-Seiten und Fehler → 'unknown' (dann wird nie eingegriffen).
async function channelLiveState(channel) {
  try {
    const base = channel.startsWith('UC') ? `https://www.youtube.com/channel/${channel}` : `https://www.youtube.com/${channel}`;
    const r = await fetch(base + '/live', { headers: hdr }); if (!r.ok) return 'unknown';
    const html = await r.text(), c = html.match(/<link rel="canonical" href="([^"]+)"/);
    if (!c) return 'unknown';
    if (c[1].includes('/watch?v=')) return 'live';
    return /youtube\.com\/(channel\/UC|@)/.test(c[1]) && !/"isLive":true|"style":"LIVE"/.test(html) ? 'none' : 'unknown';
  } catch { return 'unknown'; }
}

async function liveOnChannel(channel) {
  const base = channel.startsWith('UC') ? `https://www.youtube.com/channel/${channel}` : `https://www.youtube.com/${channel}`;
  const html = await (await fetch(base + '/live', { headers: hdr })).text();
  const m = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  if (m) return /"isLiveNow":true|"isLive":true/.test(html) ? m[1] : null;
  // Rechenzentrums-IPs bekommen oft eine Login-Seite ohne canonical: Kandidaten der Seite durchprobieren.
  if (!/"isLive":true|"style":"LIVE"/.test(html)) return null;
  const cnt = {};
  for (const x of html.matchAll(/"videoId":"([\w-]{11})"/g)) cnt[x[1]] = (cnt[x[1]] || 0) + 1;
  const cands = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 4);
  for (const v of cands) if (await hasChat(v)) return v;
  return null;
}

function textOf(runs) {
  return (runs || []).map(r => r.text ?? (r.emoji ? (r.emoji.emojiId?.length <= 8 ? r.emoji.emojiId : (r.emoji.shortcuts || [''])[0]) : '')).join('');
}

async function chatSession(videoId, onMessage, log, stop) {
  const html = await (await fetch(`https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`, { headers: hdr })).text();
  const key = (html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1];
  const ver = (html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1] || '2.20241001.00.00';
  let cont = (html.match(/"continuation":"([^"]+)"/) || [])[1];
  if (!cont) throw new Error('keine Chat-Continuation (Chat aus?)');
  log(`Chat verbunden: ${videoId}`);
  let first = true, errors = 0, lastSwitchCheck = 0;
  while (!stop()) {
    try {
      const url = 'https://www.youtube.com/youtubei/v1/live_chat/get_live_chat' + (key ? `?key=${key}&prettyPrint=false` : '?prettyPrint=false');
      const r = await fetch(url, { method: 'POST', headers: { ...hdr, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: ver, hl: 'en' } }, continuation: cont }) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const lcc = j.continuationContents?.liveChatContinuation;
      if (!lcc) { log('Chat beendet'); return; }
      if (process.env.CHAT_DEBUG) log(`poll: ${(lcc.actions || []).length} Aktionen`);
      for (const a of lcc.actions || []) {
        const it = a.addChatItemAction?.item;
        const m = it?.liveChatTextMessageRenderer || it?.liveChatPaidMessageRenderer;
        if (!m || first) continue;          // alte Nachrichten beim Verbinden ignorieren
        onMessage({ id: m.id, user: m.authorName?.simpleText || 'viewer', channelId: m.authorExternalChannelId, text: textOf(m.message?.runs), ts: +m.timestampUsec / 1000 || 0 });
      }
      first = false; errors = 0;
      const c = lcc.continuations?.[0] || {};
      const cd = c.invalidationContinuationData || c.timedContinuationData || c.reloadContinuationData || {};
      if (cd.continuation) cont = cd.continuation;
      // Sendungswechsel (09.10.): Der Wächter schreibt die neue ID sofort in die Datei. Statt ~5 Min. zu warten, bis YouTube
      // den alten Chat schließt, sofort umschalten, sobald die neue Sendung einen Chat hat.
      const fid = fileVideoId();
      if (fid && fid !== videoId && Date.now() - (lastSwitchCheck || 0) > 5000) { lastSwitchCheck = Date.now(); if (await hasChat(fid).catch(() => false)) { log(`Sendung gewechselt: ${videoId} → ${fid}`); return; } }
      await sleep(1500);   // fest 1,5 s statt YouTubes Vorschlag (3–8 s): Beitritte erscheinen schneller im Bild
    } catch (e) {
      if (++errors > 5) throw e;
      await sleep(5000 * errors);
    }
  }
}

async function apiSession(videoId, apiKey, onMessage, log, stop) {
  const v = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`)).json();
  const chatId = v.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
  if (!chatId) throw new Error('kein activeLiveChatId');
  log(`Chat (API) verbunden: ${videoId}`);
  let page = '', first = true;
  while (!stop()) {
    const j = await (await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatId}&part=snippet,authorDetails&maxResults=200&key=${apiKey}${page ? '&pageToken=' + page : ''}`)).json();
    if (j.error) throw new Error(j.error.message);
    if (!first) for (const m of j.items || []) onMessage({ id: m.id, user: m.authorDetails.displayName, channelId: m.authorDetails.channelId, text: m.snippet.displayMessage || '' });
    first = false; page = j.nextPageToken;
    await sleep(45000);
  }
}

function start({ channel, onMessage, log = console.log, status = () => {} }) {
  let stopped = false, lastVid = null;
  (async () => {
    while (!stopped) {
      try {
        const vid = await findLiveVideo(channel); lastVid = vid;
        if (!vid) { status({ chat: 'kein Live-Video gefunden' }); await sleep(30000); continue; }
        status({ chat: 'verbunden', videoId: vid });
        try { await chatSession(vid, onMessage, log, () => stopped); }
        catch (e) {
          log('Web-Chat Fehler: ' + e.message);
          if (process.env.YT_API_KEY) await apiSession(vid, process.env.YT_API_KEY, onMessage, log, () => stopped);
        }
      } catch (e) { log('Chat Fehler: ' + e.message); status({ chat: 'Fehler: ' + e.message }); }
      const fid = fileVideoId();
      await sleep(fid && fid !== lastVid ? 500 : 15000);   // neue ID in der Datei → gleich neu verbinden
    }
  })();
  return () => { stopped = true; };
}

module.exports = { start, findLiveVideo, channelLiveState };

if (require.main === module) {   // Test: node chat.js @LofiGirl
  start({ channel: process.argv[2] || '@LofiGirl', onMessage: m => console.log(m.user, '>', m.text) });
}
