# Guess the Capital Short in Remotion (Niklas 12.10.)
Gleiche Zeitleiste wie die HTML-Vorlage (15 s, 30 fps, Ton aus ../mix.py), Hook-Einstieg, dicker Pfeil auf der Endkarte.
```
cp ../../../words/public/fonts/InterVariable.woff2 public/   # Ordner public/ anlegen
npm install                                                   # remotion 4.0.533
python3 mkprops.py AU Australia Canberra Sydney props.json   # Falle leer lassen = ohne "Not …"
npx remotion render src/index.ts CapitalShort out.mp4 --props=props.json --crf=18 --jpeg-quality=100 --muted --browser-executable=<headless_shell>
python3 ../mix.py au.wav 3   # 3 = floor((Buchstaben-1)/2)
ffmpeg -i out.mp4 -i au.wav -filter_complex "[1:a]alimiter=limit=0.8:level=false[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 15 final.mp4
python3 /mnt/project-files/qa/preflight.py --video final.mp4 --allow-still 10.3-14.6
```
