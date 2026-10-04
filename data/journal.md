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


## 2026-10-03 – SpaceX Booster-Fang (Säule A, erstes Video der neuen Themenrichtung)
- Ergebnis: **privat hochgeladen**, Make-Execution `038845117e84454dbe11468e1d207d7b` (status 1). YouTube-ID kam nicht in der Execution-Antwort zurück; Studio-Link per Make-Mail.
- Showrunner/G1 (01a10190-4631-73c0-8152-7f520b7fda66): SpaceX Booster-Fang Hook 8 / Surprise 7 gewählt; Voyager 6/8 als Reserve; Bitcoin-Pizza 3/1 „overdone“ → verworfen.
- Writer: Titel „A Tower Caught a Falling Rocket. First Try.“; Boxen „TALLER THAN / 20 STORIES“ + „A TOWER CAUGHT IT.“; 9 Szenen; Stimmung `wow`. Quellen NPR, Scientific American, The Engineer. Fakten-QA PASS (Hinweise optional: „ended up in the ocean“ verkürzt, „This rocket“ = 71-m-Booster).
- Stimme Liam (multilingual-v2), Original-Timestamps.
- Bilder: 10 Bilder (gpt-image-2.5/flare), alle G0 PASS, 0 verworfen. Keine Logos/Marken im Prompt.
- Musik: stable-audio-3, Seed 371650267, loudnorm −16/−1. Prompt: „Epic modern space-launch documentary underscore, pulsing synth bass, tight electronic drums, shimmering pads and a soaring synth lead, 118 bpm … huge cinematic impact hit at 26.2 seconds, then a triumphant euphoric section … Instrumental only.“ (voll in extra.json)
- Sound: op_slam; Whooshes dynamisch `wh_sharp / – / wh_reverse / wh_soft / – / whoosh_2 / – / wh_sharp`; im_metal auf Box 2; cl_snap + ri_reverse auf „catch“ mit ZAP „SNAP!“; 3 Szenen-SFX (Start-Rumble, Triebwerke, Fang).
- Audit GRÜN 37,03 s: Whoosh-Peaks ±5 ms, im_metal +15 ms, cl_snap −5 ms; Bilder/Stimme/Musik/CTA enden bei 37,03 s.
- Shotstack: 1 Render `298e1f28-45bb-49d1-b49e-d1c6cb733d4f`, 0,62 Credits. Übertragene Timeline maschinell gegen edit.json geprüft (nur Server-Defaults ergänzt).
- Gemini G2: PASS, 0 Issues → kein qa_at.py-Fall.
- Gemini G3: 6,5/10, Hook „maybe“. Stärkster Moment ~22 s (Triebwerke zünden am Turm). Swipe-Risiko: 6,5 s („Wikipedia-Modus“ Datum/Ort), 18,5 s (Ozean-Erklärung), 25,5 s (SNAP!-Sticker wirkt bei echtem Ereignis comichaft). Keine dieser Punkte rechtfertigt einen 2. Render.
- Tags: auf Einzelwörter umgestellt (Mehrwort-Tags in Anführungszeichen riskant bei Leerzeichen-Trennung in Make).
- Kosten grob: 10 Bilder à ~3–5 Cent, TTS, Musik, 3 SFX, Gemini (G0×10, G1, G2, G3 je < 1 Cent), Shotstack 0,62 Credits.
- Lehren: (1) Bei Tech-Rekorden den Ausgang nicht im Hook verraten – Box 2 als offene Frage („CAN A TOWER CATCH IT?“) testen. (2) Datum/Ort-Einstieg kürzen, direkt in die Action. (3) ZAP-Lautwort bei realen Großereignissen sparsamer bzw. ernster wählen. (4) Bitcoin-Pizza laut G1 ausgelutscht – bei C (Geld & Internet) weniger bekannte Geschichten suchen.
- Niklas-Feedback 03.10.2026: „super geworden!!“ → **Referenz-Video für Säule A** (Machart: realer Tech-Rekord ≤ 10 Jahre, Stimmung wow, Liam, Ziffern-Hook-Box, Lautwort auf den Höhepunkt, 3 eigene Szenen-SFX). Eine News/Trend-Säule kommt vorerst nicht dazu.

## 2026-10-03 – SpaceX v2 nach Pflicht-Prüfskript (qa/preflight.py)
- Anlass: preflight auf v1 ROT. (1) CTA „FOLLOW FOR THE NEXT TRUE STORY“ lag bei 80 % Höhe unter Titel/Kanalname. (2) Hook-Bild stand 1,6–3,0 s still (Zoom-Tween endete nach 1,6 s). (3) Mix nur −22,2 LUFS (ElevenLabs-Stimmen roh ~−24 LUFS).
- Builder-Fix (tools/build_short.py): CTA jetzt `position center, offset y 0.25, height 220` (Mitte bei 25 % Höhe); Hook-Zoom läuft bis zum Schnitt (1.08→1.22). Regression: alle Beispiele GRÜN außer emu_war (war vorher schon ROT, unverändert).
- Ton: 9 Stimmen per fal loudnorm (dynamic, −16 LUFS, TP −1.5) → `voices_norm.json`; Musik 0.18→0.4, Szenen-SFX ×2,5. Ergebnis −15,2 LUFS, TP −0,6. Sync-Check gegen v1 per Hüllkurven-Korrelation: 0 ms Versatz in allen Abschnitten.
- US-Ausrichtung: Titel „A 20-Story Rocket Fell. A Tower Caught It.“ (neu, sonst Duplikat-Titel), CTA „WOULD YOU WATCH IT LIVE?“, Beschreibung 233-foot.
- Render v2 `dcdb9694-281b-4660-819a-c10d007ac9b6` (0,62 Credits). preflight GRÜN (Hinweise: Box 2 Textbreite, Button-Leiste rechts). Gemini G2 PASS, Niklas-Regeln alle erfüllt; Meldung „Overlap 26 s“ per qa_at.py als Fehlalarm belegt (SNAP! oben, Untertitel unten).
- Upload v2 privat OHNE Termin (Execution bd1634ce53244be7bde43b809e755276), damit v1 und v2 nicht beide veröffentlicht werden. v1 muss Niklas in Studio löschen; danach Termin für v2 über Make 7750442.
- Lehre: Für künftige Videos Stimmen immer gleich nach TTS auf −16 LUFS normalisieren (Musik-Default dann ~0.4).

## 2026-10-03 – Voyager 1 per Funk repariert (Säule B, für Di 06.10.)
- Showrunner: Voyager-Rettung 2023/24 (G1 vom SpaceX-Lauf: 6/8). Quellen JPL-News + JPL PIA26275 + The Register. Stimmung curious/thrill, Stimme Liam wie Referenz SpaceX.
- Writer: Hook „This spacecraft is fifteen billion miles away. And engineers fixed it from Earth.“ US-Einheiten (Meilen). Pointe: „A computer from 1977, fixed with a radio message.“
- Art Director: 10 Bilder in einem Versuch, G0 PASS (Menschen nur von hinten, Hände außerhalb). Kein ZAP, keine Karte (kein echter Knall/Zeitsprung).
- Sound: punch / whoosh_1, wh_deep, wh_soft, wh_paper / im_stamp; Szenen-SFX Funkstörung (s1, 0.5) und klares Telemetrie-Signal (s8, 0.8). Musik stable-audio-3 seed 63567379, Release bei 30 s, music_vol 0.4. Stimmen direkt nach TTS auf −16 LUFS (Lehre aus SpaceX).
- Ergebnis: 1 Render (84d91bb1), Preflight GRÜN beim ersten Mal (−15.1 LUFS), G2 PASS inkl. Niklas-Regeln. Upload privat mit publish_at 2026-10-06T12:00-04:00.
- Nachtrag Voyager: YouTube-ID Txd4uHgKexw, Termin 2026-10-06T16:00Z bestätigt (vidIQ).

## 2026-10-03 – Citibank 900 Mio. (Säule C, Fr 09.10.)
- Showrunner: Citibank/Revlon-Fehlüberweisung Aug 2020 (~900 Mio. $ statt ~7,8 Mio. Zinsen), Urteil Feb 2021 „behalten“, 2nd Circuit kippt Sep 2022. Quellen Torys, Bloomberg Law, Business Standard. Stimme Jessica, mood curious.
- Writer: Hook „A bank sent nine hundred million dollars by mistake. And a judge said: keep it.“ Pointe: „The mistake took one click. Getting the money back took two years.“ CTA „WOULD YOU GIVE IT BACK?“
- Art Director: 10 Bilder in einem Versuch, G0 PASS (Hook 4 Büroleute, s2 eine Figur).
- Sound: op_bass / whoosh_2, wh_sharp, whoosh_3, wh_wind / impact_box; Szenen-SFX Klick (s3, 0.7) und Hammer (s6, 0.8). Musik stable-audio-3 seed 343457774 (Finanz-Thriller, Bruch bei 32 s), music_vol 0.4. Nur drei Opener nutzbar (op_flash gesperrt) – Wiederholung nach 3 Videos unvermeidbar.
- Ergebnis: 1 Render (3a55f71b, 0 Diffs). Preflight ROT: True Peak +0,1 dBTP bei 26,5 s (Hammer-SFX 0.8 + Stimme + Musik), −0,4 bei 3,5 s (impact_box). Fix ohne 2. Render: lokal `alimiter limit=0.708`, Video-Stream kopiert → Preflight GRÜN (−16,1 LUFS, TP −2,8). G2 PASS, alle Niklas-Regeln ja. Upload privat mit publish_at 2026-10-09T12:00-04:00, YouTube SwOBCjJqhro, Termin bestätigt.
- Lehre: Szenen-SFX mit sfx_vol ≤ 0.5 ansetzen, wenn sie auf Stimme + Musik fallen; fal-CDN-Upload und GitHub-Branch-Löschen sind aus der Shell gesperrt (Datei lag auf Branch media-tmp).

## 2026-10-03 – Humanoid/BMW fertiggestellt (Säule A, Sa 10.10.)
- Basis: ChatGPT-Checkpoint (Bilder G0 PASS, Stimmen, Musik, Szenen-SFX). Claude: Stimmen auf −16 LUFS normalisiert, line2 „NOW THE UPGRADE.“, CTA „WOULD YOU WORK NEXT TO ONE?“, US-Beschreibung, op_slam/im_metal, music_vol 0.35, Szenen-SFX ≤ 0.45 → `finalize.py` → `spec_final.json`.
- Builder-Fix `tools/build_short.py clean()`: Punkt/Komma zwischen Ziffern bleiben erhalten. Vorher stand „AND 12 MILLION STEPS“ statt 1.2 Millionen und „90000“ im Untertitel. Citibank-Edit unverändert (geprüft).
- Ergebnis: 1 Render (7b7b37d3, 0 Diffs), Preflight GRÜN (−16,0 LUFS, TP −1,1; Hinweise 1-Frame-Hänger 38,67 s, Hook-Box rechts 0,94), G2 PASS inkl. Niklas-Regeln. Upload privat mit publish_at 2026-10-10T10:00-04:00 (Make 89163b83…).

## 2026-10-04 – KJ Muldoon / Gen-Editor für ein Baby (Säule B, Mi 14.10.)
- Quellen: Penn Medicine (Mai 2025), Penn Gazette, FOX29 (Entlassung Juni 2025). Unsichere Detailzahlen (z. B. Klinik-Tage) bewusst weggelassen.
- Stimme Brian (Abwechslung zu Jessica), 9 TTS, alle sofort auf −16 LUFS. 10 Bilder, 0 verworfen; G0 nur für Bilder mit Figuren (Baby gewickelt, Hände verdeckt; 2 Ärzte von hinten, Hände in Taschen): PASS.
- Sound punch / impact_box, Whooshes wh_soft, whoosh_1, wh_deep, wh_reverse. Szenen-SFX gezielt: Herzmonitor (S3, 0.4), Tropfen (S6, 0.45). Musik stable-audio-3 Seed 458104256, music_vol 0.35.
- Audit GRÜN (37,52 s), 1 Render (93b29b9e), Render-Diff 0. Preflight GRÜN (−15,9 LUFS, TP −0,6 Hinweis; Hook-Box rechts 0,94). G2 PASS, alle Owner-Regeln ja.
- Upload Make 20bc964e…, YouTube a782coC5ymc, geplant 14.10. 12:00 ET (16:00Z bestätigt).
- Lehre/Werkzeug: TTS-Zeitstempel nicht mehr abtippen, sondern per Skript aus dem Transkript ziehen (voices.json + voices.py-Loader) – spart viel Zeit und Fehler.

## 2026-10-04 – Bitcoin-Festplatte auf der Müllhalde (Säule C, Fr 16.10.)
- Quellen: Wikipedia „Bitcoin buried in Newport landfill“, Fortune (11.02.2025), Daily Galaxy (08/2026). Wert ≈ 510 Mio. $ bei 63.804 $/BTC (Aug 2026), am Hoch ≈ 1 Mrd. $. Klage £495 Mio. → im Skript „more than six hundred million dollars“.
- Erstmals Retention-Vorabschätzung (Gemini, siehe retention_pre.md): v1 28 % Wegwischen / 58 % Ø gesehen. Umgesetzt: Betrag in den Hook, 2009-Vorgeschichte gestrichen, Loop-Ende („And the drive is still down there.“ → Hook). Gemini-Zahlen ($150M/$600M) nicht übernommen, weil unbelegt.
- Stimme Liam, 9 TTS auf −16 LUFS. 10 Bilder, 0 verworfen; G0 für die 2 Figurenbilder (von hinten): PASS. Szenen-SFX Müllsack (0.45), Münzen (0.4); Musik stable-audio-3 Seed 1897625544, 0.35.
- Audit GRÜN (35,77 s), 1 Render (b9071d90), Diff 0. Preflight GRÜN (−16,0 LUFS, TP −1,8; Hinweise 1-Frame-Hänger 12,04 s, line2-Box rechts 0,86). G2 PASS, alle Owner-Regeln inkl. Loop-Ende ja.
- Upload Make 5a5eda76…, YouTube JAYElpBEDXc, geplant 16.10. 12:00 ET (16:00Z bestätigt).
