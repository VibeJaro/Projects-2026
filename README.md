# Projects-2026

Mission Control 2026 ist ein mobiles, auf Vercel deploytes Dashboard, um 2026-Projekte zu planen, zu fokussieren und Fortschritt in Supabase zu speichern.

## Funktionsübersicht (Design Draft)
- **Navigation & Theming**: Untere Tab-Navigation mit den Bereichen Fokus (Today), Queue und Daten sowie ein Theme-Toggle (Light/Dark).
- **Fokus-Ansicht**: Zeigt aktive/pausierte Projekte mit Status-Badges, Gesamtzeit, Ziel und Aktionen (Log erfassen, Pause/Fortsetzen, Abschließen).
- **Queue-Ansicht**: Neue Projekte erstellen, aktivieren (Gatekeeper-Logik mit max. 3 aktiven Projekten), löschen oder Details öffnen.
- **Projektdetails & Logbuch**: Projektname/Ziel bearbeiten, Gesamtinvestition anzeigen, chronologische Logs einsehen; von hier zurück zur Fokus-Ansicht navigieren.
- **Fortschritts-Logging**: Modales Sheet mit Zeit-Selektor (±10 min, Quick-Chips), Notizfeld, Speichern und Abbruch.
- **AI Report**: Modal „Mission Intelligence“ generiert einen zusammengefassten Statusbericht und bietet „Kopieren/Teilen“.
- **Stats/Intelligence**: Heatmap der letzten 14 Tage, Balkenchart für Fokusverteilung (Top 5 Projekte), KI-Report-Trigger und DB-Reset-CTA.
- **Gatekeeper**: Wenn 3 aktive Projekte erreicht sind, müssen Projekte pausiert oder abgeschlossen werden, bevor ein neues aktiviert wird.
- **Data Layer (Supabase-ready)**: State für Projekte, Logs und Settings; unterstützt Create/Read/Update/Delete für Projekte, Logs und Settings sowie Theming-Persistenz.

## Projektziele
- Fokus-Management für maximal drei aktive Projekte gleichzeitig.
- Transparente Fortschritts-Visualisierung (Heatmap + Balkencharts).
- Schnelles Logging mit minimalen Klicks und KI-gestützter Zusammenfassung.

Weitere Setup-Details findest du in der `instructions.md`.
