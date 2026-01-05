# Instructions

## Supabase einrichten
1. **Projekt anlegen**
   - Gehe zu https://supabase.com, melde dich an und erstelle ein neues Projekt.
   - Datenbank-Passwort sicher speichern (z.B. in 1Password). Dieses Passwort wird später als `SUPABASE_DB_PASSWORD` genutzt.

2. **Datenbank-Tabellen erstellen** (SQL ausführen)
   - Öffne im Supabase Dashboard den SQL Editor und führe folgende Statements aus:

```sql
-- Projekte
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,
  note text,
  status text check (status in ('active','paused','queued','done')) default 'queued',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Logs (Fortschritts-Einträge)
create table logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  minutes int not null,
  note text,
  created_at timestamptz default now()
);

-- Settings (optional pro User)
create table settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  theme text check (theme in ('dark','light')) default 'dark',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

3. **Row Level Security (RLS) aktivieren**
   - Aktiviere RLS für `projects`, `logs` und `settings`.
   - Lege Policies an, die Inserts/Selects/Updates nur für den eigenen User erlauben (z.B. via `auth.uid()` falls Auth genutzt wird). Für einen Single-User-Prototyp kannst du temporär eine permissive Policy setzen:

```sql
-- Beispiel: offene Policy für Prototyp
create policy "open access" on projects for all using (true) with check (true);
create policy "open access" on logs for all using (true) with check (true);
create policy "open access" on settings for all using (true) with check (true);
```

4. **API Keys & URLs finden**
   - Unter `Settings > API` findest du `Project URL` (Base URL) und den `anon` sowie `service_role` Key.
   - Für den Client wird der **anon** Key verwendet; der **service_role** Key nur serverseitig (z.B. Edge Functions).

5. **(Optional) Edge Function für KI-Report**
   - Falls der KI-Report serverseitig erzeugt werden soll, lege eine Edge Function an, die Logs/Projekte zusammenfasst und OpenAI aufruft. Der `service_role` Key wird dort als Umgebungsvariable genutzt.

## Vercel Deployment & Environment
1. **Vercel Projekt erstellen**
   - Neues Projekt anlegen, Git-Repo verbinden.

2. **Environment Variables setzen (Vercel Dashboard)**
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase Project URL (z.B. `https://xyz.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase anon public API Key
   - `SUPABASE_SERVICE_ROLE_KEY` → Supabase Service Role Key (nur für serverseitige Funktionen)
   - `OPENAI_API_KEY` → OpenAI API Key für KI-Report/Features
   - `SUPABASE_DB_PASSWORD` → DB Passwort aus Schritt 1 (falls benötigt, z.B. für Migrations-Tools)

3. **Build Settings**
   - Framework Preset auswählen (z.B. Next.js) oder statisches Build-Kommando definieren.
   - Prüfen, dass die Runtime (Edge/Node) zu deinen Funktionen passt.

4. **Lokale Entwicklung**
   - `.env.local` anlegen mit obigen Keys.
   - Supabase JS SDK nutzen, um `projects`, `logs`, `settings` zu lesen/schreiben.
   - Theme aus `settings` laden/speichern; Logs/Projects per CRUD anbinden.

5. **Migration vom Local Storage**
   - Beim ersten Start aus Supabase laden; wenn leer, optional Seed-Daten anlegen.
   - Schreiben neuer Logs/Projekte direkt in Supabase; Lokalen State als Cache nutzen.

## Datenmodell (Mapping zum Draft)
- **projects**: id, name, goal, note (Notizzettel), status (`active|paused|queued|done`), created_at, updated_at
- **logs**: id, project_id, minutes, note, created_at
- **settings**: user_id, theme (`dark|light`)
- **Logik-Hinweise**: Gatekeeper (max. 3 aktive Projekte), Logs mit Minuten/Notiz, Reports auf Basis der Logs (Heatmap/Balken, KI-Report).

## Benennung der Env-Keys (Kurzfassung)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_DB_PASSWORD`

Diese Namen sollten exakt so in Vercel hinterlegt werden.
