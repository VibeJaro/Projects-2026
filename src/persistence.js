import { cloneState, getDefaultState } from "./state.js";

const STORAGE_KEY = "projects-2026-state";

const hasLocalStorage = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

const seedData = () => {
  const base = getDefaultState();
  const now = new Date();
  const projectIds = {
    mission: "mission-alpha",
    training: "training-hours",
    launch: "launch-prep",
  };

  base.projects = [
    {
      id: projectIds.mission,
      name: "Mission Alpha",
      goal: "Release MVP und Nutzer onboarden",
      status: "active",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: projectIds.training,
      name: "Training & Fokus",
      goal: "2h Deep Work pro Tag",
      status: "active",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: projectIds.launch,
      name: "Launch Prep",
      goal: "Marketing Assets finalisieren",
      status: "paused",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  const today = new Date();
  const makeDate = (offset) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    return d.toISOString();
  };

  base.logs = [
    { id: "log-1", projectId: projectIds.mission, minutes: 50, note: "Sprint Backlog geklärt", createdAt: makeDate(1) },
    { id: "log-2", projectId: projectIds.training, minutes: 40, note: "Deep Work Block", createdAt: makeDate(2) },
    { id: "log-3", projectId: projectIds.launch, minutes: 30, note: "Landing Page Text", createdAt: makeDate(3) },
    { id: "log-4", projectId: projectIds.mission, minutes: 25, note: "User Interviews ausgewertet", createdAt: makeDate(4) },
    { id: "log-5", projectId: projectIds.training, minutes: 35, note: "Fokus-Sprint", createdAt: makeDate(0) },
  ];

  return base;
};

export const loadState = () => {
  const seeded = seedData();
  if (!hasLocalStorage()) {
    return seeded;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seeded;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.projects || !parsed.logs) return seeded;
    return parsed;
  } catch (err) {
    console.warn("Konnte Zustand nicht laden, nutze Seed.", err);
    return seeded;
  }
};

export const saveState = (state) => {
  if (!hasLocalStorage()) return;
  const safeState = cloneState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
};

export const resetState = () => {
  const base = seedData();
  if (hasLocalStorage()) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return base;
};
