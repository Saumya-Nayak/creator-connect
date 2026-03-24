const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

let state = {
  page: 1,
  limit: 15,
  search: "",
  type: "",
  privacy: "",
  category: "",
  status: "",
  total: 0,
  pages: 1,
  view: "grid",
};
let pendingToggleId = null;
let pieChart = null,
  lineChart = null;
let chartsBuilt = false;

/* ── Auth ── */
(async function checkAuth() {
  const token =
    localStorage.getItem("adminAuthToken") ||
    sessionStorage.getItem("adminAuthToken");
  if (!token) {
    location.href = "login.html";
    return;
  }
  try {
    const res = await fetch(`${API}/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      location.href = "login.html";
      return;
    }
  } catch (e) {}
  authGate.classList.add("hide");
  setTimeout(() => authGate.remove(), 450);
  initPage();
})();

/* ── Sidebar & parent messages ── */
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
    if (chartsBuilt) updateChartTheme();
  }
  // Sidebar requests logout modal to appear here (center of page)
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
        page: "admin-posts", // ← tells sidebar which nav item to mark active
      },
      "*"
    );
  } catch (e) {}
}

/* ── Logout Modal (rendered in THIS window = center of page) ── */
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

/* ── API helper ── */
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

/* ── View toggle ── */
function setView(v) {
  state.view = v;
  document
    .getElementById("gridViewBtn")
    .classList.toggle("active", v === "grid");
  document
    .getElementById("listViewBtn")
    .classList.toggle("active", v === "list");
  document.getElementById("postsGrid").style.display =
    v === "grid" ? "grid" : "none";
  document.getElementById("tableMode").style.display =
    v === "list" ? "block" : "none";
  loadPosts();
}

/* ── Charts: hover to expand ── */
const chartsSection = document.getElementById("chartsSection");
const chartsToggle = document.getElementById("chartsToggle");
chartsToggle.addEventListener("click", () => {
  const willExpand = !chartsSection.classList.contains("expanded");
  chartsSection.classList.toggle("expanded");
  chartsToggle.querySelector("span").textContent = willExpand
    ? "Analytics Charts — click to collapse"
    : "Analytics Charts — click to expand";
  // Build charts on first expand (lazy)
  if (willExpand && !chartsBuilt) {
    apiFetch("/admin/posts/stats").then((d) => {
      if (d) {
        buildPieChart(d);
        buildLineChart(d.weekly || []);
        chartsBuilt = true;
      }
    });
  }
});

/* ── Init ── */
async function initPage() {
  loadStats();
  loadCategories();
  loadPosts();
  let debounce;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.search = e.target.value;
      state.page = 1;
      loadPosts();
    }, 350);
  });
  document.getElementById("typeFilter").addEventListener("change", (e) => {
    state.type = e.target.value;
    state.page = 1;
    loadPosts();
  });
  document.getElementById("privacyFilter").addEventListener("change", (e) => {
    state.privacy = e.target.value;
    state.page = 1;
    loadPosts();
  });
  document.getElementById("categoryFilter").addEventListener("change", (e) => {
    state.category = e.target.value;
    state.page = 1;
    loadPosts();
  });
  document.getElementById("statusFilter").addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    loadPosts();
  });
  document.getElementById("limitSelect").addEventListener("change", (e) => {
    state.limit = parseInt(e.target.value);
    state.page = 1;
    loadPosts();
  });
  document
    .getElementById("confirmActionBtn")
    .addEventListener("click", confirmToggle);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer();
      closeConfirmModal();
      closeLogoutModal();
    }
  });
}

async function loadCategories() {
  const d = await apiFetch("/admin/posts/categories");
  if (!d) return;
  const sel = document.getElementById("categoryFilter");
  d.categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.category_id;
    opt.textContent = `${c.icon || ""} ${c.category_name} (${c.post_type})`;
    sel.appendChild(opt);
  });
}

async function loadStats() {
  const d = await apiFetch("/admin/posts/stats");
  if (!d) return;
  animCount("sv-total", d.total);
  animCount("sv-showcase", d.showcase);
  animCount("sv-service", d.service);
  animCount("sv-product", d.product);
  animCount("sv-inactive", d.inactive);
  animCount("sv-new", d.new_month);
  // Store stats for lazy chart build
  window._lastStats = d;
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

function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function buildPieChart(d) {
  const ctx = document.getElementById("pieChart").getContext("2d");
  if (pieChart) pieChart.destroy();
  const dark = isDark();
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Showcase", "Service", "Product"],
      datasets: [
        {
          data: [d.showcase, d.service, d.product],
          backgroundColor: [
            "rgba(59,130,246,0.85)",
            "rgba(168,85,247,0.85)",
            "rgba(249,115,22,0.85)",
          ],
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: {
              family: "Plus Jakarta Sans",
              weight: "700",
              size: 11,
            },
            padding: 14,
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 6,
          },
        },
        tooltip: {
          backgroundColor: dark ? "#2b1d3c" : "#fff",
          titleColor: dark ? "#f0e8ff" : "#1a1a2e",
          bodyColor: dark ? "#c4aedd" : "#6b5880",
          borderColor: dark ? "#3d2654" : "#f0e4f9",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} posts`,
          },
        },
      },
    },
  });
}

function buildLineChart(weekly) {
  const ctx = document.getElementById("lineChart").getContext("2d");
  if (lineChart) lineChart.destroy();
  const dark = isDark();
  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: weekly.map((w) => w.week),
      datasets: [
        {
          label: "Posts",
          data: weekly.map((w) => w.count),
          borderColor: "#e60aea",
          backgroundColor: dark
            ? "rgba(230,10,234,0.08)"
            : "rgba(230,10,234,0.06)",
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#e60aea",
          pointBorderColor: dark ? "#130d1a" : "#fff",
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: dark ? "#2b1d3c" : "#fff",
          titleColor: dark ? "#f0e8ff" : "#1a1a2e",
          bodyColor: dark ? "#c4aedd" : "#6b5880",
          borderColor: dark ? "#3d2654" : "#f0e4f9",
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: {
            color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)",
          },
          ticks: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { family: "Plus Jakarta Sans", size: 11 },
          },
        },
        y: {
          grid: {
            color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)",
          },
          ticks: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { family: "Plus Jakarta Sans", size: 11 },
            precision: 0,
          },
          beginAtZero: true,
        },
      },
    },
  });
}

function updateChartTheme() {
  setTimeout(() => {
    if (window._lastStats) {
      buildPieChart(window._lastStats);
      buildLineChart(window._lastStats.weekly || []);
    }
  }, 100);
}

/* ── Load Posts ── */
async function loadPosts() {
  const grid = document.getElementById("postsGrid");
  const tbody = document.getElementById("postsTableBody");
  if (state.view === "grid") {
    grid.innerHTML = renderCardSkeletons();
  } else {
    tbody.innerHTML = renderTableSkeletons();
  }

  const params = new URLSearchParams({
    search: state.search,
    post_type: state.type,
    privacy: state.privacy,
    category_id: state.category,
    status: state.status,
    page: state.page,
    limit: state.limit,
  });
  const d = await apiFetch(`/admin/posts?${params}`);

  if (!d) {
    if (state.view === "grid")
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-triangle"></i><p>Failed to load posts.</p></div>`;
    else
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load posts.</p></div></td></tr>`;
    return;
  }
  state.total = d.total;
  state.pages = d.pages;
  if (!d.posts.length) {
    if (state.view === "grid")
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-photo-film"></i><p>No posts found.</p></div>`;
    else
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fas fa-photo-film"></i><p>No posts found.</p></div></td></tr>`;
    document.getElementById("pagination").innerHTML = "";
    return;
  }
  if (state.view === "grid") {
    grid.innerHTML = d.posts.map((p, i) => renderCard(p, i)).join("");
  } else {
    tbody.innerHTML = d.posts.map((p, i) => renderTableRow(p, i)).join("");
  }
  renderPagination();
}

/* ── Media URL helpers ── */
function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path; // Fallback - backend returns full Cloudinary URLs
}

function profileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path; // Fallback - backend returns full Cloudinary URLs
}
function typeIcon(t) {
  return t === "showcase"
    ? "fas fa-images"
    : t === "service"
    ? "fas fa-briefcase"
    : "fas fa-shopping-bag";
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function escHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

/* ── CARD RENDER ── */
function renderCard(p, idx) {
  const delay = (idx % 15) * 0.035;
  const thumb = p.media_url ? mediaUrl(p.media_url) : null;
  const avatar = p.profile_pic ? profileUrl(p.profile_pic) : null;
  const title = escHtml(
    p.product_title ||
      p.title ||
      (p.caption ? p.caption.slice(0, 50) : "Untitled")
  );
  const caption = p.caption
    ? escHtml(p.caption.slice(0, 80) + (p.caption.length > 80 ? "…" : ""))
    : "";

  const isVideo =
    p.media_type === "video" ||
    (p.media_url && /\.(mp4|webm|mov)$/i.test(p.media_url));

  const mediaEl = thumb
    ? isVideo
      ? `
        <div style="position:relative;width:100%;height:100%;">
          <video
            class="admin-autoplay-video"
            muted
            loop
            playsinline
            preload="metadata"
            style="width:100%;height:100%;object-fit:cover;display:block;"
          >
            <source src="${thumb}" type="video/mp4">
          </video>
          <button
            class="admin-video-mute-btn"
            onclick="event.stopPropagation();toggleAdminVideoMute(event,this)"
            title="Toggle sound"
            style="
              position:absolute;
              bottom:8px;
              right:8px;
              background:rgba(0,0,0,0.6);
              color:white;
              border:none;
              border-radius:50%;
              width:30px;
              height:30px;
              font-size:0.8rem;
              cursor:pointer;
              display:flex;
              align-items:center;
              justify-content:center;
              z-index:5;
              transition:background 0.2s ease;
            "
          >
            <i class="fas fa-volume-mute"></i>
          </button>
          <span class="admin-video-badge" style="
            position:absolute;
            top:8px;
            left:8px;
            background:rgba(0,0,0,0.6);
            color:white;
            font-size:0.65rem;
            font-weight:700;
            padding:2px 7px;
            border-radius:20px;
            letter-spacing:.05em;
            pointer-events:none;
          "><i class="fas fa-video" style="margin-right:3px;"></i>VIDEO</span>
        </div>`
      : `<img src="${thumb}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" /><div class="pcard-media-placeholder" style="display:none"><i class="${typeIcon(
          p.post_type
        )}"></i></div>`
    : `<div class="pcard-media-placeholder"><i class="${typeIcon(
        p.post_type
      )}"></i></div>`;

  const avEl = avatar
    ? `<img src="${avatar}" class="pcard-av" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="pcard-av-fb" style="display:none">${(p.username ||
        "?")[0].toUpperCase()}</div>`
    : `<div class="pcard-av-fb">${(p.username || "?")[0].toUpperCase()}</div>`;

  const toggleBtn = p.is_active
    ? `<button class="pcard-btn warn" onclick="event.stopPropagation();openConfirmModal(${p.post_id},true)"><i class="fas fa-eye-slash"></i> Deactivate</button>`
    : `<button class="pcard-btn success" onclick="event.stopPropagation();openConfirmModal(${p.post_id},false)"><i class="fas fa-eye"></i> Activate</button>`;

  return `
<div class="pcard" style="animation-delay:${delay}s" onclick="openDrawer(${
    p.post_id
  })">
  <div class="pcard-media">
    ${mediaEl}
    <span class="pcard-status-dot ${p.is_active ? "active" : "inactive"}">${
    p.is_active ? "Active" : "Inactive"
  }</span>
    <span class="pcard-type-badge ${p.post_type}"><i class="${typeIcon(
    p.post_type
  )}"></i>${cap(p.post_type)}</span>
  </div>
  <div class="pcard-body">
    <div class="pcard-title">${title}</div>
    ${caption ? `<div class="pcard-caption">${caption}</div>` : ""}
    <div class="pcard-creator">
      ${avEl}
      <div>
        <div class="pcard-creator-name">${escHtml(
          p.full_name || p.username
        )}</div>
        <div class="pcard-creator-user">@${escHtml(p.username)}</div>
      </div>
    </div>
    <div class="pcard-meta">
      <div class="pcard-meta-item"><div class="pcard-meta-val">${
        p.likes_count || 0
      }</div><div class="pcard-meta-key">Likes</div></div>
      <div class="pcard-meta-item"><div class="pcard-meta-val">${
        p.comments_count || 0
      }</div><div class="pcard-meta-key">Cmnts</div></div>
      <div class="pcard-meta-item"><div class="pcard-meta-val">${
        p.shares_count || 0
      }</div><div class="pcard-meta-key">Shares</div></div>
      <div class="pcard-meta-item"><div class="pcard-meta-val">${
        p.views_count || 0
      }</div><div class="pcard-meta-key">Views</div></div>
    </div>
    <div class="pcard-footer">
      <button class="pcard-btn" onclick="event.stopPropagation();openDrawer(${
        p.post_id
      })"><i class="fas fa-eye"></i> View</button>
      ${toggleBtn}
    </div>
  </div>
</div>`;
}

function renderCardSkeletons() {
  return Array(9)
    .fill(0)
    .map(
      () => `
  <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:18px;overflow:hidden">
    <div class="skeleton" style="height:160px"></div>
    <div style="padding:14px 16px 12px">
      <div class="skeleton" style="height:14px;width:75%;margin-bottom:8px"></div>
      <div class="skeleton" style="height:11px;width:55%;margin-bottom:12px"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div class="skeleton" style="width:26px;height:26px;border-radius:50%"></div>
        <div class="skeleton" style="height:12px;width:100px"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:12px">
        ${Array(4)
          .fill(
            '<div class="skeleton" style="height:38px;border-radius:8px"></div>'
          )
          .join("")}
      </div>
      <div style="display:flex;gap:8px">
        <div class="skeleton" style="flex:1;height:32px;border-radius:8px"></div>
        <div class="skeleton" style="flex:1;height:32px;border-radius:8px"></div>
      </div>
    </div>
  </div>`
    )
    .join("");
}

/* ── TABLE RENDER (unchanged from original) ── */
function renderTableRow(p, idx) {
  const delay = (idx % 15) * 0.025;
  const thumb = p.media_url ? mediaUrl(p.media_url) : null;
  const avatar = p.profile_pic ? profileUrl(p.profile_pic) : null;
  const displayTitle =
    p.title || (p.caption ? p.caption.slice(0, 50) : "Untitled");
  const caption = p.caption
    ? p.caption.slice(0, 60) + (p.caption.length > 60 ? "…" : "")
    : "";
  const thumbCell = thumb
    ? `<img src="${thumb}" class="thumb-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy"/><div class="thumb-placeholder" style="display:none"><i class="${typeIcon(
        p.post_type
      )}"></i></div>`
    : `<div class="thumb-placeholder"><i class="${typeIcon(
        p.post_type
      )}"></i></div>`;
  const creatorCell = avatar
    ? `<img src="${avatar}" class="creator-av" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="creator-av-fb" style="display:none">${(p.username ||
        "?")[0].toUpperCase()}</div>`
    : `<div class="creator-av-fb">${(p.username ||
        "?")[0].toUpperCase()}</div>`;
  const toggleBtn = p.is_active
    ? `<button class="act-btn warn-btn" title="Deactivate" onclick="event.stopPropagation();openConfirmModal(${p.post_id},true)"><i class="fas fa-ban"></i></button>`
    : `<button class="act-btn success" title="Reactivate" onclick="event.stopPropagation();openConfirmModal(${p.post_id},false)"><i class="fas fa-circle-check"></i></button>`;
  return `
<tr style="animation:fadeUp .35s var(--ease) ${delay}s both" onclick="openDrawer(${
    p.post_id
  })">
  <td><div class="thumb-cell">${thumbCell}<div><span class="thumb-title">${escHtml(
    displayTitle
  )}</span><span class="thumb-caption">${escHtml(
    caption
  )}</span></div></div></td>
  <td><div class="creator-cell">${creatorCell}<div><div class="creator-name">${escHtml(
    p.full_name || p.username
  )}</div><div class="creator-user">@${escHtml(
    p.username
  )}</div></div></div></td>
  <td><span class="type-badge ${p.post_type}"><i class="${typeIcon(
    p.post_type
  )}"></i>${cap(p.post_type)}</span></td>
  <td><span class="priv-badge ${p.privacy}"><i class="fas fa-${
    p.privacy === "public" ? "globe" : "users"
  }"></i>${cap(p.privacy)}</span></td>
  <td style="font-size:.78rem;color:var(--text-secondary)">${
    p.category_icon || ""
  } ${escHtml(p.category_name || "—")}</td>
  <td><div class="stat-cell"><span class="stat-num">${
    p.likes_count
  }</span><span class="stat-label">likes</span></div></td>
  <td><div class="stat-cell"><span class="stat-num">${
    p.comments_count
  }</span><span class="stat-label">comments</span></div></td>
  <td style="font-size:.78rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
    p.created_at
  )}</td>
  <td><span class="status-badge ${p.is_active ? "active" : "inactive"}">${
    p.is_active ? "Active" : "Inactive"
  }</span></td>
  <td><div class="act-btns" onclick="event.stopPropagation()">
    <button class="act-btn" title="View" onclick="openDrawer(${
      p.post_id
    })"><i class="fas fa-eye"></i></button>
    ${toggleBtn}
  </div></td>
</tr>`;
}

function renderTableSkeletons() {
  return Array(8)
    .fill(0)
    .map(
      () => `
  <tr>
    <td><div class="thumb-cell"><div class="skeleton" style="width:46px;height:46px;border-radius:10px;flex-shrink:0"></div><div><div class="skeleton" style="height:13px;width:130px;margin-bottom:6px"></div><div class="skeleton" style="height:10px;width:90px"></div></div></div></td>
    <td><div class="creator-cell"><div class="skeleton" style="width:30px;height:30px;border-radius:50%"></div><div><div class="skeleton" style="height:12px;width:80px;margin-bottom:5px"></div><div class="skeleton" style="height:10px;width:60px"></div></div></div></td>
    <td><div class="skeleton" style="height:24px;width:70px;border-radius:20px"></div></td>
    <td><div class="skeleton" style="height:22px;width:65px;border-radius:20px"></div></td>
    <td><div class="skeleton" style="height:12px;width:80px"></div></td>
    <td><div class="skeleton" style="height:13px;width:30px"></div></td>
    <td><div class="skeleton" style="height:13px;width:30px"></div></td>
    <td><div class="skeleton" style="height:12px;width:75px"></div></td>
    <td><div class="skeleton" style="height:22px;width:60px;border-radius:20px"></div></td>
    <td><div style="display:flex;gap:6px"><div class="skeleton" style="width:30px;height:30px;border-radius:8px"></div><div class="skeleton" style="width:30px;height:30px;border-radius:8px"></div></div></td>
  </tr>`
    )
    .join("");
}

/* ── Pagination ── */
function renderPagination() {
  const pag = document.getElementById("pagination");
  const start = (state.page - 1) * state.limit + 1,
    end = Math.min(state.page * state.limit, state.total);
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
  pag.innerHTML = `<div class="pag-info">Showing <strong>${start}–${end}</strong> of <strong>${state.total}</strong> posts</div><div class="pag-btns">${btns}</div>`;
}

function gotoPage(p) {
  if (p < 1 || p > state.pages || p === state.page) return;
  state.page = p;
  loadPosts();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── Drawer ── */
async function openDrawer(postId) {
  const bd = document.getElementById("drawerBackdrop"),
    dr = document.getElementById("drawer");
  const body = document.getElementById("drawerBody"),
    footer = document.getElementById("drawerFooter");
  body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px"><div style="width:36px;height:36px;border-radius:50%;border:3px solid var(--card-border);border-top-color:var(--primary);animation:spin .8s linear infinite"></div></div>`;
  footer.innerHTML = "";
  bd.classList.add("open");
  dr.classList.add("open");
  const p = await apiFetch(`/admin/posts/${postId}`);
  if (!p) {
    body.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation"></i><p>Failed to load post.</p></div>`;
    return;
  }
  const thumb = p.media_url ? mediaUrl(p.media_url) : null;
  const avatar = p.profile_pic ? profileUrl(p.profile_pic) : null;
  let mediaEl = "";
  if (thumb) {
    if (p.media_type === "video")
      mediaEl = `<video class="d-thumb-video" controls preload="metadata"><source src="${thumb}" type="video/mp4"></video>`;
    else
      mediaEl = `<img src="${thumb}" class="d-thumb" alt="" onerror="this.style.display='none'" />`;
  } else {
    mediaEl = `<div class="d-thumb-placeholder"><i class="${typeIcon(
      p.post_type
    )}"></i><span style="font-size:.8rem;font-weight:700">No Media</span></div>`;
  }
  const avEl = avatar
    ? `<img src="${avatar}" class="d-creator-av" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="d-creator-av-fb" style="display:none">${(p.username ||
        "?")[0].toUpperCase()}</div>`
    : `<div class="d-creator-av-fb">${(p.username ||
        "?")[0].toUpperCase()}</div>`;
  body.innerHTML = `
  ${mediaEl}
  <div class="d-creator">${avEl}<div><div class="d-creator-name">${escHtml(
    p.full_name || p.username
  )}</div><div class="d-creator-user">@${escHtml(p.username)} · ${escHtml(
    p.email || ""
  )}</div></div></div>
  <div class="d-section"><div class="d-section-title"><i class="fas fa-info-circle"></i> Post Info</div>
    <div class="d-grid">
      <div class="d-field"><div class="d-field-label">Type</div><div class="d-field-value"><span class="type-badge ${
        p.post_type
      }"><i class="${typeIcon(p.post_type)}"></i>${cap(
    p.post_type
  )}</span></div></div>
      <div class="d-field"><div class="d-field-label">Privacy</div><div class="d-field-value"><span class="priv-badge ${
        p.privacy
      }"><i class="fas fa-${
    p.privacy === "public" ? "globe" : "users"
  }"></i>${cap(p.privacy)}</span></div></div>
      <div class="d-field"><div class="d-field-label">Status</div><div class="d-field-value"><span class="status-badge ${
        p.is_active ? "active" : "inactive"
      }">${p.is_active ? "Active" : "Inactive"}</span></div></div>
      <div class="d-field"><div class="d-field-label">Category</div><div class="d-field-value ${
        p.category_name ? "" : "muted"
      }">${p.category_icon || ""} ${escHtml(
    p.category_name || "None"
  )}</div></div>
      <div class="d-field"><div class="d-field-label">Posted</div><div class="d-field-value">${fmtDate(
        p.created_at
      )}</div></div>
      <div class="d-field"><div class="d-field-label">Post ID</div><div class="d-field-value">#${
        p.post_id
      }</div></div>
      ${
        p.price
          ? `<div class="d-field"><div class="d-field-label">Price</div><div class="d-field-value">${
              p.currency
            } ${parseFloat(p.price).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}</div></div>`
          : ""
      }
      ${
        p.subcategory_name
          ? `<div class="d-field"><div class="d-field-label">Subcategory</div><div class="d-field-value">${escHtml(
              p.subcategory_name
            )}</div></div>`
          : ""
      }
    </div>
  </div>
  <div class="d-section"><div class="d-section-title"><i class="fas fa-chart-bar"></i> Engagement</div>
    <div class="d-stats-row">
      <div class="d-stat"><div class="d-stat-val">${
        p.likes_count || 0
      }</div><div class="d-stat-key">Likes</div></div>
      <div class="d-stat"><div class="d-stat-val">${
        p.comments_count || 0
      }</div><div class="d-stat-key">Comments</div></div>
      <div class="d-stat"><div class="d-stat-val">${
        p.shares_count || 0
      }</div><div class="d-stat-key">Shares</div></div>
      <div class="d-stat"><div class="d-stat-val">${
        p.views_count || 0
      }</div><div class="d-stat-key">Views</div></div>
    </div>
  </div>
  ${
    p.caption
      ? `<div class="d-section"><div class="d-section-title"><i class="fas fa-quote-left"></i> Caption</div><div class="d-caption">${escHtml(
          p.caption
        )}</div></div>`
      : ""
  }
  ${
    p.tags
      ? `<div class="d-section"><div class="d-section-title"><i class="fas fa-hashtag"></i> Tags</div><div style="display:flex;flex-wrap:wrap;gap:6px">${p.tags
          .split(",")
          .map(
            (t) =>
              `<span style="background:var(--primary-light);color:var(--primary);font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:20px;">#${escHtml(
                t.trim()
              )}</span>`
          )
          .join("")}</div></div>`
      : ""
  }
`;
  footer.innerHTML = p.is_active
    ? `<button class="d-action-btn deactivate" onclick="openConfirmModal(${p.post_id},true)"><i class="fas fa-eye-slash"></i> Deactivate Post</button>`
    : `<button class="d-action-btn activate" onclick="openConfirmModal(${p.post_id},false)"><i class="fas fa-eye"></i> Reactivate Post</button>`;
  // Load comments
  const commentsSection = document.createElement("div");
  commentsSection.innerHTML = `
  <div class="d-section" id="drawerComments">
    <div class="d-section-title"><i class="fas fa-comments"></i> Comments
      <span id="commentCountBadge" style="font-size:.65rem;background:var(--primary-light);color:var(--primary);padding:1px 7px;border-radius:20px;font-weight:700;margin-left:4px;letter-spacing:.04em"></span>
    </div>
    <div id="commentsList" style="display:flex;align-items:center;justify-content:center;padding:18px 0;color:var(--text-secondary);font-size:.8rem;gap:8px">
      <i class="fas fa-spinner fa-spin"></i> Loading comments…
    </div>
  </div>`;
  body.appendChild(commentsSection);

  // Fetch and render comments
  const commentsData = await apiFetch(`/admin/posts/${postId}/comments`);
  const commentsList = document.getElementById("commentsList");
  const countBadge = document.getElementById("commentCountBadge");
  if (commentsData && commentsData.comments.length > 0) {
    countBadge.textContent = commentsData.total;
    // Build threaded: top-level first, then replies
    const topLevel = commentsData.comments.filter((c) => !c.parent_comment_id);
    const replies = commentsData.comments.filter((c) => c.parent_comment_id);
    const ordered = [];
    topLevel.forEach((c) => {
      ordered.push(c);
      replies
        .filter((r) => r.parent_comment_id === c.comment_id)
        .forEach((r) => ordered.push({ ...r, _isReply: true }));
    });

    commentsList.innerHTML = ordered
      .map((c) => {
        const avEl = c.profile_pic
          ? `<img src="${profileUrl(
              c.profile_pic
            )}" class="d-comment-av" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="d-comment-av-fb" style="display:none">${(c.username ||
              "?")[0].toUpperCase()}</div>`
          : `<div class="d-comment-av-fb">${(c.username ||
              "?")[0].toUpperCase()}</div>`;
        const timeAgo = (() => {
          const s = Math.floor((Date.now() - new Date(c.created_at)) / 1000);
          if (s < 60) return "just now";
          if (s < 3600) return `${Math.floor(s / 60)}m ago`;
          if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
          return `${Math.floor(s / 86400)}d ago`;
        })();
        return `
      <div class="d-comment" style="${
        c._isReply
          ? "margin-left:36px;border-left:2px solid var(--primary-border);padding-left:10px;"
          : ""
      }">
        ${avEl}
        <div class="d-comment-body">
          <div class="d-comment-meta">
            <span class="d-comment-name">${escHtml(
              c.full_name || c.username
            )}</span>
            <span class="d-comment-user">@${escHtml(c.username)}</span>
            ${
              c._isReply
                ? '<span class="d-comment-reply-badge"><i class="fas fa-reply fa-xs"></i> Reply</span>'
                : ""
            }
            <span class="d-comment-time">${timeAgo}</span>
          </div>
          <div class="d-comment-text">${escHtml(c.content)}</div>
          ${
            c.likes_count > 0
              ? `<div class="d-comment-likes"><i class="fas fa-heart" style="color:var(--red);font-size:.6rem"></i> ${
                  c.likes_count
                } like${c.likes_count > 1 ? "s" : ""}</div>`
              : ""
          }
        </div>
      </div>`;
      })
      .join("");
  } else if (commentsData) {
    countBadge.textContent = "0";
    commentsList.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:.8rem"><i class="fas fa-comment-slash" style="opacity:.3;font-size:1.2rem;display:block;margin-bottom:8px"></i>No comments yet</div>`;
  } else {
    commentsList.innerHTML = `<div style="text-align:center;padding:12px;color:var(--red);font-size:.78rem">Failed to load comments</div>`;
  }
}

function closeDrawer() {
  document.getElementById("drawerBackdrop").classList.remove("open");
  document.getElementById("drawer").classList.remove("open");
}

/* ── Confirm Toggle ── */
function openConfirmModal(postId, isCurrentlyActive) {
  pendingToggleId = postId;
  const icon = document.getElementById("confirmIcon"),
    title = document.getElementById("confirmTitle");
  const desc = document.getElementById("confirmDesc"),
    btn = document.getElementById("confirmActionBtn");
  if (isCurrentlyActive) {
    icon.className = "modal-icon";
    icon.innerHTML = '<i class="fas fa-eye-slash"></i>';
    title.textContent = "Deactivate Post";
    desc.textContent =
      "This post will be hidden from the platform. You can reactivate it anytime.";
    btn.innerHTML = '<i class="fas fa-eye-slash"></i> Deactivate';
    btn.className = "modal-btn modal-btn-warn";
    btn.style.background = "";
    btn.style.boxShadow = "";
  } else {
    icon.className = "modal-icon";
    icon.innerHTML = '<i class="fas fa-eye"></i>';
    title.textContent = "Reactivate Post";
    desc.textContent = "This post will become visible on the platform again.";
    btn.innerHTML = '<i class="fas fa-eye"></i> Reactivate';
    btn.className = "modal-btn modal-btn-warn";
    btn.style.background = "linear-gradient(135deg,#22c55e,#16a34a)";
    btn.style.boxShadow = "0 4px 16px rgba(34,197,94,0.3)";
  }
  document.getElementById("confirmModal").classList.add("show");
}
function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("show");
  pendingToggleId = null;
  const btn = document.getElementById("confirmActionBtn");
  btn.style.background = "";
  btn.style.boxShadow = "";
}
async function confirmToggle() {
  if (!pendingToggleId) return;
  const btn = document.getElementById("confirmActionBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';
  const r = await apiFetch(`/admin/posts/${pendingToggleId}/toggle-active`, {
    method: "POST",
  });
  btn.disabled = false;
  closeConfirmModal();
  closeDrawer();
  if (r?.success) {
    showToast(r.message, "success");
    loadPosts();
    loadStats();
  } else {
    showToast(r?.error || "Failed to update post", "error");
  }
}

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
// ===== AUTOPLAY VIDEOS ON SCROLL (Admin Posts) =====
(function setupAdminVideoAutoplay() {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      });
    },
    { threshold: 0.5 }
  );

  function observeVideos() {
    document.querySelectorAll(".admin-autoplay-video").forEach((video) => {
      if (!video.dataset.observed) {
        videoObserver.observe(video);
        video.dataset.observed = "true";
      }
    });
  }

  // Watch for new cards rendered by loadPosts()
  const postsGrid = document.getElementById("postsGrid");
  if (postsGrid) {
    new MutationObserver(observeVideos).observe(postsGrid, {
      childList: true,
      subtree: true,
    });
  }

  observeVideos();
  console.log("✅ Admin video autoplay observer initialized");
})();

// ===== MUTE TOGGLE =====
function toggleAdminVideoMute(event, btn) {
  event.stopPropagation();
  const wrapper = btn.closest("div[style*='position:relative']");
  const video = wrapper.querySelector("video");
  const icon = btn.querySelector("i");
  video.muted = !video.muted;
  icon.className = video.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
}

window.toggleAdminVideoMute = toggleAdminVideoMute;
