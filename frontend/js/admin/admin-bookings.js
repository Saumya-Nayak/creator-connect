const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

let currentDetailBookingId = null;
let lineChartInst = null,
  donutChartInst = null;
let bookingViewMode = localStorage.getItem("bookingsView") || "grid";

let bookingState = {
  page: 1,
  limit: 20,
  search: "",
  status: "",
  payment_status: "",
  sort: "booking_date",
  dir: "desc",
  total: 0,
  pages: 1,
};

// ── Auth ──
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
  } catch (e) {}
  authGate.classList.add("hide");
  setTimeout(() => authGate.remove(), 450);
  initPage();
})();

// ── Sidebar ──
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
    rebuildCharts();
  }
  if (e.data?.type === "sb-logout-request") openLogoutModal();
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
        page: "bookings",
      },
      "*"
    );
  } catch (e) {}
}

// ── Logout ──
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

// ── Helpers ──
function escHtml(s) {
  if (!s && s !== 0) return "—";
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
function fmtTime(t) {
  if (!t) return "—";
  // t may be "HH:MM:SS" or "HH:MM"
  const parts = String(t).split(":");
  const h = parseInt(parts[0]),
    m = parseInt(parts[1] || 0);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
}
function fmtAmount(v) {
  if (v === null || v === undefined) return "—";
  return `₹${parseFloat(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function imgUrl(path, type = "auto") {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  )
    return path;
  const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    type === "profile" ||
    clean.includes("uploads/profile/") ||
    clean.includes("profile/")
  )
    return `${API}/get-profile-pic/${clean.split("/").pop()}`;
  if (clean.startsWith("uploads/posts/"))
    return `${API}/uploads/${clean.replace("uploads/posts/", "")}`;
  if (clean.startsWith("uploads/"))
    return `${API}/uploads/${clean.replace("uploads/", "")}`;
  if (type === "product") return `${API}/uploads/${clean}`;
  return `${API}/uploads/${clean}`;
}
function avatarHtml(name, url, size = 32) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const src = imgUrl(url, "profile");
  if (src)
    return `<div class="user-avatar" style="width:${size}px;height:${size}px"><img src="${escHtml(
      src
    )}" onerror="this.style.display='none';this.parentNode.innerHTML='${initials}'" alt="" /></div>`;
  return `<div class="user-avatar" style="width:${size}px;height:${size}px">${initials}</div>`;
}

const STATUS_ICONS = {
  pending: "⏳",
  accepted: "✅",
  in_progress: "⚙️",
  revision_requested: "🔄",
  completed: "🎉",
  cancelled: "❌",
  rejected: "🚫",
};
function statusBadge(status) {
  const icon = STATUS_ICONS[status] || "";
  return `<span class="status-badge ${escHtml(status)}">${icon} ${escHtml(
    status?.replace(/_/g, " ")
  )}</span>`;
}
function payBadge(status) {
  if (!status) return "—";
  const icons = {
    pending: "⏳",
    partial: "💛",
    completed: "✅",
    refunded: "🔄",
    verification_pending: "⚠️",
    cod_pending: "💵",
    failed: "❌",
  };
  const colors = {
    pending: "",
    partial: "pay-partial",
    completed: "pay-completed",
    refunded: "pay-refunded",
    verification_pending: "pay-pending-indicator",
    cod_pending: "pay-badge cod",
    failed: "pay-failed",
  };
  return `<span class="pay-badge ${colors[status] || ""}">${
    icons[status] || ""
  } ${escHtml(status?.replace(/_/g, " "))}</span>`;
}
function locationTypeBadge(lt) {
  const map = {
    online: "🌐 Online",
    at_provider: "🏪 At Provider",
    doorstep: "🚗 Doorstep",
    both: "🔀 Both",
  };
  const colors = {
    online: "rgba(59,130,246,.1):#3b82f6",
    at_provider: "rgba(16,185,129,.1):#10b981",
    doorstep: "rgba(249,115,22,.1):#f97316",
    both: "rgba(139,92,246,.1):#8b5cf6",
  };
  const [bg, col] = (colors[lt] || "rgba(107,114,128,.1):#6b7280").split(":");
  return `<span style="display:inline-flex;align-items:center;gap:5px;background:${bg};color:${col};font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px">${
    map[lt] || escHtml(lt)
  }</span>`;
}
function contactMethodBadge(m) {
  const map = { email: "📧 Email", phone: "📞 Phone", whatsapp: "💬 WhatsApp" };
  return `<span style="font-size:.75rem;font-weight:700">${
    map[m] || escHtml(m)
  }</span>`;
}

// ── Init ──
function initPage() {
  setBookingView(bookingViewMode, false);
  loadStats();
  setupBookingFilters();
  loadBookings();
  ["detailModal", "statusModal", "messagesModal"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => {
      if (e.target === document.getElementById(id)) closeModal(id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      ["detailModal", "statusModal", "messagesModal"].forEach((id) =>
        closeModal(id)
      );
  });
  document.getElementById("sm-status").addEventListener("change", (e) => {
    document.getElementById("sm-cancel-wrap").style.display = [
      "cancelled",
      "rejected",
    ].includes(e.target.value)
      ? "flex"
      : "none";
  });
}

// ── View Mode ──
function setBookingView(mode, doLoad = true) {
  bookingViewMode = mode;
  localStorage.setItem("bookingsView", mode);
  document
    .getElementById("listViewBtn")
    .classList.toggle("active", mode === "list");
  document
    .getElementById("gridViewBtn")
    .classList.toggle("active", mode === "grid");
  document.getElementById("bookingsListView").style.display =
    mode === "list" ? "" : "none";
  document.getElementById("bookingsGridView").style.display =
    mode === "grid" ? "" : "none";
  if (doLoad) loadBookings();
}

// ── Stats & Charts ──
async function loadStats() {
  const d = await apiFetch("/admin/bookings/stats");
  if (!d || d._error) return;
  const byS = d.by_status || {};
  const total = Object.values(byS).reduce((a, b) => a + b, 0);
  const completed = byS.completed || 0;
  const active =
    (byS.pending || 0) +
    (byS.accepted || 0) +
    (byS.in_progress || 0) +
    (byS.revision_requested || 0);
  animCount("sv-total", total);
  animCount("sv-completed", completed);
  animCount("sv-active", active);
  document.getElementById("sv-revenue").textContent =
    "₹" +
    parseFloat(d.total_revenue || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  buildDonutChart(d.by_status || {});
  buildLineChart(d.weekly || []);
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

const STATUS_COLORS = {
  pending: "#eab308",
  accepted: "#3b82f6",
  in_progress: "#a855f7",
  revision_requested: "#f97316",
  completed: "#22c55e",
  cancelled: "#ef4444",
  rejected: "#6b7280",
};

function buildDonutChart(byStatus) {
  const ctx = document.getElementById("donutChart").getContext("2d");
  if (donutChartInst) donutChartInst.destroy();
  const labels = Object.keys(byStatus),
    data = Object.values(byStatus);
  const colors = labels.map((l) => STATUS_COLORS[l] || "#888");
  const dark = isDark(),
    total = data.reduce((a, b) => a + b, 0) || 1;
  donutChartInst = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: dark ? "#2b1d3c" : "#fff",
          titleColor: dark ? "#f0e8ff" : "#1a1a2e",
          bodyColor: dark ? "#c4aedd" : "#6b5880",
          borderColor: dark ? "#3d2654" : "#f0e4f9",
          borderWidth: 1,
          callbacks: {
            label: (c) =>
              `  ${c.label}: ${c.raw} (${Math.round((c.raw / total) * 100)}%)`,
          },
        },
      },
      animation: { animateRotate: true, duration: 800 },
    },
  });
  document.getElementById("donutLegend").innerHTML = labels
    .map(
      (l, i) =>
        `<div class="leg-item"><div class="leg-dot" style="background:${
          colors[i]
        }"></div><span>${STATUS_ICONS[l] || ""} ${l.replace(
          /_/g,
          " "
        )}</span><span style="color:var(--text-secondary);margin-left:4px">${
          data[i]
        }</span></div>`
    )
    .join("");
}
function buildLineChart(weekly) {
  const ctx = document.getElementById("lineChart").getContext("2d");
  if (lineChartInst) lineChartInst.destroy();
  const labels = weekly.map((w) =>
    w.week_start
      ? new Date(w.week_start).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      : ""
  );
  const data = weekly.map((w) => parseInt(w.cnt || 0));
  const dark = isDark();
  lineChartInst = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Bookings",
          data,
          borderColor: "rgba(230,10,234,1)",
          backgroundColor: "rgba(230,10,234,0.12)",
          borderWidth: 2.5,
          pointBackgroundColor: "rgba(230,10,234,1)",
          pointRadius: 4,
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
        },
      },
      scales: {
        x: {
          grid: { color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)" },
          ticks: { color: dark ? "#c4aedd" : "#6b5880", font: { size: 10 } },
        },
        y: {
          grid: { color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)" },
          ticks: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { size: 10 },
            stepSize: 1,
          },
        },
      },
    },
  });
}
function rebuildCharts() {
  apiFetch("/admin/bookings/stats").then((d) => {
    if (!d || d._error) return;
    buildDonutChart(d.by_status || {});
    buildLineChart(d.weekly || []);
  });
}

// ── Booking Filters ──
function setupBookingFilters() {
  let deb;
  document.getElementById("bookingSearch").addEventListener("input", (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      bookingState.search = e.target.value;
      bookingState.page = 1;
      updateBookingResetBtn();
      loadBookings();
    }, 300);
  });
  document
    .getElementById("bookingStatusFilter")
    .addEventListener("change", (e) => {
      bookingState.status = e.target.value;
      bookingState.page = 1;
      updateBookingResetBtn();
      loadBookings();
    });
  document
    .getElementById("bookingPayFilter")
    .addEventListener("change", (e) => {
      bookingState.payment_status = e.target.value;
      bookingState.page = 1;
      updateBookingResetBtn();
      loadBookings();
    });
}
function updateBookingResetBtn() {
  const has =
    bookingState.search || bookingState.status || bookingState.payment_status;
  document
    .getElementById("bookingResetBtn")
    .classList.toggle("has-filters", !!has);
}
function resetBookingFilters() {
  document.getElementById("bookingSearch").value = "";
  document.getElementById("bookingStatusFilter").value = "";
  document.getElementById("bookingPayFilter").value = "";
  bookingState.search = "";
  bookingState.status = "";
  bookingState.payment_status = "";
  bookingState.page = 1;
  updateBookingResetBtn();
  loadBookings();
}
function sortBookings(field) {
  bookingState.dir =
    bookingState.sort === field && bookingState.dir === "asc"
      ? "desc"
      : bookingState.sort !== field
      ? "desc"
      : "asc";
  bookingState.sort = field;
  loadBookings();
}

// ── Load Bookings ──
async function loadBookings() {
  const tbody = document.getElementById("bookingsTableBody");
  const grid = document.getElementById("bookingsGridView");
  if (bookingViewMode === "list") tbody.innerHTML = renderTableSkels(8, 9);
  else grid.innerHTML = renderCardSkels(8);
  const p = new URLSearchParams({
    search: bookingState.search,
    status: bookingState.status,
    payment_status: bookingState.payment_status,
    page: bookingState.page,
    limit: bookingState.limit,
    sort: bookingState.sort,
    dir: bookingState.dir,
  });
  const d = await apiFetch(`/admin/bookings?${p}`);
  if (!d || d._error) {
    if (bookingViewMode === "list")
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load bookings</p></div></td></tr>`;
    else
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-triangle"></i><p>Failed to load bookings</p></div>`;
    return;
  }
  bookingState.total = d.total;
  bookingState.pages = d.pages;
  if (!d.bookings.length) {
    if (bookingViewMode === "list")
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-calendar-check"></i><p>No bookings found</p></div></td></tr>`;
    else
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-calendar-check"></i><p>No bookings found</p></div>`;
    document.getElementById("bookingsPagination").innerHTML = "";
    return;
  }
  if (bookingViewMode === "list")
    tbody.innerHTML = d.bookings.map((b, i) => renderBookingRow(b, i)).join("");
  else
    grid.innerHTML = d.bookings.map((b, i) => renderBookingCard(b, i)).join("");
  renderPagination("bookingsPagination", bookingState, gotoBookingPage);
}

// ── Booking Card ──
function renderBookingCard(b, idx) {
  const delay = (idx % 20) * 0.03;
  const cInit = (b.customer_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const pInit = (b.provider_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const cSrc = imgUrl(b.customer_avatar, "profile");
  const pSrc = imgUrl(b.provider_avatar, "profile");
  const clientAv = cSrc
    ? `<div class="booking-user-av"><img src="${escHtml(
        cSrc
      )}" alt="" onerror="this.parentNode.textContent='${cInit}'" /></div>`
    : `<div class="booking-user-av">${cInit}</div>`;
  const providerAv = pSrc
    ? `<div class="booking-user-av"><img src="${escHtml(
        pSrc
      )}" alt="" onerror="this.parentNode.textContent='${pInit}'" /></div>`
    : `<div class="booking-user-av">${pInit}</div>`;
  const svcSrc = imgUrl(b.service_image, "product");
  const svcImg = svcSrc
    ? `<img class="booking-card-img" src="${escHtml(
        svcSrc
      )}" alt="" onerror="this.outerHTML='<div class=\\'booking-card-img-placeholder\\'>🎨</div>'" />`
    : `<div class="booking-card-img-placeholder">🎨</div>`;
  const travelFee = parseFloat(b.travel_fee || 0);
  const distKm = b.distance_km;
  const locType = b.location_type || "online";
  const hasVariant = !!b.selected_variant_name;
  return `
  <div class="booking-card" style="animation-delay:${delay}s">
    <div class="booking-card-top">
      ${svcImg}
      <div style="flex:1;min-width:0">
        <div class="booking-card-id">#${b.booking_id}</div>
        <div class="booking-card-service" title="${escHtml(
          b.service_title
        )}">${escHtml(b.service_title)}</div>
        <div class="booking-card-days">${b.duration_days || 1} day(s) · ${
    locType === "online"
      ? "🌐 Online"
      : locType === "doorstep"
      ? "🚗 Doorstep"
      : locType === "at_provider"
      ? "🏪 At Provider"
      : "🔀 Both"
  }</div>
      </div>
      <div class="booking-card-status">${statusBadge(b.status)}</div>
    </div>
    <div class="booking-card-body">
      <div class="booking-card-users">
        <div class="booking-user-block"><div class="booking-user-label">Client</div><div class="booking-user-row">${clientAv}<div class="booking-user-name" title="${escHtml(
    b.customer_name || b.customer_username
  )}">${escHtml(b.customer_name || b.customer_username)}</div></div></div>
        <div class="booking-user-block"><div class="booking-user-label">Provider</div><div class="booking-user-row">${providerAv}<div class="booking-user-name" title="${escHtml(
    b.provider_name || b.provider_username
  )}">${escHtml(b.provider_name || b.provider_username)}</div></div></div>
      </div>
      <div class="booking-card-meta">
        <div class="booking-card-amount">${fmtAmount(b.total_amount)}</div>
        ${payBadge(b.payment_status)}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">
        ${
          hasVariant
            ? `<span style="font-size:.6rem;background:rgba(230,10,234,.1);color:#e60aea;padding:2px 7px;border-radius:12px;font-weight:700">📦 ${escHtml(
                b.selected_variant_name
              )}</span>`
            : ""
        }
        ${
          travelFee > 0
            ? `<span style="font-size:.6rem;background:rgba(249,115,22,.1);color:#f97316;padding:2px 7px;border-radius:12px;font-weight:700">🚗 Travel ₹${travelFee.toFixed(
                0
              )}</span>`
            : ""
        }
        ${
          distKm
            ? `<span style="font-size:.6rem;background:rgba(16,185,129,.1);color:#10b981;padding:2px 7px;border-radius:12px;font-weight:700"><i class="fas fa-route" style="font-size:.5rem"></i> ${distKm}km</span>`
            : ""
        }
      </div>
    </div>
    <div class="booking-card-footer">
      <div class="booking-card-date"><i class="fas fa-clock"></i> ${fmtDate(
        b.booking_date
      )}</div>
      <div class="booking-card-actions">
        <button class="act-btn" title="View Details" onclick="openDetailModal(${
          b.booking_id
        })"><i class="fas fa-eye"></i></button>
        <button class="act-btn green" title="Update Status" onclick="openStatusModal(${
          b.booking_id
        },'${b.status}')"><i class="fas fa-arrow-right-arrow-left"></i></button>
      </div>
    </div>
  </div>`;
}

function renderCardSkels(n) {
  return Array(n)
    .fill(0)
    .map(
      () =>
        `<div class="booking-card"><div class="booking-card-top"><div class="skeleton" style="width:48px;height:48px;border-radius:10px;flex-shrink:0"></div><div style="flex:1"><div class="skeleton" style="height:10px;width:40%;margin-bottom:7px"></div><div class="skeleton" style="height:14px;width:75%;margin-bottom:5px"></div><div class="skeleton" style="height:10px;width:30%"></div></div></div><div class="booking-card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="skeleton" style="height:52px;border-radius:10px"></div><div class="skeleton" style="height:52px;border-radius:10px"></div></div><div class="skeleton" style="height:28px;border-radius:8px"></div></div><div class="booking-card-footer"><div class="skeleton" style="height:11px;width:40%"></div><div class="skeleton" style="height:28px;width:90px;border-radius:8px"></div></div></div>`
    )
    .join("");
}

function renderBookingRow(b, idx) {
  const delay = (idx % 20) * 0.025;
  const serviceSrc = imgUrl(b.service_image, "product");
  const serviceImg = serviceSrc
    ? `<img class="service-thumb" src="${escHtml(
        serviceSrc
      )}" onerror="this.outerHTML='<div class=\\'service-thumb-ph\\'>🎨</div>'" alt="" />`
    : `<div class="service-thumb-ph">🎨</div>`;
  const locType = b.location_type || "online";
  const locIcon =
    locType === "online"
      ? "🌐"
      : locType === "doorstep"
      ? "🚗"
      : locType === "at_provider"
      ? "🏪"
      : "🔀";
  return `
  <tr style="animation:fadeUp .35s var(--ease) ${delay}s both">
    <td><span style="font-weight:800;font-size:.82rem;color:var(--primary)">#${
      b.booking_id
    }</span></td>
    <td><div class="user-cell">${avatarHtml(
      b.customer_name,
      b.customer_avatar
    )}<div><div class="user-name">${escHtml(
    b.customer_name || b.customer_username
  )}</div><div class="user-sub">@${escHtml(
    b.customer_username
  )}</div></div></div></td>
    <td><div class="user-cell">${avatarHtml(
      b.provider_name,
      b.provider_avatar
    )}<div><div class="user-name">${escHtml(
    b.provider_name || b.provider_username
  )}</div><div class="user-sub">@${escHtml(
    b.provider_username
  )}</div></div></div></td>
    <td><div class="service-pill">${serviceImg}<div><div style="font-weight:700;font-size:.82rem;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(
    b.service_title
  )}">${escHtml(
    b.service_title
  )}</div><div style="font-size:.67rem;color:var(--text-secondary)">${
    b.duration_days || 1
  } day(s) · ${locIcon} ${locType.replace(/_/g, " ")}</div></div></div></td>
    <td><div class="amount-cell">${fmtAmount(b.total_amount)}</div>${
    b.travel_fee > 0
      ? `<div style="font-size:.62rem;color:#f97316;margin-top:1px">🚗 +₹${parseFloat(
          b.travel_fee
        ).toFixed(0)}</div>`
      : ""
  }</td>
    <td>${statusBadge(b.status)}</td>
    <td>${payBadge(b.payment_status)}</td>
    <td style="font-size:.78rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
      b.booking_date
    )}</td>
    <td><div class="act-btns">
      <button class="act-btn" title="View Details" onclick="openDetailModal(${
        b.booking_id
      })"><i class="fas fa-eye"></i></button>
      <button class="act-btn blue" title="View Messages" onclick="openMessagesModal(${
        b.booking_id
      })"><i class="fas fa-comments"></i></button>
      <button class="act-btn green" title="Update Status" onclick="openStatusModal(${
        b.booking_id
      },'${b.status}')"><i class="fas fa-arrow-right-arrow-left"></i></button>
    </div></td>
  </tr>`;
}

// ── Pagination ──
function renderTableSkels(rows, cols) {
  return Array(rows)
    .fill(0)
    .map(
      () =>
        `<tr>${Array(cols)
          .fill(0)
          .map(
            () =>
              `<td><div class="skeleton" style="height:14px;width:80%"></div></td>`
          )
          .join("")}</tr>`
    )
    .join("");
}
function renderPagination(cid, s, fn) {
  const pag = document.getElementById(cid);
  const start = (s.page - 1) * s.limit + 1,
    end = Math.min(s.page * s.limit, s.total);
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
function gotoBookingPage(p) {
  if (p < 1 || p > bookingState.pages || p === bookingState.page) return;
  bookingState.page = p;
  loadBookings();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Detail Modal — FULL DATA ──
async function openDetailModal(bookingId) {
  currentDetailBookingId = bookingId;
  document.getElementById(
    "detailModalTitle"
  ).textContent = `Booking #${bookingId}`;
  document.getElementById(
    "detailModalBody"
  ).innerHTML = `<div style="text-align:center;padding:40px"><div class="auth-spin-ring" style="margin:0 auto"></div></div>`;
  openModal("detailModal");
  const b = await apiFetch(`/admin/bookings/${bookingId}`);
  if (!b || b._error) {
    document.getElementById(
      "detailModalBody"
    ).innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${
      b?._error || "Failed to load"
    }</p></div>`;
    return;
  }

  const serviceSrc = imgUrl(b.service_image, "product");
  const locType = b.location_type || "online";
  const travelFee = parseFloat(b.travel_fee || 0);
  const distKm = b.distance_km;
  const additionalCharges = parseFloat(b.additional_charges || 0);
  const hasVariant = !!b.selected_variant_name;
  const isDoorstep = locType === "doorstep" || locType === "both";

  // ── Charges summary pill ──
  const chargesPill =
    travelFee > 0 || distKm || hasVariant || additionalCharges > 0
      ? `
  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;padding:12px 16px;margin-bottom:14px;">
    <span style="font-size:.72rem;font-weight:700;color:var(--text-secondary);margin-right:4px;"><i class="fas fa-file-invoice" style="color:var(--primary)"></i> Service Charges:</span>
    ${
      hasVariant
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(230,10,234,.1);color:#e60aea;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-tags" style="font-size:.6rem"></i> Package: ${escHtml(
            b.selected_variant_name
          )}</span>`
        : ""
    }
    ${locationTypeBadge(locType)}
    ${
      travelFee > 0
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(249,115,22,.1);color:#f97316;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-car" style="font-size:.6rem"></i> Travel Fee ${fmtAmount(
            travelFee
          )}${distKm ? ` (${distKm} km)` : ""}</span>`
        : ""
    }
    ${
      distKm && !travelFee
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(16,185,129,.1);color:#10b981;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-route" style="font-size:.6rem"></i> ${distKm} km</span>`
        : ""
    }
    ${
      additionalCharges > 0
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-plus-circle" style="font-size:.6rem"></i> Extra ${fmtAmount(
            additionalCharges
          )}</span>`
        : ""
    }
  </div>`
      : "";

  document.getElementById("detailModalBody").innerHTML = `
    ${chargesPill}

    <!-- Service Header -->
    ${
      serviceSrc
        ? `
    <div style="display:flex;gap:12px;background:var(--main-bg);border-radius:12px;padding:12px;margin-bottom:18px">
      <img src="${escHtml(
        serviceSrc
      )}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'" />
      <div>
        <div style="font-weight:800;font-size:.92rem;margin-bottom:3px">${escHtml(
          b.service_title
        )}</div>
        <div style="font-size:.73rem;color:var(--text-secondary)">Duration: ${
          b.duration_days || 1
        } day(s) · Preferred: ${fmtDate(b.preferred_start_date)}${
            b.preferred_time ? " at " + fmtTime(b.preferred_time) : ""
          }${b.booked_slot ? " · Slot: " + b.booked_slot + "" : " "}</div>
        <div style="margin-top:6px">${statusBadge(b.status)} ${payBadge(
            b.payment_status
          )} ${locationTypeBadge(locType)}</div>
      </div>
    </div>`
        : ""
    }

    <!-- Booking Summary -->
    <div class="detail-section">
      <div class="detail-section-title">Booking Summary</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Booking ID</div><div class="detail-item-val" style="color:var(--primary)">#${
          b.booking_id
        }</div></div>
        <div class="detail-item"><div class="detail-item-label">Booking Date</div><div class="detail-item-val">${fmtDateTime(
          b.booking_date
        )}</div></div>
        <div class="detail-item"><div class="detail-item-label">Preferred Date</div><div class="detail-item-val">${fmtDate(
          b.preferred_start_date
        )}</div></div>
        <div class="detail-item"><div class="detail-item-label">Preferred Time</div><div class="detail-item-val">${
          b.preferred_time ? fmtTime(b.preferred_time) : "—"
        }</div></div>
        ${
          b.booked_slot
            ? `<div class="detail-item"><div class="detail-item-label">Booked Slot</div><div class="detail-item-val" style="font-weight:700;color:var(--primary)">🕐 ${escHtml(
                b.booked_slot
              )}</div></div>`
            : ""
        }
        <div class="detail-item"><div class="detail-item-label">Duration</div><div class="detail-item-val">${
          b.duration_days || 1
        } day(s)</div></div>
        ${
          b.delivery_timeline
            ? `<div class="detail-item"><div class="detail-item-label">Delivery Timeline</div><div class="detail-item-val">${escHtml(
                b.delivery_timeline
              )}</div></div>`
            : ""
        }
        <div class="detail-item"><div class="detail-item-label">Location Type</div><div class="detail-item-val">${locationTypeBadge(
          locType
        )}</div></div>
        ${
          hasVariant
            ? `<div class="detail-item full"><div class="detail-item-label">Selected Package</div><div class="detail-item-val" style="color:#e60aea;font-weight:700">📦 ${escHtml(
                b.selected_variant_name
              )}${
                b.variant_price ? ` · ${fmtAmount(b.variant_price)}` : ""
              }</div></div>`
            : ""
        }
      </div>
    </div>

    <!-- Pricing -->
    <div class="detail-section">
      <div class="detail-section-title">Pricing Breakdown</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Quoted Price</div><div class="detail-item-val">${fmtAmount(
          b.quoted_price
        )}</div></div>
        ${
          hasVariant && b.variant_price
            ? `<div class="detail-item"><div class="detail-item-label">Package Price</div><div class="detail-item-val" style="color:#e60aea">${fmtAmount(
                b.variant_price
              )}</div></div>`
            : ""
        }
        ${
          b.final_price
            ? `<div class="detail-item"><div class="detail-item-label">Final Price</div><div class="detail-item-val" style="color:var(--primary);font-weight:700">${fmtAmount(
                b.final_price
              )}</div></div>`
            : ""
        }
        ${
          travelFee > 0
            ? `<div class="detail-item"><div class="detail-item-label">Travel Fee${
                distKm
                  ? ` <span style="font-size:.65rem;color:var(--text-secondary)">(${distKm} km)</span>`
                  : ""
              }</div><div class="detail-item-val" style="color:#f97316">${fmtAmount(
                travelFee
              )}</div></div>`
            : ""
        }
        ${
          distKm && !travelFee
            ? `<div class="detail-item"><div class="detail-item-label">Distance</div><div class="detail-item-val">${distKm} km</div></div>`
            : ""
        }
        ${
          additionalCharges > 0
            ? `<div class="detail-item"><div class="detail-item-label">Additional Charges</div><div class="detail-item-val" style="color:#3b82f6">${fmtAmount(
                additionalCharges
              )}</div></div>`
            : ""
        }
        <div class="detail-item full">
          <div class="detail-item-label">Total Amount</div>
          <div class="detail-item-val" style="font-size:1.1rem;color:var(--green);font-weight:700">${fmtAmount(
            b.total_amount
          )}</div>
        </div>
        <div class="detail-item"><div class="detail-item-label">Advance Paid</div><div class="detail-item-val">${fmtAmount(
          b.advance_paid
        )}</div></div>
        <div class="detail-item"><div class="detail-item-label">Currency</div><div class="detail-item-val">${
          escHtml(b.currency) || "INR"
        }</div></div>
      </div>
    </div>

    <!-- Location Details (doorstep/both) -->
    ${
      isDoorstep && (b.buyer_address || b.buyer_pincode || b.buyer_lat)
        ? `
    <div class="detail-section">
      <div class="detail-section-title">Doorstep / Service Location</div>
      <div class="detail-grid">
        ${
          b.buyer_address
            ? `<div class="detail-item full"><div class="detail-item-label">Buyer Address</div><div class="detail-item-val">${escHtml(
                b.buyer_address
              )}</div></div>`
            : ""
        }
        ${
          b.buyer_pincode
            ? `<div class="detail-item"><div class="detail-item-label">Buyer Pincode</div><div class="detail-item-val" style="font-family:monospace">${escHtml(
                b.buyer_pincode
              )}</div></div>`
            : ""
        }
        ${
          distKm
            ? `<div class="detail-item"><div class="detail-item-label">Distance to Buyer</div><div class="detail-item-val">${distKm} km</div></div>`
            : ""
        }
        ${
          travelFee > 0
            ? `<div class="detail-item"><div class="detail-item-label">Travel Fee Charged</div><div class="detail-item-val" style="color:#f97316;font-weight:700">${fmtAmount(
                travelFee
              )}</div></div>`
            : ""
        }
        ${
          b.buyer_lat && b.buyer_lng
            ? `<div class="detail-item full"><div class="detail-item-label">Buyer GPS</div><div class="detail-item-val"><a href="https://www.google.com/maps?q=${b.buyer_lat},${b.buyer_lng}" target="_blank" style="color:var(--primary);font-weight:700;text-decoration:none"><i class="fas fa-map-marker-alt"></i> Open in Maps (${b.buyer_lat}, ${b.buyer_lng})</a></div></div>`
            : ""
        }
      </div>
    </div>`
        : ""
    }

    <!-- Client & Provider -->
    <div class="detail-section">
      <div class="detail-section-title">Client &amp; Provider</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Client</div><div class="detail-item-val">${escHtml(
          b.customer_name
        )}</div><div style="font-size:.72rem;color:var(--text-secondary)">@${escHtml(
    b.customer_username
  )} · ${escHtml(b.customer_email)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Provider</div><div class="detail-item-val">${escHtml(
          b.provider_name
        )}</div><div style="font-size:.72rem;color:var(--text-secondary)">@${escHtml(
    b.provider_username
  )} · ${escHtml(b.provider_email)}</div></div>
      </div>
    </div>

    <!-- Contact & Requirements -->
    <div class="detail-section">
      <div class="detail-section-title">Contact &amp; Requirements</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Contact Method</div><div class="detail-item-val">${contactMethodBadge(
          b.contact_method
        )}</div></div>
        <div class="detail-item"><div class="detail-item-label">Customer Contact</div><div class="detail-item-val">${escHtml(
          b.customer_contact
        )}</div></div>
        ${
          b.customer_requirements
            ? `<div class="detail-item full"><div class="detail-item-label">Requirements</div><div class="detail-item-val" style="font-weight:500;line-height:1.6;background:var(--main-bg);padding:10px;border-radius:8px">${escHtml(
                b.customer_requirements
              )}</div></div>`
            : ""
        }
        ${
          b.provider_message
            ? `<div class="detail-item full"><div class="detail-item-label">Provider Message</div><div class="detail-item-val" style="font-weight:500;line-height:1.6;color:var(--primary);background:rgba(230,10,234,.05);padding:10px;border-radius:8px;border-left:3px solid var(--primary)">${escHtml(
                b.provider_message
              )}</div></div>`
            : ""
        }
      </div>
    </div>

    <!-- Payment & Timeline -->
    <div class="detail-section">
      <div class="detail-section-title">Payment &amp; Timeline</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Payment Status</div><div class="detail-item-val">${payBadge(
          b.payment_status
        )}</div></div>
        <div class="detail-item"><div class="detail-item-label">Payment Method</div><div class="detail-item-val">${
          escHtml(b.payment_method) || "—"
        }</div></div>
        ${
          b.payment_reference
            ? `<div class="detail-item full"><div class="detail-item-label">Payment Reference</div><div class="detail-item-val" style="font-family:monospace;font-size:.75rem">${escHtml(
                b.payment_reference
              )}</div></div>`
            : ""
        }
        <div class="detail-item"><div class="detail-item-label">Advance Paid</div><div class="detail-item-val">${fmtAmount(
          b.advance_paid
        )}</div></div>
        ${
          b.advance_payment_date
            ? `<div class="detail-item"><div class="detail-item-label">Advance Date</div><div class="detail-item-val">${fmtDateTime(
                b.advance_payment_date
              )}</div></div>`
            : ""
        }
        ${
          b.final_payment_date
            ? `<div class="detail-item"><div class="detail-item-label">Final Payment</div><div class="detail-item-val">${fmtDateTime(
                b.final_payment_date
              )}</div></div>`
            : ""
        }
        ${
          b.accepted_at
            ? `<div class="detail-item"><div class="detail-item-label">Accepted At</div><div class="detail-item-val" style="color:#3b82f6">${fmtDateTime(
                b.accepted_at
              )}</div></div>`
            : ""
        }
        ${
          b.completed_at
            ? `<div class="detail-item"><div class="detail-item-label">Completed At</div><div class="detail-item-val" style="color:#22c55e">${fmtDateTime(
                b.completed_at
              )}</div></div>`
            : ""
        }
        ${
          b.service_completed_at
            ? `<div class="detail-item"><div class="detail-item-label">Service Done At</div><div class="detail-item-val">${fmtDateTime(
                b.service_completed_at
              )}</div></div>`
            : ""
        }
        ${
          b.buyer_confirmed_at
            ? `<div class="detail-item"><div class="detail-item-label">Buyer Confirmed At</div><div class="detail-item-val" style="color:#22c55e">${fmtDateTime(
                b.buyer_confirmed_at
              )}</div></div>`
            : ""
        }
        ${
          b.delivery_date
            ? `<div class="detail-item"><div class="detail-item-label">Delivery Date</div><div class="detail-item-val">${fmtDateTime(
                b.delivery_date
              )}</div></div>`
            : ""
        }
        ${
          b.cancelled_at
            ? `<div class="detail-item"><div class="detail-item-label">Cancelled At</div><div class="detail-item-val" style="color:#ef4444">${fmtDateTime(
                b.cancelled_at
              )}</div></div>`
            : ""
        }
        ${
          b.rejected_at
            ? `<div class="detail-item"><div class="detail-item-label">Rejected At</div><div class="detail-item-val" style="color:#ef4444">${fmtDateTime(
                b.rejected_at
              )}</div></div>`
            : ""
        }
        ${
          b.cancellation_reason
            ? `<div class="detail-item full"><div class="detail-item-label">Cancellation Reason</div><div class="detail-item-val" style="color:var(--red)">${escHtml(
                b.cancellation_reason
              )}</div></div>`
            : ""
        }
      </div>
    </div>

    <!-- Delivery -->
    ${
      b.delivery_message || b.delivery_files
        ? `
    <div class="detail-section">
      <div class="detail-section-title">Delivery Details</div>
      <div class="detail-grid">
        ${
          b.delivery_message
            ? `<div class="detail-item full"><div class="detail-item-label">Delivery Message</div><div class="detail-item-val" style="font-weight:500;line-height:1.6">${escHtml(
                b.delivery_message
              )}</div></div>`
            : ""
        }
        ${
          b.delivery_files
            ? `<div class="detail-item full"><div class="detail-item-label">Delivery Files</div><div class="detail-item-val" style="font-family:monospace;font-size:.72rem;word-break:break-all">${escHtml(
                b.delivery_files
              )}</div></div>`
            : ""
        }
      </div>
    </div>`
        : ""
    }

    <!-- Review -->
    ${
      b.customer_rating
        ? `
    <div class="detail-section">
      <div class="detail-section-title">Customer Review</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Rating</div><div class="detail-item-val">${"⭐".repeat(
          b.customer_rating
        )} (${b.customer_rating}/5)${
            b.review_date ? " · " + fmtDate(b.review_date) : ""
          }</div></div>
        ${
          b.customer_review
            ? `<div class="detail-item full"><div class="detail-item-label">Review</div><div class="detail-item-val" style="font-style:italic;line-height:1.6">"${escHtml(
                b.customer_review
              )}"</div></div>`
            : ""
        }
      </div>
    </div>`
        : ""
    }
  `;
}

function openStatusFromDetail() {
  if (!currentDetailBookingId) return;
  closeModal("detailModal");
  apiFetch(`/admin/bookings/${currentDetailBookingId}`).then((b) => {
    if (b && !b._error) openStatusModal(b.booking_id, b.status);
  });
}

// ── Status Modal ──
function openStatusModal(bookingId, currentStatus = "pending") {
  document.getElementById("sm-booking-id").value = bookingId;
  document.getElementById("sm-status").value = currentStatus;
  document.getElementById("sm-cancel-reason").value = "";
  document.getElementById("sm-message").value = "";
  document.getElementById("sm-cancel-wrap").style.display = [
    "cancelled",
    "rejected",
  ].includes(currentStatus)
    ? "flex"
    : "none";
  openModal("statusModal");
}
async function submitStatusModal() {
  const bookingId = document.getElementById("sm-booking-id").value;
  const payload = {
    status: document.getElementById("sm-status").value,
    cancellation_reason:
      (document.getElementById("sm-cancel-reason").value || "").trim() || null,
    provider_message:
      (document.getElementById("sm-message").value || "").trim() || null,
  };
  if (!payload.status) {
    showToast("Please select a status", "warn");
    return;
  }
  const btn = document.getElementById("smSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const r = await apiFetch(`/admin/bookings/${bookingId}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Update Status';
  if (r?.success) {
    showToast(r.message || "Status updated!", "success");
    closeModal("statusModal");
    loadStats();
    loadBookings();
  } else showToast(r?._error || r?.error || "Failed to update", "error");
}

// ── Messages Modal ──
async function openMessagesModal(bookingId) {
  document.getElementById(
    "msgModalTitle"
  ).textContent = `Messages — Booking #${bookingId}`;
  document.getElementById(
    "messagesArea"
  ).innerHTML = `<div style="text-align:center;padding:30px"><div class="auth-spin-ring" style="margin:0 auto;width:32px;height:32px"></div></div>`;
  openModal("messagesModal");
  const d = await apiFetch(`/admin/bookings/${bookingId}/messages`);
  const area = document.getElementById("messagesArea");
  if (!d || d._error || !d.messages?.length) {
    area.innerHTML = `<div class="empty-state" style="padding:30px"><i class="fas fa-comments"></i><p>No messages for this booking</p></div>`;
    return;
  }
  area.innerHTML = d.messages
    .map((m) => {
      const isProvider = m.sender_type === "provider";
      return `<div style="display:flex;flex-direction:column;align-items:${
        isProvider ? "flex-start" : "flex-end"
      }">
      <div class="msg-bubble ${isProvider ? "provider" : "customer"}">${escHtml(
        m.message
      )}</div>
      <div class="msg-meta" style="text-align:${
        isProvider ? "left" : "right"
      }">${escHtml(m.sender_name)} · ${fmtDateTime(m.sent_at)}</div>
    </div>`;
    })
    .join("");
  area.scrollTop = area.scrollHeight;
}

// ── Modal helpers ──
function openModal(id) {
  document.getElementById(id).classList.add("show");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

// ── Toast ──
function showToast(msg, type = "success") {
  const wrap = document.getElementById("toastWrap"),
    id = "toast_" + Date.now();
  const icon =
    type === "success" ? "fa-circle-check" : "fa-triangle-exclamation";
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
