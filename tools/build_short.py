#!/usr/bin/env python3
"""KI-Studio Short Builder: spec.json -> Shotstack-Edit-JSON (+ Audit).

Nutzung:
    python3 tools/build_short.py spec.json edit.json
    python3 tools/build_short.py spec.json --timeline   (vorab: Laenge, Hoehepunkt, Zeitsprung fuer den Musik-Prompt)
Exit-Code 0 = Audit gruen, 1 = Audit-Fehler (NICHT rendern), 2 = Spec-Fehler.

Bildet exakt das abgenommene Design nach (Referenz: examples/slotin/edit_v9.json):
Hook-Boxen, Wort-Untertitel mit Keyword-Farben, ZAP-Hoehepunkt, Zeitsprung-Karte,
A/B-Bildspuren (Ueberlappung nur auf A), Whoosh-Peaks auf Szenenschnitten,
Hits/Ducking, CTA. Spec-Format: siehe examples/slotin/spec.json und README.
"""
import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = json.load(open(os.path.join(HERE, 'sfx.json')))
FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/bangers/Bangers-Regular.ttf'
RED, YEL, BLK, WHT = '#E63946', '#F4D35E', '#000000', '#FFFFFF'
VO = 0.15          # Stimme startet bei 0,15 s (Punch davor)
HOOK_GAP = 0.10    # Luft zwischen Hook-Satz und Szene 1
CAP_EARLY = 0.05   # Untertitel 0,05 s vor dem Wort
CAP_MAXCH = 16     # max. Zeichen fuer normale Untertitel
CAP_JOIN_MAXCH = 12 # konservativer Join: verhindert Auto-Wrap bei grossen Keyword-Captions
OVL = 0.05         # Ueberlappung der unteren Bildspur A
SX, SY = 0.012, -0.008  # harter Schatten der Boxen
r2 = lambda x: round(x + 0.0, 2)


def die(msg):
    print('SPEC-FEHLER:', msg); sys.exit(2)


def snd(name):
    s = SFX['sounds'][name]
    return SFX['base_url'] + s['file'], s


def clean(w):
    return re.sub(r"[^\w'\-\$%&]+", '', w).upper()


# ---------- Wort-Timings ----------
def words_from_timestamps(ts):
    """fal/ElevenLabs: result.timestamps = [{characters, character_start_times_seconds, character_end_times_seconds}, ...]"""
    if isinstance(ts, dict):
        ts = [ts]
    ch, cs, ce = [], [], []
    for blk in ts:
        ch += blk['characters']; cs += blk['character_start_times_seconds']; ce += blk['character_end_times_seconds']
    out, cur, st, en = [], '', None, None
    for c, a, b in zip(ch, cs, ce):
        if str(c).isspace():
            if cur: out.append((cur, st, en))
            cur, st, en = '', None, None
        else:
            if not cur: st = float(a)
            cur += str(c); en = float(b)
    if cur: out.append((cur, st, en))
    return out


def scene_words(s):
    if s.get('words'):
        return [(w, float(a), float(b)) for w, a, b in s['words']]
    if s.get('timestamps'):
        return words_from_timestamps(s['timestamps'])
    die('Szene ohne words/timestamps: %s' % s.get('voice'))


def chunks_of(ws, d):
    """1-2 Woerter: Woerter <=3 Buchstaben werden mit dem naechsten zusammengezogen (kein Flackern)."""
    ch, k = [], 0
    while k < len(ws):
        txt, st, en = ws[k]; idx = [k]
        # zusammenziehen nur, wenn der Untertitel danach noch in die 990-px-Box passt (sonst Umbruch/abgeschnitten)
        if (len(re.sub(r'\W', '', txt)) <= 3 and k + 1 < len(ws) and not re.search(r'[.,;:!?]$', txt)
                and len(clean(txt + ' ' + ws[k + 1][0])) <= CAP_JOIN_MAXCH):
            txt, en = txt + ' ' + ws[k + 1][0], ws[k + 1][2]; idx.append(k + 1); k += 1
        elif (len(re.sub(r'\W', '', txt)) <= 3 and k + 1 < len(ws) and ch
                and not re.search(r'[.,;:!?]$', txt) and not re.search(r'[.,;:!?]$', ch[-1]['txt'])
                and len(clean(ch[-1]['txt'] + ' ' + txt)) <= CAP_JOIN_MAXCH):
            # passt nicht nach vorne -> an das vorherige Wort haengen statt allein zu flackern
            ch[-1]['txt'] += ' ' + txt; ch[-1]['en'] = en; ch[-1]['idx'].append(k); k += 1; continue
        ch.append({'txt': txt, 'st': st, 'en': en, 'idx': idx}); k += 1
    for i, c in enumerate(ch):
        nxt = ch[i + 1]['st'] if i + 1 < len(ch) else d
        c['end'] = min(nxt, c['en'] + 0.35) if i + 1 < len(ch) else d
    return ch


def find_phrase(scs, phrase, scene_hint=None):
    """-> (scene_index, [wortindizes]) der ersten Fundstelle."""
    target = [clean(w) for w in phrase.split()]
    for si, s in enumerate(scs):
        if scene_hint is not None and si != scene_hint: continue
        ws = [clean(w[0]) for w in s['_words']]
        for i in range(len(ws) - len(target) + 1):
            if ws[i:i + len(target)] == target:
                return si, list(range(i, i + len(target)))
    die('Phrase nicht in der Narration gefunden: %r' % phrase)


# ---------- Clip-Bausteine ----------
def pop(f=1.5, l=0.22, e='easeOutBack'):
    return [{'from': f, 'to': 1, 'start': 0, 'length': l, 'easing': e}]


def rect(w, h, col, stroke, start, length, x, y, rot):
    a = {'type': 'shape', 'shape': 'rectangle', 'rectangle': {'width': w, 'height': h},
         'fill': {'color': col, 'opacity': 1}, 'width': w + 40, 'height': h + 40}
    if stroke: a['stroke'] = {'color': BLK, 'width': 14}
    return {'asset': a, 'start': start, 'length': length, 'position': 'center', 'offset': {'x': x, 'y': y},
            'transform': {'rotate': {'angle': rot}}, 'scale': pop()}


def text(t, w, h, col, size, start, length, x, y, rot, stroke=None):
    a = {'type': 'rich-text', 'text': t, 'font': {'family': 'Bangers', 'size': size, 'color': col},
         'style': {'letterSpacing': 3, 'lineHeight': 1.0}, 'align': {'horizontal': 'center', 'vertical': 'middle'}}
    if stroke:
        a['stroke'] = {'width': stroke, 'color': BLK}
        a['shadow'] = {'offsetX': 6, 'offsetY': 8, 'color': BLK, 'opacity': 1}
    return {'asset': a, 'start': start, 'length': length, 'width': w, 'height': h, 'position': 'center',
            'offset': {'x': x, 'y': y}, 'transform': {'rotate': {'angle': rot}}, 'scale': pop()}


def audio(src, start, length, vol=1, effect=None):
    a = {'type': 'audio', 'src': src, 'volume': vol}
    if effect: a['effect'] = effect
    return {'asset': a, 'start': start, 'length': length}


def pick_sounds(spec):
    """spec.sound waehlt pro Kategorie aus dem Pool (tools/sfx.json); fehlend = defaults."""
    raw = spec.get('sound') or {}
    sel = dict(SFX['defaults']); sel.update({k: v for k, v in raw.items() if k in sel})
    sel['whoosh_vols'] = raw.get('whoosh_vols', [])
    want = {'opener': 'opener', 'impact': 'impact', 'climax': 'climax', 'timeskip': 'timeskip', 'riser': 'riser'}
    for k, c in want.items():
        n = sel.get(k)
        if n is None: continue
        if n not in SFX['sounds']: die('Sound %r (%s) nicht in tools/sfx.json' % (n, k))
        if SFX['sounds'][n].get('usable') is False: die('Sound %r ist gesperrt: %s' % (n, SFX['sounds'][n].get('note')))
        if SFX['sounds'][n]['category'] != c: die('Sound %r ist Kategorie %s, nicht %s' % (n, SFX['sounds'][n]['category'], c))
    if isinstance(sel['whooshes'], str): sel['whooshes'] = [sel['whooshes']]
    for n in sel['whooshes']:
        if n is None: continue
        if SFX['sounds'].get(n, {}).get('category') != 'whoosh' or SFX['sounds'][n].get('usable') is False: die('Whoosh %r unbekannt/gesperrt' % n)
    return sel


def sfx_clip(name, target, align_peak=True):
    src, s = snd(name)
    st = r2(target - s['peak']) if align_peak else target
    return audio(src, max(0, st), s['len'], s['vol'], 'fadeOut')


def burst_svg():
    pts = []
    for i in range(28):
        ang = math.pi * 2 * i / 28
        r = 290 if i % 2 == 0 else 170 + (25 if i % 4 == 1 else 0)
        pts.append(f"{300 + r * math.cos(ang):.0f},{300 + r * math.sin(ang):.0f}")
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">'
            f'<polygon points="{" ".join(pts)}" fill="{RED}" stroke="#000000" stroke-width="14" stroke-linejoin="miter"/></svg>')


# ---------- Build ----------
def build(spec):
    hook, scs = spec['hook'], spec['scenes']
    SND = pick_sounds(spec)
    if not 5 <= len(scs) <= 9: die('5-9 Szenen erwartet, sind %d' % len(scs))
    for s in scs:
        s['_words'] = scene_words(s)
        s['_d'] = r2(float(s.get('dur') or (s['_words'][-1][2] + 0.15)))

    # --- Hook-Timing
    hw = scene_words(hook) if (hook.get('words') or hook.get('timestamps')) else None
    hook_d = r2(float(hook.get('dur') or (hw[-1][2] + 0.1)))
    if hook.get('turn_at') is not None:
        turn = float(hook['turn_at'])
    else:
        tw = clean(hook.get('turn_word', 'AND'))
        cand = [w for w in (hw or []) if clean(w[0]) == tw]
        if not cand: die('Wendungswort %r nicht im Hook-Satz' % tw)
        turn = cand[0][1]
    CUT = r2(VO + turn)                    # Box 2 + Einschlag + Bildschnitt
    S1 = r2(VO + hook_d + HOOK_GAP)        # Start Szene 1
    BOX_END = r2(S1 - 0.03)

    # --- Szenen-Zeiten
    t = S1
    for s in scs:
        s['_t'] = t; t = r2(t + s['_d'])
    END = t

    # --- Untertitel (ohne Hook)
    kw_r = {clean(w) for w in spec.get('keywords', {}).get('red', [])}
    kw_y = {clean(w) for w in spec.get('keywords', {}).get('yellow', [])}
    card = spec.get('card'); zap = spec.get('zap')
    drop = set()
    if card:
        csi, cidx = find_phrase(scs, card.get('phrase') or card['text'].replace('.', ''), card.get('scene'))
        drop = {(csi, i) for i in cidx}
    caps, card_span = [], []
    for si, s in enumerate(scs):
        for c in chunks_of(s['_words'], s['_d']):
            a0 = r2(s['_t'] + c['st']); b0 = r2(s['_t'] + max(c['end'], c['st'] + 0.12))
            a = r2(a0 - CAP_EARLY); ln = max(r2(b0 - a0), 0.1)
            if any((si, i) in drop for i in c['idx']):
                card_span.append((a, r2(a + ln))); continue
            words = [clean(w) for w in c['txt'].split()]
            txt = ' '.join(words)
            col, size = WHT, 125
            if any(w in kw_r for w in words if len(w) > 3 or w.isdigit()) or txt in kw_r: col, size = RED, 145
            elif any(w in kw_y for w in words) or txt in kw_y: col, size = YEL, 145
            caps.append({'asset': {'type': 'rich-text', 'text': txt,
                                   'font': {'family': 'Bangers', 'size': size, 'color': col},
                                   'style': {'letterSpacing': 3}, 'stroke': {'width': 16, 'color': BLK},
                                   'shadow': {'offsetX': 4, 'offsetY': 6, 'color': BLK, 'opacity': 1}},
                         'start': a, 'length': ln, 'width': 990, 'height': 200, 'position': 'center',
                         'offset': {'x': 0, 'y': -0.2}, 'scale': pop(1.3, 0.1, 'easeOutCubic')})
    # Float-Overlaps auf der Untertitelspur in 0,01-Schritten kuerzen (transparent, unkritisch)
    caps.sort(key=lambda c: c['start'])
    for x, y in zip(caps, caps[1:]):
        # strikt pruefen wie Shotstack (JS-Float): 4.12 + 1.19 = 5.3100000000000005 > 5.31 -> clip_overlap
        if x['start'] + x['length'] > y['start']: x['length'] = r2(y['start'] - x['start'])
        if x['start'] + x['length'] > y['start']: x['length'] = r2(x['length'] - 0.01)

    # --- Bilder (Liste in Schnittreihenfolge)
    imgs = [({'asset': {'type': 'image', 'src': hook['image']}, 'position': 'center',
              'scale': [{'from': 1.35, 'to': 1.08, 'start': 0, 'length': 0.35, 'easing': 'easeOutCubic'},
                        {'from': 1.08, 'to': 1.22, 'start': 0.35, 'length': r2(max(1.25, CUT - 0.25))}]}, 0),  # Zoom bis zum Schnitt (preflight: kein Stillstand im Hook)
            ({'asset': {'type': 'image', 'src': hook.get('image2') or scs[0]['image']}, 'scale': 1.15,
              'position': 'center', 'effect': 'zoomInSlow'}, CUT)]
    for k, s in enumerate(scs):
        out = (s.get('kenburns') or ('out' if k % 2 == 0 else 'in')) == 'out'
        eff = 'zoomOutSlow' if out else 'zoomInSlow'
        pos = s.get('focus') if s.get('focus') in ('top', 'center', 'bottom') else 'center'
        wide = {'asset': {'type': 'image', 'src': s['image']}, 'scale': 1.07, 'position': 'center', 'effect': eff}
        close = {'asset': {'type': 'image', 'src': s.get('image_b') or s['image']}, 'scale': 1.45, 'position': pos, 'effect': eff}
        first, second = (close, wide) if out else (wide, close)
        imgs += [(first, s['_t']), (second, r2(s['_t'] + round(s['_d'] / 2, 2)))]
    A, B = [], []
    cuts = [c for _, c in imgs]
    for i, (c, cut) in enumerate(imgs):
        nxt = cuts[i + 1] if i + 1 < len(imgs) else END
        if i % 2 == 0:   # untere Spur A traegt die Ueberlappung
            c['start'] = r2(max(0, cut - (OVL if i > 0 else 0)))
            c['length'] = r2(min(END, nxt + OVL) - c['start'])
            A.append(c)
        else:            # obere Spur B exakt
            c['start'] = cut; c['length'] = r2(nxt - cut); B.append(c)

    # --- Stimme, Szenen-SFX, Whooshes
    voice = [audio(hook['voice'], VO, hook_d)]
    scene_sfx, wh, wh_targets = [], [], []
    for k, s in enumerate(scs):
        voice.append(audio(s['voice'], s['_t'], r2(s['_d'] - 0.01)))
        if s.get('sfx'):
            scene_sfx.append(audio(s['sfx'], s['_t'], r2(s['_d'] - 0.01), s.get('sfx_vol', 1)))
        wname = SND['whooshes'][k % len(SND['whooshes'])]
        if wname is not None:
            wc = sfx_clip(wname, s['_t'])
            vols = SND.get('whoosh_vols') or []
            mult = float(vols[k]) if k < len(vols) else 1.0
            wc['asset']['volume'] = round(wc['asset']['volume'] * mult, 3)
            wh.append(wc); wh_targets.append(s['_t'])

    # --- Hits
    hits = [sfx_clip(SND['impact'], CUT, align_peak=snd(SND['impact'])[1]['peak'] > 0.05)]
    riser = []
    top_fx, zap_txt, zap_burst = [], [], []
    flash = {'asset': {'type': 'shape', 'shape': 'rectangle', 'rectangle': {'width': 1080, 'height': 1920},
                       'fill': {'color': WHT, 'opacity': 1}}, 'start': 0, 'length': 0.3, 'position': 'center',
             'opacity': [{'from': 0.9, 'to': 0, 'start': 0, 'length': 0.3, 'easing': 'easeOutCubic'}]}
    top_fx.append(flash)
    Z = None
    if zap:
        zsi, zidx = find_phrase(scs, zap['word'], zap.get('scene'))
        Z = r2(scs[zsi]['_t'] + scs[zsi]['_words'][zidx[0]][1])
        zs = [{'from': 0.3, 'to': 1.15, 'start': 0, 'length': 0.15, 'easing': 'easeOutCubic'},
              {'from': 1.15, 'to': 1, 'start': 0.15, 'length': 0.1}]
        zt = text(zap.get('text', 'ZAP!'), 700, 300, YEL, 220, Z, 1.0, 0, 0.24, -8, stroke=18); zt['scale'] = zs
        zap_txt.append(zt)
        zap_burst.append({'asset': {'type': 'svg', 'src': burst_svg()}, 'start': Z, 'length': 1.0, 'position': 'center',
                          'offset': {'x': 0, 'y': 0.24}, 'transform': {'rotate': {'angle': -8}}, 'scale': zs})
        top_fx.append({'asset': flash['asset'], 'start': Z, 'length': 0.2, 'position': 'center',
                       'opacity': [{'from': 0.6, 'to': 0, 'start': 0, 'length': 0.2, 'easing': 'easeOutCubic'}]})
        hits.append(sfx_clip(SND['climax'], Z))
        if SND.get('riser'):   # Riser endet exakt auf dem Hoehepunkt (Peak = Dateiende)
            rsrc, rs = snd(SND['riser'])
            riser.append(audio(rsrc, r2(max(0, Z - rs['len'])), rs['len'], rs['vol']))

    # --- Boxen / Karte / CTA
    l1, l2 = hook['line1'], hook['line2']
    box2_text = [text(l2, 960, 200, WHT, 130, CUT, r2(BOX_END - CUT), 0, -0.17, 2)]
    box2 = [rect(960, 200, RED, True, CUT, r2(BOX_END - CUT), 0, -0.17, 2)]
    box2_sh = [rect(960, 200, BLK, False, CUT, r2(BOX_END - CUT), SX, -0.17 + SY, 2)]
    if card:
        cs_, ce_ = min(a for a, _ in card_span), r2(max(b for _, b in card_span) + CAP_EARLY)
        cl = r2(ce_ - cs_)
        box2_text.append(text(card['text'], 760, 170, BLK, 115, cs_, cl, 0, 0.30, -2))
        box2.append(rect(760, 170, YEL, True, cs_, cl, 0, 0.30, -2))
        box2_sh.append(rect(760, 170, BLK, False, cs_, cl, SX, 0.30 + SY, -2))
        hits.append(sfx_clip(SND['timeskip'], cs_, align_peak=snd(SND['timeskip'])[1]['peak'] > 0.05))
    cta = {'asset': {'type': 'rich-text', 'text': spec.get('cta', 'FOLLOW FOR THE NEXT TRUE STORY'),
                     'font': {'family': 'Bangers', 'size': 76, 'color': RED}, 'style': {'letterSpacing': 3},
                     'stroke': {'width': 12, 'color': BLK},
                     'shadow': {'offsetX': 4, 'offsetY': 6, 'color': BLK, 'opacity': 1}},
           'start': r2(END - 2), 'length': 2, 'width': 990, 'height': 220, 'position': 'center', 'offset': {'x': 0, 'y': 0.25}}  # Safe Zone: Mitte bei 25 % Hoehe (preflight: unten ab 75 % liegen Titel/Kanalname)
    box1_text = [text(l1, 900, 330, BLK, 130, VO, r2(BOX_END - VO), 0, -0.04, -2), cta]
    box1 = [rect(900, 330, YEL, True, VO, r2(BOX_END - VO), 0, -0.04, -2)]
    box1_sh = [rect(900, 330, BLK, False, VO, r2(BOX_END - VO), SX, -0.04 + SY, -2)]

    # --- Musik mit Fades + Ducking am ZAP
    MV = spec.get('music_vol', 0.18)
    if Z:
        d0 = r2(Z - 0.11)
        vol = [{'from': 0, 'to': MV, 'start': 0, 'length': 0.5},
               {'from': MV, 'to': MV, 'start': 0.5, 'length': r2(d0 - 0.5)},
               {'from': MV, 'to': 0.05, 'start': d0, 'length': 0.1},
               {'from': 0.05, 'to': 0.05, 'start': r2(d0 + 0.1), 'length': 1.0},
               {'from': 0.05, 'to': MV, 'start': r2(d0 + 1.1), 'length': 0.4},
               {'from': MV, 'to': MV, 'start': r2(d0 + 1.5), 'length': r2(END - 1 - (d0 + 1.5))},
               {'from': MV, 'to': 0, 'start': r2(END - 1), 'length': 1.0}]
    else:
        vol = [{'from': 0, 'to': MV, 'start': 0, 'length': 0.5},
               {'from': MV, 'to': MV, 'start': 0.5, 'length': r2(END - 1.5)},
               {'from': MV, 'to': 0, 'start': r2(END - 1), 'length': 1.0}]
    music = [{'asset': {'type': 'audio', 'src': spec['music'], 'volume': vol}, 'start': 0, 'length': END}]

    punch = [sfx_clip(SND['opener'], 0, align_peak=False)]
    order = [top_fx, zap_txt, zap_burst, box2_text, box2, box2_sh, box1_text, box1, box1_sh, caps,
             B, A, voice, scene_sfx, wh, punch, hits, riser, music]
    names = ['flash', 'zap_text', 'zap_burst', 'box2_text', 'box2', 'box2_shadow', 'box1_text', 'box1', 'box1_shadow',
             'captions', 'images_B', 'images_A', 'voice', 'scene_sfx', 'whooshes', 'punch', 'hits', 'riser', 'music']
    tracks = [{'clips': c} for c in order if c]
    edit = {'timeline': {'background': BLK, 'fonts': [{'src': FONT_URL}], 'tracks': tracks},
            'output': {'format': 'mp4', 'size': {'width': 1080, 'height': 1920}, 'fps': 24}}
    meta = {'END': END, 'CUT': CUT, 'S1': S1, 'Z': Z, 'cuts': cuts, 'sound': SND,
            'scene_starts': [s['_t'] for s in scs], 'whoosh_targets': wh_targets,
            'track_names': [n for n, c in zip(names, order) if c],
            'card': [min(a for a, _ in card_span)] if card else None}
    return edit, meta


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[2] == '--timeline':
        # Vorab-Timeline fuer den Sound Designer (Musik-Prompt): braucht nur Stimmen + Zeitstempel
        spec = json.load(open(sys.argv[1])); spec.setdefault('music', 'about:blank')
        for s in spec['scenes']: s.setdefault('image', 'about:blank')
        spec['hook'].setdefault('image', 'about:blank')
        _, m = build(spec)
        print(json.dumps({'laenge_s': m['END'], 'wendung_s': m['CUT'], 'szene1_s': m['S1'], 'hoehepunkt_s': m['Z'],
                          'zeitsprung_s': (m['card'] or [None])[0], 'szenen_s': m['scene_starts']}, indent=1))
        sys.exit(0)
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    spec = json.load(open(sys.argv[1]))
    edit, meta = build(spec)
    sys.path.insert(0, HERE)
    from audit_short import audit
    ok = audit(edit, meta)
    json.dump(edit, open(sys.argv[2], 'w'), separators=(',', ':'))
    json.dump(meta, open(sys.argv[2].rsplit('.', 1)[0] + '.meta.json', 'w'), indent=1)
    print('Edit geschrieben:', sys.argv[2], '| Laenge %.2f s' % meta['END'], '| AUDIT', 'GRUEN' if ok else 'ROT')
    sys.exit(0 if ok else 1)
