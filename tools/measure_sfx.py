#!/usr/bin/env python3
"""Misst neue Sounds im Repo und traegt sie in tools/sfx.json ein.

Nutzung:  python3 tools/measure_sfx.py sfx/cl_boom.mp3 climax [--vol 0.9] [--len 1.2] [--word BOOM!] [--mood dark,thrill]
- peak  = Zeit des lautesten 10-ms-RMS-Fensters (fuer Riser: Dateiende)
- lufs  = integrierte Lautheit (ffmpeg ebur128)
Benoetigt ffmpeg. Liest die lokale Datei (Repo-Checkout), kein Netz noetig.
"""
import argparse, json, os, re, subprocess, struct

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'sfx.json')
DEF_VOL = {'opener': 0.65, 'whoosh': 0.8, 'impact': 0.8, 'climax': 0.9, 'riser': 0.6, 'timeskip': 0.8}
# Referenz-Lautheit je Kategorie (die abgenommenen Sounds); vol wird darauf angeglichen
REF_LUFS = {'opener': -14.0, 'whoosh': -18.0, 'impact': -16.0, 'climax': -14.0, 'riser': -20.0, 'timeskip': -18.0}


def measure(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = struct.unpack('<%df' % (len(raw) // 4), raw)
    n = 480
    rms = [sum(v * v for v in x[i:i + n]) / n for i in range(0, max(1, len(x) - n), n)]
    peak = rms.index(max(rms)) * n / 48000 + 0.005
    dur = len(x) / 48000
    err = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    return round(peak, 3), round(dur, 2), float(m[-1]) if m else None


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('file'); ap.add_argument('category', choices=list(DEF_VOL))
    ap.add_argument('--vol', type=float); ap.add_argument('--len', type=float)
    ap.add_argument('--word'); ap.add_argument('--mood', default='dark,curious,thrill')
    a = ap.parse_args()
    peak, dur, lufs = measure(a.file)
    if a.category == 'riser': peak = dur
    name = os.path.splitext(os.path.basename(a.file))[0]
    d = json.load(open(P))
    e = {'file': os.path.basename(a.file), 'file_len': dur, 'len': round(min(a.len or dur, dur), 2), 'peak': peak,
         'vol': a.vol or (round(max(0.1, min(1.0, DEF_VOL[a.category] * 10 ** ((REF_LUFS[a.category] - lufs) / 20))), 2) if lufs is not None else DEF_VOL[a.category]), 'lufs': lufs, 'category': a.category, 'mood': a.mood.split(',')}
    if a.word: e['word'] = a.word.split(',')
    d['sounds'][name] = e
    json.dump(d, open(P, 'w'), indent=1, ensure_ascii=False)
    print(name, e)
