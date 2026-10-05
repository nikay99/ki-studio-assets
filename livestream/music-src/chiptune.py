"""Schnelle 8-Bit-Fassungen gemeinfreier Klassiker für den Livestream (eigenes Arrangement, eigene Synthese, keine Samples).
Jede Runde wird schneller und ab Runde 3 einen Halbton höher – wie ein Rennen, das sich hochschaukelt.
Aufruf: python3 chiptune.py <ausgabeordner>  → schreibt WAVs, ffmpeg macht daraus MP3."""
import sys, wave, numpy as np
from scipy.signal import lfilter

SR = 44100
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
        'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
midi = lambda n: 12 * (int(n[-1]) + 1) + NOTE[n[:-1]]
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def pulse(f, n, duty):
    ph = (np.arange(n) * f / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)


def tri(f, n):
    ph = (np.arange(n) * f / SR) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


def env(n, a=0.004, r=0.04, sus=0.75):
    e = np.full(n, sus); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na); dk = min(n - na, int(0.05 * SR))
    e[na:na + dk] = np.linspace(1, sus, dk)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, fc):
    # Einpol-Tiefpass: nimmt die Schärfe aus den Rechteckwellen
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)


def fade(n, ms=4):
    e = np.ones(n); k = min(n, int(ms / 1000 * SR))
    if k: e[-k:] = np.linspace(1, 0, k)
    return e


def kick(n):
    t = np.arange(n) / SR; f = 150 * np.exp(-t * 28) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18)


rng = np.random.default_rng(7)
def noise(n, dec):
    # 8-Bit-Rauschen: grob abgetastet
    x = np.repeat(rng.uniform(-1, 1, n // 4 + 1), 4)[:n]
    return x * np.exp(-np.arange(n) / SR * dec) * fade(n)


def render(song):
    """song: dict mit parts=[(melodie, bassfolge)], beats_per_bar, rounds=[(bpm, transpose)], drum ('gallop'|'rock')"""
    secs = []
    for ri, (bpm, tr) in enumerate(song['rounds']):
        duty = [0.5, 0.33, 0.5, 0.25][ri % 4]          # Klangfarbe wechselt pro Runde
        beat = 60 / bpm
        for mel, bass in song['parts']:
            tot = sum(d for _, d in mel); n = int(tot * beat * SR) + 1
            lead, harm, bas, dr = (np.zeros(n) for _ in range(4))
            pos = 0.0
            for note, d in mel:
                i0, ln = int(pos * beat * SR), int(d * beat * SR * 0.92)
                if note:
                    m = midi(note) + tr
                    vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * np.arange(ln) / SR) * (np.arange(ln) > 0.08 * SR)
                    lead[i0:i0 + ln] += pulse(hz(m) * vib, ln, duty) * env(ln, r=0.015)
                    harm[i0:i0 + ln] += tri(hz(m - 12), ln) * env(ln, r=0.015, sus=0.6)
                pos += d
            # Bass: Achtel im Oktavsprung (Umpa) auf der Dreieckswelle
            bar = song['bpb'] * beat; step = beat / 2
            for bi, root in enumerate(bass):
                roots = root if isinstance(root, list) else [root]
                for k in range(int(song['bpb'] * 2)):
                    r = roots[min(k * len(roots) // int(song['bpb'] * 2), len(roots) - 1)]
                    m = midi(r) + tr + (12 if k % 2 else 0)
                    i0, ln = int((bi * bar + k * step) * SR), int(step * SR * 0.85)
                    if i0 + ln <= n:
                        f = hz(m); t_ = np.arange(ln) / SR
                        bas[i0:i0 + ln] += (tri(f, ln) + 0.6 * np.sin(2 * np.pi * f * t_)) * env(ln, r=0.02, sus=0.9)
            # Schlagzeug
            nb = int(round(tot * 2))
            for k in range(nb):
                i0 = int(k * step * SR); ln = min(int(step * SR), n - i0)
                if ln <= 0: break
                if k >= nb - 4 and mel is song['parts'][-1][0]:   # Snare-Wirbel als Übergang in die nächste Runde
                    h2 = ln // 2
                    for o in (0, h2): dr[i0 + o:i0 + o + h2] += noise(h2, 25) * (0.25 + 0.08 * (k - nb + 4))
                    continue
                if k % 2 == 0: dr[i0:i0 + ln] += kick(ln) * 0.9
                if song['drum'] == 'rock' and k % 4 == 2: dr[i0:i0 + ln] += noise(ln, 22) * 0.5
                if song['drum'] == 'gallop' and k % 2 == 1: dr[i0:i0 + ln] += noise(ln, 30) * 0.45
                dr[i0:i0 + ln] += noise(ln, 160) * 0.09   # Hi-Hat auf jeder Achtel, leise
            secs.append(lowpass(lead, 3200) * 0.24 + harm * 0.10 + lowpass(bas, 1500) * 0.42 + lowpass(dr, 6000) * 0.30)
    # Schluss-Akkord + Becken
    last = song['rounds'][-1]; tr = last[1]; n = int(1.4 * SR)
    end = lowpass(sum(pulse(hz(midi(x) + tr), n, 0.5) for x in song['end']) * env(n, r=0.9, sus=0.5), 2500) * 0.08 + lowpass(noise(n, 4), 5000) * 0.08
    secs.append(end)
    y = np.concatenate(secs); y /= max(1e-9, np.abs(y).max()) / 0.9
    # leichte Stereobreite: rechts 11 ms später
    d = int(0.011 * SR); r = np.concatenate([np.zeros(d), y[:-d]])
    return np.stack([y, 0.5 * (y + r)], 1)


e, q, h = .5, 1, 2
# ---- Can-Can (Offenbach 1858) ----
HEAD = [('C5', 2), ('C5', e), ('D5', e), ('F5', e), ('E5', e), ('D5', 1), ('G5', 1), ('G5', e), ('A5', e), ('E5', e), ('F5', e),
        ('D5', 1), ('D5', 1), ('D5', e), ('F5', e), ('E5', e), ('D5', e)]
CC1 = HEAD + [('C5', e), ('C6', e), ('B5', e), ('A5', e), ('G5', e), ('F5', e), ('E5', e), ('D5', e)]
CC2 = HEAD + [('C5', e), ('C6', e), ('G5', e), ('E5', e), ('C5', 1), (None, 1)]
CCB1 = ['C3', 'C3', 'G2', 'G2', 'G2', 'G2', 'C3', 'G2']
CCB2 = ['C3', 'C3', 'G2', 'G2', 'G2', 'G2', 'C3', 'C3']
# ---- Korobeiniki (russisches Volkslied 1861) ----
K1 = [('E5', 1), ('B4', e), ('C5', e), ('D5', 1), ('C5', e), ('B4', e), ('A4', 1), ('A4', e), ('C5', e), ('E5', 1), ('D5', e), ('C5', e),
      ('B4', 1.5), ('C5', e), ('D5', 1), ('E5', 1), ('C5', 1), ('A4', 1), ('A4', 1), (None, 1)]
K2 = [('D5', 1.5), ('F5', e), ('A5', 1), ('G5', e), ('F5', e), ('E5', 1.5), ('C5', e), ('E5', 1), ('D5', e), ('C5', e),
      ('B4', 1), ('B4', e), ('C5', e), ('D5', 1), ('E5', 1), ('C5', 1), ('A4', 1), ('A4', 1), (None, 1)]
KB1 = ['E2', 'A2', ['G#2', 'E2'], 'A2']
KB2 = ['D2', 'C2', ['B1', 'E2'], 'A2']
# ---- In der Halle des Bergkönigs (Grieg 1875) ----
M1 = [('A4', e), ('B4', e), ('C5', e), ('D5', e), ('E5', e), ('C5', e), ('E5', q), ('D#5', e), ('B4', e), ('D#5', q), ('D5', e), ('Bb4', e), ('D5', q),
      ('A4', e), ('B4', e), ('C5', e), ('D5', e), ('E5', e), ('C5', e), ('E5', e), ('A5', e), ('G5', e), ('E5', e), ('C5', e), ('E5', e), ('G5', h)]
M2 = [('E5', e), ('F#5', e), ('G5', e), ('A5', e), ('B5', e), ('G5', e), ('B5', q), ('A#5', e), ('F#5', e), ('A#5', q), ('A5', e), ('F5', e), ('A5', q),
      ('E5', e), ('F#5', e), ('G5', e), ('A5', e), ('B5', e), ('G5', e), ('B5', e), ('E6', e), ('D6', e), ('B5', e), ('G5', e), ('B5', e), ('D6', h)]
MB1 = ['A2', 'A2', 'A2', 'E2']
MB2 = ['E2', 'E2', 'E2', 'B1']
# ---- Hummelflug (Rimski-Korsakow 1900): chromatisches Summen in Sechzehnteln ----
s = .25
def run(*ns): return [(n, s) for n in ns]
B1 = run('E6', 'D#6', 'D6', 'C#6', 'D6', 'C#6', 'C6', 'B5', 'C6', 'B5', 'A#5', 'A5', 'G#5', 'G5', 'F#5', 'F5',
         'E5', 'D#5', 'D5', 'C#5', 'D5', 'C#5', 'C5', 'B4', 'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4')
B2 = run('E4', 'F4', 'E4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'G#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
         'C5', 'C#5', 'C5', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'E5', 'D#5', 'E5', 'F5', 'F#5', 'G5')
B3 = run('A5', 'G#5', 'G5', 'F#5', 'G5', 'F#5', 'F5', 'E5', 'F5', 'E5', 'D#5', 'D5', 'C#5', 'C5', 'B4', 'A#4',
         'A4', 'A#4', 'A4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'C#5', 'C5', 'C#5', 'D5', 'D#5', 'E5')
BB1 = ['A2', 'A2', 'A2', 'A2']
BB3 = ['D2', 'D2', 'E2', 'E2']

SONGS = {
    '14-cancan-8bit': dict(parts=[(CC1, CCB1), (CC2, CCB2)], bpb=2, drum='gallop', end=['C5', 'E5', 'G5', 'C6'],
                           rounds=[(165, 0), (175, 0), (185, 1), (195, 1), (205, 2), (215, 2), (225, 3), (235, 3)] * 2),
    '15-korobeiniki-8bit': dict(parts=[(K1, KB1), (K2, KB2)], bpb=4, drum='rock', end=['A4', 'C5', 'E5', 'A5'],
                                rounds=[(160, 0), (170, 0), (180, 1), (190, 1), (200, 2), (210, 2), (220, 3), (232, 3)] * 2),
    '16-mountain-king-8bit': dict(parts=[(M1, MB1), (M2, MB2)], bpb=4, drum='rock', end=['A4', 'C5', 'E5', 'A5'],
                                  rounds=[(150, 0), (165, 0), (180, 1), (195, 1), (210, 2), (225, 2), (240, 3), (255, 3)] * 2),
    '17-bumblebee-8bit': dict(parts=[(B1, BB1), (B2, BB1), (B3, BB3), (B1, BB1)], bpb=4, drum='gallop', end=['A4', 'C#5', 'E5', 'A5'],
                              rounds=[(150, 0), (160, 0), (170, 1), (180, 1), (190, 2), (200, 2), (210, 3), (220, 3)] * 2),
}

out = sys.argv[1] if len(sys.argv) > 1 else '.'
for name, song in SONGS.items():
    for mel, _ in song['parts']: assert abs(sum(d for _, d in mel) % song['bpb']) < 1e-9, (name, sum(d for _, d in mel))
    y = render(song)
    with wave.open(f'{out}/{name}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
    print(name, f'{len(y) / SR:.0f} s')
