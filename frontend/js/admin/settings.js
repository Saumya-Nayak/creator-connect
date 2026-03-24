const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? `http://${location.hostname}:3000/api`
    : "/api";

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

// ─── State ───────────────────────────────────────────────────────────────────
let sessState = {
  page: 1,
  limit: 20,
  search: "",
  status_filter: "",
  total: 0,
  pages: 1,
};
let adminState = { page: 1, limit: 20, search: "", total: 0, pages: 1 };

let accountDirty = false;
let currentAdminId = null;
let currentSessionToken = null;

// ─── Auth Gate ───────────────────────────────────────────────────────────────
(async function checkAuth() {
  const token =
    localStorage.getItem("adminAuthToken") ||
    sessionStorage.getItem("adminAuthToken");
  if (!token) {
    location.href = "login.html";
    return;
  }
  try {
    const r = await fetch(`${API}/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      location.href = "login.html";
      return;
    }
    const data = await r.json();
    currentAdminId = data.user?.id || data.id;
  } catch (e) {}
  currentSessionToken = token;
  authGate.classList.add("hide");
  setTimeout(() => authGate.remove(), 450);
  initPage();
})();

// ─── Sidebar messaging ───────────────────────────────────────────────────────
window.addEventListener("message", (e) => {
  if (e.data?.type === "sb-collapse") {
    sidebarFrame.classList.toggle("collapsed", e.data.collapsed);
    mainContent.classList.toggle("sb-collapsed", e.data.collapsed);
  }
  if (e.data?.type === "sb-theme") {
    document.documentElement.setAttribute(
      "data-theme",
      e.data.dark ? "dark" : "light"
    );
  }
  if (e.data?.type === "sb-logout-request") openLogoutModal();
});
const _initCol = localStorage.getItem("sbCol") === "1";
if (_initCol) {
  sidebarFrame.classList.add("collapsed");
  mainContent.classList.add("sb-collapsed");
}
document.documentElement.setAttribute(
  "data-theme",
  localStorage.getItem("adminTheme") || "dark"
);

function syncSidebarState() {
  try {
    sidebarFrame.contentWindow.postMessage(
      {
        type: "parent-init",
        collapsed: localStorage.getItem("sbCol") === "1",
        dark: (localStorage.getItem("adminTheme") || "dark") === "dark",
        page: "settings",
      },
      "*"
    );
  } catch (e) {}
}

// ─── Logout ──────────────────────────────────────────────────────────────────
const logoutModal = document.getElementById("logoutModal");
document
  .getElementById("logoutCancelBtn")
  .addEventListener("click", () => logoutModal.classList.remove("show"));
document.getElementById("logoutConfirmBtn").addEventListener("click", () => {
  ["adminAuthToken", "adminData"].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  location.href = "login.html";
});
function openLogoutModal() {
  logoutModal.classList.add("show");
}
logoutModal.addEventListener("click", (e) => {
  if (e.target === logoutModal) logoutModal.classList.remove("show");
});

// ─── API helper ───────────────────────────────────────────────────────────────
function authHeaders() {
  const t =
    localStorage.getItem("adminAuthToken") ||
    sessionStorage.getItem("adminAuthToken");
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : {};
}
async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(API + path, { headers: authHeaders(), ...opts });
    if (!r.ok) {
      const err = await r.json().catch(() => {});
      return { _error: err?.error || "Error", _status: r.status };
    }
    return await r.json();
  } catch {
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escHtml(s) {
  if (!s && s !== 0) return "—";
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// ─── Init page ───────────────────────────────────────────────────────────────
function initPage() {
  loadAccount();
  loadSessions(); // default tab

  let sessDeb, adminDeb;
  document.getElementById("sessSearch").addEventListener("input", (e) => {
    clearTimeout(sessDeb);
    sessDeb = setTimeout(() => {
      sessState.search = e.target.value;
      sessState.page = 1;
      loadSessions();
    }, 300);
  });
  document
    .getElementById("sessStatusFilter")
    .addEventListener("change", (e) => {
      sessState.status_filter = e.target.value;
      sessState.page = 1;
      loadSessions();
    });
  document.getElementById("adminSearch").addEventListener("input", (e) => {
    clearTimeout(adminDeb);
    adminDeb = setTimeout(() => {
      adminState.search = e.target.value;
      adminState.page = 1;
      loadAdmins();
    }, 300);
  });

  // Modal backdrops
  ["revokeModal", "pwModal", "revokeAdminModal", "assignAdminModal"].forEach(
    (id) => {
      document.getElementById(id).addEventListener("click", (e) => {
        if (e.target === document.getElementById(id)) closeModal(id);
      });
    }
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [
        "revokeModal",
        "pwModal",
        "revokeAdminModal",
        "assignAdminModal",
      ].forEach((id) => closeModal(id));
    }
  });
}

// ─── Tab switching ────────────────────────────────────────────────────────────
let _activeTab = "sessions";
function switchTab(tab, btn) {
  _activeTab = tab;
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  if (tab === "sessions") loadSessions();
  else if (tab === "admins") loadAdmins();
}

// ════════════════════════════════════════════════════════════════════════════
//  ACCOUNT SECTION
// ════════════════════════════════════════════════════════════════════════════
async function loadAccount() {
  const d = await apiFetch("/admin/settings/profile");
  if (!d || d._error) return;
  const u = d.user || d;
  currentAdminId = u.id;

  const avEl = document.getElementById("accountAvatarEl");
  avEl.textContent = initials(u.full_name || u.username);
  document.getElementById("accountAvatarName").textContent =
    u.full_name || u.username || "Admin";

  document.getElementById("acc-fullname").value = u.full_name || "";
  document.getElementById("acc-username").value = u.username || "";
  document.getElementById("acc-email").value = u.email || "";
  document.getElementById("acc-phone").value = u.phone || "";
  document.getElementById("acc-website").value = u.website_url || "";

  accountDirty = false;
  document.getElementById("accountSaveBtn").disabled = true;
  document.getElementById("accountDot").classList.remove("show");
}

function onAccountEdit() {
  if (!accountDirty) {
    accountDirty = true;
    document.getElementById("accountSaveBtn").disabled = false;
    document.getElementById("accountDot").classList.add("show");
  }
}

async function saveAccount() {
  const payload = {
    full_name: document.getElementById("acc-fullname").value.trim(),
    username: document.getElementById("acc-username").value.trim(),
    email: document.getElementById("acc-email").value.trim(),
    phone: document.getElementById("acc-phone").value.trim(),
    website_url: document.getElementById("acc-website").value.trim(),
  };
  if (!payload.email) {
    showToast("Email is required", "warn");
    return;
  }
  const btn = document.getElementById("accountSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const r = await apiFetch("/admin/settings/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  btn.innerHTML =
    '<i class="fas fa-floppy-disk"></i> Save Profile <span class="unsaved-dot" id="accountDot"></span>';
  if (r?.success) {
    showToast("Profile updated!", "success");
    accountDirty = false;
    document.getElementById("accountDot").classList.remove("show");
    document.getElementById("accountSavedAt").textContent =
      "Saved at " + new Date().toLocaleTimeString("en-IN");
    document.getElementById("accountAvatarEl").textContent = initials(
      payload.full_name || payload.username
    );
    document.getElementById("accountAvatarName").textContent =
      payload.full_name || payload.username;
  } else {
    showToast(r?._error || "Failed to save", "error");
    btn.disabled = false;
  }
}

function togglePw(id, btn) {
  const el = document.getElementById(id);
  const show = el.type === "password";
  el.type = show ? "text" : "password";
  btn.querySelector("i").className = show ? "fas fa-eye-slash" : "fas fa-eye";
}

async function submitChangePassword() {
  const current = document.getElementById("pw-current").value;
  const pw = document.getElementById("pw-new").value;
  const confirm = document.getElementById("pw-confirm").value;
  if (!current) {
    showToast("Enter current password", "warn");
    return;
  }
  if (pw.length < 8) {
    showToast("New password must be at least 8 characters", "warn");
    return;
  }
  if (pw !== confirm) {
    showToast("Passwords do not match", "warn");
    return;
  }
  const btn = document.getElementById("pwSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating…';
  const r = await apiFetch("/admin/settings/change-password", {
    method: "PUT",
    body: JSON.stringify({ current_password: current, new_password: pw }),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-key"></i> Update Password';
  if (r?.success) {
    showToast("Password changed successfully!", "success");
    closeModal("pwModal");
    ["pw-current", "pw-new", "pw-confirm"].forEach(
      (id) => (document.getElementById(id).value = "")
    );
  } else {
    showToast(r?._error || "Failed to change password", "error");
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN SESSIONS
// ════════════════════════════════════════════════════════════════════════════
function resetSessFilters() {
  document.getElementById("sessSearch").value = "";
  document.getElementById("sessStatusFilter").value = "";
  sessState.search = "";
  sessState.status_filter = "";
  sessState.page = 1;
  loadSessions();
}

async function loadSessions() {
  const tbody = document.getElementById("sessTableBody");
  tbody.innerHTML = tableSkels(8, 8);
  const p = new URLSearchParams({
    page: sessState.page,
    limit: sessState.limit,
    search: sessState.search,
    status: sessState.status_filter,
  });
  const d = await apiFetch(`/admin/settings/sessions?${p}`);
  if (!d || d._error) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-desktop"></i><p>Failed to load sessions</p></div></td></tr>`;
    return;
  }
  sessState.total = d.total;
  sessState.pages = d.pages;
  if (!d.sessions.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-desktop"></i><p>No sessions found</p></div></td></tr>`;
    document.getElementById("sessPagination").innerHTML = "";
    return;
  }
  tbody.innerHTML = d.sessions.map((s, i) => renderSessRow(s, i)).join("");
  renderPagination("sessPagination", sessState, gotoSessPage);
}

function renderSessRow(s, idx) {
  const delay = (idx % 20) * 0.025;
  const now = new Date();
  const exp = new Date(s.expires_at);
  const isActive = s.is_active && exp > now;
  const isCurrent =
    s.token_prefix && currentSessionToken?.startsWith(s.token_prefix);

  const badge = isCurrent
    ? `<span class="sess-badge current">🟢 This Session</span>`
    : isActive
    ? `<span class="sess-badge active">🟢 Active</span>`
    : `<span class="sess-badge expired">⚫ Expired</span>`;

  const ini = initials(s.admin_name || s.admin_username);
  const revokeBtn =
    isActive && !isCurrent
      ? `<button class="act-btn red" title="Revoke" onclick="openRevokeModal(${
          s.session_id
        },'${escHtml(s.admin_name || s.admin_username)}','${escHtml(
          s.ip_address
        )}')"><i class="fas fa-shield-xmark"></i></button>`
      : `<button class="act-btn disabled" title="${
          isCurrent ? "Cannot revoke current session" : "Already inactive"
        }" disabled><i class="fas fa-shield-xmark"></i></button>`;

  return `<tr class="${
    isCurrent ? "current-session" : ""
  }" style="animation:fadeUp .35s var(--ease) ${delay}s both">
    <td><span style="font-weight:800;font-size:.8rem;color:var(--primary)">#${escHtml(
      s.session_id
    )}</span></td>
    <td><div class="user-cell">
      <div class="user-avatar">${ini}</div>
      <div><div class="user-name">${escHtml(
        s.admin_name || s.admin_username
      )}</div>
      <div class="user-sub">@${escHtml(s.admin_username)}</div></div>
    </div></td>
    <td><code style="font-size:.72rem;background:var(--main-bg);padding:2px 7px;border-radius:6px;border:1px solid var(--card-border)">${escHtml(
      s.ip_address
    )}</code></td>
    <td class="agent-pill" title="${escHtml(s.user_agent)}">${escHtml(
    s.user_agent
  )}</td>
    <td style="font-size:.75rem;color:var(--text-secondary);white-space:nowrap">${fmtDateTime(
      s.created_at
    )}</td>
    <td style="font-size:.75rem;white-space:nowrap;${
      exp < now ? "color:var(--red)" : "color:var(--green)"
    }">${fmtDateTime(s.expires_at)}</td>
    <td>${badge}</td>
    <td><div class="act-btns">${revokeBtn}</div></td>
  </tr>`;
}

function gotoSessPage(p) {
  if (p < 1 || p > sessState.pages || p === sessState.page) return;
  sessState.page = p;
  loadSessions();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

function openRevokeModal(sessionId, adminName, ip) {
  document.getElementById("revoke-session-id").value = sessionId;
  document.getElementById(
    "revoke-session-info"
  ).textContent = `${adminName} — IP: ${ip} — Session #${sessionId}`;
  openModal("revokeModal");
}

async function confirmRevoke() {
  const sessionId = document.getElementById("revoke-session-id").value;
  const btn = document.getElementById("revokeConfirmBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Revoking…';
  const r = await apiFetch(`/admin/settings/sessions/${sessionId}/revoke`, {
    method: "DELETE",
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-shield-xmark"></i> Revoke Session';
  if (r?.success) {
    showToast("Session revoked successfully", "success");
    closeModal("revokeModal");
    loadSessions();
  } else {
    showToast(r?._error || "Failed to revoke session", "error");
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  MANAGE ADMINS
// ════════════════════════════════════════════════════════════════════════════
function resetAdminFilters() {
  document.getElementById("adminSearch").value = "";
  adminState.search = "";
  adminState.page = 1;
  loadAdmins();
}

async function loadAdmins() {
  const tbody = document.getElementById("adminTableBody");
  tbody.innerHTML = tableSkels(8, 6);
  const p = new URLSearchParams({
    page: adminState.page,
    limit: adminState.limit,
    search: adminState.search,
  });
  const d = await apiFetch(`/admin/settings/admins?${p}`);
  if (!d || d._error) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-user-shield"></i><p>Failed to load admins</p></div></td></tr>`;
    return;
  }
  adminState.total = d.total;
  adminState.pages = d.pages;
  if (!d.admins.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-user-shield"></i><p>No admins found</p></div></td></tr>`;
    document.getElementById("adminPagination").innerHTML = "";
    return;
  }
  tbody.innerHTML = d.admins.map((a, i) => renderAdminRow(a, i)).join("");
  renderPagination("adminPagination", adminState, gotoAdminPage);
}

function renderAdminRow(a, idx) {
  const delay = (idx % 20) * 0.025;
  const isSelf = a.id === currentAdminId;
  const ini = initials(a.full_name || a.username);
  const roleBadge =
    a.role >= 2
      ? `<span class="sess-badge current">👑 Super Admin</span>`
      : `<span class="sess-badge active">🛡️ Admin</span>`;

  const removeBtn = isSelf
    ? `<button class="act-btn disabled" title="Cannot remove yourself" disabled><i class="fas fa-user-minus"></i></button>`
    : `<button class="act-btn red" title="Remove Admin" onclick="openRevokeAdminModal(${
        a.id
      },'${escHtml(a.full_name || a.username)}','${escHtml(
        a.username
      )}')"><i class="fas fa-user-minus"></i></button>`;

  return `<tr class="${
    isSelf ? "current-session" : ""
  }" style="animation:fadeUp .35s var(--ease) ${delay}s both">
    <td><span style="font-weight:800;font-size:.8rem;color:var(--primary)">#${escHtml(
      a.id
    )}</span></td>
    <td><div class="user-cell">
      <div class="user-avatar">${ini}</div>
      <div><div class="user-name">${escHtml(a.full_name || a.username)}${
    isSelf
      ? ' <span style="font-size:.6rem;color:var(--primary);font-weight:800">(You)</span>'
      : ""
  }</div>
      <div class="user-sub">@${escHtml(a.username)}</div></div>
    </div></td>
    <td style="font-size:.78rem;color:var(--text-secondary)">${escHtml(
      a.email
    )}</td>
    <td style="font-size:.78rem;color:var(--text-secondary)">${escHtml(
      a.phone
    )}</td>
    <td>${roleBadge}</td>
    <td style="font-size:.75rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
      a.created_at
    )}</td>
    <td style="font-size:.75rem;color:var(--text-secondary);white-space:nowrap">${fmtDateTime(
      a.last_login
    )}</td>
    <td><div class="act-btns">${removeBtn}</div></td>
  </tr>`;
}

function gotoAdminPage(p) {
  if (p < 1 || p > adminState.pages || p === adminState.page) return;
  adminState.page = p;
  loadAdmins();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Revoke Admin Modal ───────────────────────────────────────────────────────
function openRevokeAdminModal(adminId, name, username) {
  document.getElementById("revoke-admin-id").value = adminId;
  document.getElementById(
    "revoke-admin-info"
  ).textContent = `${name} (@${username}) — ID #${adminId}`;
  openModal("revokeAdminModal");
}

async function confirmRevokeAdmin() {
  const adminId = document.getElementById("revoke-admin-id").value;
  const btn = document.getElementById("revokeAdminConfirmBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing…';
  const r = await apiFetch(`/admin/settings/admins/${adminId}/revoke`, {
    method: "DELETE",
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-user-minus"></i> Remove Admin';
  if (r?.success) {
    showToast(r.message || "Admin access removed", "success");
    closeModal("revokeAdminModal");
    loadAdmins();
  } else {
    showToast(r?._error || "Failed to remove admin", "error");
  }
}

// ─── Assign Admin Modal ───────────────────────────────────────────────────────
let _assignSearchDeb;
function onAssignSearch() {
  clearTimeout(_assignSearchDeb);
  _assignSearchDeb = setTimeout(async () => {
    const q = document.getElementById("assignSearchInput").value.trim();
    const results = document.getElementById("assignSearchResults");
    if (q.length < 2) {
      results.style.display = "none";
      return;
    }
    results.innerHTML = `<div class="assign-dropdown-item loading"><i class="fas fa-spinner fa-spin"></i> Searching…</div>`;
    results.style.display = "block";
    const d = await apiFetch(
      `/admin/settings/admins/search-users?q=${encodeURIComponent(q)}`
    );
    if (!d || !d.users.length) {
      results.innerHTML = `<div class="assign-dropdown-item empty">No users found</div>`;
      return;
    }
    results.innerHTML = d.users
      .map(
        (u) => `
      <div class="assign-dropdown-item" onclick="selectAssignUser(${
        u.id
      },'${escHtml(u.username)}','${escHtml(
          u.full_name || u.username
        )}','${escHtml(u.email)}')">
        <div class="assign-item-avatar">${initials(
          u.full_name || u.username
        )}</div>
        <div>
          <div style="font-weight:700;font-size:.84rem">${escHtml(
            u.full_name || u.username
          )}</div>
          <div style="font-size:.72rem;color:var(--text-secondary)">@${escHtml(
            u.username
          )} · ${escHtml(u.email)}</div>
        </div>
      </div>
    `
      )
      .join("");
  }, 300);
}

function selectAssignUser(id, username, name, email) {
  document.getElementById("assignUserId").value = id;
  document.getElementById("assignSearchInput").value = "";
  document.getElementById("assignSearchResults").style.display = "none";
  const card = document.getElementById("assignSelectedUser");
  card.style.display = "flex";
  card.innerHTML = `
    <div class="assign-item-avatar" style="width:38px;height:38px;font-size:.85rem">${initials(
      name
    )}</div>
    <div style="flex:1">
      <div style="font-weight:700;font-size:.88rem">${escHtml(name)}</div>
      <div style="font-size:.74rem;color:var(--text-secondary)">@${escHtml(
        username
      )} · ${escHtml(email)}</div>
    </div>
    <button style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:.9rem" onclick="clearAssignUser()" title="Clear">
      <i class="fas fa-xmark"></i>
    </button>
  `;
  document.getElementById("assignConfirmBtn").disabled = false;
}

function clearAssignUser() {
  document.getElementById("assignUserId").value = "";
  document.getElementById("assignSelectedUser").style.display = "none";
  document.getElementById("assignConfirmBtn").disabled = true;
}

async function confirmAssignAdmin() {
  const userId = document.getElementById("assignUserId").value;
  if (!userId) {
    showToast("Please select a user first", "warn");
    return;
  }
  const btn = document.getElementById("assignConfirmBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning…';
  const r = await apiFetch("/admin/settings/admins/assign", {
    method: "POST",
    body: JSON.stringify({ user_id: parseInt(userId) }),
  });
  btn.innerHTML = '<i class="fas fa-user-shield"></i> Assign Admin';
  if (r?.success) {
    showToast(r.message || "Admin assigned!", "success");
    closeModal("assignAdminModal");
    clearAssignUser();
    loadAdmins();
  } else {
    showToast(r?._error || "Failed to assign admin", "error");
    btn.disabled = false;
  }
}

// Hide assign dropdown on outside click
document.addEventListener("click", (e) => {
  const results = document.getElementById("assignSearchResults");
  if (
    results &&
    !results.contains(e.target) &&
    e.target.id !== "assignSearchInput"
  ) {
    results.style.display = "none";
  }
});

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("show");
  if (id === "assignAdminModal") {
    clearAssignUser();
    document.getElementById("assignSearchInput").value = "";
    document.getElementById("assignSearchResults").style.display = "none";
  }
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination(cid, s, fn) {
  const pag = document.getElementById(cid);
  if (!pag) return;
  const start = (s.page - 1) * s.limit + 1;
  const end = Math.min(s.page * s.limit, s.total);
  let btns = `<button class="pag-btn" onclick="${fn.name}(${s.page - 1})" ${
    s.page <= 1 ? "disabled" : ""
  }><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= s.pages; i++) {
    if (s.pages > 7 && Math.abs(i - s.page) > 2 && i !== 1 && i !== s.pages) {
      if (i === 2 || i === s.pages - 1)
        btns += `<button class="pag-btn" disabled>…</button>`;
      continue;
    }
    btns += `<button class="pag-btn ${i === s.page ? "active" : ""}" onclick="${
      fn.name
    }(${i})">${i}</button>`;
  }
  btns += `<button class="pag-btn" onclick="${fn.name}(${s.page + 1})" ${
    s.page >= s.pages ? "disabled" : ""
  }><i class="fas fa-chevron-right"></i></button>`;
  pag.innerHTML = `<div class="pag-info">Showing <strong>${start}–${end}</strong> of <strong>${s.total}</strong></div><div class="pag-btns">${btns}</div>`;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function tableSkels(cols, rows = 6) {
  return Array(rows)
    .fill(0)
    .map(
      () =>
        `<tr>${Array(cols)
          .fill(0)
          .map(
            () =>
              `<td><div class="skel-line" style="height:14px;width:${
                60 + Math.random() * 30
              }%"></div></td>`
          )
          .join("")}</tr>`
    )
    .join("");
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const wrap = document.getElementById("toastWrap");
  const id = "t_" + Date.now();
  const icon =
    {
      success: "fa-circle-check",
      error: "fa-triangle-exclamation",
      warn: "fa-triangle-exclamation",
      info: "fa-circle-info",
    }[type] || "fa-circle-info";
  wrap.insertAdjacentHTML(
    "beforeend",
    `<div class="toast ${type}" id="${id}"><i class="fas ${icon}"></i>${escHtml(
      msg
    )}</div>`
  );
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.remove();
  }, 4000);
}
