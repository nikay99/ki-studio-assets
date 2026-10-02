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

## P-2 – Laengen-Warnung im --timeline bei > 40 s  [OFFEN]
- Beobachtung: Emu-War-Lauf 02.10.2026: 9 Saetze / 112 Woerter ergaben 42,9 s – erst nach der Vertonung sichtbar; Ziel laut Skill 30-40 s.
- Vorschlag: build_short.py --timeline gibt bei > 40 s eine Warnung + Vorschlag aus, welche Szene am kuerzesten zu streichen waere; Skill-Regel "Writer: max. ~95 Woerter inkl. Hook" ergaenzen.
- Nutzen: bessere Retention, weniger Neuvertonungen. Risiko: keins (nur Hinweis).

## P-3 – QA-Faktencheck vor der Vertonung  [OFFEN]
- Beobachtung: Emu-War-Lauf: QA fand 4 Faktenfehler erst nach Stimmen/Bildern -> 4 TTS + 1 Musik + 1 Bild neu.
- Vorschlag: Ablauf Schritt 3a: QA-Subagent prueft das Skript (Narration + Quellen) direkt nach dem Writer, vor fal-Assets; Schritt 8 bleibt fuer Bilder/Sound/Audit.
- Nutzen: weniger Doppelkosten. Risiko: ein zusaetzlicher kurzer Subagent-Aufruf.

## P-4 – Gemini-Video-QA (Augen + Ohren) in den Ablauf  [UMGESETZT (tools/gemini_coworker.md, tools/qa_at.py, Skill-Schritte 1 + 9b) – freigegeben von Niklas 02.10.2026]
- Beobachtung: 02.10.2026 Gemini 3.8 Flash fand einen echten Untertitel-Fehler, den Audit und Claude nicht sehen konnten; Qwen Omni lieferte nur Fehlalarme.
- Vorschlag (Details im Chat 02.10.): (a) nach dem Render: scale-video 540x960 -> openrouter/router/video gemini-3.8-flash -> JSON-Urteil; jede Meldung gegen Audit/edit.json verifizieren; bestaetigt -> fixen + 2. Render, sonst Upload. (b) vor dem Render: Musik anhoeren lassen (echte Sekunden von Bruch/Hoehepunkt, Gesang?), Stimmen (Aussprache von Namen/Zahlen). (c) Bilder optional.
- Nutzen: "Augen und Ohren", die Claude fehlen. Risiko: Fehlalarme -> nur nach Verifikation handeln; Kosten ~1-2 Cent/Video.

## P-5 – Lehren aus Gemini-Zuschauer-Test (Emu War, Score 6/10)  [OFFEN]
- Beobachtung: G3 nennt (1) Setup 10-16 s zu langsam (Szene "farmers call the army" + Ausruestung), (2) keine Sounds bei Schuessen/Ladehemmung/Emu-Chaos, (3) Ende mit Statistik statt Pointe.
- Vorschlag: (a) Writer-Regel: Kontext/Setup max. 2 Saetze, erste Aktion spaetestens bei ~10 s; (b) Sound Designer: Aktions-Szenen bekommen 1-2 Szenen-SFX (Schuss-Salve, Klick/Ladehemmung, Tierlaerm) ueber elevenlabs/sound-effects – auch ohne ZAP; dafuer ggf. Pool um "gunfire burst" und "mechanical click/jam" erweitern; (c) letzter Satz = Pointe (ironisch/ueberraschend), Zahlen davor.
- Nutzen: hoehere Retention/Interesse. Risiko: gering; (b) erfordert neue Pool-Sounds (Niklas hoert + laedt hoch).
