/* ── Config ──────────────────────────────── */
const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const token = () =>
  localStorage.getItem("adminAuthToken") ||
  sessionStorage.getItem("adminAuthToken") ||
  "";

/* ── Auth ────────────────────────────────── */
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

/* ── Sidebar ─────────────────────────────── */
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
        page: "knowledge-base",
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

/* ── Helpers ─────────────────────────────── */
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
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}
function openModal(id) {
  document.getElementById(id).classList.add("show");
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
function slugify(t) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/* ── State ───────────────────────────────── */
let currentTab = "articles";
let aView = localStorage.getItem("kbArticleView") || "grid";
let categories = [];
let aState = {
  search: "",
  category: "",
  featured: "",
  page: 1,
  limit: 12,
  total: 0,
  pages: 0,
};
let fState = {
  search: "",
  category: "",
  popular: "",
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
};
let cState = { search: "" };
let _deleteCallback = null;

/* ── Init ────────────────────────────────── */
function initPage() {
  setAView(aView, false);
  loadStats();
  loadCategories().then(() => {
    loadArticles();
  });
  ["articleModal", "faqModal", "catModal", "deleteModal"].forEach((id) => {
    document.getElementById(id).addEventListener("click", (e) => {
      if (e.target.id === id) closeModal(id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      ["articleModal", "faqModal", "catModal", "deleteModal"].forEach(
        closeModal
      );
  });
  // auto-slug from title
  document.getElementById("am-title").addEventListener("input", () => {
    if (!document.getElementById("am-id").value)
      document.getElementById("am-slug").value = slugify(
        document.getElementById("am-title").value
      );
  });
}

/* ── Tab switching ───────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  ["articles", "faqs", "categories"].forEach((t) => {
    document.getElementById(`tab-${t}`).classList.toggle("active", t === tab);
    document.getElementById(`panel-${t}`).style.display =
      t === tab ? "" : "none";
  });
  if (tab === "articles") loadArticles();
  else if (tab === "faqs") loadFaqs();
  else loadCategoriesList();
}

/* ── Stats ───────────────────────────────── */
async function loadStats() {
  const d = await apiFetch("/admin/knowledge/stats");
  if (!d || d._error) return;
  animCount("sv-articles", d.total_articles || 0);
  animCount("sv-faqs", d.total_faqs || 0);
  animCount("sv-cats", d.total_categories || 0);
  document.getElementById("sv-top-views").textContent =
    d.most_viewed_views || 0;
  document.getElementById("sv-top-title").textContent =
    d.most_viewed_title || "—";
  document.getElementById("sv-featured-count").textContent = `${
    d.featured_count || 0
  } featured`;
  document.getElementById("sv-popular-count").textContent = `${
    d.popular_count || 0
  } popular`;
}
function animCount(id, to) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 700,
    start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1),
      ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * ease);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = to;
  })(start);
}

/* ── Load categories (for dropdowns) ─────── */
async function loadCategories() {
  const d = await apiFetch("/admin/knowledge/categories");
  if (!d || d._error) return;
  categories = d.categories || [];
  document.getElementById("tc-cats").textContent = categories.length;
  // Fill filter selects
  ["a-cat-filter", "f-cat-filter"].forEach((sid) => {
    const sel = document.getElementById(sid);
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">All Categories</option>' +
      categories
        .map(
          (c) =>
            `<option value="${c.category_id}">${escHtml(
              c.category_name
            )}</option>`
        )
        .join("");
    sel.value = cur;
  });
  // Fill modal selects
  ["am-category", "fm-category"].forEach((sid) => {
    const sel = document.getElementById(sid);
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">— None —</option>' +
      categories
        .map(
          (c) =>
            `<option value="${c.category_id}">${escHtml(
              c.category_name
            )}</option>`
        )
        .join("");
    sel.value = cur;
  });
}

/* ═══════════════════════════════════════════
ARTICLES
═══════════════════════════════════════════ */
function setAView(mode, doLoad = true) {
  aView = mode;
  localStorage.setItem("kbArticleView", mode);
  document
    .getElementById("a-gridBtn")
    .classList.toggle("active", mode === "grid");
  document
    .getElementById("a-listBtn")
    .classList.toggle("active", mode === "list");
  document.getElementById("a-grid-view").style.display =
    mode === "grid" ? "" : "none";
  document.getElementById("a-list-view").style.display =
    mode === "list" ? "" : "none";
  if (doLoad) loadArticles();
}
let _aSearchTimer;
function onASearch() {
  clearTimeout(_aSearchTimer);
  _aSearchTimer = setTimeout(() => {
    aState.search = document.getElementById("a-search").value;
    aState.page = 1;
    loadArticles();
  }, 300);
}
function resetAFilters() {
  document.getElementById("a-search").value = "";
  document.getElementById("a-cat-filter").value = "";
  document.getElementById("a-feat-filter").value = "";
  aState = { ...aState, search: "", category: "", featured: "", page: 1 };
  loadArticles();
}
async function loadArticles() {
  aState.category = document.getElementById("a-cat-filter").value;
  aState.featured = document.getElementById("a-feat-filter").value;
  document.getElementById("a-card-skel").style.display = "grid";
  document.getElementById("articleCardGrid").style.display = "none";
  const params = new URLSearchParams({
    page: aState.page,
    limit: aState.limit,
    ...(aState.search ? { search: aState.search } : {}),
    ...(aState.category ? { category: aState.category } : {}),
    ...(aState.featured !== "" ? { featured: aState.featured } : {}),
  });
  const d = await apiFetch(`/admin/knowledge/articles?${params}`);
  document.getElementById("a-card-skel").style.display = "none";
  document.getElementById("articleCardGrid").style.display = "";
  if (!d || d._error) {
    toast("Failed to load articles", "error");
    return;
  }
  aState.total = d.total;
  aState.pages = d.pages;
  document.getElementById("tc-articles").textContent = d.total;
  renderArticles(d.articles || []);
  renderAPagination();
}
function renderArticles(articles) {
  const grid = document.getElementById("articleCardGrid");
  const tbody = document.getElementById("articleTableBody");
  const empty = document.getElementById("a-table-empty");
  if (!articles.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-newspaper"></i><p>No articles found.</p></div>`;
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = articles.map((a, i) => renderArticleCard(a, i)).join("");
  tbody.innerHTML = articles.map((a, i) => renderArticleRow(a, i)).join("");
}
function renderArticleCard(a, idx) {
  const delay = (idx % 12) * 0.04;
  const catName =
    categories.find((c) => c.category_id === a.category_id)?.category_name ||
    "—";
  const preview = a.content.replace(/<[^>]*>/g, "").substring(0, 120);
  return `<div class="tcard ${
    a.is_featured ? "featured" : ""
  }" style="animation-delay:${delay}s">
 <div class="tcard-head">
   <div class="tcard-id">#${a.article_id}</div>
   ${
     a.is_featured
       ? '<span class="badge featured"><i class="fas fa-star"></i> Featured</span>'
       : ""
   }
 </div>
 <div class="tcard-title">${escHtml(a.title)}</div>
 <div class="tcard-badges">
   <span class="badge cat"><i class="fas fa-folder"></i> ${escHtml(
     catName
   )}</span>
   <span class="badge views"><i class="fas fa-eye"></i> ${
     a.views || 0
   } views</span>
 </div>
 <div class="tcard-preview">${escHtml(preview)}</div>
 <div class="tcard-footer">
   <div class="tcard-date"><i class="fas fa-clock"></i> ${fmtDate(
     a.created_at
   )}</div>
   <div class="tcard-actions">
     <button class="tcard-btn edit" onclick="openArticleModal(${
       a.article_id
     })"><i class="fas fa-pen"></i> Edit</button>
     <button class="tcard-btn del" onclick="confirmDelete('article',${
       a.article_id
     },'${escHtml(a.title)}')"><i class="fas fa-trash"></i></button>
   </div>
 </div>
</div>`;
}
function renderArticleRow(a, idx) {
  const delay = (idx % 20) * 0.025;
  const catName =
    categories.find((c) => c.category_id === a.category_id)?.category_name ||
    "—";
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both">
 <td><span style="font-weight:800;color:var(--primary)">#${
   a.article_id
 }</span></td>
 <td style="max-width:220px">
   <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(
     a.title
   )}</div>
   ${
     a.slug
       ? `<div style="font-size:.65rem;color:var(--text-secondary);font-family:monospace">/${escHtml(
           a.slug
         )}</div>`
       : ""
   }
 </td>
 <td><span class="badge cat">${escHtml(catName)}</span></td>
 <td><span class="badge views"><i class="fas fa-eye"></i> ${
   a.views || 0
 }</span></td>
 <td>
   <label class="toggle-switch" title="${
     a.is_featured ? "Remove featured" : "Mark featured"
   }">
     <input type="checkbox" ${
       a.is_featured ? "checked" : ""
     } onchange="toggleArticleFeatured(${a.article_id},this.checked)"/>
     <div class="toggle-track"></div>
   </label>
 </td>
 <td style="font-size:.75rem;color:var(--text-secondary)">${fmtDate(
   a.created_at
 )}</td>
 <td><div class="act-btns">
   <button class="act-btn blue" onclick="openArticleModal(${
     a.article_id
   })" title="Edit"><i class="fas fa-pen"></i></button>
   <button class="act-btn red" onclick="confirmDelete('article',${
     a.article_id
   },'${escHtml(
    a.title
  )}')" title="Delete"><i class="fas fa-trash"></i></button>
 </div></td>
</tr>`;
}
function renderAPagination() {
  const from = (aState.page - 1) * aState.limit + 1,
    to = Math.min(aState.page * aState.limit, aState.total);
  document.getElementById("a-pag-info").textContent = aState.total
    ? `Showing ${from}–${to} of ${aState.total} articles`
    : "No articles found";
  const btns = document.getElementById("a-pag-btns");
  btns.innerHTML = "";
  const add = (label, pg, active = false, disabled = false) => {
    const b = document.createElement("button");
    b.className = "pag-btn" + (active ? " active" : "");
    b.innerHTML = label;
    b.disabled = disabled;
    if (!disabled && !active)
      b.onclick = () => {
        aState.page = pg;
        loadArticles();
      };
    btns.appendChild(b);
  };
  add(
    '<i class="fas fa-chevron-left"></i>',
    aState.page - 1,
    false,
    aState.page === 1
  );
  for (
    let p = Math.max(1, aState.page - 2);
    p <= Math.min(aState.pages, aState.page + 2);
    p++
  )
    add(p, p, p === aState.page);
  add(
    '<i class="fas fa-chevron-right"></i>',
    aState.page + 1,
    false,
    aState.page >= aState.pages
  );
}

/* Article modal */
async function openArticleModal(id = null) {
  document.getElementById("am-id").value = id || "";
  document.getElementById("am-title-label").textContent = id
    ? "Edit Article"
    : "Add Article";
  document.getElementById("am-title").value = "";
  document.getElementById("am-slug").value = "";
  document.getElementById("am-content").value = "";
  document.getElementById("am-category").value = "";
  document.getElementById("am-featured").checked = false;
  if (id) {
    const d = await apiFetch(`/admin/knowledge/articles/${id}`);
    if (d && !d._error) {
      document.getElementById("am-title").value = d.title || "";
      document.getElementById("am-slug").value = d.slug || "";
      document.getElementById("am-content").value = d.content || "";
      document.getElementById("am-category").value = d.category_id || "";
      document.getElementById("am-featured").checked = !!d.is_featured;
    }
  }
  openModal("articleModal");
  setTimeout(() => document.getElementById("am-title").focus(), 350);
}
async function submitArticle() {
  const id = document.getElementById("am-id").value;
  const title = document.getElementById("am-title").value.trim();
  const content = document.getElementById("am-content").value.trim();
  if (!title || !content) {
    toast("Title and content are required", "warn");
    return;
  }
  const btn = document.getElementById("amSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const body = {
    title,
    content,
    slug: document.getElementById("am-slug").value.trim() || slugify(title),
    category_id: document.getElementById("am-category").value || null,
    is_featured: document.getElementById("am-featured").checked ? 1 : 0,
  };
  const d = id
    ? await apiFetch(`/admin/knowledge/articles/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    : await apiFetch("/admin/knowledge/articles", {
        method: "POST",
        body: JSON.stringify(body),
      });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Save Article';
  if (d._error) {
    toast(d.message || "Failed to save", "error");
    return;
  }
  toast(id ? "Article updated" : "Article created", "success");
  closeModal("articleModal");
  loadArticles();
  loadStats();
}
async function toggleArticleFeatured(id, val) {
  const d = await apiFetch(`/admin/knowledge/articles/${id}/featured`, {
    method: "PUT",
    body: JSON.stringify({ is_featured: val ? 1 : 0 }),
  });
  if (d._error) {
    toast("Failed to update featured", "error");
    loadArticles();
    return;
  }
  toast(val ? "Marked as featured" : "Removed from featured");
  loadStats();
}

/* ═══════════════════════════════════════════
FAQs
═══════════════════════════════════════════ */
let _fSearchTimer;
function onFSearch() {
  clearTimeout(_fSearchTimer);
  _fSearchTimer = setTimeout(() => {
    fState.search = document.getElementById("f-search").value;
    fState.page = 1;
    loadFaqs();
  }, 300);
}
function resetFFilters() {
  document.getElementById("f-search").value = "";
  document.getElementById("f-cat-filter").value = "";
  document.getElementById("f-pop-filter").value = "";
  fState = { ...fState, search: "", category: "", popular: "", page: 1 };
  loadFaqs();
}
async function loadFaqs() {
  fState.category = document.getElementById("f-cat-filter").value;
  fState.popular = document.getElementById("f-pop-filter").value;
  const params = new URLSearchParams({
    page: fState.page,
    limit: fState.limit,
    ...(fState.search ? { search: fState.search } : {}),
    ...(fState.category ? { category: fState.category } : {}),
    ...(fState.popular !== "" ? { popular: fState.popular } : {}),
  });
  const d = await apiFetch(`/admin/knowledge/faqs?${params}`);
  if (!d || d._error) {
    toast("Failed to load FAQs", "error");
    return;
  }
  fState.total = d.total;
  fState.pages = d.pages;
  document.getElementById("tc-faqs").textContent = d.total;
  renderFaqs(d.faqs || []);
  renderFPagination();
}
function renderFaqs(faqs) {
  const tbody = document.getElementById("faqTableBody");
  const empty = document.getElementById("f-table-empty");
  if (!faqs.length) {
    tbody.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = faqs.map((f, i) => renderFaqRow(f, i)).join("");
}
function renderFaqRow(f, idx) {
  const delay = (idx % 20) * 0.025;
  const catName =
    categories.find((c) => c.category_id === f.category_id)?.category_name ||
    "—";
  return `<tr style="animation:fadeUp .35s var(--ease) ${delay}s both">
 <td><span style="font-weight:800;color:var(--blue)">#${f.faq_id}</span></td>
 <td style="max-width:280px">
   <div style="font-weight:700;line-height:1.4">${escHtml(f.question)}</div>
   <div style="font-size:.72rem;color:var(--text-secondary);margin-top:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical">${escHtml(
     f.answer
   )}</div>
 </td>
 <td><span class="badge cat">${escHtml(catName)}</span></td>
 <td>
   <label class="toggle-switch">
     <input type="checkbox" ${
       f.is_popular ? "checked" : ""
     } onchange="toggleFaqPopular(${f.faq_id},this.checked)"/>
     <div class="toggle-track"></div>
   </label>
 </td>
 <td><span style="font-weight:700;font-size:.82rem">${
   f.display_order || 0
 }</span></td>
 <td style="font-size:.75rem;color:var(--text-secondary)">${fmtDate(
   f.created_at
 )}</td>
 <td><div class="act-btns">
   <button class="act-btn blue" onclick="openFaqModal(${
     f.faq_id
   })" title="Edit"><i class="fas fa-pen"></i></button>
   <button class="act-btn red" onclick="confirmDelete('faq',${
     f.faq_id
   },'${escHtml(
    f.question.substring(0, 50)
  )}')" title="Delete"><i class="fas fa-trash"></i></button>
 </div></td>
</tr>`;
}
function renderFPagination() {
  const from = (fState.page - 1) * fState.limit + 1,
    to = Math.min(fState.page * fState.limit, fState.total);
  document.getElementById("f-pag-info").textContent = fState.total
    ? `Showing ${from}–${to} of ${fState.total} FAQs`
    : "No FAQs found";
  const btns = document.getElementById("f-pag-btns");
  btns.innerHTML = "";
  const add = (label, pg, active = false, disabled = false) => {
    const b = document.createElement("button");
    b.className = "pag-btn" + (active ? " active" : "");
    b.innerHTML = label;
    b.disabled = disabled;
    if (!disabled && !active)
      b.onclick = () => {
        fState.page = pg;
        loadFaqs();
      };
    btns.appendChild(b);
  };
  add(
    '<i class="fas fa-chevron-left"></i>',
    fState.page - 1,
    false,
    fState.page === 1
  );
  for (
    let p = Math.max(1, fState.page - 2);
    p <= Math.min(fState.pages, fState.page + 2);
    p++
  )
    add(p, p, p === fState.page);
  add(
    '<i class="fas fa-chevron-right"></i>',
    fState.page + 1,
    false,
    fState.page >= fState.pages
  );
}

/* FAQ modal */
async function openFaqModal(id = null) {
  document.getElementById("fm-id").value = id || "";
  document.getElementById("fm-title-label").textContent = id
    ? "Edit FAQ"
    : "Add FAQ";
  document.getElementById("fm-question").value = "";
  document.getElementById("fm-answer").value = "";
  document.getElementById("fm-category").value = "";
  document.getElementById("fm-order").value = "";
  document.getElementById("fm-popular").checked = false;
  if (id) {
    const d = await apiFetch(`/admin/knowledge/faqs/${id}`);
    if (d && !d._error) {
      document.getElementById("fm-question").value = d.question || "";
      document.getElementById("fm-answer").value = d.answer || "";
      document.getElementById("fm-category").value = d.category_id || "";
      document.getElementById("fm-order").value = d.display_order || 0;
      document.getElementById("fm-popular").checked = !!d.is_popular;
    }
  }
  openModal("faqModal");
  setTimeout(() => document.getElementById("fm-question").focus(), 350);
}
async function submitFaq() {
  const id = document.getElementById("fm-id").value;
  const question = document.getElementById("fm-question").value.trim();
  const answer = document.getElementById("fm-answer").value.trim();
  if (!question || !answer) {
    toast("Question and answer are required", "warn");
    return;
  }
  const btn = document.getElementById("fmSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const body = {
    question,
    answer,
    category_id: document.getElementById("fm-category").value || null,
    display_order: parseInt(document.getElementById("fm-order").value) || 0,
    is_popular: document.getElementById("fm-popular").checked ? 1 : 0,
  };
  const d = id
    ? await apiFetch(`/admin/knowledge/faqs/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    : await apiFetch("/admin/knowledge/faqs", {
        method: "POST",
        body: JSON.stringify(body),
      });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Save FAQ';
  if (d._error) {
    toast(d.message || "Failed to save", "error");
    return;
  }
  toast(id ? "FAQ updated" : "FAQ created", "success");
  closeModal("faqModal");
  loadFaqs();
  loadStats();
}
async function toggleFaqPopular(id, val) {
  const d = await apiFetch(`/admin/knowledge/faqs/${id}/popular`, {
    method: "PUT",
    body: JSON.stringify({ is_popular: val ? 1 : 0 }),
  });
  if (d._error) {
    toast("Failed to update", "error");
    loadFaqs();
    return;
  }
  toast(val ? "Marked as popular" : "Removed from popular");
  loadStats();
}

/* ═══════════════════════════════════════════
CATEGORIES
═══════════════════════════════════════════ */
let _cSearchTimer,
  _allCats = [];
function onCSearch() {
  clearTimeout(_cSearchTimer);
  _cSearchTimer = setTimeout(() => {
    renderCatList();
  }, 200);
}
function resetCFilters() {
  document.getElementById("c-search").value = "";
  renderCatList();
}
async function loadCategoriesList() {
  const d = await apiFetch("/admin/knowledge/categories");
  if (!d || d._error) {
    toast("Failed to load categories", "error");
    return;
  }
  _allCats = d.categories || [];
  renderCatList();
}
function renderCatList() {
  const q = document.getElementById("c-search").value.toLowerCase();
  const cats = _allCats.filter(
    (c) =>
      !q ||
      c.category_name.toLowerCase().includes(q) ||
      (c.category_description || "").toLowerCase().includes(q)
  );
  const el = document.getElementById("catList");
  const empty = document.getElementById("c-empty");
  if (!cats.length) {
    el.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";
  el.innerHTML = cats
    .map(
      (c, i) => `
 <div class="cat-item" style="animation-delay:${i * 0.04}s">
   <div class="cat-icon-box"><i class="${escHtml(
     c.category_icon || "fas fa-folder"
   )}"></i></div>
   <div class="cat-info">
     <div class="cat-name">${escHtml(c.category_name)}</div>
     <div class="cat-desc">${escHtml(
       c.category_description || "No description"
     )}</div>
   </div>
   <span class="cat-order-badge">Order: ${c.display_order || 0}</span>
   <div class="act-btns">
     <button class="act-btn blue" onclick="openCatModal(${
       c.category_id
     })" title="Edit"><i class="fas fa-pen"></i></button>
     <button class="act-btn red" onclick="confirmDelete('category',${
       c.category_id
     },'${escHtml(
        c.category_name
      )}')" title="Delete"><i class="fas fa-trash"></i></button>
   </div>
 </div>`
    )
    .join("");
}

/* Category modal */
async function openCatModal(id = null) {
  document.getElementById("cm-id").value = id || "";
  document.getElementById("cm-title-label").textContent = id
    ? "Edit Category"
    : "Add Category";
  document.getElementById("cm-name").value = "";
  document.getElementById("cm-icon").value = "";
  document.getElementById("cm-order").value = "";
  document.getElementById("cm-desc").value = "";
  if (id) {
    const cat = _allCats.find((c) => c.category_id === id);
    if (cat) {
      document.getElementById("cm-name").value = cat.category_name || "";
      document.getElementById("cm-icon").value = cat.category_icon || "";
      document.getElementById("cm-order").value = cat.display_order || 0;
      document.getElementById("cm-desc").value = cat.category_description || "";
    }
  }
  openModal("catModal");
  setTimeout(() => document.getElementById("cm-name").focus(), 350);
}
async function submitCategory() {
  const id = document.getElementById("cm-id").value;
  const name = document.getElementById("cm-name").value.trim();
  if (!name) {
    toast("Category name is required", "warn");
    return;
  }
  const btn = document.getElementById("cmSaveBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
  const body = {
    category_name: name,
    category_icon:
      document.getElementById("cm-icon").value.trim() || "fas fa-folder",
    display_order: parseInt(document.getElementById("cm-order").value) || 0,
    category_description: document.getElementById("cm-desc").value.trim(),
  };
  const d = id
    ? await apiFetch(`/admin/knowledge/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
    : await apiFetch("/admin/knowledge/categories", {
        method: "POST",
        body: JSON.stringify(body),
      });
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i> Save Category';
  if (d._error) {
    toast(d.message || "Failed to save", "error");
    return;
  }
  toast(id ? "Category updated" : "Category created", "success");
  closeModal("catModal");
  await loadCategories();
  loadCategoriesList();
  loadStats();
}

/* ── Delete confirm ──────────────────────── */
function confirmDelete(type, id, label) {
  const msgs = {
    article: `Delete article "<strong>${escHtml(
      label
    )}</strong>"? This cannot be undone.`,
    faq: `Delete FAQ "<strong>${escHtml(
      label
    )}…</strong>"? This cannot be undone.`,
    category: `Delete category "<strong>${escHtml(
      label
    )}</strong>"? Articles in this category will have their category removed. This cannot be undone.`,
  };
  document.getElementById("del-msg").innerHTML = msgs[type] || "Are you sure?";
  _deleteCallback = async () => {
    const btn = document.getElementById("delConfirmBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…';
    const paths = {
      article: `/admin/knowledge/articles/${id}`,
      faq: `/admin/knowledge/faqs/${id}`,
      category: `/admin/knowledge/categories/${id}`,
    };
    const d = await apiFetch(paths[type], { method: "DELETE" });
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-trash"></i> Yes, Delete';
    if (d._error) {
      toast(d.message || "Delete failed", "error");
      return;
    }
    toast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`, "success");
    closeModal("deleteModal");
    if (type === "article") {
      loadArticles();
      loadStats();
    } else if (type === "faq") {
      loadFaqs();
      loadStats();
    } else {
      await loadCategories();
      loadCategoriesList();
      loadStats();
    }
  };
  document.getElementById("delConfirmBtn").onclick = () =>
    _deleteCallback && _deleteCallback();
  openModal("deleteModal");
}
