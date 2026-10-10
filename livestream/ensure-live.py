#!/usr/bin/env python3
"""Verwaltet die YouTube-Sendung allein: sorgt dafuer, dass immer eine oeffentliche Sendung laeuft, solange
die VM sendet, und wechselt zu festen Uhrzeiten auf eine neue (YouTube speichert nur Sendungen bis 12 h).
Laeuft jede Minute per cron (je Stream eigener Benutzer). Die Kanalseite wird kostenlos geprueft; die YouTube-API
(ueber den Webhook aus /etc/marble/broadcast*.env) nur, wenn keine Sendung laeuft oder ein Wechsel ansteht.
Aus: Datei NOBROADCAST im Datenordner des Streams anlegen.
Seit 10.10. im Repo (livestream/ensure-live.py, Stream-Technik-Thread); vorher nur auf der VM unter /opt/marble-local.
Keine Schluessel, Tokens oder Stream-IDs in diese Datei schreiben (Repo ist oeffentlich)."""
import hashlib, calendar, fcntl, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

# Mehrere Streams auf einem Kanal (09.10.): jeder Waechter fasst nur Sendungen an, die an SEINEN Stream-Eingang gebunden sind,
# und prueft "live?" an der eigenen Sendung (watch-Seite) statt an der Kanalseite /live, die nur eine zeigt.
# Aufruf: ensure-live.py [marble|words|colony|country|capital]
# slot = Minuten-Versatz zu den festen Wechselzeiten (ROT_TIMES), damit nie zwei Streams gleichzeitig wechseln.
PROFILES = {
    'marble': dict(D='/var/lib/marble', env='/etc/marble/broadcast.env', user='marble', stream=('digitalocean-streaming',),
                   prefix='Country Marble Race', title='Country Marble Race 🔴 LIVE – type your country!', meta=None,
                   thumb='/opt/marble-local/thumbnail.jpg', runjson=True, latency='low', slot=0,   # ultraLow am 10.10. 06:17-06:40 UTC getestet, Niklas: wieder niedrig
                   remind=['🎯 Type your COUNTRY in the chat to get your own ball in the race!',
                           '⚡ Every chat message charges your ball – up to 3 boosts per race!',
                           '🏆 Points add up all day – your name runs in the TOP bar on screen.']),
    'words': dict(D='/var/lib/marble-words', env='/etc/marble/broadcast-words.env', user='words', stream=('words', 'words-game'),
                  prefix='Guess the Word', title='Guess the Word 🔴 LIVE – type your answer in chat!', meta='/opt/marble/words/broadcast.json',
                  thumb='/opt/marble/words/thumbnail.jpg', runjson=False, slot=10,
                  latency='ultraLow',   # Niklas 09.10.: beim Raten zaehlt jede Sekunde Bildverzoegerung
                  remind=['✍️ Know the word? Type it in the chat – everyone who is right scores!',
                          '🚩 Type your country once to get your flag next to your name.',
                          '🏆 The fastest answer gets the most points – check TOP PLAYERS today.']),
    # dritter Stream (Test, Niklas 09.10.), seit 10.10. 09:30Z auf Eis (PAUSE, NOBROADCAST, NOCHATBOT)
    'colony': dict(D='/var/lib/marble-colony', env='/etc/marble/broadcast-colony.env', user='colony', stream=('colony', 'colony-key'),
                   prefix='Chat Colony', title='Chat Colony 🔴 LIVE – chat decides: can our village survive?', meta='/opt/marble/colony/broadcast.json',
                   thumb='/opt/marble/colony/thumbnail.jpg', runjson=False, latency='low', slot=30,   # ultraLow am 10.10. 06:17-06:40 UTC getestet, Niklas: wieder niedrig
                   remind=['🏡 Type anything to move into the village · vote with 1, 2 or 3 · !house shows your home']),
    # vierter Stream (Niklas 10.10.), Text des Chat-Hinweises aus broadcast.json (chatHint)
    'country': dict(D='/var/lib/marble-country', env='/etc/marble/broadcast-country.env', user='country', stream=('country', 'country-key'),
                    prefix='Guess the Country', title='Guess the Country 🔴 LIVE – type the country in chat!', meta='/opt/marble/country/broadcast.json',
                    thumb='/opt/marble/country/thumbnail.jpg', runjson=False, slot=20,
                    latency='ultraLow',   # Niklas 10.10. 09:35Z: "sehr niedrig" (beim Raten zaehlt die Bildverzoegerung)
                    remind=['🗺️ Know the country? Type its name in the chat – everyone who is right scores!']),
    # Guess the Capital (Niklas 10.10. 11:22Z "geh live"); sendet ueber den Colony-Eingang (Niklas 11:28Z "nimm einfach den key von dem chat colony spiel")
    'capital': dict(D='/var/lib/marble-capital', env='/etc/marble/broadcast-capital.env', user='capital', stream=('capital', 'capital-key', 'colony', 'colony-key'),
                    prefix='Guess the Capital', title='Guess the Capital of the Country 🔴 LIVE – type it in chat!', meta='/opt/marble/capital/broadcast.json',
                    thumb='/opt/marble/capital/thumbnail.jpg', runjson=False, slot=40, latency='ultraLow',
                    remind=['🏛️ Know the capital? Type it in the chat – everyone who is right scores!']),
}
GAME = sys.argv[1] if len(sys.argv) > 1 else 'marble'
P = PROFILES[GAME]
D = P['D']
STATE, LOG = D + '/broadcast.state', D + '/broadcast.log'
P_B, P_S = 'Broadcasts', 'Streams'   # Pfadnamen des Webhooks fuer liveBroadcasts / liveStreams
PART = 'id,snippet,status,contentDetails'
MISS_BEFORE_API = 2      # so viele Minuten ohne Sendung, bevor die API gefragt wird
CREATE_GAP_S = 600       # fruehestens alle 10 min eine neue Sendung (gilt nicht fuer den geplanten Wechsel)
MAX_CREATES_DAY = 12
# Feste Wechselzeiten (UTC, Niklas 10.10. 11:16Z "vorschlag mit 3x neustart ist gut ja"): 05:30, 13:30, 22:30 UTC
# = 07:30, 15:30, 00:30 Wien (Sommerzeit). Abend Europa (16-21 UTC) und Abend USA (23-04 UTC) laufen ohne Wechsel durch,
# alle Bloecke unter 12 h (8 h, 9 h, 7 h). Jeder Stream wechselt um seinen slot (Minuten) versetzt.
ROT_TIMES = ((5, 30), (13, 30), (22, 30))
ROT_MIN_AGE_S = 7200     # eine Sendung, die erst <2 h vor dem Termin begann, laeuft bis zum naechsten durch (max. ~11 h)
ROTATE_S = 41400         # Notbremse: spaetestens nach 11,5 h wechseln, falls ein Termin verpasst wurde
KICK_GAP_S = 300         # Encoder hoechstens alle 5 min neu verbinden
MAX_KICKS = 3            # je vorbereiteter Sendung
REMIND_S = 3600          # Chat-Erinnerung je Stream (Niklas 09.10.): eine Nachricht kostet 50 API-Einheiten -> 24/Tag = 1200 je Stream
THUMB_FAST = 15          # so viele Thumbnail-Versuche im Minutentakt, danach alle 30 min
CATEGORY = '24'          # Unterhaltung (fuer videos.update mit Tags noetig)
RTMP = 'a.rtmp.youtube.com/live2'
# EIN Stream rotierend (Niklas 10.10. 15:56Z Karte „1 Stream rotierend“, 16:03Z „rotation umbauen“): ab ROT_FROM sendet nur noch
# eines der Quiz-Spiele; an jedem festen Termin (ROT_TIMES, ohne Versatz) wechselt das Spiel. Niklas 16:04Z „gleich zwei offline“:
# Word sofort allein (Block 10.10. 13:30 UTC), danach jeden Tag alle drei, jedes Spiel in 3 Tagen zu jeder Uhrzeit.
# Nicht dran: Sendung beenden (bleibt oeffentlich als Archiv), Dateien PAUSE + PAUSE.rot, ffmpeg aus. Dran: PAUSE weg, neue Sendung.
# Niklas 16:09Z: jeder Wiener Tag soll alle drei Spiele haben -> „Tag“ beginnt 22:30 UTC (00:30 Wien), Reihenfolge je Tag um eins
# verschoben: So 11.10. Country 00:30, Capital 07:30, Word 15:30; Mo Capital, Word, Country; Di Word, Country, Capital; ...
# Vor ROT_ANCHOR (Sa 10.10. ab 13:30 UTC) laeuft nur Word.
ROTATION = ('country', 'capital', 'words')
ROT_FROM = calendar.timegm((2026, 10, 10, 13, 30, 0))
ROT_ANCHOR = calendar.timegm((2026, 10, 10, 22, 30, 0))   # Tag 0, erster Block = ROTATION[0]

def log(msg):
    with open(LOG, 'a') as f:
        f.write(time.strftime('%Y-%m-%dT%H:%M:%SZ ', time.gmtime()) + msg + '\n')

def env():
    e = {}
    for line in open(P['env']):
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1); e[k] = v
    return e

# User-Agent: Cloudflare vor n8n lehnt Pythons Standard-Kennung ab (Fehler 1010)
def api(method, path, qs, body=None):
    if 'cdn' in qs.get('part', ''): raise ValueError('part=cdn ist verboten (Stream-Schluessel)')
    e = env()
    d = dict(token=e['BROADCAST_TOKEN'], method=method,
             path=path + '?' + urllib.parse.urlencode(qs, safe=','), body=json.dumps(body) if body else '')
    r = urllib.request.Request(e['BROADCAST_HOOK'], json.dumps(d).encode(), {'Content-Type': 'application/json', 'User-Agent': 'marble-watchdog/1.0'})
    try:
        raw = urllib.request.urlopen(r, timeout=60).read().decode()
    except urllib.error.HTTPError as ex:
        raw = ex.read().decode()
    try:
        j = json.loads(raw)
    except ValueError:
        raise RuntimeError('API-Antwort unlesbar: ' + raw[:200])
    b = j.get('body') or {}
    if j.get('status') != 200 or (isinstance(b, dict) and 'error' in b):
        raise RuntimeError('API %s %s: %s' % (method, path, json.dumps(j)[:400]))
    return b

def watch_live(v):
    """Laeuft die Sendung v gerade? True/False laut ihrer watch-Seite, None wenn unklar."""
    try:
        r = urllib.request.Request('https://www.youtube.com/watch?v=' + v,
                                   headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
                                            'Accept-Language': 'en', 'Cookie': 'CONSENT=YES+1; SOCS=CAI'})
        html = urllib.request.urlopen(r, timeout=20).read().decode('utf-8', 'replace')
    except Exception:
        return None
    if '"isLiveNow":true' in html: return True
    if '"isLiveNow":false' in html or '"isUpcoming":true' in html: return False
    return None

def sending():
    """Sendet ffmpeg seit mindestens 60 s an YouTube?"""
    try:
        if P['runjson'] and json.load(open(D + '/run.json')).get('mode') != 'live': return False
        out = subprocess.run(['pgrep', '-u', P['user'], '-f', '-o', RTMP], capture_output=True, text=True).stdout.split()
        if not out: return False
        age = int(subprocess.run(['ps', '-o', 'etimes=', '-p', out[0]], capture_output=True, text=True).stdout.strip() or 0)
        return age >= 60 and time.time() - os.path.getmtime(D + '/progress.txt') < 20
    except Exception:
        return False

def scrub():
    """ffmpeg schreibt bei Fehlern die Sende-Adresse samt Stream-Schluessel in ffmpeg.err -> Schluessel unkenntlich machen."""
    p = D + '/ffmpeg.err'
    try:
        if os.stat(p).st_mode & 0o077: os.chmod(p, 0o600)
        with open(p, 'r+') as f:
            s = f.read(); t = re.sub(r'(live2/)[\w-]{8,}', r'\1***', s)
            if t != s: f.seek(0); f.write(t); f.truncate()
    except Exception:
        pass

def epoch(iso):
    return calendar.timegm(time.strptime(iso[:19], '%Y-%m-%dT%H:%M:%S'))

def last_slot(now, slot=None):
    """Letzter fester Wechseltermin (Epoch, UTC) dieses Streams bis einschliesslich now."""
    slot = P['slot'] if slot is None else slot
    day = int(now // 86400) * 86400
    best = None
    for back in (0, 1):
        for h, m in ROT_TIMES:
            t = day - back * 86400 + h * 3600 + (m + slot) * 60
            if t <= now and (best is None or t > best): best = t
    return best

def next_slot(now, slot=None):
    slot = P['slot'] if slot is None else slot
    day = int(now // 86400) * 86400
    return min(day + b * 86400 + h * 3600 + (m + slot) * 60 for b in (0, 1) for h, m in ROT_TIMES
               if day + b * 86400 + h * 3600 + (m + slot) * 60 > now)

def rotation_game(now):
    """Welches Quiz-Spiel ist im rotierenden Betrieb gerade dran? None vor ROT_FROM."""
    if now < ROT_FROM: return None
    if now < ROT_ANCHOR: return 'words'
    s = last_slot(now, 0)
    d = (s - ROT_ANCHOR) // 86400                      # Tag (beginnt zur Uhrzeit von ROT_ANCHOR)
    off = (s - ROT_ANCHOR) - d * 86400
    base = (ROT_ANCHOR % 86400) // 60
    k = sorted(((h * 60 + m - base) % 1440) * 60 for h, m in ROT_TIMES).index(off)   # 0, 1, 2 = Block im Tag
    return ROTATION[int(k + d) % len(ROTATION)]

def rotation_off(st, save):
    """Spiel ist im rotierenden Betrieb nicht dran: laufende Sendung beenden (Archiv bleibt), Encoder pausieren."""
    if not os.path.exists(D + '/PAUSE.rot'):
        open(D + '/PAUSE.rot', 'w').close(); log('Rotation: %s ist nicht dran, Encoder pausiert' % GAME)
    if not os.path.exists(D + '/PAUSE'): open(D + '/PAUSE', 'w').write('Rotation: anderes Spiel ist dran\n')
    vid = st.get('pending') or (st.get('live') or {}).get('id') or (st.get('rot') or {}).get('old')
    if not vid:
        try: vid = open(D + '/video_id').read().strip()
        except OSError: vid = None
    if vid and st.get('rot_ended') != vid:
        it = api('GET', P_B, dict(part='id,status', id=vid)).get('items', [])
        if it and it[0]['status']['lifeCycleStatus'] not in ('complete', 'revoked'):
            api('POST', P_B + '/transition', dict(broadcastStatus='complete', id=vid, part='id,status'))
            log('Rotation: Sendung %s beendet' % vid)
        st['rot_ended'] = vid
    try: os.kill(int(open(D + '/ffmpeg.pid').read().strip()), 15)
    except Exception: pass
    for k in ('pending', 'live', 'rot', 'miss', 'blind'): st.pop(k, None)
    save()

def rotate_due(start, now):
    """Wechsel faellig? Ja, wenn seit dem Sendungsstart (+2 h) ein fester Termin vorbei ist, oder als Notbremse nach 11,5 h."""
    s = last_slot(now)
    return (s is not None and s >= start + ROT_MIN_AGE_S) or now - start >= ROTATE_S

def main():
    scrub()
    if os.path.exists(D + '/NOBROADCAST'): return
    rg = rotation_game(time.time()) if GAME in ROTATION else None
    if rg: P['slot'] = 0   # im rotierenden Betrieb wechselt alles genau zum Termin
    try: st = json.load(open(STATE))
    except Exception: st = {}
    now = time.time()
    def save():
        json.dump(st, open(STATE + '.tmp', 'w')); os.replace(STATE + '.tmp', STATE)
    if rg and rg != GAME: return rotation_off(st, save)
    if rg == GAME and os.path.exists(D + '/PAUSE.rot'):
        for f in ('PAUSE', 'PAUSE.rot'):
            try: os.remove(D + '/' + f)
            except OSError: pass
        st.pop('rot_ended', None); st['created_at'] = 0; save()
        log('Rotation: %s ist dran, Encoder startet' % GAME)
    def setvid(v):
        # aktuelle Sendungs-ID fuer den Chat-Leser (server.js, VIDEO_ID_FILE): bei mehreren Sendungen auf dem Kanal zeigt /live nur eine
        try:
            if open(D + '/video_id').read().strip() == v: return
        except OSError: pass
        open(D + '/video_id.tmp', 'w').write(v + '\n'); os.replace(D + '/video_id.tmp', D + '/video_id')
    def count_create():
        day = time.strftime('%Y-%m-%d', time.gmtime())
        if st.get('day') != day: st['day'] = day; st['creates'] = 0
        return st.get('creates', 0)
    def kick(why):
        # YouTube schaltet eine gebundene Sendung erst live, wenn der Encoder NACH dem Binden neu verbindet;
        # run.sh verbindet nach einem Abbruch binnen 3 s neu.
        subprocess.run(['pkill', '-TERM', '-u', P['user'], '-f', RTMP])
        st['last_kick'] = now; st['kicks'] = st.get('kicks', 0) + 1; save()
        log('Encoder neu verbunden (%s)' % why)
    def create(title, desc):
        body = dict(
            snippet=dict(title=title, description=desc, scheduledStartTime=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())),
            status=dict(privacyStatus='public', selfDeclaredMadeForKids=False),
            contentDetails=dict(enableAutoStart=True, enableAutoStop=False, enableDvr=True, enableEmbed=True,
                                recordFromStart=True, latencyPreference=P['latency'], monitorStream=dict(enableMonitorStream=False)))
        nb = api('POST', P_B, dict(part='snippet,status,contentDetails'), body)
        st['created_at'] = now; st['creates'] = count_create() + 1; save()
        return nb['id']
    def meta(title, desc):
        # Titel/Beschreibung: aus der Datei des Spiels, sonst die uebergebenen (von der letzten Sendung)
        if P['meta']:
            try: m = json.load(open(P['meta'])); return m['title'], m.get('description', '')
            except Exception: pass
        return title, desc
    def tags(vid):
        # Tags (Marketing 10.10.): liveBroadcasts.insert kann keine Tags setzen -> einmal videos.update (50 Einheiten).
        # Nur wenn broadcast.json ein Feld "tags" hat; ein Fehler stoert den Wechsel nicht.
        if not P['meta']: return
        try:
            m = json.load(open(P['meta'])); tg = m.get('tags')
            if not tg: return
            if isinstance(tg, str): tg = [t.strip() for t in tg.split(',') if t.strip()]
            api('PUT', 'videos', dict(part='snippet'),
                dict(id=vid, snippet=dict(title=m['title'], description=m.get('description', ''), categoryId=str(m.get('categoryId', CATEGORY)), tags=tg)))
            log('Tags gesetzt (%s, %d Stueck)' % (vid, len(tg)))
        except Exception as ex:
            log('Tags NICHT gesetzt (%s): %s' % (vid, str(ex)[:200]))
    def thumb_hash():
        try: return hashlib.md5(open(P['thumb'], 'rb').read()).hexdigest()
        except OSError: return None

    def thumb(vid):
        # Direkt nach dem Anlegen lehnt YouTube das Thumbnail oft mit 403 ab (08.10.) -> gemerkt und jede Minute neu versucht.
        # Ein Versuch kostet 50 API-Einheiten: nach THUMB_FAST Fehlversuchen nur noch alle 30 min, sonst waere das Tageskontingent weg.
        if not os.path.exists(P['thumb']): log('kein Thumbnail (%s fehlt)' % P['thumb']); st.pop('thumb', None); save(); return
        th = st.get('thumb') or {}
        n = th.get('n', 0) if th.get('id') == vid else 0
        r = subprocess.run(['/opt/marble-local/set-thumb.py', vid, P['thumb']], capture_output=True, text=True, env=dict(os.environ, BROADCAST_ENV=P['env']))
        if r.returncode == 0:
            st.pop('thumb', None); st['thumb_h'] = thumb_hash(); save(); log('Thumbnail gesetzt (%s%s)' % (vid, ', Versuch %d' % (n + 1) if n else ''))
        else:
            st['thumb'] = dict(id=vid, n=n + 1, t=now); save()
            if n == 0 or n + 1 == THUMB_FAST: log('Thumbnail NICHT gesetzt (%s, Versuch %d%s): %s' % (vid, n + 1, ', ab jetzt nur noch alle 30 min' if n + 1 == THUMB_FAST else ', neuer Versuch jede Minute', r.stdout[:160]))

    def remind(vid):
        # eigener Chat-Hinweis je Sendung (Nightbot kann bei mehreren Streams auf einem Kanal nicht unterscheiden). Aus: Datei NOCHATBOT
        if os.path.exists(D + '/NOCHATBOT') or now - st.get('remind_t', 0) < REMIND_S: return
        st['remind_t'] = now; save()   # auch bei Fehler erst in REMIND_S wieder versuchen (Kontingent)
        try:
            lv = st.get('live') or {}
            if lv.get('id') != vid: return
            if not lv.get('chat'):
                it = api('GET', P_B, dict(part='id,snippet', id=vid)).get('items', [])
                lv['chat'] = it[0]['snippet'].get('liveChatId') if it else None; save()
            if not lv.get('chat'): return
            texts = P['remind']
            if P['meta']:
                try:
                    h = json.load(open(P['meta'])).get('chatHint')
                    if h: texts = [h]
                except Exception: pass
            i = st.get('remind_i', 0) % len(texts)
            api('POST', 'liveChat/messages', dict(part='snippet'),
                dict(snippet=dict(liveChatId=lv['chat'], type='textMessageEvent', textMessageDetails=dict(messageText=texts[i]))))
            st['remind_i'] = i + 1; st.pop('remind_err', None); save()
        except Exception as ex:
            if not st.get('remind_err'): st['remind_err'] = 1; save(); log('Chat-Hinweis nicht gesendet: ' + str(ex)[:200])

    def rotate():
        """Geplanter Wechsel in Schritten; jeder fertige Schritt wird gespeichert, ein Fehler setzt in der naechsten Minute dort fort."""
        r = st['rot']
        if r['step'] == 'new':   # neue Sendung vorbereiten, waehrend die alte noch laeuft
            old = api('GET', P_B, dict(part=PART, id=r['old'])).get('items', [])
            if not old or old[0]['status']['lifeCycleStatus'] != 'live' or not old[0]['contentDetails'].get('boundStreamId'):
                log('Wechsel abgebrochen: Sendung %s laeuft laut API nicht' % r['old']); st.pop('rot'); st.pop('live', None); save(); return
            if not old[0]['snippet']['title'].startswith(P['prefix']):
                log('Wechsel abgebrochen: Sendung %s gehoert nicht zu diesem Stream (%s)' % (r['old'], old[0]['snippet']['title'][:40])); st.pop('rot'); st.pop('live', None); save(); return
            r['sid'] = old[0]['contentDetails']['boundStreamId']
            r['new'] = create(*meta(old[0]['snippet']['title'], old[0]['snippet'].get('description', '')))
            r['step'] = 'thumb'; save()
            log('Wechsel nach Plan: neue Sendung %s angelegt' % r['new'])
        if r['step'] == 'thumb':
            r['step'] = 'tags'; save(); thumb(r['new'])
        if r['step'] == 'tags':
            r['step'] = 'end'; save(); tags(r['new'])
        if r['step'] == 'end':
            try:
                api('POST', P_B + '/transition', dict(broadcastStatus='complete', id=r['old'], part='id,status'))
            except RuntimeError:
                chk = api('GET', P_B, dict(part='id,status', id=r['old'])).get('items', [])
                if chk and chk[0]['status']['lifeCycleStatus'] != 'complete': raise
            r['step'] = 'bind'; save()
            log('Sendung %s beendet' % r['old'])
        if r['step'] == 'bind':
            api('POST', P_B + '/bind', dict(id=r['new'], streamId=r['sid'], part='id,contentDetails'))
            r['step'] = 'kick'; save()
        if r['step'] == 'kick':
            st.pop('rot'); st.pop('live', None)
            st.update(pending=r['new'], last_wait=now, miss=0, kicks=0); setvid(r['new'])
            kick('neue Sendung %s gebunden' % r['new'])

    if st.get('rot'): return rotate()
    th = st.get('thumb')
    if th:   # offenes Thumbnail nachholen; aufgeben, wenn die Sendung seit ueber 12 h vorbei sein muss
        if now - th.get('t0', th['t']) > 43200: st.pop('thumb'); save()
        elif th['n'] < THUMB_FAST or now - th['t'] >= 1800:
            t0 = th.get('t0', th['t']); thumb(th['id'])
            if st.get('thumb'): st['thumb']['t0'] = t0; save()
    if not sending():
        st['miss'] = 0; save(); return
    vid = st.get('pending') or (st.get('live') or {}).get('id')
    if vid and not st.get('thumb') and thumb_hash() and thumb_hash() != st.get('thumb_h'):
        thumb(vid)   # neues Thumbnail im Repo -> auch fuer die laufende Sendung setzen (einmal, 50 Einheiten)
    live = watch_live(vid) if vid else False
    if live is None:   # watch-Seite unklar: nichts tun; nach 5 Minuten blind wenigstens den faelligen Wechsel nicht verpassen
        st['blind'] = st.get('blind', 0) + 1; save(); lv = st.get('live') or {}
        if st['blind'] >= 5 and lv.get('id') == vid and rotate_due(lv['start'], now) and count_create() < MAX_CREATES_DAY:
            st['rot'] = dict(old=vid, step='new'); save(); rotate()
        return
    st['blind'] = 0
    if live is True:
        if st.get('miss', 0) >= MISS_BEFORE_API: log('Sendung %s ist oeffentlich live' % vid)
        st['miss'] = 0; st.pop('pending', None); st['kicks'] = 0; setvid(vid)
        lv = st.get('live') or {}
        lt = st.get('live_try') or [None, 0]
        if lv.get('id') != vid and (lt[0] != vid or now - lt[1] > 600):   # Startzeit der Sendung einmal per API holen
            st['live_try'] = [vid, now]; save()
            it = api('GET', P_B, dict(part='id,snippet,status', id=vid)).get('items', [])
            if it and it[0]['snippet'].get('actualStartTime'):
                lv = st['live'] = dict(id=vid, start=epoch(it[0]['snippet']['actualStartTime']))
                nxt = next_slot(max(now, lv['start'] + ROT_MIN_AGE_S))
                log('Sendung %s laeuft seit %s, Wechsel um %s' % (vid, it[0]['snippet']['actualStartTime'],
                    time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(min(nxt, lv['start'] + ROTATE_S)))))
        save()
        if lv.get('id') == vid and rotate_due(lv['start'], now):
            if count_create() >= MAX_CREATES_DAY:
                if now - st.get('limit_log', 0) > 3600: st['limit_log'] = now; save(); log('Wechsel faellig, aber Tageslimit (%d Sendungen heute)' % st['creates'])
                return
            st['rot'] = dict(old=vid, step='new'); save(); rotate()
        else: remind(vid)
        return
    st['miss'] = st.get('miss', 0) + 1; save()
    if st['miss'] < MISS_BEFORE_API: return
    if now - st.get('last_api', 0) < 55: return
    # vorbereitete Sendung wartet: in der ersten Viertelstunde alle 2 min nachsehen, danach alle 15 min
    gap = 120 if now - st.get('created_at', 0) < 900 else 900
    if st.get('pending') and now - st.get('last_wait', 0) < gap: return
    st['last_api'] = now; save()

    streams = api('GET', P_S, dict(part='id,snippet,status', mine='true', maxResults=20)).get('items', [])
    own = [s for s in streams if s['snippet']['title'] in P['stream']]
    if not own or own[0]['status']['streamStatus'] != 'active':
        if now - st.get('noin_log', 0) > 900:
            st['noin_log'] = now; save()
            log(('Stream-Eingang "%s" bei YouTube nicht gefunden' % P['stream'][0]) if not own else 'Stream-Eingang "%s" bekommt keine Daten - nichts zu tun' % own[0]['snippet']['title'])
        return
    sid = own[0]['id']

    active = api('GET', P_B, dict(part=PART, broadcastStatus='active', maxResults=10)).get('items', [])
    for b in active:
        if b['contentDetails'].get('boundStreamId') == sid and b['status']['privacyStatus'] == 'public':
            if (st.get('live') or {}).get('id') != b['id']: log('API: Sendung %s laeuft (%s)' % (b['id'], b['status']['lifeCycleStatus']))
            st.pop('pending', None); st['miss'] = 0; setvid(b['id'])
            if b['snippet'].get('actualStartTime'): st['live'] = dict(id=b['id'], start=epoch(b['snippet']['actualStartTime']))
            save(); return
    st.pop('live', None); save()   # die gemerkte Sendung laeuft laut API nicht mehr

    upcoming = api('GET', P_B, dict(part=PART, broadcastStatus='upcoming', maxResults=20)).get('items', [])
    mine = [b for b in upcoming if b['contentDetails'].get('boundStreamId') == sid and b['status']['privacyStatus'] == 'public']
    if mine:
        b = mine[0]; lc = b['status']['lifeCycleStatus']
        st['last_wait'] = now; st['pending'] = b['id']; save(); setvid(b['id'])
        if lc in ('ready', 'testing') and now - st.get('last_kick', 0) >= KICK_GAP_S and st.get('kicks', 0) < MAX_KICKS:
            kick('Sendung %s ist vorbereitet (%s), aber noch nicht live' % (b['id'], lc))
        else:
            log('Sendung %s wartet (%s)' % (b['id'], lc))
        return

    if now - st.get('created_at', 0) < CREATE_GAP_S or count_create() >= MAX_CREATES_DAY:
        log('keine Sendung, aber Sperrfrist/Tageslimit (%d heute)' % st.get('creates', 0)); return

    title, desc = P['title'], ''
    done = api('GET', P_B, dict(part='id,snippet,status', broadcastStatus='completed', maxResults=10)).get('items', [])
    for b in done:   # Titel/Beschreibung von der letzten oeffentlichen Sendung uebernehmen
        if b['status']['privacyStatus'] == 'public' and b['snippet']['title'].startswith(P['prefix']):
            title, desc = b['snippet']['title'], b['snippet'].get('description', ''); break
    nid = create(*meta(title, desc))
    st.update(pending=nid, last_wait=now, kicks=0); save(); setvid(nid)
    api('POST', P_B + '/bind', dict(id=nid, streamId=sid, part='id,contentDetails'))
    log('NEUE Sendung %s angelegt und an den Stream gebunden' % nid)
    thumb(nid)
    tags(nid)
    kick('neue Sendung %s gebunden' % nid)

if __name__ == '__main__':
    lock = open(D + '/broadcast.lock', 'w')
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError: sys.exit(0)   # der vorige Lauf arbeitet noch
    try: main()
    except Exception as ex: log('FEHLER: ' + str(ex)[:500])
