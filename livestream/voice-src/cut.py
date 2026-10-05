# Schneidet Sprecher-Sätze aus einer Chatterbox-Datei an den Whisper-Wortgrenzen
import warnings; warnings.filterwarnings("ignore")
# Aufruf: python3 cut.py batch.wav seg.txt outdir   (seg.txt: "NAME start end" je Zeile)
import sys, subprocess, numpy as np
from scipy.io import wavfile
wav, seg, out = sys.argv[1:4]
sr, x = wavfile.read(wav, mmap=False); x = x.astype(np.float32)
if x.ndim > 1: x = x.mean(1)
x /= 32768 if np.abs(x).max() > 2 else 1
F = int(sr*0.01)
for line in open(seg):
    p = line.split()
    if len(p) < 3: continue
    name, a, b = p[0], float(p[1]), float(p[2])
    def quiet(t0, t1):   # leiseste Stelle (Pause zwischen Sätzen) im Fenster
        i0, i1 = max(0,int(t0*sr)), min(len(x),int(t1*sr)); W = int(sr*0.03)
        e = np.convolve(x[i0:i1]**2, np.ones(W)/W, 'same'); return i0+int(np.argmin(e))
    y = x[quiet(a-0.3, a+0.03):quiet(b-0.2, b+0.1)].copy()
    rms = np.array([np.sqrt(np.mean(y[i:i+F]**2)) for i in range(0, len(y)-F, F)])
    thr = rms.max()*10**(-32/20); on = np.where(rms > thr)[0]
    i0, i1 = max(0,(on[0]-2)*F), min(len(y),(on[-1]+4)*F)
    y = y[i0:i1]
    y *= 10**(-16/20)/np.sqrt(np.mean(y[np.abs(y)>0.02]**2))   # gleiche Lautheit
    y = np.clip(y/max(1,np.abs(y).max()/0.95), -1, 1)
    fi, fo = int(sr*0.01), int(sr*0.06)
    y[:fi] *= np.linspace(0,1,fi); y[-fo:] *= np.linspace(1,0,fo)
    tmp = f'/tmp/_cut_{name}.wav'; wavfile.write(tmp, sr, (y*32767).astype(np.int16))
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',tmp,'-ac','1','-b:a','64k',f'{out}/{name}.mp3'], check=True)
    print(name, round(len(y)/sr,2))
