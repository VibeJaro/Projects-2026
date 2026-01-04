import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDefaultState } from "./state.js";
import { readEnv } from "./env.js";

const SUPABASE_URL = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const isSupabaseConfigured = Boolean(supabase);

const mapProjectRow = (row) => ({
  id: row.id,
  name: row.name,
  goal: row.goal ?? "",
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapLogRow = (row) => ({
  id: row.id,
  projectId: row.project_id,
  minutes: row.minutes,
  note: row.note ?? "",
  createdAt: row.created_at,
});

const mapSettingsRow = (row) => ({
  id: row.id ?? null,
  userId: row.user_id ?? null,
  theme: row.theme ?? "dark",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fetchProjects = async () => {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,goal,status,created_at,updated_at")
    .order("created_at", { ascending: false });
  return { data: data?.map(mapProjectRow) ?? [], error };
};

const fetchLogs = async () => {
  const { data, error } = await supabase
    .from("logs")
    .select("id,project_id,minutes,note,created_at")
    .order("created_at", { ascending: false });
  return { data: data?.map(mapLogRow) ?? [], error };
};

const fetchSettings = async () => {
  const { data, error } = await supabase
    .from("settings")
    .select("id,user_id,theme,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error };
  if (!data) return { data: null };
  return { data: mapSettingsRow(data) };
};

const combineErrors = (responses) => {
  const firstError = responses.find((res) => res?.error)?.error;
  if (!firstError) return null;
  return typeof firstError === "string" ? firstError : firstError.message ?? "Unbekannter Fehler.";
};

export async function loadState() {
  const base = getDefaultState();
  if (!supabase) {
    return { state: base, error: "Supabase ist nicht konfiguriert. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY." };
  }

  const [projectsRes, logsRes, settingsRes] = await Promise.all([fetchProjects(), fetchLogs(), fetchSettings()]);
  const error = combineErrors([projectsRes, logsRes, settingsRes]);

  if (error) {
    return { state: base, error };
  }

  const settings = settingsRes.data ?? base.settings;

  return {
    state: {
      projects: projectsRes.data,
      logs: logsRes.data,
      settings,
    },
    error: null,
  };
}

export async function createProjectRecord({ name, goal }) {
  if (!supabase) {
    return { error: "Supabase ist nicht konfiguriert." };
  }
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, goal })
    .select("id,name,goal,status,created_at,updated_at")
    .single();
  if (error) return { error: error.message };
  return { project: mapProjectRow(data) };
}

export async function updateProjectStatusRemote(projectId, status) {
  if (!supabase) {
    return { error: "Supabase ist nicht konfiguriert." };
  }
  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("projects").update({ status, updated_at: updatedAt }).eq("id", projectId);
  if (error) return { error: error.message };
  return { updatedAt };
}

export async function deleteProjectRemote(projectId) {
  if (!supabase) {
    return { error: "Supabase ist nicht konfiguriert." };
  }
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: error.message };
  return { success: true };
}

const touchProjectTimestamp = async (projectId, updatedAt) => {
  const { error } = await supabase.from("projects").update({ updated_at: updatedAt }).eq("id", projectId);
  return error?.message;
};

export async function createLogRecord({ projectId, minutes, note, createdAt }) {
  if (!supabase) {
    return { error: "Supabase ist nicht konfiguriert." };
  }
  const timestamp = createdAt ?? new Date().toISOString();
  const { data, error } = await supabase
    .from("logs")
    .insert({ project_id: projectId, minutes, note, created_at: timestamp })
    .select("id,project_id,minutes,note,created_at")
    .single();
  if (error) return { error: error.message };

  const touchError = await touchProjectTimestamp(projectId, timestamp);
  if (touchError) return { error: touchError };

  return { log: mapLogRow(data) };
}

export async function saveThemeSetting(theme, settingsId) {
  if (!supabase) {
    return { error: "Supabase ist nicht konfiguriert." };
  }
  const payload = { theme, updated_at: new Date().toISOString() };
  let response;

  if (settingsId) {
    response = await supabase
      .from("settings")
      .update(payload)
      .eq("id", settingsId)
      .select("id,user_id,theme,created_at,updated_at")
      .maybeSingle();
    if (response.error?.code === "PGRST116") {
      response = null;
    }
  }

  if (!response) {
    response = await supabase
      .from("settings")
      .insert(payload)
      .select("id,user_id,theme,created_at,updated_at")
      .single();
  }

  const { data, error } = response;
  if (error) return { error: error.message };
  return { settings: mapSettingsRow(data) };
}
