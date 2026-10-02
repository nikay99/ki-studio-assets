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

## 2026-10-02 – Great Emu War 1932 (taeglicher Lauf, autonom)
- Ergebnis: hochgeladen (privat), 42,92 s, Hook + 8 Szenen, Render d4f5d406, Make-Execution 33b5d533
- Titel: "Australia Went to War With Birds… And Lost"
- Showrunner: Emu War gewaehlt – Kontrast zu zwei dunklen WWII-Videos (Japan/USA), Australien 1930er, Ironie-Twist statt Tod; Stimmung curious. Quellen: Wikipedia, HistoryHit, Britannica.
- Writer: Hook "Australia once went to war with birds. And the birds won." (turn_word And); Aufloesung "The birds kept the wheat fields."
- Art Director: Boxen "AUSTRALIA VS / 20,000 EMUS" + "AND THE BIRDS WON."; kein ZAP (kein echter Knall-Moment, Jam ist Anti-Klimax); Karte "FOUR DAYS LATER"; Major als Figur per edit konsistent (S2/S3/S5/S7); Keywords rot INVADE/FIRE/AMBUSH/JAMS/INVULNERABILITY, gelb 1932/TWENTY/TWO/TEN/TWELVE/TANKS/KEPT.
- Sound Designer: Stimme Jessica (curious); Sounds punch, wh_paper/wh_soft/wh_sharp, im_stamp (Urteil "AND THE BIRDS WON."), kein Climax/Riser, ts_typewriter (Bericht/Rueckzug) – neue Kombination.
- Musik (seed 1409564191, URL in spec): "Quirky cinematic documentary underscore, 1930s Australian outback, playful pizzicato strings, marching snare drum, tuba and a cheeky mock-heroic brass motif, 100 bpm. Starts mischievous and light with pizzicato and a single snare roll, from 4 seconds a mock-serious military march builds steadily, rising tension with fuller brass and faster snare toward 25 seconds, peak suspense at 27 seconds, then an abrupt comic stop and a stumbling, deflated bassoon at 27.7 seconds, a dry ironic lull with soft woodblock ticks from 28.4 to 34 seconds, then building back into a proud, cheeky triumphant brass march from 35 seconds to a confident resolving ending at 43 seconds. Instrumental only." | negative: vocals, singing, choir, voice, lyrics, humming, speech, dark, horror, sad | 48 s
- QA Runde 1 ROT: Jam-Reihenfolge falsch (12 Kills VOR dem Jam), "six days later" relativ zum Hinterhalt falsch (4.11.->8.11. = vier Tage), 9.860 Schuss = Gesamtbilanz nicht 2. Einsatz, "declared war" -> "went to war", Stahlhelm in S8 -> Slouch-Hat. Alles korrigiert: Hook/S5/S6/S8 neu vertont, S8-Bild per edit, Musik mit neuen Sekunden neu (Bruch auf "jams"). Runde 2 GRUEN.
- Audit: gruen, Whooshes +-5 ms, im_stamp +35 ms, ts_typewriter +5 ms, Stimm-Luecken 0,01-0,1 s. Sync nur rechnerisch geprueft.
- Fehler im Code: keine.
- Kosten: 1 Render (0,72 Credits), 13 TTS (4 Neuvertonungen), 11 Bilder (1 Nachbesserung), 2 Musik + 2 loudnorm.
- Beobachtung: 42,9 s liegt ueber dem Ziel 30-40 s (Zitat-Szene behalten) -> P-2.
