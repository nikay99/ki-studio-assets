#!/bin/bash
# Guess-the-Country-Stream (vierter Livestream, Niklas 10.10. „Ja, einrichten“): hochkant 720×1280, eigener Bildschirm :96 (GPU, sonst Xvfb),
# eigener Ton (PulseAudio des Benutzers „country“), Chrome mit http://127.0.0.1:8092 und ffmpeg zu YouTube.
# Spielseite und Server (country/server.js, Port 8092) baut der Guess-the-Country-Thread; dieses Skript ist nur die Sende-Technik (Kugelrennen-Thread).
# Aus: Datei $DATA_DIR/PAUSE.
set -u
DATA_DIR="${DATA_DIR:-/var/lib/marble-country}"; mkdir -p "$DATA_DIR"
[ -f /etc/marble/country.env ] && . /etc/marble/country.env
# 24 fps wie die anderen Streams; Bildschirm läuft mit derselben Rate, FPS/VBIT in country.env überschreibbar
VBIT="${VBIT:-4500k}"; FPS="${FPS:-30}"; RW="${RW:-1080}"; RH="${RH:-1920}"   # 30 fps seit 10.10. 13:40Z (Niklas, Kugelrennen aus), 11:45–13:39Z 15   # 1080x1920 mit 4,5 Mbit/s seit 11.10. (Niklas „alle auf 1080p“; Capital-Test 08:39Z: CPU 41-46 %)
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium)}"
export DISPLAY=:96 XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$DATA_DIR/xdg}"; mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$DATA_DIR/log.txt"; }
cleanup(){ pkill -P $$ 2>/dev/null; kill $(jobs -p) 2>/dev/null; }
trap cleanup EXIT

HW=none
if [ -e /dev/dri/renderD128 ] && ffmpeg -hide_banner -loglevel error -vaapi_device /dev/dri/renderD128 -f lavfi -i testsrc=size=${RW}x${RH}:rate=30 -t 1 -vf format=nv12,hwupload -c:v h264_vaapi -f null - 2>/dev/null; then HW=vaapi; fi
log "Kodierung: $HW"
# Bildschirm wie beim Kugelrennen: wenn möglich auf der Intel-Grafik (sway ohne Monitor + Xwayland als :96), dann rechnet
# Chrome auf der GPU statt ~1,5 Kerne in Software. Klappt das nicht, Xvfb. GPU_DISPLAY=0 schaltet es ab.
rm -f /tmp/.X96-lock; GPU_X=0
if [ "${GPU_DISPLAY:-1}" = 1 ] && [ -e /dev/dri/renderD128 ] && command -v sway >/dev/null && command -v Xwayland >/dev/null; then
  # Bildschirm-Takt = FPS (Chrome zeichnet dann nicht mehr als gesendet wird); klappt der eigene Takt nicht, Standard-Modus
  for MODE in "--custom ${RW}x${RH}@${FPS}Hz" "${RW}x${RH}"; do
    rm -f "$XDG_RUNTIME_DIR"/wayland-*
    printf 'output HEADLESS-1 resolution %s position 0 0 bg #000000 solid_color\nxwayland disable\n' "$MODE" > "$XDG_RUNTIME_DIR/sway.conf"
    WLR_BACKENDS=headless WLR_RENDERER=gles2 WLR_RENDER_DRM_DEVICE=/dev/dri/renderD128 WLR_LIBINPUT_NO_DEVICES=1 sway -c "$XDG_RUNTIME_DIR/sway.conf" >/dev/null 2>&1 &
    SWAY_PID=$!
    for i in $(seq 1 20); do WL=$(ls "$XDG_RUNTIME_DIR" 2>/dev/null | grep -E '^wayland-[0-9]+$' | head -1); [ -n "$WL" ] && break; sleep 0.5; done
    if [ -n "${WL:-}" ]; then
      WAYLAND_DISPLAY="$WL" Xwayland :96 -noreset -nolisten tcp >/dev/null 2>&1 &
      XWL_PID=$!
      for i in $(seq 1 20); do xdpyinfo -display :96 2>/dev/null | grep -q "dimensions: *${RW}x${RH} " && { GPU_X=1; break; }; sleep 0.5; done
    fi
    [ "$GPU_X" = 1 ] && break
    kill ${XWL_PID:-} $SWAY_PID 2>/dev/null; sleep 1; rm -f /tmp/.X96-lock /tmp/.X11-unix/X96 "$XDG_RUNTIME_DIR"/wayland-*; unset WL
  done
  log "Bildschirm-Modus: $MODE"
  [ "$GPU_X" = 1 ] || { kill ${XWL_PID:-} $SWAY_PID 2>/dev/null; rm -f /tmp/.X96-lock /tmp/.X11-unix/X96; }
fi
[ "$GPU_X" = 1 ] || Xvfb :96 -screen 0 ${RW}x${RH}x24 -nolisten tcp >/dev/null 2>&1 &
log "Bildschirm: $([ "$GPU_X" = 1 ] && echo 'Intel-Grafik (sway + Xwayland)' || echo 'Xvfb (Software)')"
pulseaudio --daemonize=no --exit-idle-time=-1 --log-target=stderr >/dev/null 2>&1 &
sleep 2
pactl load-module module-null-sink sink_name=country sink_properties=device.description=country >/dev/null
pactl set-default-sink country

start_chrome(){
  "$CHROME" --no-first-run --no-default-browser-check --disable-infobars --kiosk --window-position=0,0 --window-size=${RW},${RH} \
    --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows --disable-features=Translate,MediaRouter --password-store=basic \
    --user-data-dir="$DATA_DIR/chrome" ${CHROME_EXTRA:-} "http://127.0.0.1:8092/?fps=${FPS}" >/dev/null 2>&1 &
  CHROME_PID=$!
}
for i in $(seq 1 60); do curl -fs -o /dev/null http://127.0.0.1:8092/api/state && break; sleep 2; done
start_chrome; sleep 8
# Standbild-Wächter (15.10., Flag Circle stand nachts eingefroren): alle 20 s ein kleines Bild vom Bildschirm; ist es 4× hintereinander
# exakt gleich (~80 s Standbild), hängt die Seite. Zusätzlich Ton: 3× hintereinander (~60 s) stumm (Spitze < -60 dB) → ebenfalls Chrome neu
# (15.10.: nach Neuladen der Seite kam bei Flag Circle zweimal kein Ton mehr), → Chrome beenden, die Schleife unten startet ihn neu. Nicht bei pausierter Rotation.
# 15.10. 06:02–08:42Z Schwarzbild: Chrome wurde beendet, die Schleife unten startet ihn aber erst neu, wenn ffmpeg endet; ffmpeg sendete
# das leere Display weiter. Darum beendet der Wächter jetzt immer Chrome UND den Encoder (neu_starten), dann startet die Schleife beides
# frisch. Zusätzlich: fehlt Chrome ganz oder ist das Bild einfarbig (schwarz/leer, Helligkeits-Spanne < 8), zählt das sofort als Fehler.
neu_starten(){ log "$1: Chrome und Sendung werden neu gestartet"; pkill -f -- "--user-data-dir=$DATA_DIR/chrome"; kill "$(cat "$DATA_DIR/ffmpeg.pid" 2>/dev/null)" 2>/dev/null; }
freeze_guard(){ local last="" same=0 h a quiet=0 leer=0 weg=0 f="$DATA_DIR/guard.gray" sp
  while sleep 20; do
    if [ -f "$DATA_DIR/PAUSE.rot" ] || [ -f "$DATA_DIR/PAUSE" ]; then same=0; last=""; leer=0; weg=0; continue; fi
    if ! pgrep -f -- "--user-data-dir=$DATA_DIR/chrome" >/dev/null; then weg=$((weg+1)); else weg=0; fi
    if [ "$weg" -ge 2 ]; then neu_starten "Kein Chrome seit ~40 s"; weg=0; same=0; last=""; leer=0; sleep 40; continue; fi
    rm -f "$f"; timeout 10 ffmpeg -hide_banner -loglevel error -f x11grab -draw_mouse 0 -video_size "${RW}x${RH}" -i "$DISPLAY.0" -frames:v 1 -vf scale=108:192,format=gray -f rawvideo "$f" 2>/dev/null
    h=""; sp=""
    if [ -s "$f" ]; then h=$(md5sum < "$f" | cut -c1-32); sp=$(od -An -v -tu1 "$f" | awk '{for(i=1;i<=NF;i++){v=$i+0; if(n==0||v<mn)mn=v; if(v>mx)mx=v; n++}} END{print mx-mn}'); fi
    if [ -n "$sp" ] && [ "$sp" -lt 8 ]; then leer=$((leer+1)); else leer=0; fi
    if [ "$leer" -ge 2 ]; then neu_starten "Leeres/schwarzes Bild seit ~40 s"; leer=0; same=0; last=""; sleep 40; continue; fi
    a=$(timeout 8 ffmpeg -hide_banner -f pulse -i "$(pactl get-default-sink 2>/dev/null).monitor" -t 3 -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-*[0-9.]*\) dB/\1/p')
    if [ -n "$a" ] && awk "BEGIN{exit !($a < -60)}"; then quiet=$((quiet+1)); else quiet=0; fi
    if [ "$quiet" -ge 3 ]; then neu_starten "Kein Ton seit ~60 s"; quiet=0; same=0; last=""; sleep 40; continue; fi
    [ -z "$h" ] && continue
    if [ "$h" = "$last" ]; then same=$((same+1)); else same=0; last="$h"; fi
    if [ "$same" -ge 3 ]; then neu_starten "Standbild seit ~80 s"; same=0; last=""; sleep 40; fi
  done; }
freeze_guard &

while true; do
  [ -f /etc/marble/country.env ] && . /etc/marble/country.env
  # Rotation: Spiel nicht dran -> Browser aus (pausierte Browser kosteten 14.10. so viel CPU, dass der laufende Stream ruckelte); ist es dran, startet er hier neu
  if [ -f "$DATA_DIR/PAUSE.rot" ]; then pkill -f -- "--user-data-dir=$DATA_DIR/chrome"; sleep 20; continue; fi
  pgrep -f -- "--user-data-dir=$DATA_DIR/chrome" >/dev/null || { log "Chrome neu gestartet"; start_chrome; sleep 8; }
  if [ -f "$DATA_DIR/PAUSE" ] || [ -z "${STREAM_KEY:-}" ]; then sleep 20; continue; fi
  HWDEV=(); [ "$HW" = vaapi ] && [ "${COUNTRY_VAAPI:-1}" = 1 ] && HWDEV=(-vaapi_device /dev/dri/renderD128)
  IN=("${HWDEV[@]}" -thread_queue_size 1024 -f x11grab -draw_mouse 0 -video_size "${RW}x${RH}" -framerate "$FPS" -i :96.0
      -thread_queue_size 1024 -f pulse -i country.monitor)
  # Standard h264_vaapi (gemessen 2,5–2,7 Mbit/s; die 400-kbit/s-Warnung kam nur kurz nach dem Neuverbinden).
  # COUNTRY_VAAPI=0 = libx264 mit echter CBR (nal-hrd), falls die Rate bei stillem Bild doch einbricht.
  if [ "$HW" = vaapi ] && [ "${COUNTRY_VAAPI:-1}" = 1 ]; then
    ENC=(-vf format=nv12,hwupload -c:v h264_vaapi -rc_mode CBR -b:v "$VBIT" -maxrate "$VBIT" -bufsize "$VBIT" -bf 0 -g "$FPS" -keyint_min "$FPS")
  else
    ENC=(-c:v libx264 -preset veryfast -tune zerolatency -x264-params nal-hrd=cbr:force-cfr=1 -b:v "$VBIT" -minrate "$VBIT" -maxrate "$VBIT" -bufsize "$VBIT" -bf 0 -pix_fmt yuv420p -g "$FPS" -keyint_min "$FPS" -sc_threshold 0)
  fi
  log "Sendung startet"
  ffmpeg -y -hide_banner -loglevel error -nostats -progress "$DATA_DIR/progress.txt" "${IN[@]}" \
    -map 0:v -map 1:a "${ENC[@]}" -c:a aac -b:a 128k -ar 44100 -ac 2 -f flv "rtmp://a.rtmp.youtube.com/live2/${STREAM_KEY}" 2>>"$DATA_DIR/ffmpeg.err" &
  FF=$!; echo $FF > "$DATA_DIR/ffmpeg.pid"; wait $FF
  log "ffmpeg beendet (Exit $?), neu verbinden in 3 s"; sleep 3
done
