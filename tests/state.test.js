import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addLogEntry,
  addProject,
  countActiveProjects,
  getDefaultState,
  heatmapSeries,
  MAX_ACTIVE_PROJECTS,
  setProjectStatus,
} from '../src/state.js';

test('Gatekeeper lässt maximal drei aktive Projekte zu', () => {
  let state = getDefaultState();
  const projectIds = [];
  for (let i = 0; i < MAX_ACTIVE_PROJECTS + 1; i += 1) {
    const result = addProject(state, { name: `Projekt ${i + 1}` });
    state = result.state;
    projectIds.push(result.project.id);
  }

  for (let i = 0; i < MAX_ACTIVE_PROJECTS; i += 1) {
    const result = setProjectStatus(state, projectIds[i], 'active');
    state = result.state;
  }

  const attempt = setProjectStatus(state, projectIds[3], 'active');
  assert.equal(attempt.error, `Maximal ${MAX_ACTIVE_PROJECTS} aktive Projekte erlaubt.`);
  assert.equal(countActiveProjects(attempt.state), MAX_ACTIVE_PROJECTS);
});

test('Projekt-Notizzettel wird gespeichert und getrimmt', () => {
  const { project } = addProject(getDefaultState(), { name: 'Test', note: '  Idee  ' });
  assert.equal(project.note, 'Idee');
});

test('Logs erhöhen Fortschrittsminuten und aktualisieren den Zeitstempel', () => {
  let state = getDefaultState();
  const { state: withProject, project } = addProject(state, { name: 'Testprojekt', goal: 'Goal' });
  state = withProject;
  ({ state } = setProjectStatus(state, project.id, 'active'));

  const before = state.projects.find((p) => p.id === project.id).updatedAt;
  const { state: withLog } = addLogEntry(state, { projectId: project.id, minutes: 30, note: 'Deep Work' });
  state = withLog;

  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].minutes, 30);
  const updated = state.projects.find((p) => p.id === project.id).updatedAt;
  assert.ok(updated >= before);
  assert.equal(updated.slice(0, 19), state.logs[0].createdAt.slice(0, 19));
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
