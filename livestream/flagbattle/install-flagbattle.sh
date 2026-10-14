#!/bin/bash
# Einrichtung Flag Battle (ersetzt Capital in der Rotation; hochkant) auf dem N95 (einmalig, als root).
# Rührt marble-*, words-*, country-* und colony-* nicht an. Ohne Schlüssel sendet nichts.
set -eux
id flagbattle >/dev/null 2>&1 || useradd -m -s /bin/bash flagbattle
usermod -aG video,render flagbattle || true
mkdir -p /var/lib/marble-flagbattle && chown flagbattle:flagbattle /var/lib/marble-flagbattle
touch /etc/marble/flagbattle.env; chown root:flagbattle /etc/marble/flagbattle.env; chmod 640 /etc/marble/flagbattle.env
# Flag Battle ersetzt Capital und nutzt denselben Stream-Eingang: Schlüssel von Capital übernehmen (wird nicht ausgegeben)
if [ ! -s /etc/marble/flagbattle.env ] && grep -q '^STREAM_KEY=' /etc/marble/capital.env 2>/dev/null; then grep '^STREAM_KEY=' /etc/marble/capital.env > /etc/marble/flagbattle.env; fi
# bis die Rotation Flag Battle freigibt, sendet nichts
[ -e /var/lib/marble-flagbattle/PAUSE ] || { echo 'Einrichtung: wartet auf Rotation' > /var/lib/marble-flagbattle/PAUSE; touch /var/lib/marble-flagbattle/PAUSE.rot; chown flagbattle:flagbattle /var/lib/marble-flagbattle/PAUSE /var/lib/marble-flagbattle/PAUSE.rot; }

# Zugang des Waechters zur Live-API (n8n): wie Capital, Inhalt wird nicht ausgegeben (fehlte am 14.10. -> 16:01-17:23Z keine Sendung)
[ -s /etc/marble/broadcast-flagbattle.env ] || { cp /etc/marble/broadcast-capital.env /etc/marble/broadcast-flagbattle.env; chown root:flagbattle /etc/marble/broadcast-flagbattle.env; chmod 640 /etc/marble/broadcast-flagbattle.env; }

# Schlüssel eintragen (Niklas in der Proxmox-Konsole): flagbattle-key
cat > /usr/local/bin/flagbattle-key <<'EOK'
#!/bin/bash
set -e
read -rsp "Stream-Schlüssel für den Flag-Battle-Stream einfügen (bleibt unsichtbar): " K; echo
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
printf 'STREAM_KEY=%s\n' "$K" > /etc/marble/flagbattle.env
chown root:flagbattle /etc/marble/flagbattle.env; chmod 640 /etc/marble/flagbattle.env
systemctl restart flagbattle-stream
echo "Gespeichert. Der Flag-Battle-Stream sendet in ca. 30 Sekunden (außer /var/lib/marble-flagbattle/PAUSE existiert)."
EOK
chmod 755 /usr/local/bin/flagbattle-key

cat > /etc/systemd/system/flagbattle-server.service <<'EOS'
[Unit]
Description=Flag Battle server (127.0.0.1:8094)
After=network-online.target
ConditionPathExists=/opt/marble/flagbattle/server.js
[Service]
User=flagbattle
Environment=DATA_DIR=/var/lib/marble-flagbattle PORT=8094 CHANNEL=UCG6xEYtopZcK66gz_biiIIA VIDEO_ID_FILE=/var/lib/marble-flagbattle/video_id VIDEO_ID_ONLY=1
WorkingDirectory=/opt/marble/flagbattle
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS

cat > /etc/systemd/system/flagbattle-stream.service <<'EOS'
[Unit]
Description=Flag Battle stream (:94 hochkant + Chrome + ffmpeg)
After=flagbattle-server.service
[Service]
User=flagbattle
Environment=DATA_DIR=/var/lib/marble-flagbattle XDG_RUNTIME_DIR=/var/lib/marble-flagbattle/xdg CHROME=/usr/bin/google-chrome CHROME_EXTRA=--no-sandbox
WorkingDirectory=/opt/marble/flagbattle
ExecStart=/opt/marble/flagbattle/run-flagbattle.sh
KillMode=control-group
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOS

# Last: colony-guard.sh pausiert bei Engpass zuerst Colony, dann das Kugelrennen, Flag Battle wie bisher Capital nur als letzte Notbremse (Niklas 10.10. 12:22Z)
systemctl daemon-reload
systemctl enable flagbattle-server flagbattle-stream
systemctl start flagbattle-server || true
systemctl start flagbattle-stream || true   # sendet erst, wenn flagbattle-key einen Schlüssel eingetragen hat
