#!/usr/bin/env python3
"""Gemini-Meldung pruefen: was ist laut Edit zu Zeitpunkt t im Bild/Ton?

Nutzung: python3 tools/qa_at.py edit.json 33.0 [fenster_s=1.0]
Zeigt alle Clips, die im Fenster [t-f, t+f] aktiv sind, je Spur (Namen aus edit.meta.json),
fuer Untertitel/Texte zusaetzlich die geschaetzte Breite (Bangers ~46 px/Zeichen bei 130 + Spacing 3).
"""
import json, sys

edit_path, t = sys.argv[1], float(sys.argv[2])
win = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
edit = json.load(open(edit_path))
meta = json.load(open(edit_path.rsplit('.', 1)[0] + '.meta.json'))
for name, tr in zip(meta['track_names'], edit['timeline']['tracks']):
    for c in tr['clips']:
        a, b = c['start'], c['start'] + c['length']
        if b < t - win or a > t + win: continue
        at = c['asset']; mark = '*' if a <= t < b else ' '
        if at['type'] == 'rich-text':
            sz = at['font']['size']; w = len(at['text'].split('\n')[0]) * (46 * sz / 130 + 3)
            box = c.get('width', 0) - 32
            warn = '  <-- ZU BREIT' if box > 0 and w > box else ''
            desc = f'TEXT {at["text"]!r} size {sz} ~{w:.0f}px / box {box}px{warn}'
        elif at['type'] in ('image', 'audio'):
            desc = f'{at["type"].upper()} {at["src"].split("/")[-1]}'
        else:
            desc = at['type'].upper()
        print(f'{mark} {a:7.2f}-{b:7.2f}  {name:12s} {desc}')
print(f'(* = aktiv bei t={t})')
