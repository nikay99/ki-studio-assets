# Prompt-Vorlagen „100 Years Evolution“

## 1. Basisbild (Jahr 2025), `openai/gpt-image-2.5/flare/text-to-image`, image_size 1024x1824, quality high, jpeg
```
Authentic street photograph, vertical 9:16, shot from a fixed tripod at eye level (about 1.6 m) on the sidewalk of {PLACE} in 2025, looking diagonally across {SPOT}. FOREGROUND (bottom third): {SUBJECT_2025} seen in three-quarter front view, filling the lower half of the frame. LEFT EDGE: {LEFT_ANCHOR}. BACKGROUND: {LANDMARK — must exist since before 1925}; to its right {REPLACEABLE_NEIGHBOR}. {PEOPLE/STREET_2025}. Overcast soft daylight, natural colors. Shot on a modern full-frame mirrorless camera, 35mm lens, f/5.6, crisp detail, realistic, no text overlays, no watermark.
```

## 2. Epochen-Edit, `openai/gpt-image-2.5/flare/edit`, image_urls = [Basisbild], gleiche image_size
```
Edit this photograph. Keep the EXACT same camera position, lens, framing, perspective and horizon line. Keep the same {LANDMARK} at the same place and size. Keep the curb line, sidewalk edge and street corner at the same place. The {SUBJECT} stays at exactly the same position, size and three-quarter angle in the foreground, filling the lower half. The {LEFT_ANCHOR} stays at the left edge in the same place. Turn the scene into {CITY} in the year {YEAR}. {SUBJECT}: {era subject}. Street furniture: {era street furniture + explicit 'no X' for later inventions}. Right side: {era neighbor}. Ground floor: {era shop}. People and street: {era fashion/vehicles}. Everything else must be period-correct for {YEAR} with no anachronisms. Photographic look: {era filter from FORMAT.md}. Authentic real photograph taken in {YEAR}, no text overlays, no watermark, no borders.
```

## Regeln
- Immer vom selben Basisbild editieren, nie Epoche aus Epoche (Drift).
- Spätere Erfindungen pro Epoche ausdrücklich verbieten („no countdown, no bike dock, no kiosk“).
- Nachbarbebauung bewusst wechseln lassen (z. B. Mietshaus → Art-déco-Turm → 60er-Bürobau → Glasturm), das macht die Entwicklung sichtbar.
- Echte Markennamen im Prompt vermeiden („no real brand“), Fahrzeugmodelle dürfen genannt werden.
- Ein Edit kostet ca. 3–5 Cent; nur fehlerhafte Epochen neu machen.
