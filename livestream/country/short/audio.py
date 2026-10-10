# Spielsounds des Shorts (gleiche Glocken wie im Stream: Sinus + Obertöne, Pentatonik), 15 s, 48 kHz
import numpy as np, wave, sys
SR=48000; D=15.0; out=np.zeros(int(SR*D))
def bell(f,at,d=.5,v=.14):
    n=int(SR*(d+.05)); t=np.arange(n)/SR; env=np.minimum(t/.008,1)*np.exp(-t*7/d)
    sig=sum(vv*np.sin(2*np.pi*f*m*t) for m,vv in [(1,1),(2.01,.35),(3.02,.12)])*env*v
    i=int(at*SR); out[i:i+n]+=sig[:len(out)-i]
P=[523.25,587.33,659.25,783.99,880,1046.5]
for k,n in enumerate([0,2,4]): bell(P[n],.05+k*.08,.5,.10)            # Start
for s in [1,2,3,4,5]: bell(1318.5,s,.18,.09); bell(659.25,s,.25,.05)      # Countdown-Ticks
for h in [2.0,3.2,4.4]: bell(659.25,h,.4,.09); bell(987.77,h+.08,.5,.07)  # Tipps
for k in range(int(sys.argv[2])): bell(P[k%6],2.5+k*3.0/int(sys.argv[2]),.35,.06)   # Buchstaben
for k,n in enumerate([0,2,4,5]): bell(P[n],6.0+k*.09,.9,.13)             # Auflösung
bell(1046.5,6.0,.6,.12); bell(1569.75,6.07,.7,.07)
for k,n in enumerate([2,4,5]): bell(P[n]/2,10.0+k*.1,.8,.10)            # Endkarte
# Untergrund: weicher Puls (120 BPM, Grundton C + Quinte), läuft bis zum letzten Sample und passt am Ende in den Anfang
t=np.arange(len(out))/SR; beat=(t*2)%1; env=np.exp(-beat*5)*.9+.1
pad=(np.sin(2*np.pi*65.41*t)+.5*np.sin(2*np.pi*98.0*t)+.25*np.sin(2*np.pi*130.81*t))*env*.05
out+=pad
out=np.clip(out/ max(1,np.abs(out).max()/0.8),-1,1)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype('<i2').tobytes()); w.close()
