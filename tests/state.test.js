import assert from "node:assert/strict";
import test from "node:test";
import {
  addLogEntry,
  addProject,
  countActiveProjects,
  getDefaultState,
  heatmapSeries,
  MAX_ACTIVE_PROJECTS,
  setProjectStatus,
} from "../src/state.js";

test('Gatekeeper lässt maximal drei aktive Projekte zu', () => {
  const projects = [];
  const projectIds = [];
  for (let i = 0; i < MAX_ACTIVE_PROJECTS + 1; i += 1) {
    const result = addProject(getDefaultState(), { name: `Projekt ${i + 1}` });
    projects.push(result.project);
    projectIds.push(result.project.id);
  }

  for (let i = 0; i < MAX_ACTIVE_PROJECTS; i += 1) {
    const result = setProjectStatus(projects, projectIds[i], "active");
    projects[i] = result.project;
  }

  const attempt = setProjectStatus(projects, projectIds[3], "active");
  assert.equal(attempt.error, `Maximal ${MAX_ACTIVE_PROJECTS} aktive Projekte erlaubt.`);
  assert.equal(countActiveProjects(projects), MAX_ACTIVE_PROJECTS);
});

test('Logs erhöhen Fortschrittsminuten und aktualisieren den Zeitstempel', () => {
  const { project } = addProject(getDefaultState(), { name: "Testprojekt", goal: "Goal" });
  const { project: activeProject } = setProjectStatus([project], project.id, "active");

  const before = activeProject.updatedAt;
  const { log, project: updatedProject } = addLogEntry([activeProject], {
    projectId: project.id,
    minutes: 30,
    note: "Deep Work",
  });

  assert.equal(log.minutes, 30);
  assert.ok(updatedProject.updatedAt >= before);
  assert.equal(updatedProject.updatedAt.slice(0, 19), log.createdAt.slice(0, 19));
});

test('Heatmap enthält die letzten 14 Tage', () => {
  const today = new Date();
  const isoForOffset = (offset) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    return d.toISOString();
  };
  const logs = [
    { id: 'a', projectId: 'x', minutes: 20, note: '', createdAt: isoForOffset(0) },
    { id: 'b', projectId: 'x', minutes: 10, note: '', createdAt: isoForOffset(1) },
    { id: 'c', projectId: 'x', minutes: 15, note: '', createdAt: isoForOffset(5) },
  ];
  const series = heatmapSeries(logs, 14);
  assert.equal(series.length, 14);
  const lastBucket = series.at(-1);
  assert.ok(lastBucket.value >= 20);
});
