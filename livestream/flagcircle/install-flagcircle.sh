#!/bin/bash
# Einrichtung Flag Circle (ersetzt Capital in der Rotation; hochkant) auf dem N95 (einmalig, als root).
# Rührt marble-*, words-*, country-* und colony-* nicht an. Ohne Schlüssel sendet nichts.
set -eux
id flagcircle >/dev/null 2>&1 || useradd -m -s /bin/bash flagcircle
usermod -aG video,render flagcircle || true
mkdir -p /var/lib/marble-flagcircle && chown flagcircle:flagcircle /var/lib/marble-flagcircle
touch /etc/marble/flagcircle.env; chown root:flagcircle /etc/marble/flagcircle.env; chmod 640 /etc/marble/flagcircle.env
# Flag Circle ersetzt Capital und nutzt denselben Stream-Eingang: Schlüssel von Capital übernehmen (wird nicht ausgegeben)
if [ ! -s /etc/marble/flagcircle.env ] && grep -q '^STREAM_KEY=' /etc/marble/capital.env 2>/dev/null; then grep '^STREAM_KEY=' /etc/marble/capital.env > /etc/marble/flagcircle.env; fi
# bis die Rotation Flag Circle freigibt, sendet nichts
[ -e /var/lib/marble-flagcircle/PAUSE ] || { echo 'Einrichtung: wartet auf Rotation' > /var/lib/marble-flagcircle/PAUSE; touch /var/lib/marble-flagcircle/PAUSE.rot; chown flagcircle:flagcircle /var/lib/marble-flagcircle/PAUSE /var/lib/marble-flagcircle/PAUSE.rot; }

# Zugang des Waechters zur Live-API (n8n): wie Capital, Inhalt wird nicht ausgegeben (fehlte am 14.10. -> 16:01-17:23Z keine Sendung)
[ -s /etc/marble/broadcast-flagcircle.env ] || { cp /etc/marble/broadcast-capital.env /etc/marble/broadcast-flagcircle.env; chown root:flagcircle /etc/marble/broadcast-flagcircle.env; chmod 640 /etc/marble/broadcast-flagcircle.env; }

# Schlüssel eintragen (Niklas in der Proxmox-Konsole): flagcircle-key
cat > /usr/local/bin/flagcircle-key <<'EOK'
#!/bin/bash
set -e
read -rsp "Stream-Schlüssel für den Flag-Circle-Stream einfügen (bleibt unsichtbar): " K; echo
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
printf 'STREAM_KEY=%s\n' "$K" > /etc/marble/flagcircle.env
chown root:flagcircle /etc/marble/flagcircle.env; chmod 640 /etc/marble/flagcircle.env
systemctl restart flagcircle-stream
echo "Gespeichert. Der Flag-Circle-Stream sendet in ca. 30 Sekunden (außer /var/lib/marble-flagcircle/PAUSE existiert)."
EOK
chmod 755 /usr/local/bin/flagcircle-key

cat > /etc/systemd/system/flagcircle-server.service <<'EOS'
[Unit]
Description=Flag Circle server (127.0.0.1:8095)
After=network-online.target
ConditionPathExists=/opt/marble/flagcircle/server.js
[Service]
User=flagcircle
Environment=DATA_DIR=/var/lib/marble-flagcircle PORT=8095 CHANNEL=UCG6xEYtopZcK66gz_biiIIA VIDEO_ID_FILE=/var/lib/marble-flagcircle/video_id VIDEO_ID_ONLY=1
WorkingDirectory=/opt/marble/flagcircle
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS

cat > /etc/systemd/system/flagcircle-stream.service <<'EOS'
[Unit]
Description=Flag Circle stream (:93 hochkant + Chrome + ffmpeg)
After=flagcircle-server.service
[Service]
User=flagcircle
Environment=DATA_DIR=/var/lib/marble-flagcircle XDG_RUNTIME_DIR=/var/lib/marble-flagcircle/xdg CHROME=/usr/bin/google-chrome CHROME_EXTRA=--no-sandbox
WorkingDirectory=/opt/marble/flagcircle
ExecStart=/opt/marble/flagcircle/run-flagcircle.sh
KillMode=control-group
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOS

# Last: colony-guard.sh pausiert bei Engpass zuerst Colony, dann das Kugelrennen, Flag Circle wie bisher Capital nur als letzte Notbremse (Niklas 10.10. 12:22Z)
systemctl daemon-reload
systemctl enable flagcircle-server flagcircle-stream
systemctl start flagcircle-server || true
systemctl start flagcircle-stream || true   # sendet erst, wenn flagcircle-key einen Schlüssel eingetragen hat
