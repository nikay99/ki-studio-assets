#!/bin/bash
# Einrichtung Chat-Colony-Test (dritter Stream, hochkant) auf dem N95 (einmalig, als root).
# Rührt Kugelrennen (marble-*) und Wortraten (words-*) nicht an. Ohne Schlüssel sendet nichts.
set -eux
id colony >/dev/null 2>&1 || useradd -m -s /bin/bash colony
usermod -aG video,render colony || true
mkdir -p /var/lib/marble-colony && chown colony:colony /var/lib/marble-colony
touch /etc/marble/colony.env; chown root:colony /etc/marble/colony.env; chmod 640 /etc/marble/colony.env

# Schlüssel eintragen (Niklas in der Proxmox-Konsole): colony-key
cat > /usr/local/bin/colony-key <<'EOK'
#!/bin/bash
set -e
read -rsp "Stream-Schlüssel für den Chat-Colony-Stream einfügen (bleibt unsichtbar): " K; echo
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
printf 'STREAM_KEY=%s\n' "$K" > /etc/marble/colony.env
chown root:colony /etc/marble/colony.env; chmod 640 /etc/marble/colony.env
systemctl restart colony-stream
echo "Gespeichert. Der Chat-Colony-Stream sendet in ca. 30 Sekunden (außer /var/lib/marble-colony/PAUSE existiert)."
EOK
chmod 755 /usr/local/bin/colony-key

cat > /etc/systemd/system/colony-server.service <<'EOS'
[Unit]
Description=Chat Colony server (127.0.0.1:8091)
After=network-online.target
ConditionPathExists=/opt/marble/colony/server.js
[Service]
User=colony
Environment=DATA_DIR=/var/lib/marble-colony PORT=8091 CHANNEL=UCG6xEYtopZcK66gz_biiIIA VIDEO_ID_FILE=/var/lib/marble-colony/video_id VIDEO_ID_ONLY=1
WorkingDirectory=/opt/marble/colony
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS

cat > /etc/systemd/system/colony-stream.service <<'EOS'
[Unit]
Description=Chat Colony stream (:97 hochkant + Chrome + ffmpeg)
After=colony-server.service
[Service]
User=colony
Environment=DATA_DIR=/var/lib/marble-colony XDG_RUNTIME_DIR=/var/lib/marble-colony/xdg CHROME=/usr/bin/google-chrome CHROME_EXTRA=--no-sandbox
WorkingDirectory=/opt/marble/colony
ExecStart=/opt/marble/colony/run-colony.sh
KillMode=control-group
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOS

# Lastwächter: jede Minute, pausiert die Colony, wenn Kugelrennen/Wortraten leiden
echo '* * * * * root /opt/marble/colony/colony-guard.sh' > /etc/cron.d/colony-guard
systemctl daemon-reload
systemctl enable colony-server colony-stream
systemctl start colony-server || true
