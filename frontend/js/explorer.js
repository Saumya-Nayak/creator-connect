// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

console.log("🌐 Explorer API URL:", API_BASE_URL);

// ===== STATE =====
let currentMode = "posts"; // 'posts' or 'creators'

let currentFilters = {
  postType: "all",
  categoryId: null,
  subcategoryId: null,
  sort: "latest",
  offset: 0,
  limit: 12,
};

let currentCreatorFilters = {
  sort: "followers",
  search: "",
  offset: 0,
  limit: 12,
};

let allCategories = {
  showcase: [],
  service: [],
  product: [],
};

let hasMorePosts = true;
let hasMoreCreators = true;
let isLoading = false;

// ===== GLOBAL FUNCTIONS FOR MODAL =====
window.openPostDetail = openPostDetail;
window.closePostDetailModal = closePostDetailModal;
window.handleIframeMessage = handleIframeMessage;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Explorer page loading...");

  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const isLoggedIn = !!token;

  if (!isLoggedIn) {
    document.body.classList.add("guest-view");
    console.log("👤 Guest user detected");
  } else {
    console.log("✅ Logged-in user detected");
  }

  await loadHeaderAndSidebar();

  setTimeout(() => {
    const preloader = document.getElementById("preloader");
    if (preloader) {
      preloader.style.opacity = "0";
      setTimeout(() => (preloader.style.display = "none"), 500);
    }
  }, 1000);

  await Promise.all([loadStats(), loadCategories(), loadPosts()]);
  setupEventListeners();
  setupScrollListener();
  setupCategorySearch();

  // ===== AUTO-SELECT TAB FROM URL PARAM =====
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get("tab");
  if (tabParam === "creators") {
    // Small delay ensures isLoading is reset to false after loadPosts() finishes
    setTimeout(() => {
      switchMode("creators");
    }, 50);
  }
  console.log("✅ Explorer page ready");
});

// ===== LOAD COMPONENTS =====
async function loadHeaderAndSidebar() {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const isLoggedIn = !!token;

    const headerResponse = await fetch("header.html");
    if (headerResponse.ok) {
      document.getElementById("header").innerHTML = await headerResponse.text();
      const headerScript = document.createElement("script");
      headerScript.src = "js/header.js";
      headerScript.onload = () => console.log("✅ Header loaded");
      document.body.appendChild(headerScript);
    }

    if (isLoggedIn) {
      const sidebarResponse = await fetch("sidebar.html");
      if (sidebarResponse.ok) {
        document.getElementById("sidebar").innerHTML =
          await sidebarResponse.text();
        const sidebarScript = document.createElement("script");
        sidebarScript.src = "js/sidebar.js";
        sidebarScript.onload = () => {
          console.log("✅ Sidebar loaded");
          if (typeof window.updateSidebar === "function")
            window.updateSidebar();
        };
        document.body.appendChild(sidebarScript);
      }
    } else {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.style.display = "none";
      console.log("ℹ️ Guest user - sidebar hidden");
    }
  } catch (error) {
    console.error("❌ Error loading components:", error);
  }
}

// ===== LOAD STATS =====
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/explore/stats`);
    const data = await response.json();

    if (data.success && data.stats) {
      const showcaseEl = document.getElementById("showcaseCount");
      const serviceEl = document.getElementById("serviceCount");
      const productEl = document.getElementById("productCount");
      const creatorsEl = document.getElementById("creatorsCount");

      if (showcaseEl)
        showcaseEl.textContent = formatNumber(data.stats.showcase_count || 0);
      if (serviceEl)
        serviceEl.textContent = formatNumber(data.stats.service_count || 0);
      if (productEl)
        productEl.textContent = formatNumber(data.stats.product_count || 0);
      if (creatorsEl)
        creatorsEl.textContent = formatNumber(data.stats.creators_count || 0);
    }
  } catch (error) {
    console.error("❌ Error loading stats:", error);
  }
}

// ===== SWITCH MAIN MODE (Posts / Creators) =====
function switchMode(mode) {
  currentMode = mode;

  document.querySelectorAll(".main-tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-main-tab") === mode) {
      btn.classList.add("active");
    }
  });

  const postsFilters = document.getElementById("postsFilters");
  const creatorsFilters = document.getElementById("creatorsFilters");

  if (mode === "posts") {
    postsFilters.style.display = "block";
    creatorsFilters.style.display = "none";
    document.getElementById("postsGrid").style.display = "grid";
    document.getElementById("creatorsGrid").style.display = "none";
    loadPosts(true);
  } else {
    postsFilters.style.display = "none";
    creatorsFilters.style.display = "block";
    document.getElementById("postsGrid").style.display = "none";
    document.getElementById("creatorsGrid").style.display = "grid";

    setTimeout(() => {
      setupCreatorSortListeners();
    }, 50);

    loadCreators(true);
  }
}
// Update setupCreatorSortListeners to handle my_followers
function setupCreatorSortListeners() {
  document.querySelectorAll(".creator-sort-btn").forEach((btn) => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", () => {
      const sortType = newBtn.getAttribute("data-creator-sort");
      console.log("✅ Creator sort clicked:", sortType);

      // Check if user is logged in for my_followers
      if (sortType === "my_followers") {
        const token =
          localStorage.getItem("authToken") ||
          sessionStorage.getItem("authToken");
        if (!token) {
          showToast("Please login to view your followers", "error");
          setTimeout(() => {
            openLoginModal();
          }, 1000);
          return;
        }
      }

      // Update active state
      document
        .querySelectorAll(".creator-sort-btn")
        .forEach((b) => b.classList.remove("active"));
      newBtn.classList.add("active");

      // Update filter and reload
      currentCreatorFilters.sort = sortType;
      currentCreatorFilters.offset = 0;
      loadCreators(true);
    });
  });

  console.log("✅ Creator sort listeners attached");
}

// ===== CATEGORIES =====
async function loadCategories() {
  try {
    const postType =
      currentFilters.postType === "all" ? "all" : currentFilters.postType;
    const response = await fetch(
      `${API_BASE_URL}/explore/categories?post_type=${postType}`
    );
    const data = await response.json();

    if (data.success) {
      if (postType === "all") {
        allCategories = data.categories;
      } else {
        allCategories[postType] = data.categories;
      }
      renderCategories();
    }
  } catch (error) {
    console.error("❌ Error loading categories:", error);
  }
}

function renderCategories() {
  const categoryGrid = document.getElementById("categoryGrid");
  let categories =
    currentFilters.postType === "all"
      ? [
          ...allCategories.showcase,
          ...allCategories.service,
          ...allCategories.product,
        ]
      : allCategories[currentFilters.postType] || [];

  if (categories.length === 0) {
    categoryGrid.innerHTML =
      '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No categories available</p>';
    return;
  }

  categoryGrid.innerHTML = "";
  categories.forEach((category) => {
    const card = document.createElement("div");
    card.className = "category-card";
    if (currentFilters.categoryId === category.category_id)
      card.classList.add("active");

    card.innerHTML = `
            <span class="category-icon">${category.icon || "📦"}</span>
            <span class="category-name">${escapeHtml(
              category.category_name
            )}</span>
            <span class="category-count">${category.post_count} posts</span>
        `;
    card.addEventListener("click", () => selectCategory(category.category_id));
    categoryGrid.appendChild(card);
  });

  setupCategorySearch();
}

function setupCategorySearch() {
  const searchInput = document.getElementById("categorySearchInput");
  const categoryGrid = document.getElementById("categoryGrid");
  const noResults = document.getElementById("categoryNoResults");

  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const categoryCards = categoryGrid.querySelectorAll(".category-card");

    let visibleCount = 0;

    categoryCards.forEach((card) => {
      const categoryName =
        card.querySelector(".category-name")?.textContent.toLowerCase() || "";

      if (categoryName.includes(searchTerm)) {
        card.classList.remove("hidden");
        card.classList.add("show");
        visibleCount++;
      } else {
        card.classList.add("hidden");
        card.classList.remove("show");
      }
    });

    if (visibleCount === 0 && searchTerm !== "") {
      noResults.style.display = "block";
      categoryGrid.classList.add("searching-empty");
    } else {
      noResults.style.display = "none";
      categoryGrid.classList.remove("searching-empty");
    }
  });

  const resetBtn = document.getElementById("btnResetFilters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      searchInput.value = "";
      const categoryCards = categoryGrid.querySelectorAll(".category-card");
      categoryCards.forEach((card) => {
        card.classList.remove("hidden", "show");
      });
      noResults.style.display = "none";
      categoryGrid.classList.remove("searching-empty");
    });
  }
}

async function selectCategory(categoryId) {
  if (currentFilters.categoryId === categoryId) {
    currentFilters.categoryId = null;
    currentFilters.subcategoryId = null;
    document.getElementById("subcategoryFilterGroup").style.display = "none";
  } else {
    currentFilters.categoryId = categoryId;
    currentFilters.subcategoryId = null;
    await loadSubcategories(categoryId);
  }

  currentFilters.offset = 0;
  renderCategories();
  await loadPosts(true);
}

// ===== SUBCATEGORIES =====
async function loadSubcategories(categoryId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/explore/categories/${categoryId}/subcategories`
    );
    const data = await response.json();

    if (data.success && data.subcategories.length > 0) {
      renderSubcategories(data.subcategories);
      document.getElementById("subcategoryFilterGroup").style.display = "block";
    } else {
      document.getElementById("subcategoryFilterGroup").style.display = "none";
    }
  } catch (error) {
    console.error("❌ Error loading subcategories:", error);
  }
}

function renderSubcategories(subcategories) {
  const list = document.getElementById("subcategoryList");
  list.innerHTML = "";

  subcategories.forEach((sub) => {
    const chip = document.createElement("button");
    chip.className = "subcategory-chip";
    if (currentFilters.subcategoryId === sub.subcategory_id)
      chip.classList.add("active");
    chip.textContent = `${sub.subcategory_name} (${sub.post_count})`;
    chip.addEventListener("click", () => selectSubcategory(sub.subcategory_id));
    list.appendChild(chip);
  });
}

function selectSubcategory(subcategoryId) {
  currentFilters.subcategoryId =
    currentFilters.subcategoryId === subcategoryId ? null : subcategoryId;
  currentFilters.offset = 0;
  loadSubcategories(currentFilters.categoryId);
  loadPosts(true);
}

// ===== POSTS =====
async function loadPosts(reset = false) {
  if (isLoading) return;

  isLoading = true;
  const postsGrid = document.getElementById("postsGrid");
  const postsLoading = document.getElementById("postsLoading");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const noResults = document.getElementById("noResults");

  if (reset) {
    currentFilters.offset = 0;
    postsGrid.innerHTML = "";
    if (postsLoading) postsLoading.style.display = "grid";
    loadMoreContainer.style.display = "none";
    noResults.style.display = "none";
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const params = new URLSearchParams({
      post_type: currentFilters.postType,
      sort: currentFilters.sort,
      limit: currentFilters.limit,
      offset: currentFilters.offset,
    });

    if (currentFilters.categoryId)
      params.append("category_id", currentFilters.categoryId);
    if (currentFilters.subcategoryId)
      params.append("subcategory_id", currentFilters.subcategoryId);

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${API_BASE_URL}/explore/posts?${params.toString()}`,
      { headers }
    );
    const data = await response.json();

    if (postsLoading) postsLoading.style.display = "none";

    if (data.success && data.posts.length > 0) {
      renderPosts(data.posts, reset);
      hasMorePosts = data.has_more;
      loadMoreContainer.style.display = hasMorePosts ? "block" : "none";
      updateResultsCount(data.count, data.total);
      noResults.style.display = "none";
    } else if (reset) {
      postsGrid.innerHTML = "";
      noResults.style.display = "block";
      loadMoreContainer.style.display = "none";
      updateResultsCount(0, 0);
    }
  } catch (error) {
    console.error("❌ Error loading posts:", error);
    if (postsLoading) postsLoading.style.display = "none";
    showError("Failed to load posts");
  } finally {
    isLoading = false;
  }
}

function renderPosts(posts, reset = false) {
  const postsGrid = document.getElementById("postsGrid");
  if (reset) postsGrid.innerHTML = "";
  posts.forEach((post) => postsGrid.appendChild(createPostCard(post)));
}

function createPostCard(post) {
  const card = document.createElement("div");
  card.className = "post-card";

  const mediaUrl = constructMediaUrl(post.media_url);
  const profilePicUrl = constructMediaUrl(post.profile_pic, "profile");
  const isVideo =
    post.media_type === "video" ||
    post.media_url?.toLowerCase().match(/\.(mp4|webm)$/);

  const typeMap = {
    showcase: {
      class: "badge-showcase",
      icon: "fas fa-images",
      text: "Showcase",
    },
    service: {
      class: "badge-service",
      icon: "fas fa-briefcase",
      text: "Service",
    },
    product: {
      class: "badge-product",
      icon: "fas fa-shopping-bag",
      text: "Product",
    },
  };
  const badge = typeMap[post.post_type] || typeMap.showcase;

  const title = post.product_title || post.title || post.caption || "Untitled";
  const description = post.short_description || post.caption || "";

  card.innerHTML = `
        ${
          isVideo
            ? `
    <div class="post-video-wrapper" style="position:relative;">
      <video 
        class="post-media autoplay-video" 
        muted 
        loop 
        playsinline 
        preload="metadata"
        data-post-id="${post.post_id}"
      >
        <source src="${mediaUrl}">
      </video>
      <button 
        class="video-mute-btn" 
        onclick="toggleExplorerVideoMute(event, this)" 
        title="Toggle mute"
        style="
          position:absolute;
          bottom:10px;
          right:10px;
          background:rgba(0,0,0,0.55);
          color:white;
          border:none;
          border-radius:50%;
          width:34px;
          height:34px;
          font-size:0.85rem;
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
    </div>
  `
            : `<img src="${mediaUrl}" class="post-media" onerror="this.onerror=null;this.src=PLACEHOLDER_SVG" loading="lazy">`
        }
        <div class="post-content">
            <span class="post-type-badge ${badge.class}">
                <i class="${badge.icon}"></i> ${badge.text}
            </span>
            <h3 class="post-title">${escapeHtml(title)}</h3>
            ${
              description
                ? `<p class="post-description">${escapeHtml(description)}</p>`
                : ""
            }
            ${
              post.price && post.post_type !== "showcase"
                ? `<div class="post-price">₹${post.price}</div>`
                : ""
            }
            <div class="post-footer">
                <div class="post-author">
                   <img src="${profilePicUrl}" class="post-avatar" onerror="this.onerror=null;this.src=generateDefaultAvatar('${escapeHtml(
    post.full_name || post.username
  )}')">
                    <span class="post-author-name">${escapeHtml(
                      post.full_name || post.username
                    )}</span>
                </div>
                <div class="post-stats">
                    <span class="post-stat"><i class="fas fa-heart"></i>${formatNumber(
                      post.likes_count || 0
                    )}</span>
                    <span class="post-stat"><i class="fas fa-comment"></i>${formatNumber(
                      post.comments_count || 0
                    )}</span>
                </div>
            </div>
        </div>
    `;

  card.addEventListener("click", () => openPostDetail(post.post_id));

  return card;
}

function updateResultsCount(count, total) {
  const title =
    currentMode === "creators"
      ? "All Creators"
      : currentFilters.postType === "all"
      ? "All Posts"
      : currentFilters.postType.charAt(0).toUpperCase() +
        currentFilters.postType.slice(1) +
        " Posts";

  document.getElementById("resultsTitle").textContent = title;

  document.getElementById("resultsCount").textContent =
    total > 0
      ? `Showing ${Math.min(currentFilters.offset + count, total)} of ${total}`
      : "No results found";
}

// ===== NEW: CREATORS =====
async function loadCreators(reset = false) {
  if (isLoading) return;

  isLoading = true;
  const creatorsGrid = document.getElementById("creatorsGrid");
  const creatorsLoading = document.getElementById("creatorsLoading");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const noResults = document.getElementById("noResults");

  if (reset) {
    currentCreatorFilters.offset = 0;
    creatorsGrid.innerHTML = "";
    if (creatorsLoading) creatorsLoading.style.display = "grid";
    loadMoreContainer.style.display = "none";
    noResults.style.display = "none";
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const params = new URLSearchParams({
      sort: currentCreatorFilters.sort,
      limit: currentCreatorFilters.limit,
      offset: currentCreatorFilters.offset,
    });

    // Add search parameter if present
    if (currentCreatorFilters.search) {
      params.append("search", currentCreatorFilters.search);
    }

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${API_BASE_URL}/explore/creators?${params.toString()}`,
      { headers }
    );
    const data = await response.json();

    if (creatorsLoading) creatorsLoading.style.display = "none";

    if (data.success && data.creators.length > 0) {
      renderCreators(data.creators, reset);
      hasMoreCreators = data.has_more;
      loadMoreContainer.style.display = hasMoreCreators ? "block" : "none";
      updateCreatorsResultsCount(data.count, data.total);
      noResults.style.display = "none";
    } else if (reset) {
      creatorsGrid.innerHTML = "";
      noResults.style.display = "block";
      loadMoreContainer.style.display = "none";
      updateCreatorsResultsCount(0, 0);
    }
  } catch (error) {
    console.error("❌ Error loading creators:", error);
    if (creatorsLoading) creatorsLoading.style.display = "none";

    // Handle unauthorized error for my_followers
    if (error.message && error.message.includes("401")) {
      showToast("Please login to view your followers", "error");
      // Switch back to default sort
      currentCreatorFilters.sort = "followers";
      document
        .querySelectorAll(".creator-sort-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelector('.creator-sort-btn[data-creator-sort="followers"]')
        ?.classList.add("active");
    } else {
      showToast("Failed to load creators", "error");
    }
  } finally {
    isLoading = false;
  }
}

function renderCreators(creators, reset = false) {
  const creatorsGrid = document.getElementById("creatorsGrid");
  if (reset) creatorsGrid.innerHTML = "";
  creators.forEach((creator) =>
    creatorsGrid.appendChild(createCreatorCard(creator))
  );
}

function createCreatorCard(creator) {
  const card = document.createElement("div");
  card.className = "creator-card";

  const avatarUrl = constructMediaUrl(creator.profile_pic, "profile");

  let avatarHTML = "";
  const initial = (creator.full_name || creator.username)
    .charAt(0)
    .toUpperCase();

  // Generate a colored SVG avatar with the user's initial as fallback
  const colors = [
    "%23e91e8c",
    "%239c27b0",
    "%233f51b5",
    "%23009688",
    "%23ff5722",
    "%23607d8b",
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='${colors[colorIndex]}'/%3E%3Ctext x='40' y='52' text-anchor='middle' font-size='32' font-family='Arial,sans-serif' font-weight='bold' fill='white'%3E${initial}%3C/text%3E%3C/svg%3E`;

  if (creator.profile_pic) {
    avatarHTML = `<img src="${avatarUrl}" class="creator-avatar" loading="lazy" onerror="this.onerror=null;this.src='${fallbackSvg}'">`;
  } else {
    avatarHTML = `<img src="${fallbackSvg}" class="creator-avatar">`;
  }

  const bio = creator.about_me || "No bio available";

  // Determine action buttons
  let actionButtons = "";

  if (creator.is_self) {
    // Own profile - just view button
    actionButtons = `
      <button class="creator-action-btn btn-view-profile" onclick="window.location.href='profile.html'">
        <i class="fas fa-user"></i> View Profile
      </button>
    `;
  } else {
    // Other user's profile
    const isGuest =
      !localStorage.getItem("authToken") &&
      !sessionStorage.getItem("authToken");

    if (isGuest) {
      // Guest - show follow button that redirects to login
      actionButtons = `
        <button class="creator-action-btn btn-follow" onclick="handleCreatorFollow(null, false, true)">
          <i class="fas fa-user-plus"></i> Follow
        </button>
      `;
    } else {
      // Logged in user
      if (creator.is_following) {
        // Following - show unfollow and message buttons
        actionButtons = `
          <button class="creator-action-btn btn-following" onclick="handleCreatorFollow(${creator.id}, true)">
            <i class="fas fa-user-check"></i> Following
          </button>
          <button class="creator-action-btn btn-message" onclick="openMessage(${creator.id})">
            <i class="fas fa-envelope"></i> Message
          </button>
        `;
      } else if (creator.is_pending) {
        // Request pending
        actionButtons = `
          <button class="creator-action-btn btn-requested" onclick="handleCreatorFollow(${creator.id}, true)">
            <i class="fas fa-clock"></i> Requested
          </button>
        `;
      } else {
        // Not following
        actionButtons = `
          <button class="creator-action-btn btn-follow" onclick="handleCreatorFollow(${creator.id}, false)">
            <i class="fas fa-user-plus"></i> Follow
          </button>
        `;
      }
    }
  }

  card.innerHTML = `
    <div class="creator-avatar-wrapper">
      ${avatarHTML}
    </div>
    <div class="creator-name">${escapeHtml(
      creator.full_name || creator.username
    )}</div>
    <div class="creator-username">@${escapeHtml(creator.username)}</div>
    <div class="creator-bio">${escapeHtml(bio)}</div>
    <div class="creator-stats">
      <div class="creator-stat">
        <div class="creator-stat-number">${formatNumber(
          creator.posts_count || 0
        )}</div>
        <div class="creator-stat-label">Posts</div>
      </div>
      <div class="creator-stat">
        <div class="creator-stat-number">${formatNumber(
          creator.followers_count || 0
        )}</div>
        <div class="creator-stat-label">Followers</div>
      </div>
      <div class="creator-stat">
        <div class="creator-stat-number">${formatNumber(
          creator.following_count || 0
        )}</div>
        <div class="creator-stat-label">Following</div>
      </div>
    </div>
    <div class="creator-actions">
      ${actionButtons}
    </div>
  `;

  // Click on card (not buttons) to view profile
  card.addEventListener("click", (e) => {
    if (!e.target.closest(".creator-action-btn")) {
      if (creator.is_self) {
        window.location.href = "profile.html";
      } else {
        window.location.href = `profile.html?id=${creator.id}`;
      }
    }
  });

  return card;
}

function updateCreatorsResultsCount(count, total) {
  document.getElementById("resultsTitle").textContent = "All Creators";
  document.getElementById("resultsCount").textContent =
    total > 0
      ? `Showing ${Math.min(
          currentCreatorFilters.offset + count,
          total
        )} of ${total}`
      : "No creators found";
}

// ===== HANDLE CREATOR FOLLOW =====
window.handleCreatorFollow = async function (
  userId,
  isFollowing,
  isGuest = false
) {
  if (isGuest) {
    showToast("Please login to follow creators", "error");
    setTimeout(() => {
      window.location.href = `login.html?redirect=explore.html`;
    }, 1500);
    return;
  }

  try {
    // Get active session from localStorage/sessionStorage
    let token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      showToast("Please login to follow creators", "error");
      return;
    }
    const endpoint = isFollowing
      ? `${API_BASE_URL}/profile/${userId}/unfollow`
      : `${API_BASE_URL}/profile/${userId}/follow`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (data.success) {
      if (isFollowing) {
        showToast("Unfollowed successfully", "success");
      } else {
        if (data.request_pending) {
          showToast("Follow request sent!", "success");
        } else {
          showToast("Following successfully", "success");
        }
      }

      // Reload creators to update button states
      await loadCreators(true);
    } else {
      showToast(data.message || "Failed to update follow status", "error");
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    showToast("Failed to update follow status", "error");
  }
};

// ===== OPEN MESSAGE =====
window.openMessage = function (userId) {
  window.location.href = `messages.html?user=${userId}`;
};

// ===== GET ACTIVE SESSION =====
function getActiveSession() {
  let token = localStorage.getItem("authToken");
  let userData = localStorage.getItem("userData");

  if (!token) {
    token = sessionStorage.getItem("authToken");
    userData = sessionStorage.getItem("userData");
  }

  if (!token || !userData) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(userData),
    };
  } catch (e) {
    console.error("Error parsing user data:", e);
    return null;
  }
}

// ===== POST DETAIL MODAL FUNCTIONS =====
function openPostDetail(postId) {
  console.log(`🔍 Opening post detail for ID: ${postId}`);

  const modal = document.getElementById("postDetailModal");
  const iframe = document.getElementById("postDetailIframe");

  if (!modal || !iframe) {
    console.error("❌ Modal elements not found");
    return;
  }

  iframe.src = `post-detail.html?id=${postId}`;
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  window.addEventListener("message", handleIframeMessage);
}

function closePostDetailModal() {
  const modal = document.getElementById("postDetailModal");
  const iframe = document.getElementById("postDetailIframe");

  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "auto";

  setTimeout(() => {
    if (iframe) iframe.src = "";
  }, 300);

  window.removeEventListener("message", handleIframeMessage);
}

function handleIframeMessage(event) {
  const { action, message, type } = event.data;

  switch (action) {
    case "closeModal":
      closePostDetailModal();
      break;

    case "showToast":
      showToast(message, type);
      break;

    case "themeChanged":
      const iframe = document.getElementById("postDetailIframe");
      if (iframe && iframe.contentWindow) {
        const theme = localStorage.getItem("theme") || "light";
        iframe.contentWindow.postMessage(
          { action: "themeChanged", theme: theme },
          "*"
        );
      }
      break;

    default:
      break;
  }
}

function showToast(message, type = "success") {
  const existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === "success" ? "#efe" : "#fee"};
    color: ${type === "success" ? "#3c3" : "#c33"};
    border-left: 4px solid ${type === "success" ? "#3c3" : "#c33"};
    padding: 15px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== EVENT LISTENERS =====
// ===== EVENT LISTENERS - FIXED VERSION =====
// ===== EVENT LISTENERS - SIMPLIFIED =====
function setupEventListeners() {
  // Main tab switching (Posts / Creators)
  document.querySelectorAll(".main-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-main-tab");
      switchMode(mode);
    });
  });

  // Post type filters
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilters.postType = btn.getAttribute("data-type");
      currentFilters.categoryId = null;
      currentFilters.subcategoryId = null;
      currentFilters.offset = 0;
      document.getElementById("subcategoryFilterGroup").style.display = "none";
      loadCategories();
      loadPosts(true);
    });
  });

  // Post sort filters
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sort-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilters.sort = btn.getAttribute("data-sort");
      currentFilters.offset = 0;
      loadPosts(true);
    });
  });

  // Reset filters
  document.getElementById("btnResetFilters")?.addEventListener("click", () => {
    if (currentMode === "posts") {
      currentFilters = {
        postType: "all",
        categoryId: null,
        subcategoryId: null,
        sort: "latest",
        offset: 0,
        limit: 12,
      };
      document
        .querySelectorAll(".filter-btn, .sort-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelector('.filter-btn[data-type="all"]')
        ?.classList.add("active");
      document
        .querySelector('.sort-btn[data-sort="latest"]')
        ?.classList.add("active");
      document.getElementById("subcategoryFilterGroup").style.display = "none";
      loadCategories();
      loadPosts(true);
    } else {
      currentCreatorFilters = {
        sort: "followers",
        offset: 0,
        limit: 12,
      };
      const creatorSearchInput = document.getElementById("creatorSearchInput");
      if (creatorSearchInput) {
        creatorSearchInput.value = "";
      }

      currentCreatorFilters = {
        sort: "followers",
        search: "",
        offset: 0,
        limit: 12,
      };

      document
        .querySelectorAll(".creator-sort-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelector('.creator-sort-btn[data-creator-sort="followers"]')
        ?.classList.add("active");
      loadCreators(true);
    }
  });

  // Clear subcategory
  document
    .getElementById("btnClearSubcategory")
    ?.addEventListener("click", () => {
      currentFilters.subcategoryId = null;
      currentFilters.offset = 0;
      loadSubcategories(currentFilters.categoryId);
      loadPosts(true);
    });

  // Load more button
  document.getElementById("btnLoadMore")?.addEventListener("click", () => {
    if (currentMode === "posts") {
      if (hasMorePosts && !isLoading) {
        currentFilters.offset += currentFilters.limit;
        loadPosts(false);
      }
    } else {
      if (hasMoreCreators && !isLoading) {
        currentCreatorFilters.offset += currentCreatorFilters.limit;
        loadCreators(false);
      }
    }
  });

  // Stat cards
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.addEventListener("click", () => {
      const stat = card.getAttribute("data-stat");
      if (["showcase", "service", "product"].includes(stat)) {
        // Switch to posts mode
        switchMode("posts");
        document.querySelector(`.filter-btn[data-type="${stat}"]`)?.click();
        document
          .querySelector(".filter-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
  const creatorSearchInput = document.getElementById("creatorSearchInput");
  if (creatorSearchInput) {
    let searchTimeout;
    creatorSearchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentCreatorFilters.search = e.target.value.trim();
        currentCreatorFilters.offset = 0;
        loadCreators(true);
      }, 300); // Debounce search
    });
  }

  // Clear creator search
  const btnClearCreatorSearch = document.getElementById(
    "btnClearCreatorSearch"
  );
  if (btnClearCreatorSearch) {
    btnClearCreatorSearch.addEventListener("click", () => {
      if (creatorSearchInput) {
        creatorSearchInput.value = "";
        currentCreatorFilters.search = "";
        currentCreatorFilters.offset = 0;
        loadCreators(true);
      }
    });
  }
}

// ===== UTILITIES =====
// Inline SVG placeholder - no external file needed
const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Crect x='150' y='80' width='100' height='80' rx='8' fill='%23cccccc'/%3E%3Ccircle cx='200' cy='60' r='25' fill='%23cccccc'/%3E%3Ctext x='200' y='210' text-anchor='middle' font-size='16' font-family='Arial,sans-serif' fill='%23999999'%3ENo Image%3C/text%3E%3C/svg%3E";

function constructMediaUrl(path, type = "post") {
  if (!path) return PLACEHOLDER_SVG;
  if (path.startsWith("http")) return path;

  const cleanPath = path.replace(/^\/+/, "").replace(/^uploads\//, "");
  return type === "profile"
    ? `${API_BASE_URL}/get-profile-pic/${cleanPath.split("/").pop()}`
    : `${API_BASE_URL}/uploads/${cleanPath.replace("posts/", "")}`;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
function generateDefaultAvatar(name) {
  const initial = (name || "U").charAt(0).toUpperCase();
  const colors = [
    "%23e60aea",
    "%23e336cc",
    "%239b59b6",
    "%233498db",
    "%232ecc71",
    "%23f39c12",
    "%23e74c3c",
    "%231abc9c",
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  return `data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='40' height='40' rx='20' fill='${colors[colorIndex]}'/%3E%3Ctext x='20' y='20' font-family='Arial,sans-serif' font-size='18' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central'%3E${initial}%3C/text%3E%3C/svg%3E`;
}
function showError(message) {
  showToast(message, "error");
}

// ===== LOGIN MODAL FUNCTIONS =====
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.handleLoginMessage = handleLoginMessage;

function openLoginModal() {
  console.log("🔐 Opening login modal");

  const modal = document.getElementById("loginModal");
  const iframe = document.getElementById("loginIframe");

  if (!modal || !iframe) {
    console.error("❌ Login modal elements not found");
    return;
  }

  iframe.src = "login.html";
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  window.addEventListener("message", handleLoginMessage);
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  const iframe = document.getElementById("loginIframe");

  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "auto";

  setTimeout(() => {
    if (iframe) iframe.src = "";
  }, 300);

  window.removeEventListener("message", handleLoginMessage);
}

function handleLoginMessage(event) {
  const { action, message, type } = event.data;

  switch (action) {
    case "loginSuccess":
      closeLoginModal();
      showToast("Login successful! Welcome back 🎉", "success");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      break;

    case "closeLoginModal":
      closeLoginModal();
      break;

    case "showToast":
      showToast(message, type);
      break;

    case "navigateToRegister":
      const iframe = document.getElementById("loginIframe");
      if (iframe) iframe.src = "registration.html";
      break;
    case "navigateToLogin":
      const loginIframe = document.getElementById("loginIframe");
      if (loginIframe) {
        loginIframe.src = "login.html";
      }
      break;
    default:
      break;
  }
}

// ===== THEME =====
const applyTheme = () => {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);

  const iframe = document.getElementById("postDetailIframe");
  if (iframe && iframe.contentWindow && iframe.src) {
    iframe.contentWindow.postMessage(
      { action: "themeChanged", theme: theme },
      "*"
    );
  }
};

window.addEventListener("storage", (e) => {
  if (e.key === "theme") applyTheme();
});

window.addEventListener("themeChanged", applyTheme);
applyTheme();
// ===== SCROLL LISTENER =====
function setupScrollListener() {
  const scrollToTop = document.getElementById("scrollToTop");
  if (!scrollToTop) return;

  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      scrollToTop.classList.add("show");
    } else {
      scrollToTop.classList.remove("show");
    }
  });

  scrollToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
// ===== AUTOPLAY VIDEOS ON SCROLL (Explorer) =====
(function setupExplorerVideoAutoplay() {
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
    document.querySelectorAll(".autoplay-video").forEach((video) => {
      if (!video.dataset.observed) {
        videoObserver.observe(video);
        video.dataset.observed = "true";
      }
    });
  }

  // Watch for new cards added when loading more posts
  const postsGrid = document.getElementById("postsGrid");
  if (postsGrid) {
    new MutationObserver(observeVideos).observe(postsGrid, {
      childList: true,
      subtree: true,
    });
  }

  // Initial scan (runs after first loadPosts completes)
  observeVideos();

  // Re-scan whenever posts are (re)rendered — filter/sort changes trigger loadPosts(true)
  const originalRenderPosts = window.renderPosts;
  window.renderPosts = function (...args) {
    if (originalRenderPosts) originalRenderPosts(...args);
    setTimeout(observeVideos, 100);
  };

  console.log("✅ Explorer video autoplay observer initialized");
})();

// ===== MUTE TOGGLE FOR EXPLORER VIDEOS =====
function toggleExplorerVideoMute(event, btn) {
  event.stopPropagation(); // Don't open post detail modal
  const video = btn.closest(".post-video-wrapper").querySelector("video");
  const icon = btn.querySelector("i");
  video.muted = !video.muted;
  icon.className = video.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
}

window.toggleExplorerVideoMute = toggleExplorerVideoMute;
