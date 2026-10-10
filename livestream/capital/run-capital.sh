#!/bin/bash
# Guess-the-Capital-Stream (vierter Stream neben Kugelrennen, Wortraten, Country; Niklas 10.10. „4 Streams gleichzeitig probieren“): hochkant 720×1280, eigener Bildschirm :95 (GPU, sonst Xvfb),
# eigener Ton (PulseAudio des Benutzers „capital“), Chrome mit http://127.0.0.1:8093 und ffmpeg zu YouTube.
# Spielseite und Server (capital/server.js, Port 8093) baut der Guess-the-Capital-Thread; dieses Skript ist nur die Sende-Technik (Stream-Technik-Thread).
# Aus: Datei $DATA_DIR/PAUSE.
set -u
DATA_DIR="${DATA_DIR:-/var/lib/marble-capital}"; mkdir -p "$DATA_DIR"
[ -f /etc/marble/capital.env ] && . /etc/marble/capital.env
# 24 fps wie die anderen Streams; Bildschirm läuft mit derselben Rate, FPS/VBIT in capital.env überschreibbar
VBIT="${VBIT:-2500k}"; FPS="${FPS:-24}"; RW=720; RH=1280
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium)}"
export DISPLAY=:95 XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$DATA_DIR/xdg}"; mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"
log(){ echo "$(date -u +%FT%TZ) $*" | tee -a "$DATA_DIR/log.txt"; }
cleanup(){ pkill -P $$ 2>/dev/null; kill $(jobs -p) 2>/dev/null; }
trap cleanup EXIT

HW=none
if [ -e /dev/dri/renderD128 ] && ffmpeg -hide_banner -loglevel error -vaapi_device /dev/dri/renderD128 -f lavfi -i testsrc=size=720x1280:rate=30 -t 1 -vf format=nv12,hwupload -c:v h264_vaapi -f null - 2>/dev/null; then HW=vaapi; fi
log "Kodierung: $HW"
# Bildschirm wie beim Kugelrennen: wenn möglich auf der Intel-Grafik (sway ohne Monitor + Xwayland als :95), dann rechnet
# Chrome auf der GPU statt ~1,5 Kerne in Software. Klappt das nicht, Xvfb. GPU_DISPLAY=0 schaltet es ab.
rm -f /tmp/.X95-lock; GPU_X=0
if [ "${GPU_DISPLAY:-1}" = 1 ] && [ -e /dev/dri/renderD128 ] && command -v sway >/dev/null && command -v Xwayland >/dev/null; then
  # Bildschirm-Takt = FPS (Chrome zeichnet dann nicht mehr als gesendet wird); klappt der eigene Takt nicht, Standard-Modus
  for MODE in "--custom ${RW}x${RH}@${FPS}Hz" "${RW}x${RH}"; do
    rm -f "$XDG_RUNTIME_DIR"/wayland-*
    printf 'output HEADLESS-1 resolution %s position 0 0 bg #000000 solid_color\nxwayland disable\n' "$MODE" > "$XDG_RUNTIME_DIR/sway.conf"
    WLR_BACKENDS=headless WLR_RENDERER=gles2 WLR_RENDER_DRM_DEVICE=/dev/dri/renderD128 WLR_LIBINPUT_NO_DEVICES=1 sway -c "$XDG_RUNTIME_DIR/sway.conf" >/dev/null 2>&1 &
    SWAY_PID=$!
    for i in $(seq 1 20); do WL=$(ls "$XDG_RUNTIME_DIR" 2>/dev/null | grep -E '^wayland-[0-9]+$' | head -1); [ -n "$WL" ] && break; sleep 0.5; done
    if [ -n "${WL:-}" ]; then
      WAYLAND_DISPLAY="$WL" Xwayland :95 -noreset -nolisten tcp >/dev/null 2>&1 &
      XWL_PID=$!
      for i in $(seq 1 20); do xdpyinfo -display :95 2>/dev/null | grep -q "dimensions: *${RW}x${RH} " && { GPU_X=1; break; }; sleep 0.5; done
    fi
    [ "$GPU_X" = 1 ] && break
    kill ${XWL_PID:-} $SWAY_PID 2>/dev/null; sleep 1; rm -f /tmp/.X95-lock /tmp/.X11-unix/X95 "$XDG_RUNTIME_DIR"/wayland-*; unset WL
  done
  log "Bildschirm-Modus: $MODE"
  [ "$GPU_X" = 1 ] || { kill ${XWL_PID:-} $SWAY_PID 2>/dev/null; rm -f /tmp/.X95-lock /tmp/.X11-unix/X95; }
fi
[ "$GPU_X" = 1 ] || Xvfb :95 -screen 0 ${RW}x${RH}x24 -nolisten tcp >/dev/null 2>&1 &
log "Bildschirm: $([ "$GPU_X" = 1 ] && echo 'Intel-Grafik (sway + Xwayland)' || echo 'Xvfb (Software)')"
pulseaudio --daemonize=no --exit-idle-time=-1 --log-target=stderr >/dev/null 2>&1 &
sleep 2
pactl load-module module-null-sink sink_name=capital sink_properties=device.description=capital >/dev/null
pactl set-default-sink capital

start_chrome(){
  "$CHROME" --no-first-run --no-default-browser-check --disable-infobars --kiosk --window-position=0,0 --window-size=${RW},${RH} \
    --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows --disable-features=Translate,MediaRouter --password-store=basic \
    --user-data-dir="$DATA_DIR/chrome" ${CHROME_EXTRA:-} "http://127.0.0.1:8093/?fps=${FPS}" >/dev/null 2>&1 &
  CHROME_PID=$!
}
for i in $(seq 1 60); do curl -fs -o /dev/null http://127.0.0.1:8093/api/state && break; sleep 2; done
start_chrome; sleep 8

while true; do
  [ -f /etc/marble/capital.env ] && . /etc/marble/capital.env
  kill -0 $CHROME_PID 2>/dev/null || { log "Chrome neu gestartet"; start_chrome; sleep 8; }
  if [ -f "$DATA_DIR/PAUSE" ] || [ -z "${STREAM_KEY:-}" ]; then sleep 20; continue; fi
  HWDEV=(); [ "$HW" = vaapi ] && [ "${CAPITAL_VAAPI:-1}" = 1 ] && HWDEV=(-vaapi_device /dev/dri/renderD128)
  IN=("${HWDEV[@]}" -thread_queue_size 1024 -f x11grab -draw_mouse 0 -video_size "${RW}x${RH}" -framerate "$FPS" -i :95.0
      -thread_queue_size 1024 -f pulse -i capital.monitor)
  # Standard h264_vaapi (gemessen 2,5–2,7 Mbit/s; die 400-kbit/s-Warnung kam nur kurz nach dem Neuverbinden).
  # CAPITAL_VAAPI=0 = libx264 mit echter CBR (nal-hrd), falls die Rate bei stillem Bild doch einbricht.
  if [ "$HW" = vaapi ] && [ "${CAPITAL_VAAPI:-1}" = 1 ]; then
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
