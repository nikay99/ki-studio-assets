# Pflicht-Bildprüfung (Anatomie) – vor Stimme/Spec/Render

**Warum:** Lauf 02.10.2026 (Koepcke, Render fe071f63): Mehrere Bilder zeigten die Hauptfigur mit überzähligen Armen/Händen – Video ging online.
Claude erkennt Anatomie-Fehler **nicht zuverlässig**, Gemini im fertigen Video (G2) nur oberflächlich ("PASS"), Gemini auf Einzelbildern fand nur 1 von mehreren Fehlern.
Folge: **ein einzelnes Modell reicht nicht.** Prüfung = Vorbeugung + zwei unabhängige Modelle mit Veto + Neu-Erzeugung.

## 1. Vorbeugung (Art Director, beim Bild-Prompt)
- **Wenige Hände im Bild:** Pro Bild höchstens 1–2 Personen groß im Bild. Keine Menschengruppen im Vordergrund.
- **Einfache Posen:** Hände klar getrennt vom Körper und voneinander, oder außerhalb des Bildes / in Taschen / hinter dem Rücken / vom Rahmen abgeschnitten. Vermeiden: verschränkte Arme, Hände am Gesicht, Händeschütteln, Umarmen, zwei Personen berühren sich, Hände um Gegenstände mit komplizierter Griffhaltung, Person liegt/hängt verdreht.
- **Prompt-Zusatz in jedem Bild mit Menschen (an den STYLE-Suffix anhängen):**
  `ANATOMY (mandatory): every person has exactly two arms, two hands and five fingers per hand, all clearly attached to the correct shoulder; no extra or duplicated limbs, no floating hands, no limbs shared between people.`
- **Figurenbild zuerst prüfen:** Folgebilder entstehen per `edit` aus dem Figurenbild → ein Fehler dort wandert in alle Szenen. Das Figurenbild wird geprüft, bevor es als Referenz benutzt wird.
- Für Folgebilder lieber Kopf/Oberkörper-Ausschnitte oder Halbtotale mit Händen außerhalb, wenn die Szene es erlaubt.

## 2. Prüfung (jedes Bild: Hook, image2, jede Szene, auch nachgebesserte)
Endpunkt `openrouter/router/vision` über `mcp__fal_ai__run_model`, `image_urls: [<bild>]`, **blind** (keinen Fehler vorsagen), temperature 0.2, max_tokens 6000.
**Zwei Modelle parallel, unabhängig:**
| Prüfer | model | Pflichtfelder | Kosten |
|---|---|---|---|
| A | `google/gemini-3.8-flash` | `reasoning: true` | ~0,25–0,5 Cent |
| B | `openai/gpt-6-sol` | – | ~0,25–0,5 Cent |
| Schiedsrichter (nur bei UNSURE) | `anthropic/claude-opus-5.5` | `reasoning: true` (Pflicht) | ~3 Cent |

**Vorlage G0 (Englisch, Antwort nur JSON):**
- system: `You are a forensic anatomy inspector for AI-generated comic illustrations. Image generators very often draw a third arm, an extra hand, a hand growing out of the wrong place, two hands holding one object from impossible angles, six fingers, or a limb shared by two people. Your job is to find these. Never assume a limb is correct until you have traced it. Answer in English, JSON only.`
- prompt: `Check only PROMINENT figures: every human or animal whose body is at least about 1/8 of the image height (ignore tiny background crowds). Step 1: list the prominent figures. Step 2: for each figure, start at EACH shoulder and follow the arm to its hand; then search the whole image for any hand, forearm or arm that you did NOT reach from a shoulder (these orphan limbs are the most common error). Do the same for hips->legs->feet. Step 3: count fingers on every clearly visible hand. Return JSON: {"figures":[{"id","where","shoulders_traced":[{"shoulder":"left|right","ends_in":"hand|hidden|cut off by frame"}],"arms_total","hands_total","orphan_limbs":[str],"finger_issues":[str],"other_anomalies":[str]}],"verdict":"PASS|FAIL|UNSURE","issues":[{"figure","where_in_image","description"}]}. FAIL if any figure has more than 2 arms or 2 hands, any orphan limb, any hand with clearly wrong finger count, or limbs merging into another body/object. UNSURE only if a prominent figure's hand area is unreadable.`

**Entscheidung (Veto-Regel, kein Mehrheitsentscheid):**
- **Beide PASS** → Bild freigegeben.
- **Mindestens einer FAIL** → Bild verworfen (Fehlalarm lieber in Kauf nehmen: ein neues Bild kostet wenige Cent, ein kaputtes Video den Kanal).
- **UNSURE (ohne FAIL)** → Schiedsrichter Opus mit derselben Vorlage; FAIL/UNSURE → verwerfen, PASS → frei.
- Zusätzlich: Zählt ein Prüfer bei einer Person `arms_total` > 2 oder `hands_total` > 2 → FAIL, auch wenn er selbst PASS schreibt.

## 3. Neu erzeugen
- Verworfenes Bild **neu erzeugen, nicht per edit "reparieren"** (edit übernimmt Fehler oft). Prompt vereinfachen: Hände aus dem Bild nehmen oder einfache Pose (Abschnitt 1), Figur per `edit` + `image_urls` [geprüftes Figurenbild] bleibt erlaubt.
- Danach erneut beide Prüfer. Max. **3 Versuche** pro Bild; danach Komposition ändern (Hände außerhalb, Rückenansicht, Detail/Objekt statt Person).
- Ist ein Figurenbild betroffen: zuerst Figurenbild neu + prüfen, dann abhängige Szenenbilder neu.

## 4. Dokumentation
- In der spec je Bild ein Feld `image_check` (Builder ignoriert es): `{"A": "PASS|FAIL|UNSURE", "B": ..., "referee": ..., "attempts": n}`.
- Journal: Anzahl verworfener Bilder + typische Fehler. Wiederkehrende Muster (z. B. "Händeschütteln immer kaputt") → Vorschlag in `data/proposals.md`.
- G2 (Video-QA) prüft weiter Punkt 8 "deformed faces/hands" – ist aber **kein Ersatz** für diese Prüfung.

## 5. Kalibrierung / Grenzen
- Stand 02.10.2026: Ablauf + Kosten getestet (Emu-War-Bilder, alle 3 Modelle stimmen bei einfachen Bildern überein). **Trefferquote auf echten Fehlerbildern noch nicht gemessen** – Koepcke-Bilder (Niklas: Fehler in mehreren Bildern, Gemini allein fand nur Szene 4) sind der Kalibrier-Satz. Ergebnis hier nachtragen (je Modell: gefunden / übersehen / Fehlalarme).
- Wenn die Kalibrierung zeigt, dass auch das Paar Fehler übersieht: Opus immer als dritten Prüfer mitlaufen lassen (~3 Cent/Bild) bzw. Prüfung auf Bildausschnitte (Kacheln) erweitern.
