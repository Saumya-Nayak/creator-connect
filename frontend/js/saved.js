// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

// ===== STATE =====
let savedPosts = [];
let currentFilter = "all";
let currentView = "grid";
let isLoading = false;
let hasMore = false;
let currentOffset = 0;
const LIMIT = 12;
let confirmationCallback = null;

// ===== GLOBAL FUNCTIONS =====
window.openPostDetail = openPostDetail;
window.closePostDetailModal = closePostDetailModal;
window.handleIframeMessage = handleIframeMessage;
window.unsavePost = unsavePost;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Saved posts page loading...");

  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html?redirect=saved.html";
    return;
  }

  await loadHeaderAndSidebar();
  await loadSavedPosts();
  setupEventListeners();
  applyTheme();

  console.log("✅ Saved posts page ready");
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

// ===== LOAD SAVED POSTS =====
async function loadSavedPosts(loadMore = false) {
  if (isLoading) return;

  isLoading = true;
  const postsGrid = document.getElementById("savedPostsGrid");
  const loading = document.getElementById("savedLoading");
  const emptyState = document.getElementById("emptyState");
  const loadMoreContainer = document.getElementById("loadMoreContainer");

  if (!loadMore) {
    currentOffset = 0;
    postsGrid.innerHTML = "";
    loading.style.display = "grid";
    emptyState.style.display = "none";
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/saved-posts?limit=${LIMIT}&offset=${currentOffset}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (loading) loading.style.display = "none";

    if (data.success && data.posts.length > 0) {
      if (!loadMore) {
        savedPosts = data.posts;
      } else {
        savedPosts = [...savedPosts, ...data.posts];
      }

      renderPosts(data.posts, loadMore);
      updateSavedCount(data.total);
      updateResultsCount(savedPosts.length, data.total);

      hasMore = data.has_more;
      loadMoreContainer.style.display = hasMore ? "block" : "none";
      emptyState.style.display = "none";
    } else if (!loadMore) {
      postsGrid.innerHTML = "";
      emptyState.style.display = "flex";
      loadMoreContainer.style.display = "none";
      updateSavedCount(0);
      updateResultsCount(0, 0);
    }
  } catch (error) {
    console.error("❌ Error loading saved posts:", error);
    if (loading) loading.style.display = "none";
    showToast("Failed to load saved posts", "error");
  } finally {
    isLoading = false;
  }
}

// ===== RENDER POSTS =====
function renderPosts(posts, append = false) {
  const postsGrid = document.getElementById("savedPostsGrid");
  if (!append) postsGrid.innerHTML = "";

  posts.forEach((post) => {
    if (currentFilter !== "all" && post.post_type !== currentFilter) {
      return;
    }

    const card = createPostCard(post);
    postsGrid.appendChild(card);
  });
}

// ===== CREATE POST CARD =====
function createPostCard(post) {
  const card = document.createElement("div");
  card.className = `saved-post-card ${
    currentView === "list" ? "list-view" : ""
  }`;

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
            ? `<video class="saved-post-media" preload="metadata"><source src="${mediaUrl}"></video>`
            : `<img src="${mediaUrl}" class="saved-post-media" onerror="this.src='images/placeholder.png'" loading="lazy">`
        }
        
        <button class="unsave-btn" onclick="unsavePost(${
          post.post_id
        }, event)" title="Remove from saved">
            <i class="fas fa-bookmark"></i>
        </button>
        
        <span class="saved-badge">
            <i class="fas fa-bookmark"></i> Saved
        </span>
        
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
            
            <div class="saved-time">
                <i class="far fa-clock"></i>
                Saved ${getTimeAgo(post.saved_at)}
            </div>
        </div>
    `;

  card.addEventListener("click", (e) => {
    if (!e.target.closest(".unsave-btn")) {
      openPostDetail(post.post_id);
    }
  });

  return card;
}

// ===== UNSAVE POST =====
async function unsavePost(postId, event) {
  if (event) {
    event.stopPropagation();
  }

  showConfirmationModal(
    "Remove from Saved?",
    "Are you sure you want to remove this post from your saved collection?",
    async () => {
      try {
        const token =
          localStorage.getItem("authToken") ||
          sessionStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/save`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.success) {
          // Close modal first
          hideConfirmationModal();

          // Remove from UI
          savedPosts = savedPosts.filter((post) => post.post_id !== postId);

          // Re-render
          const postsGrid = document.getElementById("savedPostsGrid");
          postsGrid.innerHTML = "";
          renderPosts(savedPosts);

          // Update counts
          updateSavedCount(savedPosts.length);
          updateResultsCount(savedPosts.length, savedPosts.length);

          // Show empty state if no posts left
          if (savedPosts.length === 0) {
            document.getElementById("emptyState").style.display = "flex";
          }

          showToast("Post removed from saved", "success");
        } else {
          hideConfirmationModal();
          showToast(data.message || "Failed to unsave post", "error");
        }
      } catch (error) {
        console.error("❌ Error unsaving post:", error);
        hideConfirmationModal();
        showToast("Failed to unsave post", "error");
      }
    }
  );
}

// ===== CLEAR ALL SAVED =====
async function clearAllSaved() {
  if (savedPosts.length === 0) {
    showToast("No saved posts to clear", "error");
    return;
  }

  showConfirmationModal(
    "Clear All Saved Posts?",
    `Are you sure you want to remove all ${savedPosts.length} saved posts? This cannot be undone.`,
    async () => {
      const postsToRemove = [...savedPosts];
      let successCount = 0;

      const confirmBtn = document.getElementById("btnModalConfirm");
      confirmBtn.disabled = true;
      confirmBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Removing...';

      for (const post of postsToRemove) {
        try {
          const token =
            localStorage.getItem("authToken") ||
            sessionStorage.getItem("authToken");
          const response = await fetch(
            `${API_BASE_URL}/posts/${post.post_id}/save`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          const data = await response.json();
          if (data.success) {
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Error removing post ${post.post_id}:`, error);
        }
      }

      hideConfirmationModal();

      if (successCount > 0) {
        savedPosts = [];
        document.getElementById("savedPostsGrid").innerHTML = "";
        document.getElementById("emptyState").style.display = "flex";
        updateSavedCount(0);
        updateResultsCount(0, 0);
        showToast(`${successCount} posts removed from saved`, "success");
      } else {
        showToast("Failed to clear saved posts", "error");
      }
    }
  );
}

// ===== CONFIRMATION MODAL =====
function showConfirmationModal(title, text, onConfirm) {
  const modal = document.getElementById("confirmationModal");
  const titleElement = document.getElementById("confirmationTitle");
  const textElement = document.getElementById("confirmationText");
  const confirmBtn = document.getElementById("btnModalConfirm");

  titleElement.textContent = title;
  textElement.textContent = text;

  confirmationCallback = onConfirm;

  confirmBtn.disabled = false;
  confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Confirm';

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideConfirmationModal() {
  const modal = document.getElementById("confirmationModal");
  modal.classList.remove("show");
  document.body.style.overflow = "auto";
  confirmationCallback = null;
}

function handleConfirmation() {
  if (confirmationCallback) {
    confirmationCallback();
  }
}

// ===== FILTER POSTS =====
function filterPosts(type) {
  currentFilter = type;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-filter") === type) {
      btn.classList.add("active");
    }
  });

  const postsGrid = document.getElementById("savedPostsGrid");
  postsGrid.innerHTML = "";
  renderPosts(savedPosts);

  const visiblePosts = savedPosts.filter(
    (post) => type === "all" || post.post_type === type
  );

  updateResultsCount(visiblePosts.length, savedPosts.length);

  if (visiblePosts.length === 0 && savedPosts.length > 0) {
    postsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-filter" style="font-size: 3rem; color: var(--primary-purple); opacity: 0.3; margin-bottom: 15px;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 10px;">No ${type} posts saved</h3>
                <p style="color: var(--text-secondary);">Try a different filter</p>
            </div>
        `;
  }
}

// ===== UPDATE COUNTS =====
function updateSavedCount(count) {
  const countBadge = document.getElementById("savedCount");
  if (countBadge) {
    countBadge.textContent = `${count} ${count === 1 ? "Post" : "Posts"}`;
  }
}

function updateResultsCount(count, total) {
  const resultsTitle = document.getElementById("resultsTitle");
  const resultsCount = document.getElementById("resultsCount");

  if (!resultsTitle || !resultsCount) return;

  let title = "All Items";
  if (currentFilter === "showcase") title = "Showcase Posts";
  else if (currentFilter === "service") title = "Service Posts";
  else if (currentFilter === "product") title = "Product Posts";

  resultsTitle.textContent = title;
  resultsCount.textContent =
    total > 0 ? `${total} ${total === 1 ? "Post" : "Posts"}` : "0 Posts";
}

// ===== POST DETAIL MODAL =====
function openPostDetail(postId) {
  console.log(`📖 Opening post detail for ID: ${postId}`);

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

    case "postUnsaved":
      loadSavedPosts();
      break;

    default:
      break;
  }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-filter");
      filterPosts(filter);
    });
  });

  document
    .getElementById("btnClearAll")
    ?.addEventListener("click", clearAllSaved);

  document.getElementById("btnLoadMore")?.addEventListener("click", () => {
    if (hasMore && !isLoading) {
      currentOffset += LIMIT;
      loadSavedPosts(true);
    }
  });

  document.getElementById("btnExplore")?.addEventListener("click", () => {
    window.location.href = "explore.html";
  });

  document
    .querySelector(".post-detail-modal-overlay")
    ?.addEventListener("click", (e) => {
      if (e.target.classList.contains("post-detail-modal-overlay")) {
        closePostDetailModal();
      }
    });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".view-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentView = btn.getAttribute("data-view");
      const postsGrid = document.getElementById("savedPostsGrid");

      if (currentView === "list") {
        postsGrid.classList.add("list-view");
        postsGrid.querySelectorAll(".saved-post-card").forEach((card) => {
          card.classList.add("list-view");
        });
      } else {
        postsGrid.classList.remove("list-view");
        postsGrid.querySelectorAll(".saved-post-card").forEach((card) => {
          card.classList.remove("list-view");
        });
      }
    });
  });

  document
    .getElementById("btnModalCancel")
    ?.addEventListener("click", hideConfirmationModal);
  document
    .getElementById("btnModalConfirm")
    ?.addEventListener("click", handleConfirmation);

  document
    .querySelector(".confirmation-modal-overlay")
    ?.addEventListener("click", (e) => {
      if (e.target.classList.contains("confirmation-modal-overlay")) {
        hideConfirmationModal();
      }
    });
}

// ===== UTILITY FUNCTIONS =====
function constructMediaUrl(path, type = "post") {
  if (!path) return "images/placeholder.png";
  if (path.startsWith("http")) return path;
  return path;
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

function getTimeAgo(timestamp) {
  const now = new Date();
  const postTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - postTime) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;

  const options = { month: "short", day: "numeric" };
  if (now.getFullYear() !== postTime.getFullYear()) {
    options.year = "numeric";
  }
  return postTime.toLocaleDateString("en-US", options);
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
function applyTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);

  const iframe = document.getElementById("postDetailIframe");
  if (iframe && iframe.contentWindow && iframe.src) {
    iframe.contentWindow.postMessage(
      { action: "themeChanged", theme: theme },
      "*"
    );
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === "theme") applyTheme();
});

window.addEventListener("themeChanged", applyTheme);
