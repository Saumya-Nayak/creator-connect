const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

let lineChartInst = null,
  donutChartInst = null;

let wdState = {
  page: 1,
  limit: 20,
  search: "",
  status: "",
  sort: "request_date",
  dir: "desc",
  total: 0,
  pages: 1,
};
let ledgerState = {
  page: 1,
  limit: 25,
  search: "",
  event_type: "",
  sort: "created_at",
  dir: "desc",
  total: 0,
  pages: 1,
};
let logsState = {
  page: 1,
  limit: 20,
  search: "",
  action_type: "",
  total: 0,
  pages: 1,
};

let configDirty = false;

// Store current withdrawal data for pay-method toggle
let _currentWdData = null;

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
        page: "financial",
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
    const r = await fetch(API + path, {
      headers: authHeaders(),
      ...opts,
    });
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
function fmtAmt(v) {
  if (v === null || v === undefined) return "—";
  return `₹${parseFloat(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}
function imgUrl(path) {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  )
    return path;
  return `${API}/get-profile-pic/${path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .pop()}`;
}
function avatarHtml(name, url, size = 32) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const src = imgUrl(url);
  if (src)
    return `<div class="user-avatar" style="width:${size}px;height:${size}px"><img src="${escHtml(
      src
    )}" onerror="this.style.display='none';this.parentNode.textContent='${initials}'" alt="" /></div>`;
  return `<div class="user-avatar" style="width:${size}px;height:${size}px">${initials}</div>`;
}
function statusBadge(s) {
  const icons = {
    pending: "⏳",
    approved: "✅",
    completed: "🔵",
    rejected: "❌",
  };
  return `<span class="status-badge ${escHtml(s)}">${icons[s] || ""} ${escHtml(
    s
  )}</span>`;
}
function eventBadge(e) {
  const map = {
    online_commission: { icon: "💜", label: "Online Comm." },
    cod_commission: { icon: "💛", label: "COD Comm." },
    cod_deficit: { icon: "🔴", label: "COD Deficit" },
    deficit_recovery: { icon: "🟢", label: "Recovery" },
    withdrawal: { icon: "🔵", label: "Withdrawal" },
    refund_reversal: { icon: "🟣", label: "Refund Reversal" },
  };
  const m = map[e] || { icon: "•", label: e };
  return `<span class="event-badge ${escHtml(e)}">${m.icon} ${m.label}</span>`;
}
function renderPayOptions(opts) {
  if (!opts)
    return '<span style="color:var(--text-secondary);font-size:.75rem">No payment setup</span>';
  let html = "";
  if (opts.accepts_upi && opts.upi_id) {
    html += `<div class="pay-info-box"><div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--primary);margin-bottom:5px">📱 UPI</div>
    <div class="mini-info-row"><span class="mini-info-key">UPI ID</span><span class="mini-info-val">${escHtml(
      opts.upi_id
    )}</span></div>
    <div class="mini-info-row"><span class="mini-info-key">Name</span><span class="mini-info-val">${escHtml(
      opts.upi_name || "—"
    )}</span></div></div>`;
  }
  if (opts.accepts_bank_transfer && opts.bank_account_number) {
    html += `<div class="pay-info-box" style="margin-top:6px"><div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--blue);margin-bottom:5px">🏦 Bank</div>
    <div class="mini-info-row"><span class="mini-info-key">Bank</span><span class="mini-info-val">${escHtml(
      opts.bank_name || "—"
    )}</span></div>
    <div class="mini-info-row"><span class="mini-info-key">Holder</span><span class="mini-info-val">${escHtml(
      opts.bank_holder_name || "—"
    )}</span></div>
    <div class="mini-info-row"><span class="mini-info-key">Account</span><span class="mini-info-val">${escHtml(
      opts.bank_account_number
    )}</span></div>
    <div class="mini-info-row"><span class="mini-info-key">IFSC</span><span class="mini-info-val">${escHtml(
      opts.bank_ifsc_code || "—"
    )}</span></div></div>`;
  }
  if (!html)
    return '<span style="color:var(--text-secondary);font-size:.75rem">No payment methods set up</span>';
  return html;
}

// ── Init ──
function initPage() {
  setWdView(localStorage.getItem("payoutsWdView") || "grid", false);
  setLedgerView(localStorage.getItem("payoutsLedgerView") || "grid", false);
  setLogsView(localStorage.getItem("payoutsLogsView") || "grid", false);
  loadStats();
  setupWdFilters();
  loadWithdrawals();
  ["approveModal", "rejectModal"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => {
      if (e.target === document.getElementById(id)) closeModal(id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      ["approveModal", "rejectModal"].forEach((id) => closeModal(id));
    }
  });
  let _ld, _logd;
  document.getElementById("ledgerSearch").addEventListener("input", (e) => {
    clearTimeout(_ld);
    _ld = setTimeout(() => {
      ledgerState.search = e.target.value;
      ledgerState.page = 1;
      loadLedger();
    }, 300);
  });
  document
    .getElementById("ledgerEventFilter")
    .addEventListener("change", (e) => {
      ledgerState.event_type = e.target.value;
      ledgerState.page = 1;
      loadLedger();
    });
  document.getElementById("logSearch").addEventListener("input", (e) => {
    clearTimeout(_logd);
    _logd = setTimeout(() => {
      logsState.search = e.target.value;
      logsState.page = 1;
      loadLogs();
    }, 300);
  });
  document.getElementById("logTypeFilter").addEventListener("change", (e) => {
    logsState.action_type = e.target.value;
    logsState.page = 1;
    loadLogs();
  });
}

// ── View Mode Helpers ──
function setWdView(mode, doLoad = true) {
  localStorage.setItem("payoutsWdView", mode);
  document
    .getElementById("wd-grid-btn")
    .classList.toggle("active", mode === "grid");
  document
    .getElementById("wd-list-btn")
    .classList.toggle("active", mode === "list");
  document.getElementById("wdGridView").style.display =
    mode === "grid" ? "" : "none";
  document.getElementById("wdListView").style.display =
    mode === "list" ? "" : "none";
  if (doLoad) loadWithdrawals();
}
function setLedgerView(mode, doLoad = true) {
  localStorage.setItem("payoutsLedgerView", mode);
  document
    .getElementById("ledger-grid-btn")
    .classList.toggle("active", mode === "grid");
  document
    .getElementById("ledger-list-btn")
    .classList.toggle("active", mode === "list");
  document.getElementById("ledgerGridView").style.display =
    mode === "grid" ? "" : "none";
  document.getElementById("ledgerListView").style.display =
    mode === "list" ? "" : "none";
  if (doLoad) loadLedger();
}
function setLogsView(mode, doLoad = true) {
  localStorage.setItem("payoutsLogsView", mode);
  document
    .getElementById("logs-grid-btn")
    .classList.toggle("active", mode === "grid");
  document
    .getElementById("logs-list-btn")
    .classList.toggle("active", mode === "list");
  document.getElementById("logsGridView").style.display =
    mode === "grid" ? "" : "none";
  document.getElementById("logsListView").style.display =
    mode === "list" ? "" : "none";
  if (doLoad) loadLogs();
}

// ── Tab switching ──
let activeTab = "withdrawals";
function switchTab(tab, btn) {
  activeTab = tab;
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  if (tab === "withdrawals") loadWithdrawals();
  else if (tab === "ledger") loadLedger();
  else if (tab === "config") loadConfig();
  else if (tab === "logs") loadLogs();
}

// ── Stats & Charts ──
async function loadStats() {
  const d = await apiFetch("/admin/payouts/stats");
  if (!d || d._error) return;
  document.getElementById("sv-commission").textContent =
    "₹" +
    parseFloat(d.total_commission || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  document.getElementById("sv-pending").textContent = fmtAmt(
    d.pending_amount || 0
  );
  document.getElementById("sv-pending-count").textContent =
    d.pending_count || 0;
  document.getElementById("sv-paid").textContent = fmtAmt(d.paid_out || 0);
  const rejData = (d.wd_by_status || {}).rejected || {};
  document.getElementById("sv-rejected").textContent = fmtAmt(
    d.rejected_amount || rejData.total || 0
  );
  document.getElementById("sv-rejected-count").textContent =
    d.rejected_count || rejData.count || 0;
  buildDailyLineChart(d.monthly_commission || []);
  buildDonutChart(d.wd_by_status || {});
}

async function buildDailyLineChart(fallbackData) {
  const dark = isDark();
  const today = new Date();
  const dayMap = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    dayMap[key] = { label, value: 0 };
  }
  const ledgerData = await apiFetch(
    "/admin/payouts/commission-ledger?limit=100&sort=created_at&dir=asc&page=1"
  );
  if (ledgerData?.entries) {
    ledgerData.entries.forEach((e) => {
      if (!e.created_at || e.event_type === "withdrawal") return;
      const key = e.created_at.split("T")[0];
      if (dayMap[key]) dayMap[key].value += parseFloat(e.commission_amt || 0);
    });
  }
  const ordered = Object.values(dayMap);
  const labels = ordered.map((v) => v.label);
  const data = ordered.map((v) => v.value);
  const ctx = document.getElementById("lineChart").getContext("2d");
  if (lineChartInst) lineChartInst.destroy();
  lineChartInst = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Commission (₹)",
          data,
          borderColor: "rgba(230,10,234,1)",
          backgroundColor: "rgba(230,10,234,0.1)",
          borderWidth: 2.5,
          pointBackgroundColor: "rgba(230,10,234,1)",
          pointRadius: data.map((v) => (v > 0 ? 4 : 2)),
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
          callbacks: {
            label: (c) =>
              `  ₹${parseFloat(c.raw).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)",
          },
          ticks: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { size: 9 },
            maxTicksLimit: 10,
          },
        },
        y: {
          grid: {
            color: dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)",
          },
          ticks: {
            color: dark ? "#c4aedd" : "#6b5880",
            font: { size: 10 },
            callback: (v) => "₹" + v,
          },
        },
      },
    },
  });
}

function buildDonutChart(byStatus) {
  const ctx = document.getElementById("donutChart").getContext("2d");
  if (donutChartInst) donutChartInst.destroy();
  const COLORS = {
    pending: "#eab308",
    approved: "#22c55e",
    completed: "#3b82f6",
    rejected: "#ef4444",
  };
  const labels = Object.keys(byStatus);
  const data = labels.map((l) => byStatus[l].count);
  const colors = labels.map((l) => COLORS[l] || "#888");
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
        }"></div><span>${l}</span><span style="color:var(--text-secondary);margin-left:4px">${
          byStatus[l].count
        } (${fmtAmt(byStatus[l].total)})</span></div>`
    )
    .join("");
}

function rebuildCharts() {
  loadStats();
}

// ── WITHDRAWALS ──
function setupWdFilters() {
  let deb;
  document.getElementById("wdSearch").addEventListener("input", (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      wdState.search = e.target.value;
      wdState.page = 1;
      loadWithdrawals();
    }, 300);
  });
  document.getElementById("wdStatusFilter").addEventListener("change", (e) => {
    wdState.status = e.target.value;
    wdState.page = 1;
    loadWithdrawals();
  });
}
function resetWdFilters() {
  document.getElementById("wdSearch").value = "";
  document.getElementById("wdStatusFilter").value = "";
  wdState.search = "";
  wdState.status = "";
  wdState.page = 1;
  loadWithdrawals();
}
function sortWd(field) {
  wdState.dir =
    wdState.sort === field && wdState.dir === "asc"
      ? "desc"
      : wdState.sort !== field
      ? "desc"
      : "asc";
  wdState.sort = field;
  loadWithdrawals();
}

async function loadWithdrawals() {
  const wdView = localStorage.getItem("payoutsWdView") || "grid";
  const grid = document.getElementById("wdGridView");
  const tbody = document.getElementById("wdTableBody");
  if (wdView === "grid") grid.innerHTML = renderCardSkels(6);
  else tbody.innerHTML = renderTableSkels(6, 8);
  const p = new URLSearchParams({
    search: wdState.search,
    status: wdState.status,
    page: wdState.page,
    limit: wdState.limit,
    sort: wdState.sort,
    dir: wdState.dir,
  });
  const d = await apiFetch(`/admin/payouts/withdrawals?${p}`);
  if (!d || d._error) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-triangle"></i><p>Failed to load withdrawals</p></div>`;
    return;
  }
  wdState.total = d.total;
  wdState.pages = d.pages;
  if (!d.withdrawals.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-money-bill-transfer"></i><p>No withdrawals found</p></div>`;
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-money-bill-transfer"></i><p>No withdrawals found</p></div></td></tr>`;
    document.getElementById("wdPagination").innerHTML = "";
    return;
  }
  if (wdView === "grid")
    grid.innerHTML = d.withdrawals.map((w, i) => renderWdCard(w, i)).join("");
  else
    tbody.innerHTML = d.withdrawals.map((w, i) => renderWdRow(w, i)).join("");
  renderPagination("wdPagination", wdState, gotoWdPage);
}

function renderWdCard(w, idx) {
  const delay = (idx % 12) * 0.04;
  const opts = w.payment_options || {};
  const hasUpi = opts.accepts_upi && opts.upi_id;
  const hasBank = opts.accepts_bank_transfer && opts.bank_account_number;
  const stripeMap = {
    pending: "stripe-yellow",
    approved: "stripe-green",
    completed: "stripe-blue",
    rejected: "stripe-red",
  };
  const canAct = w.status === "pending";
  let payMethods =
    '<span style="color:var(--text-secondary);font-size:.72rem;font-style:italic">No payment method set up</span>';
  if (hasUpi || hasBank) {
    payMethods = "";
    if (hasUpi)
      payMethods += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:.68rem;font-weight:700;background:rgba(168,85,247,.12);color:var(--purple);padding:2px 9px;border-radius:20px;margin-right:5px">📱 ${escHtml(
        opts.upi_id
      )}</span>`;
    if (hasBank)
      payMethods += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:.68rem;font-weight:700;background:rgba(59,130,246,.12);color:var(--blue);padding:2px 9px;border-radius:20px">🏦 ${escHtml(
        opts.bank_name || "Bank"
      )}</span>`;
  }
  return `<div class="icard ${
    stripeMap[w.status] || "stripe-pink"
  }" style="animation-delay:${delay}s">
  <div class="icard-head">
    <div style="display:flex;align-items:center;gap:9px">${avatarHtml(
      w.seller_name,
      w.seller_avatar,
      34
    )}
      <div><div style="font-weight:800;font-size:.87rem;line-height:1.2">${escHtml(
        w.seller_name || w.seller_username
      )}</div><div style="font-size:.67rem;color:var(--text-secondary)">@${escHtml(
    w.seller_username
  )}</div></div>
    </div>
    ${statusBadge(w.status)}
  </div>
  <div class="icard-id">REQ #${w.request_id}</div>
  <div class="icard-amount">${fmtAmt(w.amount)}</div>
  <div style="margin-bottom:12px;min-height:22px">${payMethods}</div>
  ${
    w.payment_method || w.payment_reference
      ? `<div class="mini-info-box" style="margin-bottom:12px">
    ${
      w.payment_method
        ? `<div class="mini-info-row"><span class="mini-info-key">Method</span><span class="mini-info-val">${escHtml(
            w.payment_method
          )}</span></div>`
        : ""
    }
    ${
      w.payment_reference
        ? `<div class="mini-info-row"><span class="mini-info-key">Reference</span><span class="mini-info-val" style="color:var(--primary)">${escHtml(
            w.payment_reference
          )}</span></div>`
        : ""
    }
  </div>`
      : ""
  }
  ${
    w.admin_notes
      ? `<div style="display:flex;gap:7px;align-items:flex-start;background:rgba(59,130,246,.06);border-left:3px solid var(--blue);border-radius:0 9px 9px 0;padding:8px 10px;margin-bottom:12px;font-size:.73rem;color:var(--text-secondary)"><i class="fas fa-note-sticky" style="color:var(--blue);flex-shrink:0;margin-top:1px"></i>${escHtml(
          w.admin_notes
        )}</div>`
      : ""
  }
  <div class="icard-footer">
    <div class="icard-date"><i class="fas fa-calendar-alt"></i> ${fmtDate(
      w.request_date
    )}</div>
    <div class="icard-actions">
      <button class="icard-btn" onclick="toggleWdExpand(${
        w.request_id
      },this)"><i class="fas fa-eye"></i> Details</button>
      ${
        canAct
          ? `<button class="icard-btn btn-approve" onclick="openApproveModal(${w.request_id})"><i class="fas fa-check"></i></button>
      <button class="icard-btn btn-reject" onclick="openRejectModal(${w.request_id})"><i class="fas fa-ban"></i></button>`
          : ""
      }
    </div>
  </div>
  <div class="icard-expand" id="wdx-${w.request_id}">
    <div style="font-size:.63rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--text-secondary);margin-bottom:8px">Full Payment Info</div>
    ${renderPayOptions(opts)}
    <div class="icard-meta" style="margin-top:10px">
      <div class="icard-meta-row"><span class="icard-meta-label">Email</span><span class="icard-meta-val">${escHtml(
        w.seller_email
      )}</span></div>
      ${
        w.processed_date
          ? `<div class="icard-meta-row"><span class="icard-meta-label">Processed</span><span class="icard-meta-val">${fmtDate(
              w.processed_date
            )}</span></div>`
          : ""
      }
      <div class="icard-meta-row"><span class="icard-meta-label">Requested</span><span class="icard-meta-val">${fmtDate(
        w.request_date
      )}</span></div>
    </div>
  </div>
</div>`;
}

function renderWdRow(w, idx) {
  const delay = (idx % 20) * 0.025;
  const canAct = w.status === "pending";
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both">
  <td><span style="font-weight:800;font-size:.82rem;color:var(--primary)">#${
    w.request_id
  }</span></td>
  <td><div class="user-cell">${avatarHtml(
    w.seller_name,
    w.seller_avatar
  )}<div><div class="user-name">${escHtml(
    w.seller_name || w.seller_username
  )}</div><div class="user-sub">@${escHtml(
    w.seller_username
  )}</div></div></div></td>
  <td><span style="font-weight:800;font-size:.9rem">${fmtAmt(
    w.amount
  )}</span></td>
  <td>${statusBadge(w.status)}</td>
  <td style="font-size:.78rem">${escHtml(w.payment_method) || "—"}</td>
  <td style="font-size:.75rem;color:var(--primary);font-weight:700">${
    escHtml(w.payment_reference) || "—"
  }</td>
  <td style="font-size:.78rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
    w.request_date
  )}</td>
  <td><div class="act-btns">
    <button class="act-btn" title="Details" onclick="toggleWdExpand(${
      w.request_id
    },this)"><i class="fas fa-eye"></i></button>
    ${
      canAct
        ? `<button class="act-btn green" title="Approve" onclick="openApproveModal(${w.request_id})"><i class="fas fa-check"></i></button>
    <button class="act-btn red" title="Reject" onclick="openRejectModal(${w.request_id})"><i class="fas fa-ban"></i></button>`
        : ""
    }
  </div></td>
</tr>`;
}

function toggleWdExpand(id, btn) {
  const el = document.getElementById(`wdx-${id}`);
  if (!el) return;
  const open = el.classList.toggle("open");
  btn.innerHTML = open
    ? '<i class="fas fa-eye-slash"></i> Hide'
    : '<i class="fas fa-eye"></i> Details';
}

// ── Approve Modal ──
async function openApproveModal(requestId) {
  const w = await apiFetch(`/admin/payouts/withdrawals/${requestId}`);
  if (!w || w._error) {
    showToast("Failed to load withdrawal", "error");
    return;
  }
  _currentWdData = w;
  document.getElementById("am-request-id").value = requestId;
  document.getElementById("amAmount").textContent = fmtAmt(w.amount);
  document.getElementById("am-pay-ref").value = "";
  document.getElementById("am-notes").value = "";

  const opts = w.payment_options || {};
  const hasUpi = opts.accepts_upi && opts.upi_id;
  const hasBank = opts.accepts_bank_transfer && opts.bank_account_number;
  const sel = document.getElementById("am-pay-method");
  sel.innerHTML = '<option value="">— Select method —</option>';
  sel.disabled = false;

  if (!hasUpi && !hasBank) {
    sel.innerHTML =
      '<option value="" disabled>⚠️ No payment method registered</option>';
    sel.disabled = true;
    document.getElementById(
      "amPayInfo"
    ).innerHTML = `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px 14px;color:var(--red);font-size:.82rem;font-weight:600;">⚠️ Seller has not registered any payment method.</div>`;
  } else {
    if (hasUpi) sel.innerHTML += '<option value="UPI">📱 UPI Transfer</option>';
    if (hasBank)
      sel.innerHTML +=
        '<option value="Bank Transfer">🏦 Bank Transfer (NEFT/IMPS)</option>';
    // Auto-select if only one option
    if (hasUpi && !hasBank) sel.value = "UPI";
    if (hasBank && !hasUpi) sel.value = "Bank Transfer";
    // Render the initially selected method's details
    renderPayMethodDetail(sel.value);
  }

  openModal("approveModal");
}

// Called when admin changes the payment method dropdown
function onPayMethodChange() {
  const method = document.getElementById("am-pay-method").value;
  renderPayMethodDetail(method);
}

// Renders ONLY the selected payment method's details into amPayInfo
function renderPayMethodDetail(method) {
  const w = _currentWdData;
  if (!w) return;
  const opts = w.payment_options || {};
  const container = document.getElementById("amPayInfo");
  const sellerLabel = `<div class="seller-pay-title">💳 ${escHtml(
    w.seller_name || w.seller_username
  )}'s Payment Details</div>`;

  if (method === "UPI" && opts.accepts_upi && opts.upi_id) {
    const upiUri = `upi://pay?pa=${encodeURIComponent(
      opts.upi_id
    )}&pn=${encodeURIComponent(opts.upi_name || "Seller")}&am=${
      w.amount
    }&cu=INR&tn=CreatorConnect+Withdrawal+%23${w.request_id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
      upiUri
    )}`;
    container.innerHTML =
      sellerLabel +
      `<div>
    <div style="font-size:.68rem;font-weight:800;color:var(--purple);margin-bottom:8px">📱 UPI Transfer</div>
    <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px">
        <div class="pay-detail-row"><span class="pay-detail-label">UPI ID</span><span class="pay-detail-val">${escHtml(
          opts.upi_id
        )}</span><button class="copy-btn" onclick="copyText('${escHtml(
        opts.upi_id
      )}')"><i class="fas fa-copy"></i></button></div>
        <div class="pay-detail-row"><span class="pay-detail-label">Name</span><span class="pay-detail-val">${escHtml(
          opts.upi_name || "—"
        )}</span></div>
        <div class="pay-detail-row"><span class="pay-detail-label">Amount</span><span class="pay-detail-val" style="color:var(--green);font-weight:800">${fmtAmt(
          w.amount
        )}</span></div>
      </div>
      <div style="text-align:center;flex-shrink:0">
        <div style="font-size:.65rem;color:var(--text-secondary);font-weight:700;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Scan to Pay</div>
        <img src="${qrUrl}" alt="UPI QR" style="width:120px;height:120px;border-radius:10px;border:2px solid rgba(168,85,247,.3);display:block;" onerror="this.style.display='none'"/>
      </div>
    </div>
  </div>`;
  } else if (
    method === "Bank Transfer" &&
    opts.accepts_bank_transfer &&
    opts.bank_account_number
  ) {
    container.innerHTML =
      sellerLabel +
      `<div>
    <div style="font-size:.68rem;font-weight:800;color:var(--blue);margin-bottom:6px">🏦 Bank Transfer</div>
    <div class="pay-detail-row"><span class="pay-detail-label">Bank</span><span class="pay-detail-val">${escHtml(
      opts.bank_name || "—"
    )}</span></div>
    <div class="pay-detail-row"><span class="pay-detail-label">Holder</span><span class="pay-detail-val">${escHtml(
      opts.bank_holder_name || "—"
    )}</span></div>
    <div class="pay-detail-row"><span class="pay-detail-label">Account</span><span class="pay-detail-val">${escHtml(
      opts.bank_account_number
    )}</span><button class="copy-btn" onclick="copyText('${escHtml(
        opts.bank_account_number
      )}')"><i class="fas fa-copy"></i></button></div>
    <div class="pay-detail-row"><span class="pay-detail-label">IFSC</span><span class="pay-detail-val">${escHtml(
      opts.bank_ifsc_code || "—"
    )}</span><button class="copy-btn" onclick="copyText('${escHtml(
        opts.bank_ifsc_code || ""
      )}')"><i class="fas fa-copy"></i></button></div>
    ${
      opts.bank_branch
        ? `<div class="pay-detail-row"><span class="pay-detail-label">Branch</span><span class="pay-detail-val">${escHtml(
            opts.bank_branch
          )}</span></div>`
        : ""
    }
  </div>`;
  } else {
    // Nothing selected yet or no valid combo
    container.innerHTML =
      sellerLabel +
      `<div style="color:var(--text-secondary);font-size:.78rem;padding:8px 0;">Select a payment method above to view details.</div>`;
  }
}

async function submitApprove() {
  const requestId = document.getElementById("am-request-id").value;
  const payMethod = (
    document.getElementById("am-pay-method").value || ""
  ).trim();
  const payRef = (document.getElementById("am-pay-ref").value || "").trim();
  const notes = (document.getElementById("am-notes").value || "").trim();
  if (!payMethod) {
    showToast("Select payment method used", "warn");
    return;
  }
  if (!payRef) {
    showToast("Enter payment reference / transaction ID", "warn");
    return;
  }
  const btn = document.getElementById("amSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';
  const r = await apiFetch(`/admin/payouts/withdrawals/${requestId}/approve`, {
    method: "PUT",
    body: JSON.stringify({
      payment_method: payMethod,
      payment_reference: payRef,
      admin_notes: notes,
    }),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Confirm Payment & Approve';
  if (r?.success) {
    showToast(r.message || "Withdrawal approved!", "success");
    closeModal("approveModal");
    loadStats();
    loadWithdrawals();
  } else showToast(r?._error || r?.error || "Failed to approve", "error");
}

// ── Reject Modal ──
function openRejectModal(requestId) {
  apiFetch(`/admin/payouts/withdrawals/${requestId}`).then((w) => {
    if (!w || w._error) {
      showToast("Failed to load", "error");
      return;
    }
    document.getElementById("rm-request-id").value = requestId;
    document.getElementById("rmSeller").textContent = `${
      w.seller_name || w.seller_username
    } (@${w.seller_username})`;
    document.getElementById("rmAmount").textContent = fmtAmt(w.amount);
    document.getElementById("rm-notes").value = "";
    openModal("rejectModal");
  });
}

async function submitReject() {
  const requestId = document.getElementById("rm-request-id").value;
  const notes = (document.getElementById("rm-notes").value || "").trim();
  if (!notes) {
    showToast("Please provide a rejection reason", "warn");
    return;
  }
  const btn = document.getElementById("rmSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting…';
  const r = await apiFetch(`/admin/payouts/withdrawals/${requestId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ admin_notes: notes }),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-ban"></i> Reject Withdrawal';
  if (r?.success) {
    showToast("Withdrawal rejected", "success");
    closeModal("rejectModal");
    loadStats();
    loadWithdrawals();
  } else showToast(r?._error || r?.error || "Failed to reject", "error");
}

// ── LEDGER ──
function resetLedgerFilters() {
  document.getElementById("ledgerSearch").value = "";
  document.getElementById("ledgerEventFilter").value = "";
  ledgerState.search = "";
  ledgerState.event_type = "";
  ledgerState.page = 1;
  loadLedger();
}
function sortLedger(field) {
  ledgerState.dir =
    ledgerState.sort === field && ledgerState.dir === "asc"
      ? "desc"
      : ledgerState.sort !== field
      ? "desc"
      : "asc";
  ledgerState.sort = field;
  loadLedger();
}

async function loadLedger() {
  const mode = localStorage.getItem("payoutsLedgerView") || "grid";
  const grid = document.getElementById("ledgerGridView");
  const tbody = document.getElementById("ledgerTableBody");
  if (mode === "grid") grid.innerHTML = renderCardSkels(6);
  else tbody.innerHTML = renderTableSkels(6, 8);
  const p = new URLSearchParams({
    search: ledgerState.search,
    event_type: ledgerState.event_type,
    page: ledgerState.page,
    limit: ledgerState.limit,
    sort: ledgerState.sort,
    dir: ledgerState.dir,
  });
  const d = await apiFetch(`/admin/payouts/commission-ledger?${p}`);
  if (!d || d._error) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-receipt"></i><p>Failed to load ledger</p></div>`;
    return;
  }
  ledgerState.total = d.total;
  ledgerState.pages = d.pages;
  if (!d.entries.length) {
    const emptyHtml = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-receipt"></i><p>No ledger entries found</p></div>`;
    grid.innerHTML = emptyHtml;
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-receipt"></i><p>No ledger entries found</p></div></td></tr>`;
    document.getElementById("ledgerPagination").innerHTML = "";
    return;
  }
  if (mode === "grid")
    grid.innerHTML = d.entries.map((e, i) => renderLedgerCard(e, i)).join("");
  else
    tbody.innerHTML = d.entries.map((e, i) => renderLedgerRow(e, i)).join("");
  renderPagination("ledgerPagination", ledgerState, gotoLedgerPage);
}

function renderLedgerCard(e, idx) {
  const delay = (idx % 12) * 0.04;
  const netPositive = parseFloat(e.net_credit || 0) >= 0;
  const ref = e.order_id
    ? `Order #${e.order_id}`
    : e.booking_id
    ? `Booking #${e.booking_id}`
    : "—";
  const stripeByEvent = {
    online_commission: "stripe-pink",
    cod_commission: "stripe-yellow",
    cod_deficit: "stripe-red",
    deficit_recovery: "stripe-green",
    withdrawal: "stripe-blue",
    refund_reversal: "stripe-purple",
  };
  return `<div class="icard ${
    stripeByEvent[e.event_type] || "stripe-teal"
  }" style="animation-delay:${delay}s">
  <div class="icard-head">
    <div style="display:flex;align-items:center;gap:9px">${avatarHtml(
      e.seller_name,
      e.seller_avatar,
      34
    )}
      <div><div style="font-weight:800;font-size:.87rem;line-height:1.2">${escHtml(
        e.seller_name || e.seller_username
      )}</div><div style="font-size:.67rem;color:var(--text-secondary)">@${escHtml(
    e.seller_username
  )}</div></div>
    </div>
    ${eventBadge(e.event_type)}
  </div>
  <div class="icard-id">#${e.ledger_id} · ${escHtml(ref)}</div>
  <div class="ledger-trio">
    <div class="ledger-trio-cell"><div class="ledger-trio-label">Gross</div><div class="ledger-trio-val">${fmtAmt(
      e.gross_amount
    )}</div></div>
    <div class="ledger-trio-cell"><div class="ledger-trio-label">Commission</div><div class="ledger-trio-val" style="color:var(--primary)">${fmtAmt(
      e.commission_amt
    )}<span style="font-size:.6rem;opacity:.7"> ${
    e.commission_pct
  }%</span></div></div>
    <div class="ledger-trio-cell"><div class="ledger-trio-label">Net Credit</div><div class="ledger-trio-val ${
      netPositive ? "amount-positive" : "amount-negative"
    }">${netPositive ? "+" : ""}${fmtAmt(e.net_credit)}</div></div>
  </div>
  ${
    e.notes
      ? `<div style="font-size:.73rem;color:var(--text-secondary);background:var(--main-bg);border-radius:9px;padding:7px 10px;margin-bottom:12px;border:1px solid var(--card-border)">${escHtml(
          e.notes
        )}</div>`
      : ""
  }
  <div class="icard-footer">
    <div class="icard-date"><i class="fas fa-calendar-alt"></i> ${fmtDate(
      e.created_at
    )}</div>
    ${
      e.seller_balance_after != null
        ? `<div style="font-size:.73rem;font-weight:700;color:var(--text-secondary)">Bal: <span style="color:var(--text-primary)">${fmtAmt(
            e.seller_balance_after
          )}</span></div>`
        : ""
    }
  </div>
</div>`;
}

function renderLedgerRow(e, idx) {
  const delay = (idx % 20) * 0.025;
  const netPositive = parseFloat(e.net_credit || 0) >= 0;
  const ref = e.order_id
    ? `#${e.order_id}`
    : e.booking_id
    ? `B#${e.booking_id}`
    : "—";
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both">
  <td><span style="font-weight:800;font-size:.82rem;color:var(--primary)">#${
    e.ledger_id
  }</span></td>
  <td><div class="user-cell">${avatarHtml(
    e.seller_name,
    e.seller_avatar
  )}<div><div class="user-name">${escHtml(
    e.seller_name || e.seller_username
  )}</div><div class="user-sub">@${escHtml(
    e.seller_username
  )}</div></div></div></td>
  <td>${eventBadge(e.event_type)}</td>
  <td style="font-weight:700">${fmtAmt(e.gross_amount)}</td>
  <td style="color:var(--primary);font-weight:700">${fmtAmt(
    e.commission_amt
  )} <span style="font-size:.7rem;opacity:.7">${e.commission_pct}%</span></td>
  <td class="${
    netPositive ? "amount-positive" : "amount-negative"
  }" style="font-weight:800">${netPositive ? "+" : ""}${fmtAmt(
    e.net_credit
  )}</td>
  <td style="font-size:.78rem;color:var(--text-secondary)">${ref}</td>
  <td style="font-size:.78rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
    e.created_at
  )}</td>
</tr>`;
}

// ── CONFIG ──
function onConfigEdit() {
  configDirty = true;
  document.getElementById("configSaveBtn").disabled = false;
  document.getElementById("configDot").classList.add("show");
}

async function loadConfig() {
  const d = await apiFetch("/admin/payouts/payment-config");
  if (!d || d._error) {
    showToast("Failed to load config", "error");
    return;
  }
  const c = d.config || {};
  const v = (k) => c[k]?.value || "";
  const fields = {
    "cfg-upi-id": v("upi_id"),
    "cfg-upi-name": v("upi_name"),
    "cfg-upi-desc": v("upi_description"),
    "cfg-bank-name": v("bank_name"),
    "cfg-bank-holder": v("bank_holder"),
    "cfg-bank-acc": v("bank_account"),
    "cfg-bank-ifsc": v("bank_ifsc"),
    "cfg-bank-branch": v("bank_branch"),
    "cfg-bank-desc": v("bank_description"),
    "cfg-fee-online": v("platform_fee_online_pct"),
    "cfg-fee-cod": v("platform_fee_cod_pct"),
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  configDirty = false;
  document.getElementById("configSaveBtn").disabled = true;
  document.getElementById("configDot").classList.remove("show");
  const anyUpdated = Object.values(c).find((v) => v.updated_at);
  if (anyUpdated?.updated_at)
    document.getElementById("configSavedAt").textContent =
      "Last saved: " + fmtDate(anyUpdated.updated_at);
}

async function saveConfig() {
  const payload = {
    upi_id: document.getElementById("cfg-upi-id").value.trim(),
    upi_name: document.getElementById("cfg-upi-name").value.trim(),
    upi_description: document.getElementById("cfg-upi-desc").value.trim(),
    bank_name: document.getElementById("cfg-bank-name").value.trim(),
    bank_holder: document.getElementById("cfg-bank-holder").value.trim(),
    bank_account: document.getElementById("cfg-bank-acc").value.trim(),
    bank_ifsc: document.getElementById("cfg-bank-ifsc").value.trim(),
    bank_branch: document.getElementById("cfg-bank-branch").value.trim(),
    bank_description: document.getElementById("cfg-bank-desc").value.trim(),
    platform_fee_online_pct: document
      .getElementById("cfg-fee-online")
      .value.trim(),
    platform_fee_cod_pct: document.getElementById("cfg-fee-cod").value.trim(),
  };
  const online = parseFloat(payload.platform_fee_online_pct);
  const cod = parseFloat(payload.platform_fee_cod_pct);
  if (isNaN(online) || online < 0 || online > 100) {
    showToast("Online fee must be between 0–100%", "warn");
    return;
  }
  if (isNaN(cod) || cod < 0 || cod > 100) {
    showToast("COD fee must be between 0–100%", "warn");
    return;
  }
  const r = await apiFetch("/admin/payouts/payment-config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (r?.success) {
    showToast("Payment config saved!", "success");
    configDirty = false;
    document.getElementById("configSaveBtn").disabled = true;
    document.getElementById("configDot").classList.remove("show");
    document.getElementById("configSavedAt").textContent =
      "Last saved: " + fmtDate(new Date().toISOString());
  } else showToast(r?._error || "Failed to save config", "error");
}

// ── LOGS ──
function resetLogsFilters() {
  document.getElementById("logSearch").value = "";
  document.getElementById("logTypeFilter").value = "";
  logsState.search = "";
  logsState.action_type = "";
  logsState.page = 1;
  loadLogs();
}

async function loadLogs() {
  const mode = localStorage.getItem("payoutsLogsView") || "grid";
  const grid = document.getElementById("logsGridView");
  const tbody = document.getElementById("logsTableBody");
  if (mode === "grid") grid.innerHTML = renderCardSkels(4);
  else tbody.innerHTML = renderTableSkels(4, 7);

  // Build query — no action_type filter = show ALL logs from db
  const actionType = logsState.action_type || "";
  const search = (logsState.search || "").trim();
  const p = new URLSearchParams({
    page: logsState.page,
    limit: logsState.limit,
  });
  if (actionType) p.set("action_type", actionType);
  if (search) p.set("search", search);

  const d = await apiFetch(`/admin/payouts/action-logs?${p}`);
  if (!d || d._error) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-scroll"></i><p>Failed to load logs</p></div>`;
    return;
  }
  logsState.total = d.total;
  logsState.pages = d.pages;
  if (!d.logs.length) {
    // Helpful empty state that explains WHY it's empty
    const emptyMsg = actionType
      ? `No logs yet for "<strong>${actionType.replace(
          /_/g,
          " "
        )}</strong>". These will appear after admins perform this action.`
      : search
      ? `No logs matching "<strong>${escHtml(search)}</strong>".`
      : "No action logs found. Logs appear here as admin actions are performed.";
    const emptyHtml = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-scroll"></i><p>${emptyMsg}</p></div>`;
    grid.innerHTML = emptyHtml;
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-scroll"></i><p>${emptyMsg}</p></div></td></tr>`;
    document.getElementById("logsPagination").innerHTML = "";
    return;
  }
  if (mode === "grid")
    grid.innerHTML = d.logs.map((l, i) => renderLogCard(l, i)).join("");
  else tbody.innerHTML = d.logs.map((l, i) => renderLogRow(l, i)).join("");
  renderPagination("logsPagination", logsState, gotoLogsPage);
}

function renderLogCard(l, idx) {
  const delay = (idx % 12) * 0.04;
  const iconMap = {
    withdrawal_approved: {
      icon: "fa-check-circle",
      label: "Withdrawal Approved",
      stripe: "stripe-green",
    },
    withdrawal_rejected: {
      icon: "fa-ban",
      label: "Withdrawal Rejected",
      stripe: "stripe-red",
    },
    payment_verified: {
      icon: "fa-shield-check",
      label: "Payment Verified",
      stripe: "stripe-blue",
    },
    post_removed: {
      icon: "fa-trash",
      label: "Post Removed",
      stripe: "stripe-orange",
    },
    user_suspended: {
      icon: "fa-user-slash",
      label: "User Suspended",
      stripe: "stripe-yellow",
    },
    transaction_refunded: {
      icon: "fa-rotate-left",
      label: "Transaction Refunded",
      stripe: "stripe-purple",
    },
    seller_payment_verified: {
      icon: "fa-circle-check",
      label: "Seller Payment Verified",
      stripe: "stripe-teal",
    },
  };
  const meta = iconMap[l.action_type] || {
    icon: "fa-scroll",
    label: (l.action_type || "Action").replace(/_/g, " "),
    stripe: "stripe-pink",
  };
  const initials = (l.admin_name || l.admin_username || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return `<div class="icard ${meta.stripe}" style="animation-delay:${delay}s">
  <div class="icard-head" style="margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="log-icon-badge ${escHtml(l.action_type)}"><i class="fas ${
    meta.icon
  }"></i></div>
      <div>
        <div style="font-weight:800;font-size:.87rem;line-height:1.2">${escHtml(
          meta.label
        )}</div>
        <div style="font-size:.67rem;color:var(--text-secondary);margin-top:1px"><span class="log-badge ${escHtml(
          l.action_type
        )}">${escHtml((l.action_type || "").replace(/_/g, " "))}</span></div>
      </div>
    </div>
    <div class="icard-id">#${l.id}</div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px;padding:9px 11px;background:var(--main-bg);border-radius:11px;border:1px solid var(--card-border)">
    <div class="user-avatar" style="width:30px;height:30px;flex-shrink:0;background:var(--primary-light);color:var(--primary);font-size:.72rem;font-weight:800">${initials}</div>
    <div><div style="font-weight:700;font-size:.82rem">${escHtml(
      l.admin_name || l.admin_username
    )}</div><div style="font-size:.65rem;color:var(--text-secondary)">@${escHtml(
    l.admin_username
  )} · Admin</div></div>
  </div>
  ${
    l.action_details
      ? `<div style="font-size:.75rem;color:var(--text-secondary);line-height:1.5;padding:8px 10px;background:rgba(255,255,255,.025);border-radius:9px;margin-bottom:11px;border:1px solid var(--card-border)">${escHtml(
          l.action_details
        )}</div>`
      : ""
  }
  ${
    l.reference_type || l.reference_id
      ? `<div class="mini-info-box" style="margin-bottom:11px"><div class="mini-info-row"><span class="mini-info-key">Reference</span><span class="mini-info-val">${escHtml(
          (l.reference_type || "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        )}${l.reference_id ? " #" + l.reference_id : ""}</span></div></div>`
      : ""
  }
  <div class="icard-footer">
    <div class="icard-date"><i class="fas fa-clock"></i> ${fmtDate(
      l.created_at
    )}</div>
    ${
      l.ip_address
        ? `<div style="font-size:.65rem;color:var(--text-secondary);font-weight:600;display:flex;align-items:center;gap:4px"><i class="fas fa-location-dot"></i>${escHtml(
            l.ip_address
          )}</div>`
        : ""
    }
  </div>
</div>`;
}

function renderLogRow(l, idx) {
  const delay = (idx % 20) * 0.025;
  const iconMap = {
    withdrawal_approved: { label: "✅ WD Approved" },
    withdrawal_rejected: { label: "❌ WD Rejected" },
    payment_verified: { label: "🔵 Payment Verified" },
    post_removed: { label: "🗑️ Post Removed" },
    user_suspended: { label: "🚫 User Suspended" },
    transaction_refunded: { label: "💸 Refunded" },
    seller_payment_verified: { label: "✔️ Seller Verified" },
  };
  const meta = iconMap[l.action_type] || {
    label: (l.action_type || "Action").replace(/_/g, " "),
  };
  const initials = (l.admin_name || l.admin_username || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both">
  <td><span style="font-weight:800;font-size:.82rem;color:var(--primary)">#${
    l.id
  }</span></td>
  <td><div class="user-cell"><div class="user-avatar">${initials}</div><div><div class="user-name">${escHtml(
    l.admin_name || l.admin_username
  )}</div><div class="user-sub">@${escHtml(
    l.admin_username
  )}</div></div></div></td>
  <td><span class="log-badge ${escHtml(l.action_type)}">${
    meta.label
  }</span></td>
  <td style="font-size:.75rem;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(
    l.action_details
  )}</td>
  <td style="font-size:.75rem;color:var(--text-secondary)">${
    l.reference_type
      ? `${escHtml(
          (l.reference_type || "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        )} #${l.reference_id}`
      : "—"
  }</td>
  <td style="font-size:.75rem;color:var(--text-secondary)">${
    escHtml(l.ip_address) || "—"
  }</td>
  <td style="font-size:.78rem;color:var(--text-secondary);white-space:nowrap">${fmtDate(
    l.created_at
  )}</td>
</tr>`;
}

// ── Pagination & Skeletons ──
function renderCardSkels(n) {
  return Array(n)
    .fill(0)
    .map(
      (_, i) => `
  <div class="card-skel" style="animation-delay:${i * 0.04}s">
    <div class="skel-line" style="height:32px;width:55%;margin-bottom:14px"></div>
    <div class="skel-line" style="height:18px;width:35%"></div>
    <div class="skel-line" style="height:18px;width:70%"></div>
    <div class="skel-line" style="height:18px;width:50%"></div>
    <div class="skel-line" style="height:14px;width:40%;margin-top:14px;opacity:.5"></div>
  </div>`
    )
    .join("");
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
function gotoWdPage(p) {
  if (p < 1 || p > wdState.pages || p === wdState.page) return;
  wdState.page = p;
  loadWithdrawals();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}
function gotoLedgerPage(p) {
  if (p < 1 || p > ledgerState.pages || p === ledgerState.page) return;
  ledgerState.page = p;
  loadLedger();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}
function gotoLogsPage(p) {
  if (p < 1 || p > logsState.pages || p === logsState.page) return;
  logsState.page = p;
  loadLogs();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Modal helpers ──
function openModal(id) {
  document.getElementById(id).classList.add("show");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

// ── Copy ──
function copyText(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => showToast("Copied!", "success"))
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Copied!", "success");
    });
}

// ── Toast ──
function showToast(msg, type = "success") {
  const wrap = document.getElementById("toastWrap"),
    id = "toast_" + Date.now();
  const icon =
    type === "success"
      ? "fa-circle-check"
      : type === "error"
      ? "fa-triangle-exclamation"
      : type === "warn"
      ? "fa-triangle-exclamation"
      : "fa-circle-info";
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
