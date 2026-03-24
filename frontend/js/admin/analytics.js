const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";
const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

let activeTab = "overview";
let dateFrom = "",
  dateTo = "";
let chartInstances = {};
let analyticsCache = {};

// ── Date helpers ──────────────────────────────────────────────────────────────
function toISO(d) {
  return d.toISOString().split("T")[0];
}
function today() {
  return toISO(new Date());
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
}
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return toISO(d);
}
function yearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return toISO(d);
}

function setPreset(preset) {
  document
    .querySelectorAll(".preset-btn")
    .forEach((b) => b.classList.remove("active"));
  event?.target?.classList.add("active");
  const to = today();
  let from;
  if (preset === "7d") from = daysAgo(7);
  else if (preset === "30d") from = daysAgo(30);
  else if (preset === "90d") from = daysAgo(90);
  else if (preset === "6m") from = monthsAgo(6);
  else if (preset === "1y") from = yearsAgo(1);
  else {
    from = "2020-01-01";
  } // all
  document.getElementById("dateFrom").value = from;
  document.getElementById("dateTo").value = to;
  dateFrom = from;
  dateTo = to;
  loadCurrentTab();
}

function applyDateRange() {
  dateFrom = document.getElementById("dateFrom").value;
  dateTo = document.getElementById("dateTo").value;
  if (!dateFrom || !dateTo) {
    showToast("Please select both dates", "warn");
    return;
  }
  document
    .querySelectorAll(".preset-btn")
    .forEach((b) => b.classList.remove("active"));
  analyticsCache = {};
  loadCurrentTab();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
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
  setPreset("30d");
  // Force click the 30D button
  document.querySelectorAll(".preset-btn")[1]?.classList.add("active");
})();

// ── Sidebar ───────────────────────────────────────────────────────────────────
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
    rebuildAllCharts();
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
        page: "analytics",
      },
      "*"
    );
  } catch (e) {}
}

// ── Logout ────────────────────────────────────────────────────────────────────
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

// ── API ───────────────────────────────────────────────────────────────────────
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
    if (!r.ok) {
      const e = await r.json().catch(() => {});
      return { _error: e?.error || "Error" };
    }
    return await r.json();
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}
function fmtRupee(v, short = false) {
  const n = parseFloat(v) || 0;
  if (short) {
    if (n >= 1e7) return "₹" + (n / 1e7).toFixed(1) + "Cr";
    if (n >= 1e5) return "₹" + (n / 1e5).toFixed(1) + "L";
    if (n >= 1e3) return "₹" + (n / 1e3).toFixed(1) + "K";
    return "₹" + n.toFixed(0);
  }
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function fmtNum(n) {
  return (parseInt(n) || 0).toLocaleString("en-IN");
}
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

function imgUrl(path, type = "profile") {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (type === "profile")
    return `${API}/get-profile-pic/${clean.split("/").pop()}`;
  return `${API}/uploads/${clean
    .replace("uploads/", "")
    .replace("uploads\\", "")}`;
}

function animCount(id, to, prefix = "", suffix = "", decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 900,
    start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1),
      ease = 1 - Math.pow(1 - p, 3);
    const val = to * ease;
    el.textContent =
      prefix +
      (decimals
        ? val.toFixed(decimals)
        : Math.round(val).toLocaleString("en-IN")) +
      suffix;
    if (p < 1) requestAnimationFrame(tick);
    else
      el.textContent =
        prefix +
        (decimals
          ? to.toFixed(decimals)
          : Math.round(to).toLocaleString("en-IN")) +
        suffix;
  })(start);
}

function chartDefaults() {
  const dark = isDark();
  return {
    gridColor: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    tickColor: dark ? "#c4aedd" : "#6b5880",
    bgCard: dark ? "#130d1a" : "#fff",
    border: dark ? "#3d2654" : "#f0e4f9",
    textColor: dark ? "#f0e8ff" : "#1a1a2e",
  };
}

function mkChart(id, config) {
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
  chartInstances[id] = new Chart(ctx.getContext("2d"), config);
  return chartInstances[id];
}

function buildTooltip(dark) {
  return {
    backgroundColor: dark ? "#2b1d3c" : "#fff",
    titleColor: dark ? "#f0e8ff" : "#1a1a2e",
    bodyColor: dark ? "#c4aedd" : "#6b5880",
    borderColor: dark ? "#3d2654" : "#f0e4f9",
    borderWidth: 1,
  };
}

function buildScales(dark, yLabel = null, stacked = false) {
  const s = {
    x: {
      grid: { color: dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)" },
      ticks: {
        color: dark ? "#c4aedd" : "#6b5880",
        font: { size: 10, family: "Plus Jakarta Sans" },
      },
      stacked,
    },
    y: {
      grid: { color: dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)" },
      ticks: {
        color: dark ? "#c4aedd" : "#6b5880",
        font: { size: 10, family: "Plus Jakarta Sans" },
      },
      stacked,
    },
  };
  if (yLabel)
    s.y.title = {
      display: true,
      text: yLabel,
      color: dark ? "#c4aedd" : "#6b5880",
      font: { size: 9 },
    };
  return s;
}

function buildLegend(containerId, labels, colors) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = labels
    .map(
      (l, i) =>
        `<div class="leg-item"><div class="leg-dot" style="background:${
          colors[i]
        }"></div><span>${escHtml(l)}</span></div>`
    )
    .join("");
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(`tab-${tab}`)?.classList.add("active");
  document.getElementById(`panel-${tab}`)?.classList.add("active");
  activeTab = tab;
  loadCurrentTab();
}

function loadCurrentTab() {
  switch (activeTab) {
    case "overview":
      loadOverview();
      break;
    case "revenue":
      loadRevenue();
      break;
    case "users":
      loadUsers();
      break;
    case "content":
      loadContent();
      break;
    case "orders":
      loadOrders();
      break;
    case "bookings":
      loadBookings();
      break;
    case "leaderboard":
      loadLeaderboard();
      break;
    case "reports":
      loadReportPreview();
      break;
  }
}

function rebuildAllCharts() {
  analyticsCache = {};
  loadCurrentTab();
}

// ─────────────────────────────────────────────────────────────────────────────
//  OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
async function loadOverview() {
  const d = await apiFetch(
    `/admin/analytics/overview?from=${dateFrom}&to=${dateTo}`
  );
  if (!d || d._error) return;

  animCount("ov-revenue", parseFloat(d.total_commission || 0), "₹", "", 0);
  animCount("ov-users", parseInt(d.total_users || 0));
  animCount("ov-orders", parseInt(d.total_orders || 0));
  animCount("ov-bookings", parseInt(d.total_bookings || 0));

  const dark = isDark();

  // Revenue area chart
  const months = (d.monthly_commission || []).map((r) => r.month);
  const commVals = (d.monthly_commission || []).map((r) =>
    parseFloat(r.commission)
  );
  mkChart("ov-revenue-chart", {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Commission",
          data: commVals,
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
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark, "₹ Commission"),
    },
  });

  // Order mix donut
  const onlineCount = parseInt(d.online_orders || 0),
    codCount = parseInt(d.cod_orders || 0);
  const mixLabels = ["Online", "COD"],
    mixData = [onlineCount, codCount],
    mixColors = ["#3b82f6", "#f97316"];
  mkChart("ov-order-mix-chart", {
    type: "doughnut",
    data: {
      labels: mixLabels,
      datasets: [
        {
          data: mixData,
          backgroundColor: mixColors,
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
    },
  });
  buildLegend("ov-order-mix-legend", mixLabels, mixColors);

  // User growth bar
  const signupLabels = (d.monthly_users || []).map((r) => r.month);
  const signupVals = (d.monthly_users || []).map((r) => parseInt(r.cnt));
  mkChart("ov-users-chart", {
    type: "bar",
    data: {
      labels: signupLabels,
      datasets: [
        {
          label: "New Users",
          data: signupVals,
          backgroundColor: "rgba(59,130,246,0.7)",
          borderColor: "#3b82f6",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark),
    },
  });

  // Content bar
  const postLabels = (d.monthly_posts || []).map((r) => r.month);
  const postVals = (d.monthly_posts || []).map((r) => parseInt(r.cnt));
  mkChart("ov-content-chart", {
    type: "bar",
    data: {
      labels: postLabels,
      datasets: [
        {
          label: "Posts",
          data: postVals,
          backgroundColor: "rgba(168,85,247,0.7)",
          borderColor: "#a855f7",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  REVENUE
// ─────────────────────────────────────────────────────────────────────────────
async function loadRevenue() {
  const d = await apiFetch(
    `/admin/analytics/revenue?from=${dateFrom}&to=${dateTo}`
  );
  if (!d || d._error) return;

  animCount("rev-commission", parseFloat(d.total_commission || 0), "₹");
  animCount("rev-online", parseFloat(d.online_commission || 0), "₹");
  animCount("rev-cod", parseFloat(d.cod_commission || 0), "₹");
  animCount("rev-withdrawn", parseFloat(d.total_withdrawn || 0), "₹");

  const dark = isDark();
  const months = (d.monthly || []).map((r) => r.month);
  const vals = (d.monthly || []).map((r) => parseFloat(r.commission));

  mkChart("rev-monthly-chart", {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "₹ Commission",
          data: vals,
          borderColor: "#e60aea",
          backgroundColor: "rgba(230,10,234,0.1)",
          borderWidth: 2.5,
          pointBackgroundColor: "#e60aea",
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
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark, "Commission (₹)"),
    },
  });

  const typeLabels = ["Online", "COD", "Deficit", "Recovery"];
  const typeVals = [
    parseFloat(d.online_commission || 0),
    parseFloat(d.cod_commission || 0),
    parseFloat(d.cod_deficit || 0),
    parseFloat(d.deficit_recovery || 0),
  ];
  const typeColors = ["#3b82f6", "#f97316", "#ef4444", "#22c55e"];
  mkChart("rev-type-chart", {
    type: "bar",
    data: {
      labels: typeLabels,
      datasets: [
        {
          label: "Amount",
          data: typeVals,
          backgroundColor: typeColors.map((c) => c + "cc"),
          borderColor: typeColors,
          borderWidth: 1.5,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...buildTooltip(dark),
          callbacks: {
            label: (c) => ` ₹${parseFloat(c.raw).toLocaleString("en-IN")}`,
          },
        },
      },
      scales: buildScales(dark),
    },
  });

  const wdLabels = ["Pending", "Approved", "Rejected"];
  const wdVals = [
    parseFloat(d.wd_pending || 0),
    parseFloat(d.wd_approved || 0),
    parseFloat(d.wd_rejected || 0),
  ];
  const wdColors = ["#eab308", "#22c55e", "#ef4444"];
  mkChart("rev-withdrawal-chart", {
    type: "doughnut",
    data: {
      labels: wdLabels,
      datasets: [
        {
          data: wdVals,
          backgroundColor: wdColors,
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
    },
  });
  buildLegend("rev-withdrawal-legend", wdLabels, wdColors);
}

// ─────────────────────────────────────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────────────────────────────────────
async function loadUsers() {
  const d = await apiFetch(
    `/admin/analytics/users?from=${dateFrom}&to=${dateTo}`
  );
  if (!d || d._error) return;

  animCount("usr-total", parseInt(d.total_users || 0));
  animCount("usr-active", parseInt(d.active_week || 0));
  animCount("usr-new", parseInt(d.new_month || 0));
  animCount("usr-locked", parseInt(d.locked || 0));

  const dark = isDark();

  const signupLabels = (d.monthly_signups || []).map((r) => r.month);
  const signupVals = (d.monthly_signups || []).map((r) => parseInt(r.cnt));
  mkChart("usr-signup-chart", {
    type: "bar",
    data: {
      labels: signupLabels,
      datasets: [
        {
          label: "Signups",
          data: signupVals,
          backgroundColor: "rgba(59,130,246,0.7)",
          borderColor: "#3b82f6",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark),
    },
  });

  const activeLabels = (d.active_trend || []).map((r) => r.month);
  const activeVals = (d.active_trend || []).map((r) => parseInt(r.cnt));
  mkChart("usr-active-chart", {
    type: "line",
    data: {
      labels: activeLabels,
      datasets: [
        {
          label: "Active Users",
          data: activeVals,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.1)",
          borderWidth: 2.5,
          pointBackgroundColor: "#22c55e",
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
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark),
    },
  });

  const genderData = d.gender_dist || {};
  const gLabels = Object.keys(genderData).map((g) => g || "Not set");
  const gVals = Object.values(genderData);
  const gColors = ["#e60aea", "#3b82f6", "#22c55e", "#f97316", "#a855f7"];
  mkChart("usr-gender-chart", {
    type: "doughnut",
    data: {
      labels: gLabels,
      datasets: [
        {
          data: gVals,
          backgroundColor: gColors.slice(0, gLabels.length),
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
    },
  });
  buildLegend("usr-gender-legend", gLabels, gColors.slice(0, gLabels.length));

  const roleLabels = ["Creators", "Admins"];
  const roleVals = [parseInt(d.creators || 0), parseInt(d.admins || 0)];
  const roleColors = ["#e60aea", "#f97316"];
  mkChart("usr-role-chart", {
    type: "doughnut",
    data: {
      labels: roleLabels,
      datasets: [
        {
          data: roleVals,
          backgroundColor: roleColors,
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
    },
  });
  buildLegend("usr-role-legend", roleLabels, roleColors);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTENT
// ─────────────────────────────────────────────────────────────────────────────
async function loadContent() {
  const d = await apiFetch(
    `/admin/analytics/content?from=${dateFrom}&to=${dateTo}`
  );
  if (!d || d._error) return;

  animCount("con-total", parseInt(d.total_posts || 0));
  animCount("con-likes", parseInt(d.total_likes || 0));
  animCount("con-comments", parseInt(d.total_comments || 0));
  animCount("con-products", parseInt(d.total_products || 0));

  const dark = isDark();

  const pLabels = (d.monthly_posts || []).map((r) => r.month);
  const pVals = (d.monthly_posts || []).map((r) => parseInt(r.cnt));
  mkChart("con-monthly-chart", {
    type: "bar",
    data: {
      labels: pLabels,
      datasets: [
        {
          label: "Posts",
          data: pVals,
          backgroundColor: "rgba(168,85,247,0.7)",
          borderColor: "#a855f7",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark),
    },
  });

  const typeData = d.by_type || {};
  const tLabels = Object.keys(typeData);
  const tVals = Object.values(typeData);
  const tColors = [
    "#e60aea",
    "#3b82f6",
    "#22c55e",
    "#f97316",
    "#a855f7",
    "#14b8a6",
  ];
  mkChart("con-type-chart", {
    type: "pie",
    data: {
      labels: tLabels,
      datasets: [
        {
          data: tVals,
          backgroundColor: tColors.slice(0, tLabels.length),
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
    },
  });
  buildLegend("con-type-legend", tLabels, tColors.slice(0, tLabels.length));
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORDERS
// ─────────────────────────────────────────────────────────────────────────────
async function loadOrders() {
  const d = await apiFetch(
    `/admin/analytics/orders?from=${dateFrom}&to=${dateTo}`
  );
  if (!d || d._error) return;

  animCount("ord-total", parseInt(d.total_orders || 0));
  animCount("ord-online", parseInt(d.online_orders || 0));
  animCount("ord-cod", parseInt(d.cod_orders || 0));
  animCount("ord-revenue", parseFloat(d.total_revenue || 0), "₹");

  const dark = isDark();
  const months = (d.monthly || []).map((r) => r.month);
  const onlineVals = (d.monthly || []).map((r) =>
    parseInt(r.online_count || 0)
  );
  const codVals = (d.monthly || []).map((r) => parseInt(r.cod_count || 0));

  mkChart("ord-stacked-chart", {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Online",
          data: onlineVals,
          backgroundColor: "rgba(59,130,246,0.8)",
          borderColor: "#3b82f6",
          borderWidth: 0,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: false,
        },
        {
          label: "COD",
          data: codVals,
          backgroundColor: "rgba(249,115,22,0.8)",
          borderColor: "#f97316",
          borderWidth: 0,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { family: "Plus Jakarta Sans", size: 11 },
            boxWidth: 12,
            borderRadius: 3,
          },
        },
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark, "Orders", true),
    },
  });

  const statusData = d.by_status || {};
  const sLabels = Object.keys(statusData);
  const sVals = Object.values(statusData);
  const statusColors = {
    delivered: "#22c55e",
    pending: "#eab308",
    shipped: "#3b82f6",
    cancelled: "#ef4444",
    returned: "#a855f7",
    processing: "#f97316",
    confirmed: "#14b8a6",
    out_for_delivery: "#06b6d4",
    return_requested: "#ec4899",
    refunded: "#6366f1",
  };
  const sColors = sLabels.map((l) => statusColors[l] || "#888");
  mkChart("ord-status-chart", {
    type: "doughnut",
    data: {
      labels: sLabels,
      datasets: [
        {
          data: sVals,
          backgroundColor: sColors,
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
    },
  });
  buildLegend("ord-status-legend", sLabels, sColors);

  const revLabels = (d.monthly || []).map((r) => r.month);
  const revVals = (d.monthly || []).map((r) => parseFloat(r.revenue || 0));
  mkChart("ord-revenue-chart", {
    type: "line",
    data: {
      labels: revLabels,
      datasets: [
        {
          label: "₹ Revenue",
          data: revVals,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.1)",
          borderWidth: 2.5,
          pointBackgroundColor: "#22c55e",
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
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
async function loadBookings() {
  const d = await apiFetch(
    `/admin/analytics/bookings?from=${dateFrom}&to=${dateTo}`
  );
  if (!d || d._error) return;

  const byS = d.by_status || {};
  const total = Object.values(byS).reduce((a, b) => a + b, 0);
  const completed = byS.completed || 0;
  const pending =
    (byS.pending || 0) + (byS.accepted || 0) + (byS.in_progress || 0);
  const rate = total > 0 ? (completed / total) * 100 : 0;

  animCount("bk-total", total);
  animCount("bk-completed", completed);
  animCount("bk-pending", pending);
  document.getElementById("bk-rate").textContent = rate.toFixed(1) + "%";

  const dark = isDark();

  // Monthly bar
  const bkLabels = (d.monthly || []).map((r) => r.month);
  const bkVals = (d.monthly || []).map((r) => parseInt(r.cnt));
  mkChart("bk-monthly-chart", {
    type: "bar",
    data: {
      labels: bkLabels,
      datasets: [
        {
          label: "Bookings",
          data: bkVals,
          backgroundColor: "rgba(168,85,247,0.75)",
          borderColor: "#a855f7",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark),
    },
  });

  // Completion donut
  const statColors = {
    pending: "#eab308",
    accepted: "#3b82f6",
    in_progress: "#a855f7",
    revision_requested: "#f97316",
    completed: "#22c55e",
    cancelled: "#ef4444",
    rejected: "#9ca3af",
  };
  const sLabels = Object.keys(byS),
    sVals = Object.values(byS),
    sColors = sLabels.map((l) => statColors[l] || "#888");
  mkChart("bk-donut-chart", {
    type: "doughnut",
    data: {
      labels: sLabels,
      datasets: [
        {
          data: sVals,
          backgroundColor: sColors,
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: buildTooltip(dark),
      },
    },
  });
  document.getElementById("bk-completion-pct").textContent =
    rate.toFixed(0) + "%";
  const statsEl = document.getElementById("bk-completion-stats");
  if (statsEl)
    statsEl.innerHTML = sLabels
      .slice(0, 4)
      .map(
        (l, i) =>
          `<div class="completion-stat"><div class="cs-dot" style="background:${
            sColors[i]
          }"></div><span>${l.replace(/_/g, " ")}: <strong>${
            sVals[i]
          }</strong></span></div>`
      )
      .join("");
  buildLegend("bk-status-legend", sLabels, sColors);

  // Revenue line
  const rLabels = (d.monthly || []).map((r) => r.month);
  const rVals = (d.monthly || []).map((r) => parseFloat(r.revenue || 0));
  mkChart("bk-revenue-chart", {
    type: "line",
    data: {
      labels: rLabels,
      datasets: [
        {
          label: "₹ Booking Revenue",
          data: rVals,
          borderColor: "#14b8a6",
          backgroundColor: "rgba(20,184,166,0.1)",
          borderWidth: 2.5,
          pointBackgroundColor: "#14b8a6",
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
        tooltip: buildTooltip(dark),
      },
      scales: buildScales(dark, "Revenue (₹)"),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────
async function loadLeaderboard() {
  const d = await apiFetch(
    `/admin/analytics/leaderboard?from=${dateFrom}&to=${dateTo}`
  );
  if (!d || d._error) {
    [
      "lb-creators-list",
      "lb-posts-list",
      "lb-sellers-list",
      "lb-followers-list",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el)
        el.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load data</p></div>`;
    });
    return;
  }

  renderCreators(d.top_creators || []);
  renderTopPosts(d.top_posts || []);
  renderTopSellers(d.top_sellers || []);
  renderTopFollowed(d.top_followed || []);
}

function rankBadge(i) {
  if (i === 0) return "gold";
  if (i === 1) return "silver";
  if (i === 2) return "bronze";
  return "";
}
function rankIcon(i) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `#${i + 1}`;
}

function renderCreators(list) {
  const el = document.getElementById("lb-creators-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-trophy"></i><p>No creator data</p></div>`;
    return;
  }
  const max = parseFloat(list[0]?.available_balance || 1);
  el.innerHTML = list
    .slice(0, 10)
    .map((c, i) => {
      const initials = (c.full_name || c.username || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      const src = c.profile_pic ? imgUrl(c.profile_pic) : "";
      const av = src
        ? `<div class="lb-avatar"><img src="${escHtml(
            src
          )}" alt="" onerror="this.parentNode.textContent='${initials}'" /></div>`
        : `<div class="lb-avatar">${initials}</div>`;
      const pct = Math.round(
        (parseFloat(c.available_balance || 0) / max) * 100
      );
      return `<div class="lb-row">${av}<div style="flex:1;min-width:0"><div class="lb-name">${escHtml(
        c.full_name || c.username
      )}</div><div class="lb-sub">@${escHtml(c.username)} · ${fmtNum(
        c.post_count || 0
      )} posts</div><div class="lb-bar-wrap" style="margin-top:5px"><div class="lb-bar" style="width:${pct}%"></div></div></div><div class="lb-val">${fmtRupee(
        c.available_balance,
        true
      )}</div><div class="lb-rank ${rankBadge(i)}">${rankIcon(i)}</div></div>`;
    })
    .join("");
}

function renderTopPosts(list) {
  const el = document.getElementById("lb-posts-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-fire"></i><p>No posts data</p></div>`;
    return;
  }
  const max = parseInt(list[0]?.likes_count || 1);
  el.innerHTML = list
    .slice(0, 10)
    .map((p, i) => {
      const pct = Math.round((parseInt(p.likes_count || 0) / max) * 100);
      return `<div class="lb-row"><div class="lb-rank ${rankBadge(
        i
      )}">${rankIcon(
        i
      )}</div><div style="flex:1;min-width:0"><div class="lb-name">${escHtml(
        p.product_title || p.title || "Untitled Post"
      )}</div><div class="lb-sub">@${escHtml(p.username)} · ${escHtml(
        p.post_type || "post"
      )}</div><div class="lb-bar-wrap" style="margin-top:5px"><div class="lb-bar" style="width:${pct}%;background:linear-gradient(90deg,#ef4444,#f97316)"></div></div></div><div class="lb-val" style="color:#ef4444"><i class="fas fa-heart" style="font-size:0.75rem;margin-right:3px"></i>${fmtNum(
        p.likes_count
      )}</div></div>`;
    })
    .join("");
}

function renderTopSellers(list) {
  const el = document.getElementById("lb-sellers-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-store"></i><p>No seller data</p></div>`;
    return;
  }
  const max = parseInt(list[0]?.order_count || 1);
  el.innerHTML = list
    .slice(0, 10)
    .map((s, i) => {
      const initials = (s.full_name || s.username || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      const src = s.profile_pic ? imgUrl(s.profile_pic) : "";
      const av = src
        ? `<div class="lb-avatar"><img src="${escHtml(
            src
          )}" alt="" onerror="this.parentNode.textContent='${initials}'" /></div>`
        : `<div class="lb-avatar">${initials}</div>`;
      const pct = Math.round((parseInt(s.order_count || 0) / max) * 100);
      return `<div class="lb-row">${av}<div style="flex:1;min-width:0"><div class="lb-name">${escHtml(
        s.full_name || s.username
      )}</div><div class="lb-sub">@${escHtml(
        s.username
      )}</div><div class="lb-bar-wrap" style="margin-top:5px"><div class="lb-bar" style="width:${pct}%;background:linear-gradient(90deg,#22c55e,#16a34a)"></div></div></div><div class="lb-val" style="color:var(--green)">${fmtNum(
        s.order_count
      )} orders</div><div class="lb-rank ${rankBadge(i)}">${rankIcon(
        i
      )}</div></div>`;
    })
    .join("");
}

function renderTopFollowed(list) {
  const el = document.getElementById("lb-followers-list");
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>No data</p></div>`;
    return;
  }
  const max = parseInt(list[0]?.follower_count || 1);
  el.innerHTML = list
    .slice(0, 10)
    .map((u, i) => {
      const initials = (u.full_name || u.username || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
      const src = u.profile_pic ? imgUrl(u.profile_pic) : "";
      const av = src
        ? `<div class="lb-avatar"><img src="${escHtml(
            src
          )}" alt="" onerror="this.parentNode.textContent='${initials}'" /></div>`
        : `<div class="lb-avatar">${initials}</div>`;
      const pct = Math.round((parseInt(u.follower_count || 0) / max) * 100);
      return `<div class="lb-row">${av}<div style="flex:1;min-width:0"><div class="lb-name">${escHtml(
        u.full_name || u.username
      )}</div><div class="lb-sub">@${escHtml(
        u.username
      )}</div><div class="lb-bar-wrap" style="margin-top:5px"><div class="lb-bar" style="width:${pct}%;background:linear-gradient(90deg,#3b82f6,#2563eb)"></div></div></div><div class="lb-val" style="color:var(--blue)">${fmtNum(
        u.follower_count
      )}</div><div class="lb-rank ${rankBadge(i)}">${rankIcon(i)}</div></div>`;
    })
    .join("");
}

// ─────────────────────────────────────────────────────────────────────────────
//  REPORT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function updateReportDates() {
  const range = document.getElementById("rpt-range").value;
  const fromEl = document.getElementById("rpt-from");
  if (range !== "custom") {
    const from =
      range === "7d"
        ? daysAgo(7)
        : range === "30d"
        ? daysAgo(30)
        : range === "90d"
        ? daysAgo(90)
        : range === "6m"
        ? monthsAgo(6)
        : yearsAgo(1);
    fromEl.value = from;
    fromEl.disabled = true;
  } else {
    fromEl.disabled = false;
  }
}

async function loadReportPreview() {
  updateReportDates();
  const fromEl = document.getElementById("rpt-from");
  const from = fromEl?.value || daysAgo(30);
  const to = today();
  const type = document.getElementById("rpt-type")?.value || "overview";
  const group = document.getElementById("rpt-group")?.value || "month";

  document.getElementById("rpt-period-badge").textContent = `${fmtDate(
    from
  )} → ${fmtDate(to)}`;
  document.getElementById(
    "rpt-generated-at"
  ).textContent = `Generated: ${new Date().toLocaleString("en-IN")}`;
  document.getElementById(
    "rpt-kpi-row"
  ).innerHTML = `<div style="grid-column:1/-1"><div class="loading-overlay"><div class="auth-spin-ring" style="width:32px;height:32px"></div><p>Loading report data…</p></div></div>`;
  document.getElementById("rpt-tbody").innerHTML = "";
  document.getElementById("rpt-thead").innerHTML = "";

  const d = await apiFetch(
    `/admin/analytics/report?type=${type}&from=${from}&to=${to}&group=${group}`
  );
  if (!d || d._error) {
    document.getElementById(
      "rpt-kpi-row"
    ).innerHTML = `<div style="grid-column:1/-1"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load report data</p></div></div>`;
    return;
  }

  renderReportKpis(d.kpis || {});
  renderReportTable(d.rows || [], d.columns || []);
}

function renderReportKpis(kpis) {
  const colors = ["green", "blue", "orange", "purple"];
  const el = document.getElementById("rpt-kpi-row");
  const entries = Object.entries(kpis);
  if (!entries.length) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = entries
    .slice(0, 4)
    .map(
      ([label, val], i) => `
<div class="report-kpi">
<div class="report-kpi-label">${escHtml(label)}</div>
<div class="report-kpi-val ${colors[i]}">${escHtml(String(val))}</div>
</div>`
    )
    .join("");
}

function renderReportTable(rows, columns) {
  if (!columns.length || !rows.length) {
    document.getElementById("rpt-thead").innerHTML = "";
    document.getElementById(
      "rpt-tbody"
    ).innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fas fa-table"></i><p>No data for selected period</p></div></td></tr>`;
    return;
  }
  document.getElementById("rpt-thead").innerHTML = `<tr>${columns
    .map((c) => `<th>${escHtml(c)}</th>`)
    .join("")}</tr>`;
  document.getElementById("rpt-tbody").innerHTML = rows
    .map((row) => {
      return `<tr>${columns
        .map((c) => {
          const v = row[c];
          let cls = "";
          if (
            typeof v === "number" &&
            (c.toLowerCase().includes("amount") ||
              c.toLowerCase().includes("revenue") ||
              c.toLowerCase().includes("commission"))
          )
            cls = "amount green";
          return `<td class="${cls}">${
            v !== null && v !== undefined ? escHtml(String(v)) : "—"
          }</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");
}

// FIX: generateReport now always resets buttons in a finally-equivalent block
async function generateReport(format) {
  const type = document.getElementById("rpt-type").value;
  const group = document.getElementById("rpt-group").value;
  const from = document.getElementById("rpt-from").value || daysAgo(30);
  const to = today();
  const btn = document.getElementById(`rpt-${format}-btn`);

  // Save original label to restore it
  const originalHTML =
    format === "pdf"
      ? '<i class="fas fa-file-pdf"></i> PDF'
      : '<i class="fas fa-file-excel"></i> Excel';

  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating…`;
  showToast(`Generating ${format.toUpperCase()} report…`, "warn");

  try {
    const token =
      localStorage.getItem("adminAuthToken") ||
      sessionStorage.getItem("adminAuthToken");
    const url = `${API}/admin/analytics/export?type=${type}&from=${from}&to=${to}&group=${group}&format=${format}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (r.status === 501) {
      // Server libraries not installed — fall back to client-side CSV for Excel
      showToast(
        format === "xls"
          ? "Server export unavailable — downloading as CSV…"
          : "PDF export requires openpyxl/reportlab on server",
        "warn"
      );
      if (format === "xls") clientSideExport("xls");
    } else if (!r.ok) {
      throw new Error(`Server error ${r.status}`);
    } else {
      const blob = await r.blob();
      const a = document.createElement("a");
      const ext = format === "pdf" ? "pdf" : "xlsx";
      a.href = URL.createObjectURL(blob);
      a.download = `CreatorConnect_${type}_report_${from}_to_${to}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`${format.toUpperCase()} report downloaded!`, "success");
    }
  } catch (e) {
    showToast(
      format === "xls"
        ? "Server export failed — downloading as CSV…"
        : "PDF export failed. Install reportlab on the server.",
      "error"
    );
    if (format === "xls") clientSideExport("xls");
  } finally {
    // Always reset the button regardless of success/failure
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function clientSideExport(format) {
  const headers = Array.from(document.querySelectorAll("#rpt-thead th")).map(
    (th) => th.textContent
  );
  const rows = Array.from(document.querySelectorAll("#rpt-tbody tr")).map(
    (tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent)
  );
  if (!headers.length) {
    showToast("No report data to export — load a report first", "warn");
    return;
  }

  if (format === "xls") {
    // Build CSV as fallback for Excel
    const csvContent = [headers, ...rows]
      .map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Downloaded as CSV (Excel compatible)", "success");
  }
}

// FIX: quickExport now tries server export first, with proper button reset
async function quickExport(format) {
  const btnId = format === "pdf" ? "quickExportPdf" : "quickExportXls";
  const btn = document.getElementById(btnId);
  const originalHTML =
    format === "pdf"
      ? '<i class="fas fa-file-pdf"></i> Export PDF'
      : '<i class="fas fa-file-excel"></i> Export Excel';

  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Exporting…`;
  showToast(`Exporting as ${format.toUpperCase()}…`, "warn");

  try {
    // Use current active tab's data type for the export
    const type =
      activeTab === "reports"
        ? document.getElementById("rpt-type")?.value || "overview"
        : activeTab === "leaderboard"
        ? "creators"
        : activeTab;
    const from = dateFrom || daysAgo(30);
    const to = dateTo || today();
    const group = "month";

    const token =
      localStorage.getItem("adminAuthToken") ||
      sessionStorage.getItem("adminAuthToken");
    const url = `${API}/admin/analytics/export?type=${type}&from=${from}&to=${to}&group=${group}&format=${format}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (r.status === 501 || !r.ok) {
      // Fall back
      if (format === "xls") {
        clientSideExport("xls");
      } else {
        showToast(
          "PDF export requires reportlab installed on server (pip install reportlab openpyxl requests)",
          "warn"
        );
      }
    } else {
      const blob = await r.blob();
      const a = document.createElement("a");
      const ext = format === "pdf" ? "pdf" : "xlsx";
      a.href = URL.createObjectURL(blob);
      a.download = `CreatorConnect_${type}_${from}_to_${to}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`${format.toUpperCase()} exported!`, "success");
    }
  } catch (e) {
    if (format === "xls") {
      clientSideExport("xls");
    } else {
      showToast(
        "PDF export failed — server libraries may not be installed.",
        "error"
      );
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const wrap = document.getElementById("toastWrap"),
    id = "toast_" + Date.now();
  const icon =
    type === "success"
      ? "fa-circle-check"
      : type === "error"
      ? "fa-triangle-exclamation"
      : "fa-hourglass-half";
  wrap.insertAdjacentHTML(
    "beforeend",
    `<div class="toast ${type}" id="${id}"><i class="fas ${icon}"></i>${escHtml(
      msg
    )}</div>`
  );
  setTimeout(() => document.getElementById(id)?.remove(), 4000);
}

// ── Report config setup on load ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateReportDates();
  document
    .getElementById("rpt-type")
    ?.addEventListener("change", loadReportPreview);
  document
    .getElementById("rpt-group")
    ?.addEventListener("change", loadReportPreview);
  document.getElementById("rpt-range")?.addEventListener("change", () => {
    updateReportDates();
    loadReportPreview();
  });
});
