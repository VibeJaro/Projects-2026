# Projects-2026

Mission Control 2026 ist ein Supabase-gestütztes Dashboard auf Vercel, um Projekte zu planen, Updates zu loggen und Fortschritt sichtbar zu machen. Alle Daten (Projekte, Logs, Theme) werden in Supabase gespeichert – es gibt keine lokalen Seed-Platzhalter mehr.

## Features (aktuelle Version ohne KI)
- Kompakter, sticky Header mit Theme-Toggle, Schnellaktionen und Kennzahlen (geloggte Minuten, letztes Update als Datum)
- Tab-Navigation für **Fokus**, **Übersicht** (Queue & Archiv) und **Updates/Charts**
- Fokus zeigt nur aktive Projekte (max. 3), Übersicht bündelt jetzt **alle** Projekte (aktiv, wartend, pausiert, abgeschlossen)
- Light/Dark-Theme mit Persistenz in der Supabase-Settings-Tabelle
- Gatekeeper: maximal **drei aktive Projekte** gleichzeitig
- Projekt-CRUD (anlegen, aktivieren/pausieren/abschließen, löschen) mit Supabase-Persistenz
- Update-Modal mit Quick-Chips (+15/+25/+50 Minuten) und vorgewählter aktueller Zeit
- Balkendiagramm (Minuten pro Projekt) und 14-Tage-Heatmap

## Schnellstart (lokal)
1. Voraussetzungen: Node.js ≥ 18 und Python (für den lokalen Static-Server).
2. Supabase-Keys setzen:
   - Entweder Umgebungsvariablen `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen (werden via `npm run prepare-env` in `env.js` geschrieben).
   - Oder `env.example.js` nach `env.js` kopieren und URL/Anon-Key direkt eintragen (Datei ist .gitignored).
3. Tabellen & Policies anlegen: SQL aus `instructions.md` im Supabase SQL Editor ausführen und RLS einschalten.
4. Dev-Server starten (schreibt `env.js` automatisch):
   ```bash
   npm run dev
   ```
5. Browser öffnen: http://localhost:3000

Hinweis: Wenn Supabase-Keys fehlen, bleibt die Oberfläche leer und zeigt einen Fehler-Toast.

## Tests
```bash
npm test
```
Die Tests prüfen u.a. den Gatekeeper (max. 3 aktive Projekte), Log-Verhalten und die Heatmap-Generierung.

## Vercel-Deployment
- Framework: „Other“/static, Build Command: `npm run build` (schreibt `env.js` mit deinen Env-Vars), Output: Projektdir.
- Environment Vars setzen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `SUPABASE_SERVICE_ROLE_KEY`/`OPENAI_API_KEY` (werden aktuell nicht clientseitig genutzt).
- Service Role Key gehört nicht in `env.js`; nur der public anon Key wird im Client benötigt.

## Dateien
- `index.html`: UI-Shell, lädt optional `env.js` und das App-Modul
- `styles.css`: Theme, Layout, Komponenten
- `src/state.js`: Business-Logik, Gatekeeper, Heatmap-Berechnung
- `src/persistence.js`: Supabase-Client und CRUD/Settings-Persistenz
- `src/main.js`: DOM-Rendering und Event-Handling gegen Supabase
- `scripts/write-env.js`: erzeugt `env.js` aus den Environment Variablen
- `env.example.js`: Vorlage für lokale Supabase-Keys
