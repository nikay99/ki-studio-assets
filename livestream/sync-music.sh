#!/bin/bash
# Lädt die Musik aus music.json (stable-audio-3, eigene Stücke) und gleicht die Lautheit an (−16 LUFS, Effekte kommen obendrauf).
DIR="$(cd "$(dirname "$0")" && pwd)"; OUT="${DATA_DIR:-/var/lib/marble}/music"; mkdir -p "$OUT"
python3 -c "import json,sys;[print(t['name'],t['url']) for t in json.load(open('$DIR/music.json'))]" | while read -r NAME URL; do
  [ -s "$OUT/$NAME.mp3" ] && continue
  curl -fsSL "$URL" -o "/tmp/$NAME.raw.mp3" && \
  ffmpeg -y -loglevel error -i "/tmp/$NAME.raw.mp3" -af loudnorm=I=-16:TP=-2:LRA=11 -ar 44100 -b:a 160k "$OUT/$NAME.mp3" && echo "Musik: $NAME"
  rm -f "/tmp/$NAME.raw.mp3"
done
chown -R marble:marble "$OUT" 2>/dev/null || true
