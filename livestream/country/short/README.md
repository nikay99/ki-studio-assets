# Guess the Country – Quiz-Shorts

Short (15 s, 1080×1920, 30 fps) aus dem Spiel: Umriss + Hook, Countdown 5…1 mit Tipps, Auflösung mit Flagge, Endkarte „Play live with the chat“, Loop zurück zum Anfang.

```
cd livestream && python3 -m http.server 8099 --bind 127.0.0.1 &
node country/short/frames.js "c=JP&n=Japan&cap=Tokyo&cont=Asia" /tmp/fr_jp 30 15   # braucht playwright-core
python3 country/short/mix.py /tmp/jp.wav 2        # Musik (stable-audio-3) + SFX (ElevenLabs) aus sfx/; 2 = floor(Buchstaben/2)
ffmpeg -framerate 30 -i /tmp/fr_jp/f%04d.jpg -i /tmp/jp.wav -filter_complex "[1:a]alimiter=limit=0.8:level=false[a]" \
  -map 0:v -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 15 short_jp.mp4
```
Dann `qa/preflight.py --video short_jp.mp4`. Musik und Soundeffekte selbst erzeugt über fal (stable-audio-3, ElevenLabs SFX), keine fremden Stücke.
