# Episode: NYC Taxis (03.10.2026)

- Render v1: Shotstack 84da6d8c-fe90-42fb-808d-18c826125358, 17,4 s, 1080x1920, −17,1 LUFS
  https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/rwr9s5liin/84da6d8c-fe90-42fb-808d-18c826125358.mp4
- Kosten ca.: 12 Bilder GPT Image 2.5 Flare (je ~3–5 ct) + Musik + 1 SFX + Render 0,29 $ + Gemini ~2 ct ≈ 0,80 $
- Bildprüfung (Gemini, alle 11 Bilder): 10× PASS, 1935 UNSURE (Leuchtschild evtl. „LUNCHEONETTT“, nur 1,3 s sichtbar, gelassen). Hinweis: Fenster-Klimageräte in 1925/1945 zu früh (klein, gelassen).
- Video-QA (Gemini G2/G3): PASS, keine Text-/Schnittfehler, Audio ausgewogen, kein Clipping. Hook „would stop scrolling: yes“, Interesse 6,5/10, Swipe-Risiko um 8 s (Mitte wirkt gleichförmig).
- Upload: noch NICHT, wartet auf GO von Niklas.

## Lehren für die nächste Episode
1. Pro Epoche ein kurzer Epochen-Sound (Oldtimer-Hupe 1925, Checker-Motor 1965, Hip-Hop-Boombox 1985 …) zusätzlich zum Shutter → Mitte lebendiger.
2. Am Ende 1 s Split-Screen 1925 | 2025 vor der CTA-Frage (Vorher/Nachher-Payoff, Rewatch).
3. Mitte etwas schneller (1,1 s statt 1,3 s), Anfang/Ende bleiben.

## v2 (03.10.2026)
- Render cf2e882f-583d-44cd-abef-3a78f5e80405, 16,2 s, −14,7 LUFS / −0,3 dBTP.
- URL: https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/rwr9s5liin/cf2e882f-583d-44cd-abef-3a78f5e80405.mp4
- Neu: 11 Epochen-Sounds, neue Musik (Hit auf 12,1 s), Mitte 1,1 s, Split-Screen 1925|2025 ab 13,6 s mit CTA.
- Fehler im ersten v2-Render (eef8bb27): `crop` + width/height auf Bild-Clips setzt Shotstack nicht wie erwartet um, 1925 landete als Streifen in der Mitte. Lösung im Builder: 1925-Vollbild mit offset.y = 0.5 (untere Bildhälfte = Taxi oben), 2025 läuft darunter weiter (Taxi unten), gelbe Trennlinie.
- Zusatzkosten v2: ca. 0,25 $ (11 SFX, Musik, 2 Renders).
- Upload: 03.10.2026 12:04 privat über Make 7731897 (Execution 0a79940c95d544f2bf7845e80b114534, SUCCESS) nach GO von Niklas.

## v3 (03.10.2026, Layout nach Niklas' iPhone-Screenshots)
- Problem v2: Jahreszahl oben wurde von Notch/Shorts-Leiste verdeckt, 1925/2025-Labels im Split an den Rändern abgeschnitten bzw. unter Kanalname/Titel.
- Fix: Jahreszahl + Modell mittig direkt über dem Auto (year_y 0.02, label_y −0.055), Hook bei y 0.2, Split-Labels zentriert über/unter der CTA (±0.13). Neu im Builder als `layout` in spec.json.
- Render 5bc501c3-dba3-4562-b7e8-487e0f6579f9, 16,2 s: https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/rwr9s5liin/5bc501c3-dba3-4562-b7e8-487e0f6579f9.mp4
