# Chat Colony – dritter Livestream (Test auf dem N95, Niklas 09.10.)

Hochkant 720×1280, 30 fps. Besitz: Spiel (server.js, public/, broadcast.json, thumbnail.jpg, Musik) = Chat-Colony-Thread;
Sende-Technik (run-colony.sh, install-colony.sh, colony-guard.sh), Wächter und VM = Kugelrennen-Thread.

| Datei | Zweck |
|---|---|
| server.js | 127.0.0.1:${PORT:-8091}. Liest den Chat der eigenen Sendung (../chat.js, VIDEO_ID_FILE + VIDEO_ID_ONLY=1), reicht ihn an die Seite (/api/chat), speichert das Dorf (/api/save → $DATA_DIR/state.json, über .tmp + rename). /api/state = Lebenszeichen für run-colony.sh (chatStatus, msgCount, lastPage). |
| public/index.html | das Spiel; Logik läuft in der Seite. Lädt eine neue Version erst zwischen zwei Runden. |
| public/img | Kenney Tiny Town + Tiny Dungeon (CC0, kenney-lizenz.txt) |
| public/fonts | Pixelify Sans (SIL OFL, OFL.txt) |
| public/music | 8 eigene Stücke (stable-audio-3, −16 LUFS), Wahl nach Tageszeit und Ereignis, Ton direkt aus der Seite |
| broadcast.json | Titel (Präfix „Chat Colony“), Beschreibung, chatHint (Hinweis-Bot vorerst aus, Kontingent) |
| thumbnail.jpg | 1280×720 aus echtem Spielbild |

## Kontingent
Das Spiel kostet kein YouTube-API-Kontingent: chat.js liest den öffentlichen Live-Chat über die Webseite, ohne API-Schlüssel
(YT_API_KEY ist im Colony-Dienst nicht gesetzt, also auch kein Ausweichen auf liveChat/messages). Kosten entstehen nur im Wächter
(Sendungen, Thumbnail, ~500 Einheiten/Tag). Chat-Hinweis 1×/h wären +1.200/Tag und sind vorerst aus.

## Eigenen Kanal ignorieren
Nachrichten vom eigenen Kanal (UCG6xEYtopZcK66gz_biiIIA) mit mehr als 40 Zeichen zählen nicht (Hinweise des Wächters); Nightbot & Co. ebenso.

## Testen ohne YouTube
In einer Kopie (nie im Repo-Ordner der VM): `DEMO=1 DATA_DIR=/tmp/colony node server.js`, dann `http://127.0.0.1:8091/?fast&bots=3`.
Nachricht einwerfen: `curl '127.0.0.1:8091/api/say?u=tester&t=2'` (nur mit DEMO=1). `?dragon` startet sofort einen Drachenangriff.
