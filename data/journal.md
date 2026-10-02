# KI-Studio Journal

Jeder Lauf haengt unten einen Eintrag an (neueste unten). Reines Protokoll – Grundlage fuer die Review mit Niklas.

Format:
```
## YYYY-MM-DD – <Thema>
- Ergebnis: hochgeladen (privat) | abgebrochen (Grund)
- Titel / Render-ID / Laenge
- Sounds: opener, whooshes, impact, climax, riser, timeskip
- Probleme + selbst behobene Fehler (was, wie, Commit)
- Spec-Anpassungen (z. B. Text gekuerzt)
- Kosten (Renders, Bild-/Stimm-Neuversuche)
- Beobachtungen / Ideen (-> ggf. Vorschlag in proposals.md)
```

## 2026-10-02 – Tsutomu Yamaguchi (manueller Lauf)
- Ergebnis: hochgeladen (privat), 37,5 s, Hook + 8 Szenen, Render 5823257a
- Sounds: Standard (punch, whoosh_1-3, impact_box, zap, gong_timeskip)
- Fehler selbst behoben: Shotstack clip_overlap auf Untertitelspur (Float-Summe) -> Builder kuerzt um 0,01 s, Audit strikt wie Shotstack (bec3cd1)
- Offen: Shotstack-Konto zeigt freeTrial -> Wasserzeichen pruefen
