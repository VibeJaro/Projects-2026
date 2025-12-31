## Supabase-Anbindung & Aufräumarbeiten
- Local-Storage-Seeddaten entfernt; Projekte, Logs und Settings werden ausschließlich in Supabase gelesen/geschrieben.
- Neue `env.js`-Erwartung (aus Keys `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`), damit das statische Frontend die Supabase-Instanz kennt.
- UI-Platzhalter für AI-Report entfernt, Fokus auf Projekttafeln und Charts.
- README/Build-Hinweise für Vercel ergänzt (Env-Bootstrapping im Build-Schritt).
