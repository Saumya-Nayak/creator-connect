// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

// ===== STATE =====
let allCategories = [];
let allFaqs = [];
let currentFaqFilter = "all";
let currentTab = "popular";
let searchTimeout = null;
let isLoggedIn = false;

// ===== GLOBAL FUNCTIONS =====
window.openArticle = openArticle;
window.closeArticleModal = closeArticleModal;
window.closeSupportModal = closeSupportModal;
window.submitFeedback = submitFeedback;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Help page loading...");

  isLoggedIn =
    !!localStorage.getItem("authToken") ||
    !!sessionStorage.getItem("authToken");
  console.log("🔐 Login status:", isLoggedIn);

  await loadHeaderAndSidebar();
  await Promise.all([loadCategories(), loadFaqs(), loadPopularTopics()]);
  setupEventListeners();
  setupTabNavigation();
  applyTheme();

  console.log("✅ Help page ready");
});

// ===== LOAD COMPONENTS =====
async function loadHeaderAndSidebar() {
  try {
    const headerResponse = await fetch("header.html");
    if (headerResponse.ok) {
      document.getElementById("header").innerHTML = await headerResponse.text();
      const headerScript = document.createElement("script");
      headerScript.src = "js/header.js";
      headerScript.onload = () => console.log("✅ Header loaded");
      document.body.appendChild(headerScript);
    }

    const sidebarResponse = await fetch("sidebar.html");
    if (sidebarResponse.ok) {
      document.getElementById("sidebar").innerHTML =
        await sidebarResponse.text();
      const sidebarScript = document.createElement("script");
      sidebarScript.src = "js/sidebar.js";
      sidebarScript.onload = () => {
        console.log("✅ Sidebar loaded");
        if (typeof window.updateSidebar === "function") window.updateSidebar();
      };
      document.body.appendChild(sidebarScript);
    }
  } catch (error) {
    console.error("❌ Error loading components:", error);
  }
}

// ===== TAB NAVIGATION =====
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll(".help-tab-btn");
  const tabPanes = document.querySelectorAll(".help-tab-pane");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanes.forEach((pane) => pane.classList.remove("active"));

      button.classList.add("active");
      const targetPane = document.getElementById(`tab-${targetTab}`);
      if (targetPane) targetPane.classList.add("active");

      currentTab = targetTab;
      console.log(`📑 Switched to tab: ${targetTab}`);
    });
  });
}

// ===== LOAD DATA =====
async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/help/categories`);
    const data = await response.json();

    if (data.success) {
      allCategories = data.categories;
      console.log("✅ Categories loaded:", allCategories.length);
    } else {
      throw new Error("Failed to load categories");
    }
  } catch (error) {
    console.error("❌ Error loading categories:", error);
    allCategories = [
      {
        category_id: 1,
        category_name: "Getting Started",
        category_icon: "fas fa-rocket",
        category_description: "Learn the basics of Creator Connect",
        article_count: 3,
      },
      {
        category_id: 2,
        category_name: "Account & Profile",
        category_icon: "fas fa-user-circle",
        category_description: "Manage your account and profile settings",
        article_count: 0,
      },
      {
        category_id: 3,
        category_name: "Posts & Content",
        category_icon: "fas fa-images",
        category_description: "Create and manage your posts",
        article_count: 0,
      },
      {
        category_id: 4,
        category_name: "Payments & Billing",
        category_icon: "fas fa-credit-card",
        category_description: "Earnings, commissions and withdrawals",
        article_count: 0,
      },
      {
        category_id: 5,
        category_name: "Orders & Services",
        category_icon: "fas fa-box-open",
        category_description: "Track orders and service bookings",
        article_count: 0,
      },
      {
        category_id: 6,
        category_name: "Safety & Privacy",
        category_icon: "fas fa-shield-alt",
        category_description: "Keep your account safe",
        article_count: 0,
      },
    ];
  }

  renderCategories();
  updateStats();
}

async function loadFaqs() {
  try {
    const response = await fetch(`${API_BASE_URL}/help/faqs`);
    const data = await response.json();

    if (data.success) {
      allFaqs = data.faqs;
      console.log("✅ FAQs loaded:", allFaqs.length);
    } else {
      throw new Error("Failed to load FAQs");
    }
  } catch (error) {
    console.error("❌ Error loading FAQs:", error);
    allFaqs = [
      {
        faq_id: 1,
        question: "How do I create an account?",
        answer:
          "Click 'Sign Up', fill in your details, and verify your email address.",
        is_popular: 1,
      },
      {
        faq_id: 2,
        question: "How do I reset my password?",
        answer:
          "Click 'Forgot Password' on the login page and follow the link sent to your inbox.",
        is_popular: 1,
      },
      {
        faq_id: 3,
        question: "How do I upload a post?",
        answer:
          "Click the Upload button, select your post type, add media and details, then publish.",
        is_popular: 1,
      },
      {
        faq_id: 4,
        question: "What types of posts can I create?",
        answer:
          "Three types: Showcase (portfolio), Service (bookable skill), and Product (item for sale).",
        is_popular: 1,
      },
    ];
  }

  renderFaqs("all");
  updateStats();
}

// ===== LOAD POPULAR TOPICS (from DB — featured articles) =====
async function loadPopularTopics() {
  const container = document.getElementById("popularTopics");
  container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i></div>`;

  try {
    // Fetch featured articles from the API
    const response = await fetch(`${API_BASE_URL}/help/featured`);
    const data = await response.json();

    if (data.success && data.articles && data.articles.length > 0) {
      renderPopularTopics(data.articles);
      return;
    }
    throw new Error("No featured articles returned");
  } catch (error) {
    console.warn(
      "⚠️ Featured articles endpoint not available, falling back to category fetch:",
      error.message
    );

    // Fallback: pull featured articles by fetching each category's articles
    // and picking is_featured ones
    try {
      const response = await fetch(
        `${API_BASE_URL}/help/articles?featured=1&limit=6`
      );
      const data = await response.json();
      if (data.success && data.articles && data.articles.length > 0) {
        renderPopularTopics(data.articles);
        return;
      }
    } catch (e) {
      /* ignore */
    }

    // Final fallback: show static cards that open category 3 (Posts & Content)
    console.warn("⚠️ Using static fallback for popular topics");
    renderPopularTopicsFallback();
  }
}

function renderPopularTopics(articles) {
  const container = document.getElementById("popularTopics");
  container.innerHTML = "";

  // Icon mapping by category
  const categoryIcons = {
    1: "fas fa-rocket",
    2: "fas fa-user-circle",
    3: "fas fa-upload",
    4: "fas fa-credit-card",
    5: "fas fa-box-open",
    6: "fas fa-shield-alt",
  };

  articles.forEach((article) => {
    const icon = categoryIcons[article.category_id] || "fas fa-file-alt";
    const card = document.createElement("div");
    card.className = "topic-card";
    card.innerHTML = `
      <div class="topic-icon">
        <i class="${icon}"></i>
      </div>
      <h3>${escapeHtml(article.title)}</h3>
      <p>${escapeHtml(article.category_name || "Help Article")}</p>
      <div class="topic-meta">
        <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
        <span><i class="fas fa-book"></i> Read article</span>
      </div>
    `;
    card.addEventListener("click", () => openArticle(article.article_id));
    container.appendChild(card);
  });

  console.log(`✅ Rendered ${articles.length} popular topic cards from DB`);
}

function renderPopularTopicsFallback() {
  // Static fallback: cards that load category articles
  const topics = [
    {
      icon: "fas fa-rocket",
      title: "Getting Started Guide",
      desc: "Learn how to set up your account and start creating",
      categoryId: 1,
    },
    {
      icon: "fas fa-upload",
      title: "Creating Your First Post",
      desc: "Step-by-step guide to uploading content",
      categoryId: 3,
    },
    {
      icon: "fas fa-store",
      title: "Selling on Bazaar",
      desc: "How to list and sell your services or products",
      categoryId: 3,
    },
  ];

  const container = document.getElementById("popularTopics");
  container.innerHTML = "";

  topics.forEach((topic) => {
    const card = document.createElement("div");
    card.className = "topic-card";
    card.innerHTML = `
      <div class="topic-icon">
        <i class="${topic.icon}"></i>
      </div>
      <h3>${topic.title}</h3>
      <p>${topic.desc}</p>
      <div class="topic-meta">
        <span><i class="fas fa-book"></i> Browse articles</span>
      </div>
    `;
    card.addEventListener("click", () =>
      loadCategoryArticles(topic.categoryId)
    );
    container.appendChild(card);
  });
}

// ===== RENDER FUNCTIONS =====
function renderCategories() {
  const container = document.getElementById("categoriesGrid");
  container.innerHTML = "";

  if (!allCategories || allCategories.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-folder-open" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
        <p>No categories available</p>
      </div>
    `;
    return;
  }

  allCategories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "category-card";
    card.innerHTML = `
      <div class="category-header">
        <div class="category-icon">
          <i class="${category.category_icon || "fas fa-folder"}"></i>
        </div>
        <div class="category-info">
          <h3>${escapeHtml(category.category_name)}</h3>
          <span class="category-count">${
            category.article_count || 0
          } articles</span>
        </div>
      </div>
      <p class="category-description">${escapeHtml(
        category.category_description || ""
      )}</p>
    `;
    card.addEventListener("click", () =>
      loadCategoryArticles(category.category_id)
    );
    container.appendChild(card);
  });
}

function renderFaqs(filter = "all") {
  const container = document.getElementById("faqsContainer");
  container.innerHTML = "";

  let filteredFaqs = [...allFaqs];

  if (filter === "popular") {
    filteredFaqs = allFaqs.filter((faq) => {
      const v = faq.is_popular;
      return v === true || v === 1 || v === "1" || v === "true";
    });
  }

  console.log(
    `📋 Rendering FAQs — filter: "${filter}", count: ${filteredFaqs.length}`
  );

  if (filteredFaqs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-question-circle" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
        <p>No FAQs found for this filter</p>
      </div>
    `;
    return;
  }

  filteredFaqs.forEach((faq) => {
    const item = document.createElement("div");
    item.className = "faq-item";
    item.id = `faq-${faq.faq_id}`;
    item.innerHTML = `
      <div class="faq-question">
        <span class="faq-question-text">${escapeHtml(faq.question)}</span>
        <div class="faq-toggle"><i class="fas fa-chevron-down"></i></div>
      </div>
      <div class="faq-answer">
        <p class="faq-answer-text">${escapeHtml(faq.answer)}</p>
      </div>
    `;
    item.querySelector(".faq-question").addEventListener("click", () => {
      const wasActive = item.classList.contains("active");
      document
        .querySelectorAll(".faq-item")
        .forEach((i) => i.classList.remove("active"));
      if (!wasActive) item.classList.add("active");
    });
    container.appendChild(item);
  });
}

function updateStats() {
  const totalArticles = allCategories.reduce(
    (sum, cat) => sum + (parseInt(cat.article_count) || 0),
    0
  );
  document.getElementById("articlesCount").textContent = totalArticles;
  document.getElementById("faqsCount").textContent = allFaqs.length;
}

// ===== LOAD CATEGORY ARTICLES =====
async function loadCategoryArticles(categoryId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/help/category/${categoryId}/articles`
    );
    const data = await response.json();

    if (data.success && data.articles && data.articles.length > 0) {
      if (data.articles.length === 1) {
        // Only one article — open it directly
        openArticle(data.articles[0].article_id);
      } else {
        // Multiple articles — show picker modal
        showArticlePickerModal(data.articles);
      }
    } else {
      showToast("No articles available in this category yet", "info");
    }
  } catch (error) {
    console.error("❌ Error loading category articles:", error);
    showToast("Could not load articles. Please try again.", "error");
  }
}

// Show a list of articles in the article modal before the user picks one
function showArticlePickerModal(articles) {
  const modal = document.getElementById("articleModal");
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  const categoryName = articles[0]?.category_name || "Help";
  document.getElementById("articleTitle").textContent = categoryName;
  document.getElementById("articleCategory").textContent = categoryName;
  document.getElementById("articleViews").textContent = "";
  document.getElementById(
    "articleDate"
  ).textContent = `${articles.length} articles`;

  const listHtml = articles
    .map(
      (a) => `
    <div onclick="openArticle(${a.article_id})" style="
      padding: 14px 16px;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 10px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s;
      display: flex;
      align-items: center;
      gap: 12px;
    "
    onmouseover="this.style.background='var(--hover-bg,#f5f5f5)';this.style.transform='translateX(4px)'"
    onmouseout="this.style.background='';this.style.transform=''">
      <i class="fas fa-file-alt" style="color:#8b5cf6;font-size:1.1rem;flex-shrink:0;"></i>
      <div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:3px;">${escapeHtml(
          a.title
        )}</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);"><i class="fas fa-eye"></i> ${
          a.views || 0
        } views</div>
      </div>
      <i class="fas fa-chevron-right" style="margin-left:auto;color:var(--text-secondary);font-size:0.85rem;"></i>
    </div>
  `
    )
    .join("");

  document.getElementById("articleBody").innerHTML = `
    <p style="color:var(--text-secondary);margin-bottom:18px;">Select an article to read:</p>
    ${listHtml}
  `;
}

// ===== SEARCH FUNCTIONALITY =====
function handleSearch(query) {
  const searchResults = document.getElementById("searchResults");
  const searchResultsContainer = document.getElementById(
    "searchResultsContainer"
  );
  const searchResultsText = document.getElementById("searchResultsText");
  const btnClearSearch = document.getElementById("btnClearSearch");
  const tabsSection = document.querySelector(".help-tabs-section");

  if (!query || query.trim().length < 2) {
    searchResults.style.display = "none";
    btnClearSearch.style.display = "none";
    tabsSection.style.display = "block";
    return;
  }

  btnClearSearch.style.display = "flex";
  const lowerQuery = query.toLowerCase().trim();
  const results = [];

  allFaqs.forEach((faq) => {
    if (
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        type: "faq",
        title: faq.question,
        excerpt: faq.answer,
        id: faq.faq_id,
      });
    }
  });

  allCategories.forEach((cat) => {
    if (
      cat.category_name.toLowerCase().includes(lowerQuery) ||
      (cat.category_description &&
        cat.category_description.toLowerCase().includes(lowerQuery))
    ) {
      results.push({
        type: "category",
        title: cat.category_name,
        excerpt: cat.category_description || "",
        id: cat.category_id,
      });
    }
  });

  console.log(`🔍 Found ${results.length} results for "${query}"`);

  searchResultsText.textContent = `Found ${results.length} result${
    results.length !== 1 ? "s" : ""
  } for "${query}"`;
  searchResultsContainer.innerHTML = "";

  if (results.length === 0) {
    searchResultsContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
        <i class="fas fa-search" style="font-size: 4rem; opacity: 0.2; margin-bottom: 20px;"></i>
        <h3 style="font-size: 1.3rem; margin-bottom: 10px; color: var(--text-primary);">No results found</h3>
        <p>No results found for "${escapeHtml(query)}"</p>
        <p style="margin-top: 10px;">Try different keywords or browse categories below</p>
      </div>
    `;
  } else {
    results.forEach((result) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
        <div class="search-result-header">
          <span class="search-result-type ${
            result.type
          }">${result.type.toUpperCase()}</span>
        </div>
        <h3 class="search-result-title">${highlightText(
          result.title,
          query
        )}</h3>
        <p class="search-result-excerpt">${highlightText(
          truncateText(result.excerpt, 150),
          query
        )}</p>
      `;
      item.addEventListener("click", () => {
        if (result.type === "faq") {
          document.getElementById("helpSearch").value = "";
          btnClearSearch.style.display = "none";
          searchResults.style.display = "none";
          tabsSection.style.display = "block";
          document.querySelectorAll(".help-tab-btn").forEach((btn) => {
            if (btn.getAttribute("data-tab") === "faqs") btn.click();
          });
          setTimeout(() => {
            const faqItem = document.getElementById(`faq-${result.id}`);
            if (faqItem) {
              faqItem.scrollIntoView({ behavior: "smooth", block: "center" });
              document
                .querySelectorAll(".faq-item")
                .forEach((i) => i.classList.remove("active"));
              faqItem.classList.add("active");
            }
          }, 300);
        } else {
          loadCategoryArticles(result.id);
        }
      });
      searchResultsContainer.appendChild(item);
    });
  }

  tabsSection.style.display = "none";
  searchResults.style.display = "block";
}

function highlightText(text, query) {
  if (!text || !query) return escapeHtml(text || "");
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeRegex(query);
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
}

function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== MODAL FUNCTIONS =====
async function openArticle(articleId) {
  const modal = document.getElementById("articleModal");
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  document.getElementById("articleTitle").textContent = "Loading...";
  document.getElementById("articleBody").innerHTML =
    "<p>Loading article...</p>";

  try {
    const response = await fetch(`${API_BASE_URL}/help/article/${articleId}`);
    const data = await response.json();

    if (data.success && data.article) {
      const article = data.article;
      document.getElementById("articleTitle").textContent = article.title;
      document.getElementById("articleCategory").textContent =
        article.category_name || "Help";
      document.getElementById("articleViews").textContent = article.views || 0;
      document.getElementById("articleDate").textContent = formatDate(
        new Date(article.updated_at || article.created_at)
      );
      document.getElementById("articleBody").innerHTML = article.content;
    } else {
      throw new Error("Article not found");
    }
  } catch (error) {
    console.error("❌ Error loading article:", error);
    document.getElementById("articleTitle").textContent =
      "Article Not Available";
    document.getElementById("articleCategory").textContent = "Help";
    document.getElementById("articleViews").textContent = "0";
    document.getElementById("articleDate").textContent = "Today";
    document.getElementById("articleBody").innerHTML = `
      <p>This article is not yet available. Our help documentation is being continuously updated.</p>
      <p>In the meantime, you can:</p>
      <ul>
        <li>Check our FAQs section</li>
        <li>Browse other help categories</li>
        <li>Contact our support team for assistance</li>
      </ul>
    `;
  }
}

function closeArticleModal() {
  document.getElementById("articleModal").classList.remove("show");
  document.body.style.overflow = "auto";
}

function closeSupportModal() {
  document.getElementById("supportModal").classList.remove("show");
  document.body.style.overflow = "auto";
}

async function submitFeedback(isHelpful) {
  showToast(
    isHelpful
      ? "Thanks for your feedback! 👍"
      : "We'll improve this article 🔧",
    "success"
  );
  setTimeout(() => closeArticleModal(), 1000);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  const helpSearch = document.getElementById("helpSearch");
  if (helpSearch) {
    helpSearch.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => handleSearch(e.target.value), 300);
    });
  }

  const btnClearSearch = document.getElementById("btnClearSearch");
  if (btnClearSearch) {
    btnClearSearch.addEventListener("click", () => {
      if (helpSearch) helpSearch.value = "";
      btnClearSearch.style.display = "none";
      handleSearch("");
    });
  }

  document.querySelectorAll(".faq-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      document
        .querySelectorAll(".faq-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFaqFilter = btn.getAttribute("data-category");
      renderFaqs(currentFaqFilter);
    });
  });

  const btnContactSupport = document.getElementById("btnContactSupport");
  if (btnContactSupport) {
    const newBtn = btnContactSupport.cloneNode(true);
    btnContactSupport.parentNode.replaceChild(newBtn, btnContactSupport);
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      if (!token) {
        showToast("Please login to contact support", "error");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
        return;
      }
      const modal = document.getElementById("supportModal");
      if (modal) {
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
      }
    });
  }

  const btnCloseArticle = document.getElementById("btnCloseArticle");
  if (btnCloseArticle)
    btnCloseArticle.onclick = (e) => {
      e.preventDefault();
      closeArticleModal();
      return false;
    };

  const btnCloseSupport = document.getElementById("btnCloseSupport");
  if (btnCloseSupport)
    btnCloseSupport.onclick = (e) => {
      e.preventDefault();
      closeSupportModal();
      return false;
    };

  const btnFeedbackYes = document.getElementById("btnFeedbackYes");
  if (btnFeedbackYes)
    btnFeedbackYes.onclick = (e) => {
      e.preventDefault();
      submitFeedback(true);
      return false;
    };

  const btnFeedbackNo = document.getElementById("btnFeedbackNo");
  if (btnFeedbackNo)
    btnFeedbackNo.onclick = (e) => {
      e.preventDefault();
      submitFeedback(false);
      return false;
    };

  const supportForm = document.getElementById("supportForm");
  if (supportForm) {
    supportForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      if (!token) {
        showToast("Please login to submit a support ticket", "error");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
        return;
      }
      const formData = {
        subject: document.getElementById("ticketSubject").value,
        category: document.getElementById("ticketCategory").value,
        priority: document.getElementById("ticketPriority").value,
        message: document.getElementById("ticketMessage").value,
      };
      try {
        const response = await fetch(`${API_BASE_URL}/support/ticket`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (data.success) {
          showToast(
            "Support ticket submitted! We'll get back to you soon. 📧",
            "success"
          );
          closeSupportModal();
          e.target.reset();
        } else {
          showToast(data.message || "Failed to submit ticket", "error");
        }
      } catch (error) {
        console.error("❌ Error submitting ticket:", error);
        showToast("Failed to submit ticket. Please try again.", "error");
      }
    });
  }

  const articleOverlay = document.querySelector(".article-modal-overlay");
  if (articleOverlay)
    articleOverlay.addEventListener("click", (e) => {
      if (e.target === articleOverlay) closeArticleModal();
    });

  const supportOverlay = document.querySelector(".support-modal-overlay");
  if (supportOverlay)
    supportOverlay.addEventListener("click", (e) => {
      if (e.target === supportOverlay) closeSupportModal();
    });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeArticleModal();
      closeSupportModal();
    }
  });
}

// ===== UTILITY FUNCTIONS =====
function showToast(message, type = "success") {
  const existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";

  const colors = {
    success: { bg: "#d4edda", color: "#155724", border: "#28a745" },
    error: { bg: "#f8d7da", color: "#721c24", border: "#dc3545" },
    info: { bg: "#d1ecf1", color: "#0c5460", border: "#17a2b8" },
  };
  const style = colors[type] || colors.success;

  toast.style.cssText = `
    position:fixed;bottom:20px;right:20px;
    background:${style.bg};color:${style.color};
    border-left:4px solid ${style.border};
    padding:15px 20px;border-radius:12px;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    display:flex;align-items:center;gap:10px;
    z-index:10001;animation:slideIn 0.3s ease;max-width:400px;
  `;
  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    info: "fa-info-circle",
  };
  toast.innerHTML = `<i class="fas ${
    icons[type] || icons.success
  }"></i><span>${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(date) {
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
  if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
  return `Updated on ${date.toLocaleDateString()}`;
}

// ===== THEME =====
function applyTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
}
window.addEventListener("storage", (e) => {
  if (e.key === "theme") applyTheme();
});
window.addEventListener("themeChanged", applyTheme);

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn  { from { opacity:0; transform:translateX(100px); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideOut { from { opacity:1; transform:translateX(0); }     to { opacity:0; transform:translateX(100px); } }
`;
document.head.appendChild(style);
