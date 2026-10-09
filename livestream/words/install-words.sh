#!/bin/bash
# Einrichtung Wortraten-Stream auf dem N95 (einmalig, als root). Rührt marble-server/marble-stream nicht an.
set -eux
id words >/dev/null 2>&1 || useradd -m -s /bin/bash words
usermod -aG video,render words || true
mkdir -p /var/lib/marble-words && chown words:words /var/lib/marble-words
touch /etc/marble/words.env; chown root:words /etc/marble/words.env; chmod 640 /etc/marble/words.env

# Schlüssel eintragen (Niklas in der Proxmox-Konsole): words-key
cat > /usr/local/bin/words-key <<'EOK'
#!/bin/bash
set -e
read -rsp "Stream-Schlüssel für den Wortraten-Stream einfügen (bleibt unsichtbar): " K; echo
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
printf 'STREAM_KEY=%s\n' "$K" > /etc/marble/words.env
chown root:words /etc/marble/words.env; chmod 640 /etc/marble/words.env
systemctl restart words-stream
echo "Gespeichert. Der Wortraten-Stream sendet in ca. 30 Sekunden."
EOK
chmod 755 /usr/local/bin/words-key

cat > /etc/systemd/system/words-server.service <<'EOS'
[Unit]
Description=Wortraten server (127.0.0.1:8090)
After=network-online.target
[Service]
User=words
Environment=DATA_DIR=/var/lib/marble-words MUSIC_DIR=/var/lib/marble/music CHANNEL=UCG6xEYtopZcK66gz_biiIIA VIDEO_ID_FILE=/var/lib/marble-words/video_id VIDEO_ID_ONLY=1
WorkingDirectory=/opt/marble/words
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS

cat > /etc/systemd/system/words-stream.service <<'EOS'
[Unit]
Description=Wortraten stream (:98 + Chrome + ffmpeg)
After=words-server.service
[Service]
User=words
Environment=DATA_DIR=/var/lib/marble-words XDG_RUNTIME_DIR=/var/lib/marble-words/xdg CHROME=/usr/bin/google-chrome CHROME_EXTRA=--no-sandbox
WorkingDirectory=/opt/marble/words
ExecStart=/opt/marble/words/run-words.sh
KillMode=control-group
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOS
systemctl daemon-reload
systemctl enable --now words-server words-stream
