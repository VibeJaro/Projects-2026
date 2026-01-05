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
  updateProjectNoteRemote,
} from "./persistence.js";

let state = getDefaultState();
let activeView = "focus";
const AI_MODEL = "gpt-5.2";
const MAX_LOGS_FOR_AI = 60;

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
const projectLogModal = document.getElementById("projectLogModal");
const logForm = document.getElementById("logForm");
const logProject = document.getElementById("logProject");
const logMinutes = document.getElementById("logMinutes");
const logNote = document.getElementById("logNote");
const logDate = document.getElementById("logDate");
const projectLogTitle = document.getElementById("projectLogTitle");
const projectLogMeta = document.getElementById("projectLogMeta");
const projectLogList = document.getElementById("projectLogList");
const projectNoteInput = document.getElementById("projectNoteInput");
const projectNoteStatus = document.getElementById("projectNoteStatus");
const saveProjectNoteBtn = document.getElementById("saveProjectNote");
const toast = document.getElementById("toast");
const topbar = document.querySelector(".topbar");
const root = document.documentElement;

const quickLogBtn = document.getElementById("quickLog");
const openLogFromUpdates = document.getElementById("openLogFromUpdates");
const quickProjectBtn = document.getElementById("quickProject");
const projectForm = document.getElementById("projectForm");
const themeToggle = document.getElementById("themeToggle");
const chipButtons = document.querySelectorAll(".chip-row .chip");
const closeModalBtn = document.getElementById("closeModal");
const cancelLogBtn = document.getElementById("cancelLog");
const closeProjectLogBtn = document.getElementById("closeProjectLog");
const projectLogAddUpdate = document.getElementById("projectLogAddUpdate");
const aiGenerateBtn = document.getElementById("aiGenerate");
const aiOutput = document.getElementById("aiOutput");
const aiStatus = document.getElementById("aiStatus");
const aiCustomPrompt = document.getElementById("aiCustomPrompt");
const aiModelLabel = document.getElementById("aiModelLabel");
const aiKeyWarning = document.getElementById("aiKeyWarning");

let overlayDepth = 0;
let aiBusy = false;
let noteDirty = false;

const readEnv = (key) => {
  if (typeof window !== "undefined") {
    if (window.ENV?.[key]) return window.ENV[key];
    if (window[key]) return window[key];
    const meta = document.querySelector(`meta[name="${key}"]`);
    if (meta?.content) return meta.content;
  }
  if (typeof globalThis !== "undefined" && globalThis.process?.env?.[key]) {
    return globalThis.process.env[key];
  }
  return null;
};

const getAiApiKey = () =>
  readEnv("OPENAI_API_KEY") ||
  readEnv("NEXT_PUBLIC_OPENAI_API_KEY") ||
  readEnv("AI_API_KEY");

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

function aiAvailable() {
  return Boolean(getAiApiKey());
}

function updateAiAvailability() {
  const available = aiAvailable();
  aiModelLabel && (aiModelLabel.textContent = AI_MODEL);
  if (aiGenerateBtn) {
    aiGenerateBtn.disabled = !available || aiBusy;
    aiGenerateBtn.title = available ? "Fokus-Update abrufen" : "OPENAI_API_KEY fehlt";
  }
  if (aiKeyWarning) {
    aiKeyWarning.classList.toggle("hidden", available);
  }
  if (!available && aiStatus) {
    aiStatus.textContent = "Kein API-Key";
  }
}

function buildAiContextSnapshot() {
  const snapshot = statsSnapshot(state);
  const totalsMap = buildProjectTotals(state);
  const summarizeProject = (project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    goal: project.goal,
    note: project.note,
    minutes: totalsMap.get(project.id) ?? 0,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
  });

  const latestLogs = state.logs.slice(0, MAX_LOGS_FOR_AI).map((log) => ({
    id: log.id,
    projectId: log.projectId,
    minutes: log.minutes,
    note: log.note,
    createdAt: log.createdAt,
    projectName: projectName(log.projectId),
  }));

  return {
    generatedAt: new Date().toISOString(),
    settings: state.settings,
    stats: {
      totalMinutes: snapshot.totalMinutes,
      lastLog: snapshot.lastLog,
      heatmap: snapshot.heatmap,
    },
    projects: {
      active: snapshot.active.map(summarizeProject),
      queued: snapshot.queued.map(summarizeProject),
      paused: snapshot.paused.map(summarizeProject),
      done: snapshot.done.map(summarizeProject),
      totals: snapshot.totals.map(summarizeProject),
    },
    logs: {
      count: state.logs.length,
      sample: latestLogs,
    },
  };
}

function composeAiInput(context, customPrompt) {
  return `Erstelle ein prägnantes KI-Update in Deutsch für Mission Control 2026.
- Ziel: Fokus schärfen, Aufgaben schneller abschließen (ohne neue Komplexität), kreative Impulse geben ("hast du daran gedacht?"), nützliche Verknüpfungen vorschlagen und 2-3 kleine Projektideen nennen, die wenig Zusatzaufwand bedeuten.
- Formatiere in klaren Bullet-Abschnitten mit Überschriften: Fokus/Quick Wins, Kreativer Twist, Verbindungen, Mini-Projekte, Nächster Schritt heute. Jede Bullet darf 1-3 Sätze haben, damit die Aktion verständlich wird.
- Halte dich an konkrete Vorschläge mit Zeitboxen oder klaren Aktionen. Keine langen Erklärungen, keine Entschuldigungen.
- Nutze Ziele und Notizzettel pro Projekt als Kontext für Empfehlungen und Querverbindungen.

Custom Prompt: ${customPrompt || "— (keine Zusatzwünsche)"}

Kontext (alle Projekte, Logs, Heatmap, Settings):
${JSON.stringify(context, null, 2)}`;
}

function extractAiText(responseJson) {
  if (!responseJson) return "";
  if (typeof responseJson.output_text === "string") return responseJson.output_text;
  if (Array.isArray(responseJson.output)) {
    const textContent = responseJson.output
      .flatMap((item) => item.content ?? [])
      .map((c) => c.text ?? c)
      .filter(Boolean)
      .join("\n");
    if (textContent) return textContent;
  }
  if (responseJson.choices?.[0]?.message?.content) {
    return responseJson.choices[0].message.content;
  }
  return "";
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyInlineFormatting(text) {
  let formatted = text;
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return formatted;
}

function markdownToHtml(markdown) {
  const escaped = escapeHtml(markdown);
  const lines = escaped.split(/\r?\n/);
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const bullet = line.match(/^[-*+]\s+(.*)/);

    if (bullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${applyInlineFormatting(bullet[1].trim())}</li>`);
      continue;
    }

    closeList();

    if (!line) {
      continue;
    }

    html.push(`<p>${applyInlineFormatting(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

async function requestAiUpdate() {
  if (aiBusy) return;
  const apiKey = getAiApiKey();
  if (!apiKey) {
    showToast("OPENAI_API_KEY fehlt.", "error");
    return;
  }
  aiBusy = true;
  updateAiAvailability();
  aiStatus.textContent = "GPT-5.2 denkt nach...";
  aiOutput.innerHTML = "<p class='muted'>Kontext wird gesammelt und an GPT-5.2 geschickt...</p>";

  try {
    const context = buildAiContextSnapshot();
    const payload = {
      model: AI_MODEL,
      input: [
        {
          role: "system",
          content:
            "Du bist der Fokus-Booster für Mission Control 2026. Du gibst nur konkrete, umsetzbare Bullet-Punkte und machst Dinge einfacher statt komplizierter.",
        },
        { role: "user", content: composeAiInput(context, aiCustomPrompt?.value?.trim()) },
      ],
      reasoning: { effort: "none" },
      text: { verbosity: "medium" },
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message ?? "Unbekannter API-Fehler.");
    }

    const text = extractAiText(data);
    if (!text) {
      throw new Error("Keine KI-Antwort erhalten.");
    }

    aiOutput.innerHTML = markdownToHtml(text.trim());
    aiStatus.textContent = "Bereit";
  } catch (err) {
    aiStatus.textContent = "Fehler";
    aiOutput.textContent = err.message;
    showToast(err.message, "error");
  } finally {
    aiBusy = false;
    updateAiAvailability();
  }
}

function toggleView(key) {
  activeView = key;
  Object.entries(views).forEach(([name, el]) => {
    el.classList.toggle("active", name === key);
  });
  viewButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === key));
}

function updateModalOffset() {
  const rect = topbar?.getBoundingClientRect();
  const offset = rect ? rect.bottom + 12 : 24;
  root.style.setProperty("--modal-top-offset", `${Math.max(offset, 24)}px`);
}

function collapseHeader() {
  overlayDepth += 1;
  document.body.classList.add("header-collapsed");
  topbar?.classList.add("collapsed");
  updateModalOffset();
}

function releaseHeader() {
  overlayDepth = Math.max(overlayDepth - 1, 0);
  if (overlayDepth === 0) {
    document.body.classList.remove("header-collapsed");
    topbar?.classList.remove("collapsed");
  }
  updateModalOffset();
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

function previewText(text, fallback = "Kein Notizzettel hinterlegt") {
  const value = text?.trim();
  if (!value) return fallback;
  if (value.length <= 140) return value;
  return `${value.slice(0, 137)}…`;
}

function renderProjectCard(project, context = "focus") {
  const card = document.createElement("article");
  card.className = "card";
  card.tabIndex = 0;
  card.dataset.projectId = project.id;
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
    <div class="note-preview">
      <p class="note-label">Notizzettel</p>
      <p class="note-text ${project.note?.trim() ? "" : "muted"}">${previewText(project.note)}</p>
    </div>
    <div class="button-row"></div>
  `;

  const attachButtonHandler = (button, handler) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handler();
    });
  };

  const actions = card.querySelector(".button-row");
  const logBtn = document.createElement("button");
  logBtn.className = "secondary";
  logBtn.textContent = "+ Update";
  attachButtonHandler(logBtn, () => openLogModal(project.id));
  actions.appendChild(logBtn);

  if (project.status === "active") {
    const pauseBtn = document.createElement("button");
    pauseBtn.className = "ghost";
    pauseBtn.textContent = "Pausieren";
    attachButtonHandler(pauseBtn, () => changeStatus(project.id, "paused"));
    actions.appendChild(pauseBtn);
  }

  if (project.status === "paused" || (context === "queue" && project.status === "queued")) {
    const activateBtn = document.createElement("button");
    activateBtn.className = "primary";
    activateBtn.textContent = "Aktivieren";
    attachButtonHandler(activateBtn, () => changeStatus(project.id, "active"));
    actions.appendChild(activateBtn);
  }

  if (project.status !== "done") {
    const doneBtn = document.createElement("button");
    doneBtn.className = "ghost";
    doneBtn.textContent = "Abschließen";
    attachButtonHandler(doneBtn, () => changeStatus(project.id, "done"));
    actions.appendChild(doneBtn);
  }

  const removeBtn = document.createElement("button");
  removeBtn.className = "ghost";
  removeBtn.textContent = "Löschen";
  attachButtonHandler(removeBtn, () => handleDeleteProject(project.id));
  actions.appendChild(removeBtn);

  card.addEventListener("click", () => openProjectLog(project.id));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProjectLog(project.id);
    }
  });

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
  collapseHeader();
  logMinutes.focus();
}

function closeLogModal() {
  modal.classList.add("hidden");
  releaseHeader();
}

function renderProjectLog(projectId) {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) {
    projectLogModal.dataset.projectId = "";
    projectNoteInput.value = "";
    projectNoteInput.disabled = true;
    projectNoteStatus.textContent = "Kein Projekt geladen";
    saveProjectNoteBtn.disabled = true;
    noteDirty = false;
    return;
  }
  projectLogModal.dataset.projectId = projectId;
  projectLogTitle.textContent = project.name;
  const minutes = projectMinutes(projectId);
  projectLogMeta.textContent = `${formatMinutes(minutes)} · ${formatDateShort(project.updatedAt)} aktualisiert`;
  projectNoteInput.value = project.note ?? "";
  projectNoteInput.disabled = false;
  noteDirty = false;
  saveProjectNoteBtn.disabled = true;
  projectNoteStatus.textContent = project.note?.trim() ? "Gespeichert" : "Leer – Notizzettel speichern, wenn du ihn ergänzt";
  projectLogList.innerHTML = "";
  const logs = state.logs.filter((log) => log.projectId === projectId);
  if (!logs.length) {
    projectLogList.innerHTML = '<p class="muted">Keine Logs vorhanden.</p>';
    return;
  }
  logs.forEach((log) => {
    const item = document.createElement("div");
    item.className = "log-entry";
    item.innerHTML = `
      <div class="log-entry-header">
        <span class="meta">${formatDate(log.createdAt)}</span>
        <span class="chip">${formatMinutes(log.minutes)}</span>
      </div>
      <p class="log-note">${log.note || "Kein Kommentar"}</p>
    `;
    projectLogList.appendChild(item);
  });
}

function openProjectLog(projectId) {
  renderProjectLog(projectId);
  if (!projectLogModal.dataset.projectId) return;
  projectLogModal.classList.remove("hidden");
  collapseHeader();
}

function closeProjectLog() {
  projectLogModal.classList.add("hidden");
  projectLogModal.dataset.projectId = "";
  releaseHeader();
}

async function saveProjectNote() {
  if (!noteDirty) return;
  const projectId = projectLogModal.dataset.projectId;
  if (!projectId) return;
  projectNoteStatus.textContent = "Speichere...";
  saveProjectNoteBtn.disabled = true;
  const noteText = projectNoteInput.value.trim();
  const { error } = await updateProjectNoteRemote(projectId, noteText);
  if (error) {
    projectNoteStatus.textContent = "Fehler beim Speichern";
    saveProjectNoteBtn.disabled = false;
    showToast(error, "error");
    return;
  }
  projectNoteInput.value = noteText;
  noteDirty = false;
  projectNoteStatus.textContent = "Gespeichert";
  showToast("Notizzettel aktualisiert", "success");
  await refreshState(false);
  renderProjectLog(projectId);
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
      note: formData.get("note"),
    });
    const { error } = await createProjectRecord({ name: project.name, goal: project.goal, note: project.note });
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
  closeProjectLogBtn.addEventListener("click", closeProjectLog);
  projectLogAddUpdate.addEventListener("click", () => {
    const projectId = projectLogModal.dataset.projectId;
    closeProjectLog();
    if (projectId) {
      openLogModal(projectId);
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeLogModal();
  });

  projectLogModal.addEventListener("click", (event) => {
    if (event.target === projectLogModal) closeProjectLog();
  });

  projectNoteInput.addEventListener("input", () => {
    noteDirty = true;
    projectNoteStatus.textContent = "Änderungen nicht gespeichert";
    saveProjectNoteBtn.disabled = false;
  });
  saveProjectNoteBtn.addEventListener("click", () => saveProjectNote());

  window.addEventListener("resize", updateModalOffset);

  aiGenerateBtn?.addEventListener("click", () => requestAiUpdate());
}

function initTheme() {
  const theme = state.settings?.theme ?? "dark";
  applyTheme(theme);
}

async function init() {
  initTheme();
  updateModalOffset();
  bindEvents();
  render();
  updateAiAvailability();
  await refreshState(true);
  updateModalOffset();
}

init();
