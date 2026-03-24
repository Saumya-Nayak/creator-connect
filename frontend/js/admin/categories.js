const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const sidebarFrame = document.getElementById("sidebarFrame");
const mainContent = document.getElementById("mainContent");
const authGate = document.getElementById("authGate");

let catState = {
  page: 1,
  limit: 20,
  search: "",
  type: "",
  status: "",
  total: 0,
  pages: 1,
  view: "grid",
};
let subState = {
  page: 1,
  limit: 20,
  search: "",
  category_id: "",
  type: "",
  status: "",
  total: 0,
  pages: 1,
  view: "grid",
};
let gstState = { page: 1, limit: 50, post_type: "", total: 0, pages: 1 };
let allCategories = [];
let pendingDeleteId = null,
  pendingDeleteType = null;
let donutChart = null;

// ── Real Indian GST slabs ──────────────────────────────────────────────────
// Services: Small creators on this platform are typically below ₹20L GST threshold
// → Default service GST = 0%. Admin can override per category if registered.
const GST_DEFAULTS = {
  showcase: 0,
  service: 0, // ← changed from 18 to 0 (unregistered small creators)
  product: 12,
};

const GST_OPTIONS = {
  showcase: [{ value: 0, label: "0% — GST Exempt (Showcase)" }],
  service: [
    { value: 0, label: "0%  — Exempt (Unregistered / Below ₹20L threshold)" },
    { value: 5, label: "5%  — Basic Services" },
    { value: 12, label: "12% — Other Services" },
    { value: 18, label: "18% — GST Registered Professional Services" },
  ],
  product: [
    { value: 0, label: "0%  — Exempt (Books, Agri, Handloom)" },
    { value: 3, label: "3%  — Jewellery / Gold / Silver (HSN 7113)" },
    { value: 5, label: "5%  — Food / Plants / Basic Goods" },
    { value: 12, label: "12% — Clothing / Art / Crafts / Home Décor" },
    { value: 18, label: "18% — Electronics / Beauty / Bags / Footwear" },
    { value: 28, label: "28% — Luxury / Tobacco / Sin Goods" },
  ],
};

/* ── EMOJI DATA ── */
const EMOJI_CATEGORIES = {
  Arts: [
    "🎨",
    "🖌️",
    "✏️",
    "📸",
    "🎭",
    "🎬",
    "🎵",
    "🎶",
    "🎤",
    "🎧",
    "🎼",
    "🎹",
    "🎸",
    "🎺",
    "🎻",
    "🥁",
    "🎙",
    "📷",
    "📹",
    "🎞",
    "🖼",
    "🎠",
    "🎡",
    "🎢",
    "🎪",
  ],
  Tech: [
    "💻",
    "🖥",
    "🖨",
    "⌨️",
    "🖱",
    "💾",
    "💿",
    "📀",
    "📱",
    "☎️",
    "📞",
    "📟",
    "📠",
    "🔋",
    "🔌",
    "💡",
    "🔦",
    "🕯",
    "🧲",
    "🔭",
    "🔬",
    "⚙️",
    "🛠",
    "🔧",
    "🔩",
  ],
  Business: [
    "💼",
    "📊",
    "📈",
    "📉",
    "📋",
    "📌",
    "📍",
    "🗂",
    "🗃",
    "📁",
    "📂",
    "🗄",
    "📝",
    "✍️",
    "🖊",
    "💰",
    "💵",
    "💴",
    "💶",
    "💷",
    "💳",
    "💸",
    "🏦",
    "🤝",
    "📣",
  ],
  Nature: [
    "🌿",
    "🌱",
    "🌾",
    "🍀",
    "🌲",
    "🌳",
    "🌴",
    "🌵",
    "🌺",
    "🌸",
    "🌼",
    "🌻",
    "🌹",
    "🌷",
    "🍁",
    "🍂",
    "🍃",
    "🌊",
    "🌈",
    "🌙",
    "⭐",
    "☀️",
    "❄️",
    "🔥",
    "💧",
  ],
  Food: [
    "🍕",
    "🍔",
    "🌮",
    "🍣",
    "🍜",
    "🍩",
    "🍰",
    "☕",
    "🍵",
    "🍺",
    "🍷",
    "🥗",
    "🥪",
    "🍱",
    "🍛",
    "🥘",
    "🍝",
    "🥞",
    "🧁",
    "🍭",
    "🍬",
    "🍫",
    "🥤",
    "🧃",
    "🎂",
  ],
  People: [
    "👤",
    "👥",
    "🧑",
    "👩",
    "👨",
    "🧒",
    "👶",
    "🧑‍💻",
    "👩‍🎨",
    "👨‍🎨",
    "👩‍🏫",
    "👨‍🏫",
    "🧑‍🤝‍🧑",
    "💪",
    "👏",
    "🙌",
    "👍",
    "❤️",
    "😊",
    "🎉",
    "🤩",
    "💯",
    "✨",
    "🌟",
    "🏆",
  ],
  Shapes: [
    "⭐",
    "🔴",
    "🟠",
    "🟡",
    "🟢",
    "🔵",
    "🟣",
    "🟤",
    "⚫",
    "⚪",
    "🔶",
    "🔷",
    "🔸",
    "🔹",
    "🔺",
    "🔻",
    "💠",
    "♦️",
    "🔘",
    "🔲",
    "🔳",
    "▪️",
    "▫️",
    "◾",
    "◽",
  ],
};

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
    const r = await fetch(`${API}/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      location.href = "login.html";
      return;
    }
  } catch {}
  authGate.classList.add("hide");
  setTimeout(() => authGate.remove(), 450);
  initPage();
})();

/* ── Sidebar ── */
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
    rebuildDonut();
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
        page: "categories",
      },
      "*"
    );
  } catch {}
}

/* ── Logout ── */
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

/* ── API Helper ── */
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
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/* ── Helpers ── */
function escHtml(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── HOVER PANELS ── */
function togglePanel(id) {
  const p = document.getElementById(id);
  const isOpen = p.classList.contains("open");
  document
    .querySelectorAll(".hover-panel.open")
    .forEach((el) => el.classList.remove("open"));
  if (!isOpen) p.classList.add("open");
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".hover-panel"))
    document
      .querySelectorAll(".hover-panel.open")
      .forEach((el) => el.classList.remove("open"));
  if (!e.target.closest(".emoji-input-wrap")) closeAllEmojiPickers();
});

/* ── EMOJI PICKER ── */
let activeEmojiPrefix = null;
function buildEmojiPicker(prefix) {
  const tabs = document.getElementById(`${prefix}EmojiTabs`);
  const grid = document.getElementById(`${prefix}EmojiGrid`);
  if (!tabs || !grid) return;
  tabs.innerHTML = Object.keys(EMOJI_CATEGORIES)
    .map(
      (cat, i) =>
        `<button class="emoji-cat-tab${
          i === 0 ? " active" : ""
        }" onclick="showEmojiCategory('${prefix}','${cat}')">${cat}</button>`
    )
    .join("");
  showEmojiCategory(prefix, Object.keys(EMOJI_CATEGORIES)[0]);
}
function showEmojiCategory(prefix, cat) {
  const tabs = document.getElementById(`${prefix}EmojiTabs`);
  const grid = document.getElementById(`${prefix}EmojiGrid`);
  tabs
    .querySelectorAll(".emoji-cat-tab")
    .forEach((t) => t.classList.toggle("active", t.textContent === cat));
  grid.innerHTML = (EMOJI_CATEGORIES[cat] || [])
    .map(
      (e) =>
        `<button class="emoji-item" onclick="selectEmoji('${prefix}','${e}')" title="${e}">${e}</button>`
    )
    .join("");
}
function filterEmojis(prefix) {
  const q = document.getElementById(`${prefix}EmojiSearch`).value.toLowerCase();
  const grid = document.getElementById(`${prefix}EmojiGrid`);
  if (!q) {
    showEmojiCategory(prefix, Object.keys(EMOJI_CATEGORIES)[0]);
    return;
  }
  const all = [].concat(...Object.values(EMOJI_CATEGORIES));
  grid.innerHTML = all
    .map(
      (e) =>
        `<button class="emoji-item" onclick="selectEmoji('${prefix}','${e}')">${e}</button>`
    )
    .join("");
}
function selectEmoji(prefix, emoji) {
  document.getElementById(`${prefix}-icon`).value = emoji;
  const display = document.getElementById(`${prefix}EmojiDisplay`);
  display.textContent = emoji;
  display.classList.remove("emoji-placeholder");
  closeAllEmojiPickers();
}
function applyCustomEmoji(prefix) {
  const v = document.getElementById(`${prefix}EmojiCustom`).value.trim();
  if (!v) {
    showToast("Please enter an emoji or text", "warn");
    return;
  }
  selectEmoji(prefix, v);
  document.getElementById(`${prefix}EmojiCustom`).value = "";
}
function toggleEmojiPicker(prefix) {
  const picker = document.getElementById(`${prefix}EmojiPicker`);
  const isOpen = picker.classList.contains("open");
  closeAllEmojiPickers();
  if (!isOpen) {
    picker.classList.add("open");
    activeEmojiPrefix = prefix;
    buildEmojiPicker(prefix);
  }
}
function closeAllEmojiPickers() {
  document
    .querySelectorAll(".emoji-picker-dropdown.open")
    .forEach((p) => p.classList.remove("open"));
  activeEmojiPrefix = null;
}

// ════════════════════════════════════════════════════════════════════════════
//  GST DROPDOWN HELPERS
//  ADD form uses:  #f-gst-rate   #f-gst-badge   #f-gst-lock-note
//  EDIT modal uses: #ec-gst-rate  #ec-gst-badge  #ec-gst-lock-note
// ════════════════════════════════════════════════════════════════════════════

/** Populate GST dropdown for ADD form when post type changes */
function updateGSTDropdown(postType) {
  _populateGSTSelect("f-gst-rate", "f-gst-badge", "f-gst-lock-note", postType);
}

/** Populate GST dropdown for EDIT modal */
function updateEditGSTDropdown(postType, currentRate) {
  _populateGSTSelect(
    "ec-gst-rate",
    "ec-gst-badge",
    "ec-gst-lock-note",
    postType,
    currentRate
  );
}

function _populateGSTSelect(selId, badgeId, lockId, postType, currentRate) {
  const sel = document.getElementById(selId);
  const badge = document.getElementById(badgeId);
  const lockNote = document.getElementById(lockId);
  if (!sel) return;

  const opts = GST_OPTIONS[postType] || GST_OPTIONS.product;
  const defaultV =
    currentRate != null ? currentRate : GST_DEFAULTS[postType] ?? 12;

  sel.innerHTML = opts
    .map(
      (o) =>
        `<option value="${o.value}" ${
          parseFloat(o.value) === parseFloat(defaultV) ? "selected" : ""
        }>${o.label}</option>`
    )
    .join("");

  if (postType === "showcase") {
    sel.disabled = true;
    if (lockNote) lockNote.style.display = "flex";
    if (badge) {
      badge.textContent = "0% — Exempt";
      badge.style.background = "rgba(16,185,129,.15)";
      badge.style.color = "#10b981";
    }
  } else {
    sel.disabled = false;
    if (lockNote) lockNote.style.display = "none";
    _refreshBadge(badge, parseFloat(sel.value));
  }
}

function refreshGSTBadge(sel, badge) {
  _refreshBadge(badge, parseFloat(sel.value));
}

function _refreshBadge(badge, val) {
  if (!badge) return;
  const [bg, fg] =
    val === 0
      ? ["rgba(16,185,129,.15)", "#10b981"]
      : val <= 5
      ? ["rgba(59,130,246,.15)", "#3b82f6"]
      : val <= 12
      ? ["rgba(230,10,234,.15)", "#e60aea"]
      : ["rgba(249,115,22,.15)", "#f97316"];
  badge.style.background = bg;
  badge.style.color = fg;
  badge.textContent = val === 0 ? "GST Exempt" : `${val}% GST`;
}

/* ── Init ── */
async function initPage() {
  loadStats();
  await loadAllCategories();
  loadCategories();
  loadSubcategories();
  setupFilters();

  document.getElementById("f-name").addEventListener("input", (e) => {
    document.getElementById("f-slug").value = slugify(e.target.value);
  });
  document.getElementById("sf-name").addEventListener("input", (e) => {
    document.getElementById("sf-slug").value = slugify(e.target.value);
  });
  document.getElementById("ec-name").addEventListener("input", (e) => {
    document.getElementById("ec-slug").value = slugify(e.target.value);
  });
  document.getElementById("es-name").addEventListener("input", (e) => {
    document.getElementById("es-slug").value = slugify(e.target.value);
  });

  // ADD form: type change → update GST dropdown
  document
    .getElementById("f-type")
    .addEventListener("change", (e) => updateGSTDropdown(e.target.value));

  // ADD form: GST select change → refresh badge
  const fGstSel = document.getElementById("f-gst-rate");
  if (fGstSel)
    fGstSel.addEventListener("change", function () {
      _refreshBadge(
        document.getElementById("f-gst-badge"),
        parseFloat(this.value)
      );
    });

  // EDIT modal: type change → update GST dropdown
  document
    .getElementById("ec-type")
    .addEventListener("change", (e) => updateEditGSTDropdown(e.target.value));

  // EDIT modal: GST select change → refresh badge
  const ecGstSel = document.getElementById("ec-gst-rate");
  if (ecGstSel)
    ecGstSel.addEventListener("change", function () {
      _refreshBadge(
        document.getElementById("ec-gst-badge"),
        parseFloat(this.value)
      );
    });

  document
    .getElementById("confirmActionBtn")
    .addEventListener("click", confirmDelete);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeEditCatModal();
      closeEditSubModal();
      closeConfirmModal();
      closeLogoutModal();
    }
  });
}

/* ── Stats ── */
async function loadStats() {
  const d = await apiFetch("/admin/categories/stats");
  if (!d) return;
  animCount("sv-total", d.total);
  animCount("sv-showcase", d.showcase);
  animCount("sv-service", d.service);
  animCount("sv-product", d.product);
  document.getElementById("tab-cat-count").textContent = d.total;
  buildDonut(d);
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

function buildDonut(d) {
  const ctx = document.getElementById("donutChart").getContext("2d");
  if (donutChart) donutChart.destroy();
  const dark = isDark(),
    total = d.total || 1;
  donutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Showcase", "Service", "Product"],
      datasets: [
        {
          data: [d.showcase, d.service, d.product],
          backgroundColor: [
            "rgba(230,10,234,.85)",
            "rgba(59,130,246,.85)",
            "rgba(249,115,22,.85)",
          ],
          borderColor: dark ? "#130d1a" : "#fff",
          borderWidth: 3,
          hoverOffset: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: dark ? "#2b1d3c" : "#fff",
          titleColor: dark ? "#f0e8ff" : "#1a1a2e",
          bodyColor: dark ? "#c4aedd" : "#6b5880",
          borderColor: dark ? "#3d2654" : "#f0e4f9",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) =>
              `  ${ctx.label}: ${ctx.raw} (${Math.round(
                (ctx.raw / total) * 100
              )}%)`,
          },
        },
      },
      animation: { animateRotate: true, duration: 900 },
    },
  });
  const pairs = [
    {
      label: "Showcase",
      count: d.showcase,
      color: "rgba(230,10,234,.85)",
      pctBg: "var(--primary-light)",
      pctColor: "var(--primary)",
    },
    {
      label: "Service",
      count: d.service,
      color: "rgba(59,130,246,.85)",
      pctBg: "rgba(59,130,246,.12)",
      pctColor: "var(--blue)",
    },
    {
      label: "Product",
      count: d.product,
      color: "rgba(249,115,22,.85)",
      pctBg: "rgba(249,115,22,.12)",
      pctColor: "var(--orange)",
    },
  ];
  document.getElementById("chartLegend").innerHTML = pairs
    .map(
      (p) =>
        `<div class="chart-legend-item"><div class="cl-dot" style="background:${
          p.color
        }"></div><span class="cl-label">${
          p.label
        }</span><span class="cl-count">${
          p.count
        } cats</span><span class="cl-pct" style="background:${p.pctBg};color:${
          p.pctColor
        }">${Math.round((p.count / total) * 100)}%</span></div>`
    )
    .join("");
}
function rebuildDonut() {
  apiFetch("/admin/categories/stats").then((d) => {
    if (d) buildDonut(d);
  });
}

/* ── Load all categories for dropdowns ── */
async function loadAllCategories() {
  const d = await apiFetch("/admin/categories?limit=200&page=1");
  if (!d) return;
  allCategories = d.categories || [];
  const subCatFilter = document.getElementById("subCatFilter");
  subCatFilter.innerHTML = '<option value="">All Categories</option>';
  allCategories.forEach((c) => {
    subCatFilter.innerHTML += `<option value="${c.category_id}">${
      c.icon || ""
    } ${escHtml(c.category_name)} (${c.post_type})</option>`;
  });
  const sfCat = document.getElementById("sf-category");
  sfCat.innerHTML =
    '<option value="">Select category…</option>' +
    allCategories
      .map(
        (c) =>
          `<option value="${c.category_id}">${c.icon || ""} ${escHtml(
            c.category_name
          )} (${c.post_type})</option>`
      )
      .join("");
  document.getElementById("es-category").innerHTML = allCategories
    .map(
      (c) =>
        `<option value="${c.category_id}">${c.icon || ""} ${escHtml(
          c.category_name
        )} (${c.post_type})</option>`
    )
    .join("");
}

/* ── Filters ── */
function setupFilters() {
  let deb;
  document.getElementById("catSearch").addEventListener("input", (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      catState.search = e.target.value;
      catState.page = 1;
      loadCategories();
    }, 300);
  });
  document.getElementById("catTypeFilter").addEventListener("change", (e) => {
    catState.type = e.target.value;
    catState.page = 1;
    loadCategories();
  });
  document.getElementById("catStatusFilter").addEventListener("change", (e) => {
    catState.status = e.target.value;
    catState.page = 1;
    loadCategories();
  });
  let deb2;
  document.getElementById("subSearch").addEventListener("input", (e) => {
    clearTimeout(deb2);
    deb2 = setTimeout(() => {
      subState.search = e.target.value;
      subState.page = 1;
      loadSubcategories();
    }, 300);
  });
  document.getElementById("subCatFilter").addEventListener("change", (e) => {
    subState.category_id = e.target.value;
    subState.page = 1;
    loadSubcategories();
  });
  document.getElementById("subTypeFilter").addEventListener("change", (e) => {
    subState.type = e.target.value;
    subState.page = 1;
    loadSubcategories();
  });
  document.getElementById("subStatusFilter").addEventListener("change", (e) => {
    subState.status = e.target.value;
    subState.page = 1;
    loadSubcategories();
  });
}

/* ── TABS ── */
function switchTab(tab) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(`tab-${tab}`)?.classList.add("active");
  ["categories", "subcategories", "gst"].forEach((t) => {
    const el = document.getElementById(`panel-${t}`);
    if (el) el.style.display = "none";
  });
  document.getElementById(`panel-${tab}`).style.display = "block";
  if (tab === "gst") loadGSTRates();
}

/* ── CATEGORIES ── */
function setCatView(v) {
  catState.view = v;
  document
    .getElementById("catGridBtn")
    .classList.toggle("active", v === "grid");
  document
    .getElementById("catListBtn")
    .classList.toggle("active", v === "list");
  document.getElementById("catGridView").style.display =
    v === "grid" ? "grid" : "none";
  document.getElementById("catListView").style.display =
    v === "list" ? "block" : "none";
  loadCategories();
}
function sortCat(field) {
  if (catState.sort === field)
    catState.dir = catState.dir === "asc" ? "desc" : "asc";
  else {
    catState.sort = field;
    catState.dir = "asc";
  }
  loadCategories();
}
async function loadCategories() {
  const grid = document.getElementById("catGridView"),
    tbody = document.getElementById("catTableBody");
  if (catState.view === "grid") grid.innerHTML = renderSkels(8);
  else tbody.innerHTML = renderTableSkels(8, 8);
  const p = new URLSearchParams({
    search: catState.search,
    post_type: catState.type,
    status: catState.status,
    page: catState.page,
    limit: catState.limit,
    sort: catState.sort || "display_order",
    dir: catState.dir || "asc",
  });
  const d = await apiFetch(`/admin/categories?${p}`);
  if (!d) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-layer-group"></i><p>Failed to load</p></div>`;
    return;
  }
  catState.total = d.total;
  catState.pages = d.pages;
  if (!d.categories.length) {
    const h = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-layer-group"></i><p>No categories found</p></div>`;
    if (catState.view === "grid") grid.innerHTML = h;
    else tbody.innerHTML = `<tr><td colspan="8">${h}</td></tr>`;
    document.getElementById("catPagination").innerHTML = "";
    return;
  }
  if (catState.view === "grid")
    grid.innerHTML = d.categories.map((c, i) => renderCatCard(c, i)).join("");
  else
    tbody.innerHTML = d.categories.map((c, i) => renderCatRow(c, i)).join("");
  renderPagination("catPagination", catState, gotoPageCat);
}
function renderCatCard(c, idx) {
  const delay = (idx % 20) * 0.035;
  const status = c.is_active
    ? '<span class="status-badge active"><i class="fas fa-circle" style="font-size:.4rem"></i> Active</span>'
    : '<span class="status-badge inactive"><i class="fas fa-circle" style="font-size:.4rem"></i> Inactive</span>';
  return `<div class="cat-card ${
    c.post_type
  }" style="animation-delay:${delay}s">
  <div class="cat-card-head"><div class="cat-icon-wrap">${
    c.icon || "📁"
  }</div><div style="flex:1;min-width:0"><div class="cat-name">${escHtml(
    c.category_name
  )}</div><div class="cat-slug">${escHtml(c.category_slug)}</div></div></div>
  <div class="cat-meta"><span class="type-badge ${c.post_type}">${
    c.post_type
  }</span><span class="order-badge"><i class="fas fa-sort-numeric-up" style="font-size:.6rem"></i> #${
    c.display_order
  }</span>${status}</div>
  <div class="cat-stats"><div class="cat-stat"><div class="cat-stat-val">${
    c.post_count || 0
  }</div><div class="cat-stat-key">Posts</div></div><div class="cat-stat"><div class="cat-stat-val">${
    c.subcat_count || 0
  }</div><div class="cat-stat-key">Subcats</div></div></div>
  <div class="cat-footer"><label class="toggle-wrap" onclick="event.stopPropagation()"><label class="toggle"><input type="checkbox" ${
    c.is_active ? "checked" : ""
  } onchange="toggleCategoryStatus(${
    c.category_id
  },this.checked)"><span class="toggle-slider"></span></label><span class="toggle-label">${
    c.is_active ? "Active" : "Inactive"
  }</span></label><div class="cat-actions"><button class="cat-btn" onclick="openEditCatModal(${
    c.category_id
  })"><i class="fas fa-pen"></i></button><button class="cat-btn danger" onclick="openConfirmDeleteCat(${
    c.category_id
  },'${escHtml(
    c.category_name
  )}')"><i class="fas fa-trash"></i></button></div></div>
</div>`;
}
function renderCatRow(c, idx) {
  const delay = (idx % 20) * 0.025;
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both"><td><span class="tbl-icon">${
    c.icon || "📁"
  }</span></td><td><div class="tbl-name">${escHtml(
    c.category_name
  )}</div><div class="tbl-slug">${escHtml(
    c.category_slug
  )}</div></td><td><span class="type-badge ${c.post_type}">${
    c.post_type
  }</span></td><td style="font-weight:700">${
    c.display_order
  }</td><td><label class="toggle"><input type="checkbox" ${
    c.is_active ? "checked" : ""
  } onchange="toggleCategoryStatus(${
    c.category_id
  },this.checked)"><span class="toggle-slider"></span></label></td><td style="font-weight:700">${
    c.post_count || 0
  }</td><td style="font-weight:700">${
    c.subcat_count || 0
  }</td><td><div class="act-btns"><button class="act-btn" onclick="openEditCatModal(${
    c.category_id
  })"><i class="fas fa-pen"></i></button><button class="act-btn danger" onclick="openConfirmDeleteCat(${
    c.category_id
  },'${escHtml(
    c.category_name
  )}')"><i class="fas fa-trash"></i></button></div></td></tr>`;
}
function renderSkels(n) {
  return Array(n)
    .fill(0)
    .map(
      () =>
        `<div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:12px"><div class="skeleton" style="width:46px;height:46px;border-radius:13px;flex-shrink:0"></div><div style="flex:1"><div class="skeleton" style="height:14px;width:70%;margin-bottom:6px"></div><div class="skeleton" style="height:10px;width:50%"></div></div></div><div style="display:flex;gap:6px"><div class="skeleton" style="height:22px;width:70px;border-radius:20px"></div><div class="skeleton" style="height:22px;width:50px;border-radius:20px"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="skeleton" style="height:48px;border-radius:10px"></div><div class="skeleton" style="height:48px;border-radius:10px"></div></div></div>`
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

/* ── SUBCATEGORIES ── */
function setSubView(v) {
  subState.view = v;
  document
    .getElementById("subGridBtn")
    .classList.toggle("active", v === "grid");
  document
    .getElementById("subListBtn")
    .classList.toggle("active", v === "list");
  document.getElementById("subGridView").style.display =
    v === "grid" ? "grid" : "none";
  document.getElementById("subListView").style.display =
    v === "list" ? "block" : "none";
  loadSubcategories();
}
async function loadSubcategories() {
  const gridEl = document.getElementById("subGridView"),
    tbody = document.getElementById("subTableBody");
  if (subState.view === "grid") gridEl.innerHTML = renderSkels(8);
  else tbody.innerHTML = renderTableSkels(6, 7);
  const p = new URLSearchParams({
    search: subState.search,
    category_id: subState.category_id,
    post_type: subState.type,
    status: subState.status,
    page: subState.page,
    limit: subState.limit,
  });
  const d = await apiFetch(`/admin/subcategories?${p}`);
  if (!d) {
    const err = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-exclamation-triangle"></i><p>Failed to load</p></div>`;
    if (subState.view === "grid") gridEl.innerHTML = err;
    else tbody.innerHTML = `<tr><td colspan="7">${err}</td></tr>`;
    return;
  }
  subState.total = d.total;
  subState.pages = d.pages;
  document.getElementById("tab-sub-count").textContent = d.total;
  if (!d.subcategories.length) {
    const emp = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-sitemap"></i><p>No subcategories found</p></div>`;
    if (subState.view === "grid") gridEl.innerHTML = emp;
    else tbody.innerHTML = `<tr><td colspan="7">${emp}</td></tr>`;
    document.getElementById("subPagination").innerHTML = "";
    return;
  }
  if (subState.view === "grid")
    gridEl.innerHTML = d.subcategories
      .map((s, i) => renderSubCard(s, i))
      .join("");
  else
    tbody.innerHTML = d.subcategories
      .map((s, i) => renderSubRow(s, i))
      .join("");
  renderPagination("subPagination", subState, gotoPageSub);
}
function renderSubCard(s, idx) {
  const delay = (idx % 20) * 0.03;
  return `<div class="sub-card ${
    s.post_type || ""
  }" style="animation-delay:${delay}s"><div class="sub-card-head"><div class="sub-parent-icon">${
    s.parent_icon || "📁"
  }</div><div style="flex:1;min-width:0"><div class="sub-name">${escHtml(
    s.subcategory_name
  )}</div><div class="sub-slug">${escHtml(
    s.subcategory_slug
  )}</div></div></div><div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center"><span class="type-badge ${
    s.post_type || ""
  }">${
    s.post_type || "—"
  }</span><span class="sub-parent-tag"><i class="fas fa-folder" style="font-size:.5rem"></i> ${escHtml(
    s.parent_name || "—"
  )}</span><span class="order-badge">#${
    s.display_order
  }</span></div><div class="sub-card-footer"><label class="toggle-wrap" onclick="event.stopPropagation()"><label class="toggle"><input type="checkbox" ${
    s.is_active ? "checked" : ""
  } onchange="toggleSubcategoryStatus(${
    s.subcategory_id
  },this.checked)"><span class="toggle-slider"></span></label><span class="toggle-label">${
    s.is_active ? "Active" : "Inactive"
  }</span></label><div class="sub-card-actions"><button class="cat-btn" onclick="openEditSubModal(${
    s.subcategory_id
  },'${escHtml(s.subcategory_name)}','${escHtml(s.subcategory_slug)}',${
    s.display_order
  },${s.category_id},${s.is_active ? 1 : 0},'${escHtml(
    s.description || ""
  )}')"><i class="fas fa-pen"></i></button><button class="cat-btn danger" onclick="openConfirmDeleteSub(${
    s.subcategory_id
  },'${escHtml(
    s.subcategory_name
  )}')"><i class="fas fa-trash"></i></button></div></div></div>`;
}
function renderSubRow(s, idx) {
  const delay = (idx % 20) * 0.025;
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both"><td><div class="tbl-name">${escHtml(
    s.subcategory_name
  )}</div></td><td><span style="font-family:monospace;font-size:.72rem;color:var(--text-secondary)">${escHtml(
    s.subcategory_slug
  )}</span></td><td><div style="display:flex;align-items:center;gap:6px"><span style="font-size:1rem">${
    s.parent_icon || "📁"
  }</span><div style="font-size:.8rem;font-weight:700">${escHtml(
    s.parent_name || "—"
  )}</div></div></td><td><span class="type-badge ${s.post_type || ""}">${
    s.post_type || "—"
  }</span></td><td style="font-weight:700">${
    s.display_order
  }</td><td><label class="toggle"><input type="checkbox" ${
    s.is_active ? "checked" : ""
  } onchange="toggleSubcategoryStatus(${
    s.subcategory_id
  },this.checked)"><span class="toggle-slider"></span></label></td><td><div class="act-btns"><button class="act-btn" onclick="openEditSubModal(${
    s.subcategory_id
  },'${escHtml(s.subcategory_name)}','${escHtml(s.subcategory_slug)}',${
    s.display_order
  },${s.category_id},${s.is_active ? 1 : 0},'${escHtml(
    s.description || ""
  )}')"><i class="fas fa-pen"></i></button><button class="act-btn danger" onclick="openConfirmDeleteSub(${
    s.subcategory_id
  },'${escHtml(
    s.subcategory_name
  )}')"><i class="fas fa-trash"></i></button></div></td></tr>`;
}

/* ══════════════════════════════════════════════════════════════
   GST RATES TAB
══════════════════════════════════════════════════════════════ */
async function loadGSTRates() {
  const tbody = document.getElementById("gstRatesTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-secondary)"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
  const postType = document.getElementById("gstTypeFilter")?.value || "";
  const d = await apiFetch(
    `/admin/gst-rates?${new URLSearchParams({
      post_type: postType,
      page: gstState.page,
      limit: gstState.limit,
    })}`
  );
  if (!d || !d.success) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--red)"><i class="fas fa-exclamation-triangle"></i> Failed to load. Run migration SQL first.</td></tr>`;
    return;
  }
  gstState.total = d.total;
  gstState.pages = d.pages;
  const tc = document.getElementById("tab-gst-count");
  if (tc) tc.textContent = d.total;
  if (!d.gst_rates.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-secondary)">No GST rates found.</td></tr>`;
    return;
  }

  tbody.innerHTML = d.gst_rates
    .map((r) => {
      const rate = parseFloat(r.gst_rate),
        isShowcase = r.post_type === "showcase";
      const rateColor =
        rate === 0
          ? "#10b981"
          : rate <= 5
          ? "#3b82f6"
          : rate <= 12
          ? "#e60aea"
          : "#f97316";
      const rateBg =
        rate === 0
          ? "rgba(16,185,129,.12)"
          : rate <= 5
          ? "rgba(59,130,246,.12)"
          : rate <= 12
          ? "rgba(230,10,234,.12)"
          : "rgba(249,115,22,.12)";
      const subCell = r.subcategory_name
        ? `<span style="background:var(--card-border);padding:2px 8px;border-radius:12px;font-size:.75rem">${escHtml(
            r.subcategory_name
          )}</span>`
        : '<em style="opacity:.4">Category-wide</em>';
      const catCell = `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.2rem">${
        r.category_icon || "📁"
      }</span><div><div style="font-weight:700;font-size:.83rem">${escHtml(
        r.category_name
      )}</div><div style="font-size:.68rem;color:var(--text-secondary)">${
        r.post_type
      }</div></div></div>`;

      if (isShowcase)
        return `<tr id="gst-row-${r.id}">
      <td>${catCell}</td><td style="font-size:.8rem;color:var(--text-secondary)">${subCell}</td>
      <td><span class="type-badge showcase">showcase</span></td>
      <td><span style="font-size:.73rem;color:var(--text-secondary);font-style:italic">N/A</span></td>
      <td><div style="display:flex;align-items:center;gap:8px"><span style="background:rgba(16,185,129,.15);color:#10b981;font-size:.78rem;font-weight:800;padding:4px 12px;border-radius:20px;border:1px solid rgba(16,185,129,.3)"><i class="fas fa-lock" style="font-size:.6rem;margin-right:4px"></i> 0% — Exempt</span><span style="font-size:.65rem;color:var(--text-secondary)">Locked</span></div></td>
      <td><label class="toggle"><input type="checkbox" ${
        r.is_active ? "checked" : ""
      } onchange="updateGSTField(${
          r.id
        },'is_active',this.checked?1:0)"><span class="toggle-slider"></span></label></td>
      <td><button class="act-btn" onclick="switchTab('categories')" style="font-size:.7rem"><i class="fas fa-layer-group"></i></button></td>
    </tr>`;

      const opts = (GST_OPTIONS[r.post_type] || GST_OPTIONS.product)
        .map(
          (o) =>
            `<option value="${o.value}" ${
              parseFloat(rate) === parseFloat(o.value) ? "selected" : ""
            }>${o.label}</option>`
        )
        .join("");
      return `<tr id="gst-row-${r.id}">
      <td>${catCell}</td><td style="font-size:.8rem;color:var(--text-secondary)">${subCell}</td>
      <td><span class="type-badge ${r.post_type}">${r.post_type}</span></td>
      <td><input type="text" value="${escHtml(
        r.hsn_sac_code || ""
      )}" placeholder="HSN/SAC" style="width:95px;padding:5px 8px;border-radius:7px;border:1px solid var(--card-border);background:var(--main-bg);color:var(--text-primary);font-size:.75rem;font-family:monospace;transition:.2s" onchange="updateGSTField(${
        r.id
      },'hsn_sac_code',this.value)" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--card-border)'"/></td>
      <td><div style="display:flex;align-items:center;gap:8px">
        <select style="padding:5px 10px;border-radius:8px;border:1px solid var(--card-border);background:var(--main-bg);color:${rateColor};font-weight:700;font-size:.82rem;cursor:pointer;max-width:240px" onchange="updateGSTField(${
        r.id
      },'gst_rate',parseFloat(this.value),this)">${opts}</select>
        <span id="gst-chip-${
          r.id
        }" style="background:${rateBg};color:${rateColor};font-size:.68rem;font-weight:800;padding:3px 9px;border-radius:20px;white-space:nowrap">${
        rate === 0 ? "Exempt" : `${rate}% GST`
      }</span>
      </div></td>
      <td><label class="toggle"><input type="checkbox" ${
        r.is_active ? "checked" : ""
      } onchange="updateGSTField(${
        r.id
      },'is_active',this.checked?1:0)"><span class="toggle-slider"></span></label></td>
      <td><button class="act-btn" onclick="switchTab('categories')" style="font-size:.7rem"><i class="fas fa-layer-group"></i></button></td>
    </tr>`;
    })
    .join("");
  renderPagination("gstPagination", gstState, gotoPageGST);
}

async function updateGSTField(gstId, field, value, selectEl) {
  if (field === "gst_rate") {
    const row = document.getElementById(`gst-row-${gstId}`);
    if (row?.querySelector(".type-badge.showcase")) {
      showToast("Showcase is always GST Exempt", "warn");
      if (selectEl) selectEl.value = "0";
      return;
    }
  }
  const r = await apiFetch(`/admin/gst-rates/${gstId}`, {
    method: "PUT",
    body: JSON.stringify({ [field]: value }),
  });
  if (r?.success) {
    showToast(`Updated ✓`, "success");
    if (field === "gst_rate") {
      const chip = document.getElementById(`gst-chip-${gstId}`);
      if (!chip) return;
      const pct = parseFloat(value);
      const [bg, fg] =
        pct === 0
          ? ["rgba(16,185,129,.12)", "#10b981"]
          : pct <= 5
          ? ["rgba(59,130,246,.12)", "#3b82f6"]
          : pct <= 12
          ? ["rgba(230,10,234,.12)", "#e60aea"]
          : ["rgba(249,115,22,.12)", "#f97316"];
      chip.textContent = pct === 0 ? "Exempt" : `${pct}% GST`;
      chip.style.background = bg;
      chip.style.color = fg;
      if (selectEl) selectEl.style.color = fg;
    }
  } else {
    showToast(r?.error || "Failed to update", "error");
    loadGSTRates();
  }
}

async function bulkUpdateGST() {
  const postType = document.getElementById("bulkGstType")?.value;
  const gstRate = parseFloat(
    document.getElementById("bulkGstRate")?.value || 0
  );
  if (!postType) {
    showToast("Select a post type first", "warn");
    return;
  }
  if (postType === "showcase" && gstRate !== 0) {
    showToast("Showcase must stay at 0% GST", "warn");
    return;
  }
  if (!confirm(`Apply ${gstRate}% to ALL ${postType} categories?`)) return;
  const btn = document.getElementById("bulkGstApplyBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying…';
  }
  const r = await apiFetch("/admin/gst-rates/bulk-update", {
    method: "PUT",
    body: JSON.stringify({ post_type: postType, gst_rate: gstRate }),
  });
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sync"></i> Apply Bulk Update';
  }
  if (r?.success) {
    showToast(r.message || `${r.updated} categories updated`, "success");
    loadGSTRates();
  } else showToast(r?.error || "Bulk update failed", "error");
}
function gotoPageGST(p) {
  if (p < 1 || p > gstState.pages || p === gstState.page) return;
  gstState.page = p;
  loadGSTRates();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── Pagination ── */
function renderPagination(cid, state, fn) {
  const pag = document.getElementById(cid);
  if (!pag) return;
  const start = (state.page - 1) * state.limit + 1,
    end = Math.min(state.page * state.limit, state.total);
  let btns = `<button class="pag-btn" onclick="${fn.name}(${state.page - 1})" ${
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
    }" onclick="${fn.name}(${i})">${i}</button>`;
  }
  btns += `<button class="pag-btn" onclick="${fn.name}(${state.page + 1})" ${
    state.page >= state.pages ? "disabled" : ""
  }><i class="fas fa-chevron-right"></i></button>`;
  pag.innerHTML = `<div class="pag-info">Showing <strong>${start}–${end}</strong> of <strong>${state.total}</strong></div><div class="pag-btns">${btns}</div>`;
}
function gotoPageCat(p) {
  if (p < 1 || p > catState.pages || p === catState.page) return;
  catState.page = p;
  loadCategories();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}
function gotoPageSub(p) {
  if (p < 1 || p > subState.pages || p === subState.page) return;
  subState.page = p;
  loadSubcategories();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── ADD CATEGORY FORM ── */
function resetAddForm() {
  ["f-type", "f-name", "f-slug", "f-desc", "f-order"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  document.getElementById("f-icon").value = "";
  const d = document.getElementById("fEmojiDisplay");
  d.textContent = "Pick emoji…";
  d.classList.add("emoji-placeholder");
  const gs = document.getElementById("f-gst-rate");
  if (gs) {
    gs.innerHTML = '<option value="12">Select post type first…</option>';
    gs.disabled = true;
  }
  const gb = document.getElementById("f-gst-badge");
  if (gb) {
    gb.textContent = "Select type first";
    gb.style.background = "var(--card-border)";
    gb.style.color = "var(--text-secondary)";
  }
  const gn = document.getElementById("f-gst-lock-note");
  if (gn) gn.style.display = "none";
}
async function submitCategoryForm() {
  const postType = document.getElementById("f-type").value.trim();
  const gstRate =
    postType === "showcase"
      ? 0
      : parseFloat(document.getElementById("f-gst-rate")?.value || 0);
  const payload = {
    post_type: postType,
    icon: document.getElementById("f-icon").value.trim() || null,
    category_name: document.getElementById("f-name").value.trim(),
    category_slug: document.getElementById("f-slug").value.trim(),
    description: document.getElementById("f-desc").value.trim() || null,
    display_order: parseInt(document.getElementById("f-order").value) || 0,
    gst_rate: gstRate,
  };
  if (!payload.post_type || !payload.category_name || !payload.category_slug) {
    showToast("Fill in all required fields", "warn");
    return;
  }
  const btn = document.getElementById("f-submit-btn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const r = await apiFetch("/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-plus"></i> Add Category';
  if (r?.success) {
    showToast(`Category created! GST: ${gstRate}%`, "success");
    resetAddForm();
    loadStats();
    loadCategories();
    loadAllCategories();
  } else showToast(r?.error || "Failed to save", "error");
}

/* ── ADD SUBCATEGORY FORM ── */
function resetAddSubForm() {
  ["sf-category", "sf-name", "sf-slug", "sf-desc", "sf-order"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
}
async function submitSubcategoryForm() {
  const payload = {
    category_id: parseInt(document.getElementById("sf-category").value),
    subcategory_name: document.getElementById("sf-name").value.trim(),
    subcategory_slug: document.getElementById("sf-slug").value.trim(),
    description: document.getElementById("sf-desc").value.trim() || null,
    display_order: parseInt(document.getElementById("sf-order").value) || 0,
  };
  if (
    !payload.category_id ||
    !payload.subcategory_name ||
    !payload.subcategory_slug
  ) {
    showToast("Fill in all required fields", "warn");
    return;
  }
  const btn = document.getElementById("sf-submit-btn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const r = await apiFetch("/admin/subcategories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-plus"></i> Add Subcategory';
  if (r?.success) {
    showToast("Subcategory created!", "success");
    resetAddSubForm();
    loadSubcategories();
  } else showToast(r?.error || "Failed to save", "error");
}

/* ── EDIT CATEGORY MODAL ── */
async function openEditCatModal(catId) {
  const c = await apiFetch(`/admin/categories/${catId}`);
  if (!c) {
    showToast("Failed to load category", "error");
    return;
  }

  document.getElementById("ec-id").value = c.category_id;
  document.getElementById("ec-type").value = c.post_type;
  document.getElementById("ec-name").value = c.category_name;
  document.getElementById("ec-slug").value = c.category_slug;
  document.getElementById("ec-desc").value = c.description || "";
  document.getElementById("ec-order").value = c.display_order;
  document.getElementById("ec-active").value = c.is_active ? "1" : "0";
  document.getElementById("ec-icon").value = c.icon || "";

  const display = document.getElementById("ecEmojiDisplay");
  if (c.icon) {
    display.textContent = c.icon;
    display.classList.remove("emoji-placeholder");
  } else {
    display.textContent = "Pick emoji…";
    display.classList.add("emoji-placeholder");
  }

  // ── Fetch current GST rate for this category ──────────────────────────────
  let currentGst = GST_DEFAULTS[c.post_type] ?? 0;
  try {
    const gstData = await apiFetch(
      `/admin/gst-rates?post_type=${c.post_type}&page=1&limit=200`
    );
    if (gstData?.success && gstData.gst_rates) {
      // Find rate for this specific category (subcategory_id IS NULL = category-wide)
      const match = gstData.gst_rates.find(
        (r) => r.category_id === c.category_id && !r.subcategory_id
      );
      if (match) {
        currentGst = parseFloat(match.gst_rate);
        document.getElementById("ec-gst-id").value = match.id; // store for later save
      }
    }
  } catch {}

  // Populate the edit modal's GST dropdown with ec-* IDs
  updateEditGSTDropdown(c.post_type, currentGst);
  document.getElementById("editCatModal").classList.add("show");
}

function closeEditCatModal() {
  document.getElementById("editCatModal").classList.remove("show");
}

async function submitEditCatModal() {
  const id = document.getElementById("ec-id").value;
  const postType = document.getElementById("ec-type").value;
  const gstRate =
    postType === "showcase"
      ? 0
      : parseFloat(document.getElementById("ec-gst-rate")?.value || 0);
  const gstId = document.getElementById("ec-gst-id")?.value;

  const payload = {
    post_type: postType,
    icon: document.getElementById("ec-icon").value || null,
    category_name: document.getElementById("ec-name").value.trim(),
    category_slug: document.getElementById("ec-slug").value.trim(),
    description: document.getElementById("ec-desc").value.trim() || null,
    display_order: parseInt(document.getElementById("ec-order").value) || 0,
    is_active: parseInt(document.getElementById("ec-active").value),
    gst_rate: gstRate,
  };
  if (!payload.post_type || !payload.category_name || !payload.category_slug) {
    showToast("Fill in all required fields", "warn");
    return;
  }

  const btn = document.getElementById("ecSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

  // Save category
  const r = await apiFetch(`/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  // Also update GST rate if we have the gst_rate_id
  if (r?.success && gstId) {
    await apiFetch(`/admin/gst-rates/${gstId}`, {
      method: "PUT",
      body: JSON.stringify({ gst_rate: gstRate }),
    });
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
  if (r?.success) {
    showToast(`Category updated! GST: ${gstRate}%`, "success");
    closeEditCatModal();
    loadStats();
    loadCategories();
    loadAllCategories();
    loadGSTRates();
  } else showToast(r?.error || "Failed to update", "error");
}

/* ── EDIT SUBCATEGORY MODAL ── */
function openEditSubModal(id, name, slug, order, catId, isActive, desc) {
  document.getElementById("es-id").value = id;
  document.getElementById("es-name").value = name;
  document.getElementById("es-slug").value = slug;
  document.getElementById("es-order").value = order;
  document.getElementById("es-category").value = catId;
  document.getElementById("es-active").value = isActive;
  document.getElementById("es-desc").value = desc || "";
  document.getElementById("editSubModal").classList.add("show");
}
function closeEditSubModal() {
  document.getElementById("editSubModal").classList.remove("show");
}
async function submitEditSubModal() {
  const id = document.getElementById("es-id").value;
  const payload = {
    subcategory_name: document.getElementById("es-name").value.trim(),
    subcategory_slug: document.getElementById("es-slug").value.trim(),
    display_order: parseInt(document.getElementById("es-order").value) || 0,
    category_id: parseInt(document.getElementById("es-category").value),
    is_active: parseInt(document.getElementById("es-active").value),
    description: document.getElementById("es-desc").value.trim() || null,
  };
  if (!payload.subcategory_name || !payload.subcategory_slug) {
    showToast("Name and slug required", "warn");
    return;
  }
  const btn = document.getElementById("esSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const r = await apiFetch(`/admin/subcategories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
  if (r?.success) {
    showToast("Subcategory updated!", "success");
    closeEditSubModal();
    loadSubcategories();
  } else showToast(r?.error || "Failed to update", "error");
}

/* ── Toggle / Delete ── */
async function toggleCategoryStatus(catId, isActive) {
  const r = await apiFetch(`/admin/categories/${catId}/toggle`, {
    method: "POST",
  });
  if (r?.success) {
    showToast(`Category ${isActive ? "activated" : "deactivated"}`, "success");
    loadStats();
    loadCategories();
  } else {
    showToast(r?.error || "Failed", "error");
    loadCategories();
  }
}
async function toggleSubcategoryStatus(subId, isActive) {
  const r = await apiFetch(`/admin/subcategories/${subId}/toggle`, {
    method: "POST",
  });
  if (r?.success)
    showToast(
      `Subcategory ${isActive ? "activated" : "deactivated"}`,
      "success"
    );
  else {
    showToast(r?.error || "Failed", "error");
    loadSubcategories();
  }
}
function openConfirmDeleteCat(catId, name) {
  pendingDeleteId = catId;
  pendingDeleteType = "category";
  document.getElementById("confirmTitle").textContent = `Delete "${name}"?`;
  document.getElementById("confirmDesc").textContent =
    "This permanently deletes the category and all its subcategories.";
  document.getElementById("confirmModal").classList.add("show");
}
function openConfirmDeleteSub(subId, name) {
  pendingDeleteId = subId;
  pendingDeleteType = "subcategory";
  document.getElementById("confirmTitle").textContent = `Delete "${name}"?`;
  document.getElementById("confirmDesc").textContent =
    "This subcategory will be permanently deleted.";
  document.getElementById("confirmModal").classList.add("show");
}
function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("show");
  pendingDeleteId = null;
  pendingDeleteType = null;
}
async function confirmDelete() {
  if (!pendingDeleteId) return;
  const btn = document.getElementById("confirmActionBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  const path =
    pendingDeleteType === "category"
      ? `/admin/categories/${pendingDeleteId}`
      : `/admin/subcategories/${pendingDeleteId}`;
  const r = await apiFetch(path, { method: "DELETE" });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-trash"></i> Delete';
  const type = pendingDeleteType;
  closeConfirmModal();
  if (r?.success) {
    showToast("Deleted", "success");
    if (type === "category") {
      loadStats();
      loadCategories();
      loadAllCategories();
    } else loadSubcategories();
  } else showToast(r?.error || "Failed", "error");
}
document.getElementById("editCatModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("editCatModal")) closeEditCatModal();
});
document.getElementById("editSubModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("editSubModal")) closeEditSubModal();
});
document.getElementById("confirmModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("confirmModal")) closeConfirmModal();
});

/* ── Toast ── */
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
