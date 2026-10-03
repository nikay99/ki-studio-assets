# Format „100 Years Evolution“ (Century)

Gleicher Ort, gleiche Kamera, 1925 bis 2025 in 10-Jahres-Schritten. Englisch, 9:16, ca. 16 s.

- `FORMAT.md`: Konzept, Ablauf, Epochen-Filter, Hook-Serien-Strategie, Lehren
- `prompt_template.md`: Prompts für Basisbild und Epochen-Edits
- `tools/build_century.py`: spec.json → Shotstack-Edit + Audit (`python3 tools/build_century.py spec.json edit.json`, Exit 1 = nicht rendern)
- `episodes/<slug>/`: eras.json, spec/edit je Version, notes.md (Videos liegen nicht im Repo)

Arbeitskopie im Claude-Projekt: `/mnt/project-files/formats/100-years-evolution/`.
