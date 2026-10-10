#!/bin/bash
# Lädt die Musik aus music.json (stable-audio-3, eigene Stücke), schneidet Stille am Ende ab und gleicht die Lautheit an (−16 LUFS, Effekte kommen obendrauf).
DIR="$(cd "$(dirname "$0")" && pwd)"
# sync <music.json> <Zielordner> <Besitzer>: fehlende Stücke laden, nicht mehr gelistete entfernen
sync() {
  local JSON="$1" OUT="$2" OWNER="$3"; mkdir -p "$OUT"
  python3 -c "import json,sys;[print(t['name'],t['url']) for t in json.load(open(sys.argv[1]))]" "$JSON" | while read -r NAME URL; do
    [ -s "$OUT/$NAME.mp3" ] && continue
    curl -fsSL "$URL" -o "/tmp/$NAME.raw.mp3" && \
    ffmpeg -nostdin -y -loglevel error -i "/tmp/$NAME.raw.mp3" -af areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3,areverse,loudnorm=I=-16:TP=-2:LRA=11 -ar 44100 -b:a 160k -f mp3 "$OUT/.$NAME.part" && mv "$OUT/.$NAME.part" "$OUT/$NAME.mp3" && echo "Musik: $NAME"   # erst fertig umbenennen, sonst spielt der Stream halbe Dateien
    rm -f "/tmp/$NAME.raw.mp3" "$OUT/.$NAME.part"
  done
  # Stücke, die nicht mehr in der Liste stehen, entfernen
  local NAMES; NAMES=$(python3 -c "import json,sys;print('\\n'.join(t['name'] for t in json.load(open(sys.argv[1]))))" "$JSON" 2>/dev/null)
  [ -n "$NAMES" ] && for F in "$OUT"/*.mp3; do [ -e "$F" ] || continue; N=$(basename "$F" .mp3); grep -qxF "$N" <<<"$NAMES" || { rm -f "$F"; echo "Musik entfernt: $N"; }; done   # leere/kaputte Liste → nichts löschen
  chown -R "$OWNER:$OWNER" "$OUT" 2>/dev/null || true
}
sync "$DIR/music.json" "${DATA_DIR:-/var/lib/marble}/music" marble
# Eigene Musik je Quiz-Stream (Niklas 10.10.): <spiel>/music.json -> /var/lib/marble-<spiel>/music; der Spiel-Server nimmt sie, sobald dort Stücke liegen
[ "$(id -u)" = 0 ] && for G in words country capital; do
  [ -f "$DIR/$G/music.json" ] && id "$G" >/dev/null 2>&1 && sync "$DIR/$G/music.json" "/var/lib/marble-$G/music" "$G"
done

# neues Update-Skript aus dem Repo übernehmen (sync-music läuft beim Update als root)
[ "$(id -u)" = 0 ] && [ -f "$DIR/marble-update.sh" ] && install -m 755 "$DIR/marble-update.sh" /usr/local/bin/marble-update
# Cron fehlt im DO-Ubuntu-Image → ohne ihn läuft das Selbst-Update nie
if [ "$(id -u)" = 0 ] && ! command -v cron >/dev/null; then apt-get -o DPkg::Lock::Timeout=900 -y -q install cron && systemctl enable --now cron; fi
