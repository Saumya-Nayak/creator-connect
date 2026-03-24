// ═══════════════════════════════════════════════════════════════
//  USER MANAGEMENT SCRIPT
// ═══════════════════════════════════════════════════════════════

const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

// ── State ──
let state = {
  page: 1,
  limit: 24,
  search: "",
  role: "",
  status: "",
  view: "grid",
  total: 0,
  pages: 1,
};
let pendingSuspendUserId = null;
let drawerUser = null;

// ── Auth ──
(async function checkAuth() {
  const token =
    localStorage.getItem("adminAuthToken") ||
    sessionStorage.getItem("adminAuthToken");
  const adminData =
    localStorage.getItem("adminData") || sessionStorage.getItem("adminData");
  if (!token || !adminData) {
    location.href = "login.html";
    return;
  }
  try {
    const res = await fetch(`${API}/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearAuth();
      location.href = "login.html";
      return;
    }
  } catch (e) {}
  authGate.classList.add("hide");
  setTimeout(() => authGate.remove(), 450);
  initPage();
})();

function clearAuth() {
  ["adminAuthToken", "adminData"].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

// ── Sidebar sync ──
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
  if (e.data?.type === "sb-logout-request") {
    openLogoutModal();
  }
});
const initCollapsed = localStorage.getItem("sbCol") === "1";
if (initCollapsed) {
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
      },
      "*"
    );
  } catch (e) {}
}

// ── API helper ──
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
    const r = await fetch(API + path, {
      headers: authHeaders(),
      ...opts,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ── Init ──
function initPage() {
  loadStats();
  loadUsers();
  // Debounce search
  let debounce;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.search = e.target.value;
      state.page = 1;
      loadUsers();
    }, 350);
  });
  document.getElementById("roleFilter").addEventListener("change", (e) => {
    state.role = e.target.value;
    state.page = 1;
    loadUsers();
  });
  document.getElementById("statusFilter").addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    loadUsers();
  });
  document.getElementById("limitSelect").addEventListener("change", (e) => {
    state.limit = parseInt(e.target.value);
    state.page = 1;
    loadUsers();
  });
  // Suspend confirm
  document
    .getElementById("suspendConfirmBtn")
    .addEventListener("click", confirmSuspend);
  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer();
      closeSuspendModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLogoutModal();
  });
}
const logoutModal = document.getElementById("logoutModal");
document
  .getElementById("logoutCancelBtn")
  .addEventListener("click", closeLogoutModal);
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
function closeLogoutModal() {
  logoutModal.classList.remove("show");
}
logoutModal.addEventListener("click", (e) => {
  if (e.target === logoutModal) closeLogoutModal();
});
// ── Stats ──
async function loadStats() {
  const d = await apiFetch("/admin/users/stats");
  if (!d) return;
  animCount("sv-total", d.total);
  animCount("sv-admins", d.admins);
  animCount("sv-creators", d.creators);
  animCount("sv-locked", d.locked);
  animCount("sv-active", d.active_week);
  animCount("sv-new", d.new_month);
}

function animCount(id, to) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 900,
    start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1),
      ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * ease);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = to;
  })(start);
}

// ── Load Users ──
async function loadUsers() {
  const grid = document.getElementById("usersGrid");
  grid.innerHTML = renderSkeletons();

  const params = new URLSearchParams({
    search: state.search,
    role: state.role,
    status: state.status,
    page: state.page,
    limit: state.limit,
  });
  const d = await apiFetch(`/admin/users?${params}`);
  if (!d) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-triangle"></i><p>Failed to load users. Check your connection.</p></div>`;
    return;
  }

  state.total = d.total;
  state.pages = d.pages;

  if (!d.users.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-users-slash"></i><p>No users found matching your filters.</p></div>`;
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  if (state.view === "grid") {
    grid.classList.remove("list-view");
    grid.innerHTML = d.users.map((u, i) => renderCard(u, i)).join("");
  } else {
    grid.classList.add("list-view");
    grid.innerHTML =
      renderListHeader() + d.users.map((u, i) => renderListRow(u, i)).join("");
  }

  renderPagination();
}

// ── Render helpers ──
function avatarImg(u, cls, size = 60) {
  if (u.profile_pic) {
    // Already Cloudinary URL or other external URL - use directly
    if (u.profile_pic.startsWith("http")) {
      return `<img src="${
        u.profile_pic
      }" class="${cls}" width="${size}" height="${size}" onerror="this.style.display='none';this.insertAdjacentHTML('afterend',\`<div class='${cls
        .replace("ucard-avatar", "ucard-avatar-fallback")
        .replace("ulist-avatar", "ulist-avatar-fb")
        .replace("d-avatar", "d-avatar-fb")}'>${(u.username ||
        "?")[0].toUpperCase()}</div>\`)">`;
    }
    // Fallback for any non-HTTP path (should not happen after Cloudinary migration)
    return `<div class="${cls
      .replace("ucard-avatar", "ucard-avatar-fallback")
      .replace("ulist-avatar", "ulist-avatar-fb")
      .replace("d-avatar", "d-avatar-fb")}">${(u.username ||
      "?")[0].toUpperCase()}</div>`;
  }
  // No profile pic - show fallback
  const fbCls = cls.includes("ucard")
    ? "ucard-avatar-fallback"
    : cls.includes("ulist")
    ? "ulist-avatar-fb"
    : "d-avatar-fb";
  return `<div class="${fbCls}">${(u.username || "?")[0].toUpperCase()}</div>`;
}

function statusLabel(u) {
  return u.is_locked
    ? `<span class="ucard-tag locked"><i class="fas fa-lock"></i> Suspended</span>`
    : `<span class="ucard-tag active"><i class="fas fa-circle-check"></i> Active</span>`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateShort(iso) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
function timeAgo(iso) {
  if (!iso) return "Never";
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function renderCard(u, idx) {
  const delay = (idx % 12) * 0.04;
  const isAdmin = u.role === 1;
  const suspendBtn = u.is_locked
    ? `<button class="ucard-btn success" onclick="event.stopPropagation();unlockUser(${u.id})"><i class="fas fa-lock-open"></i> Unlock</button>`
    : isAdmin
    ? ""
    : `<button class="ucard-btn danger" onclick="event.stopPropagation();openSuspendModal(${u.id})"><i class="fas fa-ban"></i> Suspend</button>`;

  return `
        <div class="ucard" style="animation-delay:${delay}s" onclick="openDrawer(${
    u.id
  })">
          <div class="ucard-banner">
            <div class="ucard-banner-pattern"></div>
          </div>
          <span class="ucard-role-badge ${isAdmin ? "admin" : "creator"}">${
    u.role_name
  }</span>
          <div class="ucard-avatar-wrap">
            ${avatarImg(u, "ucard-avatar", 64)}
            <div class="ucard-status-dot ${
              u.is_locked ? "locked" : "active"
            }"></div>
          </div>
          <div class="ucard-body">
            <div class="ucard-name">${u.full_name || u.username}</div>
            <div class="ucard-username">@${u.username}</div>
            <div class="ucard-email"><i class="fas fa-envelope" style="color:var(--primary);font-size:.65rem"></i>${
              u.email
            }</div>
            <div class="ucard-meta">
              <div class="ucard-meta-item"><div class="ucard-meta-val">${
                u.post_count
              }</div><div class="ucard-meta-key">Posts</div></div>
              <div class="ucard-meta-item"><div class="ucard-meta-val">${
                u.followers_count
              }</div><div class="ucard-meta-key">Followers</div></div>
              <div class="ucard-meta-item"><div class="ucard-meta-val">${
                u.order_count
              }</div><div class="ucard-meta-key">Orders</div></div>
            </div>
            <div class="ucard-info-row">
              ${statusLabel(u)}
              <span class="ucard-tag joined"><i class="fas fa-calendar"></i> ${fmtDateShort(
                u.created_at
              )}</span>
              ${
                u.last_login
                  ? `<span class="ucard-tag login"><i class="fas fa-clock"></i> ${timeAgo(
                      u.last_login
                    )}</span>`
                  : ""
              }
              ${
                u.is_private
                  ? `<span class="ucard-tag private"><i class="fas fa-eye-slash"></i> Private</span>`
                  : ""
              }
            </div>
            <div class="ucard-actions">
              <button class="ucard-btn" onclick="event.stopPropagation();openDrawer(${
                u.id
              })"><i class="fas fa-eye"></i> View</button>
              ${suspendBtn}
            </div>
          </div>
        </div>`;
}

function renderListHeader() {
  return `
        <div style="display:flex;align-items:center;gap:14px;padding:8px 18px;font-size:.69rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-secondary);margin-bottom:6px">
          <div style="width:44px;flex-shrink:0"></div>
          <div style="flex:1">User</div>
          <div class="ulist-col">Role / Status</div>
          <div class="ulist-col wide">Joined</div>
          <div class="ulist-col wide">Last Login</div>
          <div class="ulist-col">Posts</div>
          <div style="width:80px;flex-shrink:0">Actions</div>
        </div>`;
}

function renderListRow(u, idx) {
  const delay = (idx % 24) * 0.025;
  const isAdmin = u.role === 1;
  return `
        <div class="ulist-row" style="animation-delay:${delay}s" onclick="openDrawer(${
    u.id
  })">
          ${avatarImg(u, "ulist-avatar", 44)}
          <div class="ulist-info">
            <div class="ulist-name">${u.full_name || u.username}</div>
            <div class="ulist-sub">@${u.username} · ${u.email}</div>
          </div>
          <div class="ulist-col">
            <span class="pill ${isAdmin ? "admin" : "creator"}">${
    u.role_name
  }</span>
            <span class="pill ${
              u.is_locked ? "locked" : "active"
            }" style="margin-left:4px">${
    u.is_locked ? "Locked" : "Active"
  }</span>
          </div>
          <div class="ulist-col wide">${fmtDate(u.created_at)}</div>
          <div class="ulist-col wide">${
            u.last_login ? timeAgo(u.last_login) : "—"
          }</div>
          <div class="ulist-col">${u.post_count}</div>
          <div class="ulist-actions">
            <button class="ulist-btn" title="View details" onclick="event.stopPropagation();openDrawer(${
              u.id
            })"><i class="fas fa-eye"></i></button>
            ${
              u.is_locked
                ? `<button class="ulist-btn success" title="Unlock" onclick="event.stopPropagation();unlockUser(${u.id})"><i class="fas fa-lock-open"></i></button>`
                : !isAdmin
                ? `<button class="ulist-btn danger" title="Suspend" onclick="event.stopPropagation();openSuspendModal(${u.id})"><i class="fas fa-ban"></i></button>`
                : ""
            }
          </div>
        </div>`;
}

function renderSkeletons() {
  if (state.view === "list") {
    return Array(6)
      .fill(0)
      .map(
        () => `
            <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;margin-bottom:10px">
              <div class="skeleton" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div>
              <div style="flex:1"><div class="skeleton" style="height:14px;width:60%;margin-bottom:7px"></div><div class="skeleton" style="height:11px;width:40%"></div></div>
              <div class="skeleton" style="height:24px;width:80px;border-radius:20px"></div>
              <div class="skeleton" style="height:12px;width:70px"></div>
              <div class="skeleton" style="height:12px;width:60px"></div>
            </div>`
      )
      .join("");
  }
  return Array(8)
    .fill(0)
    .map(
      () => `
          <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:18px;overflow:hidden">
            <div class="skeleton" style="height:70px"></div>
            <div style="padding:44px 18px 18px">
              <div class="skeleton" style="height:16px;width:70%;margin-bottom:8px"></div>
              <div class="skeleton" style="height:12px;width:50%;margin-bottom:16px"></div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
                ${Array(3)
                  .fill(
                    '<div class="skeleton" style="height:48px;border-radius:10px"></div>'
                  )
                  .join("")}
              </div>
              <div class="skeleton" style="height:34px;border-radius:9px"></div>
            </div>
          </div>`
    )
    .join("");
}

// ── Pagination ──
function renderPagination() {
  const pag = document.getElementById("pagination");
  const start = (state.page - 1) * state.limit + 1;
  const end = Math.min(state.page * state.limit, state.total);

  let btns = `<button class="pag-btn" onclick="gotoPage(${state.page - 1})" ${
    state.page <= 1 ? "disabled" : ""
  }><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= state.pages; i++) {
    if (
      state.pages > 7 &&
      Math.abs(i - state.page) > 2 &&
      i !== 1 &&
      i !== state.pages
    ) {
      if (i === 2 || i === state.pages - 1)
        btns += `<button class="pag-btn" disabled>…</button>`;
      continue;
    }
    btns += `<button class="pag-btn ${
      i === state.page ? "active" : ""
    }" onclick="gotoPage(${i})">${i}</button>`;
  }
  btns += `<button class="pag-btn" onclick="gotoPage(${state.page + 1})" ${
    state.page >= state.pages ? "disabled" : ""
  }><i class="fas fa-chevron-right"></i></button>`;

  pag.innerHTML = `
          <div class="pag-info">Showing <strong>${start}–${end}</strong> of <strong>${state.total}</strong> users</div>
          <div class="pag-btns">${btns}</div>`;
}

function gotoPage(p) {
  if (p < 1 || p > state.pages || p === state.page) return;
  state.page = p;
  loadUsers();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

// ── View toggle ──
function setView(v) {
  state.view = v;
  document
    .getElementById("gridViewBtn")
    .classList.toggle("active", v === "grid");
  document
    .getElementById("listViewBtn")
    .classList.toggle("active", v === "list");
  loadUsers();
}

// ── Drawer ──
async function openDrawer(userId) {
  const bd = document.getElementById("drawerBackdrop");
  const dr = document.getElementById("drawer");
  const body = document.getElementById("drawerBody");
  const footer = document.getElementById("drawerFooter");

  body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px"><div style="width:36px;height:36px;border-radius:50%;border:3px solid var(--card-border);border-top-color:var(--primary);animation:spin .8s linear infinite"></div></div>`;
  footer.innerHTML = "";
  bd.classList.add("open");
  dr.classList.add("open");

  const u = await apiFetch(`/admin/users/${userId}`);
  if (!u) {
    body.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation"></i><p>Failed to load user data.</p></div>`;
    return;
  }
  drawerUser = u;

  const isAdmin = u.role === 1;
  const isLocked = u.is_locked;

  body.innerHTML = `
          <div class="d-avatar-row">
            ${avatarImg(u, "d-avatar", 80)}
            <div>
              <div class="d-name">${u.full_name || u.username}</div>
              <div class="d-username">@${u.username}</div>
              <div class="d-badges">
                <span class="pill ${isAdmin ? "admin" : "creator"}">${
    u.role_name
  }</span>
                <span class="pill ${isLocked ? "locked" : "active"}">${
    isLocked ? "Suspended" : "Active"
  }</span>
                ${
                  u.is_private
                    ? `<span class="pill" style="background:rgba(234,179,8,.12);color:var(--yellow)"><span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;margin-right:3px"></span>Private</span>`
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="d-section">
            <div class="d-section-title"><i class="fas fa-chart-bar"></i> Activity</div>
            <div class="d-stats">
              <div class="d-stat"><div class="d-stat-val">${
                u.post_count || 0
              }</div><div class="d-stat-key">Posts</div></div>
              <div class="d-stat"><div class="d-stat-val">${
                u.followers_count || 0
              }</div><div class="d-stat-key">Followers</div></div>
              <div class="d-stat"><div class="d-stat-val">${
                u.order_count || 0
              }</div><div class="d-stat-key">Orders</div></div>
            </div>
          </div>

          <!-- Account Info -->
          <div class="d-section">
            <div class="d-section-title"><i class="fas fa-id-card"></i> Account Info</div>
            <div class="d-grid">
              <div class="d-field"><div class="d-field-label">Email</div><div class="d-field-value">${
                u.email
              }</div></div>
              <div class="d-field"><div class="d-field-label">Phone</div><div class="d-field-value ${
                u.phone ? "" : "muted"
              }">${u.phone || "Not provided"}</div></div>
              <div class="d-field"><div class="d-field-label">Joined</div><div class="d-field-value">${fmtDate(
                u.created_at
              )}</div></div>
              <div class="d-field"><div class="d-field-label">Last Login</div><div class="d-field-value">${
                u.last_login ? timeAgo(u.last_login) : "Never"
              }</div></div>
              <div class="d-field"><div class="d-field-label">Gender</div><div class="d-field-value ${
                u.gender ? "" : "muted"
              }">${u.gender || "—"}</div></div>
              <div class="d-field"><div class="d-field-label">Login Attempts</div><div class="d-field-value">${
                u.login_attempts || 0
              }</div></div>
              <div class="d-field"><div class="d-field-label">OTP Verified</div><div class="d-field-value">${
                u.otp_verified ? "✅ Yes" : "❌ No"
              }</div></div>
              <div class="d-field"><div class="d-field-label">Verification</div><div class="d-field-value ${
                u.verification_method ? "" : "muted"
              }">${u.verification_method || "—"}</div></div>
            </div>
          </div>

          <!-- Location -->
          <div class="d-section">
            <div class="d-section-title"><i class="fas fa-location-dot"></i> Location</div>
            <div class="d-grid">
              <div class="d-field"><div class="d-field-label">Country</div><div class="d-field-value ${
                u.country ? "" : "muted"
              }">${u.country || "—"}</div></div>
              <div class="d-field"><div class="d-field-label">City</div><div class="d-field-value ${
                u.city ? "" : "muted"
              }">${u.city || "—"}</div></div>
            </div>
          </div>

          ${
            u.about_me
              ? `
          <div class="d-section">
            <div class="d-section-title"><i class="fas fa-quote-left"></i> About</div>
            <div style="font-size:.83rem;color:var(--text-secondary);line-height:1.7;padding:12px;background:var(--main-bg);border-radius:10px;">${u.about_me}</div>
          </div>`
              : ""
          }

          ${
            isLocked
              ? `
          <div class="d-section">
            <div class="d-section-title"><i class="fas fa-lock"></i> Suspension</div>
            <div class="d-field" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2)">
              <div class="d-field-label">Locked Until</div>
              <div class="d-field-value" style="color:var(--red)">${fmtDate(
                u.account_locked_until
              )} — ${new Date(u.account_locked_until).toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}</div>
            </div>
          </div>`
              : ""
          }

          ${
            u.website_url
              ? `
          <div class="d-section">
            <div class="d-section-title"><i class="fas fa-globe"></i> Website</div>
            <div class="d-field"><div class="d-field-value"><a href="${u.website_url}" target="_blank" style="color:var(--primary)">${u.website_url}</a></div></div>
          </div>`
              : ""
          }
        `;

  footer.innerHTML = `
          ${
            isLocked
              ? `<button class="d-action-btn unlock" onclick="unlockUser(${u.id})"><i class="fas fa-lock-open"></i> Unlock Account</button>`
              : !isAdmin
              ? `<button class="d-action-btn suspend" onclick="openSuspendModal(${u.id})"><i class="fas fa-ban"></i> Suspend Account</button>`
              : ""
          }
        `;
}

function closeDrawer() {
  document.getElementById("drawerBackdrop").classList.remove("open");
  document.getElementById("drawer").classList.remove("open");
  drawerUser = null;
}

// ── Suspend ──
function openSuspendModal(userId) {
  pendingSuspendUserId = userId;
  document.getElementById("suspendDuration").value = "24";
  document.getElementById("suspendReason").value = "";
  document.getElementById("suspendModal").classList.add("show");
}

function closeSuspendModal() {
  document.getElementById("suspendModal").classList.remove("show");
  pendingSuspendUserId = null;
}

async function confirmSuspend() {
  if (!pendingSuspendUserId) return;
  const hours = parseInt(document.getElementById("suspendDuration").value);
  const reason =
    document.getElementById("suspendReason").value.trim() || "Admin action";
  const btn = document.getElementById("suspendConfirmBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suspending…';

  const r = await apiFetch(`/admin/users/${pendingSuspendUserId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ hours, reason }),
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-ban"></i> Suspend';
  closeSuspendModal();
  closeDrawer();

  if (r?.success) {
    showToast(r.message, "success");
    loadUsers();
    loadStats();
  } else {
    showToast(r?.error || "Failed to suspend user", "error");
  }
}

// ── Unlock ──
async function unlockUser(userId) {
  // Find ALL unlock buttons for this user and show loading on each
  const allUnlockBtns = document.querySelectorAll(
    `[onclick*="unlockUser(${userId})"]`
  );

  // Save original HTML of each button and show spinner
  const originals = [];
  allUnlockBtns.forEach((btn) => {
    originals.push({ btn, html: btn.innerHTML });
    btn.disabled = true;

    // Detect button style (drawer vs card/list)
    const isDrawerBtn = btn.classList.contains("d-action-btn");
    const isListBtn = btn.classList.contains("ulist-btn");

    if (isDrawerBtn) {
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Unlocking…`;
      btn.style.opacity = "0.7";
      btn.style.cursor = "not-allowed";
    } else if (isListBtn) {
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
      btn.title = "Unlocking…";
    } else {
      // Card button
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Unlocking…`;
      btn.style.opacity = "0.7";
    }
  });

  try {
    const r = await apiFetch(`/admin/users/${userId}/unlock`, {
      method: "POST",
    });

    if (r?.success) {
      // Brief success flash before closing drawer + reloading
      allUnlockBtns.forEach((btn) => {
        const isDrawerBtn = btn.classList.contains("d-action-btn");
        const isListBtn = btn.classList.contains("ulist-btn");

        if (isDrawerBtn) {
          btn.innerHTML = `<i class="fas fa-check"></i> Unlocked!`;
          btn.style.color = "var(--green)";
          btn.style.borderColor = "var(--green)";
          btn.style.background = "rgba(34, 197, 94, 0.1)";
          btn.style.opacity = "1";
        } else if (isListBtn) {
          btn.innerHTML = `<i class="fas fa-check"></i>`;
          btn.title = "Unlocked!";
          btn.style.color = "var(--green)";
        } else {
          btn.innerHTML = `<i class="fas fa-check"></i> Unlocked!`;
          btn.style.color = "var(--green)";
          btn.style.opacity = "1";
        }
      });

      // Short pause so user sees the ✓ confirmation, then refresh
      await new Promise((resolve) => setTimeout(resolve, 700));

      closeDrawer();
      showToast(r.message || "Account unlocked successfully", "success");
      loadUsers();
      loadStats();
    } else {
      // Restore buttons on failure
      allUnlockBtns.forEach(({ btn, html }, i) => {
        originals[i].btn.innerHTML = originals[i].html;
        originals[i].btn.disabled = false;
        originals[i].btn.style.opacity = "";
        originals[i].btn.style.cursor = "";
        originals[i].btn.style.color = "";
      });
      showToast(r?.error || "Failed to unlock user", "error");
    }
  } catch (err) {
    // Restore buttons on network error
    originals.forEach(({ btn, html }) => {
      btn.innerHTML = html;
      btn.disabled = false;
      btn.style.opacity = "";
      btn.style.cursor = "";
    });
    showToast("Network error — please try again", "error");
  }
}

// ── Toast ──
function showToast(msg, type = "success") {
  const wrap = document.getElementById("toastWrap");
  const id = "toast_" + Date.now();
  const icon =
    type === "success" ? "fa-circle-check" : "fa-triangle-exclamation";
  wrap.insertAdjacentHTML(
    "beforeend",
    `<div class="toast ${type}" id="${id}"><i class="fas ${icon}"></i>${msg}</div>`
  );
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.remove();
  }, 4000);
}
