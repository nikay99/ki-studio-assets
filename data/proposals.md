# Verbesserungsvorschlaege (Freigabe durch Niklas)

Der taegliche Lauf schlaegt hier Aenderungen vor, setzt sie aber **erst um, wenn der Status auf `FREIGEGEBEN` steht**.
Freigeben/ablehnen macht Niklas (im Chat mit Claude, das traegt den Status ein).
Status: `OFFEN` -> `FREIGEGEBEN` | `ABGELEHNT` -> `UMGESETZT (Commit)`.

Ausgenommen (ohne Freigabe erlaubt): **Fehlerbehebungen**, die einen kaputten Lauf reparieren (Render-/Validator-Fehler, Abstuerze, falsche Berechnung) – ohne Design, Timing-Regeln oder Look zu aendern. Danach immer beide Beispiele (`examples/*/spec.json`) bauen: muessen gruen bleiben, Slotin unveraendert.

Format:
```
## P-<Nr> – <kurzer Titel>  [OFFEN]
- Beobachtung: was ist aufgefallen (mit Lauf/Datum)
- Vorschlag: konkrete Aenderung (Builder / Skill / Prompt / Sound-Pool / Ablauf)
- Erwarteter Nutzen + Risiko
```

---

## P-1 – 3 Pool-Sounds neu erzeugen (zu leise)  [OFFEN]
- Beobachtung: Vermessung 02.10.2026: im_fist -54 LUFS, cl_bang -41 LUFS, op_flash -25.5 LUFS – auch mit vol 1.0 kaum hoerbar, daher in sfx.json gesperrt (usable=false).
- Vorschlag: mit elevenlabs/sound-effects/v2 neu erzeugen (prompt_influence 0.6, lauter/praesenter formulieren), Niklas laedt hoch, neu vermessen, Sperre entfernen.
- Nutzen: Faustschlag-Impact, Gewehrschuss-BANG und Kamera-Blitz-Opener wieder verfuegbar. Risiko: keins.
