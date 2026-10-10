# Wie country/short/mix.py: mischt Musik (stable-audio-3, eigen) + SFX (ElevenLabs) zum 15-s-Short. mix.py out.wav <buchstaben>
import numpy as np, subprocess, sys
SR=48000; D=15.0; DIR=__import__('os').path.dirname(__import__('os').path.abspath(__file__))+'/../../country/short/sfx/'   # Musik + SFX der Country-Shorts mitnutzen
def load(f):
    a=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',DIR+f,'-ac','2','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout,dtype='<f4').reshape(-1,2).astype(float)
    return a
def norm(a): return a/max(1e-9,np.abs(a).max())
out=np.zeros((int(SR*D),2))
mus=load('music_a.mp3')[:len(out)]
# Musik: kurze Pause vor der Auflösung (5,8–6,0 s) = Spannung, danach weiter
g=np.ones(len(out)); a,b=int(5.8*SR),int(6.0*SR); g[a:b]=0.08; g[a-2400:a]=np.linspace(1,.08,2400)
# Loop: letzte 0,4 s Musik in den Anfang überblenden
L=int(.4*SR); mus2=mus.copy(); w=np.linspace(0,1,L)[:,None]; mus2[-L:]=mus[-L:]*(1-w)+mus[:L]*w
out[:len(mus2)]+=mus2*g[:len(mus2),None]*0.55
def put(f,at,gain,peak_at=None):
    s=norm(load(f))*gain; i=int(at*SR)
    if peak_at is not None: i=int(peak_at*SR)-int(np.argmax(np.abs(s).max(1)))
    i=max(0,i); n=min(len(s),len(out)-i); out[i:i+n]+=s[:n]
put('slam.mp3',0,0.9,peak_at=0.3)
for t in [1,2,3,4,5]: put('tick.mp3',t,0.45+0.1*(t-1))
for t in [2.0,3.2,4.4]: put('pop.mp3',t,0.6)
n=int(sys.argv[2]); [put('pop.mp3',2.5+k*3.0/n,0.35) for k in range(n)]
put('riser.mp3',4.0,0.5)
put('ding.mp3',6.0,0.8); put('cheer.mp3',6.05,0.45)
put('pop.mp3',10.0,0.6)
out=np.clip(out,-1,1)
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-',sys.argv[1]],input=out.astype('<f4').tobytes())
