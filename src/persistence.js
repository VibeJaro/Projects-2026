import { getDefaultState } from "./state.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

const fromDbProject = (row) => ({
  id: row.id,
  name: row.name,
  goal: row.goal ?? "",
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toDbProject = (project) => ({
  id: project.id,
  name: project.name,
  goal: project.goal ?? "",
  status: project.status,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
});

const fromDbLog = (row) => ({
  id: row.id,
  projectId: row.project_id,
  minutes: row.minutes,
  note: row.note ?? "",
  createdAt: row.created_at,
});

const toDbLog = (log) => ({
  id: log.id,
  project_id: log.projectId,
  minutes: log.minutes,
  note: log.note ?? "",
  created_at: log.createdAt,
});

const fromDbSettings = (row) => ({
  theme: row?.theme ?? "dark",
});

export async function loadState() {
  const base = getDefaultState();
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase ist nicht konfiguriert. Bitte env.js mit NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY bereitstellen.");
  }

  const [{ data: projects, error: projectError }, { data: logs, error: logError }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("logs").select("*").order("created_at", { ascending: false }),
  ]);

  if (projectError) throw projectError;
  if (logError) throw logError;

  const { data: settingsRow, error: settingsError } = await supabase
    .from("settings")
    .select("theme")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (settingsError && settingsError.code !== "PGRST116") {
    throw settingsError;
  }

  return {
    ...base,
    projects: (projects ?? []).map(fromDbProject),
    logs: (logs ?? []).map(fromDbLog),
    settings: settingsRow ? fromDbSettings(settingsRow) : base.settings,
  };
}

export async function persistProject(project) {
  if (!isSupabaseConfigured()) throw new Error("Supabase-Konfiguration fehlt.");
  const { error } = await supabase.from("projects").insert([toDbProject(project)]);
  if (error) throw error;
}

export async function updateProject(projectId, updates) {
  if (!isSupabaseConfigured()) throw new Error("Supabase-Konfiguration fehlt.");
  const payload = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.goal !== undefined) payload.goal = updates.goal;
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.updatedAt !== undefined) payload.updated_at = updates.updatedAt;
  const { error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId);
  if (error) throw error;
}

export async function removeProject(projectId) {
  if (!isSupabaseConfigured()) throw new Error("Supabase-Konfiguration fehlt.");
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function persistLog(log) {
  if (!isSupabaseConfigured()) throw new Error("Supabase-Konfiguration fehlt.");
  const { error } = await supabase.from("logs").insert([toDbLog(log)]);
  if (error) throw error;
}

export async function persistSettings(settings) {
  if (!isSupabaseConfigured()) throw new Error("Supabase-Konfiguration fehlt.");
  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        id: SETTINGS_ID,
        theme: settings.theme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) throw error;
}
