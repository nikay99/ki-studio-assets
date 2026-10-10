#!/bin/bash
# Einrichtung Guess the Capital (Stream-Platz 4 neben Kugelrennen, Wortraten, Country; hochkant) auf dem N95 (einmalig, als root).
# Rührt marble-*, words-*, country-* und colony-* nicht an. Ohne Schlüssel sendet nichts.
set -eux
id capital >/dev/null 2>&1 || useradd -m -s /bin/bash capital
usermod -aG video,render capital || true
mkdir -p /var/lib/marble-capital && chown capital:capital /var/lib/marble-capital
touch /etc/marble/capital.env; chown root:capital /etc/marble/capital.env; chmod 640 /etc/marble/capital.env

# Schlüssel eintragen (Niklas in der Proxmox-Konsole): capital-key
cat > /usr/local/bin/capital-key <<'EOK'
#!/bin/bash
set -e
read -rsp "Stream-Schlüssel für den Guess-the-Capital-Stream einfügen (bleibt unsichtbar): " K; echo
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
printf 'STREAM_KEY=%s\n' "$K" > /etc/marble/capital.env
chown root:capital /etc/marble/capital.env; chmod 640 /etc/marble/capital.env
systemctl restart capital-stream
echo "Gespeichert. Der Guess-the-Capital-Stream sendet in ca. 30 Sekunden (außer /var/lib/marble-capital/PAUSE existiert)."
EOK
chmod 755 /usr/local/bin/capital-key

cat > /etc/systemd/system/capital-server.service <<'EOS'
[Unit]
Description=Guess the Capital server (127.0.0.1:8093)
After=network-online.target
ConditionPathExists=/opt/marble/capital/server.js
[Service]
User=capital
Environment=DATA_DIR=/var/lib/marble-capital PORT=8093 CHANNEL=UCG6xEYtopZcK66gz_biiIIA VIDEO_ID_FILE=/var/lib/marble-capital/video_id VIDEO_ID_ONLY=1
WorkingDirectory=/opt/marble/capital
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS

cat > /etc/systemd/system/capital-stream.service <<'EOS'
[Unit]
Description=Guess the Capital stream (:95 hochkant + Chrome + ffmpeg)
After=capital-server.service
[Service]
User=capital
Environment=DATA_DIR=/var/lib/marble-capital XDG_RUNTIME_DIR=/var/lib/marble-capital/xdg CHROME=/usr/bin/google-chrome CHROME_EXTRA=--no-sandbox
WorkingDirectory=/opt/marble/capital
ExecStart=/opt/marble/capital/run-capital.sh
KillMode=control-group
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOS

# Last: colony-guard.sh pausiert bei Engpass zuerst Colony, dann das Kugelrennen, Capital nur als letzte Notbremse (Niklas 10.10. 12:22Z)
systemctl daemon-reload
systemctl enable capital-server capital-stream
systemctl start capital-server || true
systemctl start capital-stream || true   # sendet erst, wenn capital-key einen Schlüssel eingetragen hat
