#!/usr/bin/env python3
"""Audit eines KI-Studio-Edits (vor JEDEM Render). Prueft rechnerisch:
1 Overlaps je Spur | 2 Frame fuer Frame: kein Schwarzbild, richtiges Bild | 3 Whoosh-Peaks auf Szenenschnitten
4 Hit-Peaks auf Box2/ZAP/Karte | 5 Stimme == Bildschnitt, Luecken | 6 Enden gleich | 7 Untertitel/Hook/Safe-Zone
Nutzung standalone: python3 tools/audit_short.py edit.json edit.meta.json
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = json.load(open(os.path.join(HERE, 'sfx.json')))
PEAK = {v['file']: v['peak'] for v in SFX['sounds'].values()}
FPS = 24


def fname(c):
    return c['asset'].get('src', '').split('/')[-1]


def audit(edit, meta, verbose=True):
    T = edit['timeline']['tracks']
    N = dict(zip(meta['track_names'], T))
    END, errs = meta['END'], []
    say = print if verbose else (lambda *a: None)

    # 1 Overlaps
    for name, t in N.items():
        s = sorted(t['clips'], key=lambda c: c['start'])
        for a, b in zip(s, s[1:]):
            if a['start'] + a['length'] > b['start'] + 1e-9:
                errs.append(f'Overlap auf {name} bei {a["start"]}')
        for c in t['clips']:
            if c['length'] <= 0: errs.append(f'Laenge <= 0 auf {name} bei {c["start"]}')
    # 2 Bilder Frame fuer Frame
    imgs = sorted(N['images_A']['clips'] + N['images_B']['clips'], key=lambda c: c['start'])
    cuts = meta['cuts']
    # Schnitt i gehoert zu A[i//2] (gerade) bzw. B[i//2] (ungerade)
    planned = [(N['images_A'] if i % 2 == 0 else N['images_B'])['clips'][i // 2] for i in range(len(cuts))]
    black, wrong = [], []
    for f in range(int(END * FPS)):
        t = (f + 0.5) / FPS
        vis = None
        for tr in (N['images_B'], N['images_A']):
            for c in tr['clips']:
                if c['start'] <= t < c['start'] + c['length']: vis = c; break
            if vis: break
        if not vis: black.append(round(t, 3)); continue
        exp = max(i for i, cu in enumerate(cuts) if cu <= t)
        if vis is not planned[exp]: wrong.append(round(t, 3))
    if black: errs.append(f'{len(black)} schwarze Frames, z.B. {black[:5]}')
    if wrong: errs.append(f'{len(wrong)} Frames mit falschem Bild, z.B. {wrong[:5]}')
    say(f'2) Bilder: {len(imgs)} Clips, {int(END*FPS)} Frames, schwarz {len(black)}, falsch {len(wrong)}')
    # 3 Whooshes
    wd = []
    for c, cut in zip(N['whooshes']['clips'], meta['scene_starts']):
        d = (c['start'] + PEAK[fname(c)] - cut) * 1000; wd.append(round(d))
        if abs(d) > 10: errs.append(f'Whoosh {fname(c)} {d:+.0f} ms neben Schnitt {cut}')
    if len(N['whooshes']['clips']) != len(meta['scene_starts']): errs.append('Anzahl Whooshes != Szenenschnitte')
    say(f'3) Whoosh-Peak vs. Schnitt (ms): {wd}')
    # 4 Hits
    targets = {'impact_box.wav': meta['CUT'], 'zap.wav': meta.get('Z'), 'gong_timeskip.wav': (meta.get('card') or [None])[0]}
    for c in N['hits']['clips']:
        tg = targets.get(fname(c))
        d = (c['start'] + PEAK[fname(c)] - tg) * 1000
        say(f'4) {fname(c):18s} Peak {c["start"] + PEAK[fname(c)]:.3f} s, Ziel {tg:.2f} ({d:+.0f} ms)')
        if abs(d) > 50: errs.append(f'{fname(c)} {d:+.0f} ms neben Ziel')
    # 5 Stimme
    v = N['voice']['clips']
    for c, cut in zip(v[1:], meta['scene_starts']):
        if abs(c['start'] - cut) > 0.005: errs.append(f'Stimme {c["start"]} != Schnitt {cut}')
    gaps = [round(b['start'] - (a['start'] + a['length']), 2) for a, b in zip(v, v[1:])]
    if any(g < 0 or g > 0.1 for g in gaps): errs.append(f'Stimm-Luecken ausserhalb 0-0,1 s: {gaps}')
    if abs(v[0]['start'] - 0.15) > 1e-6: errs.append('Hook-Stimme startet nicht bei 0,15 s')
    say(f'5) Stimm-Luecken: {gaps}')
    # 6 Enden
    ends = {'Bilder': round(max(c['start'] + c['length'] for c in imgs), 2),
            'Stimme': round(v[-1]['start'] + v[-1]['length'] + 0.01, 2),
            'Musik': round(N['music']['clips'][0]['length'], 2),
            'CTA': round(N['box1_text']['clips'][-1]['start'] + N['box1_text']['clips'][-1]['length'], 2)}
    if len(set(ends.values())) != 1: errs.append(f'Enden ungleich: {ends}')
    say(f'6) Enden: {ends}')
    # 7 Untertitel/Hook/Laenge
    caps = N['captions']['clips']
    if caps and caps[0]['start'] < meta['S1'] - 0.06: errs.append('Wort-Untertitel waehrend des Hooks')
    if not 25 <= END <= 45: errs.append(f'Laenge {END:.1f} s ausserhalb 25-45 s')
    for c in N['box1_text']['clips'][:1] + N['box2_text']['clips']:
        for line in c['asset']['text'].split('\n'):
            maxc = 18 if c['asset']['font']['size'] == 130 and c['width'] == 960 else 16 if c['width'] == 900 else 18
            if len(line) > maxc: errs.append(f'Boxtext zu lang ({len(line)}>{maxc}): {line!r}')
    say(f'7) Untertitel: {len(caps)} | Laenge {END:.2f} s')
    say('AUDIT ' + ('GRUEN' if not errs else 'ROT:\n  - ' + '\n  - '.join(errs)))
    return not errs


if __name__ == '__main__':
    e = json.load(open(sys.argv[1])); m = json.load(open(sys.argv[2]))
    sys.exit(0 if audit(e, m) else 1)
