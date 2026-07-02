const demoUsers = [
  {
    username: "admin.demo",
    password: "demo123",
    fullName: "Demo Admin",
    email: "admin.demo@example.invalid",
    role: "Admin",
    status: "Active",
    createdDate: "2026-06-10",
    lastLogin: "Never",
    accessGroup: "All",
  },
  {
    username: "user.demo",
    password: "demo123",
    fullName: "Demo Standard User",
    email: "user.demo@example.invalid",
    role: "Standard User",
    status: "Active",
    createdDate: "2026-06-11",
    lastLogin: "Never",
    accessGroup: "Council",
  },
];

const teams = [
  { org: "Council", team: "Council Tax", skill: "Billing", policy: "VoG Council Standard Retention" },
  { org: "Council", team: "Housing Repairs", skill: "Repairs", policy: "VoG Council Standard Retention" },
  { org: "Council", team: "Waste Services", skill: "Collections", policy: "VoG Council Standard Retention" },
  { org: "CAV247", team: "CAV247 Urgent Care", skill: "Health Advice", policy: "CAV247 Clinical Contact Retention" },
  { org: "Daytime", team: "Daytime Services", skill: "Appointments", policy: "UHB Daytime Services Retention" },
];

const firstNames = ["Avery", "Morgan", "Taylor", "Jordan", "Casey", "Riley", "Harper", "Quinn", "Rowan", "Jamie"];
const lastNames = ["Ellis", "Morgan", "Reed", "Parker", "Hayes", "Cole", "Bennett", "Foster", "Wells", "Grant"];
const dispositions = ["Resolved", "Transferred", "Callback booked", "Information provided", "No answer", "Escalated", "Follow-up required"];
const directions = ["Inbound", "Outbound"];
const startReasons = ["New contact", "Transfer accepted", "Queue callback", "Consult started"];
const endReasons = ["Agent ended", "Customer ended", "Transferred", "System timeout"];
const alerts = ["None", "Short silence detected", "Screen recording missing", "Audio level warning", "Hold segment detected"];
const voiceStatuses = ["Available", "Available", "Available", "Processing", "Unavailable"];
const screenStatuses = ["Available", "Missing", "Not captured", "Available", "Processing"];

const state = {
  users: structuredClone(demoUsers),
  currentUser: null,
  recordings: buildRecordings(),
  audit: [],
  selectedRecordingId: null,
  search: {
    startDate: "",
    endDate: "",
    agentName: "",
    transcript: "",
  },
  sortKey: "startDate",
  sortDirection: "desc",
  pageSize: 25,
  playback: {
    recordingId: null,
    timer: null,
    utterance: null,
    position: 0,
    startedAt: null,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  renderAll();
});

function buildRecordings() {
  return Array.from({ length: 24 }, (_, index) => {
    const teamInfo = teams[index % teams.length];
    const agentIndex = index % firstNames.length;
    const callDate = new Date("2026-07-02T10:45:00");
    callDate.setHours(callDate.getHours() - index * 7);
    const durationSeconds = 95 + ((index * 37) % 510);
    const endDate = new Date(callDate.getTime() + durationSeconds * 1000);
    const primaryAgent = makeAgent(index, 1, teamInfo, agentIndex);
    const agents = Array.from({ length: 5 }, (_, agentOffset) =>
      makeAgent(index, agentOffset + 1, teamInfo, (agentIndex + agentOffset) % firstNames.length)
    );

    return {
      id: `REC-${String(index + 1).padStart(4, "0")}`,
      acdCallId: `ACD-${20260700 + index + 1}`,
      masterContactId: `MC-${840000 + index * 9}`,
      segmentId: `SEG-${3100 + index}`,
      segmentStartReason: startReasons[index % startReasons.length],
      segmentEndReason: endReasons[index % endReasons.length],
      direction: directions[index % directions.length],
      startDate: callDate.toISOString(),
      endDate: endDate.toISOString(),
      channelType: index % 3 === 0 ? "Voice and screen" : "Voice",
      screenRecording: index % 3 === 0 ? "Yes" : "No",
      voiceRecordingStatus: voiceStatuses[index % voiceStatuses.length],
      screenRecordingStatus: screenStatuses[index % screenStatuses.length],
      recordingAlerts: alerts[index % alerts.length],
      policyName: teamInfo.policy,
      ani: fictionalNumber(index, "ani"),
      dnis: fictionalNumber(index, "dnis"),
      acwSeconds: 18 + ((index * 11) % 160),
      disposition: dispositions[index % dispositions.length],
      agentName: primaryAgent.name,
      agentUserId: primaryAgent.userId,
      agentAcdId: primaryAgent.acdId,
      agentTeamId: primaryAgent.teamId,
      team: teamInfo.team,
      skills: teamInfo.skill,
      org: teamInfo.org,
      durationSeconds,
      recordingFormat: "MP4",
      transcriptPreview: transcriptFor(index),
      agents,
    };
  });
}

function makeAgent(recordIndex, slot, teamInfo, nameIndex) {
  return {
    slot,
    userId: `USR-${slot}${String(200 + recordIndex + nameIndex).padStart(3, "0")}`,
    acdId: `ACDAG-${7000 + recordIndex + slot}`,
    name: `${firstNames[nameIndex]} ${lastNames[(recordIndex + slot) % lastNames.length]}`,
    teamId: `TEAM-${teamInfo.org.toUpperCase()}-${(recordIndex % 4) + 1}`,
    team: teamInfo.team,
    skills: `${teamInfo.skill}${slot > 1 ? ", Support" : ""}`,
  };
}

function fictionalNumber(index, type) {
  const base = type === "ani" ? 1000 : 2000;
  return `01632 ${String(base + index).padStart(4, "0")}`;
}

function transcriptFor(index) {
  const topics = [
    "Customer asks for an update on a service request. Agent confirms identity using demo-safe information and provides the current status.",
    "Caller requests appointment availability. Agent checks the simulated schedule and explains the next steps.",
    "Customer reports an issue with a local service. Agent captures the fictional reference and confirms follow-up expectations.",
    "Outbound callback confirms that the previous query was resolved and no further action is required.",
  ];
  return `Transcript preview\n${topics[index % topics.length]}\n\nThis is fictional text for prototype display only.`;
}

function bindEvents() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("searchButton").addEventListener("click", () => {
    readSearchInputs();
    logAudit("Recording searched");
    renderRecordings();
  });
  document.getElementById("clearButton").addEventListener("click", clearSearch);
  getSearchInputs().forEach((input) => {
    input.addEventListener("input", () => {
      readSearchInputs();
      renderRecordings();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("searchButton").click();
      }
    });
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  document.querySelectorAll("th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;
      state.sortDirection = state.sortKey === key && state.sortDirection === "asc" ? "desc" : "asc";
      state.sortKey = key;
      renderRecordings();
    });
  });
  document.getElementById("pageSize").addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value);
    renderRecordings();
  });
  document.getElementById("createUserForm").addEventListener("submit", createUser);
}

function getSearchInputs() {
  return [
    document.getElementById("startDateInput"),
    document.getElementById("endDateInput"),
    document.getElementById("agentNameInput"),
    document.getElementById("transcriptInput"),
  ];
}

function readSearchInputs() {
  state.search.startDate = document.getElementById("startDateInput").value;
  state.search.endDate = document.getElementById("endDateInput").value;
  state.search.agentName = document.getElementById("agentNameInput").value.trim();
  state.search.transcript = document.getElementById("transcriptInput").value.trim();
}

function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const user = state.users.find((candidate) => candidate.username === username && candidate.password === password);
  const error = document.getElementById("loginError");

  if (!user) {
    error.textContent = "Invalid demo username or password.";
    return;
  }

  if (user.status !== "Active") {
    error.textContent = "This demo user is disabled.";
    return;
  }

  state.currentUser = user;
  user.lastLogin = formatDateTime(new Date().toISOString());
  error.textContent = "";
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("workspace").classList.remove("hidden");
  logAudit("User logged in");
  showView("searchView");
  renderAll();
}

function logout() {
  stopPlayback("Playback paused");
  state.currentUser = null;
  state.selectedRecordingId = null;
  document.getElementById("workspace").classList.add("hidden");
  document.getElementById("loginView").classList.remove("hidden");
}

function showView(viewId) {
  if (!state.currentUser) return;
  if (viewId !== "searchView" && state.currentUser.role !== "Admin") return;

  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  document.getElementById("viewTitle").textContent = {
    searchView: "Recording Search",
    usersView: "User Management",
    auditView: "Audit Trail",
  }[viewId];
  renderAll();
}

function renderAll() {
  renderUserChrome();
  renderRecordings();
  renderDetail();
  renderUsers();
  renderAudit();
}

function renderUserChrome() {
  if (!state.currentUser) return;
  document.getElementById("activeName").textContent = state.currentUser.fullName;
  document.getElementById("activeUsername").textContent = state.currentUser.username;
  document.getElementById("activeRole").textContent = state.currentUser.role;
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", state.currentUser.role !== "Admin");
  });
}

function renderRecordings() {
  if (!state.currentUser) return;
  const filtered = getFilteredRecordings();
  const tbody = document.querySelector("#recordingsTable tbody");
  tbody.innerHTML = "";
  document.getElementById("resultCount").textContent = `${filtered.length} recording${filtered.length === 1 ? "" : "s"}`;

  filtered.slice(0, state.pageSize).forEach((recording) => {
    const row = document.createElement("tr");
    row.classList.toggle("selected", recording.id === state.selectedRecordingId);
    row.innerHTML = `
      <td>${formatDateTime(recording.startDate)}</td>
      <td>${recording.acdCallId}</td>
      <td>${recording.direction}</td>
      <td>${recording.ani}</td>
      <td>${recording.dnis}</td>
      <td>${recording.agentName}</td>
      <td>${recording.team}</td>
      <td>${recording.disposition}</td>
      <td>${statusBadge(recording.voiceRecordingStatus)}</td>
      <td>${statusBadge(recording.screenRecordingStatus)}</td>
      <td>${formatDuration(recording.durationSeconds)}</td>
      <td><button class="play-button" data-play-id="${recording.id}">Play</button></td>
    `;
    row.addEventListener("click", (event) => {
      if (event.target.matches("button")) return;
      selectRecording(recording.id);
    });
    row.querySelector("button").addEventListener("click", (event) => {
      event.stopPropagation();
      selectRecording(recording.id);
      startPlayback(recording.id);
    });
    tbody.append(row);
  });
}

function getFilteredRecordings() {
  const agentTokens = tokenizeSearch(state.search.agentName);
  const transcriptQuery = normalizeSearch(state.search.transcript);

  return state.recordings
    .filter((recording) => state.currentUser.role === "Admin" || recording.org === state.currentUser.accessGroup)
    .filter((recording) => {
      if (!state.search.startDate) return true;
      return recording.startDate.slice(0, 10) >= state.search.startDate;
    })
    .filter((recording) => {
      if (!state.search.endDate) return true;
      return recording.startDate.slice(0, 10) <= state.search.endDate;
    })
    .filter((recording) => agentMatches(recording, agentTokens))
    .filter((recording) => !transcriptQuery || normalizeSearch(recording.transcriptPreview).includes(transcriptQuery))
    .sort((a, b) => {
      const left = a[state.sortKey];
      const right = b[state.sortKey];
      const result = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
      return state.sortDirection === "asc" ? result : -result;
    });
}

function agentMatches(recording, agentTokens) {
  if (!agentTokens.length) return true;
  const agentName = normalizeSearch(recording.agentName);
  return agentTokens.every((token) => agentName.includes(token));
}

function normalizeSearch(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenizeSearch(value) {
  const normalized = normalizeSearch(value);
  return normalized ? normalized.split(" ") : [];
}

function selectRecording(recordingId) {
  state.selectedRecordingId = recordingId;
  const recording = findRecording(recordingId);
  logAudit("Recording opened", recording);
  renderRecordings();
  renderDetail();
}

function renderDetail() {
  const panel = document.getElementById("detailPanel");
  const recording = findRecording(state.selectedRecordingId);
  if (!recording) {
    panel.innerHTML = `
      <div class="empty-state">
        <strong>Select a recording</strong>
        <span>Metadata, transcript preview, and MP4 playback controls will appear here.</span>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="detail-header">
      <h3>${recording.acdCallId}</h3>
      <div class="badge-row">
        <span class="mini-badge">Recording ID ${recording.id}</span>
        <span class="mini-badge">${recording.recordingFormat}</span>
        <span class="mini-badge">Signed playback URL simulated</span>
        <span class="mini-badge">User status checked before playback</span>
      </div>
    </div>
    <div class="detail-body">
      <div class="meta-grid">
        ${meta("ACD Call ID", recording.acdCallId)}
        ${meta("Segment ID", recording.segmentId)}
        ${meta("Segment Start Reason", recording.segmentStartReason)}
        ${meta("Segment End Reason", recording.segmentEndReason)}
        ${meta("Direction", recording.direction)}
        ${meta("Start Date", formatDateTime(recording.startDate))}
        ${meta("End Date", formatDateTime(recording.endDate))}
        ${meta("ANI", recording.ani)}
        ${meta("DNIS", recording.dnis)}
        ${meta("ACW", `${recording.acwSeconds} seconds`)}
        ${meta("Disposition", recording.disposition)}
        ${meta("Channel Type", recording.channelType)}
        ${meta("Policy Name", recording.policyName)}
        ${meta("Voice Recording Status", recording.voiceRecordingStatus)}
        ${meta("Screen Recording Status", recording.screenRecordingStatus)}
        ${meta("Recording Alerts", recording.recordingAlerts)}
      </div>
      <section>
        <h3>Agent 1 to Agent 5 details</h3>
        <div class="agents-list">
          ${recording.agents.map(agentCard).join("")}
        </div>
      </section>
      <section>
        <h3>Transcript preview</h3>
        <pre class="transcript">${escapeHtml(recording.transcriptPreview)}</pre>
      </section>
      <section class="player-box">
        <strong>MP4 playback control</strong>
        <div class="player-controls">
          <button id="detailPlayButton">Play</button>
          <button id="detailPauseButton" class="ghost-button">Pause</button>
          <button id="detailCompleteButton" class="ghost-button">Complete</button>
          <div class="progress-track"><div id="progressBar" class="progress-bar"></div></div>
        </div>
        <span id="playbackStatus">Playback idle. Access will be logged when playback starts.</span>
        <span class="voice-message">Dummy browser voice playback uses fictional script text only.</span>
        <span class="download-message">Download disabled. Playback only.</span>
      </section>
    </div>
  `;

  document.getElementById("detailPlayButton").addEventListener("click", () => startPlayback(recording.id));
  document.getElementById("detailPauseButton").addEventListener("click", () => stopPlayback("Playback paused"));
  document.getElementById("detailCompleteButton").addEventListener("click", () => completePlayback());
  updatePlaybackUi();
}

function agentCard(agent) {
  return `
    <div class="agent-card">
      <strong>Agent ${agent.slot}: ${agent.name}</strong>
      <div class="meta-grid">
        ${meta("User ID", agent.userId)}
        ${meta("ACD ID", agent.acdId)}
        ${meta("Name", agent.name)}
        ${meta("Team ID", agent.teamId)}
        ${meta("Team", agent.team)}
        ${meta("Skills", agent.skills)}
      </div>
    </div>
  `;
}

function meta(label, value) {
  return `<div class="meta-item"><span>${label}</span>${escapeHtml(String(value))}</div>`;
}

function startPlayback(recordingId) {
  const recording = findRecording(recordingId);
  if (!recording || !state.currentUser || state.currentUser.status !== "Active") return;
  if (recording.voiceRecordingStatus === "Unavailable") {
    logAudit("Playback unavailable", recording);
    return;
  }

  stopPlayback(null);
  state.playback.recordingId = recordingId;
  state.playback.position = 0;
  state.playback.startedAt = new Date();
  logAudit("Playback started", recording, { playbackStarted: state.playback.startedAt.toISOString(), playbackDuration: "0:00" });
  playDummyVoice(recording);
  state.playback.timer = window.setInterval(() => {
    state.playback.position += 1;
    if (state.playback.position >= Math.min(recording.durationSeconds, 30)) {
      completePlayback();
    } else {
      updatePlaybackUi();
    }
  }, 1000);
  updatePlaybackUi();
}

function stopPlayback(action) {
  if (state.playback.timer) {
    window.clearInterval(state.playback.timer);
  }
  stopDummyVoice();
  const recording = findRecording(state.playback.recordingId);
  if (action && recording) {
    logAudit(action, recording, {
      playbackStarted: state.playback.startedAt?.toISOString(),
      playbackStopped: new Date().toISOString(),
      playbackDuration: formatDuration(state.playback.position),
    });
  }
  state.playback.timer = null;
  state.playback.utterance = null;
  state.playback.recordingId = null;
  state.playback.position = 0;
  state.playback.startedAt = null;
  updatePlaybackUi();
}

function playDummyVoice(recording) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;

  stopDummyVoice();
  const script = [
    "Demo call recording playback.",
    `Recording ${recording.acdCallId}.`,
    `Direction ${recording.direction}.`,
    `Agent ${recording.agentName}, team ${recording.team}.`,
    "This is a fictional dummy voice for prototype demonstration only.",
    "No real customer audio, phone call, or NICE export is being played.",
  ].join(" ");
  const utterance = new SpeechSynthesisUtterance(script);
  utterance.lang = "en-GB";
  utterance.rate = 0.92;
  utterance.pitch = 0.96;
  utterance.volume = 0.85;
  state.playback.utterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopDummyVoice() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function completePlayback() {
  const recording = findRecording(state.playback.recordingId || state.selectedRecordingId);
  if (!recording) return;
  logAudit("Playback completed", recording, {
    playbackStarted: state.playback.startedAt?.toISOString(),
    playbackStopped: new Date().toISOString(),
    playbackDuration: formatDuration(state.playback.position || recording.durationSeconds),
  });
  stopPlayback(null);
}

function updatePlaybackUi() {
  const status = document.getElementById("playbackStatus");
  const progress = document.getElementById("progressBar");
  const recording = findRecording(state.selectedRecordingId);
  if (!status || !progress || !recording) return;
  const isPlaying = state.playback.recordingId === recording.id;
  const percent = isPlaying ? Math.min(100, (state.playback.position / Math.min(recording.durationSeconds, 30)) * 100) : 0;
  progress.style.width = `${percent}%`;
  status.textContent = isPlaying
    ? `Playing signed MP4 stream simulation. Elapsed ${formatDuration(state.playback.position)}.`
    : "Playback idle. Access will be logged when playback starts.";
}

function renderUsers() {
  if (!state.currentUser || state.currentUser.role !== "Admin") return;
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "";
  state.users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.fullName}</td>
      <td>${user.email}</td>
      <td>
        <select data-role-user="${user.username}">
          <option ${user.role === "Standard User" ? "selected" : ""}>Standard User</option>
          <option ${user.role === "Admin" ? "selected" : ""}>Admin</option>
        </select>
      </td>
      <td>${statusBadge(user.status)}</td>
      <td>${user.createdDate}</td>
      <td>${user.lastLogin}</td>
      <td>
        <div class="action-row">
          <button class="small-button danger-button" data-disable="${user.username}" ${user.status === "Disabled" ? "disabled" : ""}>Disable</button>
          <button class="small-button" data-enable="${user.username}" ${user.status === "Active" ? "disabled" : ""}>Re-enable</button>
        </div>
      </td>
    `;
    tbody.append(row);
  });

  tbody.querySelectorAll("[data-role-user]").forEach((select) => {
    select.addEventListener("change", () => {
      const user = state.users.find((candidate) => candidate.username === select.dataset.roleUser);
      user.role = select.value;
      logAudit("User role changed");
      renderUsers();
    });
  });
  tbody.querySelectorAll("[data-disable]").forEach((button) => button.addEventListener("click", () => setUserStatus(button.dataset.disable, "Disabled")));
  tbody.querySelectorAll("[data-enable]").forEach((button) => button.addEventListener("click", () => setUserStatus(button.dataset.enable, "Active")));
}

function createUser(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const username = data.get("username").trim();
  if (state.users.some((user) => user.username === username)) return;
  state.users.push({
    username,
    password: "demo123",
    fullName: data.get("fullName").trim(),
    email: data.get("email").trim(),
    role: data.get("role"),
    status: "Active",
    createdDate: new Date().toISOString().slice(0, 10),
    lastLogin: "Never",
    accessGroup: "Council",
  });
  form.reset();
  logAudit("User created");
  renderUsers();
}

function setUserStatus(username, status) {
  const user = state.users.find((candidate) => candidate.username === username);
  if (!user) return;
  user.status = status;
  logAudit(status === "Active" ? "User re-enabled" : "User disabled");
  renderUsers();
}

function renderAudit() {
  if (!state.currentUser || state.currentUser.role !== "Admin") return;
  const tbody = document.querySelector("#auditTable tbody");
  tbody.innerHTML = "";
  document.getElementById("auditCount").textContent = `${state.audit.length} audit event${state.audit.length === 1 ? "" : "s"}`;
  state.audit.slice().reverse().forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDateTime(entry.timestamp)}</td>
      <td>${entry.username}</td>
      <td>${entry.userRole}</td>
      <td>${entry.action}</td>
      <td>${entry.recordingId || "-"}</td>
      <td>${entry.acdCallId || "-"}</td>
      <td>${entry.ani || "-"}</td>
      <td>${entry.dnis || "-"}</td>
      <td>${entry.agentName || "-"}</td>
      <td>${entry.playbackStarted ? formatDateTime(entry.playbackStarted) : "-"}</td>
      <td>${entry.playbackStopped ? formatDateTime(entry.playbackStopped) : "-"}</td>
      <td>${entry.playbackDuration || "-"}</td>
      <td>${entry.userStatusAtAccess}</td>
    `;
    tbody.append(row);
  });
}

function logAudit(action, recording = null, extras = {}) {
  if (!state.currentUser) return;
  state.audit.push({
    timestamp: new Date().toISOString(),
    username: state.currentUser.username,
    userRole: state.currentUser.role,
    action,
    recordingId: recording?.id || "",
    acdCallId: recording?.acdCallId || "",
    ani: recording?.ani || "",
    dnis: recording?.dnis || "",
    agentName: recording?.agentName || "",
    playbackStarted: extras.playbackStarted || "",
    playbackStopped: extras.playbackStopped || "",
    playbackDuration: extras.playbackDuration || "",
    userStatusAtAccess: state.currentUser.status,
  });
  renderAudit();
}

function clearSearch() {
  state.search = {
    startDate: "",
    endDate: "",
    agentName: "",
    transcript: "",
  };
  getSearchInputs().forEach((input) => {
    input.value = "";
  });
  renderRecordings();
}

function findRecording(recordingId) {
  return state.recordings.find((recording) => recording.id === recordingId);
}

function statusBadge(value) {
  const normalized = String(value).toLowerCase();
  const className = normalized.includes("active") || normalized.includes("available") || normalized.includes("none")
    ? "ok"
    : normalized.includes("disabled") || normalized.includes("unavailable") || normalized.includes("missing")
      ? "danger"
      : "warn";
  return `<span class="status-badge ${className}">${escapeHtml(String(value))}</span>`;
}

function formatDateTime(value) {
  if (!value || value === "Never") return value || "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
