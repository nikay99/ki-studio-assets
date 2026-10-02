# Gemini – Coworker (Augen + Ohren)

Claude kann weder Video sehen noch Audio hoeren. Gemini (`google/gemini-3.8-flash` ueber fal/OpenRouter) kann beides.
Mit Gemini **immer auf Englisch** kommunizieren, Antworten **nur JSON**. Kosten ~0,5-1 Cent pro Aufruf.

## Endpunkte (alle ueber `mcp__fal_ai__run_model`, Shell kommt nicht an fal)
| Zweck | endpoint_id | Pflichtfelder |
|---|---|---|
| Video ansehen + anhoeren | `openrouter/router/video` | `model`, `prompt`, `video_urls: [..]`, **`reasoning: true`** (Pflicht bei Gemini) |
| Nur Audio | `openrouter/router/audio` | `model`, `prompt`, `audio_url`, `reasoning: true` |
| Nur Text | `openrouter/router` | `model`, `prompt`, `reasoning: true` |

Empfohlen: `temperature 0.2-0.3`, `max_tokens 6000-8000`.
**Video vorher verkleinern** (sonst "Payload Too Large"): `fal-ai/workflow-utilities/scale-video` mit `width 540, height 960, crf 30, preset fast` (~6 MB).

## Was Gemini kann – Stand Test 02.10.2026 (Emu War)
| Aufgabe | Verlaesslich? | Beleg |
|---|---|---|
| Sichtbare Fehler im fertigen Video (Text abgeschnitten/umgebrochen, Lesbarkeit, Bildfehler, Wasserzeichen) | **ja** | fand 'THE INVULNERABILITY' umgebrochen (echt, Niklas bestaetigt), v2 korrekt gruen |
| Zuschauer-/Retention-Urteil (Hook, Langeweile-Stellen, Payoff) | **gut als zweite Meinung** | plausible, konkrete Hinweise (Setup zu lang, fehlende Action-SFX, schwache Pointe) |
| Untertitel-Sync auf < 0,5 s | **nein** | Zeitauflösung grob → Sync bleibt beim rechnerischen Audit |
| Musik-Struktur/Timing (wo ist der Bruch?) | **nein** | mit Vorgabe: wiederholt nur die Vorgabe; blind: voellig andere Struktur, falsche Dauer |
| Gesang in Musik ja/nein | unsicher, nur Hinweis | beide Laeufe "no vocals" (korrekt), aber nicht unabhaengig belegt |
| Qwen 3.8 Omni Flash (Vergleich) | **nein** | 4 von 4 Meldungen falsch |

**Grundregel:** Jede Gemini-Meldung ist ein Hinweis, kein Urteil. Vor jeder Aktion verifizieren:
`python3 tools/qa_at.py edit.json <sekunde>` zeigt, was zu dem Zeitpunkt laut Edit im Bild/Ton ist (Untertitel inkl. geschaetzter Breite, Boxen, Bild, Sounds).
Bestaetigt → beheben (Spec/Builder) und 2. Render. Nicht bestaetigt → im Journal als Fehlalarm notieren.
Gemini nie vorgeben, was es hoeren/sehen "soll" (Echo-Gefahr) – erst blind fragen, dann vergleichen.

## Prompt-Vorlagen

### G1 – Story-Test (vor der Produktion, Text, `openrouter/router`)
Showrunner gibt 3 Kandidaten (Thema + Hook-Satz + Twist in 1 Satz):
- system: "You are a typical 16-30 year old YouTube Shorts viewer and an experienced Shorts retention editor. Be honest, do not flatter. Answer in English, JSON only."
- prompt: "Here are 3 candidate true-story Shorts (30-40 s, comic style, English voiceover). For each: would you stop scrolling on the hook? Is the twist surprising or already widely known? Return JSON: {\"ranking\": [ids best first], \"per_candidate\": [{\"id\", \"hook_stop_1_to_10\", \"surprise_1_to_10\", \"already_overdone\": bool, \"sharper_hook\": str}], \"pick\": id, \"why\": str}. Candidates: ..."
Showrunner entscheidet (Gemini beraet), Begruendung ins Journal.

### G2 – Technik-QA (nach dem Render, Video) – PFLICHT vor Upload
- system: "You are a strict QA reviewer for vertical YouTube Shorts (comic/pop-art style, English voiceover). Watch AND listen to the whole video. Only report what you actually see or hear, with timestamps in seconds. Never invent issues; if unsure, say 'unsure'. Answer in English, JSON only."
- prompt: "Check this Short (~<LAENGE> s). Note: the white flash at 0-0.3 s is intentional. Return JSON: {\"verdict\": \"PASS|FAIL\", \"issues\": [{\"t_s\", \"category\", \"description\", \"severity\": \"high|medium|low\"}], \"notes\": str}. Check: 1) on-screen text cut off, wrapped onto two lines, overlapping, or hidden in the bottom ~22 %; 2) captions match the spoken words (ignore offsets below 0.5 s); 3) black frames, flicker, wrong cuts; 4) hook boxes readable (<BOX1> / <BOX2>); 5) time-skip card '<KARTE>' readable; 6) music too loud versus voice, singing in the music; 7) sound effects audible, not clipping; 8) images: text/letters inside artwork, deformed faces/hands, wrong era; 9) CTA in the last 2 s readable; 10) watermark."

### G3 – Zuschauer-Test (nach dem Render, Video) – PFLICHT, beratend
- system: wie G1
- prompt: "Watch this Short as a viewer scrolling the feed. Return JSON: {\"hook_0_3s_would_stop_scrolling\": \"yes|maybe|no\", \"hook_reason\": str, \"curiosity_gap_clear\": bool, \"swipe_risk_moments\": [{\"t_s\", \"why\"}], \"most_engaging_moment\": {\"t_s\", \"why\"}, \"payoff_satisfying\": \"yes|partly|no\", \"payoff_reason\": str, \"interest_score_1_to_10\": number, \"top_3_changes_for_more_retention\": [str], \"title_ideas\": [str]}"
Nutzung: Score + Aenderungen ins Journal. Billige Fixes (Titel, Beschreibung) sofort; inhaltliche Punkte (Szene zu lang, fehlende Sounds) nur mit 2. Render, wenn ohnehin noetig – sonst als Lehre fuer das naechste Video ("Lehren" im Journal), wiederkehrende Muster als Vorschlag.

### G4 – Bild-Zweitmeinung (optional, vor dem Render)
Szenenbilder einzeln als Video gibt es nicht; Bilder prueft Claude selbst (kann Bilder sehen). Gemini nur bei Unsicherheit ueber den `openrouter/router` Text-Endpunkt mit Bild-URL, falls unterstuetzt – sonst weglassen.
