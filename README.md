# Projects-2026

Mission Control 2026 ist ein auf Vercel deploybares Dashboard, das Projekte und Updates jetzt direkt in Supabase speichert. Lokale Platzhalterdaten wurden entfernt; ohne gültige Supabase-Keys lassen sich keine Projekte anlegen.

## Features (aktuelle Version ohne KI)
- Kompakter, sticky Header mit Theme-Toggle, Schnellaktionen und Kennzahlen (geloggte Minuten, letztes Update)
- Tab-Navigation für **Fokus**, **Übersicht** (Queue & Archiv) und **Updates/Charts** – Buttons liegen platzsparend nebeneinander
- Fokus zeigt nur aktive Projekte (max. 3), Übersicht bündelt pausierte/queued Projekte und abgeschlossene Missionen
- Light/Dark-Theme mit Persistenz (Settings in Supabase)
- Gatekeeper: maximal **drei aktive Projekte** gleichzeitig
- Projekt-CRUD (anlegen, aktivieren/pausieren/abschließen, löschen) mit Supabase-Persistenz
- Update-Modal mit Quick-Chips (+15/+25/+50 Minuten) und vorgewählter aktueller Zeit
- Balkendiagramm (Minuten pro Projekt) und 14-Tage-Heatmap

## Schnellstart (lokal)
1. Voraussetzungen: Node.js ≥ 18, Python (für den lokalen Static-Server).
2. Supabase-Keys bereitstellen: Lege eine `env.js` im Projektwurzelverzeichnis an (nicht eingecheckt) mit folgendem Inhalt:
   ```js
   window.env = {
     NEXT_PUBLIC_SUPABASE_URL: "https://<your-project>.supabase.co",
     NEXT_PUBLIC_SUPABASE_ANON_KEY: "<anon-key>"
   };
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
- Framework: „Other“/static, Build Command: `npm run build`, Output: Projektdir.
- Lege im Build-Schritt eine `env.js` an, z.B. per Custom Build Command:
  ```bash
  echo "window.env={NEXT_PUBLIC_SUPABASE_URL:'$NEXT_PUBLIC_SUPABASE_URL',NEXT_PUBLIC_SUPABASE_ANON_KEY:'$NEXT_PUBLIC_SUPABASE_ANON_KEY'};" > env.js
  npm run build
  ```
- Keys gemäß `instructions.md`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `SUPABASE_DB_PASSWORD`.

## Dateien
- `index.html`: UI-Shell und Views
- `styles.css`: Theme, Layout, Komponenten
- `src/state.js`: Business-Logik, Gatekeeper, Heatmap-Berechnung
- `src/persistence.js`: Supabase-Persistenz (Projects, Logs, Settings)
- `src/main.js`: DOM-Rendering und Event-Handling
