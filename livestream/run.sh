#!/bin/bash
# Länder-Kugelrennen: Bildschirm (Xvfb) + Ton (PulseAudio) + Chrome mit der Rennseite + ffmpeg.
# Mit STREAM_KEY → RTMP zu YouTube in Blöcken (< 12 h, damit YouTube jede Sendung archiviert und die Zeit zählt).
# Ohne STREAM_KEY → Testmodus: schreibt 60-s-Testclips nach $DATA_DIR/test0..2.mp4.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${DATA_DIR:-/var/lib/marble}"; mkdir -p "$DATA_DIR"
[ -f /etc/marble/stream.env ] && . /etc/marble/stream.env
BLOCK_S="${BLOCK_S:-41400}"          # 11,5 h pro Sendung
PAUSE_S="${PAUSE_S:-60}"
VBIT="${VBIT:-3000k}"; RES="${RES:-1280x720}"; PRESET="${PRESET:-veryfast}"; FPS="${FPS:-30}"
CHROME="${CHROME:-$(command -v chromium || command -v chromium-browser || command -v google-chrome)}"
[ -n "${STREAM_KEY_V:-}" ] && VERT=1 || VERT=0          # zweiter Schlüssel = zusätzlich 9:16-Stream (720x1280)
RW=${RES%x*}; RH=${RES#*x}; [ "$VERT" = 1 ] && { SW=$((RW+720)); SH=1280; } || { SW=$RW; SH=$RH; }
export DISPLAY=:99 XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/marble-xdg}"; mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$DATA_DIR/log.txt"; }
runjson(){ printf '{"mode":"%s","block_start":"%s","note":"%s"}' "$1" "$(date -u +%FT%TZ)" "${2:-}" > "$DATA_DIR/run.json"; }

cleanup(){ pkill -P $$ 2>/dev/null; kill $(jobs -p) 2>/dev/null; }
trap cleanup EXIT

rm -f /tmp/.X99-lock
Xvfb :99 -screen 0 ${SW}x${SH}x24 -nolisten tcp >/dev/null 2>&1 &
pulseaudio --daemonize=no --exit-idle-time=-1 --log-target=stderr >/dev/null 2>&1 &
sleep 2
pactl load-module module-null-sink sink_name=race sink_properties=device.description=race >/dev/null
pactl set-default-sink race

# Rennseite: Chrome im Kiosk-Modus (Software-Rendering reicht für 2D-Canvas)
start_chrome(){
  "$CHROME" --no-first-run --no-default-browser-check --disable-infobars --kiosk --window-position=0,0 --window-size=${SW},${SH} \
    --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows --disable-features=Translate,MediaRouter --password-store=basic \
    --user-data-dir="$DATA_DIR/chrome" ${CHROME_EXTRA:-} "http://127.0.0.1:8080/?w=${RW}$([ "$VERT" = 1 ] && echo "&v=1")" >/dev/null 2>&1 &
  CHROME_PID=$!
}
for i in $(seq 1 60); do curl -fs -o /dev/null http://127.0.0.1:8080/api/board && break; sleep 2; done
start_chrome
sleep 8
# Wenn sich dieses Skript (per Selbst-Update) ändert: beenden, systemd startet die Sendung mit der neuen Fassung neu
SELF_SUM=$(cat "$0" /etc/marble/stream.env "$DIR/PAUSE" 2>/dev/null | md5sum | cut -d' ' -f1)
( while sleep 60; do [ "$(cat "$0" /etc/marble/stream.env "$DIR/PAUSE" 2>/dev/null | md5sum | cut -d' ' -f1)" != "$SELF_SUM" ] && { log "run.sh oder Schlüssel geändert, Neustart"; kill $$; pkill -P $$ -x ffmpeg; exit; }; done ) &

while true; do
  [ -f /etc/marble/stream.env ] && . /etc/marble/stream.env
  kill -0 $CHROME_PID 2>/dev/null || { log "Chrome neu gestartet"; start_chrome; sleep 8; }
  IN=(-thread_queue_size 1024 -f x11grab -draw_mouse 0 -video_size "${SW}x${SH}" -framerate "$FPS" -i :99.0
      -thread_queue_size 1024 -f pulse -i race.monitor)
  ENC=(-c:v libx264 -preset "$PRESET" -b:v "$VBIT" -maxrate "$VBIT" -bufsize 6000k -pix_fmt yuv420p -g $((FPS*2)) -keyint_min $((FPS*2)) -sc_threshold 0
       -c:a aac -b:a 128k -ar 44100 -ac 2)
  snap(){ SNAP=(-map 0:v -t "$1" -vf fps=1/10,scale=640:-2 -update 1 -q:v 4 "$DATA_DIR/snap.jpg"); }
  if [ -f "$DIR/PAUSE" ]; then                       # Pause per Repo-Datei livestream/PAUSE (z. B. zum Umstellen in YouTube Studio)
    runjson pause "PAUSE-Datei im Repo"; sleep 20; continue
  fi
  if [ -n "${STREAM_KEY:-}" ] && [ "${STREAM_ENABLED:-1}" = "1" ]; then
    snap "$BLOCK_S"; runjson live; log "Sendung startet (Block ${BLOCK_S}s)"
    if [ "$VERT" = 1 ]; then
      # ein Bildschirm, zwei Ausschnitte: links 16:9, rechts 9:16 → zwei Sendungen (YouTube „In zwei Formaten streamen“)
      ffmpeg -y -hide_banner -loglevel error -nostats -progress "$DATA_DIR/progress.txt" "${IN[@]}" \
        -filter_complex "[0:v]split=3[a][b][c];[a]crop=${RW}:${RH}:0:0[h];[b]crop=720:1280:${RW}:0[v];[c]crop=${RW}:${RH}:0:0,fps=1/10,scale=640:-2[s]" \
        -map "[h]" -map 1:a -t "$BLOCK_S" "${ENC[@]}" -f flv "rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}" \
        -map "[v]" -map 1:a -t "$BLOCK_S" "${ENC[@]}" -f flv "rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY_V}" \
        -map "[s]" -t "$BLOCK_S" -update 1 -q:v 4 "$DATA_DIR/snap.jpg" 2>>"$DATA_DIR/ffmpeg.err"
    else
      ffmpeg -y -hide_banner -loglevel error -nostats -progress "$DATA_DIR/progress.txt" "${IN[@]}" -t "$BLOCK_S" \
        -map 0:v -map 1:a "${ENC[@]}" -f flv "rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}" "${SNAP[@]}" 2>>"$DATA_DIR/ffmpeg.err"
    fi
    log "Sendung beendet (Exit $?), Pause ${PAUSE_S}s"; sleep "$PAUSE_S"
  else
    snap 3600; runjson test "kein STREAM_KEY: Testclips"; log "Testmodus"
    ffmpeg -y -hide_banner -loglevel error -nostats -progress "$DATA_DIR/progress.txt" "${IN[@]}" -t 3600 \
      -map 0:v -map 1:a "${ENC[@]}" -f segment -segment_time 60 -segment_wrap 3 -reset_timestamps 1 "$DATA_DIR/test%d.mp4" "${SNAP[@]}" 2>>"$DATA_DIR/ffmpeg.err"
    sleep 5
  fi
done
