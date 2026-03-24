const sidebar = document.getElementById("sidebar");
const lightBtn = document.getElementById("lightBtn");
const darkBtn = document.getElementById("darkBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ── Collapse ──
let collapsed = localStorage.getItem("sbCol") === "1";
function applyCollapse(col) {
  sidebar.classList.toggle("collapsed", col);
  localStorage.setItem("sbCol", col ? "1" : "0");
  try {
    window.parent.postMessage({ type: "sb-collapse", collapsed: col }, "*");
  } catch (e) {}
}
applyCollapse(collapsed);
document.getElementById("collapseBtn").addEventListener("click", () => {
  collapsed = !collapsed;
  applyCollapse(collapsed);
});

// ── Theme ──
function setTheme(dark) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  lightBtn.classList.toggle("on", !dark);
  darkBtn.classList.toggle("on", dark);
  localStorage.setItem("adminTheme", dark ? "dark" : "light");
  try {
    window.parent.postMessage({ type: "sb-theme", dark }, "*");
  } catch (e) {}
}
setTheme(localStorage.getItem("adminTheme") === "dark");
lightBtn.addEventListener("click", () => setTheme(false));
darkBtn.addEventListener("click", () => setTheme(true));

// ── Active page detection: reads PARENT window URL ──
// This fixes the bug where sidebar always showed "dashboard" active
// because window.location.pathname was always "admin-sidebar.html"
function applyActivePage(page) {
  document.querySelectorAll(".nav-item[data-page]").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-page") === page);
  });
}
function detectActivePage() {
  try {
    const parentPath = window.parent.location.pathname;
    const filename =
      parentPath.split("/").pop().replace(".html", "") || "dashboard";
    applyActivePage(filename);
  } catch (e) {
    // If cross-origin blocked, parent-init message will handle it
  }
}
detectActivePage();

// ── Nav click: navigate parent window ──
document.querySelectorAll(".nav-item[data-page]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const href = el.getAttribute("href");
    if (!href) return;
    try {
      window.parent.location.href = href;
    } catch {
      window.location.href = href;
    }
  });
});
document.getElementById("brandLink").addEventListener("click", (e) => {
  e.preventDefault();
  try {
    window.parent.location.href = "dashboard.html";
  } catch {
    window.location.href = "dashboard.html";
  }
});

// ── Logout: send message to PARENT to show modal in center of page ──
// The modal itself is rendered in the parent page, NOT inside this iframe
// This way it always appears centered on the full page, not inside the sidebar
logoutBtn.addEventListener("click", () => {
  try {
    window.parent.postMessage({ type: "sb-logout-request" }, "*");
  } catch (e) {
    doLogout();
  }
});
function doLogout() {
  ["adminAuthToken", "adminData"].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  try {
    window.parent.location.href = "login.html";
  } catch {
    window.location.href = "login.html";
  }
}

// ── Admin info ──
try {
  const raw =
    localStorage.getItem("adminData") || sessionStorage.getItem("adminData");
  if (raw) {
    const a = JSON.parse(raw);
    const nameEl = document.getElementById("adminName");
    const avaEl = document.getElementById("adminAva");
    if (nameEl) nameEl.textContent = a.full_name || a.username || "Admin";
    if (avaEl)
      avaEl.textContent = (a.full_name || a.username || "A")
        .charAt(0)
        .toUpperCase();
  }
} catch (e) {}

// ── Keyboard shortcut [ ──
document.addEventListener("keydown", (e) => {
  if (e.key === "[" && document.activeElement.tagName !== "INPUT") {
    collapsed = !collapsed;
    applyCollapse(collapsed);
  }
});

// ── Badge counts ──
const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : `http://${window.location.hostname}:3000/api`;
async function loadBadges() {
  const token =
    localStorage.getItem("adminAuthToken") ||
    sessionStorage.getItem("adminAuthToken");
  if (!token) return;
  try {
    const r = await fetch(`${API}/admin/stats/badges`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return;
    const d = await r.json();
    const map = {
      "badge-users": d.users,
      "badge-orders": d.orders,
      "badge-bookings": d.bookings,
      "badge-withdrawals": d.withdrawals,
      "badge-tickets": d.tickets,
      "badge-articles": d.articles,
      "badge-categories": d.categories,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val != null) el.textContent = val;
    });
  } catch (e) {}
}
loadBadges();

// ── Messages from parent ──
window.addEventListener("message", (e) => {
  if (e.data?.type === "parent-init") {
    collapsed = e.data.collapsed;
    sidebar.classList.toggle("collapsed", collapsed);
    setTheme(e.data.dark);
    // parent tells us which page is active (most reliable method)
    if (e.data.page) applyActivePage(e.data.page);
  }
  if (e.data?.type === "sb-do-logout") doLogout();
});
