# VM-Auftrag 10.10. (Kugelrennen-Thread) – nur auf Niklas' eigene Freigabe im Kugelrennen-Thread ausführen

Hintergrund: Niklas hat am 10.10. 08:43Z „Ja, einrichten“ für einen vierten Stream „Guess the Country“ gewählt und um 08:43Z geschrieben
„bitte für chat colony auch bot reinschrieben lassen“ (stündlicher Chat-Hinweis auch bei Chat Colony).

1. Vierten Stream einrichten (als root): `bash /opt/marble/country/install-country.sh`
   Rührt marble-*, words-*, colony-* nicht an. country-stream sendet erst, wenn Niklas `country-key` ausführt (Stream-Schlüssel, Eingang „country“).
2. Wächter /opt/marble-local/ensure-live.py: Profil `country` nach Muster `colony` ergänzen
   - Eingang (liveStream-Titel) „country“ oder „country-key“, Daten /var/lib/marble-country, video_id → /var/lib/marble-country/video_id
   - Titel/Beschreibung/chatHint aus /opt/marble/country/broadcast.json, Thumbnail /opt/marble/country/thumbnail.jpg (kommt vom Country-Thread; fehlt es, ohne)
   - Cron-Zeile wie bei colony; Profil tut nichts, solange /etc/marble/country.env keinen STREAM_KEY hat
3. Chat-Hinweis-Bot auch für Colony einschalten: wie bei marble/words höchstens 1×/h, Text = `chatHint` aus /opt/marble/colony/broadcast.json.
   Kontingent: +~1.200 Einheiten/Tag (Stand ~5.200 von 10.000) – passt.
4. Danach `bash -n`/`python3 -m py_compile` prüfen, ein Probelauf des Wächters je Profil, und dem Kugelrennen-Thread kurz melden (was geändert, Ergebnis).
Keine Schlüssel ausgeben oder in Dateien/Logs schreiben.
