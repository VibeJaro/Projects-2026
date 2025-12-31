# Projects-2026

Mission Control 2026 ist ein auf Vercel deploybares Dashboard, um Projekte zu planen, Updates zu loggen und Fortschritt ohne KI-Features sichtbar zu machen. Die App läuft vollständig im Browser (Local Storage) und ist Supabase-ready, sobald die Keys hinterlegt werden.

## Features (aktuelle Version ohne KI)
- Kompakter, sticky Header mit Theme-Toggle, Schnellaktionen (+Update/+Projekt) und Minuten-/Update-Übersicht
- Tab-Navigation für **Fokus**, **Übersicht** (Warteliste & Abgeschlossen) und **Updates & Charts**
- Fokus zeigt ausschließlich aktive Projekte (max. 3), die Übersicht bündelt pausierte, wartende und fertige Projekte mit gleichmäßigen Kachelabständen
- Light/Dark-Theme mit Persistenz
- Gatekeeper: maximal **drei aktive Projekte** gleichzeitig
- Projekt-CRUD (anlegen, aktivieren/pausieren/abschließen, löschen)
- Update-Modal mit Quick-Chips (+15/+25/+50 Minuten) und vorbefüllter Datums-/Uhrzeitangabe
- Balkendiagramm (Minuten pro Projekt), 14-Tage-Heatmap und AI-Report-Platzhalter
- Seed-Daten zum schnellen Testen

## Schnellstart (lokal)
1. Voraussetzungen: Node.js ≥ 18, Python (für den lokalen Static-Server).
2. Abhängigkeiten sind nicht nötig. Optional kannst du den Lock synchronisieren:
   ```bash
   npm install --package-lock-only
   ```
3. Development-Server starten (Port 3000):
   ```bash
   npm run dev
   ```
4. Browser öffnen: http://localhost:3000

## Tests
```bash
npm test
```
Die Tests prüfen u.a. den Gatekeeper (max. 3 aktive Projekte), Log-Verhalten und die Heatmap-Generierung.

## Vercel-Deployment
- Framework: „Other“/static, Build Command: `npm run build` (nur Platzhalter), Output: Projektdir.
- Falls du Supabase anbinden möchtest, nutze die Keys aus der `instructions.md` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` usw.).

## Dateien
- `index.html`: UI-Shell und Views
- `styles.css`: Theme, Layout, Komponenten
- `src/state.js`: Business-Logik, Gatekeeper, Heatmap-Berechnung
- `src/persistence.js`: Local-Storage-Persistenz & Seed-Daten
- `src/main.js`: DOM-Rendering und Event-Handling
