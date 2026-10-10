#!/bin/bash
# Einrichtung Guess the Country (vierter Stream, hochkant) auf dem N95 (einmalig, als root).
# Rührt Kugelrennen (marble-*), Wortraten (words-*) und Colony (colony-*) nicht an. Ohne Schlüssel sendet nichts.
set -eux
id country >/dev/null 2>&1 || useradd -m -s /bin/bash country
usermod -aG video,render country || true
mkdir -p /var/lib/marble-country && chown country:country /var/lib/marble-country
touch /etc/marble/country.env; chown root:country /etc/marble/country.env; chmod 640 /etc/marble/country.env

# Schlüssel eintragen (Niklas in der Proxmox-Konsole): country-key
cat > /usr/local/bin/country-key <<'EOK'
#!/bin/bash
set -e
read -rsp "Stream-Schlüssel für den Guess-the-Country-Stream einfügen (bleibt unsichtbar): " K; echo
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
printf 'STREAM_KEY=%s\n' "$K" > /etc/marble/country.env
chown root:country /etc/marble/country.env; chmod 640 /etc/marble/country.env
systemctl restart country-stream
echo "Gespeichert. Der Guess-the-Country-Stream sendet in ca. 30 Sekunden (außer /var/lib/marble-country/PAUSE existiert)."
EOK
chmod 755 /usr/local/bin/country-key

cat > /etc/systemd/system/country-server.service <<'EOS'
[Unit]
Description=Guess the Country server (127.0.0.1:8092)
After=network-online.target
ConditionPathExists=/opt/marble/country/server.js
[Service]
User=country
Environment=DATA_DIR=/var/lib/marble-country PORT=8092 CHANNEL=UCG6xEYtopZcK66gz_biiIIA VIDEO_ID_FILE=/var/lib/marble-country/video_id VIDEO_ID_ONLY=1
WorkingDirectory=/opt/marble/country
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOS

cat > /etc/systemd/system/country-stream.service <<'EOS'
[Unit]
Description=Guess the Country stream (:96 hochkant + Chrome + ffmpeg)
After=country-server.service
[Service]
User=country
Environment=DATA_DIR=/var/lib/marble-country XDG_RUNTIME_DIR=/var/lib/marble-country/xdg CHROME=/usr/bin/google-chrome CHROME_EXTRA=--no-sandbox
WorkingDirectory=/opt/marble/country
ExecStart=/opt/marble/country/run-country.sh
KillMode=control-group
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOS

# Last: colony-guard.sh pausiert bei Engpass zuerst die Colony; Country zählt dort wie Kugelrennen und Wortraten als geschützt
systemctl daemon-reload
systemctl enable country-server country-stream
systemctl start country-server || true
systemctl start country-stream || true   # sendet erst, wenn country-key einen Schlüssel eingetragen hat
