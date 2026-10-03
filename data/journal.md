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

## 2026-10-02 – Great Emu War v2 (Chat mit Niklas)
- Video-QA-Test ueber fal `openrouter/router/video` (Video vorher per `fal-ai/workflow-utilities/scale-video` auf 540x960, crf 30, sonst "Payload Too Large"):
  - qwen/qwen3.8-omni-flash: ROT, 4 Meldungen, alle falsch (weisser Blitz, angebliche Sync-Fehler, per edit.json widerlegt) -> ungeeignet
  - google/gemini-3.8-flash (reasoning Pflicht): 1 Meldung, korrekt: 'THE INVULNERABILITY' bei 33 s umgebrochen/abgeschnitten (Niklas hat es auch gesehen). ~0,8 Cent/Check
- Fehler im Builder behoben: kurze Woerter werden nur noch angehaengt, wenn der Untertitel <= 16 Zeichen bleibt, sonst ans vorherige Wort ('WITH THE' + 'INVULNERABILITY'); Audit prueft jetzt Untertitel-Breite. Regression: slotin + yamaguchi byte-identisch.
- v2: Render 52f9f683 (2. Render), Audit gruen, Gemini-QA GRUEN, privat hochgeladen (Make a3dce5d4). v1 (d4f5d406) bitte in YouTube Studio loeschen.

## 2026-10-02 – Gemini als Coworker eingebaut (Chat, Freigabe Niklas)
- G3-Zuschauer-Test Emu War v2: Hook "yes", Score 6/10, Swipe-Risiko bei ~11 s (Setup) und ~28 s (Truck = Hoehepunkt vorbei), Payoff "partly" (Statistik statt Pointe), Tipps: Setup kuerzen, Action-SFX (Schuesse/Jam/Emus), schaerfere Schlusspointe. -> P-5
- Musik-Analyse (audio): mit Vorgabe Echo der Vorgabe, blind voellig andere Struktur + falsche Dauer -> fuer Musik-Timing NICHT nutzen.
- Neu: tools/gemini_coworker.md (Endpunkte, Vorlagen G1-G3, Grenzen), tools/qa_at.py (Meldung bei Sekunde X gegen Edit pruefen). Skill: Schritt 1 Story-Test, Schritt 9b Gemini Pflicht vor Upload.

## 2026-10-02 – Repo-Sync + P-5 umgesetzt (Chat mit Niklas)
- 4 Patches (Emu War v1/v2, Untertitel-Fix, Gemini-Coworker) per `git am` auf main (2308c20..44cc50d); Blobs = Patch, alle Beispiele Audit gruen, slotin + yamaguchi byte-identisch zum Builder vor dem Fix.
- P-5 als allgemeine Skill-Regeln: Writer Setup max. 2 Saetze / erste Aktion bis ~10 s, letzter Satz = Pointe (Zahlen davor); Sound Designer: Aktions-Szenen 1-2 Szenen-SFX pro Video erzeugt, auch ohne ZAP. Kein neuer Pool-Sound noetig (Kandidaten wieder entfernt).

## 2026-10-02 – Pflicht-Bildpruefung + Push-Rechte (Chat, Auftrag Niklas)
- Anlass: Koepcke-Lauf (Render fe071f63) – mehrere Bilder mit ueberzaehligen Armen/Haenden online; Claude sieht es nicht zuverlaessig, Gemini-G2 meldete PASS, Gemini auf Einzelbildern fand nur Szene 4. Koepcke-Lauf hat NICHT gepusht (keine Spec/Journal im Repo).
- Neu: `tools/image_check.md` (Vorbeugung im Bild-Prompt, 2 Pruefer gemini-3.8-flash + gpt-6-sol parallel mit Veto, Opus als Schiedsrichter bei UNSURE, neu erzeugen statt edit, max. 3 Versuche, `image_check` in der spec). gemini_coworker.md: Vision-Endpunkt + G0.
- Test: Pruef-Vorlage laeuft auf allen 3 Modellen (Emu-War-Bilder, einfache Bilder uebereinstimmend PASS); erste Vorlage mit Hintergrund-Herden lieferte nur UNSURE -> jetzt nur "prominente" Figuren. Kosten ~0,25 Cent (Gemini/GPT), ~3 Cent (Opus) je Bild.
- Offen: Kalibrierung an den echten Koepcke-Fehlerbildern (URLs/Render-ID fehlen noch).
- Daily-Task: Schritt 0 = add_repo push + `git push --dry-run`, frueh pushen, bei Fehler "PUSH FEHLGESCHLAGEN" + format-patch.
- Shotstack laeuft auf Plan "payg" (Render 02.10. abends) – freeTrial-/Wasserzeichen-Hinweis erledigt.
- Nachtrag 20:30 – Kalibrierung Koepcke (Render fe071f63, 10 Bilder via includeData): Gemini findet S4-Zusatzarm, Opus auch, GPT-6 nicht; uebrige Bilder alle PASS. Entscheidung Niklas: nur Gemini als Pruefer (FAIL/UNSURE → neu), Opus vermeidet als Art Director schon im Prompt (neu: keine Selbstberuehrung). Weitere von Niklas gesehene Fehler noch nicht zugeordnet.


## 2026-10-03 – Violet Jessop – Titanic und Britannic (ChatGPT setzt bestehenden Claude/Codex-Checkpoint fort)
- Ergebnis: hochgeladen (privat), 30,16 s, Hook + 6 Szenen, Render 2e0bf22c-26d8-4dcc-ae2a-a6885d1998ce, Make-Execution a01565e1c72d462fbf6137b65de4144a, YouTube-ID 8FaUaimY1gU.
- Koexistenz: bestehenden Violet-Pfad `examples/violet_jessop_20261003_codex/` weitergefuehrt; vor Writes/Upload Repo-Historie frisch gelesen; keine Claude-Commits ueberschrieben; kein Force-Push.
- Quellen/Fakten: Molly Brown House Museum, PBS Lost Liners/NOVA, National Maritime Museum Cornwall. Titanic-Lifeboat, Britannic 1916/Hospitalship, Propeller-Gefahr, Sprung/Rescue und Rueckkehr zur See gegen Quellen geprueft.
- Crew: Stimmung `thrill` -> Liam. Vorhandene, bereits per Gemini-G0 gepruefte Violet-Bilder unveraendert weiterverwendet; in diesem Abschlusslauf 0 neue Bilder generiert.
- Stimmen: 7 Liam-Clips (Hook + 6 Szenen) mit ElevenLabs multilingual-v2 neu erzeugt; Original-Timestamps in der Spec gespeichert.
- Sounds: opener op_slam; whooshes wh_wind/wh_sharp/wh_deep; impact impact_box; climax cl_boom auf "explosion"/BOOM!; kein Riser; timeskip ts_clock auf "FOUR YEARS LATER". Neue Szenen-SFX nur fuer Propeller-Gefahr und Sprung/Wasserrettung, jeweils loudnorm.
- Musik: "Cinematic maritime survival documentary underscore, early 20th century ocean-liner atmosphere, tense low strings, restrained brass, pulsing percussion and deep nautical ambience, around 88 bpm. Start urgent but controlled, build tension through the Titanic setup and four-year jump, rise sharply toward a powerful orchestral impact around 12 seconds for the Britannic explosion, then sustain fast nervous momentum with churning low strings and percussion through the propeller danger around 17 to 22 seconds, release into a breathless rescue section, then finish with resilient uplifting-but-serious strings for the final return-to-sea payoff. Instrumental only." Negative: vocals/singing/choir/voice/lyrics/humming/speech/cheerful pop/EDM/comedy. 35,2 s, seed 1013718263, loudnorm.
- Audit: GRUEN. END 30,16 s; CUT 1,90 s; BOOM 12,07 s; FOUR YEARS LATER 8,44 s; Whoosh-Peaks [-5,-5,+5,+5,+5,+5] ms; Stimmenluecken [0,10,0,01,0,01,0,01,0,01,0,01] s; Bilder/Stimme/Musik/CTA alle 30,16 s; keine schwarzen/falschen Frames.
- Unabhaengige QA: PASS, keine Issues.
- Shotstack: Render 1/2 erfolgreich, Plan payg, 0,5 Credits. Kein zweiter Render noetig.
- Gemini G2: PASS, 0 Issues. Daher kein qa_at.py-Fall zu verifizieren.
- Gemini G3: 7/10; Hook "yes"; staerkster Moment ca. 17 s (Propeller). Hinweise: kleiner Pacing-Dip am Zeitsprung, Olympic als moeglicher spaeterer Kicker, Loop-Ende. Nicht umgesetzt, weil G3 beratend ist und dafuer unnoetiger zweiter Render/inhaltliche Aenderung erforderlich waere.
- Upload: Make v6 erfolgreich; YouTube-Modul bestaetigt `uploaded`, `privacyStatus=private`, `containsSyntheticMedia=true`.
- Fehler/Transparenz: erster lokaler Builder-Versuch scheiterte nur an einem Transkriptionsfehler meiner lokalen Repo-Code-Kopie (turn-Zuweisung). Lokal korrigiert; gemeinsamer Repo-Builder/Design nicht geaendert. Erster G2/G3-Aufruf wurde wegen fehlendem Pflichtfeld `video_urls` mit HTTP 422 vor QA-Verarbeitung abgelehnt; danach korrekt mit aktuellem Schema ausgefuehrt. Keine dieser Pannen wurde als bestandene Pruefung gezaehlt.
- Kosten dieses Abschlusslaufs, soweit direkt bestimmbar: Fal ca. $0,16 (TTS ca. $0,0505; Stable Audio $0,0376; Szenen-SFX ca. $0,0148; Loudnorm ca. $0,0072; Scale-Video ca. $0,0302; erfolgreiche OpenRouter-Pruefungen inkl. vorherigem G1-Umweg ca. $0,0231). Shotstack 0,5 Credits; Make 4 Credits. Keine Bildgenerierung in diesem Abschlusslauf.


## 2026-10-03 – FQ-44 Fury / FQ-42 Vengeance – cockpitless CCA (ChatGPT)
- Ergebnis: hochgeladen (privat), 35,65 s, Hook + 6 Szenen, Render `af21354d-5145-4e17-8d06-64bf6878f6e2`, Make-Execution `0567a885f7424bbcadba591902eac5d6`, YouTube-ID `3-i1ExbPDQs`.
- Themenstrategie: moderner Future-Tech/Military-Short statt historischer WTF-Story. Hook: "This new fighter has no cockpit. And it already fired a missile."
- Fakten: aktuelle U.S.-Air-Force-Quellen belegen YFQ-44A AIM-120 Live-Fire gegen digitales Ziel (15.07.2026), verpflichtende menschliche Waffenfreigabe, offizielle Namen FQ-42 Vengeance/FQ-44 Fury, Increment-1-Produktion von 150 Flugzeugen und Ziel 500 combat-ready semi-autonomous CCAs bis 2032. Defense News als dritte Quelle in der Spec.
- Bilder: 7 eindeutige finale Comic-Bilder verwendet, alle Gemini G0 PASS. Ein früherer Batch von 7 Edit-Ausgaben ging durch Parser-/Bookkeeping-Fehler verloren und wurde nicht verwendet; als Produktionsfehler dokumentiert.
- Voice: Liam, ElevenLabs multilingual-v2; Original-Timestamps in der Spec erhalten.
- Musik/SFX: near-future military aviation underscore, Seed 413128778; opener op_bass; whooshes whoosh_2/whoosh_3/wh_reverse; impact im_metal; 2 eigene Szenen-SFX (Missile Live-Fire + finaler Jet/Air-Movement), loudnorm.
- Builder/Audit: deterministischer Builder/Audit-Stand aus Repo verwendet. Integritätsprüfung vor Upload: lokal materialisierte Dateien hatten andere Git-Blob-Hashes wegen Formatierung/Statement-Gruppierung, aber nach normalisierter Logikprüfung Builder und Audit vollständig gleich; alle verwendeten SFX-Records exakt gleich zum Repo. Audit GRUEN: 35,65 s; 855 Frames; 0 schwarz/falsch; Whoosh-Peaks [0,-1,-5,0,-1,+5] ms; Impact +15 ms; Stimmenluecken [0,10,0,01,0,01,0,01,0,01,0,01] s; Bilder/Stimme/Musik/CTA Ende 35,65 s.
- Unabhaengige Fakten-/Text-QA: PASS, keine Issues.
- Shotstack: Render 1/2 erfolgreich, PAYG, 0,59 Credits. Kein zweiter Render.
- Gemini G2: PASS, 0 Issues; deshalb kein qa_at.py-Fall.
- Gemini G3: 6/10; Hook "maybe"; Missile-Szene bei ~14 s staerkster Moment. Hinweise: statischer Comic/Pan-and-Scan-Look, Human-Authorization-Teil und Produktionszahlen koennen fuer breite Zielgruppe trockener wirken. G3 behauptete faelschlich, Juli 2026 sei Zukunft; aktuelles Datum ist 03.10.2026, daher als Fehlbeobachtung verworfen. Keine G3-Idee hat einen zweiten Render gerechtfertigt.
- Upload: Make v6 erfolgreich; YouTube-Modul bestaetigt `uploadStatus=uploaded`, `privacyStatus=private`, `containsSyntheticMedia=true`.
- Lehre: Modern-Tech-Themen funktionieren inhaltlich stark, aber bei G3 lag die groesste Retention-Chance in sichtbarer Action (Missile-Moment). Bei kuenftigen Future-Tech-Shorts frueher konkrete Action/Capability zeigen und Beschaffungszahlen nur verwenden, wenn sie den Payoff staerken.


## 2026-10-03 – FQ-44 Fury render v2 correction
- Anlass: Nutzer bemerkte im ersten privaten Upload um ~28 s sichtbare Subtitle-Box-Ueberlappung/Auto-Wrap bei `500 COMBAT-READY` sowie zu laute/repetitive Whooshes.
- Builder-Fix: konservativer Auto-Join fuer kurze Woerter (`CAP_JOIN_MAXCH=12`), damit grosse Keyword-Captions nicht in mehrzeilige Wraps gedrueckt werden. Audit ergaenzt um harten Wrap-Risiko-Check fuer hervorgehobene 145px-Captions.
- Sound-Fix: Whooshes pro Szene dynamisch statt auf jedem Cut. FQ-44 v2: `wh_soft / none / wh_sharp / wh_paper / none / wh_deep` mit reduzierten Multiplikatoren `[0.35,0,0.55,0.25,0,0.45]`.
- Kritischer Patch-Fehler waehrend Implementierung: erste GitHub-Patch-Version schrieb literal `\n` in Python-Quelltext und liess Teile des dynamischen Whoosh-Patches inkonsistent. Vor Render 2 entdeckt; kein Render damit gestartet. Repo-Code danach korrigiert und lokal/Repo nach Normalisierung 1:1 verifiziert.
- Regression: FQ-44 v2 Build/Audit GRUEN. Vollstaendige Cross-Example-Regression wurde wegen lokal veraltetem SFX-Cache fuer Violet nicht komplett abgeschlossen; das war kein Builder-Fehler und wurde nicht als bestandene Vollregression behauptet.
- Caption-Ergebnis im finalen Edit: `WITH 500` -> `COMBAT-READY` -> `CCAS`, jeweils separat; keine Ueberlappung.
- Shotstack direct connector war waehrend v2 nicht als direkte Chat-Aktion geladen. Fuer Render 2 wurde deshalb ein separater temporaerer Make-On-Demand-Runner mit der bereits autorisierten Verbindung `Shotstack KI-Studio` erstellt; bestehende Produktionsszenarien wurden nicht veraendert. Der Runner wurde nach dem Render deaktiviert.
- Erster Shotstack-POST ueber den Runner wurde mit HTTP 400 abgelehnt, weil Make den Body als `[object Object]` serialisierte; kein Render gestartet. Danach Body als JSON-Text mit `Content-Type: application/json` gesendet.
- Finaler Render v2: `2b55f3f3-51a7-4902-98e2-a80df72a8253`, 35,65 s, 0,59 Shotstack-Credits.
- G2 auf Render v2: PASS, 0 Issues. Extra gezielte QC nur auf die beiden Nutzerfehler: `layout_fixed=true`, `audio_fixed=true`; kein Caption-Wrap/Overlap im Bereich 26-31 s, Whooshes variiert/leiser, zwei Cuts bewusst ohne Whoosh.
- Nutzer hat Render v2 explizit freigegeben.
- Privater Upload v2: Make-Execution `93784db1257f4f6fa64f8e5cfe6e7276`, YouTube-ID `FiQNl8heBiQ`, `uploadStatus=uploaded`, `privacyStatus=private`, `containsSyntheticMedia=true`.
- Alter privater v1-Upload `3-i1ExbPDQs` bleibt privat und gilt als superseded; `published.json` verweist jetzt auf v2 als finalen Stand.


## 2026-10-03 – Humanoid factory robotics / BMW Figure 02→03 (ChatGPT, fortgesetzter Checkpoint)
- Ergebnis: **abgebrochen vor Builder/Render/Upload (Kosten-Guard)**. Kein YouTube-Upload.
- G1: vollständig mit Gemini 3.8 Flash (Request 01a10155-6f4f-77c1-aaa9-09dcc3cbd948). Humanoid Factory gewählt: Hook 8/10, Surprise 7, Tech-Wow 9, Relevance 9, Visual 9, Shareability 8, Overdone-Risk 7. Liberty Lifter ungewöhnlicher, aber Relevance 6; X-59 nicht gewählt.
- Fakten: BMW + Ars Technica + Figure geprüft. Figure 02 unterstützte >30.000 X3, bewegte >90.000 Teile, ~1.250 h, ~1,2 Mio. Schritte; Figure 03 ist 2026 im BMW-Projekt für komplexere Sequenzierungslogistik. Forearm-Failure-Point stammt ausdrücklich von Figure.
- Writer: Titel „This Robot Helped Build 30,000 BMWs“; Hook „This humanoid robot helped build 30,000 BMWs. And BMW is already testing its replacement.“; 7 Szenen, curious → Jessica.
- Voice: 8 ElevenLabs multilingual-v2 Calls abgeschlossen; Szenen 4–6 einmal erneut erzeugt, weil die erste Batch-Ausgabe im Tool-Result gekürzt wurde und URLs/Timestamps deshalb nicht sicher übernommen werden konnten. Keine Timestamps erfunden.
- Bilder: 1 GPT Image 2.5 Flare Anchor + 8 Flare-Edit-Jobs tatsächlich ausgeführt. Anchor https://v3b.fal.media/files/b/0aace2b4/5rTlrq4zamhK0SLx5NbtG_4DpwZCVA.png, Gemini-G0 PASS (01a10158-21e6-7cf0-9261-c0125094e8f6). Fehler: beim Batch wurden aus den Edit-Responses versehentlich die Referenz-URLs statt der result.images-URLs extrahiert; die 8 erzeugten Result-URLs waren danach nicht mehr abrufbar.
- Kostenproblem: aktuelle fal-Preisabfrage meldete GPT Image 2.5 Flare text-to-image/edit mit $1 pro Unit. Nach bereits ~9 Bild-Jobs hätte reine Wiederherstellung durch 8 Neu-Edits weitere ~8 USD gekostet. Deshalb Kosten-Guard statt Doppelgenerierung.
- Nicht durchgeführt: Musik, Szenen-SFX, vollständige Spec mit Original-Timestamps, Builder, Audit, unabhängige QA, Shotstack-Render, G2/G3, Make/YouTube-Upload. Nichts davon als PASS gewertet.
- Lehre: Bei teuren Batch-Generierungen Result-URL + request_id im selben Tool-Call persistieren/ausgeben; nie per Regex die erste URL aus der Recipe nehmen.
