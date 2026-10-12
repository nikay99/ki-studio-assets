# Guess the Country Short in Remotion (Niklas 12.10.)
Abgeleitet von der Capital-Vorlage (Branch capital-pfeil): 15 s, 30 fps, gleiche Zeitleiste, dicker Pfeil auf der Endkarte. Rätselart: Umriss + Name ohne Vokale (nv=1) oder normal mit halben Buchstaben (nv=0), Tipps Kontinent / Karte / Hauptstadt, Flagge bei der Auflösung.
```
npm install                                                   # remotion 4.0.533; Schrift liegt in public/
python3 mkprops.py MG Madagascar Antananarivo Africa 1 props.json
npx remotion render src/index.ts CountryShort out.mp4 --props=props.json --crf=18 --jpeg-quality=100 --muted --browser-executable=$(ls /opt/pw-browsers/chromium_headless_shell-1194/*/headless_shell)
python3 ../mix.py mg.wav 6 0.5 1.5                            # 6 = Zahl der aufgedeckten Buchstaben, 0.5/1.5 = Aufdeck-Fenster (ohne Vokale); normal: nur Zahl = floor(Buchstaben/2)
ffmpeg -i out.mp4 -i mg.wav -filter_complex "[1:a]alimiter=limit=0.8:level=false,aresample=48000[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 15 final.mp4
python3 /mnt/project-files/qa/preflight.py --video final.mp4 --allow-still 10.3-14.6
```
Die HTML-Vorlage (../short.html) bleibt als Fallback.
