# KI-Studio Assets

Dauerhafte Assets für die KI-Studio Shorts-Pipeline (Shotstack lädt direkt über raw.githubusercontent.com).

## sfx/ (alle loudness-normalisiert)

| Datei | Einsatz | LUFS | Volume im Edit |
|---|---|---|---|
| punch.wav | Hook-Punch bei 0,00 s | -14 | 0.65 |
| whoosh_1.wav | Szenenwechsel (Rotation 1) | -18 | 1.0 |
| whoosh_2.wav | Szenenwechsel (Rotation 2) | -18 | 0.5 |
| whoosh_3.wav | Szenenwechsel (Rotation 3) | -18 | 0.8 |
| impact_box.wav | Einschlag zweite Hook-Box (rot) | -16 | 0.8 |
| zap.wav | Höhepunkt / ZAP!-Burst (Musik-Ducking auf 0.05) | -14 | 0.9 |
| gong_timeskip.wav | Zeitsprung-Karte („… LATER") | -18 | 0.8 |

Peaks, Clip-Längen und Volumes stehen maschinenlesbar in `tools/sfx.json` (einzige Quelle für Builder + Audit).

## tools/ – Builder & Audit

```bash
python3 tools/build_short.py spec.json edit.json   # Exit 0 = Audit grün → rendern; 1 = rot → NICHT rendern
python3 tools/audit_short.py edit.json edit.meta.json
```

Der Builder baut das abgenommene Design 1:1 (Referenz: `examples/slotin/edit_v9_approved.json`):
Hook-Boxen gelb/rot, Wort-Untertitel mit Keyword-Farben, ZAP-Höhepunkt, Zeitsprung-Karte,
A/B-Bildspuren (Überlappung nur unten), Whoosh-Peaks exakt auf Szenenschnitten, Hits, Musik-Ducking, CTA.

### spec.json (Beispiel: `examples/slotin/spec.json`)

| Feld | Inhalt |
|---|---|
| `hook.image` / `hook.image2` | Hook-Bild (dramatischster Moment) / Bild ab Wendungswort |
| `hook.voice`, `hook.timestamps` (oder `words`, `dur`) | Hook-Satz-Stimme + fal-Zeitstempel |
| `hook.turn_word` (Standard "And") oder `hook.turn_at` | Wendungswort → Box 2 + Schnitt + Einschlag |
| `hook.line1` / `hook.line2` | Box-Texte, z. B. `"THIS MAN SAVED\n7 LIVES."` (≤16 Zeichen/Zeile) / `"AND IT KILLED HIM."` (≤18) |
| `scenes[]` | `image`, `voice`, `timestamps` (fal `result.timestamps`) oder `words` `[[wort,start,ende]]`, optional `dur`, `sfx`, `sfx_vol`, `focus` (top/center/bottom), `kenburns` (in/out) |
| `keywords.red` / `.yellow` | Gefahr/Schock-Wörter / Zahlen & Jahre |
| `zap` | `{"word": "flash", "text": "ZAP!"}` – Wort in der Narration |
| `card` | `{"text": "NINE DAYS LATER...", "phrase": "nine days later"}` – ersetzt die Untertitel dieser Phrase |
| `music` | Musik-URL (loudnorm), Volume 0.18 |
| `music_prompt` (Doku) | Kompletter Prompt der generierten Musik (wird nicht gebaut, nur fuer Journal/Review) |
| `sound` (optional) | Auswahl aus dem Pool je Kategorie: `opener`, `whooshes` (Liste, rotiert), `impact`, `climax` (passend zum Lautwort), `riser` (endet auf dem Hoehepunkt, optional), `timeskip`. Fehlende Felder = Standard (`tools/sfx.json` → `defaults`). |

## Neue Sounds
`python3 tools/measure_sfx.py sfx/<datei> <kategorie> [--word BOOM!] [--vol 0.9]` misst Peak/LUFS und traegt in `tools/sfx.json` ein. Kandidaten: `sfx/POOL_KANDIDATEN.md`.

## data/journal.md / data/proposals.md
Journal = Protokoll jedes Laufs. Proposals = Verbesserungsvorschlaege, nur nach Freigabe durch Niklas umsetzen; Fehlerbehebungen ohne Freigabe erlaubt.

## data/published.json
Liste aller produzierten Themen (Dedup für den täglichen Task). Nach jedem Upload ergänzen.
