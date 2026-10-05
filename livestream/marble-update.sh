#!/bin/bash
# Selbst-Update (läuft als root per cron alle 3 Min.). Startet die Sendung NUR neu, wenn sich run.sh ändert;
# sonst nur den Server neu (die Rennseite lädt sich bei neuer Version zwischen zwei Rennen selbst neu).
cd /opt/marble-repo || exit 0
OLD=$(git rev-parse HEAD:livestream 2>/dev/null); OLDRUN=$(git rev-parse HEAD:livestream/run.sh 2>/dev/null)
sudo -u marble git fetch -q --depth 1 origin main && sudo -u marble git reset -q --hard origin/main
NEW=$(git rev-parse HEAD:livestream 2>/dev/null); NEWRUN=$(git rev-parse HEAD:livestream/run.sh 2>/dev/null)
[ "$OLD" = "$NEW" ] && exit 0
install -m 755 /opt/marble/marble-update.sh /usr/local/bin/marble-update
cd /opt/marble && sudo -u marble npm install --omit=dev -q
bash /opt/marble/sync-music.sh || true
systemctl restart marble-server
[ "$OLDRUN" != "$NEWRUN" ] && systemctl restart marble-stream
echo "$(date -u +%FT%TZ) update $NEW"
