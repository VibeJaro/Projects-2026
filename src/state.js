export const MAX_ACTIVE_PROJECTS = 3;

const STATUS_ORDER = ["active", "paused", "queued", "done"];

export const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
};

export const nowIso = () => new Date().toISOString();

export const getDefaultState = () => ({
  projects: [],
  logs: [],
  settings: { theme: "dark", id: null, userId: null },
});

export const cloneState = (state) => ({
  projects: state.projects.map((p) => ({ ...p })),
  logs: state.logs.map((l) => ({ ...l })),
  settings: { ...state.settings },
});

export function addProject(state, { name, goal = "", note = "" }) {
  if (!name?.trim()) {
    throw new Error("Projektname darf nicht leer sein.");
  }
  const nextState = cloneState(state);
  const goalText = goal?.trim?.() ?? "";
  const noteText = note?.trim?.() ?? "";
  const project = {
    id: createId(),
    name: name.trim(),
    goal: goalText,
    note: noteText,
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  nextState.projects.unshift(project);
  return { state: nextState, project };
}

export function deleteProject(state, projectId) {
  const nextState = cloneState(state);
  nextState.projects = nextState.projects.filter((p) => p.id !== projectId);
  nextState.logs = nextState.logs.filter((l) => l.projectId !== projectId);
  return nextState;
}

export function updateProject(state, projectId, updates) {
  const nextState = cloneState(state);
  const target = nextState.projects.find((p) => p.id === projectId);
  if (!target) throw new Error("Projekt nicht gefunden.");
  Object.assign(target, updates, { updatedAt: nowIso() });
  return nextState;
}

export function countActiveProjects(state) {
  return state.projects.filter((p) => p.status === "active").length;
}

export function setProjectStatus(state, projectId, status) {
  if (!STATUS_ORDER.includes(status)) {
    throw new Error("Ungültiger Status");
  }
  const nextState = cloneState(state);
  const project = nextState.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Projekt nicht gefunden.");

  if (status === "active" && project.status !== "active") {
    const currentActive = countActiveProjects(nextState);
    if (currentActive >= MAX_ACTIVE_PROJECTS) {
      return { state: nextState, error: `Maximal ${MAX_ACTIVE_PROJECTS} aktive Projekte erlaubt.` };
    }
  }

  project.status = status;
  project.updatedAt = nowIso();
  return { state: nextState };
}

export function addLogEntry(state, { projectId, minutes, note = "", createdAt = nowIso() }) {
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) {
    throw new Error("Minuten müssen größer als 0 sein.");
  }
  const nextState = cloneState(state);
  const project = nextState.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Projekt nicht gefunden.");

  const timestamp = createdAt ?? nowIso();
  const log = {
    id: createId(),
    projectId,
    minutes: mins,
    note: note.trim(),
    createdAt: timestamp,
  };

  nextState.logs.unshift(log);
  project.updatedAt = timestamp;
  return { state: nextState, log };
}

export function projectMinutes(logs, projectId) {
  return logs
    .filter((l) => l.projectId === projectId)
    .reduce((sum, log) => sum + log.minutes, 0);
}

export function summarizeProjects(state) {
  const totals = state.projects.map((project) => ({
    ...project,
    minutes: projectMinutes(state.logs, project.id),
  }));

  totals.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  return totals;
}

export function buildProjectTotals(state) {
  const totals = new Map();
  for (const log of state.logs) {
    totals.set(log.projectId, (totals.get(log.projectId) ?? 0) + log.minutes);
  }
  return totals;
}

export function dailyMinutes(logs) {
  return logs.reduce((acc, log) => {
    const dayKey = log.createdAt.slice(0, 10);
    acc[dayKey] = (acc[dayKey] ?? 0) + log.minutes;
    return acc;
  }, {});
}

export function heatmapSeries(logs, days = 14) {
  const buckets = dailyMinutes(logs);
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(now.getDate() - i);
    const iso = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString("de-DE", { weekday: "short" });
    const value = buckets[iso] ?? 0;
    result.push({ date: iso, label, value });
  }
  const max = Math.max(...result.map((d) => d.value), 1);
  return result.map((d) => ({ ...d, intensity: Math.min(d.value / max, 1) }));
}

export function statsSnapshot(state) {
  const totals = summarizeProjects(state);
  const active = totals.filter((p) => p.status === "active");
  const queued = totals.filter((p) => p.status === "queued");
  const paused = totals.filter((p) => p.status === "paused");
  const done = totals.filter((p) => p.status === "done");
  const lastLog = state.logs[0];
  const totalMinutes = state.logs.reduce((sum, log) => sum + log.minutes, 0);

  return {
    totals,
    active,
    queued,
    paused,
    done,
    lastLog,
    totalMinutes,
    heatmap: heatmapSeries(state.logs),
  };
}
