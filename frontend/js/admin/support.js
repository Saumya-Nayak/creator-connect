const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

/* KEY FIX: match adminAuthToken used by rest of admin pages */
const token = () =>
  localStorage.getItem("adminAuthToken") ||
  sessionStorage.getItem("adminAuthToken") ||
  "";

/* ── Auth & Sidebar ─────────────────────────── */
(async function checkAuth() {
  const t = token();
  if (!t) {
    location.href = "login.html";
    return;
  }
  try {
    const r = await fetch(`${API}/admin/verify`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!r.ok) {
      location.href = "login.html";
      return;
    }
  } catch {
    location.href = "login.html";
    return;
  }
  document.getElementById("authGate").classList.add("hide");
  setTimeout(() => {
    const ag = document.getElementById("authGate");
    if (ag) ag.remove();
  }, 450);
  initPage();
})();

function syncSidebarState() {
  const col = localStorage.getItem("sbCol") === "1";
  document.getElementById("sidebarFrame").classList.toggle("collapsed", col);
  document.getElementById("mainContent").classList.toggle("sb-collapsed", col);
  try {
    document.getElementById("sidebarFrame").contentWindow.postMessage(
      {
        type: "parent-init",
        collapsed: col,
        dark: (localStorage.getItem("adminTheme") || "dark") === "dark",
        page: "support",
      },
      "*"
    );
  } catch (e) {}
}

document.documentElement.setAttribute(
  "data-theme",
  localStorage.getItem("adminTheme") || "dark"
);

window.addEventListener("message", (e) => {
  if (e.data?.type === "sb-collapse" || e.data?.type === "sidebar-toggle") {
    const c = e.data.collapsed;
    document.getElementById("sidebarFrame").classList.toggle("collapsed", c);
    document.getElementById("mainContent").classList.toggle("sb-collapsed", c);
    localStorage.setItem("sbCol", c ? "1" : "0");
  }
  if (e.data?.type === "sb-logout-request" || e.data?.type === "logout-request")
    showLogoutModal();
  if (e.data?.type === "sb-theme" || e.data?.type === "theme-change") {
    const dk =
      e.data.dark !== undefined ? e.data.dark : e.data.theme === "dark";
    document.documentElement.setAttribute("data-theme", dk ? "dark" : "light");
    localStorage.setItem("adminTheme", dk ? "dark" : "light");
  }
});

function showLogoutModal() {
  document.getElementById("logoutModal").classList.add("show");
}
document.getElementById("logoutCancelBtn").onclick = () =>
  document.getElementById("logoutModal").classList.remove("show");
document.getElementById("logoutConfirmBtn").onclick = () => {
  ["adminAuthToken", "adminData", "adminToken", "token"].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  location.href = "login.html";
};
document.getElementById("logoutModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("logoutModal"))
    document.getElementById("logoutModal").classList.remove("show");
});

/* ── Helpers ─────────────────────────────────── */
function escHtml(s) {
  if (!s && s !== 0) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function toast(msg, type = "success") {
  const icons = {
    success: "fa-check-circle",
    error: "fa-circle-xmark",
    warn: "fa-triangle-exclamation",
  };
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${
    icons[type] || "fa-circle-info"
  }"></i>${escHtml(msg)}`;
  document.getElementById("toastWrap").appendChild(t);
  setTimeout(() => t.remove(), 3800);
}
function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(API + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
        ...(opts.headers || {}),
      },
    });
    const d = await r.json();
    if (!r.ok)
      return {
        _error: true,
        message: d.error || d.message || "Error",
        status: r.status,
      };
    return d;
  } catch (e) {
    return { _error: true, message: e.message };
  }
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}
function openModal(id) {
  document.getElementById(id).classList.add("show");
}

/* ── State ───────────────────────────────────── */
let state = {
  search: "",
  status: "",
  priority: "",
  category: "",
  page: 1,
  limit: 18,
  total: 0,
  pages: 0,
};
let currentView = localStorage.getItem("supportView") || "grid";
let currentTicket = null;

/* ── Init ────────────────────────────────────── */
function initPage() {
  setView(currentView, false);
  loadStats();
  loadTickets();
  ["detailModal", "replyModal", "statusModal"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => {
      if (e.target.id === id) closeModal(id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      ["detailModal", "replyModal", "statusModal"].forEach(closeModal);
  });
}

function setView(mode, doLoad = true) {
  currentView = mode;
  localStorage.setItem("supportView", mode);
  document
    .getElementById("gridBtn")
    .classList.toggle("active", mode === "grid");
  document
    .getElementById("listBtn")
    .classList.toggle("active", mode === "list");
  document.getElementById("gridView").style.display =
    mode === "grid" ? "" : "none";
  document.getElementById("listView").style.display =
    mode === "list" ? "" : "none";
  if (doLoad) loadTickets();
}

let _searchTimer;
function onSearchInput() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    state.search = document.getElementById("ticketSearch").value;
    state.page = 1;
    loadTickets();
  }, 300);
}
function applyFilters() {
  state.status = document.getElementById("statusFilter").value;
  state.priority = document.getElementById("priorityFilter").value;
  state.category = document.getElementById("categoryFilter").value;
  state.page = 1;
  loadTickets();
}
function resetFilters() {
  document.getElementById("ticketSearch").value = "";
  document.getElementById("statusFilter").value = "";
  document.getElementById("priorityFilter").value = "";
  document.getElementById("categoryFilter").value = "";
  state = {
    ...state,
    search: "",
    status: "",
    priority: "",
    category: "",
    page: 1,
  };
  loadTickets();
}

/* ── Stats ───────────────────────────────────── */
async function loadStats() {
  const d = await apiFetch("/admin/support/stats");
  if (!d || d._error) return;
  animCount("sv-open", d.open || 0);
  animCount("sv-inprogress", d.in_progress || 0);
  animCount("sv-resolved", d.resolved || 0);
  animCount("sv-high", d.high_priority || 0);
}

function animCount(id, to) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 800,
    start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1),
      ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * ease);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = to;
  })(start);
}

/* ── Load Tickets ────────────────────────────── */
async function loadTickets() {
  showSkeleton(true);
  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
    ...(state.search ? { search: state.search } : {}),
    ...(state.status ? { status: state.status } : {}),
    ...(state.priority ? { priority: state.priority } : {}),
    ...(state.category ? { category: state.category } : {}),
  });
  const d = await apiFetch(`/admin/support/tickets?${params}`);
  showSkeleton(false);
  if (!d || d._error) {
    toast("Failed to load tickets", "error");
    return;
  }
  state.total = d.total;
  state.pages = d.pages;
  renderTickets(d.tickets || []);
  renderPagination();
}

function showSkeleton(show) {
  document.getElementById("cardSkelWrap").style.display = show
    ? "grid"
    : "none";
  document.getElementById("ticketCardGrid").style.display = show ? "none" : "";
}

/* ── Render ──────────────────────────────────── */
const STATUS_META = {
  open: { label: "Open", dot: "🟡" },
  in_progress: { label: "In Progress", dot: "🔵" },
  resolved: { label: "Resolved", dot: "🟢" },
  closed: { label: "Closed", dot: "⚫" },
};
const PRIORITY_META = {
  low: { label: "Low", icon: "▽" },
  medium: { label: "Medium", icon: "◇" },
  high: { label: "High", icon: "▲" },
};
const CAT_ICONS = {
  technical: "fa-wrench",
  account: "fa-user",
  billing: "fa-credit-card",
  content: "fa-file-pen",
  other: "fa-comment",
};

function renderTickets(tickets) {
  const grid = document.getElementById("ticketCardGrid");
  const tbody = document.getElementById("ticketTableBody");
  const empty = document.getElementById("tableEmptyState");
  if (!tickets.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-ticket"></i><p>No tickets found matching your filters.</p></div>`;
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = tickets.map((t, i) => renderCard(t, i)).join("");
  tbody.innerHTML = tickets.map((t, i) => renderRow(t, i)).join("");
}

function renderCard(t, idx) {
  const delay = (idx % 12) * 0.04;
  const sm = STATUS_META[t.status] || { label: t.status, dot: "•" };
  const pm = PRIORITY_META[t.priority] || {
    label: t.priority,
    icon: "–",
  };
  const initials = (t.user_name || t.user_username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const catIcon = CAT_ICONS[t.category] || "fa-tag";
  const avatarSrc =
    t.user_avatar && t.user_avatar.startsWith("http") ? t.user_avatar : "";
  const avatar = avatarSrc
    ? `<img src="${escHtml(avatarSrc)}" onerror="this.style.display='none'" />`
    : "";
  return `<div class="tcard p-${escHtml(
    t.priority
  )}" style="animation-delay:${delay}s">
       <div class="tcard-head">
         <div style="display:flex;align-items:center;gap:8px">
           <div class="user-avatar" style="width:28px;height:28px;font-size:.7rem">${avatar}${
    avatar ? "" : initials
  }</div>
           <div>
             <div style="font-weight:700;font-size:.78rem">${escHtml(
               t.user_name || t.user_username || "Unknown"
             )}</div>
             <div style="font-size:.63rem;color:var(--text-secondary)">${escHtml(
               t.user_email || ""
             )}</div>
           </div>
         </div>
         <div class="tcard-id">#${t.ticket_id}</div>
       </div>
       <div class="tcard-subject">${escHtml(t.subject)}</div>
       <div class="tcard-badges">
         <span class="status-badge ${escHtml(t.status)}">${sm.dot} ${
    sm.label
  }</span>
         <span class="priority-badge ${escHtml(t.priority)}">${pm.icon} ${
    pm.label
  }</span>
         <span class="cat-badge"><i class="fas ${catIcon}" style="font-size:.55rem"></i> ${escHtml(
    t.category
  )}</span>
       </div>
       <div class="tcard-preview">${escHtml(t.message)}</div>
       <div class="tcard-footer">
         <div class="tcard-date"><i class="fas fa-clock"></i> ${fmtDate(
           t.created_at
         )}</div>
         <div class="tcard-actions">
           <button class="tcard-btn" onclick="openDetail(${
             t.ticket_id
           })"><i class="fas fa-eye"></i> View</button>
           <button class="tcard-btn" onclick="openStatusModal(${
             t.ticket_id
           },'${escHtml(t.subject)}','${escHtml(
    t.status
  )}')"><i class="fas fa-arrows-rotate"></i></button>
           <button class="tcard-btn reply" onclick="openReply(${
             t.ticket_id
           },'${escHtml(t.subject)}','${escHtml(
    t.user_email || ""
  )}','${escHtml(
    t.user_name || t.user_username || ""
  )}')"><i class="fas fa-reply"></i> Reply</button>
         </div>
       </div>
     </div>`;
}

function renderRow(t, idx) {
  const delay = (idx % 20) * 0.025;
  const sm = STATUS_META[t.status] || { label: t.status, dot: "•" };
  const pm = PRIORITY_META[t.priority] || {
    label: t.priority,
    icon: "–",
  };
  const initials = (t.user_name || t.user_username || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const avatarSrc = t.user_avatar
    ? `${API}/get-profile-pic/${t.user_avatar.split("/").pop()}`
    : "";
  const avatar = avatarSrc
    ? `<img src="${escHtml(avatarSrc)}" onerror="this.style.display='none'" />`
    : "";
  const catIcon = CAT_ICONS[t.category] || "fa-tag";
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both">
       <td><span style="font-weight:800;font-size:.82rem;color:var(--primary)">#${
         t.ticket_id
       }</span></td>
       <td><div class="user-cell">
         <div class="user-avatar">${avatar}${avatar ? "" : initials}</div>
         <div><div class="user-name">${escHtml(
           t.user_name || t.user_username || "Unknown"
         )}</div><div class="user-sub">${escHtml(
    t.user_email || ""
  )}</div></div>
       </div></td>
       <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600">${escHtml(
         t.subject
       )}</td>
       <td><span class="cat-badge"><i class="fas ${catIcon}" style="font-size:.55rem"></i> ${escHtml(
    t.category
  )}</span></td>
       <td><span class="priority-badge ${escHtml(t.priority)}">${pm.icon} ${
    pm.label
  }</span></td>
       <td><span class="status-badge ${escHtml(t.status)}">${sm.dot} ${
    sm.label
  }</span></td>
       <td style="font-size:.75rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
         t.created_at
       )}</td>
       <td><div class="act-btns">
         <button class="act-btn" onclick="openDetail(${
           t.ticket_id
         })" title="View detail"><i class="fas fa-eye"></i></button>
         <button class="act-btn blue" onclick="openStatusModal(${
           t.ticket_id
         },'${escHtml(t.subject)}','${escHtml(
    t.status
  )}')" title="Change status"><i class="fas fa-arrows-rotate"></i></button>
         <button class="act-btn" onclick="openReply(${t.ticket_id},'${escHtml(
    t.subject
  )}','${escHtml(t.user_email || "")}','${escHtml(
    t.user_name || t.user_username || ""
  )}')" title="Reply" style="color:var(--blue)"><i class="fas fa-reply"></i></button>
       </div></td>
     </tr>`;
}

/* ── Pagination ───────────────────────────────── */
function renderPagination() {
  const from = (state.page - 1) * state.limit + 1;
  const to = Math.min(state.page * state.limit, state.total);
  document.getElementById("pagInfo").textContent = state.total
    ? `Showing ${from}–${to} of ${state.total} tickets`
    : "No tickets found";
  const btns = document.getElementById("pagBtns");
  btns.innerHTML = "";
  const addBtn = (label, pg, active = false, disabled = false) => {
    const b = document.createElement("button");
    b.className = "pag-btn" + (active ? " active" : "");
    b.innerHTML = label;
    b.disabled = disabled;
    if (!disabled && !active)
      b.onclick = () => {
        state.page = pg;
        loadTickets();
      };
    btns.appendChild(b);
  };
  addBtn(
    '<i class="fas fa-chevron-left"></i>',
    state.page - 1,
    false,
    state.page === 1
  );
  for (
    let p = Math.max(1, state.page - 2);
    p <= Math.min(state.pages, state.page + 2);
    p++
  )
    addBtn(p, p, p === state.page);
  addBtn(
    '<i class="fas fa-chevron-right"></i>',
    state.page + 1,
    false,
    state.page >= state.pages
  );
}

/* ── Ticket Detail ────────────────────────────── */
async function openDetail(ticketId) {
  openModal("detailModal");
  document.getElementById("dm-title").textContent = "Loading…";
  const d = await apiFetch(`/admin/support/tickets/${ticketId}`);
  if (!d || d._error) {
    toast("Failed to load ticket", "error");
    closeModal("detailModal");
    return;
  }
  currentTicket = d;
  const sm = STATUS_META[d.status] || { label: d.status };
  const pm = PRIORITY_META[d.priority] || { label: d.priority };
  document.getElementById("dm-title").textContent = d.subject;
  document.getElementById("dm-id").textContent = `Ticket #${d.ticket_id}`;
  document.getElementById("dm-subject").textContent = d.subject;
  document.getElementById("dm-cat").textContent = d.category;
  document.getElementById(
    "dm-priority"
  ).innerHTML = `<span class="priority-badge ${escHtml(d.priority)}">${
    pm.label
  }</span>`;
  document.getElementById(
    "dm-status"
  ).innerHTML = `<span class="status-badge ${escHtml(d.status)}">${
    sm.label
  }</span>`;
  document.getElementById("dm-created").textContent = fmtDateTime(d.created_at);
  document.getElementById("dm-updated").textContent = fmtDateTime(d.updated_at);
  document.getElementById("dm-username").textContent =
    d.user_name || d.user_username || "—";
  document.getElementById("dm-email").textContent = d.user_email || "—";
  document.getElementById("dm-message").textContent = d.message;
}

function closeAndReply() {
  if (!currentTicket) return;
  closeModal("detailModal");
  setTimeout(
    () =>
      openReply(
        currentTicket.ticket_id,
        currentTicket.subject,
        currentTicket.user_email,
        currentTicket.user_name || currentTicket.user_username
      ),
    200
  );
}

/* ── Reply ────────────────────────────────────── */
function openReply(ticketId, subject, email, userName) {
  document.getElementById("rm-ticket-id").value = ticketId;
  document.getElementById("rm-user-email").value = email || "";
  document.getElementById(
    "rm-ticket-info"
  ).textContent = `Ticket #${ticketId} · ${subject}`;
  document.getElementById("rm-to-display").textContent = `${
    userName || "User"
  } <${email || "No email"}>`;
  document.getElementById("rm-status").value = "";
  document.getElementById("rm-reply").value = "";
  openModal("replyModal");
  setTimeout(() => document.getElementById("rm-reply").focus(), 350);
}

async function submitReply() {
  const ticketId = document.getElementById("rm-ticket-id").value;
  const reply = document.getElementById("rm-reply").value.trim();
  const status = document.getElementById("rm-status").value;
  if (!reply) {
    toast("Please enter a reply message", "warn");
    return;
  }
  const btn = document.getElementById("rmSendBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
  const d = await apiFetch(`/admin/support/tickets/${ticketId}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply, status: status || null }),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
  if (d._error) {
    toast(d.message || "Failed to send reply", "error");
    return;
  }
  toast("Reply sent and email delivered to user ✉️", "success");
  closeModal("replyModal");
  loadTickets();
  loadStats();
}

/* ── Status Change ────────────────────────────── */
function openStatusModal(ticketId, subject, currentStatus) {
  document.getElementById("sm-ticket-id").value = ticketId;
  document.getElementById(
    "sm-ticket-info"
  ).textContent = `#${ticketId} · ${subject}`;
  document.getElementById("sm-status").value = currentStatus;
  openModal("statusModal");
}

async function submitStatusChange() {
  const ticketId = document.getElementById("sm-ticket-id").value;
  const status = document.getElementById("sm-status").value;
  if (!status) {
    toast("Please select a status", "warn");
    return;
  }
  const btn = document.getElementById("smSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating…';
  const d = await apiFetch(`/admin/support/tickets/${ticketId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Update Status';
  if (d._error) {
    toast(d.message || "Failed to update status", "error");
    return;
  }
  toast("Status updated successfully", "success");
  closeModal("statusModal");
  loadTickets();
  loadStats();
}
