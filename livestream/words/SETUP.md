# Wortraten als zweiter Livestream auf dem N95 – Einrichtung

Niklas' Freigabe: 09.10. 08:50Z („hau das Spiel raus auf zweiten Livestream“), Latenz bleibt „Niedrig“.
Ziel: Das Kugelrennen läuft unverändert weiter. Das Wortraten bekommt einen eigenen Benutzer, Bildschirm, Ton, Encoder und Wächter.

## 0. Vorher: Kugelrennen-Chat an seine Sendung binden (wichtig)
Bei zwei gleichzeitigen Sendungen zeigt die Kanalseite /live nur eine. Ohne diesen Schritt könnte das Kugelrennen den Chat des Wortratens lesen.
- Der bestehende Wächter (/opt/marble-local/ensure-live.py) schreibt nach jedem Lauf die aktuelle Sendungs-ID nach /var/lib/marble/video_id (lesbar für marble).
- marble-server bekommt `VIDEO_ID_FILE=/var/lib/marble/video_id` (z. B. in /etc/marble/server.env), danach `systemctl restart marble-server`. Der Stream läuft dabei weiter.
- chat.js liest die ID aus der Datei. Fehlt die Datei oder ist die Sendung nicht live, weicht es wie bisher auf /live aus (nur beim Kugelrennen; das Wortraten hat VIDEO_ID_ONLY=1).

## 0b. Wächter trennen (Pflicht vor dem Start)
Beide Wächter nutzen denselben Kanal und dieselbe Live-API. Jeder darf nur Sendungen anfassen, deren boundStreamId seine eigene Stream-ID ist:
- ensure-live.py: beim Suchen nach „der“ aktiven Sendung (liveBroadcasts.list mine/active) nur Sendungen mit der Stream-ID des Kugelrennens berücksichtigen. Beenden, Binden und Neuverbinden gilt nur für diese.
- ensure-live-words.py: genauso, nur mit der Stream-ID von `words`.
- Zur Sicherheit zusätzlich das Titelpräfix prüfen („Country Marble Race“ bzw. „Guess the Word“).
- Abfragen sparsam halten (Uploads haben Vorrang beim Kontingent).

## 1. Installation
`sudo bash /opt/marble/words/install-words.sh`
Legt Benutzer `words`, /var/lib/marble-words, /etc/marble/words.env, die Dienste words-server (127.0.0.1:8090) und words-stream sowie den Befehl `words-key` an. Ohne Schlüssel sendet words-stream nichts. Chrome läuft trotzdem, damit man das Bild prüfen kann.

## 2. Stream-Schlüssel (nur Niklas)
- YouTube Studio → Livestream starten → Stream → Schlüssel-Auswahl → „Neuen Streamschlüssel erstellen“, Name `words`, Typ Standard.
- In der Proxmox-Konsole der VM: `sudo words-key` und den Schlüssel einfügen. Er gehört nie in einen Chat, ins Repo oder in eine Notiz.

## 3. Zweiter Wächter
Kopie von ensure-live.py → /opt/marble-local/ensure-live-words.py. Eigene Werte:
- liveStream: der Stream mit dem Namen `words` (über GET liveStreams?part=id,snippet&mine=true per n8n-Proxy finden)
- Titel und Beschreibung aus /opt/marble/words/broadcast.json, Thumbnail /opt/marble/words/thumbnail.jpg (mit derselben Wiederholung bei 403)
- Eigene Lock-, Log- und Statusdateien unter /var/lib/marble-words
- Encoder neu verbinden: `kill $(cat /var/lib/marble-words/ffmpeg.pid)`, run-words.sh verbindet nach 3 s neu
- Aktuelle Sendungs-ID nach /var/lib/marble-words/video_id schreiben (lesbar für words)
- Aus-Schalter: /var/lib/marble-words/NOBROADCAST
- Cron jede Minute wie beim ersten Wächter, öffentlich, < 12 h, Latenz „low“

Kontingent: etwa 500 Einheiten mehr pro Tag.

## 4. Prüfen
- Bild: `/var/lib/marble-words/log.txt`, ffmpeg.err (Schlüssel maskieren wie beim ersten Stream)
- Kugelrennen darf keine Bilder verlieren: progress.txt (drop_frames) vor und nach dem Start vergleichen, GPU- und CPU-Last ansehen
- Upload: Zwei Streams brauchen zusammen etwa 6 Mbit/s, um 02:15 Wien kommt das rclone-Backup mit 6 Mbit/s dazu. Im ersten Backup-Fenster drop_frames beider Streams ansehen.
- Wenn das Kugelrennen leidet: `systemctl stop words-stream` (Pause) bzw. `touch /var/lib/marble-words/PAUSE`

## Aktualisierungen
Das Repo wird wie bisher alle 3 Min. gezogen. words-server startet sich selbst neu, wenn sich seine Dateien ändern, und die Seite lädt sich danach neu. Ändert sich run-words.sh, startet man words-stream von Hand neu.
