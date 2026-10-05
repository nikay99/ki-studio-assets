#!/bin/bash
# Startskript für den DigitalOcean-Server (Ubuntu 24.04). Platzhalter __STATUS_TOKEN__ setzt der Anleger.
set -eux
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends xvfb pulseaudio pulseaudio-utils ffmpeg git curl ca-certificates \
  fonts-noto-color-emoji fonts-dejavu-core unattended-upgrades
# Chrome (offizielles .deb, kein Snap)
curl -fsSL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get install -y /tmp/chrome.deb
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

useradd -m -s /bin/bash marble || true
mkdir -p /etc/marble /var/lib/marble/music
chown -R marble:marble /var/lib/marble
touch /etc/marble/stream.env; chown root:marble /etc/marble/stream.env; chmod 640 /etc/marble/stream.env
echo "STATUS_TOKEN=__STATUS_TOKEN__" > /etc/marble/server.env

git clone --depth 1 https://github.com/nikay99/ki-studio-assets /opt/marble-repo
ln -sfn /opt/marble-repo/livestream /opt/marble
cd /opt/marble && npm ci --omit=dev || npm install --omit=dev
chown -R marble:marble /opt/marble-repo

# Schlüssel eintragen (Niklas, über die Droplet-Konsole): marble-key
cat > /usr/local/bin/marble-key <<'EOF'
#!/bin/bash
set -e
read -rsp "YouTube-Stream-Schlüssel einfügen (Eingabe bleibt unsichtbar): " K; echo
read -rp "Kanal (z. B. @deinkanal oder UC…-ID): " C
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
printf 'STREAM_KEY=%s\nCHANNEL=%s\n' "$K" "$C" > /etc/marble/stream.env
chown root:marble /etc/marble/stream.env; chmod 640 /etc/marble/stream.env
systemctl restart marble-server marble-stream
echo "Gespeichert. Stream startet in ca. 30 Sekunden."
EOF
chmod 755 /usr/local/bin/marble-key

cat > /etc/systemd/system/marble-server.service <<'EOF'
[Unit]
Description=Marble race server
After=network-online.target
[Service]
User=marble
EnvironmentFile=/etc/marble/server.env
EnvironmentFile=-/etc/marble/stream.env
Environment=DATA_DIR=/var/lib/marble
AmbientCapabilities=CAP_NET_BIND_SERVICE
WorkingDirectory=/opt/marble
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/marble-stream.service <<'EOF'
[Unit]
Description=Marble race stream (Xvfb + Chrome + ffmpeg)
After=marble-server.service
[Service]
User=marble
Environment=DATA_DIR=/var/lib/marble XDG_RUNTIME_DIR=/var/lib/marble/xdg CHROME=/usr/bin/google-chrome CHROME_EXTRA=--no-sandbox
WorkingDirectory=/opt/marble
ExecStart=/opt/marble/run.sh
KillMode=control-group
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF

# Selbst-Update: alle 3 Minuten Repo prüfen; bei Änderung im livestream-Ordner neu starten.
cat > /usr/local/bin/marble-update <<'EOF'
#!/bin/bash
cd /opt/marble-repo || exit 0
OLD=$(git rev-parse HEAD:livestream 2>/dev/null)
sudo -u marble git fetch -q --depth 1 origin main && sudo -u marble git reset -q --hard origin/main
NEW=$(git rev-parse HEAD:livestream 2>/dev/null)
[ "$OLD" = "$NEW" ] && exit 0
cd /opt/marble && sudo -u marble npm install --omit=dev -q
bash /opt/marble/sync-music.sh || true
systemctl restart marble-server marble-stream
EOF
chmod 755 /usr/local/bin/marble-update
echo '*/3 * * * * root /usr/local/bin/marble-update >> /var/lib/marble/update.log 2>&1' > /etc/cron.d/marble-update
git config --system --add safe.directory /opt/marble-repo

bash /opt/marble/sync-music.sh || true
systemctl daemon-reload
systemctl enable --now marble-server marble-stream
echo "marble setup done" > /var/lib/marble/setup.done
