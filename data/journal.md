# KI-Studio Journal

Jeder Lauf haengt unten einen Eintrag an (neueste unten). Reines Protokoll – Grundlage fuer die Review mit Niklas.

Format:
```
## YYYY-MM-DD – <Thema>
- Ergebnis: hochgeladen (privat) | abgebrochen (Grund)
- Titel / Render-ID / Laenge
- Sounds: opener, whooshes, impact, climax, riser, timeskip
- Musik: Stimme/Stimmung + kompletter Musik-Prompt (inkl. Spannungsbogen) + URL
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

## 2026-10-02 – Tsutomu Yamaguchi v2 (Remake im Chat, Niklas' Wunsch)
- Ergebnis: hochgeladen (privat), 37,5 s, Render e2f03bdd, Make-Execution 2180aa50 ok
- Crew: Stimmung dark (Krieg/Atombombe) -> Brian; Musik neu mit Spannungsbogen auf den Blitz (13,67 s); Sounds: op_bass, wh_deep/whoosh_1/wh_reverse, im_metal auf "AND THEN ANOTHER.", ri_strings 2 s Aufbau -> cl_boom auf BOOM!, ts_clock (Uhr-Ticken, Glocke exakt auf THREE DAYS LATER)
- Musik: siehe examples/yamaguchi/spec.json -> music_prompt (seed 1315295070)
- Audit: gruen, Whooshes +-5 ms, im_metal +15 ms, cl_boom -5 ms, ts_clock +5 ms
- Pool: 25 Sounds hochgeladen (fal-ID-Namen in Unterordnern) -> umbenannt + vermessen; op_flash, im_fist, cl_bang zu leise -> gesperrt (P-1)
- Builder: Impact/Timeskip mit Peak > 50 ms werden auf den Peak ausgerichtet; --timeline fuer den Sound Designer
