#!/bin/bash
# Lädt die Musik aus music.json (stable-audio-3, eigene Stücke) und gleicht die Lautheit an (−16 LUFS, Effekte kommen obendrauf).
DIR="$(cd "$(dirname "$0")" && pwd)"; OUT="${DATA_DIR:-/var/lib/marble}/music"; mkdir -p "$OUT"
python3 -c "import json,sys;[print(t['name'],t['url']) for t in json.load(open('$DIR/music.json'))]" | while read -r NAME URL; do
  [ -s "$OUT/$NAME.mp3" ] && continue
  curl -fsSL "$URL" -o "/tmp/$NAME.raw.mp3" && \
  ffmpeg -nostdin -y -loglevel error -i "/tmp/$NAME.raw.mp3" -af loudnorm=I=-16:TP=-2:LRA=11 -ar 44100 -b:a 160k "$OUT/$NAME.mp3" && echo "Musik: $NAME"
  rm -f "/tmp/$NAME.raw.mp3"
done
# Stücke, die nicht mehr in music.json stehen, entfernen
for F in "$OUT"/*.mp3; do [ -e "$F" ] || continue; N=$(basename "$F" .mp3); grep -q "\"name\":\"$N\"" "$DIR/music.json" || { rm -f "$F"; echo "Musik entfernt: $N"; }; done
chown -R marble:marble "$OUT" 2>/dev/null || true

# neues Update-Skript aus dem Repo übernehmen (sync-music läuft beim Update als root)
[ "$(id -u)" = 0 ] && [ -f "$DIR/marble-update.sh" ] && install -m 755 "$DIR/marble-update.sh" /usr/local/bin/marble-update
# Cron fehlt im DO-Ubuntu-Image → ohne ihn läuft das Selbst-Update nie
if [ "$(id -u)" = 0 ] && ! command -v cron >/dev/null; then apt-get -o DPkg::Lock::Timeout=900 -y -q install cron && systemctl enable --now cron; fi
