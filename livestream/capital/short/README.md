# Guess the Capital – Quiz-Shorts

Wie country/short (15 s, 1080×1920, 30 fps): Flagge + Land + Umriss, Countdown 5…1 mit Tipps (Anfangsbuchstabe, Punkt im Umriss,
Endbuchstabe bzw. „Not Sydney“ mit trap=), Auflösung mit Namensschild am Punkt, Endkarte, Loop. Musik + SFX aus country/short/sfx/.

```
cd livestream && python3 -m http.server 8099 --bind 127.0.0.1 &
node capital/short/frames.js "c=AU&n=Australia&cap=Canberra&trap=Sydney" /tmp/fr_au 30 15   # braucht playwright-core
python3 capital/short/mix.py /tmp/au.wav 3        # 3 = floor((Buchstaben-1)/2)
ffmpeg -framerate 30 -i /tmp/fr_au/f%04d.jpg -i /tmp/au.wav -filter_complex "[1:a]alimiter=limit=0.8:level=false[a]" \
  -map 0:v -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 15 short_au.mp4
python3 /mnt/project-files/qa/preflight.py --video short_au.mp4 --allow-still 10.3-14.6   # Endkarte
```
