## Supabase-Anbindung
- Local-Storage-Seed-Daten entfernt; Projekte, Logs und Theme werden direkt aus Supabase geladen.
- Neuer Persistence-Layer (`src/persistence.js`) für Projekte/Logs/Settings plus Write-Script (`scripts/write-env.js`), das `env.js` aus `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` generiert.
- Theme-Persistenz wandert in die Supabase-Settings-Tabelle; fehlende Keys werden per Toast gemeldet.

## UI/UX Refresh (bisheriger Stand)
- Sticky Header schlanker (max. 1/3 der Mobile-Höhe) mit Branding „MISSION CONTROL 2026“, Kennzahlen (Minuten, letztes Update als Datum) und kompakten Schnellaktionen (Theme, +Update, +Projekt).
- Tabs umbenannt/zusammengezogen: **Fokus**, **Übersicht** (Queue, pausiert, abgeschlossen) und **Updates/Charts**.
- Fokus zeigt nur aktive Projekte (max. 3 Kacheln ohne Zusatztexte), Übersicht bündelt jetzt alle Projekte (aktiv, wartend, pausiert, abgeschlossen) mit gleichmäßigen Kachelabständen.
- Log-Modal nutzt jetzt standardmäßig Datum/Zeit „jetzt“.
- Updates/Charts reduziert auf Diagramme plus AI-Report-Platzhalter; Seed-Button und Erklärtexte entfernt.
- Projekt-Kacheln zeigen nur noch den primären Status-Badge (oben links); doppelte Statuslabels entfernt.
