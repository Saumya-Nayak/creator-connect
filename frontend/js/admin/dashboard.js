const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

// ── Notifications State ──
let notifications = [];
let notifUnread = 0;
let notifModalOpen = false;

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
      ["adminAuthToken", "adminData"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      location.href = "login.html";
      return;
    }
  } catch (err) {}
  authGate.classList.add("hide");
  setTimeout(() => authGate.remove(), 450);
  initPage();
})();

// ── Sidebar ──
window.addEventListener("message", (e) => {
  if (e.data?.type === "sb-collapse") {
    sidebarFrame.classList.toggle("collapsed", e.data.collapsed);
    mainContent.classList.toggle("sb-collapsed", e.data.collapsed);
    setTimeout(redrawCharts, 360);
  }
  if (e.data?.type === "sb-theme") {
    document.documentElement.setAttribute(
      "data-theme",
      e.data.dark ? "dark" : "light"
    );
    setTimeout(redrawCharts, 100);
  }
  if (e.data?.type === "sb-logout-request") openLogoutModal();
});
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
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function get(path) {
  try {
    const r = await fetch(API + path, { headers: authHeaders() });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
function initNotifications() {
  document
    .getElementById("notifBellBtn")
    .addEventListener("click", toggleNotifModal);
  document
    .getElementById("notifModal")
    .addEventListener("click", handleNotifBackdropClick);
  const markAllBtn = document.getElementById("markAllReadBtn");
  if (markAllBtn) markAllBtn.addEventListener("click", markAllRead);

  loadNotifications();
  setInterval(loadNotifications, 60_000); // refresh every 60 s
}
// ── NOTIFICATIONS ──────────────────────────────────────────────────────
async function loadNotifications() {
  const [wdRes, dashRes, payRes] = await Promise.allSettled([
    apiGet("/admin/payouts/withdrawals?status=pending&limit=20&page=1"),
    apiGet("/admin/dashboard/stats"),
    apiGet("/admin/orders?payment_status=verification_pending&limit=20&page=1"),
  ]);

  notifications = [];

  // 1. Pending withdrawal requests  → link: financial.html
  if (wdRes.status === "fulfilled" && wdRes.value?.withdrawals?.length) {
    wdRes.value.withdrawals.forEach((w) => {
      notifications.push({
        type: "withdrawal",
        title: "Withdrawal Request Pending",
        sub: `${w.seller_name || w.seller_username} requested ₹${fmtAmt(
          w.amount
        )}`,
        time: fmtDate(w.request_date),
        unread: true,
        id: "wd_" + w.request_id,
        href: "financial.html",
      });
    });
  }

  // 2. Orders awaiting payment verification  → link: admin-orders.html
  if (payRes.status === "fulfilled" && payRes.value?.orders?.length) {
    payRes.value.orders.forEach((o) => {
      notifications.push({
        type: "payment",
        title: "Payment Awaiting Verification",
        sub:
          `${o.buyer_name || o.buyer_username} submitted payment for ` +
          `Order #${o.order_id} — ₹${fmtAmt(o.total_amount)}`,
        time: fmtDate(o.payment_submitted_at || o.updated_at),
        unread: true,
        id: "pay_" + o.order_id,
        href: "admin-orders.html?payment_status=verification_pending",
      });
    });
  }

  // 3. Open support tickets  → link: support.html
  const dash = dashRes.status === "fulfilled" ? dashRes.value : null;
  if (dash?.open_tickets > 0) {
    notifications.push({
      type: "ticket",
      title: `${dash.open_tickets} Open Support Ticket${
        dash.open_tickets > 1 ? "s" : ""
      }`,
      sub: "Require admin attention",
      time: "Now",
      unread: true,
      id: "tickets_open",
      href: "support.html",
    });
  }

  // 4. New users delta  → link: users.html
  if (dash?.total_users) {
    const prev = parseInt(localStorage.getItem("prevTotalUsers") || "0", 10);
    const diff = dash.total_users - prev;
    if (prev > 0 && diff > 0) {
      notifications.push({
        type: "user",
        title: `${diff} New User${diff > 1 ? "s" : ""} Registered`,
        sub: `Total users: ${dash.total_users}`,
        time: "Since last visit",
        unread: true,
        id: "new_users_" + dash.total_users,
        href: "users.html",
      });
    }
    localStorage.setItem("prevTotalUsers", dash.total_users);
  }

  // Restore previously-read IDs from localStorage
  const readIds = JSON.parse(localStorage.getItem("adminNotifRead") || "[]");
  notifications.forEach((n) => {
    if (readIds.includes(n.id)) n.unread = false;
  });

  notifUnread = notifications.filter((n) => n.unread).length;
  updateBell();
  renderNotifList();
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtAmt(v) {
  return parseFloat(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
async function apiGet(path) {
  const API =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? `http://${location.hostname}:3000/api`
      : `http://${location.hostname}:3000/api`;
  const token =
    localStorage.getItem("adminAuthToken") ||
    sessionStorage.getItem("adminAuthToken") ||
    "";
  try {
    const r = await fetch(API + path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
function updateBell() {
  const badge = document.getElementById("notifBadge");
  if (notifUnread > 0) {
    badge.style.display = "flex";
    badge.textContent = notifUnread > 9 ? "9+" : notifUnread;
  } else {
    badge.style.display = "none";
  }
}

const NOTIF_ICONS = {
  withdrawal: "fa-money-bill-transfer",
  payment: "fa-credit-card",
  ticket: "fa-ticket",
  user: "fa-user-plus",
};

function renderNotifList() {
  const list = document.getElementById("notifList");
  if (!notifications.length) {
    list.innerHTML = `<div class="notif-empty">
<i class="fas fa-bell-slash"></i><p>No notifications right now</p>
</div>`;
    return;
  }

  list.innerHTML = notifications
    .map(
      (n) => `
<div class="notif-item ${n.unread ? "unread" : ""}"
 id="ni-${n.id}"
 style="cursor:${n.href ? "pointer" : "default"}"
 onclick="handleNotifClick('${n.id}','${n.href || ""}')">
<div class="notif-item-icon ${n.type}">
<i class="fas ${NOTIF_ICONS[n.type] || "fa-bell"}"></i>
</div>
<div class="notif-item-body">
<div class="notif-item-title">${n.title}</div>
<div class="notif-item-sub">${n.sub}</div>
<div class="notif-item-time">${n.time}</div>
</div>
${n.unread ? '<div class="notif-dot"></div>' : ""}
</div>`
    )
    .join("");
}

function handleNotifClick(notifId, href) {
  // Mark as read
  const notif = notifications.find((n) => n.id === notifId);
  if (notif?.unread) {
    notif.unread = false;
    const readIds = JSON.parse(localStorage.getItem("adminNotifRead") || "[]");
    if (!readIds.includes(notifId)) readIds.push(notifId);
    localStorage.setItem("adminNotifRead", JSON.stringify(readIds));
    notifUnread = notifications.filter((n) => n.unread).length;
    updateBell();

    const el = document.getElementById("ni-" + notifId);
    if (el) {
      el.classList.remove("unread");
      el.querySelector(".notif-dot")?.remove();
    }
  }

  // Navigate
  if (href) {
    notifModalOpen = false;
    document.getElementById("notifModal").classList.remove("show");
    location.href = href;
  }
}

function markAllRead() {
  const readIds = JSON.parse(localStorage.getItem("adminNotifRead") || "[]");
  notifications.forEach((n) => {
    n.unread = false;
    if (!readIds.includes(n.id)) readIds.push(n.id);
  });
  localStorage.setItem("adminNotifRead", JSON.stringify(readIds));
  notifUnread = 0;
  updateBell();
  renderNotifList();
}
function toggleNotifModal() {
  notifModalOpen = !notifModalOpen;
  document
    .getElementById("notifModal")
    .classList.toggle("show", notifModalOpen);
}

function handleNotifBackdropClick(e) {
  if (e.target === document.getElementById("notifModal")) {
    notifModalOpen = false;
    document.getElementById("notifModal").classList.remove("show");
  }
}

// Close notif modal on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (notifModalOpen) {
      notifModalOpen = false;
      document.getElementById("notifModal").classList.remove("show");
    }
    closeLogoutModal();
  }
});

// ── Init ──
function initPage() {
  const hr = new Date().getHours();
  document.getElementById("greetTime").textContent =
    hr < 12 ? "morning" : hr < 17 ? "afternoon" : "evening";
  document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  try {
    const raw =
      localStorage.getItem("adminData") || sessionStorage.getItem("adminData");
    if (raw) {
      const a = JSON.parse(raw);
      document.getElementById("hAdminName").textContent = (
        a.full_name ||
        a.username ||
        "Admin"
      ).split(" ")[0];
    }
  } catch (e) {}

  loadAll();
  loadNotifications();
  // Refresh notifications every 60s
  setInterval(loadNotifications, 60000);
}

// ── Counter animation ──
function countUp(el, to, decimals = 0) {
  const dur = 1100,
    start = performance.now();
  const fmt = (v) => (decimals ? v.toFixed(decimals) : Math.round(v));
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1),
      ease = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(to * ease);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(to);
  })(start);
}

// ── Chart helpers ──
const isDark = () =>
  document.documentElement.getAttribute("data-theme") === "dark";
const gc = () => (isDark() ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)");
const tc = () => (isDark() ? "#c4aedd" : "#6b5880");
const bgc = () => (isDark() ? "#130d1a" : "#fff");
Chart.defaults.font.family = "'Plus Jakarta Sans',sans-serif";
const charts = {};
const destroy = (id) => {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
};

function lineChart(id, labels, datasets) {
  destroy(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: bgc(),
          borderColor: "rgba(230,10,234,.2)",
          borderWidth: 1,
          titleColor: tc(),
          bodyColor: tc(),
          padding: 10,
          cornerRadius: 10,
        },
      },
      scales: {
        x: {
          grid: { color: gc() },
          ticks: { color: tc(), font: { size: 11 } },
        },
        y: {
          grid: { color: gc() },
          ticks: {
            color: tc(),
            font: { size: 11 },
            callback: (v) => "₹" + v,
          },
        },
      },
    },
  });
}
function donutChart(id, labels, data, colors) {
  destroy(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: bgc(),
          borderWidth: 3,
          hoverOffset: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: tc(),
            font: { weight: "600", size: 11 },
            boxWidth: 10,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: bgc(),
          borderColor: "rgba(230,10,234,.2)",
          borderWidth: 1,
          titleColor: tc(),
          bodyColor: tc(),
          padding: 10,
          cornerRadius: 10,
        },
      },
    },
  });
}
function barChart(id, labels, data, color = "rgba(59,130,246,.75)") {
  destroy(id);
  charts[id] = new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: color,
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
          backgroundColor: bgc(),
          borderColor: "rgba(230,10,234,.2)",
          borderWidth: 1,
          titleColor: tc(),
          bodyColor: tc(),
          padding: 10,
          cornerRadius: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tc(), font: { size: 11 } },
        },
        y: {
          grid: { color: gc() },
          ticks: { color: tc(), font: { size: 11 } },
        },
      },
    },
  });
}
function hBarChart(id, labels, data) {
  destroy(id);
  const grad = document
    .getElementById(id)
    .getContext("2d")
    .createLinearGradient(400, 0, 0, 0);
  grad.addColorStop(0, "rgba(230,10,234,.85)");
  grad.addColorStop(1, "rgba(227,54,204,.3)");
  charts[id] = new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: grad,
          borderRadius: 7,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: bgc(),
          borderColor: "rgba(230,10,234,.2)",
          borderWidth: 1,
          titleColor: tc(),
          bodyColor: tc(),
          padding: 10,
          cornerRadius: 10,
          callbacks: { label: (ctx) => " ₹" + ctx.parsed.x.toFixed(2) },
        },
      },
      scales: {
        x: {
          grid: { color: gc() },
          ticks: {
            color: tc(),
            font: { size: 11 },
            callback: (v) => "₹" + v,
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: tc(), font: { size: 11, weight: "600" } },
        },
      },
    },
  });
}
function redrawCharts() {
  Object.values(charts).forEach((c) => {
    if (c.options.scales?.x) {
      c.options.scales.x.grid.color = gc();
      c.options.scales.x.ticks.color = tc();
    }
    if (c.options.scales?.y) {
      c.options.scales.y.grid.color = gc();
      c.options.scales.y.ticks.color = tc();
    }
    if (c.options.plugins?.legend?.labels)
      c.options.plugins.legend.labels.color = tc();
    c.update();
  });
}

// ── Fallback data ──
const FB = {
  stats: {
    total_users: 6,
    total_posts: 24,
    total_orders: 35,
    total_bookings: 8,
    platform_revenue: 48.76,
    open_tickets: 2,
    pending_orders: 5,
    pending_bookings: 3,
  },
  revenue: {
    labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"],
    values: [0, 0, 0, 0, 21.1, 27.66],
  },
  post_types: { showcase: 12, service: 8, product: 4 },
  order_status: {
    pending: 5,
    confirmed: 8,
    shipped: 7,
    delivered: 10,
    cancelled: 5,
  },
  users_monthly: {
    labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"],
    values: [0, 0, 0, 3, 1, 2],
  },
  sellers: {
    labels: ["Saumya", "saumyan26", "Binita"],
    values: [3540.55, 475, 146],
  },
  recent_orders: [
    {
      order_id: 35,
      buyer: "Saumya",
      product_name: "Art Print",
      total_amount: 133,
      payment_method: "cod",
      status: "pending",
    },
    {
      order_id: 34,
      buyer: "Binita",
      product_name: "Sketch Set",
      total_amount: 500,
      payment_method: "upi",
      status: "confirmed",
    },
    {
      order_id: 33,
      buyer: "Saumya",
      product_name: "Canvas",
      total_amount: 56,
      payment_method: "upi",
      status: "delivered",
    },
  ],
  activity: [
    {
      type: "login",
      text: "Admin logged in from 127.0.0.1",
      time: "2h ago",
    },
    {
      type: "payout",
      text: "Withdrawal request ₹220 processed",
      time: "4h ago",
    },
    {
      type: "order",
      text: "New order #35 (COD ₹133) placed",
      time: "6h ago",
    },
    {
      type: "ticket",
      text: "Support ticket #2 opened by Saumya",
      time: "1d ago",
    },
  ],
};

// ── Load all ──
async function loadAll() {
  const [stats, rev, pt, os, um, sel, orders, act] = await Promise.all([
    get("/admin/dashboard/stats"),
    get("/admin/dashboard/revenue"),
    get("/admin/dashboard/post-types"),
    get("/admin/dashboard/order-status"),
    get("/admin/dashboard/users-monthly"),
    get("/admin/dashboard/seller-balances"),
    get("/admin/dashboard/recent-orders"),
    get("/admin/dashboard/activity"),
  ]);

  const s = stats || FB.stats;
  countUp(document.getElementById("sv-users"), s.total_users);
  countUp(document.getElementById("sv-posts"), s.total_posts);
  countUp(document.getElementById("sv-orders"), s.total_orders);
  countUp(document.getElementById("sv-bookings"), s.total_bookings);
  countUp(document.getElementById("sv-revenue"), s.platform_revenue, 2);
  countUp(document.getElementById("sv-tickets"), s.open_tickets);
  document.getElementById(
    "sb-orders-pend"
  ).innerHTML = `<i class="fas fa-clock"></i> ${s.pending_orders} Pending`;
  document.getElementById(
    "sb-book-pend"
  ).innerHTML = `<i class="fas fa-clock"></i> ${s.pending_bookings} Pending`;

  const r = rev || FB.revenue;
  const ctx = document.getElementById("chartRevenue").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 250);
  grad.addColorStop(0, "rgba(230,10,234,.35)");
  grad.addColorStop(1, "rgba(230,10,234,.02)");
  lineChart("chartRevenue", r.labels, [
    {
      label: "Revenue (₹)",
      data: r.values,
      borderColor: "#e60aea",
      backgroundColor: grad,
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: "#e60aea",
      pointRadius: 4,
      pointHoverRadius: 7,
    },
  ]);

  const p = pt || FB.post_types;
  donutChart(
    "chartPostTypes",
    ["Showcase", "Service", "Product"],
    [p.showcase, p.service, p.product],
    ["#e60aea", "#3b82f6", "#f97316"]
  );

  const o = os || FB.order_status;
  donutChart(
    "chartOrderStatus",
    ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
    [o.pending, o.confirmed, o.shipped, o.delivered, o.cancelled],
    ["#eab308", "#e60aea", "#3b82f6", "#22c55e", "#ef4444"]
  );

  const u = um || FB.users_monthly;
  barChart("chartUsers", u.labels, u.values, "rgba(59,130,246,.75)");

  const sl = sel || FB.sellers;
  hBarChart("chartSellers", sl.labels, sl.values);

  const ord = orders || FB.recent_orders;
  const pmLabels = {
    upi: "UPI",
    bank_transfer: "Bank",
    cod: "COD",
    razorpay: "Razorpay",
    paytm: "Paytm",
  };
  document.getElementById("ordersBody").innerHTML = ord
    .map(
      (o) => `
  <tr>
    <td><span style="font-weight:800;color:var(--primary)">#${
      o.order_id
    }</span></td>
    <td><div class="av-cell"><div class="mini-av">${(o.buyer ||
      "?")[0].toUpperCase()}</div>${o.buyer}</div></td>
    <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis">${
      o.product_name
    }</td>
    <td><strong>₹${Number(o.total_amount).toFixed(2)}</strong></td>
    <td><span style="font-size:.7rem;color:var(--text-secondary)">${
      pmLabels[o.payment_method] || o.payment_method || "—"
    }</span></td>
    <td><span class="pill ${o.status}">${o.status.replace(
        /_/g,
        " "
      )}</span></td>
  </tr>`
    )
    .join("");

  const ac = act || FB.activity;
  const icons = {
    login: "fa-right-to-bracket",
    order: "fa-bag-shopping",
    payout: "fa-indian-rupee-sign",
    ticket: "fa-headset",
    post: "fa-photo-film",
  };
  document.getElementById("activityFeed").innerHTML = ac
    .map(
      (a) => `
  <div class="feed-item">
    <div class="feed-dot fd-${a.type}"><i class="fas ${
        icons[a.type] || "fa-circle-dot"
      }"></i></div>
    <div><div class="feed-text">${a.text}</div><div class="feed-time">${
        a.time
      }</div></div>
  </div>`
    )
    .join("");
}
