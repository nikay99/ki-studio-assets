# Country Marble Race – 24/7-Livestream

Interaktives Länder-Kugelrennen: Zuschauer schreiben ihr Land in den YouTube-Chat und bekommen eine Kugel im nächsten Rennen.

| Datei | Zweck |
|---|---|
| public/race.html | Rennen (Matter.js, Canvas 1280x720, WebAudio-Effekte, Musik-Playlist) |
| public/countries.js | 160 Länder mit Aliasen (Deutschland, Österreich, 🇧🇷 …) |
| server.js | lokaler Server :8080, Chat→Land, Tagesranglisten; Statusseite :80 nur unter /s/<TOKEN>/ |
| chat.js | liest den öffentlichen Live-Chat ohne API-Schlüssel; Fallback YT_API_KEY (offizielle API, alle 45 s) |
| run.sh | Xvfb + PulseAudio + Chrome + ffmpeg; mit STREAM_KEY → RTMP in 11,5-h-Blöcken, ohne → Testclips |
| cloud-init.sh | Server-Einrichtung (Ubuntu 24.04, DigitalOcean) |
| music.json / sync-music.sh | eigene Musik (stable-audio-3), Lautheit −16 LUFS |

Auf dem Server: `/etc/marble/stream.env` (STREAM_KEY, CHANNEL) – setzt Niklas über die Droplet-Konsole mit `marble-key`.
Der Server holt sich Änderungen in diesem Ordner alle 3 Minuten selbst (cron `marble-update`) und startet neu.
Status: `http://<IP>/s/<TOKEN>/status`, `snap.jpg`, `test0.mp4`, `log.txt` (Token steht in /mnt/project-files/ideen/livestream/server.md).
