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
  settings: { theme: "dark" },
});

export function addProject(state, { name, goal = "" }) {
  if (!name?.trim()) {
    throw new Error("Projektname darf nicht leer sein.");
  }
  const project = {
    id: createId(),
    name: name.trim(),
    goal: goal.trim(),
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return { project };
}

export function updateProject(project, updates) {
  return { ...project, ...updates, updatedAt: nowIso() };
}

export function countActiveProjects(projects) {
  return projects.filter((p) => p.status === "active").length;
}

export function setProjectStatus(projects, projectId, status) {
  if (!STATUS_ORDER.includes(status)) {
    throw new Error("Ungültiger Status");
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Projekt nicht gefunden.");

  if (status === "active" && project.status !== "active") {
    const currentActive = countActiveProjects(projects);
    if (currentActive >= MAX_ACTIVE_PROJECTS) {
      return { error: `Maximal ${MAX_ACTIVE_PROJECTS} aktive Projekte erlaubt.` };
    }
  }

  return { project: updateProject(project, { status }) };
}

export function addLogEntry(projects, { projectId, minutes, note = "", createdAt = nowIso() }) {
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) {
    throw new Error("Minuten müssen größer als 0 sein.");
  }
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Projekt nicht gefunden.");

  const timestamp = createdAt ?? nowIso();
  const log = {
    id: createId(),
    projectId,
    minutes: mins,
    note: note.trim(),
    createdAt: timestamp,
  };

  return { log, project: updateProject(project, { updatedAt: timestamp }) };
}

export function projectMinutes(logs, projectId) {
  return logs
    .filter((l) => l.projectId === projectId)
    .reduce((sum, log) => sum + log.minutes, 0);
}

export function summarizeProjects(projects, logs) {
  const totals = projects.map((project) => ({
    ...project,
    minutes: projectMinutes(logs, project.id),
  }));

  totals.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  return totals;
}

export function buildProjectTotals(logs) {
  const totals = new Map();
  for (const log of logs) {
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

export function statsSnapshot(projects, logs) {
  const totals = summarizeProjects(projects, logs);
  const active = totals.filter((p) => p.status === "active");
  const queued = totals.filter((p) => p.status === "queued");
  const paused = totals.filter((p) => p.status === "paused");
  const done = totals.filter((p) => p.status === "done");
  const lastLog = logs[0];
  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);

  return {
    totals,
    active,
    queued,
    paused,
    done,
    lastLog,
    totalMinutes,
    heatmap: heatmapSeries(logs),
  };
}
