# Format: 100 Years Evolution

Eigenes Shorts-Format, getrennt vom Story-Format (Skill `ki-studio-short`). Zuständig: der Thread „100 Years Evolution“. Gemeinsame Werkzeuge: fal (Bilder, Musik, SFX), Shotstack (Render), Make (Upload, privat).

## Idee
Ein fester Ort, eine feste Kameraposition, 100 Jahre in 10-Jahres-Schritten. Was bleibt: Gebäude, Straßenecke, Bildausschnitt, Position des Hauptobjekts. Was sich ändert: das Hauptobjekt (z. B. Taxi), Laternen, Ampeln, Läden, Menschen/Mode, Nachbarbebauung und der Fotolook der Epoche. Englisch, US-Publikum, 9:16, 15–20 s, ohne Sprecher.

## Aufbau eines Videos (Standard 17,4 s)
| Zeit | Inhalt |
|---|---|
| 0,0–2,2 s | 1925-Bild + Hook-Text („Same NYC corner. 100 years of taxis.“), Jahreszahl oben, Modellname darunter |
| 2,2–13,9 s | 9 Epochen à 1,3 s, Überblendung 0,4 s, Kamerablitz + Shutter-Klick auf jedem Schnitt |
| 13,9–17,4 s | 2025-Bild, Impact-Hit, ab 14,9 s CTA-Frage („Which year would you ride in?“) |

Durchgehend: langsamer, kontinuierlicher Zoom (über alle Bilder hinweg, kein Sprung), gelber Fortschrittsbalken unten, der bei 2025 voll ist. Musik: Stable Audio 3, „Zeitreise“-Bogen (Vintage-Piano → moderne Drums), Hit auf dem letzten Schnitt.

## Bild-Pipeline (der Kern)
1. **Basisbild 2025** mit `openai/gpt-image-2.5/flare/text-to-image`, 1024x1824, Prompt legt fest: Stativ auf Augenhöhe, Hauptobjekt im unteren Drittel in Dreiviertelansicht, markantes Bestandsgebäude (vor 1925 gebaut!) in der Mitte, Laterne am linken Rand, austauschbare Nachbarbebauung rechts.
2. **Jede Epoche = Edit vom Basisbild** (`openai/gpt-image-2.5/flare/edit`, immer dasselbe Basisbild als Referenz, nicht verkettet → kein Drift). Vorlage in `prompt_template.md`.
3. 2025 selbst ebenfalls als Edit (entfernt Markenlogos aus dem Basisbild).
4. Bildprüfung: jedes Bild ansehen (Anachronismen, Anatomie, verschobene Kamera). Fehler → nur diese Epoche neu.

Kosten pro Video: 12 Bilder GPT Image (je ca. 3–5 Cent) + Musik + 1 SFX + Render ≈ 0,60–0,90 $.

## Epochen-Filter (Fotolook)
| Jahr | Look |
|---|---|
| 1925 | Silbergelatine-Glasplatte, Sepia, weiches Objektiv, starkes Korn, Vignette, Staub |
| 1935 | S/W Leica 35 mm, hoher Kontrast, feines Korn |
| 1945 | S/W Pressefoto 4x5 (Speed Graphic), knackig, Halation |
| 1955 | Kodachrome-Dia, satte Rot-/Gelbtöne, warm |
| 1965 | Ektachrome-Dia, Cyan in den Schatten, angehobene Schwarztöne |
| 1975 | verblasster Kodacolor-Abzug, Orange/Magenta-Stich, weich |
| 1985 | 35-mm-Consumer-Film (Fujicolor), kräftig, grünliche Schatten |
| 1995 | Einwegkamera, leicht überbelichtet, warm, weiche Ecken |
| 2005 | frühe Digicam 5 MP, Rauschen, Überschärfung, ausgebrannter Himmel |
| 2015 | Smartphone-HDR, übersättigt, Halos |
| 2025 | moderne Vollformat-Kamera, neutral |

## Hook-Serien-Strategie
- Serienname im Titel: „… 100 Years on the Same Corner/Spot“. Gleiches Layout, gleicher Sound → Wiedererkennung, Zuschauer bingen die Reihe.
- Hook in den ersten 0,5 s: Jahreszahl groß + Versprechen („Same corner. 100 years.“). Keine Einleitung.
- Kommentar-Köder am Ende: „Which year would you ride in / live in / eat here?“
- Loop-freundlich: kurzes Video, Ende auf 2025, Anfang 1925 → hoher Re-Watch.
- Ideen-Pool (US-fokussiert): NYC Taxis ✔, Times Square, Route 66 Diner, Gas Station on Main Street, Las Vegas Strip, Chicago L-Train Corner, American Kitchen, American Living Room, Classroom, Fast-Food Counter, School Bus Stop, Police Car on the Corner, Hollywood Boulevard, Brooklyn Bridge Walkway, San Francisco Cable Car, Miami Beach Ocean Drive, Supermarket Aisle, Baseball Stadium Seats, Fire Truck at the Station, Mailbox & Mailman.
- Optional später: Teil 2 „2025 → 2125“ (Zukunft) als Fortsetzungs-Hook.

## Dateien
- `tools/build_century.py` – spec.json → Shotstack-Edit + Audit (Exit 1 = nicht rendern)
- `prompt_template.md` – Prompt-Vorlagen Basisbild + Epochen-Edit
- `episodes/<slug>/` – eras.json (Prompts), spec.json, edit.json, Ergebnis
- Upload: Make-Szenario 7731897 (privat), erst nach GO von Niklas.

## Lehren
Pro Episode in `episodes/<slug>/notes.md`. Stand nach NYC Taxis: Epochen-Sound pro Jahrzehnt, Split-Screen 1925|2025 vor der CTA und 1,1 s statt 1,3 s in der Mitte werden ab der nächsten Episode Standard.
