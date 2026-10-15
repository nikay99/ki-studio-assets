#!/bin/bash
# Selbst-Update (läuft als root per cron alle 3 Min.). Startet die Sendung NUR neu, wenn sich run.sh ändert;
# sonst nur den Server neu (die Rennseite lädt sich bei neuer Version zwischen zwei Rennen selbst neu).
cd /opt/marble-repo || exit 0
OLD=$(git rev-parse HEAD:livestream 2>/dev/null); OLDRUN=$(git rev-parse HEAD:livestream/run.sh 2>/dev/null)
sudo -u marble git fetch -q --depth 1 origin main && sudo -u marble git reset -q --hard origin/main
NEW=$(git rev-parse HEAD:livestream 2>/dev/null); NEWRUN=$(git rev-parse HEAD:livestream/run.sh 2>/dev/null)
# 15.10.: Rotations-Spiel ist dran (Waechter hat PAUSE/PAUSE.rot entfernt), sein Sende-Dienst ist aber gestoppt -> starten
# (der Waechter laeuft nicht als root und kann das nicht selbst; laeuft hier bei jedem Durchlauf, auch ohne Repo-Aenderung)
for g in words country flagcircle; do
  d=/var/lib/marble-$g
  [ -d "$d" ] && [ ! -f "$d/PAUSE.rot" ] && [ ! -f "$d/PAUSE" ] && [ ! -f "$d/NOBROADCAST" ] || continue
  systemctl is-active --quiet "$g-stream" || { systemctl start "$g-stream"; echo "$(date -u +%FT%TZ) $g-stream war gestoppt, gestartet"; }
done
[ "$OLD" = "$NEW" ] && exit 0
install -m 755 /opt/marble/marble-update.sh /usr/local/bin/marble-update
cd /opt/marble && sudo -u marble npm install --omit=dev -q
bash /opt/marble/sync-music.sh || true
systemctl restart marble-server
[ "$OLDRUN" != "$NEWRUN" ] && systemctl restart marble-stream
echo "$(date -u +%FT%TZ) update $NEW"
