#!/bin/bash
# Zweiten (vertikalen) YouTube-Streamschlüssel eintragen. Aufruf in der Droplet-Konsole: bash /opt/marble/marble-key-v.sh
set -e
read -rsp "Vertikaler Stream-Schlüssel (9:16) einfügen (Eingabe bleibt unsichtbar): " K; echo
[ -n "$K" ] || { echo "Kein Schlüssel – abgebrochen"; exit 1; }
sed -i '/^STREAM_KEY_V=/d' /etc/marble/stream.env
echo "STREAM_KEY_V=$K" >> /etc/marble/stream.env
echo "Gespeichert. Der Stream startet in ca. 1 Minute mit beiden Formaten neu."
