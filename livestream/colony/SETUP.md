# Chat Colony als dritter Livestream auf dem N95 – Einrichtung (Test)

Niklas' Freigabe: 09.10. („wir probieren es auf dem N95“). Das ist ein Test: Kugelrennen und Wortraten haben Vorrang.
Chat Colony bekommt wie das Wortraten einen eigenen Benutzer, Bildschirm (:97), Ton, Encoder und Wächter-Modus.
Hochkant 720×1280, 30 fps, h264_vaapi CBR 2500k. YouTube erkennt das Hochformat am Bild selbst.

| Datei | Zweck |
|---|---|
| server.js | 127.0.0.1:8100, liest den Chat (../chat.js), reicht ihn an die Seite (/api/chat), speichert das Dorf (/api/save → DATA_DIR/state.json) |
| public/index.html | das Spiel (Logik läuft in der Seite), Kenney-Grafiken (CC0) in public/img, Schrift Pixelify Sans (OFL) in public/fonts, eigene Musik in public/music |
| run-colony.sh | Bildschirm :97 (Intel-Grafik über sway + Xwayland, sonst Xvfb), PulseAudio-Sink `colony`, Chrome, ffmpeg → YouTube |
| install-colony.sh | Benutzer `colony`, /var/lib/marble-colony, /etc/marble/colony.env, Dienste colony-server + colony-stream, Befehl `colony-key` |
| broadcast.json / thumbnail.jpg | Titel, Beschreibung und Thumbnail für den Wächter |

## 1. Vorher messen
CPU, GPU, RAM und drop_frames beider laufender Streams notieren (progress.txt), damit der Vergleich nachher stimmt.

## 2. Installation
`sudo bash /opt/marble/colony/install-colony.sh`
Ohne Schlüssel sendet colony-stream nichts, Chrome läuft trotzdem (Bild prüfen, Last messen).

## 3. Stream-Schlüssel (nur Niklas)
- YouTube Studio → Livestream → Stream → „Neuen Streamschlüssel erstellen“, Name `colony`, Typ Standard.
- Proxmox-Konsole der VM: `sudo colony-key`, Schlüssel einfügen. Nie in Chat, Repo oder Notiz.
- Niklas legt KEINE Sendung in Studio an (Lehre vom Wortraten), das macht der Wächter.

## 4. Wächter-Modus `colony`
`/opt/marble-local/ensure-live.py colony` wie `words`, mit eigenen Werten:
- liveStream mit dem Namen `colony`; nur Sendungen mit dieser boundStreamId anfassen
- Titel/Beschreibung aus /opt/marble/colony/broadcast.json, Thumbnail /opt/marble/colony/thumbnail.jpg
- Lock, Log, Status, NOBROADCAST, NOCHATBOT unter /var/lib/marble-colony
- Encoder neu verbinden: `kill $(cat /var/lib/marble-colony/ffmpeg.pid)`
- Sendungs-ID nach /var/lib/marble-colony/video_id (lesbar für colony); server.js läuft mit VIDEO_ID_ONLY=1
- öffentlich, Wechsel nach 11,5 h, Latenz „low“
- Chat-Hinweis (falls an): höchstens 1×/h, z. B. „🏡 Type anything to move into the village · vote with 1, 2 or 3“. Nachrichten vom eigenen Kanal über 40 Zeichen ignoriert das Spiel.
Kontingent: Hinweise 24 × 50 = 1.200 Einheiten/Tag mehr, Wächter ~500. Summe aller Posten danach ~6.900 von 10.000.

## 5. Prüfen
- `curl -s 127.0.0.1:8100/api/status` (chatStatus, msgCount, lastPage = letzte Abfrage der Seite)
- /var/lib/marble-colony/log.txt und ffmpeg.err (Schlüssel maskieren wie bei den anderen)
- Kugelrennen und Wortraten dürfen keine Bilder verlieren: drop_frames vorher/nachher, Last, Upload (alle drei zusammen ~8,6 Mbit/s, um 02:15 Wien kommt das Backup mit ~6 Mbit/s dazu)
- Wenn ein anderer Stream leidet: `systemctl stop colony-stream` oder `touch /var/lib/marble-colony/PAUSE`

## Aktualisierungen
Die Seite lädt eine neue Version erst zwischen zwei Runden. server.js startet sich bei geänderten Dateien selbst neu (systemd). Nach Änderungen an run-colony.sh `systemctl restart colony-stream`.
Achtung: marble-update startet bei jeder Änderung unter livestream/ auch marble-server neu (Kugelrennen-Seite lädt neu). Colony-Änderungen deshalb gebündelt pushen.

## Testen ohne YouTube
`DEMO=1 DATA_DIR=/tmp/colony node server.js` (in einer Kopie, nie im Repo-Ordner der VM), dann `http://127.0.0.1:8100/?fast&bots=3`.
Nachricht einwerfen: `curl '127.0.0.1:8100/api/say?u=tester&t=2'` (nur mit DEMO=1). `?dragon` startet sofort einen Drachenangriff.
