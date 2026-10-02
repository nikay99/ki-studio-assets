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
