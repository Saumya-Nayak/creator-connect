const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";
const PAYMENT_API = API;

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

let state = {
  page: 1,
  limit: 20,
  search: "",
  status: "",
  payment_method: "",
  payment_status: "",
  date_from: "",
  date_to: "",
  sort: "order_date",
  dir: "desc",
  total: 0,
  pages: 1,
};
let currentDetailOrderId = null;
let pieChartInst = null,
  barChartInst = null,
  payChartInst = null;
let viewMode = localStorage.getItem("ordersView") || "grid";

// ── Read URL params on load ──
(function readUrlParams() {
  const params = new URLSearchParams(location.search);
  const ps = params.get("payment_status");
  const os = params.get("status");
  if (ps) {
    state.payment_status = ps;
    const sel = document.getElementById("unifiedStatusFilter");
    if (sel) sel.value = "ps:" + ps;
  } else if (os) {
    state.status = os;
    const sel = document.getElementById("unifiedStatusFilter");
    if (sel) sel.value = "os:" + os;
  }
})();

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
        page: "orders",
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

// ── API helpers ──
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
      const err = await r.json().catch(() => ({}));
      return { _error: err.error || "Error", _status: r.status };
    }
    return await r.json();
  } catch {
    return null;
  }
}
async function paymentFetch(path, opts = {}) {
  try {
    const r = await fetch(PAYMENT_API + path, {
      headers: authHeaders(),
      ...opts,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return { _error: err.message || err.error || "Error", _status: r.status };
    }
    return await r.json();
  } catch {
    return null;
  }
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

function initPage() {
  const savedView = localStorage.getItem("ordersView") || "grid";
  viewMode = savedView;
  document
    .getElementById("listViewBtn")
    .classList.toggle("active", savedView === "list");
  document
    .getElementById("gridViewBtn")
    .classList.toggle("active", savedView === "grid");
  document.getElementById("ordersListView").style.display =
    savedView === "list" ? "" : "none";
  document.getElementById("ordersGridView").style.display =
    savedView === "grid" ? "" : "none";
  loadStats();
  setupFilters();
  ["detailModal", "statusModal", "refundModal"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => {
      if (e.target === document.getElementById(id)) closeModal(id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      ["detailModal", "statusModal", "refundModal"].forEach((id) =>
        closeModal(id)
      );
  });
  document.getElementById("sm-status").addEventListener("change", (e) => {
    document.getElementById("sm-cancel-wrap").style.display =
      e.target.value === "cancelled" ? "flex" : "none";
  });
  updateUnifiedSelectStyle();
}

// ── Stats ──
async function loadStats() {
  const d = await apiFetch("/admin/orders/stats");
  if (!d || d._error) return;
  const byS = d.by_status || {};
  const total = Object.values(byS).reduce((a, b) => a + b, 0);
  const delivered = byS.delivered || 0;
  const pending =
    (byS.pending || 0) +
    (byS.confirmed || 0) +
    (byS.processing || 0) +
    (byS.shipped || 0) +
    (byS.out_for_delivery || 0);
  const cancelled = byS.cancelled || 0;
  animCount("sv-total", total);
  animCount("sv-delivered", delivered);
  animCount("sv-pending", pending);
  animCount("sv-cancelled", cancelled);
  document.getElementById("sv-revenue").textContent =
    "₹" +
    parseFloat(d.total_revenue || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  buildPieChart(d.by_status || {});
  buildBarChart(d.weekly || []);
  buildPayChart(d.payment_split || []);
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
  confirmed: "#3b82f6",
  processing: "#a855f7",
  shipped: "#14b8a6",
  out_for_delivery: "#f97316",
  delivered: "#22c55e",
  cancelled: "#ef4444",
  return_requested: "#f59e0b",
  returned: "#6b7280",
  refunded: "#a78bfa",
};
const STATUS_ICONS = {
  pending: "⏳",
  confirmed: "✅",
  processing: "⚙️",
  shipped: "📦",
  out_for_delivery: "🚚",
  delivered: "🎉",
  cancelled: "❌",
  return_requested: "↩️",
  returned: "🔄",
  refunded: "💸",
};

function buildPieChart(byStatus) {
  const ctx = document.getElementById("pieChart").getContext("2d");
  if (pieChartInst) pieChartInst.destroy();
  const labels = Object.keys(byStatus),
    data = Object.values(byStatus);
  const colors = labels.map((l) => STATUS_COLORS[l] || "#888");
  const dark = isDark(),
    total = data.reduce((a, b) => a + b, 0) || 1;
  pieChartInst = new Chart(ctx, {
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
  document.getElementById("pieLegend").innerHTML = labels
    .map(
      (l, i) =>
        `<div class="leg-item"><div class="leg-dot" style="background:${
          colors[i]
        }"></div><span>${
          STATUS_ICONS[l] || ""
        } ${l}</span><span style="color:var(--text-secondary);margin-left:4px">${
          data[i]
        }</span></div>`
    )
    .join("");
}
function buildBarChart(weekly) {
  const ctx = document.getElementById("barChart").getContext("2d");
  if (barChartInst) barChartInst.destroy();
  const labels = weekly.map((w) =>
    w.week_start
      ? new Date(w.week_start).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      : ""
  );
  const data = weekly.map((w) => parseFloat(w.revenue || 0));
  const dark = isDark();
  barChartInst = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue (₹)",
          data,
          backgroundColor: "rgba(230,10,234,.7)",
          borderColor: "rgba(230,10,234,1)",
          borderWidth: 2,
          borderRadius: 7,
          borderSkipped: false,
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
          callbacks: {
            label: (c) =>
              `₹${parseFloat(c.raw).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)" },
          ticks: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { size: 10, family: "Plus Jakarta Sans" },
          },
        },
        y: {
          grid: { color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)" },
          ticks: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { size: 10, family: "Plus Jakarta Sans" },
            callback: (v) =>
              "₹" +
              parseFloat(v).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              }),
          },
        },
      },
    },
  });
}
function buildPayChart(splits) {
  const ctx = document.getElementById("payChart").getContext("2d");
  if (payChartInst) payChartInst.destroy();
  const codRow = splits.find((s) => s.method_type === "cod") || {
    cnt: 0,
    revenue: 0,
  };
  const onlineRow = splits.find((s) => s.method_type === "online") || {
    cnt: 0,
    revenue: 0,
  };
  const labels = ["COD", "Online"],
    data = [parseInt(codRow.cnt), parseInt(onlineRow.cnt)],
    colors = ["#f97316", "#3b82f6"];
  const dark = isDark(),
    total = data.reduce((a, b) => a + b, 0) || 1;
  payChartInst = new Chart(ctx, {
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
      cutout: "68%",
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
              `  ${c.label}: ${c.raw} orders (${Math.round(
                (c.raw / total) * 100
              )}%)`,
          },
        },
      },
      animation: { animateRotate: true, duration: 800 },
    },
  });
  document.getElementById("payLegend").innerHTML = [
    { label: "COD", cnt: codRow.cnt, rev: codRow.revenue, color: "#f97316" },
    {
      label: "Online",
      cnt: onlineRow.cnt,
      rev: onlineRow.revenue,
      color: "#3b82f6",
    },
  ]
    .map(
      (p) =>
        `<div class="leg-item"><div class="leg-dot" style="background:${
          p.color
        }"></div><span>${
          p.label
        }</span><span style="color:var(--text-secondary);margin-left:4px">${
          p.cnt
        } orders · ₹${parseFloat(p.rev || 0).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })}</span></div>`
    )
    .join("");
}
function rebuildCharts() {
  apiFetch("/admin/orders/stats").then((d) => {
    if (!d || d._error) return;
    buildPieChart(d.by_status || {});
    buildBarChart(d.weekly || []);
    buildPayChart(d.payment_split || []);
  });
}

// ── View ──
function setView(mode) {
  viewMode = mode;
  localStorage.setItem("ordersView", mode);
  document
    .getElementById("listViewBtn")
    .classList.toggle("active", mode === "list");
  document
    .getElementById("gridViewBtn")
    .classList.toggle("active", mode === "grid");
  document.getElementById("ordersListView").style.display =
    mode === "list" ? "" : "none";
  document.getElementById("ordersGridView").style.display =
    mode === "grid" ? "" : "none";
  loadOrders();
}

// ── Unified select style ──
function updateUnifiedSelectStyle() {
  const sel = document.getElementById("unifiedStatusFilter");
  sel.classList.remove(
    "ps-active-pending",
    "ps-active-confirmed",
    "ps-active-rejected"
  );
  const v = sel.value;
  if (
    v === "ps:verification_pending" ||
    v === "ps:pending" ||
    v === "ps:cod_pending"
  )
    sel.classList.add("ps-active-pending");
  else if (v === "ps:completed") sel.classList.add("ps-active-confirmed");
  else if (v === "ps:rejected") sel.classList.add("ps-active-rejected");
}

// ── Filters ──
function resetFilters() {
  document.getElementById("orderSearch").value = "";
  document.getElementById("unifiedStatusFilter").value = "";
  document.getElementById("payFilter").value = "";
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";
  Object.assign(state, {
    search: "",
    status: "",
    payment_method: "",
    payment_status: "",
    date_from: "",
    date_to: "",
    page: 1,
  });
  updateResetBtn();
  updateUnifiedSelectStyle();
  history.replaceState({}, "", location.pathname);
  loadOrders();
}
function updateResetBtn() {
  const has =
    state.search ||
    state.status ||
    state.payment_method ||
    state.payment_status ||
    state.date_from ||
    state.date_to;
  document
    .getElementById("resetFiltersBtn")
    .classList.toggle("has-filters", !!has);
}
function setupFilters() {
  setView(viewMode);
  const sel = document.getElementById("unifiedStatusFilter");
  if (state.payment_status) sel.value = "ps:" + state.payment_status;
  else if (state.status) sel.value = "os:" + state.status;
  updateUnifiedSelectStyle();
  let deb;
  document.getElementById("orderSearch").addEventListener("input", (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      state.search = e.target.value;
      state.page = 1;
      updateResetBtn();
      loadOrders();
    }, 300);
  });
  document
    .getElementById("unifiedStatusFilter")
    .addEventListener("change", (e) => {
      const v = e.target.value;
      state.status = "";
      state.payment_status = "";
      if (v.startsWith("os:")) state.status = v.slice(3);
      else if (v.startsWith("ps:")) state.payment_status = v.slice(3);
      state.page = 1;
      updateResetBtn();
      updateUnifiedSelectStyle();
      loadOrders();
    });
  document.getElementById("payFilter").addEventListener("change", (e) => {
    state.payment_method = e.target.value;
    state.page = 1;
    updateResetBtn();
    loadOrders();
  });
  document.getElementById("dateFrom").addEventListener("change", (e) => {
    state.date_from = e.target.value;
    state.page = 1;
    updateResetBtn();
    loadOrders();
  });
  document.getElementById("dateTo").addEventListener("change", (e) => {
    state.date_to = e.target.value;
    state.page = 1;
    updateResetBtn();
    loadOrders();
  });
  loadOrders();
}
function sortOrders(field) {
  if (state.sort === field) state.dir = state.dir === "asc" ? "desc" : "asc";
  else {
    state.sort = field;
    state.dir = "desc";
  }
  loadOrders();
}

// ── Load Orders ──
async function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");
  const grid = document.getElementById("ordersGridView");
  if (viewMode === "list") tbody.innerHTML = renderTableSkels(8, 9);
  else grid.innerHTML = renderCardSkels(8);
  const p = new URLSearchParams({
    search: state.search,
    status: state.status,
    payment_method: state.payment_method,
    payment_status: state.payment_status,
    date_from: state.date_from,
    date_to: state.date_to,
    page: state.page,
    limit: state.limit,
    sort: state.sort,
    dir: state.dir,
  });
  const d = await apiFetch(`/admin/orders?${p}`);
  if (!d || d._error) {
    const msg = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load orders</p></div>`;
    if (viewMode === "list")
      tbody.innerHTML = `<tr><td colspan="9">${msg}</td></tr>`;
    else grid.innerHTML = msg;
    return;
  }
  state.total = d.total;
  state.pages = d.pages;
  if (!d.orders.length) {
    const msg = `<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders found</p></div>`;
    if (viewMode === "list")
      tbody.innerHTML = `<tr><td colspan="9">${msg}</td></tr>`;
    else grid.innerHTML = msg;
    document.getElementById("ordersPagination").innerHTML = "";
    return;
  }
  if (viewMode === "list")
    tbody.innerHTML = d.orders.map((o, i) => renderOrderRow(o, i)).join("");
  else grid.innerHTML = d.orders.map((o, i) => renderOrderCard(o, i)).join("");
  renderPagination("ordersPagination", state, gotoPage);
}

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
function renderCardSkels(n) {
  return Array(n)
    .fill(0)
    .map(
      () =>
        `<div class="order-card"><div class="order-card-top"><div class="skeleton" style="width:48px;height:48px;border-radius:10px;flex-shrink:0"></div><div style="flex:1"><div class="skeleton" style="height:10px;width:40%;margin-bottom:7px"></div><div class="skeleton" style="height:14px;width:75%;margin-bottom:5px"></div><div class="skeleton" style="height:10px;width:30%"></div></div></div><div class="order-card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="skeleton" style="height:52px;border-radius:10px"></div><div class="skeleton" style="height:52px;border-radius:10px"></div></div><div class="skeleton" style="height:28px;border-radius:8px"></div></div><div class="order-card-footer"><div class="skeleton" style="height:11px;width:40%"></div><div class="skeleton" style="height:28px;width:90px;border-radius:8px"></div></div></div>`
    )
    .join("");
}

// ── Render helpers ──
function payBadge(method) {
  if (!method)
    return '<span style="color:var(--text-secondary);font-size:.72rem">—</span>';
  const m = (method || "").toLowerCase();
  const cls =
    m === "cod"
      ? "cod"
      : m === "upi"
      ? "upi"
      : m === "bank_transfer"
      ? "bank_transfer"
      : m === "razorpay"
      ? "razorpay"
      : "online";
  const label =
    m === "cod"
      ? "💵 COD"
      : m === "upi"
      ? "📲 UPI"
      : m === "bank_transfer"
      ? "🏦 Bank"
      : m === "razorpay"
      ? "💳 Razorpay"
      : `💻 ${method}`;
  return `<span class="pay-badge ${cls}">${label}</span>`;
}
function payStatusBadge(ps) {
  if (!ps || ps === "pending") return "";
  const map = {
    verification_pending: {
      cls: "pay-pending-indicator",
      icon: "fa-hourglass-half",
      label: "Pay Pending",
    },
    completed: {
      cls: "status-badge delivered",
      icon: "fa-circle-check",
      label: "✅ Pay Confirmed",
    },
    rejected: {
      cls: "status-badge cancelled",
      icon: "fa-circle-xmark",
      label: "❌ Pay Rejected",
    },
    cod_pending: { cls: "pay-badge cod", icon: "fa-truck", label: "💵 COD" },
  };
  const m = map[ps];
  if (!m) return "";
  if (m.cls === "pay-pending-indicator")
    return `<span class="${m.cls}"><i class="fas ${m.icon}"></i> ${m.label}</span>`;
  return `<span class="${m.cls}" style="font-size:.6rem;padding:2px 7px;"><i class="fas ${m.icon}"></i> ${m.label}</span>`;
}
function statusBadge(status) {
  const icon = STATUS_ICONS[status] || "";
  return `<span class="status-badge ${status}">${icon} ${escHtml(
    status
  )}</span>`;
}

const IMG_BASE = `http://${location.hostname}:3000`;
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
    )}" onerror="this.style.display='none';this.parentNode.innerHTML='${initials}'" alt="${escHtml(
      name
    )}"/></div>`;
  return `<div class="user-avatar" style="width:${size}px;height:${size}px">${initials}</div>`;
}

function renderOrderCard(o, idx) {
  const delay = (idx % 20) * 0.03;
  const bInit = (o.buyer_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const sInit = (o.seller_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const bSrc = imgUrl(o.buyer_avatar, "profile"),
    sSrc = imgUrl(o.seller_avatar, "profile");
  const buyerAv = bSrc
    ? `<div class="order-user-av"><img src="${escHtml(
        bSrc
      )}" alt="" onerror="this.parentNode.textContent='${bInit}'"/></div>`
    : `<div class="order-user-av">${bInit}</div>`;
  const sellerAv = sSrc
    ? `<div class="order-user-av"><img src="${escHtml(
        sSrc
      )}" alt="" onerror="this.parentNode.textContent='${sInit}'"/></div>`
    : `<div class="order-user-av">${sInit}</div>`;
  const pSrc = imgUrl(o.product_image, "product");
  const prodImg = pSrc
    ? `<img class="order-card-img" src="${escHtml(
        pSrc
      )}" alt="" onerror="this.outerHTML='<div class=\\'order-card-img-placeholder\\'>🛍️</div>'">`
    : `<div class="order-card-img-placeholder">🛍️</div>`;
  const isPendingPay = o.payment_status === "verification_pending";
  const isRejected = o.payment_status === "rejected";
  const isConfirmed = o.payment_status === "completed";
  const cardBorder = isPendingPay
    ? ";border-color:rgba(234,179,8,.35)"
    : isRejected
    ? ";border-color:rgba(239,68,68,.3)"
    : isConfirmed
    ? ";border-color:rgba(34,197,94,.3)"
    : "";
  const gstRate = parseFloat(o.gst_rate || 0);
  const delCharge = parseFloat(o.delivery_charge || 0);
  const distKm = o.delivery_distance_km;
  const isPickup = !!o.is_pickup;
  return `
  <div class="order-card" style="animation-delay:${delay}s${cardBorder}">
    <div class="order-card-top">
      ${prodImg}
      <div style="flex:1;min-width:0">
        <div class="order-card-id">#${o.order_id}</div>
        <div class="order-card-product" title="${escHtml(
          o.product_name
        )}">${escHtml(o.product_name)}</div>
        <div class="order-card-qty">Qty: ${o.quantity || 1} ${
    isPickup
      ? '· <span style="color:#7c3aed;font-weight:700">📦 Pickup</span>'
      : ""
  }</div>
      </div>
      <div class="order-card-status">${statusBadge(o.status)}${payStatusBadge(
    o.payment_status
  )}</div>
    </div>
    <div class="order-card-body">
      <div class="order-card-users">
        <div class="order-user-block"><div class="order-user-label">Buyer</div><div class="order-user-row">${buyerAv}<div class="order-user-name" title="${escHtml(
    o.buyer_name || o.buyer_username
  )}">${escHtml(o.buyer_name || o.buyer_username)}</div></div></div>
        <div class="order-user-block"><div class="order-user-label">Seller</div><div class="order-user-row">${sellerAv}<div class="order-user-name" title="${escHtml(
    o.seller_name || o.seller_username
  )}">${escHtml(o.seller_name || o.seller_username)}</div></div></div>
      </div>
      <div class="order-card-meta">
        <div class="order-card-amount">${fmtAmount(o.total_amount)}</div>
        ${payBadge(o.payment_method)}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">
        ${
          gstRate > 0
            ? `<span style="font-size:.6rem;background:rgba(230,10,234,.12);color:#e60aea;padding:2px 7px;border-radius:12px;font-weight:700">GST ${gstRate}%</span>`
            : ""
        }
        ${
          delCharge > 0
            ? `<span style="font-size:.6rem;background:rgba(59,130,246,.1);color:#3b82f6;padding:2px 7px;border-radius:12px;font-weight:700">🚚 ₹${delCharge.toFixed(
                0
              )}</span>`
            : ""
        }
        ${
          distKm
            ? `<span style="font-size:.6rem;background:rgba(16,185,129,.1);color:#10b981;padding:2px 7px;border-radius:12px;font-weight:700"><i class="fas fa-route" style="font-size:.5rem"></i> ${distKm}km</span>`
            : ""
        }
        ${
          isPickup
            ? `<span style="font-size:.6rem;background:rgba(124,58,237,.1);color:#7c3aed;padding:2px 7px;border-radius:12px;font-weight:700">📦 Pickup Order</span>`
            : ""
        }
      </div>
    </div>
    <div class="order-card-footer">
      <div class="order-card-date"><i class="fas fa-clock"></i> ${fmtDate(
        o.order_date
      )}</div>
      <div class="order-card-actions">
        <button class="act-btn${isPendingPay ? " yellow" : ""}" title="${
    isPendingPay ? "⚠️ Verify Payment" : "View Details"
  }" onclick="openDetailModal(${o.order_id})">
          <i class="fas fa-${isPendingPay ? "shield-halved" : "eye"}"></i>
        </button>
        <button class="act-btn green" title="Update Status" onclick="openStatusModal(${
          o.order_id
        },'${o.status}')"><i class="fas fa-arrow-right-arrow-left"></i></button>
        <button class="act-btn danger" title="Issue Refund" onclick="openRefundModal(${
          o.order_id
        },'${fmtAmount(
    o.total_amount
  )}')"><i class="fas fa-rotate-left"></i></button>
      </div>
    </div>
  </div>`;
}

function renderOrderRow(o, idx) {
  const delay = (idx % 20) * 0.025;
  const isPendingPay = o.payment_status === "verification_pending";
  const isRejected = o.payment_status === "rejected";
  const isConfirmed = o.payment_status === "completed";
  const rowBg = isPendingPay
    ? "rgba(234,179,8,.04)"
    : isRejected
    ? "rgba(239,68,68,.03)"
    : isConfirmed
    ? "rgba(34,197,94,.03)"
    : "";
  const gstRate = parseFloat(o.gst_rate || 0);
  const delCharge = parseFloat(o.delivery_charge || 0);
  const distKm = o.delivery_distance_km;
  const isPickup = !!o.is_pickup;
  return `
  <tr style="animation:fadeUp .35s var(--ease) ${delay}s both;${
    rowBg ? "background:" + rowBg : ""
  }">
    <td><span style="font-weight:800;font-size:.82rem;color:var(--primary)">#${
      o.order_id
    }</span></td>
    <td><div class="user-cell">${avatarHtml(
      o.buyer_name,
      o.buyer_avatar
    )}<div><div class="user-name">${escHtml(
    o.buyer_name || o.buyer_username
  )}</div><div class="user-sub">@${escHtml(
    o.buyer_username
  )}</div></div></div></td>
    <td><div class="user-cell">${avatarHtml(
      o.seller_name,
      o.seller_avatar
    )}<div><div class="user-name">${escHtml(
    o.seller_name || o.seller_username
  )}</div><div class="user-sub">@${escHtml(
    o.seller_username
  )}</div></div></div></td>
    <td><div style="font-weight:700;font-size:.83rem;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(
      o.product_name
    )}">${escHtml(
    o.product_name
  )}</div><div style="font-size:.67rem;color:var(--text-secondary);margin-top:2px">Qty: ${
    o.quantity || 1
  }${isPickup ? " · 📦 Pickup" : ""}</div></td>
    <td>
      <div class="amount-cell">${fmtAmount(o.total_amount)}</div>
      ${
        gstRate > 0
          ? `<div style="font-size:.62rem;color:#e60aea;margin-top:2px;font-weight:600">+${gstRate}% GST</div>`
          : ""
      }
      ${
        delCharge > 0
          ? `<div style="font-size:.62rem;color:#3b82f6;margin-top:1px">🚚 ₹${delCharge.toFixed(
              0
            )}</div>`
          : ""
      }
      ${
        distKm
          ? `<div style="font-size:.62rem;color:var(--text-secondary)"><i class="fas fa-route" style="font-size:.5rem"></i> ${distKm}km</div>`
          : ""
      }
    </td>
    <td>${payBadge(
      o.payment_method
    )}<div style="margin-top:3px">${payStatusBadge(o.payment_status)}</div></td>
    <td>${statusBadge(o.status)}</td>
    <td style="font-size:.78rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
      o.order_date
    )}</td>
    <td><div class="act-btns">
      <button class="act-btn${isPendingPay ? " yellow" : ""}" title="${
    isPendingPay ? "⚠️ Verify Payment" : "View Details"
  }" onclick="openDetailModal(${o.order_id})"><i class="fas fa-${
    isPendingPay ? "shield-halved" : "eye"
  }"></i></button>
      <button class="act-btn green" title="Update Status" onclick="openStatusModal(${
        o.order_id
      },'${o.status}')"><i class="fas fa-arrow-right-arrow-left"></i></button>
      <button class="act-btn danger" title="Issue Refund" onclick="openRefundModal(${
        o.order_id
      },'${fmtAmount(
    o.total_amount
  )}')"><i class="fas fa-rotate-left"></i></button>
    </div></td>
  </tr>`;
}

// ── Pagination ──
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
function gotoPage(p) {
  if (p < 1 || p > state.pages || p === state.page) return;
  state.page = p;
  loadOrders();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Detail Modal — FULL DATA ──
async function openDetailModal(orderId) {
  currentDetailOrderId = orderId;
  document.getElementById("detailModalTitle").textContent = `Order #${orderId}`;
  document.getElementById(
    "detailModalBody"
  ).innerHTML = `<div style="text-align:center;padding:40px"><div class="auth-spin-ring" style="margin:0 auto"></div></div>`;
  openModal("detailModal");
  const o = await apiFetch(`/admin/orders/${orderId}`);
  if (!o || o._error) {
    document.getElementById(
      "detailModalBody"
    ).innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${
      o?._error || "Failed to load"
    }</p></div>`;
    return;
  }

  // ── Payment status banner ──
  let paymentStatusHtml = "";
  if (o.payment_status === "verification_pending") {
    const ref = o.payment_reference_buyer || o.payment_reference || null;
    const submittedAt = o.payment_submitted_at
      ? fmtDateTime(o.payment_submitted_at)
      : null;
    paymentStatusHtml = `
    <div class="pay-verify-banner">
      <div class="pay-verify-header">
        <div class="pay-verify-icon"><i class="fas fa-shield-halved"></i></div>
        <div>
          <div class="pay-verify-title">⚠️ Payment Verification Required</div>
          <div class="pay-verify-sub">Buyer has marked this order as paid. Please verify and confirm.</div>
        </div>
      </div>
      <div class="pay-verify-meta">
        ${payBadge(o.payment_method)}
        ${
          ref
            ? `<span class="pay-verify-ref"><i class="fas fa-hashtag" style="font-size:.6rem"></i> ${escHtml(
                ref
              )}</span>`
            : ""
        }
        ${
          submittedAt
            ? `<span class="pay-verify-chip"><i class="fas fa-clock"></i> ${submittedAt}</span>`
            : ""
        }
        <span class="pay-verify-chip">₹${escHtml(o.total_amount)}</span>
      </div>
      <div class="pay-verify-btns">
        <button class="pay-verify-btn-approve" id="btnApprove_${orderId}" onclick="verifyPayment(${orderId},'approve')">
          <i class="fas fa-circle-check"></i> Payment Verified — Confirm & Credit Seller
        </button>
        <button class="pay-verify-btn-reject" id="btnReject_${orderId}" onclick="verifyPayment(${orderId},'reject')">
          <i class="fas fa-circle-xmark"></i> Issue / Reject
        </button>
      </div>
    </div>`;
  } else if (o.payment_status === "completed") {
    paymentStatusHtml = `<div class="pay-status-pill completed"><i class="fas fa-circle-check"></i> Payment Confirmed — Seller has been credited${
      o.payment_verified_at ? " · " + fmtDateTime(o.payment_verified_at) : ""
    }</div>`;
  } else if (o.payment_status === "rejected" || o.payment_status === "failed") {
    paymentStatusHtml = `<div class="pay-status-pill failed"><i class="fas fa-circle-xmark"></i> Payment Rejected${
      o.payment_verified_at ? " · " + fmtDateTime(o.payment_verified_at) : ""
    }</div>`;
  } else if (o.payment_status === "cod_pending") {
    paymentStatusHtml = `<div class="pay-status-pill cod_pending"><i class="fas fa-truck"></i> COD — Cash to be collected on delivery</div>`;
  }

  // ── Numeric fields ──
  const gstRate = parseFloat(o.gst_rate || 0);
  const gstAmt = parseFloat(o.gst_amount || 0);
  const delCharge = parseFloat(o.delivery_charge || 0);
  const distKm = o.delivery_distance_km;
  const taxAmt = parseFloat(o.tax_amount || 0);
  const shippingCost = parseFloat(o.shipping_cost || 0);
  const subtotal = parseFloat(o.subtotal || 0);
  const discount = parseFloat(o.discount_amount || 0);
  const isPickup = !!o.is_pickup;

  // ── Charges summary pill ──
  const chargesPill = `
  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;padding:12px 16px;margin-bottom:14px;">
    <span style="font-size:.72rem;font-weight:700;color:var(--text-secondary);margin-right:4px;"><i class="fas fa-file-invoice" style="color:var(--primary)"></i> Order Charges:</span>
    ${
      isPickup
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(124,58,237,.1);color:#7c3aed;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-store" style="font-size:.6rem"></i> Pickup Order — No Shipping</span>`
        : shippingCost > 0
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-truck" style="font-size:.6rem"></i> Shipping ₹${shippingCost.toFixed(
            2
          )}</span>`
        : ""
    }
    ${
      gstRate > 0
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(230,10,234,.1);color:#e60aea;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-percent" style="font-size:.6rem"></i> GST ${gstRate}% = ${fmtAmount(
            gstAmt
          )}</span>`
        : `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(16,185,129,.1);color:#10b981;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-check" style="font-size:.6rem"></i> GST Exempt (0%)</span>`
    }
    ${
      delCharge > 0
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(59,130,246,.1);color:#3b82f6;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-route" style="font-size:.6rem"></i> Delivery ₹${delCharge.toFixed(
            2
          )}${distKm ? ` (${distKm} km)` : ""}</span>`
        : distKm
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(16,185,129,.1);color:#10b981;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-truck" style="font-size:.6rem"></i> Free Delivery (${distKm} km)</span>`
        : ""
    }
    ${
      discount > 0
        ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(239,68,68,.1);color:#ef4444;font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:20px"><i class="fas fa-tag" style="font-size:.6rem"></i> Discount −${fmtAmount(
            discount
          )}</span>`
        : ""
    }
  </div>`;

  // ── Buyer review ──
  const reviewHtml = o.buyer_rating
    ? `<div class="detail-section">
        <div class="detail-section-title">Buyer Review</div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-item-label">Rating</div><div class="detail-item-val">${"⭐".repeat(
            o.buyer_rating
          )} (${o.buyer_rating}/5)${
        o.review_date ? " · " + fmtDate(o.review_date) : ""
      }</div></div>
          ${
            o.buyer_review
              ? `<div class="detail-item full"><div class="detail-item-label">Review</div><div class="detail-item-val" style="font-style:italic;line-height:1.6">"${escHtml(
                  o.buyer_review
                )}"</div></div>`
              : ""
          }
        </div>
      </div>`
    : "";

  document.getElementById("detailModalBody").innerHTML = `
    ${paymentStatusHtml}
    ${chargesPill}

    <!-- Product -->
    <div class="detail-product-row">
      <img class="detail-product-img" src="${escHtml(
        imgUrl(o.product_image, "product") || ""
      )}" onerror="this.style.background='var(--card-border)';this.style.display='none'" alt="">
      <div>
        <div class="detail-product-name">${escHtml(o.product_name)}</div>
        <div class="detail-product-meta">Qty: ${o.quantity} · ${fmtAmount(
    o.product_price
  )} each${isPickup ? " · 📦 Pickup Order" : ""}</div>
        <div style="margin-top:6px">${statusBadge(o.status)} ${payBadge(
    o.payment_method
  )}</div>
      </div>
    </div>

    <!-- Order Summary -->
    <div class="detail-section">
      <div class="detail-section-title">Order Summary</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Order ID</div><div class="detail-item-val" style="color:var(--primary)">#${
          o.order_id
        }</div></div>
        <div class="detail-item"><div class="detail-item-label">Order Date</div><div class="detail-item-val">${fmtDateTime(
          o.order_date
        )}</div></div>
        <div class="detail-item"><div class="detail-item-label">Subtotal</div><div class="detail-item-val">${fmtAmount(
          subtotal
        )}</div></div>
        <div class="detail-item"><div class="detail-item-label">Shipping Cost</div><div class="detail-item-val" style="${
          shippingCost > 0 ? "color:#3b82f6" : "color:var(--text-secondary)"
        }">${
    shippingCost > 0 ? fmtAmount(shippingCost) : "Free / Pickup"
  }</div></div>
        <div class="detail-item">
          <div class="detail-item-label">GST ${
            gstRate > 0
              ? `<span style="font-size:.65rem;background:rgba(230,10,234,.12);color:#e60aea;padding:1px 6px;border-radius:10px;margin-left:4px">${gstRate}%</span>`
              : ""
          }</div>
          <div class="detail-item-val" style="${
            gstRate > 0 ? "color:#e60aea" : "color:var(--text-secondary)"
          }">${gstRate > 0 ? fmtAmount(gstAmt) : "₹0.00 (Exempt)"}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Delivery Charge${
            distKm
              ? ` <span style="font-size:.65rem;color:var(--text-secondary);margin-left:4px">${distKm} km</span>`
              : ""
          }</div>
          <div class="detail-item-val" style="${
            delCharge > 0 ? "color:#3b82f6" : "color:#10b981"
          }">${delCharge > 0 ? fmtAmount(delCharge) : "FREE"}</div>
        </div>
        <div class="detail-item"><div class="detail-item-label">Tax</div><div class="detail-item-val">${
          taxAmt > 0 ? fmtAmount(taxAmt) : "—"
        }</div></div>
        <div class="detail-item"><div class="detail-item-label">Discount</div><div class="detail-item-val" style="${
          discount > 0 ? "color:#ef4444" : "color:var(--text-secondary)"
        }">${discount > 0 ? "−" + fmtAmount(discount) : "—"}</div></div>
        <div class="detail-item full">
          <div class="detail-item-label">Total Amount</div>
          <div class="detail-item-val" style="font-size:1.1rem;color:var(--green);font-weight:700">${fmtAmount(
            o.total_amount
          )}</div>
        </div>
        ${
          isPickup
            ? `<div class="detail-item full">
          <div class="detail-item-label">Fulfillment Type</div>
          <div class="detail-item-val" style="color:#7c3aed;font-weight:700"><i class="fas fa-store"></i> Pickup Order ${
            o.pickup_confirmed_at
              ? "· Confirmed " + fmtDateTime(o.pickup_confirmed_at)
              : ""
          }</div>
        </div>`
            : ""
        }
        ${
          o.buyer_pincode_delivery
            ? `<div class="detail-item"><div class="detail-item-label">Buyer Delivery Pincode</div><div class="detail-item-val" style="font-family:monospace">${escHtml(
                o.buyer_pincode_delivery
              )}</div></div>`
            : ""
        }
        ${
          o.estimated_delivery_date
            ? `<div class="detail-item"><div class="detail-item-label">Est. Delivery Date</div><div class="detail-item-val">${fmtDate(
                o.estimated_delivery_date
              )}</div></div>`
            : ""
        }
        ${
          o.actual_delivery_date
            ? `<div class="detail-item"><div class="detail-item-label">Actual Delivery Date</div><div class="detail-item-val" style="color:#22c55e">${fmtDate(
                o.actual_delivery_date
              )}</div></div>`
            : ""
        }
      </div>
    </div>

    <!-- Buyer & Seller -->
    <div class="detail-section">
      <div class="detail-section-title">Buyer &amp; Seller</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-item-label">Buyer</div>
          <div class="detail-item-val">${escHtml(o.buyer_name)}</div>
          <div style="font-size:.72rem;color:var(--text-secondary)">@${escHtml(
            o.buyer_username
          )} · ${escHtml(o.buyer_email)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Seller</div>
          <div class="detail-item-val">${escHtml(o.seller_name)}</div>
          <div style="font-size:.72rem;color:var(--text-secondary)">@${escHtml(
            o.seller_username
          )} · ${escHtml(o.seller_email)}</div>
        </div>
      </div>
    </div>

    <!-- Shipping Address -->
    <div class="detail-section">
      <div class="detail-section-title">${
        isPickup ? "Pickup Details" : "Shipping Address"
      }</div>
      <div class="detail-grid">
        ${
          isPickup
            ? `<div class="detail-item full"><div class="detail-item-label">Fulfillment</div><div class="detail-item-val" style="color:#7c3aed"><i class="fas fa-store"></i> Buyer will collect from seller's location</div></div>
             ${
               o.pickup_confirmed_at
                 ? `<div class="detail-item"><div class="detail-item-label">Pickup Confirmed At</div><div class="detail-item-val">${fmtDateTime(
                     o.pickup_confirmed_at
                   )}</div></div>`
                 : ""
             }`
            : `<div class="detail-item"><div class="detail-item-label">Name</div><div class="detail-item-val">${escHtml(
                o.shipping_full_name
              )}</div></div>
             <div class="detail-item"><div class="detail-item-label">Phone</div><div class="detail-item-val">${escHtml(
               o.shipping_phone
             )}</div></div>
             <div class="detail-item full"><div class="detail-item-label">Address</div><div class="detail-item-val">${escHtml(
               o.shipping_address_line1
             )}${
                o.shipping_address_line2
                  ? ", " + escHtml(o.shipping_address_line2)
                  : ""
              }, ${escHtml(o.shipping_city)}, ${escHtml(
                o.shipping_state
              )} - ${escHtml(o.shipping_pincode)}, ${escHtml(
                o.shipping_country
              )}</div></div>
             ${
               o.shipping_landmark
                 ? `<div class="detail-item full"><div class="detail-item-label">Landmark</div><div class="detail-item-val">${escHtml(
                     o.shipping_landmark
                   )}</div></div>`
                 : ""
             }
             ${
               o.buyer_pincode_delivery
                 ? `<div class="detail-item"><div class="detail-item-label">Delivery Pincode</div><div class="detail-item-val" style="font-family:monospace">${escHtml(
                     o.buyer_pincode_delivery
                   )}</div></div>`
                 : ""
             }`
        }
      </div>
    </div>

    <!-- Payment & Timeline -->
    <div class="detail-section">
      <div class="detail-section-title">Payment &amp; Timeline</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Payment Status</div><div class="detail-item-val">${
          payStatusBadge(o.payment_status) || escHtml(o.payment_status)
        }</div></div>
        <div class="detail-item"><div class="detail-item-label">Payment Method</div><div class="detail-item-val">${payBadge(
          o.payment_method
        )}</div></div>
        ${
          o.payment_reference || o.payment_reference_buyer
            ? `<div class="detail-item full"><div class="detail-item-label">Payment Reference</div><div class="detail-item-val" style="font-family:monospace;font-size:.75rem">${escHtml(
                o.payment_reference_buyer || o.payment_reference
              )}</div></div>`
            : ""
        }
        ${
          o.payment_date
            ? `<div class="detail-item"><div class="detail-item-label">Payment Date</div><div class="detail-item-val">${fmtDateTime(
                o.payment_date
              )}</div></div>`
            : ""
        }
        ${
          o.payment_verified_at
            ? `<div class="detail-item"><div class="detail-item-label">Verified At</div><div class="detail-item-val">${fmtDateTime(
                o.payment_verified_at
              )}</div></div>`
            : ""
        }
        ${
          o.tracking_number
            ? `<div class="detail-item"><div class="detail-item-label">Tracking No.</div><div class="detail-item-val" style="font-family:monospace">${escHtml(
                o.tracking_number
              )}</div></div>`
            : ""
        }
        ${
          o.shipping_carrier
            ? `<div class="detail-item"><div class="detail-item-label">Carrier</div><div class="detail-item-val">${escHtml(
                o.shipping_carrier
              )}</div></div>`
            : ""
        }
        ${
          o.confirmed_at
            ? `<div class="detail-item"><div class="detail-item-label">Confirmed</div><div class="detail-item-val">${fmtDateTime(
                o.confirmed_at
              )}</div></div>`
            : ""
        }
        ${
          o.processing_at
            ? `<div class="detail-item"><div class="detail-item-label">Processing</div><div class="detail-item-val">${fmtDateTime(
                o.processing_at
              )}</div></div>`
            : ""
        }
        ${
          o.shipped_at
            ? `<div class="detail-item"><div class="detail-item-label">Shipped</div><div class="detail-item-val">${fmtDateTime(
                o.shipped_at
              )}</div></div>`
            : ""
        }
        ${
          o.delivered_at
            ? `<div class="detail-item"><div class="detail-item-label">Delivered</div><div class="detail-item-val" style="color:#22c55e">${fmtDateTime(
                o.delivered_at
              )}</div></div>`
            : ""
        }
        ${
          o.cancelled_at
            ? `<div class="detail-item"><div class="detail-item-label">Cancelled</div><div class="detail-item-val" style="color:#ef4444">${fmtDateTime(
                o.cancelled_at
              )}</div></div>`
            : ""
        }
        ${
          o.cancellation_reason
            ? `<div class="detail-item full"><div class="detail-item-label">Cancellation Reason</div><div class="detail-item-val" style="color:var(--red)">${escHtml(
                o.cancellation_reason
              )}</div></div>`
            : ""
        }
        ${
          o.seller_message
            ? `<div class="detail-item full"><div class="detail-item-label">Seller Message</div><div class="detail-item-val" style="color:var(--primary)">${escHtml(
                o.seller_message
              )}</div></div>`
            : ""
        }
      </div>
    </div>

    ${
      o.buyer_notes
        ? `<div class="detail-section"><div class="detail-section-title">Buyer Notes</div><div style="font-size:.83rem;color:var(--text-secondary);padding:10px;background:var(--main-bg);border-radius:10px">${escHtml(
            o.buyer_notes
          )}</div></div>`
        : ""
    }
    ${
      o.payment_admin_note
        ? `<div class="detail-section"><div class="detail-section-title">Admin Note</div><div style="font-size:.83rem;color:var(--orange);padding:10px;background:rgba(249,115,22,.08);border-radius:10px;border:1px solid rgba(249,115,22,.2)">${escHtml(
            o.payment_admin_note
          )}</div></div>`
        : ""
    }
    ${reviewHtml}
  `;
}

// ── verifyPayment ──
async function verifyPayment(orderId, action) {
  const approveBtn = document.getElementById(`btnApprove_${orderId}`);
  const rejectBtn = document.getElementById(`btnReject_${orderId}`);
  if (approveBtn) {
    approveBtn.disabled = true;
    approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';
  }
  if (rejectBtn) rejectBtn.disabled = true;
  const r = await paymentFetch(`/payments/orders/${orderId}/verify`, {
    method: "PUT",
    body: JSON.stringify({
      action,
      note:
        action === "approve"
          ? "Payment verified by admin"
          : "Payment rejected by admin — please contact support",
    }),
  });
  if (r?.success) {
    if (action === "approve") {
      const c = r.commission || {};
      showToast(
        `✅ Payment approved! Seller credited ₹${
          c.net_credit?.toFixed(2) || "—"
        } (${c.commission_pct || 5}% commission deducted)`,
        "success"
      );
    } else {
      showToast("❌ Payment rejected. Buyer has been notified.", "warn");
    }
    closeModal("detailModal");
    loadStats();
    loadOrders();
  } else {
    if (approveBtn) {
      approveBtn.disabled = false;
      approveBtn.innerHTML =
        '<i class="fas fa-circle-check"></i> Payment Verified — Confirm & Credit Seller';
    }
    if (rejectBtn) rejectBtn.disabled = false;
    showToast(r?._error || "Failed to process payment verification", "error");
  }
}

function openFromDetail() {
  if (!currentDetailOrderId) return;
  closeModal("detailModal");
  apiFetch(`/admin/orders/${currentDetailOrderId}`).then((o) => {
    if (o && !o._error) openStatusModal(o.order_id, o.status);
  });
}

// ── Status Modal ──
function openStatusModal(orderId, currentStatus = "pending") {
  document.getElementById("sm-order-id").value = orderId;
  document.getElementById("sm-status").value = currentStatus;
  document.getElementById("sm-tracking").value = "";
  document.getElementById("sm-carrier").value = "";
  document.getElementById("sm-cancel-reason").value = "";
  document.getElementById("sm-message").value = "";
  document.getElementById("sm-cancel-wrap").style.display =
    currentStatus === "cancelled" ? "flex" : "none";
  openModal("statusModal");
}
async function submitStatusModal() {
  const orderId = document.getElementById("sm-order-id").value;
  const payload = {
    status: document.getElementById("sm-status").value,
    tracking_number:
      document.getElementById("sm-tracking").value.trim() || null,
    shipping_carrier:
      document.getElementById("sm-carrier").value.trim() || null,
    cancellation_reason:
      document.getElementById("sm-cancel-reason").value.trim() || null,
    seller_message: document.getElementById("sm-message").value.trim() || null,
  };
  if (!payload.status) {
    showToast("Please select a status", "warn");
    return;
  }
  const btn = document.getElementById("smSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const r = await apiFetch(`/admin/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Update Status';
  if (r?.success) {
    showToast(r.message || "Status updated!", "success");
    closeModal("statusModal");
    loadStats();
    loadOrders();
  } else showToast(r?._error || r?.error || "Failed to update", "error");
}

// ── Refund Modal ──
function openRefundModal(orderId, amountLabel) {
  document.getElementById("rm-order-id").value = orderId;
  document.getElementById("rm-order-label").textContent = orderId;
  document.getElementById("rm-amount-label").textContent = amountLabel;
  document.getElementById("rm-note").value = "";
  openModal("refundModal");
}
async function submitRefundModal() {
  const orderId = document.getElementById("rm-order-id").value;
  const payload = {
    note:
      document.getElementById("rm-note").value.trim() || "Admin issued refund",
  };
  const btn = document.getElementById("rmSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';
  const r = await apiFetch(`/admin/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-rotate-left"></i> Issue Refund';
  if (r?.success) {
    showToast(`Refund issued for Order #${orderId}`, "success");
    closeModal("refundModal");
    loadStats();
    loadOrders();
  } else showToast(r?._error || r?.error || "Failed to issue refund", "error");
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
  const wrap = document.getElementById("toastWrap");
  const id = "toast_" + Date.now();
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
  }, 5000);
}
