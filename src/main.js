import {
  addLogEntry,
  addProject,
  buildProjectTotals,
  heatmapSeries,
  getDefaultState,
  setProjectStatus,
  statsSnapshot,
} from "./state.js";
import {
  createLogRecord,
  createProjectRecord,
  deleteProjectRemote,
  loadState,
  saveThemeSetting,
  updateProjectStatusRemote,
} from "./persistence.js";

let state = getDefaultState();
let activeView = "focus";

const viewButtons = document.querySelectorAll("[data-view]");
const views = {
  focus: document.getElementById("focusView"),
  queue: document.getElementById("queueView"),
  updates: document.getElementById("updatesView"),
};

const summaryEls = {
  minutes: document.getElementById("metricMinutes"),
  last: document.getElementById("metricLast"),
};

const lists = {
  focus: document.getElementById("focusList"),
  active: document.getElementById("activeList"),
  queue: document.getElementById("queueList"),
  done: document.getElementById("doneList"),
  barChart: document.getElementById("barChart"),
  heatmap: document.getElementById("heatmap"),
};

const modal = document.getElementById("logModal");
const logForm = document.getElementById("logForm");
const logProject = document.getElementById("logProject");
const logMinutes = document.getElementById("logMinutes");
const logNote = document.getElementById("logNote");
const logDate = document.getElementById("logDate");
const toast = document.getElementById("toast");

const quickLogBtn = document.getElementById("quickLog");
const openLogFromUpdates = document.getElementById("openLogFromUpdates");
const quickProjectBtn = document.getElementById("quickProject");
const projectForm = document.getElementById("projectForm");
const themeToggle = document.getElementById("themeToggle");
const chipButtons = document.querySelectorAll(".chip-row .chip");
const closeModalBtn = document.getElementById("closeModal");
const cancelLogBtn = document.getElementById("cancelLog");

function formatMinutes(value) {
  return `${value} min`;
}

function formatDate(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

function toggleView(key) {
  activeView = key;
  Object.entries(views).forEach(([name, el]) => {
    el.classList.toggle("active", name === key);
  });
  viewButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === key));
}

function showToast(message, type = "success") {
  toast.textContent = message;
  toast.classList.remove("hidden", "success", "error");
  toast.classList.add(type);
  setTimeout(() => toast.classList.add("hidden"), 2500);
}

function renderSummary() {
  const stats = statsSnapshot(state);
  summaryEls.minutes.textContent = stats.totalMinutes;
  summaryEls.last.textContent = stats.lastLog
    ? formatDateShort(stats.lastLog.createdAt)
    : "–";
}

function statusBadge(status) {
  const badge = document.createElement("span");
  badge.className = `badge ${status}`;
  const label = {
    active: "Aktiv",
    paused: "Pausiert",
    queued: "Queue",
    done: "Done",
  }[status];
  badge.textContent = label ?? status;
  return badge;
}

function projectName(id) {
  return state.projects.find((p) => p.id === id)?.name ?? "Unbekannt";
}

function projectMinutes(projectId) {
  const totals = buildProjectTotals(state);
  return totals.get(projectId) ?? 0;
}

function renderProjectCard(project, context = "focus") {
  const card = document.createElement("article");
  card.className = "card";
  const minutes = projectMinutes(project.id);
  card.innerHTML = `
    <div class="badge-row">
      ${statusBadge(project.status).outerHTML}
      <span class="meta">${formatDate(project.updatedAt)}</span>
    </div>
    <h4>${project.name}</h4>
    <p class="goal">${project.goal || "Kein Ziel hinterlegt"}</p>
    <div class="goal-row">
      <span class="meta">${formatMinutes(minutes)} geloggt</span>
    </div>
    <div class="button-row"></div>
  `;

  const actions = card.querySelector(".button-row");
  const logBtn = document.createElement("button");
  logBtn.className = "secondary";
  logBtn.textContent = "+ Update";
  logBtn.addEventListener("click", () => openLogModal(project.id));
  actions.appendChild(logBtn);

  if (project.status === "active") {
    const pauseBtn = document.createElement("button");
    pauseBtn.className = "ghost";
    pauseBtn.textContent = "Pausieren";
    pauseBtn.addEventListener("click", () => changeStatus(project.id, "paused"));
    actions.appendChild(pauseBtn);
  }

  if (project.status === "paused" || (context === "queue" && project.status === "queued")) {
    const activateBtn = document.createElement("button");
    activateBtn.className = "primary";
    activateBtn.textContent = "Aktivieren";
    activateBtn.addEventListener("click", () => changeStatus(project.id, "active"));
    actions.appendChild(activateBtn);
  }

  if (project.status !== "done") {
    const doneBtn = document.createElement("button");
    doneBtn.className = "ghost";
    doneBtn.textContent = "Abschließen";
    doneBtn.addEventListener("click", () => changeStatus(project.id, "done"));
    actions.appendChild(doneBtn);
  }

  const removeBtn = document.createElement("button");
  removeBtn.className = "ghost";
  removeBtn.textContent = "Löschen";
  removeBtn.addEventListener("click", () => handleDeleteProject(project.id));
  actions.appendChild(removeBtn);

  return card;
}

function renderFocus() {
  const stats = statsSnapshot(state);
  lists.focus.innerHTML = "";
  const items = [...stats.active].slice(0, 3);
  if (!items.length) {
    lists.focus.innerHTML = '<p class="muted">Keine aktiven Projekte.</p>';
    return;
  }
  items.forEach((project) => lists.focus.appendChild(renderProjectCard(project)));
}

function renderQueue() {
  const stats = statsSnapshot(state);
  lists.active.innerHTML = "";
  lists.queue.innerHTML = "";
  const queuedAndPaused = [...stats.queued, ...stats.paused];
  stats.active.forEach((project) => lists.active.appendChild(renderProjectCard(project, "queue")));
  if (!stats.active.length) {
    lists.active.innerHTML = '<p class="muted">Keine aktiven Projekte.</p>';
  }
  queuedAndPaused.forEach((project) => lists.queue.appendChild(renderProjectCard(project, "queue")));
  if (!queuedAndPaused.length) {
    lists.queue.innerHTML = '<p class="muted">Keine Projekte in der Übersicht.</p>';
  }
  lists.done.innerHTML = "";
  stats.done.forEach((project) => lists.done.appendChild(renderProjectCard(project)));
  if (!stats.done.length) {
    lists.done.innerHTML = '<p class="muted">Noch nichts abgeschlossen.</p>';
  }
}

function renderBarChart() {
  const totals = Array.from(buildProjectTotals(state).entries())
    .map(([projectId, minutes]) => ({ projectId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  lists.barChart.innerHTML = "";
  if (!totals.length) {
    lists.barChart.innerHTML = '<p class="muted">Kein Chart ohne Logs.</p>';
    return;
  }
  const max = Math.max(...totals.map((t) => t.minutes));
  totals.forEach(({ projectId, minutes }) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <div class="bar-label">
        <span>${projectName(projectId)}</span>
        <span class="meta">${formatMinutes(minutes)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${(minutes / max) * 100}%"></div></div>
    `;
    lists.barChart.appendChild(row);
  });
}

function renderHeatmap() {
  const series = heatmapSeries(state.logs, 14);
  lists.heatmap.innerHTML = "";
  if (!series.length) {
    lists.heatmap.innerHTML = '<p class="muted">Noch keine Daten.</p>';
    return;
  }
  series.forEach((bucket) => {
    const cell = document.createElement("div");
    const intensity = Math.max(0.08, bucket.intensity);
    cell.className = "heat-cell";
    cell.style.background = `linear-gradient(135deg, rgba(99,102,241,${intensity}), rgba(6,182,212,${intensity}))`;
    const label = document.createElement("span");
    label.textContent = bucket.label;
    cell.title = `${bucket.date}: ${bucket.value} min`;
    cell.appendChild(label);
    lists.heatmap.appendChild(cell);
  });
}

function render() {
  renderSummary();
  renderFocus();
  renderQueue();
  renderBarChart();
  renderHeatmap();
}

function applyTheme(theme) {
  const nextTheme = theme || "dark";
  document.documentElement.setAttribute("data-theme", nextTheme);
  state.settings.theme = nextTheme;
  themeToggle.textContent = nextTheme === "dark" ? "🌙" : "☀️";
}

async function updateTheme(theme) {
  applyTheme(theme);
  const result = await saveThemeSetting(theme, state.settings.id);
  if (result?.error) {
    showToast(result.error, "error");
    return;
  }
  if (result?.settings) {
    state.settings = result.settings;
  }
}

async function refreshState(showErrors = true) {
  const { state: remoteState, error } = await loadState();
  state = remoteState;
  applyTheme(state.settings?.theme);
  render();
  if (error && showErrors) {
    showToast(error, "error");
  }
}

async function changeStatus(projectId, status) {
  const gateCheck = setProjectStatus(state, projectId, status);
  if (gateCheck.error) {
    showToast(gateCheck.error, "error");
    return;
  }
  const { error } = await updateProjectStatusRemote(projectId, status);
  if (error) {
    showToast(error, "error");
    return;
  }
  await refreshState(false);
  showToast(`Status: ${status}`);
}

async function handleDeleteProject(projectId) {
  const { error } = await deleteProjectRemote(projectId);
  if (error) {
    showToast(error, "error");
    return;
  }
  await refreshState(false);
  showToast("Projekt gelöscht", "success");
}

function openLogModal(projectId) {
  logProject.innerHTML = "";
  const selectable = state.projects.filter((p) => p.status !== "done");
  selectable.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    logProject.appendChild(option);
  });
  if (projectId) {
    logProject.value = projectId;
  }
  logMinutes.value = "";
  logNote.value = "";
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  logDate.value = offsetDate.toISOString().slice(0, 16);
  modal.classList.remove("hidden");
  logMinutes.focus();
}

function closeLogModal() {
  modal.classList.add("hidden");
}

async function handleLogSubmit() {
  try {
    const minutes = Number(logMinutes.value);
    const createdAt = logDate.value ? new Date(logDate.value).toISOString() : new Date().toISOString();
    addLogEntry(state, {
      projectId: logProject.value,
      minutes,
      note: logNote.value,
      createdAt,
    });
    const { error } = await createLogRecord({
      projectId: logProject.value,
      minutes,
      note: logNote.value,
      createdAt,
    });
    if (error) throw new Error(error);
    showToast("Update gespeichert", "success");
    closeLogModal();
    await refreshState(false);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleProjectSubmit(formData) {
  try {
    const { project } = addProject(state, {
      name: formData.get("name"),
      goal: formData.get("goal"),
    });
    const { error } = await createProjectRecord({ name: project.name, goal: project.goal });
    if (error) throw new Error(error);
    projectForm.reset();
    showToast("Projekt angelegt", "success");
    await refreshState(false);
    toggleView("queue");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function bindEvents() {
  viewButtons.forEach((btn) =>
    btn.addEventListener("click", () => toggleView(btn.dataset.view))
  );

  chipButtons.forEach((chip) =>
    chip.addEventListener("click", () => {
      const inc = Number(chip.dataset.min);
      const current = Number(logMinutes.value || 0);
      logMinutes.value = current + inc;
    })
  );

  logForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleLogSubmit();
  });

  projectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(projectForm);
    handleProjectSubmit(formData);
  });

  quickLogBtn.addEventListener("click", () => openLogModal());
  openLogFromUpdates.addEventListener("click", () => openLogModal());
  quickProjectBtn.addEventListener("click", () => {
    toggleView("queue");
    document.getElementById("projectName").focus();
  });

  themeToggle.addEventListener("click", () => {
    const nextTheme = state.settings.theme === "dark" ? "light" : "dark";
    updateTheme(nextTheme);
  });

  closeModalBtn.addEventListener("click", closeLogModal);
  cancelLogBtn.addEventListener("click", closeLogModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeLogModal();
  });
}

function initTheme() {
  const theme = state.settings?.theme ?? "dark";
  applyTheme(theme);
}

async function init() {
  initTheme();
  bindEvents();
  render();
  await refreshState(true);
}

init();
