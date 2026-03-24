// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

console.log("🛒 Bazaar API URL:", API_BASE_URL);

// ===== GET CURRENT USER ID =====
function getCurrentUserId() {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) return null;

    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.user_id || payload.userId || null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

// ===== STATE =====
let currentFilters = {
  type: "all",
  category_id: null,
  sort: "latest",
  min_price: null,
  max_price: null,
  offset: 0,
  limit: 500,
};

const BAZAAR_POST_TYPES = ["service", "product"];
let currentView = "grid";
let allCategories = { service: [], product: [] };
let hasMoreItems = true;
let isLoading = false;

// ===== GLOBAL FUNCTIONS =====
window.openPostDetail = openPostDetail;
window.closePostDetailModal = closePostDetailModal;
window.handleIframeMessage = handleIframeMessage;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.handleLoginMessage = handleLoginMessage;
window.handleBuyOrBook = handleBuyOrBook;
window.openServiceSummary = openServiceSummary;
window.openProductSummary = openProductSummary;
window.closeBookingModal = closeBookingModal;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Creator Bazaar loading...");

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

  await Promise.all([loadCategories(), loadItems()]);
  setupEventListeners();
  setupScrollListener();

  console.log("✅ Creator Bazaar ready");
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

// ===== LOAD CATEGORIES =====
async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/explore/categories`);
    const data = await response.json();

    if (data.success) {
      allCategories = data.categories;
      updateCategoryDropdown();
    }
  } catch (error) {
    console.error("❌ Error loading categories:", error);
  }
}

function updateCategoryDropdown() {
  const categorySelect = document.getElementById("categorySelect");
  if (!categorySelect) return;

  let categories = [];

  if (currentFilters.type === "all") {
    categories = [...allCategories.service, ...allCategories.product];
  } else if (
    currentFilters.type === "service" ||
    currentFilters.type === "product"
  ) {
    categories = allCategories[currentFilters.type] || [];
  }

  categorySelect.innerHTML = '<option value="">All Categories</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.category_id;
    option.textContent = `${category.icon || "📦"} ${category.category_name}`;
    if (currentFilters.category_id === category.category_id) {
      option.selected = true;
    }
    categorySelect.appendChild(option);
  });
}

// ===== LOAD ITEMS =====
async function loadItems(reset = false) {
  if (isLoading) return;

  isLoading = true;
  const itemsGrid = document.getElementById("itemsGrid");
  const itemsLoading = document.getElementById("itemsLoading");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const noResults = document.getElementById("noResults");

  if (reset) {
    currentFilters.offset = 0;
    itemsGrid.innerHTML = "";
    if (itemsLoading) itemsLoading.style.display = "grid";
    loadMoreContainer.style.display = "none";
    noResults.style.display = "none";
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    let postTypeParam = currentFilters.type;

    const params = new URLSearchParams({
      post_type: postTypeParam,
      sort: currentFilters.sort,
      limit: currentFilters.limit,
      offset: currentFilters.offset,
    });

    if (currentFilters.category_id)
      params.append("category_id", currentFilters.category_id);
    if (currentFilters.min_price !== null && currentFilters.min_price !== "")
      params.append("min_price", currentFilters.min_price);
    if (currentFilters.max_price !== null && currentFilters.max_price !== "")
      params.append("max_price", currentFilters.max_price);

    const apiUrl = `${API_BASE_URL}/explore/posts?${params.toString()}`;

    console.log("🔍 API Request URL:", apiUrl);
    console.log("🔍 Current filters:", currentFilters);

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(
        `API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    console.log("📦 API Response:", {
      success: data.success,
      postCount: data.posts?.length,
      total: data.total,
      hasMore: data.has_more,
    });

    if (itemsLoading) itemsLoading.style.display = "none";

    if (data.success && data.posts.length > 0) {
      const filteredPosts = data.posts.filter(
        (post) => post.post_type === "service" || post.post_type === "product"
      );

      if (filteredPosts.length > 0) {
        let sortedPosts = [...filteredPosts];

        switch (currentFilters.sort) {
          case "price_low":
            sortedPosts.sort((a, b) => (a.price || 0) - (b.price || 0));
            console.log("📊 Client-side sort: Price Low to High");
            break;
          case "price_high":
            sortedPosts.sort((a, b) => (b.price || 0) - (a.price || 0));
            console.log("📊 Client-side sort: Price High to Low");
            break;
          case "popular":
            sortedPosts.sort((a, b) => (b.views || 0) - (a.views || 0));
            console.log("📊 Client-side sort: Popular");
            break;
          case "latest":
          default:
            sortedPosts.sort(
              (a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
            console.log("📊 Client-side sort: Latest");
            break;
        }

        if (
          currentFilters.min_price !== null ||
          currentFilters.max_price !== null
        ) {
          const minPrice =
            currentFilters.min_price !== null
              ? parseFloat(currentFilters.min_price)
              : 0;
          const maxPrice =
            currentFilters.max_price !== null
              ? parseFloat(currentFilters.max_price)
              : Infinity;

          sortedPosts = sortedPosts.filter((post) => {
            const price = parseFloat(post.price || 0);
            return price >= minPrice && price <= maxPrice;
          });

          console.log(
            `💰 Client-side price filter: ₹${minPrice} - ₹${maxPrice}, Results: ${sortedPosts.length}`
          );
        }

        renderItems(sortedPosts, reset);
        hasMoreItems = false; // Always show all
        loadMoreContainer.style.display = "none";
        updateResultsCount(sortedPosts.length, sortedPosts.length);
        noResults.style.display = "none";
      } else if (reset) {
        itemsGrid.innerHTML = "";
        noResults.style.display = "block";
        loadMoreContainer.style.display = "none";
        updateResultsCount(0, 0);
      }
    } else if (reset) {
      itemsGrid.innerHTML = "";
      noResults.style.display = "block";
      loadMoreContainer.style.display = "none";
      updateResultsCount(0, 0);
    }
  } catch (error) {
    console.error("❌ Error loading items:", error);
    if (itemsLoading) itemsLoading.style.display = "none";
    showToast("Failed to load items", "error");
  } finally {
    isLoading = false;
  }
}

function renderItems(items, reset = false) {
  const itemsGrid = document.getElementById("itemsGrid");
  if (reset) itemsGrid.innerHTML = "";

  items.forEach((item) => {
    const card = createItemCard(item);
    itemsGrid.appendChild(card);
  });
}

function createItemCard(item) {
  const card = document.createElement("div");
  card.className = `item-card ${currentView === "list" ? "list-view" : ""}`;

  const mediaUrl = constructMediaUrl(item.media_url);
  const profilePicUrl = constructMediaUrl(item.profile_pic, "profile");
  const isVideo =
    item.media_type === "video" ||
    item.media_url?.toLowerCase().match(/\.(mp4|webm)$/);

  const typeClass =
    item.post_type === "service" ? "badge-service" : "badge-product";
  const typeIcon =
    item.post_type === "service" ? "fas fa-briefcase" : "fas fa-shopping-bag";
  const typeText = item.post_type === "service" ? "Service" : "Product";

  const title = item.product_title || item.title || item.caption || "Untitled";
  const description = item.short_description || item.caption || "";

  const actionBtn =
    item.post_type === "service"
      ? '<i class="fas fa-calendar-check"></i> Book Now'
      : '<i class="fas fa-shopping-cart"></i> Buy Now';
  const actionClass = item.post_type === "service" ? "btn-book" : "btn-buy";

  // ✅ Check if this post belongs to the current user
  const currentUserId = getCurrentUserId();
  const isOwnPost = currentUserId && item.user_id === currentUserId;

  card.innerHTML = `
    <div class="item-media-container">
      <span class="item-badge ${typeClass}">
        <i class="${typeIcon}"></i> ${typeText}
      </span>
      ${
        isVideo
          ? `
          <div style="position:relative;width:100%;height:100%;">
            <video
              class="item-media bazaar-autoplay-video"
              muted
              loop
              playsinline
              preload="metadata"
              style="width:100%;height:100%;object-fit:cover;display:block;"
            >
              <source src="${mediaUrl}" type="video/mp4">
            </video>
            <button
              onclick="event.stopPropagation();toggleBazaarVideoMute(event,this)"
              style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);color:white;border:none;border-radius:50%;width:30px;height:30px;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;"
            >
              <i class="fas fa-volume-mute"></i>
            </button>
          </div>`
          : `<img src="${mediaUrl}" class="item-media" onerror="this.src='images/placeholder.png'" loading="lazy">`
      }
    </div>
    <div class="item-content">
      <div>
        ${
          item.category_name
            ? `<div class="item-category">
          <span>${item.category_icon || "📁"}</span>
          <span>${escapeHtml(item.category_name)}</span>
        </div>`
            : ""
        }
        <h3 class="item-title">${escapeHtml(title)}</h3>
        ${
          description
            ? `<p class="item-description">${escapeHtml(description)}</p>`
            : ""
        }
        <div class="item-price-section">
          <div class="item-price">₹${formatPrice(item.price || 0)}</div>
          ${
            item.service_duration
              ? `<div class="item-duration"><i class="fas fa-clock"></i> ${escapeHtml(
                  item.service_duration
                )}</div>`
              : ""
          }
        </div>
      </div>
      <div class="item-footer">
        <div class="item-seller">
          <img src="${profilePicUrl}" class="seller-avatar" onerror="this.onerror=null;this.src=generateDefaultAvatar('${escapeHtml(
    item.full_name || item.username
  )}')">
          <div class="seller-info">
            <div class="seller-name">${escapeHtml(
              item.full_name || item.username
            )}</div>
          </div>
        </div>
        <div class="item-actions">
          ${
            !isOwnPost
              ? `
          <button class="btn-action ${actionClass}" onclick="handleBuyOrBook(${item.post_id}, '${item.post_type}')">
            ${actionBtn}
          </button>
          `
              : '<span style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;"><i class="fas fa-user-check"></i> Your Post</span>'
          }
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (!e.target.closest(".btn-action")) {
      openPostDetail(item.post_id);
    }
  });

  return card;
}

function updateResultsCount(count, total) {
  let title = "All Items";

  if (currentFilters.type === "service") {
    title = "Services";
  } else if (currentFilters.type === "product") {
    title = "Products";
  }

  if (currentFilters.category_id) {
    const category = [...allCategories.service, ...allCategories.product].find(
      (c) => c.category_id === currentFilters.category_id
    );
    if (category) {
      title = category.category_name;
    }
  }

  document.getElementById("resultsTitle").textContent = title;
  document.getElementById("resultsCount").textContent =
    total > 0
      ? `Showing ${Math.min(currentFilters.offset + count, total)} of ${total}`
      : "No results found";
}

// ===== ✅ BUY OR BOOK HANDLER WITH IFRAME MODALS =====
function handleBuyOrBook(postId, type) {
  console.log(`🛒 ${type === "service" ? "Booking" : "Buying"} post:`, postId);

  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    showToast("Please login to continue", "error");
    setTimeout(() => openLoginModal(), 1000);
    return;
  }

  // ✅ Open appropriate modal based on type
  if (type === "service") {
    openServiceSummary(postId);
  } else {
    openProductSummary(postId);
  }
}

// ===== ✅ OPEN SERVICE SUMMARY IN IFRAME =====
function openServiceSummary(postId) {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  if (!token) {
    showToast("Please login to book services", "error");
    setTimeout(() => openLoginModal(), 1000);
    return;
  }

  console.log("🔖 Opening service booking for post:", postId);

  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "booking-modal";
  modal.id = "bookingModal";
  modal.innerHTML = `
    <div class="booking-modal-overlay" onclick="closeBookingModal()">
      <div class="booking-modal-content" onclick="event.stopPropagation()">
        <button class="modal-close-btn" onclick="closeBookingModal()" title="Close">
          <i class="fas fa-times"></i>
        </button>
        <iframe 
          src="service-summary.html?id=${postId}" 
          frameborder="0"
          id="bookingIframe"
          style="width: 100%; height: 100%; border: none; display: block;">
        </iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  // Listen for close message from iframe
  window.addEventListener("message", handleBookingMessage);
}

// ===== ✅ OPEN PRODUCT SUMMARY IN IFRAME =====
function openProductSummary(postId) {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  if (!token) {
    showToast("Please login to purchase products", "error");
    setTimeout(() => openLoginModal(), 1000);
    return;
  }

  console.log("🛒 Opening product purchase for post:", postId);

  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "booking-modal";
  modal.id = "bookingModal";
  modal.innerHTML = `
    <div class="booking-modal-overlay" onclick="closeBookingModal()">
      <div class="booking-modal-content" onclick="event.stopPropagation()">
        <button class="modal-close-btn" onclick="closeBookingModal()" title="Close">
          <i class="fas fa-times"></i>
        </button>
        <iframe 
          src="product-summary.html?id=${postId}" 
          frameborder="0"
          id="bookingIframe"
          style="width: 100%; height: 100%; border: none; display: block;">
        </iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  // Listen for close message from iframe
  window.addEventListener("message", handleBookingMessage);
}

// ===== ✅ CLOSE BOOKING MODAL =====
function closeBookingModal() {
  const modal = document.getElementById("bookingModal");
  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.remove();
    document.body.style.overflow = "auto";
  }, 300);

  window.removeEventListener("message", handleBookingMessage);
}

// ===== ✅ HANDLE BOOKING MESSAGE =====
function handleBookingMessage(event) {
  const { action, userId } = event.data;

  if (action === "closeModal") {
    closeBookingModal();
  } else if (action === "navigateToProfile" && userId) {
    // Close modal and navigate to profile
    closeBookingModal();
    setTimeout(() => {
      window.location.href = `profile.html?id=${userId}`;
    }, 300);
  }
}

// ===== POST DETAIL MODAL =====
function openPostDetail(postId) {
  console.log(`📋 Opening post detail for ID: ${postId}`);

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

// ===== LOGIN MODAL =====
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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Hero action buttons
  document.getElementById("btnSellService")?.addEventListener("click", () => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      showToast("Please login to sell services", "error");
      setTimeout(() => openLoginModal(), 1000);
      return;
    }
    window.location.href = "upload.html?type=service";
  });

  document.getElementById("btnSellProduct")?.addEventListener("click", () => {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      showToast("Please login to sell products", "error");
      setTimeout(() => openLoginModal(), 1000);
      return;
    }
    window.location.href = "upload.html?type=product";
  });

  // Type filter buttons (inline version)
  document.querySelectorAll(".type-btn-inline").forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("🔘 Type button clicked:", btn.getAttribute("data-type"));

      document
        .querySelectorAll(".type-btn-inline")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentFilters.type = btn.getAttribute("data-type");
      currentFilters.category_id = null;
      currentFilters.offset = 0;

      updateCategoryDropdown();
      loadItems(true);
    });
  });

  // Sort dropdown
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      const sortValue = e.target.value;
      console.log("🔽 Sort changed:", sortValue);

      currentFilters.sort = sortValue;
      currentFilters.offset = 0;

      console.log("📊 Current filters after sort:", currentFilters);
      loadItems(true);
    });
  }

  // Category dropdown
  const categorySelect = document.getElementById("categorySelect");
  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      const categoryId = e.target.value ? parseInt(e.target.value) : null;
      console.log("📁 Category changed:", categoryId);

      currentFilters.category_id = categoryId;
      currentFilters.offset = 0;
      loadItems(true);
    });
  }

  // Price range filter
  const applyPriceBtn = document.getElementById("btnApplyPrice");
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener("click", () => {
      const minPriceInput = document.getElementById("minPrice");
      const maxPriceInput = document.getElementById("maxPrice");

      const minPrice = minPriceInput?.value?.trim();
      const maxPrice = maxPriceInput?.value?.trim();

      console.log("💰 Applying price filter:", { minPrice, maxPrice });

      currentFilters.min_price =
        minPrice && minPrice !== "" ? parseFloat(minPrice) : null;
      currentFilters.max_price =
        maxPrice && maxPrice !== "" ? parseFloat(maxPrice) : null;
      currentFilters.offset = 0;

      console.log("💵 Price filters set to:", {
        min: currentFilters.min_price,
        max: currentFilters.max_price,
      });

      loadItems(true);
      showToast("Price filter applied", "success");
    });
  }

  // Reset filters
  document.getElementById("btnResetFilters")?.addEventListener("click", () => {
    console.log("🔄 Resetting all filters");

    currentFilters = {
      type: "all",
      category_id: null,
      sort: "latest",
      min_price: null,
      max_price: null,
      offset: 0,
      limit: 12,
    };

    const minPriceInput = document.getElementById("minPrice");
    const maxPriceInput = document.getElementById("maxPrice");
    const sortSelect = document.getElementById("sortSelect");
    const categorySelect = document.getElementById("categorySelect");

    if (minPriceInput) minPriceInput.value = "";
    if (maxPriceInput) maxPriceInput.value = "";
    if (sortSelect) sortSelect.value = "latest";
    if (categorySelect) categorySelect.value = "";

    document
      .querySelectorAll(".type-btn-inline")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector('.type-btn-inline[data-type="all"]')
      ?.classList.add("active");

    updateCategoryDropdown();
    loadItems(true);
    showToast("Filters reset", "success");
  });

  // View toggle
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".view-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentView = btn.getAttribute("data-view");
      const itemsGrid = document.getElementById("itemsGrid");

      if (currentView === "list") {
        itemsGrid.classList.add("list-view");
        itemsGrid.querySelectorAll(".item-card").forEach((card) => {
          card.classList.add("list-view");
        });
      } else {
        itemsGrid.classList.remove("list-view");
        itemsGrid.querySelectorAll(".item-card").forEach((card) => {
          card.classList.remove("list-view");
        });
      }
    });
  });

  // Load more
  document.getElementById("btnLoadMore")?.addEventListener("click", () => {
    if (hasMoreItems && !isLoading) {
      currentFilters.offset += currentFilters.limit;
      loadItems(false);
    }
  });
}

// ===== SCROLL LISTENER =====
function setupScrollListener() {
  const scrollToTop = document.getElementById("scrollToTop");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      scrollToTop?.classList.add("show");
    } else {
      scrollToTop?.classList.remove("show");
    }
  });

  scrollToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ===== UTILITY FUNCTIONS =====
function constructMediaUrl(path, type = "post") {
  if (!path) return "images/placeholder.png";
  // Already Cloudinary URL or other external URL - return as-is
  if (path.startsWith("http")) return path;
  // If it's a relative path, use API_BASE_URL (but after Cloudinary migration, backend returns full URLs)
  return path; // Fallback - but backend now returns full Cloudinary URLs
}
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN").format(price);
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
function showToast(message, type = "success") {
  const existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
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

console.log(
  "✅ Bazaar loaded with iframe modal functionality and own-post detection"
);
// ===== BAZAAR VIDEO AUTOPLAY =====
(function setupBazaarVideoAutoplay() {
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
    document.querySelectorAll(".bazaar-autoplay-video").forEach((video) => {
      if (!video.dataset.observed) {
        videoObserver.observe(video);
        video.dataset.observed = "true";
      }
    });
  }

  const itemsGrid = document.getElementById("itemsGrid");
  if (itemsGrid) {
    new MutationObserver(observeVideos).observe(itemsGrid, {
      childList: true,
      subtree: true,
    });
  }

  observeVideos();
  console.log("✅ Bazaar video autoplay initialized");
})();

function toggleBazaarVideoMute(event, btn) {
  event.stopPropagation();
  const wrapper = btn.closest("div[style*='position:relative']");
  const video = wrapper.querySelector("video");
  const icon = btn.querySelector("i");
  video.muted = !video.muted;
  icon.className = video.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
}

window.toggleBazaarVideoMute = toggleBazaarVideoMute;
