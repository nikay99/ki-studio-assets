#!/bin/bash
# Länder-Kugelrennen: Bildschirm (Xvfb) + Ton (PulseAudio) + Chrome mit der Rennseite + ffmpeg.
# Latenz in YouTube Studio: „Niedrig“ (Standard), Test „Sehr niedrig“ seit 06.10. (Niklas).
# Mit STREAM_KEY → RTMP zu YouTube in Blöcken (< 12 h, damit YouTube jede Sendung archiviert und die Zeit zählt).
# Ohne STREAM_KEY → Testmodus: schreibt 60-s-Testclips nach $DATA_DIR/test0..2.mp4.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${DATA_DIR:-/var/lib/marble}"; mkdir -p "$DATA_DIR"
[ -f /etc/marble/stream.env ] && . /etc/marble/stream.env
BLOCK_S="${BLOCK_S:-41400}"          # 11,5 h pro Sendung
PAUSE_S="${PAUSE_S:-60}"            # nach planmäßigem Blockende: lange Lücke → YouTube beendet die Sendung, neue beginnt
RETRY_S="${RETRY_S:-3}"             # nach Abbruch mitten im Block: sofort neu verbinden → YouTube setzt dieselbe Sendung fort (07.10.: 22 s Lücke überbrückt)
# Blockbeginn merken: Kurze Lücken (Abbruch, Skript-Neustart) setzen dieselbe YouTube-Sendung fort, also läuft auch der Block weiter
# statt neu zu beginnen – sonst würde eine Sendung länger als 12 h und nicht archiviert. block_start.txt im Repo = Startwert.
BS_FILE="$DATA_DIR/block_start"
block_left(){
  local now bs last; now=$(date +%s); last=$(stat -c %Y "$DATA_DIR/progress.txt" 2>/dev/null || echo 0)
  bs=$(cat "$BS_FILE" 2>/dev/null || echo 0); local seed=0; [ -s "$DIR/block_start.txt" ] && seed=$(date -d "$(cat "$DIR/block_start.txt")" +%s 2>/dev/null || echo 0)
  [ "$seed" -gt "$bs" ] && bs=$seed
  if [ $((now-last)) -lt 45 ] && [ $((now-bs)) -lt $((BLOCK_S-300)) ]; then echo $((BLOCK_S-(now-bs))); else echo "$now" > "$BS_FILE"; echo "$BLOCK_S"; fi
}
VBIT="${VBIT:-3000k}"; RES="${RES:-1280x720}"; PRESET="${PRESET:-veryfast}"; FPS="${FPS:-30}"
CHROME="${CHROME:-$(command -v chromium || command -v chromium-browser || command -v google-chrome)}"
[ -n "${STREAM_KEY_V:-}" ] && VERT=1 || VERT=0          # zweiter Schlüssel = zusätzlich 9:16-Stream (720x1280)
RW=${RES%x*}; RH=${RES#*x}; [ "$VERT" = 1 ] && { SW=$((RW+720)); SH=1280; } || { SW=$RW; SH=$RH; }
export DISPLAY=:99 XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/marble-xdg}"; mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$DATA_DIR/log.txt"; }
runjson(){ printf '{"mode":"%s","block_start":"%s","note":"%s"}' "$1" "$(date -u +%FT%TZ)" "${2:-}" > "$DATA_DIR/run.json"; }

# Hardware-Kodierung nur nutzen, wenn ein Probelauf klappt
HW=none
if [ -e /dev/dri/renderD128 ] && ffmpeg -hide_banner -loglevel error -vaapi_device /dev/dri/renderD128 -f lavfi -i testsrc=size=1280x720:rate=30 -t 1 -vf format=nv12,hwupload -c:v h264_vaapi -f null - 2>/dev/null; then HW=vaapi; fi
log "Kodierung: $HW"

cleanup(){ pkill -P $$ 2>/dev/null; kill $(jobs -p) 2>/dev/null; }
trap cleanup EXIT

# Bildschirm: wenn möglich auf der Intel-Grafik (sway ohne Monitor + Xwayland als :99) – dann rechnet Chrome auf der GPU
# (halbe Renderer-Last, WebGL möglich). Klappt das nicht, wie bisher Xvfb (reiner Software-Bildschirm). GPU_DISPLAY=0 schaltet es ab.
rm -f /tmp/.X99-lock; GPU_X=0
if [ "${GPU_DISPLAY:-1}" = 1 ] && [ -e /dev/dri/renderD128 ] && command -v sway >/dev/null && command -v Xwayland >/dev/null; then
  rm -f "$XDG_RUNTIME_DIR"/wayland-*
  printf 'output HEADLESS-1 resolution %sx%s position 0 0 bg #000000 solid_color\nxwayland disable\n' "$SW" "$SH" > "$XDG_RUNTIME_DIR/sway.conf"
  WLR_BACKENDS=headless WLR_RENDERER=gles2 WLR_RENDER_DRM_DEVICE=/dev/dri/renderD128 WLR_LIBINPUT_NO_DEVICES=1 sway -c "$XDG_RUNTIME_DIR/sway.conf" >/dev/null 2>&1 &
  SWAY_PID=$!
  for i in $(seq 1 20); do WL=$(ls "$XDG_RUNTIME_DIR" 2>/dev/null | grep -E '^wayland-[0-9]+$' | head -1); [ -n "$WL" ] && break; sleep 0.5; done
  if [ -n "${WL:-}" ]; then
    WAYLAND_DISPLAY="$WL" Xwayland :99 -noreset -nolisten tcp >/dev/null 2>&1 &
    XWL_PID=$!
    for i in $(seq 1 20); do xdpyinfo -display :99 2>/dev/null | grep -q "dimensions: *${SW}x${SH} " && { GPU_X=1; break; }; sleep 0.5; done
  fi
  [ "$GPU_X" = 1 ] || { kill ${XWL_PID:-} $SWAY_PID 2>/dev/null; rm -f /tmp/.X99-lock /tmp/.X11-unix/X99; }
fi
[ "$GPU_X" = 1 ] || Xvfb :99 -screen 0 ${SW}x${SH}x24 -nolisten tcp >/dev/null 2>&1 &
log "Bildschirm: $([ "$GPU_X" = 1 ] && echo 'Intel-Grafik (sway + Xwayland)' || echo 'Xvfb (Software)')"
pulseaudio --daemonize=no --exit-idle-time=-1 --log-target=stderr >/dev/null 2>&1 &
sleep 2
pactl load-module module-null-sink sink_name=race sink_properties=device.description=race >/dev/null
pactl set-default-sink race

# Rennseite: Chrome im Kiosk-Modus (auf dem GPU-Bildschirm mit Grafikkarte, auf Xvfb in Software)
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
  HWDEV=(); [ "$HW" = vaapi ] && HWDEV=(-vaapi_device /dev/dri/renderD128)
  IN=("${HWDEV[@]}" -thread_queue_size 1024 -f x11grab -draw_mouse 0 -video_size "${SW}x${SH}" -framerate "$FPS" -i :99.0
      -thread_queue_size 1024 -f pulse -i race.monitor)
  # Gleichmäßig senden (Niklas 06.10.): feste Rate, 1-s-Puffer, Keyframe jede Sekunde, keine B-Frames → weniger Ruckler bei kurzer YouTube-Latenz
  if [ "$HW" = vaapi ]; then   # Intel Quick Sync (z. B. N95): Kodierung auf der Grafik, CPU bleibt fürs Rennen frei
    ENC=(-vf format=nv12,hwupload -c:v h264_vaapi -rc_mode CBR -b:v "$VBIT" -maxrate "$VBIT" -bufsize "$VBIT" -bf 0 -g "$FPS" -keyint_min "$FPS"
         -c:a aac -b:a 128k -ar 44100 -ac 2)
  else
    ENC=(-c:v libx264 -preset "$PRESET" -b:v "$VBIT" -maxrate "$VBIT" -bufsize "$VBIT" -bf 0 -pix_fmt yuv420p -g "$FPS" -keyint_min "$FPS" -sc_threshold 0
         -c:a aac -b:a 128k -ar 44100 -ac 2)
  fi
  snap(){ SNAP=(-map 0:v -t "$1" -vf fps=1/10,scale=640:-2 -update 1 -q:v 4 "$DATA_DIR/snap.jpg"); }
  if [ -f "$DIR/PAUSE" ]; then                       # Pause per Repo-Datei livestream/PAUSE (z. B. zum Umstellen in YouTube Studio)
    runjson pause "PAUSE-Datei im Repo"; sleep 20; continue
  fi
  if [ -n "${STREAM_KEY:-}" ] && [ "${STREAM_ENABLED:-1}" = "1" ]; then
    LEFT=$(block_left); T0=$(date +%s)
    snap "$LEFT"; runjson live; log "Sendung startet (noch ${LEFT}s im Block)"
    if [ "$VERT" = 1 ]; then
      # ein Bildschirm, zwei Ausschnitte: links 16:9, rechts 9:16 → zwei Sendungen (YouTube „In zwei Formaten streamen“)
      ffmpeg -y -hide_banner -loglevel error -nostats -progress "$DATA_DIR/progress.txt" "${IN[@]}" \
        -filter_complex "[0:v]split=3[a][b][c];[a]crop=${RW}:${RH}:0:0[h];[b]crop=720:1280:${RW}:0[v];[c]crop=${RW}:${RH}:0:0,fps=1/10,scale=640:-2[s]" \
        -map "[h]" -map 1:a -t "$LEFT" "${ENC[@]}" -f flv "rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}" \
        -map "[v]" -map 1:a -t "$LEFT" "${ENC[@]}" -f flv "rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY_V}" \
        -map "[s]" -t "$LEFT" -update 1 -q:v 4 "$DATA_DIR/snap.jpg" 2>>"$DATA_DIR/ffmpeg.err"
    else
      ffmpeg -y -hide_banner -loglevel error -nostats -progress "$DATA_DIR/progress.txt" "${IN[@]}" -t "$LEFT" \
        -map 0:v -map 1:a "${ENC[@]}" -f flv "rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}" "${SNAP[@]}" 2>>"$DATA_DIR/ffmpeg.err"
    fi
    RC=$?; if [ $(( $(date +%s)-T0 )) -lt $((LEFT-60)) ]; then log "Sendung abgebrochen (Exit $RC), sofort neu verbinden"; sleep "$RETRY_S"
    else log "Block zu Ende (Exit $RC), Pause ${PAUSE_S}s"; sleep "$PAUSE_S"; fi
  else
    snap 3600; runjson test "kein STREAM_KEY: Testclips"; log "Testmodus"
    ffmpeg -y -hide_banner -loglevel error -nostats -progress "$DATA_DIR/progress.txt" "${IN[@]}" -t 3600 \
      -map 0:v -map 1:a "${ENC[@]}" -f segment -segment_time 60 -segment_wrap 3 -reset_timestamps 1 "$DATA_DIR/test%d.mp4" "${SNAP[@]}" 2>>"$DATA_DIR/ffmpeg.err"
    sleep 5
  fi
done
