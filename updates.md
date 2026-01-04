## Supabase-Anbindung
- Local-Storage-Seed-Daten entfernt; Projekte, Logs und Theme werden direkt aus Supabase geladen.
- Neuer Persistence-Layer (`src/persistence.js`) für Projekte/Logs/Settings plus Write-Script (`scripts/write-env.js`), das `env.js` aus `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` generiert.
- Theme-Persistenz wandert in die Supabase-Settings-Tabelle; fehlende Keys werden per Toast gemeldet.

## UI/UX Refresh (bisheriger Stand)
- Sticky Header schlanker (max. 1/3 der Mobile-Höhe) mit Branding „MISSION CONTROL 2026“, Kennzahlen (Minuten, letztes Update als Datum) und kompakten Schnellaktionen (Theme, +Update, +Projekt).
- Tabs umbenannt/zusammengezogen: **Fokus**, **Übersicht** (Queue, pausiert, abgeschlossen) und **Updates/Charts**.
- Fokus zeigt nur aktive Projekte (max. 3 Kacheln ohne Zusatztexte), Übersicht bündelt jetzt alle Projekte (aktiv, wartend, pausiert, abgeschlossen) mit gleichmäßigen Kachelabständen.
- Größere vertikale Abstände zwischen den übergeordneten Kacheln (Projekt anlegen, Aktiv, Wartend & pausiert, Abgeschlossen) sowie zwischen „Letzte 14 Tage“ und „AI Report“ für klarere Gliederung.
- Log-Modal nutzt jetzt standardmäßig Datum/Zeit „jetzt“.
- Updates/Charts reduziert auf Diagramme plus AI-Report-Platzhalter; Seed-Button und Erklärtexte entfernt.
- Projekt-Kacheln zeigen nur noch den primären Status-Badge (oben links); doppelte Statuslabels entfernt.

## Projekt-Logs & Mobile UX
- Projektkarten (Fokus & Übersicht) öffnen per Tap/Klick ein Log-Fenster mit allen Einträgen des Projekts. Das Overlay zeigt Minuten, Zeitstempel und Notizen im Vollbild-Scrollbereich, optimiert für Smartphones.
- Beim Schreiben eines Updates oder beim Betrachten des Logs schrumpft der Sticky Header, damit er auf dem Handy nicht mehr in den Update-/Log-Bereich hineinragt.
- Popups starten jetzt unterhalb des Sticky Headers, damit keine Inhalte mehr dahinter verschwinden – insbesondere auf Smartphones.

## KI-Fokus-Update (GPT-5.2)
- Neues Panel im Tab „Updates/Charts“ mit Button „AI-Update abrufen“.
- Schickt gesamten Kontext (Projekte, Logs, Settings, Kennzahlen) plus optionalen Custom Prompt an GPT-5.2 und liefert kompakte Fokus-Vorschläge (Speed, Kreativität, Verbindungen, leichte Zusatzideen).
- Konfiguration via `OPENAI_API_KEY` (optional `OPENAI_API_BASE`) in `env.js`/Env Vars; Fallback-Statusmeldungen bei fehlendem Key oder API-Fehlern.
