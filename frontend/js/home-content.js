// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

console.log("🔗 API Base URL:", API_BASE_URL);
window.handleNotificationClick = handleNotificationClick;
window.viewAllNotifications = viewAllNotifications;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.clearAllNotifications = clearAllNotifications;
window.showClearNotificationsModal = showClearNotificationsModal;
window.cancelClearNotifications = cancelClearNotifications;
window.confirmClearNotifications = confirmClearNotifications;

console.log("✅ Clear notifications modal functions loaded");
window.acceptFollowRequest = acceptFollowRequest;
window.rejectFollowRequest = rejectFollowRequest;

console.log("✅ Notification system functions loaded");
let currentUser = null;
let allPosts = [];
let displayedPosts = [];
let currentFilter = "all";
const POSTS_PER_PAGE = 10;
async function acceptFollowRequest(notificationId, senderId) {
  if (!currentUser) {
    showError("Please login to accept requests");
    return;
  }

  console.log(
    `✅ Accepting follow request - Notification: ${notificationId}, Sender: ${senderId}`
  );

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    // ✅ CRITICAL FIX: Find elements using event.target approach
    const clickedButton = event?.target?.closest(".notification-btn");
    const actionsDiv = clickedButton?.closest(".notification-actions");
    const notificationItem = clickedButton?.closest(".notification-item");

    // ✅ Fallback to traditional selection if event-based fails
    if (!actionsDiv || !notificationItem) {
      console.log("⚠️ Using fallback selection method");

      const foundItem = document.querySelector(
        `[data-notification-id="${notificationId}"]`
      );

      if (!foundItem) {
        console.error(`❌ Notification item not found: ${notificationId}`);
        showError("Notification not found");
        return;
      }

      const foundActions = foundItem.querySelector(".notification-actions");

      if (!foundActions) {
        console.error("❌ Actions div not found");
        return;
      }

      // Use found elements
      return handleAcceptRequest(
        notificationId,
        senderId,
        foundActions,
        foundItem,
        token
      );
    }

    // Use event-based elements (preferred)
    return handleAcceptRequest(
      notificationId,
      senderId,
      actionsDiv,
      notificationItem,
      token
    );
  } catch (error) {
    console.error("❌ Error accepting follow request:", error);
    showError("Failed to accept follow request. Please try again.");
  }
}

// ✅ NEW: Separate handler function for accept logic
async function handleAcceptRequest(
  notificationId,
  senderId,
  actionsDiv,
  notificationItem,
  token
) {
  try {
    console.log("✅ Found elements:", { actionsDiv, notificationItem });

    // ✅ Step 1: Show loading state
    actionsDiv.innerHTML = `
      <div style="text-align: center; padding: 8px; color: var(--primary-purple); font-size: 0.8rem;">
        <i class="fas fa-spinner fa-spin"></i> Processing...
      </div>
    `;

    // ✅ Step 2: Get pending requests
    console.log("📥 Fetching pending requests...");

    const pendingResponse = await fetch(
      `${API_BASE_URL}/follow-requests/pending`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!pendingResponse.ok) {
      throw new Error(
        `Failed to fetch pending requests: ${pendingResponse.status}`
      );
    }

    const pendingData = await pendingResponse.json();
    console.log("📋 Pending requests:", pendingData);

    if (!pendingData.success) {
      throw new Error(
        pendingData.message || "Failed to fetch pending requests"
      );
    }

    // ✅ Step 3: Find matching request
    const matchingRequest = pendingData.requests?.find(
      (req) => req.follower_id === senderId
    );

    if (!matchingRequest) {
      console.log("⚠️ No matching request found");

      actionsDiv.innerHTML = `
        <div style="
          text-align: center; 
          padding: 8px 12px; 
          background: var(--light-purple); 
          color: var(--text-secondary); 
          border-radius: 8px; 
          font-size: 0.75rem; 
          font-weight: 600;
        ">
          Already Processed
        </div>
      `;
      notificationItem.classList.remove("unread");

      await markNotificationAsRead(notificationId);
      await updateNotificationBadge();

      // ✅ NEW: Refresh notifications after processing
      await refreshNotificationsAfterAction();
      return;
    }

    console.log(`✅ Found matching request: ${matchingRequest.request_id}`);

    // ✅ Step 4: Accept the request
    const acceptResponse = await fetch(
      `${API_BASE_URL}/follow-requests/${matchingRequest.request_id}/accept`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!acceptResponse.ok) {
      throw new Error(`Failed to accept request: ${acceptResponse.status}`);
    }

    const acceptData = await acceptResponse.json();
    console.log("📨 Accept response:", acceptData);

    if (acceptData.success) {
      console.log("✅ Follow request accepted successfully");
      showSuccess("Follow request accepted!");

      // ✅ Step 5: Update UI with success message
      console.log("🎨 Updating actionsDiv with Accepted message...");

      actionsDiv.offsetHeight; // Force reflow

      actionsDiv.style.transition = "all 0.3s ease";
      actionsDiv.innerHTML = `
        <div style="
          text-align: center; 
          padding: 8px 12px; 
          background: linear-gradient(135deg, #4ade80, #22c55e); 
          color: white; 
          border-radius: 8px; 
          font-size: 0.8rem; 
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          animation: successPulse 0.5s ease;
        ">
          <i class="fas fa-check-circle"></i>
          <span>Accepted</span>
        </div>
      `;

      console.log("✅ UI updated with Accepted message");

      notificationItem.classList.remove("unread");
      await markNotificationAsRead(notificationId);

      // ✅ NEW: Refresh all notification displays
      setTimeout(async () => {
        await updateNotificationBadge();
        await refreshNotificationsAfterAction();
      }, 500);
    } else {
      console.error("❌ Accept failed:", acceptData.message);
      showError(acceptData.message || "Failed to accept request");
      restoreRequestButtons(notificationItem, notificationId, senderId);
    }
  } catch (error) {
    console.error("❌ Error in handleAcceptRequest:", error);
    showError("Failed to accept follow request. Please try again.");
    restoreRequestButtons(notificationItem, notificationId, senderId);
  }
}

async function rejectFollowRequest(notificationId, senderId) {
  if (!currentUser) {
    showError("Please login to reject requests");
    return;
  }

  console.log(
    `❌ Rejecting follow request - Notification: ${notificationId}, Sender: ${senderId}`
  );

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    // ✅ CRITICAL FIX: Find elements using event.target approach
    const clickedButton = event?.target?.closest(".notification-btn");
    const actionsDiv = clickedButton?.closest(".notification-actions");
    const notificationItem = clickedButton?.closest(".notification-item");

    // ✅ Fallback to traditional selection if event-based fails
    if (!actionsDiv || !notificationItem) {
      console.log("⚠️ Using fallback selection method");

      const foundItem = document.querySelector(
        `[data-notification-id="${notificationId}"]`
      );

      if (!foundItem) {
        console.error(`❌ Notification item not found: ${notificationId}`);
        showError("Notification not found");
        return;
      }

      const foundActions = foundItem.querySelector(".notification-actions");

      if (!foundActions) {
        console.error("❌ Actions div not found");
        return;
      }

      // Use found elements
      return handleRejectRequest(
        notificationId,
        senderId,
        foundActions,
        foundItem,
        token
      );
    }

    // Use event-based elements (preferred)
    return handleRejectRequest(
      notificationId,
      senderId,
      actionsDiv,
      notificationItem,
      token
    );
  } catch (error) {
    console.error("❌ Error rejecting follow request:", error);
    showError("Failed to reject follow request. Please try again.");
  }
}

// ✅ NEW: Separate handler function for reject logic
async function handleRejectRequest(
  notificationId,
  senderId,
  actionsDiv,
  notificationItem,
  token
) {
  try {
    console.log("✅ Found elements:", { actionsDiv, notificationItem });

    // ✅ Step 1: Show loading state
    actionsDiv.innerHTML = `
      <div style="text-align: center; padding: 8px; color: var(--primary-purple); font-size: 0.8rem;">
        <i class="fas fa-spinner fa-spin"></i> Processing...
      </div>
    `;

    // ✅ Step 2: Get pending requests
    console.log("📥 Fetching pending requests...");

    const pendingResponse = await fetch(
      `${API_BASE_URL}/follow-requests/pending`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!pendingResponse.ok) {
      throw new Error(
        `Failed to fetch pending requests: ${pendingResponse.status}`
      );
    }

    const pendingData = await pendingResponse.json();
    console.log("📋 Pending requests:", pendingData);

    if (!pendingData.success) {
      throw new Error(
        pendingData.message || "Failed to fetch pending requests"
      );
    }

    // ✅ Step 3: Find matching request
    const matchingRequest = pendingData.requests?.find(
      (req) => req.follower_id === senderId
    );

    if (!matchingRequest) {
      console.log("⚠️ No matching request found");

      actionsDiv.innerHTML = `
        <div style="
          text-align: center; 
          padding: 8px 12px; 
          background: var(--light-purple); 
          color: var(--text-secondary); 
          border-radius: 8px; 
          font-size: 0.75rem; 
          font-weight: 600;
        ">
          Already Processed
        </div>
      `;
      notificationItem.classList.remove("unread");

      await markNotificationAsRead(notificationId);
      await updateNotificationBadge();

      // ✅ NEW: Refresh notifications after processing
      await refreshNotificationsAfterAction();
      return;
    }

    console.log(`✅ Found matching request: ${matchingRequest.request_id}`);

    // ✅ Step 4: Reject the request
    const rejectResponse = await fetch(
      `${API_BASE_URL}/follow-requests/${matchingRequest.request_id}/reject`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!rejectResponse.ok) {
      throw new Error(`Failed to reject request: ${rejectResponse.status}`);
    }

    const rejectData = await rejectResponse.json();
    console.log("📨 Reject response:", rejectData);

    if (rejectData.success) {
      console.log("✅ Follow request rejected successfully");
      showSuccess("Follow request rejected");

      // ✅ Step 5: Update UI with rejected message
      console.log("🎨 Updating actionsDiv with Rejected message...");

      actionsDiv.offsetHeight; // Force reflow

      actionsDiv.style.transition = "all 0.3s ease";
      actionsDiv.innerHTML = `
        <div style="
          text-align: center; 
          padding: 8px 12px; 
          background: linear-gradient(135deg, #ff6b6b, #ee5a6f); 
          color: white; 
          border-radius: 8px; 
          font-size: 0.8rem; 
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          animation: successPulse 0.5s ease;
        ">
          <i class="fas fa-times-circle"></i>
          <span>Rejected</span>
        </div>
      `;

      console.log("✅ UI updated with Rejected message");

      notificationItem.classList.remove("unread");
      await markNotificationAsRead(notificationId);

      // ✅ NEW: Refresh all notification displays
      setTimeout(async () => {
        await updateNotificationBadge();
        await refreshNotificationsAfterAction();
      }, 500);
    } else {
      console.error("❌ Reject failed:", rejectData.message);
      showError(rejectData.message || "Failed to reject request");
      restoreRequestButtons(notificationItem, notificationId, senderId);
    }
  } catch (error) {
    console.error("❌ Error in handleRejectRequest:", error);
    showError("Failed to reject follow request. Please try again.");
    restoreRequestButtons(notificationItem, notificationId, senderId);
  }
}
async function refreshNotificationsAfterAction() {
  console.log("🔄 Refreshing notifications after action...");

  try {
    // Refresh the sidebar notification list
    await loadNotifications();

    // If the "View All" modal is open, refresh it too
    const allNotificationsList = document.getElementById(
      "allNotificationsList"
    );
    if (
      allNotificationsList &&
      allNotificationsList.closest(".notifications-modal")
    ) {
      console.log("🔄 Refreshing modal notifications...");
      await loadAllNotifications();
    }

    console.log("✅ Notifications refreshed successfully");
  } catch (error) {
    console.error("❌ Error refreshing notifications:", error);
  }
}

// ✅ NEW: Function to check if notification modal is open
function isNotificationModalOpen() {
  const modal = document.querySelector(".notifications-modal");
  return modal !== null;
}
// ✅ Helper function to restore action buttons on error
function restoreRequestButtons(notificationItem, notificationId, senderId) {
  if (!notificationItem) return;

  const actionsDiv = notificationItem.querySelector(".notification-actions");
  if (actionsDiv) {
    actionsDiv.innerHTML = `
      <button class="notification-btn accept-btn" onclick="acceptFollowRequest(${notificationId}, ${senderId})">
        <i class="fas fa-check"></i> Accept
      </button>
      <button class="notification-btn reject-btn" onclick="rejectFollowRequest(${notificationId}, ${senderId})">
        <i class="fas fa-times"></i> Reject
      </button>
    `;
  }
}

console.log("✅ Fixed notification handlers loaded");
console.log("✅ Notification system functions loaded");
// ===== WAIT FOR DOM TO BE READY =====
if (document.readyState === "loading") {
  console.log("⏳ Waiting for DOM to load...");
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  console.log("✅ DOM already loaded, initializing immediately");
  initializeApp();
}
function setupAuthEventListeners() {
  console.log("🔄 Setting up auth event listeners for auto-refresh");

  // Listen for login event
  window.addEventListener("userLoggedIn", async () => {
    checkAuth();
    showNotificationPanel();

    // Wait a tick for DOM to settle
    await new Promise((resolve) => setTimeout(resolve, 200));

    await Promise.all([loadPosts(), loadSuggestedUsers(), loadStats()]);
    await initializeNotifications();
  });

  // Listen for logout event
  window.addEventListener("userLoggedOut", async () => {
    console.log("🚪 User logged out - refreshing home content");

    // Clear current user
    currentUser = null;

    // Hide notification panel FIRST
    hideNotificationPanel();

    // Reload all data (public posts only)
    await Promise.all([loadPosts(), loadSuggestedUsers(), loadStats()]);

    console.log("✅ Feed refreshed after logout");
  });

  // Listen for storage changes (login/logout in another tab)
  window.addEventListener("storage", async (e) => {
    if (
      e.key === "authToken" ||
      e.key === "userData" ||
      e.key === "sessionData"
    ) {
      console.log("🔄 Auth status changed in another tab - refreshing");

      // Re-check auth status
      const wasLoggedIn = !!currentUser;
      checkAuth();
      const isLoggedIn = !!currentUser;

      // Only reload if auth status actually changed
      if (wasLoggedIn !== isLoggedIn) {
        // Reload all data
        await Promise.all([loadPosts(), loadSuggestedUsers(), loadStats()]);

        // Update notifications
        if (currentUser) {
          showNotificationPanel();
          await initializeNotifications();
          showSuccess("Logged in from another tab");
        } else {
          hideNotificationPanel();
          showSuccess("Logged out from another tab");
        }
      }
    }
  });

  // Listen for profile updates
  window.addEventListener("profileUpdated", (event) => {
    console.log("👤 Profile updated - refreshing suggested users");
    loadSuggestedUsers();
  });

  console.log("✅ Auth event listeners setup complete");
}

// ===== ADD NEW FUNCTION: showNotificationPanel() =====
function showNotificationPanel() {
  const notificationsCard = document.querySelector(".notifications-card");
  if (notificationsCard) {
    notificationsCard.style.display = "block";
    console.log("✅ Notification panel shown");
  }
}
async function initializeApp() {
  console.log("🚀 Home content initializing...");

  await new Promise((resolve) => setTimeout(resolve, 100));

  const postsFeed = document.getElementById("postsFeed");
  const postsLoading = document.getElementById("postsLoading");
  injectModalStyles();

  if (!postsFeed || !postsLoading) {
    console.error("❌ Critical elements not found:", {
      postsFeed: !!postsFeed,
      postsLoading: !!postsLoading,
    });
    return;
  }

  console.log("✅ All critical DOM elements found");

  try {
    checkAuth();
    applyTheme();

    await Promise.all([loadPosts(), loadSuggestedUsers(), loadStats()]);

    setupEventListeners();
    setupScrollListener();

    // ✅ ADD THESE TWO LINES:
    initializeNotifications();
    // startNotificationPolling(); // Optional: for real-time updates
    setupAuthEventListeners();
    console.log("✅ Home content initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing app:", error);
    showError("Failed to initialize. Please refresh the page.");
  }
}
window.setupAuthEventListeners = setupAuthEventListeners;

console.log("✅ Auto-refresh auth listeners loaded");
function injectModalStyles() {
  if (!document.getElementById("postDetailModalStyles")) {
    const styleElement = document.createElement("style");
    styleElement.id = "postDetailModalStyles";
    styleElement.textContent = `
/* ===== POST DETAIL MODAL ===== */
.post-detail-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.post-detail-modal.show {
  opacity: 1;
  visibility: visible;
}

.post-detail-modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  cursor: pointer;
}

.post-detail-modal-content {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  background: var(--card-bg);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  cursor: default;
  transform: scale(0.9);
  transition: transform 0.3s ease;
}

.post-detail-modal.show .post-detail-modal-content {
  transform: scale(1);
}

.modal-close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.3s ease;
}

.modal-close-btn:hover {
  background: var(--primary-purple);
  border-color: var(--primary-purple);
  transform: rotate(90deg);
}

#postDetailIframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Responsive */
@media (max-width: 768px) {
  .post-detail-modal-overlay {
    padding: 0;
  }

  .post-detail-modal-content {
    max-width: 100%;
    height: 100vh;
    border-radius: 0;
  }

  .modal-close-btn {
    top: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .modal-close-btn {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }
}
    `;
    document.head.appendChild(styleElement);
  }
}
// ===== AUTHENTICATION =====
function checkAuth() {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");

  console.log("🔐 Auth check:", { hasToken: !!token, hasUserData: !!userData });

  if (token && userData) {
    try {
      currentUser = JSON.parse(userData);

      // Show create post section if it exists
      const createPostSection = document.getElementById("createPostSection");
      if (createPostSection) {
        createPostSection.style.display = "block";
      }

      // Update avatar if element exists
      const avatarEl = document.getElementById("currentUserAvatar");
      if (avatarEl && currentUser.profile_pic) {
        avatarEl.src = constructMediaUrl(currentUser.profile_pic, "profile");
        avatarEl.onerror = () => {
          avatarEl.src = "images/default-avatar.png";
        };
      }

      console.log("✅ User authenticated:", currentUser.username);

      // ✅ NEW: Return true to indicate authenticated
      return true;
    } catch (e) {
      console.error("❌ Error parsing user data:", e);
      currentUser = null;
      return false;
    }
  } else {
    console.log("ℹ️ No authentication - guest mode");
    currentUser = null;

    // Hide create post section
    const createPostSection = document.getElementById("createPostSection");
    if (createPostSection) {
      createPostSection.style.display = "none";
    }

    return false;
  }
}
async function refreshFeedAfterAuth() {
  console.log("🔄 Refreshing feed after auth change...");

  try {
    // Show loading state
    const postsFeed = document.getElementById("postsFeed");
    const postsLoading = document.getElementById("postsLoading");

    if (postsLoading) postsLoading.style.display = "flex";
    if (postsFeed) postsFeed.innerHTML = "";

    // Reload all data
    await Promise.all([loadPosts(), loadSuggestedUsers(), loadStats()]);

    // Update notifications
    if (currentUser) {
      await initializeNotifications();
    } else {
      hideNotificationPanel();
    }

    console.log("✅ Feed refresh complete");
  } catch (error) {
    console.error("❌ Error refreshing feed:", error);
    showError("Failed to refresh feed");
  }
}

window.refreshFeedAfterAuth = refreshFeedAfterAuth;

console.log("✅ Enhanced checkAuth loaded");
// ===== THEME MANAGEMENT =====
function applyTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
}
window.openPostDetail = openPostDetail;
window.closePostDetailModal = closePostDetailModal;
window.handleIframeMessage = handleIframeMessage;
window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    applyTheme();

    // Send theme update to iframe if it exists
    const iframe = document.getElementById("postDetailIframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { action: "themeChanged", theme: e.newValue },
        "*"
      );
    }
  }
});

window.addEventListener("themeChanged", () => {
  applyTheme();

  // Send theme update to iframe if it exists
  const iframe = document.getElementById("postDetailIframe");
  if (iframe && iframe.contentWindow) {
    const theme = localStorage.getItem("theme") || "light";
    iframe.contentWindow.postMessage(
      { action: "themeChanged", theme: theme },
      "*"
    );
  }
});

console.log("✅ Post detail modal functions loaded");

// ===== MEDIA URL CONSTRUCTION =====
function constructMediaUrl(path, type = "post") {
  if (!path) return "images/placeholder.png";
  if (path.startsWith("http")) return path;
  return path;
}

// ===== LOAD POSTS =====
async function loadPosts() {
  const postsLoading = document.getElementById("postsLoading");
  const postsFeed = document.getElementById("postsFeed");
  const noPostsMessage = document.getElementById("noPostsMessage");

  console.log("📥 Loading posts from:", `${API_BASE_URL}/posts/public`);

  if (!postsFeed || !postsLoading) {
    console.error("❌ Cannot load posts - DOM elements missing");
    return;
  }

  try {
    postsLoading.style.display = "flex";

    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/posts/public`, {
      method: "GET",
      headers: headers,
    });

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📊 Posts data received:", data);

    if (data.success && data.posts && data.posts.length > 0) {
      allPosts = data.posts;
      console.log(`✅ Loaded ${allPosts.length} posts`);

      if (allPosts.length > 0) {
        console.log("🔍 First post sample:", allPosts[0]);
      }

      filterPosts(currentFilter);
      if (noPostsMessage) noPostsMessage.style.display = "none";
    } else {
      console.log("⚠️ No posts found");
      allPosts = [];
      displayedPosts = [];
      postsFeed.innerHTML = "";
      if (noPostsMessage) noPostsMessage.style.display = "block";
    }
  } catch (error) {
    console.error("❌ Error loading posts:", error);
    showError("Failed to load posts. Please refresh the page.");
    if (noPostsMessage) noPostsMessage.style.display = "block";
  } finally {
    postsLoading.style.display = "none";
  }
}

// ===== FILTER POSTS =====
function filterPosts(filter) {
  currentFilter = filter;

  // Update button states
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.filter === filter) {
      btn.classList.add("active");
    }
  });

  console.log(`🔍 Filtering posts by: ${filter}`);
  console.log(`📊 Total posts before filter: ${allPosts.length}`);

  // ✅ FIX: Properly filter based on post_type
  if (filter === "all") {
    displayedPosts = [...allPosts];
  } else if (filter === "showcase") {
    displayedPosts = allPosts.filter((post) => post.post_type === "showcase");
  } else if (filter === "selling") {
    // ✅ "selling" filter should show BOTH service AND product posts
    displayedPosts = allPosts.filter(
      (post) => post.post_type === "service" || post.post_type === "product"
    );
  } else {
    // Fallback: treat filter as exact post_type match
    displayedPosts = allPosts.filter((post) => post.post_type === filter);
  }

  console.log(`✅ Filtered posts (${filter}): ${displayedPosts.length}`);
  console.log(
    `📋 Post types in filtered results:`,
    displayedPosts
      .map((p) => p.post_type)
      .reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
  );

  renderPosts();
}

// ===== RENDER POSTS =====
function renderPosts() {
  const postsFeed = document.getElementById("postsFeed");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const noPostsMessage = document.getElementById("noPostsMessage");

  if (!postsFeed) {
    console.error("❌ postsFeed element not found in renderPosts");
    return;
  }

  if (displayedPosts.length === 0) {
    postsFeed.innerHTML = "";
    if (loadMoreContainer) loadMoreContainer.style.display = "none";
    if (noPostsMessage) noPostsMessage.style.display = "block";
    console.log("⚠️ No posts to display");
    return;
  }

  if (noPostsMessage) noPostsMessage.style.display = "none";
  postsFeed.innerHTML = "";

  const postsToShow = displayedPosts.slice(0, POSTS_PER_PAGE);
  console.log(`🎨 Rendering ${postsToShow.length} posts`);

  postsToShow.forEach((post) => {
    try {
      const postCard = createPostCard(post);
      postsFeed.appendChild(postCard);
    } catch (error) {
      console.error(`❌ Error rendering post ${post.post_id}:`, error);
    }
  });

  if (loadMoreContainer) {
    loadMoreContainer.style.display =
      displayedPosts.length > POSTS_PER_PAGE ? "block" : "none";
  }
}

// ===== CREATE POST CARD =====
function createPostCard(post) {
  const card = document.createElement("div");
  card.className = "post-card";
  card.setAttribute("data-post-id", post.post_id);
  card.setAttribute("data-post-type", post.post_type);

  const timeAgo = getTimeAgo(post.created_at);
  const profilePicUrl = constructMediaUrl(post.profile_pic, "profile");
  const mediaUrl = constructMediaUrl(post.media_url || post.media_path, "post");

  const isVideo =
    post.media_type === "video" ||
    (post.media_url &&
      (post.media_url.toLowerCase().endsWith(".mp4") ||
        post.media_url.toLowerCase().endsWith(".webm") ||
        post.media_url.toLowerCase().endsWith(".mov")));

  const isOwner = currentUser && currentUser.id === post.user_id;
  const isSellingPost =
    post.post_type === "service" || post.post_type === "product";

  console.log(
    `🎨 Rendering post ${post.post_id} - Type: ${post.post_type}, Selling: ${isSellingPost}`
  );

  // ✅ NEW: Build category/subcategory badge
  let categoryBadge = "";
  if (post.category_name || post.subcategory_name) {
    const categoryText = post.subcategory_name || post.category_name || "";
    const categoryIcon = getCategoryIcon(post.post_type);

    categoryBadge = `
      <div class="post-category-badge">
        <i class="${categoryIcon}"></i>
        <span>${escapeHtml(categoryText)}</span>
      </div>
    `;
  }

  // Find this section in createPostCard function:
  card.innerHTML = `
<div class="post-card-header">
  <div class="post-author" onclick="goToProfile(${post.user_id})">
    <img 
      src="${profilePicUrl}" 
      alt="${escapeHtml(post.full_name)}" 
      class="post-author-avatar" 
      onerror="this.src=generateDefaultAvatar('${escapeHtml(post.full_name)}')"
    >
    <div class="post-author-info">
      <div class="post-author-name">${escapeHtml(post.full_name)}</div>
      <div class="post-author-username">@${escapeHtml(post.username)}</div>
      <div class="post-time">
        <i class="far fa-clock"></i>
        ${timeAgo}
      </div>
    </div>
  </div>
  
  <!-- ✅ NEW: Post Menu with Dropdown -->
  <div class="post-menu-container">
    <button class="post-menu-btn" onclick="togglePostMenu(event, ${
      post.post_id
    })">
      <i class="fas fa-ellipsis-v"></i>
    </button>
    <div class="post-menu-dropdown" id="post-menu-${post.post_id}">
      <div class="post-menu-option" onclick="toggleSaveFromMenu(${
        post.post_id
      }, ${post.user_saved || false})">
        <i class="${post.user_saved ? "fas" : "far"} fa-bookmark"></i>
        <span>${post.user_saved ? "Unsave" : "Save"} Post</span>
      </div>
      <div class="post-menu-option" onclick="copyPostLink(${post.post_id})">
        <i class="fas fa-link"></i>
        <span>Copy Link</span>
      </div>
      
    </div>
  </div>
</div>

<!-- Rest of your post card HTML... -->

    
    </div>
    
    <div class="post-content">
      ${categoryBadge}
      
      
      
      ${
        post.caption
          ? `<p class="post-caption">${escapeHtml(post.caption)}</p>`
          : ""
      }
      
      ${
        post.tags
          ? `
          <div class="post-tags">
            ${post.tags
              .split(",")
              .map(
                (tag) =>
                  `<span class="post-tag">#${escapeHtml(tag.trim())}</span>`
              )
              .join("")}
          </div>
        `
          : ""
      }
    </div>
    
    ${
      mediaUrl && mediaUrl !== "images/placeholder.png"
        ? `
        <div class="post-media-container">
          ${
            isVideo
              ? `
  <div class="post-video-wrapper" style="position:relative;">
    <video 
      class="post-video autoplay-video" 
      muted
      loop 
      playsinline 
      preload="metadata"
      data-post-id="${post.post_id}"
      onclick="openPostDetail(${post.post_id})"
    >
      <source src="${mediaUrl}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <button 
      class="video-mute-btn" 
      onclick="toggleHomeVideoMute(event, this)" 
      title="Toggle sound"
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
              : `
              <img 
                src="${mediaUrl}" 
                alt="Post media" 
                class="post-media" 
                onclick="openPostDetail(${post.post_id})" 
                onerror="handleImageError(this, '${post.post_id}')"
                loading="lazy"
                style="cursor: pointer;"
              >
            `
          }
        </div>
      `
        : ""
    }
    
    ${
      isSellingPost && !isOwner
        ? `
      <div class="buy-button-container">
          ${
            post.post_type === "service"
              ? `
              <!-- Service: Book button only, NO contact button -->
              <button class="buy-now-btn service-btn" onclick="openServiceSummary(${
                post.post_id
              })">
                  <i class="fas fa-calendar-check"></i>
                  <span>Book Service - ${formatCurrency(post.price)}</span>
              </button>
          `
              : `
              <!-- Product Purchase Button -->
              <button class="buy-now-btn product-btn" onclick="openProductSummary(${
                post.post_id
              })">
                  <i class="fas fa-shopping-cart"></i>
                  <span>Buy Now - ${formatCurrency(post.price)}</span>
              </button>
              ${
                post.seller_phone_number || post.contact_phone
                  ? `
              <button class="contact-seller-btn" onclick="contactSeller('${
                post.seller_phone_number || post.contact_phone
              }', '${escapeHtml(post.product_title || post.title)}')">
                  <i class="fas fa-phone"></i>
                  <span>Contact Seller</span>
              </button>
              `
                  : ""
              }
          `
          }
      </div>
  `
        : ""
    }
    
    <div class="post-actions-bar">
      <div class="post-stats">
        <span class="post-stat">
          <i class="fas fa-heart"></i>
          <span id="likes-count-${post.post_id}">${post.likes_count || 0}</span>
        </span>
        <span class="post-stat">
          <i class="fas fa-comment"></i>
          <span>${post.comments_count || 0}</span>
        </span>
        <span class="post-stat">
          <i class="fas fa-share"></i>
          <span>${post.shares_count || 0}</span>
        </span>
      </div>
      
      <div class="post-actions-buttons">
        <button class="action-btn ${
          post.user_liked ? "liked" : ""
        }" id="like-btn-${post.post_id}" onclick="toggleLike(${
    post.post_id
  }, this)">
          <i class="${post.user_liked ? "fas" : "far"} fa-heart"></i>
          <span>Like</span>
        </button>
        <button class="action-btn" onclick="openComments(${post.post_id})">
          <i class="far fa-comment"></i>
          <span>Comment</span>
        </button>
        <button class="action-btn" onclick="sharePost(${post.post_id})">
          <i class="fas fa-share"></i>
          <span>Share</span>
        </button>
      </div>
    </div>
  `;

  return card;
}
// ===== GENERATE DEFAULT AVATAR WITH INITIALS =====
function generateDefaultAvatar(name) {
  const initial = (name || "U").charAt(0).toUpperCase();
  const colors = [
    "#e60aea",
    "#e336cc",
    "#9b59b6",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#e74c3c",
    "#1abc9c",
    "#16a085",
    "#27ae60",
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];

  // Create SVG data URL
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${color}"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="45" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">${initial}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
function getCategoryIcon(postType) {
  const icons = {
    showcase: "fas fa-images",
    service: "fas fa-briefcase",
    product: "fas fa-shopping-bag",
  };
  return icons[postType] || "fas fa-folder";
}
// ===== NEW FUNCTIONS FOR BUY/CONTACT =====

function openServiceSummary(postId) {
  if (!currentUser) {
    showError("Please login to book services");
    return;
  }

  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "post-detail-modal";
  modal.id = "bookingModal";
  modal.innerHTML = `
      <div class="post-detail-modal-overlay" onclick="closeBookingModal()">
          <div class="post-detail-modal-content" onclick="event.stopPropagation()">
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
function contactSeller(phoneNumber, itemTitle) {
  const message = encodeURIComponent(`Hi! I'm interested in: ${itemTitle}`);
  window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
}

function confirmPurchase(postId) {
  const post = allPosts.find((p) => p.post_id === postId);
  const isService = post && post.post_type === "service";

  showSuccess(
    isService
      ? "Thank you! Please complete payment and the service provider will contact you."
      : "Thank you! Please complete payment and contact the seller."
  );

  document.querySelector(".buy-modal").remove();
  document.body.style.overflow = "auto";
}

console.log("✅ Fixed filter logic and selling post detection loaded");
function openProductSummary(postId) {
  if (!currentUser) {
    showError("Please login to purchase products");
    return;
  }

  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "post-detail-modal";
  modal.id = "bookingModal";
  modal.innerHTML = `
      <div class="post-detail-modal-overlay" onclick="closeBookingModal()">
          <div class="post-detail-modal-content" onclick="event.stopPropagation()">
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

function handleBookingMessage(event) {
  const { action } = event.data;

  if (action === "closeModal") {
    closeBookingModal();
  }
}

// Make functions globally accessible
window.openServiceSummary = openServiceSummary;
window.openProductSummary = openProductSummary;
window.closeBookingModal = closeBookingModal;
// ===== LOAD SUGGESTED USERS =====
async function loadSuggestedUsers() {
  const suggestedUsersList = document.getElementById("suggestedUsersList");
  if (!suggestedUsersList) {
    console.error("❌ suggestedUsersList element not found");
    return;
  }

  console.log("👥 Loading suggested users...");

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // ✅ FIX: Use the correct endpoint
    const response = await fetch(`${API_BASE_URL}/users/suggested?limit=5`, {
      method: "GET",
      headers: headers,
    });

    console.log("📡 Suggested users response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📊 Suggested users response:", data);

    if (data.success && data.users && data.users.length > 0) {
      suggestedUsersList.innerHTML = "";

      data.users.forEach((user) => {
        const userCard = createSuggestedUserCard(user);
        suggestedUsersList.appendChild(userCard);
      });

      console.log(`✅ Loaded ${data.users.length} suggested users`);
    } else {
      // ✅ Show friendly message when no users found
      suggestedUsersList.innerHTML = `
        <div style="text-align: center; padding: 30px 20px;">
          <i class="fas fa-users" style="font-size: 3rem; color: var(--text-secondary); opacity: 0.5; margin-bottom: 15px;"></i>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">No suggestions available</p>
        </div>
      `;
      console.log("⚠️ No suggested users found");
    }
  } catch (error) {
    console.error("❌ Error loading suggested users:", error);

    // ✅ Show error message in UI
    suggestedUsersList.innerHTML = `
      <div style="text-align: center; padding: 30px 20px;">
        <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ff6b6b; opacity: 0.7; margin-bottom: 15px;"></i>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Failed to load suggestions</p>
        <button onclick="loadSuggestedUsers()" style="
          margin-top: 12px;
          background: var(--primary-purple);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
        ">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
  }
}
function handleAvatarError(img, name) {
  const initial = (name || "U").charAt(0).toUpperCase();
  const colors = [
    "#e60aea",
    "#e336cc",
    "#9b59b6",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#e74c3c",
    "#1abc9c",
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];

  // Create a canvas to draw the initial
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");

  // Draw background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 200, 200);

  // Draw initial
  ctx.fillStyle = "white";
  ctx.font = "bold 100px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, 100, 100);

  // Set the image src to canvas data URL
  img.src = canvas.toDataURL();
  img.onerror = null; // Prevent infinite loop
}

function createSuggestedUserCard(user) {
  const card = document.createElement("div");
  card.className = "suggestion-user";

  const profilePicUrl = constructMediaUrl(user.profile_pic, "profile");

  const fullName = user.full_name || user.username || "Unknown User";
  const username = user.username || "user";
  const followersCount = user.followers_count || 0;

  // ✅ NEW: Check if user is private and if request is pending
  let followButtonHTML = "";
  if (user.is_following) {
    followButtonHTML = `
      <button class="follow-btn following" onclick="toggleFollow(${user.user_id}, this)" id="follow-btn-${user.user_id}">
        Following
      </button>
    `;
  } else if (user.follow_request_pending) {
    followButtonHTML = `
      <button class="follow-btn requested" onclick="toggleFollow(${user.user_id}, this)" id="follow-btn-${user.user_id}" disabled>
        Requested
      </button>
    `;
  } else {
    followButtonHTML = `
      <button class="follow-btn" onclick="toggleFollow(${user.user_id}, this)" id="follow-btn-${user.user_id}">
        Follow
      </button>
    `;
  }

  card.innerHTML = `
    <img 
      src="${profilePicUrl}" 
      alt="${escapeHtml(fullName)}" 
      class="suggestion-avatar" 
      onclick="goToProfile(${user.user_id})" 
      onerror="handleAvatarError(this, '${escapeHtml(fullName)}')"
    >
    <div class="suggestion-info" onclick="goToProfile(${user.user_id})">
      <span class="suggestion-name">${escapeHtml(fullName)}</span>
      <span class="suggestion-username">@${escapeHtml(username)}</span>
      <span class="suggestion-stats">${followersCount} followers</span>
    </div>
    ${followButtonHTML}
  `;

  return card;
}
// ===== LOAD STATS =====
// ===== UPDATED LOAD STATS =====
async function loadStats() {
  console.log("📊 Loading platform stats...");
  try {
    const response = await fetch(`${API_BASE_URL}/stats/platform`);
    const data = await response.json();
    if (data.success) {
      const totalUsersEl = document.getElementById("totalUsers");
      const totalPostsEl = document.getElementById("totalPosts");
      const allPostsEl = document.getElementById("allPosts");
      if (totalUsersEl)
        totalUsersEl.textContent = formatNumber(data.stats.total_users || 0);
      if (totalPostsEl)
        totalPostsEl.textContent = formatNumber(data.stats.posts_today || 0);
      if (allPostsEl)
        allPostsEl.textContent = formatNumber(data.stats.total_posts || 0);
    }
  } catch (error) {
    console.error("❌ Error loading stats:", error);
  }

  // Load trending categories right after stats
  await loadTrendingCategories();
}
// ===== TRENDING CATEGORIES (dynamic) =====
async function loadTrendingCategories() {
  const list = document.getElementById("trendingList");
  if (!list) return;

  // Show skeleton while loading
  list.innerHTML = Array(5)
    .fill(
      `
    <div class="trending-item" style="opacity:.4;pointer-events:none;">
      <span class="trending-rank">—</span>
      <div class="trending-info">
        <span class="trending-tag" style="background:var(--border,#eee);color:transparent;border-radius:4px;">Loading…</span>
        <span class="trending-count">—</span>
      </div>
    </div>`
    )
    .join("");

  try {
    const res = await fetch(`${API_BASE_URL}/stats/trending-categories`);
    const data = await res.json();

    if (!data.success || !data.trending || data.trending.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--text-secondary);font-size:.85rem;padding:16px 0;">No trending data yet</p>`;
      return;
    }

    list.innerHTML = data.trending
      .map((cat, i) => {
        const icon = cat.icon || "📌";
        const postLabel =
          cat.total_posts === 1
            ? "1 post"
            : `${formatNumber(cat.total_posts)} posts`;
        const typeLabel =
          cat.post_type === "showcase"
            ? "Showcase"
            : cat.post_type === "service"
            ? "Service"
            : "Product";
        // Click navigates to explore filtered by this category slug
        const href = `explore.html?category=${encodeURIComponent(
          cat.category_slug
        )}&type=${cat.post_type}`;

        return `
        <div class="trending-item" onclick="window.location.href='${href}'" style="cursor:pointer;">
          <span class="trending-rank">#${i + 1}</span>
          <div class="trending-info">
            <span class="trending-tag">${icon} ${cat.category_name}</span>
            <span class="trending-count">${postLabel} · ${typeLabel}</span>
          </div>
        </div>`;
      })
      .join("");
  } catch (err) {
    console.error("❌ Error loading trending categories:", err);
    // Fallback to static on error
    list.innerHTML = `
      <div class="trending-item"><span class="trending-rank">#1</span><div class="trending-info"><span class="trending-tag">#Photography</span><span class="trending-count">—</span></div></div>
      <div class="trending-item"><span class="trending-rank">#2</span><div class="trending-info"><span class="trending-tag">#DigitalArt</span><span class="trending-count">—</span></div></div>
      <div class="trending-item"><span class="trending-rank">#3</span><div class="trending-info"><span class="trending-tag">#Design</span><span class="trending-count">—</span></div></div>`;
  }
}

// Make globally accessible
window.loadTrendingCategories = loadTrendingCategories;
// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      filterPosts(btn.dataset.filter);
    });
  });

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMorePosts);
  }
}

function loadMorePosts() {
  const postsFeed = document.getElementById("postsFeed");
  if (!postsFeed) return;

  const currentCount = postsFeed.children.length;
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const remainingBadge = document.getElementById("remainingBadge");

  const nextBatch = displayedPosts.slice(
    currentCount,
    currentCount + POSTS_PER_PAGE
  );

  nextBatch.forEach((post) => {
    postsFeed.appendChild(createPostCard(post));
  });

  const newCount = currentCount + nextBatch.length;
  const remaining = displayedPosts.length - newCount;

  if (newCount >= displayedPosts.length) {
    if (loadMoreContainer) loadMoreContainer.style.display = "none";
  } else {
    if (remainingBadge) remainingBadge.textContent = `+${remaining} more`;
  }
}

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

// ===== UTILITY FUNCTIONS =====
function getTimeAgo(timestamp) {
  const now = new Date();
  const postTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - postTime) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  const options = { month: "short", day: "numeric" };
  if (now.getFullYear() !== postTime.getFullYear()) {
    options.year = "numeric";
  }
  return postTime.toLocaleDateString("en-US", options);
}
function formatCurrency(amount, currency = "INR") {
  const symbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = symbols[currency] || currency;
  const numAmount = parseFloat(amount) || 0;
  return `${symbol}${numAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

function showError(message) {
  const toast = document.createElement("div");
  toast.className = "toast toast-error";
  toast.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showSuccess(message) {
  const toast = document.createElement("div");
  toast.className = "toast toast-success";
  toast.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== INTERACTIONS =====
async function toggleLike(postId, button) {
  if (!currentUser) {
    showError("Please login to like posts");
    return;
  }

  console.log("❤️ Toggle like for post:", postId);

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log("📊 Like response:", data);

    if (data.success) {
      // Update button visual state
      const icon = button.querySelector("i");
      const likesCountEl = document.getElementById(`likes-count-${postId}`);

      if (data.liked) {
        // User liked the post
        button.classList.add("liked");
        icon.classList.remove("far");
        icon.classList.add("fas");
        showSuccess("Post liked!");
      } else {
        // User unliked the post
        button.classList.remove("liked");
        icon.classList.remove("fas");
        icon.classList.add("far");
        showSuccess("Post unliked");
      }

      // Update like count
      if (likesCountEl) {
        likesCountEl.textContent = data.likes_count || 0;
      }

      // Update in allPosts array for consistency
      const postIndex = allPosts.findIndex((p) => p.post_id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].user_liked = data.liked;
        allPosts[postIndex].likes_count = data.likes_count;
      }
    } else {
      showError(data.message || "Failed to update like");
    }
  } catch (error) {
    console.error("❌ Error toggling like:", error);
    showError("Failed to update like. Please try again.");
  }
}
// ===== TOGGLE SAVE POST =====
async function toggleSave(postId, buttonElement) {
  if (!currentUser) {
    showError("Please login to save posts");
    return;
  }

  const saveBtn = buttonElement;
  const icon = saveBtn.querySelector("i");
  const text = saveBtn.querySelector("span");

  // Prevent double-clicking
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      if (data.saved) {
        saveBtn.classList.add("saved");
        icon.classList.remove("far");
        icon.classList.add("fas");
        if (text) text.textContent = "Saved";
        showSuccess("Post saved successfully!");
      } else {
        saveBtn.classList.remove("saved");
        icon.classList.remove("fas");
        icon.classList.add("far");
        if (text) text.textContent = "Save";
        showSuccess("Post removed from saved");
      }

      // Update save status in posts array
      const postIndex = allPosts.findIndex((p) => p.post_id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].user_saved = data.saved;
      }
    } else {
      showError(data.message || "Failed to save post");
    }
  } catch (error) {
    console.error("❌ Error toggling save:", error);
    showError("Failed to save post. Please try again.");
  } finally {
    setTimeout(() => {
      saveBtn.disabled = false;
    }, 300);
  }
}

// Make function globally accessible
window.toggleSave = toggleSave;
async function toggleFollow(userId, button) {
  if (!currentUser) {
    showError("Please login to follow users");
    return;
  }

  console.log("👥 Toggle follow for user:", userId);

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    // ✅ FIX: Use the correct profile/follow endpoint
    const response = await fetch(`${API_BASE_URL}/profile/${userId}/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log("📊 Follow response:", data);

    if (data.success) {
      // ✅ Check if it's a follow request (private profile)
      if (data.request_sent) {
        // Private profile - request sent
        button.textContent = "Requested";
        button.classList.add("requested");
        button.classList.remove("following");
        button.disabled = true; // Disable button while request is pending
        showSuccess("Follow request sent!");
      } else if (data.is_following) {
        // Public profile - direct follow
        button.textContent = "Following";
        button.classList.add("following");
        button.classList.remove("requested");
        button.disabled = false;
        showSuccess("User followed!");
      } else {
        // Unfollowed
        button.textContent = "Follow";
        button.classList.remove("following", "requested");
        button.disabled = false;
        showSuccess("User unfollowed");
      }
    } else {
      // Handle specific error messages
      if (data.already_following) {
        button.textContent = "Following";
        button.classList.add("following");
      } else if (data.request_pending) {
        button.textContent = "Requested";
        button.classList.add("requested");
        button.disabled = true;
      }

      showError(data.message || "Failed to update follow status");
    }
  } catch (error) {
    console.error("❌ Error toggling follow:", error);
    showError("Failed to update follow status. Please try again.");
  }
}
function goToProfile(userId) {
  window.location.href = `profile.html?id=${userId}`;
}

function openComments(postId) {
  openPostDetail(postId);
  //window.location.href = `post.html?id=${postId}`;
}

async function sharePost(postId) {
  if (!currentUser) {
    showError("Please login to share posts");
    return;
  }

  const post = allPosts.find((p) => p.post_id === postId);
  const url = `${window.location.origin}/post.html?id=${postId}`;
  const title = post?.product_title || post?.title || "Check out this post!";
  const text = encodeURIComponent(
    post?.caption || "Check out this amazing post on Creator Connect!"
  );

  const modal = document.createElement("div");
  modal.className = "share-modal";
  modal.id = `share-modal-${postId}`;
  modal.innerHTML = `
    <div class="share-modal-overlay" onclick="closeShareModal(${postId})">
      <div class="share-modal-content" onclick="event.stopPropagation()">
        <div class="share-modal-header">
          <h3><i class="fas fa-share"></i> Share Post</h3>
          <button class="share-modal-close" onclick="closeShareModal(${postId})">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="share-options">
          <button class="share-option-btn" onclick="shareViaLink(${postId})">
            <i class="fas fa-link"></i>
            <span>Copy Link</span>
          </button>
          
          <button class="share-option-btn" onclick="shareViaWhatsApp(${postId})">
            <i class="fab fa-whatsapp"></i>
            <span>WhatsApp</span>
          </button>
          
          <button class="share-option-btn" onclick="shareViaFacebook(${postId})">
            <i class="fab fa-facebook"></i>
            <span>Facebook</span>
          </button>
          
          <button class="share-option-btn" onclick="shareViaTwitter(${postId})">
            <i class="fab fa-twitter"></i>
            <span>Twitter</span>
          </button>
          
          
        </div>
        
        <div class="share-creators-section">
          <h4><i class="fas fa-paper-plane"></i> Send via Message</h4>
          <div class="share-creators-search">
            <i class="fas fa-search"></i>
            <input 
              type="text" 
              placeholder="Search people you follow..." 
              id="shareSearchInput-${postId}"
              oninput="searchUsersForShare(${postId}, this.value)"
            />
          </div>
          
          <div class="selected-users" id="selectedUsers-${postId}" style="display: none;">
            <div class="selected-users-header">
              <span class="selected-count">0 selected</span>
              <button class="clear-selection-btn" onclick="clearSelectedUsers(${postId})">
                <i class="fas fa-times"></i> Clear
              </button>
            </div>
            <div class="selected-users-list" id="selectedUsersList-${postId}"></div>
          </div>
          
          <div class="share-creators-list" id="shareCreatorsList-${postId}">
            <div class="loading-spinner">
              <i class="fas fa-spinner fa-spin"></i>
              <p>Loading people...</p>
            </div>
          </div>
        </div>
        
        <div class="share-modal-footer" id="shareFooter-${postId}" style="display: none;">
          <button class="btn-cancel" onclick="closeShareModal(${postId})">
            Cancel
          </button>
          <button class="btn-send-share" onclick="sendSharedPost(${postId})" id="sendShareBtn-${postId}">
            <i class="fas fa-paper-plane"></i>
            <span>Send to <span id="shareCount-${postId}">0</span> people</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  if (!window.selectedShareUsers) {
    window.selectedShareUsers = {};
  }
  window.selectedShareUsers[postId] = new Set();

  await loadUsersForShare(postId);
}

// Add these new share functions
function shareViaWhatsApp(postId) {
  const post = allPosts.find((p) => p.post_id === postId);
  const url = `${window.location.origin}/post.html?id=${postId}`;
  const text = encodeURIComponent(
    post?.caption || "Check out this amazing post on Creator Connect!"
  );

  window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  closeShareModal(postId);
  showSuccess("Opening WhatsApp...");
}

function shareViaFacebook(postId) {
  const url = `${window.location.origin}/post.html?id=${postId}`;
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    "_blank",
    "width=600,height=400"
  );
  closeShareModal(postId);
  showSuccess("Opening Facebook...");
}

function shareViaTwitter(postId) {
  const post = allPosts.find((p) => p.post_id === postId);
  const url = `${window.location.origin}/post.html?id=${postId}`;
  const text = encodeURIComponent(
    post?.caption || "Check out this amazing post on Creator Connect!"
  );

  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(
      url
    )}`,
    "_blank",
    "width=600,height=400"
  );
  closeShareModal(postId);
  showSuccess("Opening Twitter...");
}

// Make functions globally accessible
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaFacebook = shareViaFacebook;
window.shareViaTwitter = shareViaTwitter;
// ===== LOAD USERS FOR SHARING =====
// ===== LOAD USERS FOR SHARING =====
async function loadUsersForShare(postId) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(
      `${API_BASE_URL}/share/search-users?limit=50`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    console.log("📊 Users for sharing:", data);

    const listEl = document.getElementById(`shareCreatorsList-${postId}`);
    if (!listEl) return;

    if (data.success && data.users && data.users.length > 0) {
      listEl.innerHTML = "";

      data.users.forEach((user) => {
        const userItem = document.createElement("div");
        userItem.className = "share-user-item";
        userItem.dataset.userId = user.user_id;

        // ✅ ENHANCED: Handle missing profile picture
        let profilePicUrl;
        if (user.profile_pic) {
          profilePicUrl = constructMediaUrl(user.profile_pic, "profile");
        } else {
          profilePicUrl = generateDefaultAvatar(
            user.full_name || user.username
          );
        }

        userItem.innerHTML = `
          <input 
            type="checkbox" 
            class="share-user-checkbox" 
            id="share-user-${postId}-${user.user_id}"
            onchange="toggleUserSelection(${postId}, ${
          user.user_id
        }, this.checked)"
          />
          <label for="share-user-${postId}-${
          user.user_id
        }" class="share-user-label">
            <img 
              src="${profilePicUrl}" 
              alt="${escapeHtml(user.full_name)}" 
              class="share-user-avatar"
              onerror="this.src='${generateDefaultAvatar(
                user.full_name || user.username
              )}'"
            />
            <div class="share-user-info">
              <span class="share-user-name">${escapeHtml(user.full_name)}</span>
              <span class="share-user-username">@${escapeHtml(
                user.username
              )}</span>
            </div>
          </label>
        `;

        listEl.appendChild(userItem);
      });
    } else {
      listEl.innerHTML = `
        <div class="share-empty-state">
          <i class="fas fa-user-slash"></i>
          <p>No one to share with</p>
          <span>Follow people to share posts with them</span>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error loading users for share:", error);
    const listEl = document.getElementById(`shareCreatorsList-${postId}`);
    if (listEl) {
      listEl.innerHTML = `
        <div class="share-empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Failed to load users</p>
        </div>
      `;
    }
  }
}

function searchUsersForShare(postId, query) {
  const listEl = document.getElementById(`shareCreatorsList-${postId}`);
  if (!listEl) return;

  const items = listEl.querySelectorAll(".share-user-item");
  const lowerQuery = query.toLowerCase();

  items.forEach((item) => {
    const name = item.querySelector(".share-user-name").textContent;
    const username = item.querySelector(".share-user-username").textContent;

    if (
      name.toLowerCase().includes(lowerQuery) ||
      username.toLowerCase().includes(lowerQuery)
    ) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// ===== TOGGLE USER SELECTION =====
function toggleUserSelection(postId, userId, isSelected) {
  if (!window.selectedShareUsers) {
    window.selectedShareUsers = {};
  }

  if (!window.selectedShareUsers[postId]) {
    window.selectedShareUsers[postId] = new Set();
  }

  if (isSelected) {
    window.selectedShareUsers[postId].add(userId);
  } else {
    window.selectedShareUsers[postId].delete(userId);
  }

  updateSelectedUsersDisplay(postId);
}

// ===== UPDATE SELECTED USERS DISPLAY =====
// ===== UPDATE SELECTED USERS DISPLAY =====
function updateSelectedUsersDisplay(postId) {
  const selectedUsers = window.selectedShareUsers[postId] || new Set();
  const count = selectedUsers.size;

  const footerEl = document.getElementById(`shareFooter-${postId}`);
  const countEl = document.getElementById(`shareCount-${postId}`);
  const selectedContainer = document.getElementById(`selectedUsers-${postId}`);
  const selectedList = document.getElementById(`selectedUsersList-${postId}`);

  if (count > 0) {
    if (footerEl) footerEl.style.display = "flex";
    if (countEl) countEl.textContent = count;
    if (selectedContainer) selectedContainer.style.display = "block";

    // Show selected users
    if (selectedList) {
      selectedList.innerHTML = "";

      selectedUsers.forEach((userId) => {
        const userItem = document.querySelector(`[data-user-id="${userId}"]`);
        if (userItem) {
          const name = userItem.querySelector(".share-user-name").textContent;
          let avatar = userItem.querySelector(".share-user-avatar").src;

          // ✅ ENHANCED: Generate default avatar if none exists
          if (!avatar || avatar.includes("default-avatar.png")) {
            avatar = generateDefaultAvatar(name);
          }

          const chip = document.createElement("div");
          chip.className = "selected-user-chip";
          chip.innerHTML = `
            <img src="${avatar}" alt="${name}" onerror="this.src='${generateDefaultAvatar(
            name
          )}'" />
            <span>${name}</span>
            <button onclick="toggleUserSelection(${postId}, ${userId}, false); document.getElementById('share-user-${postId}-${userId}').checked = false;">
              <i class="fas fa-times"></i>
            </button>
          `;

          selectedList.appendChild(chip);
        }
      });
    }
  } else {
    if (footerEl) footerEl.style.display = "none";
    if (selectedContainer) selectedContainer.style.display = "none";
  }
}

// ===== CLEAR SELECTED USERS =====
function clearSelectedUsers(postId) {
  if (window.selectedShareUsers && window.selectedShareUsers[postId]) {
    window.selectedShareUsers[postId].clear();
  }

  // Uncheck all checkboxes
  const checkboxes = document.querySelectorAll(
    `#shareCreatorsList-${postId} .share-user-checkbox`
  );
  checkboxes.forEach((cb) => (cb.checked = false));

  updateSelectedUsersDisplay(postId);
}
// ===== MUTE TOGGLE FOR HOME FEED VIDEOS =====
function toggleHomeVideoMute(event, btn) {
  event.stopPropagation(); // Don't open post detail modal
  const video = btn.closest(".post-video-wrapper").querySelector("video");
  const icon = btn.querySelector("i");
  video.muted = !video.muted;
  icon.className = video.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
}

window.toggleHomeVideoMute = toggleHomeVideoMute;
// ===== SEND SHARED POST =====
async function sendSharedPost(postId) {
  const selectedUsers = window.selectedShareUsers[postId];

  if (!selectedUsers || selectedUsers.size === 0) {
    showError("Please select at least one person to share with");
    return;
  }

  const sendBtn = document.getElementById(`sendShareBtn-${postId}`);
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/share/post/${postId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient_ids: Array.from(selectedUsers),
      }),
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(`Post shared with ${data.shared_count} person(s)!`);
      closeShareModal(postId);

      // Update share count in UI
      const shareCountEl = document.querySelector(
        `[data-post-id="${postId}"] .post-stat:last-child span`
      );
      if (shareCountEl) {
        const currentCount = parseInt(shareCountEl.textContent) || 0;
        shareCountEl.textContent = currentCount + data.shared_count;
      }
    } else {
      showError(data.message || "Failed to share post");
    }
  } catch (error) {
    console.error("❌ Error sharing post:", error);
    showError("Failed to share post. Please try again.");
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML =
        '<i class="fas fa-paper-plane"></i> <span>Send</span>';
    }
  }
}

// Make functions globally accessible
window.loadUsersForShare = loadUsersForShare;
window.searchUsersForShare = searchUsersForShare;
window.toggleUserSelection = toggleUserSelection;
window.clearSelectedUsers = clearSelectedUsers;
window.sendSharedPost = sendSharedPost;

console.log("✅ Share post user selection functions loaded");
async function loadCreatorsForShare(postId) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/users/all?limit=20`, {
      headers: headers,
    });

    const data = await response.json();
    console.log("📊 Creators for sharing:", data);

    const listEl = document.getElementById(`shareCreatorsList-${postId}`);
    if (!listEl) return;

    if (data.success && data.users && data.users.length > 0) {
      listEl.innerHTML = "";

      data.users.forEach((user) => {
        const userItem = document.createElement("div");
        userItem.className = "share-creator-item";

        const profilePicUrl = constructMediaUrl(user.profile_pic, "profile");

        userItem.innerHTML = `
          <img 
            src="${profilePicUrl}" 
            alt="${escapeHtml(user.full_name)}" 
            onerror="this.src='images/default-avatar.png'"
          />
          <div class="share-creator-info">
            <span class="share-creator-name">${escapeHtml(
              user.full_name
            )}</span>
            <span class="share-creator-username">@${escapeHtml(
              user.username
            )}</span>
          </div>
          <button class="share-creator-btn" onclick="shareWithCreator(${postId}, ${
          user.user_id
        }, '${escapeHtml(user.full_name)}')">
            <i class="fas fa-paper-plane"></i>
          </button>
        `;

        listEl.appendChild(userItem);
      });
    } else {
      listEl.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No creators found</p>';
    }
  } catch (error) {
    console.error("❌ Error loading creators for share:", error);
    const listEl = document.getElementById(`shareCreatorsList-${postId}`);
    if (listEl) {
      listEl.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Failed to load creators</p>';
    }
  }
}

function searchCreatorsForShare(postId, query) {
  const listEl = document.getElementById(`shareCreatorsList-${postId}`);
  if (!listEl) return;

  const items = listEl.querySelectorAll(".share-creator-item");
  const lowerQuery = query.toLowerCase();

  items.forEach((item) => {
    const name = item.querySelector(".share-creator-name").textContent;
    const username = item.querySelector(".share-creator-username").textContent;

    if (
      name.toLowerCase().includes(lowerQuery) ||
      username.toLowerCase().includes(lowerQuery)
    ) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

async function shareWithCreator(postId, userId, userName) {
  if (!currentUser) {
    showError("Please login to share posts");
    return;
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    // In a real implementation, this would send a notification or message
    // For now, we'll just show a success message
    showSuccess(`Post shared with ${userName}!`);

    // Close the modal
    document.querySelector(".share-modal").remove();
    document.body.style.overflow = "auto";

    // Optional: Log the share action to your backend
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ shared_with: userId }),
    });

    const data = await response.json();
    console.log("📊 Share response:", data);
  } catch (error) {
    console.error("❌ Error sharing post:", error);
    showError("Failed to share post. Please try again.");
  }
}

function shareViaLink(postId) {
  const url = `${window.location.origin}/post.html?id=${postId}`;

  navigator.clipboard
    .writeText(url)
    .then(() => {
      showSuccess("Link copied to clipboard!");
      closeShareModal(postId);
    })
    .catch(() => {
      showError("Failed to copy link");
    });
}
function closeShareModal(postId) {
  const modal = document.getElementById(`share-modal-${postId}`);
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = "auto";
    }, 300);
  }
}
async function shareViaNative(postId) {
  const post = allPosts.find((p) => p.post_id === postId);
  if (!post) {
    showError("Post not found");
    return;
  }

  const url = `${window.location.origin}/post.html?id=${postId}`;
  const title = post.product_title || post.title || "Check out this post!";
  const text =
    post.caption ||
    post.short_description ||
    "I found this amazing post on Creator Connect!";

  // Check if Web Share API is supported
  if (!navigator.share) {
    // Fallback: Just copy link
    navigator.clipboard
      .writeText(url)
      .then(() => {
        showSuccess("Link copied! Share it anywhere you like.");
        closeShareModal(postId);
      })
      .catch(() => {
        showError(
          "Web Share not supported on this browser. Use 'Copy Link' instead."
        );
      });
    return;
  }

  try {
    await navigator.share({
      title: title,
      text: text,
      url: url,
    });

    showSuccess("Post shared successfully!");
    closeShareModal(postId);

    // Update share count
    const shareCountEl = document.querySelector(
      `[data-post-id="${postId}"] .post-stat:last-child span`
    );
    if (shareCountEl) {
      const currentCount = parseInt(shareCountEl.textContent) || 0;
      shareCountEl.textContent = currentCount + 1;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      // User cancelled - do nothing
      console.log("Share cancelled by user");
    } else {
      console.error("Error sharing:", error);

      // Fallback: Copy link instead
      navigator.clipboard
        .writeText(url)
        .then(() => {
          showSuccess("Couldn't open share menu. Link copied instead!");
          closeShareModal(postId);
        })
        .catch(() => {
          showError("Failed to share. Please try 'Copy Link' instead.");
        });
    }
  }
}
function openPostDetail(postId) {
  console.log(`🔍 Opening post detail for ID: ${postId}`);

  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "post-detail-modal";
  modal.id = "postDetailModal";
  modal.innerHTML = `
    <div class="post-detail-modal-overlay" onclick="closePostDetailModal()">
      <div class="post-detail-modal-content" onclick="event.stopPropagation()">
        <button class="modal-close-btn" onclick="closePostDetailModal()" title="Close">
          <i class="fas fa-times"></i>
        </button>
        <iframe 
          src="post-detail.html?id=${postId}" 
          frameborder="0"
          id="postDetailIframe"
        ></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  // Animate modal in
  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  // Listen for messages from iframe
  window.addEventListener("message", handleIframeMessage);
}

// ===== CLOSE POST DETAIL MODAL =====
function closePostDetailModal() {
  const modal = document.getElementById("postDetailModal");
  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.remove();
    document.body.style.overflow = "auto";
  }, 300);

  // Remove message listener
  window.removeEventListener("message", handleIframeMessage);
}

// ===== HANDLE IFRAME MESSAGES =====
function handleIframeMessage(event) {
  const { action, postId, message, type } = event.data;

  switch (action) {
    case "closeModal":
      closePostDetailModal();
      break;

    case "showToast":
      showToast(message, type);
      break;

    case "openBuyModal":
      closePostDetailModal();
      setTimeout(() => {
        openBuyModal(postId);
      }, 300);
      break;

    case "showComments":
      // Implement comments modal if you have one
      console.log("Show comments for post:", postId);
      closePostDetailModal();
      // You can redirect to a comments page or open comments modal
      // window.location.href = `post.html?id=${postId}`;
      break;

    default:
      break;
  }
}

// ===== SHOW TOAST NOTIFICATION =====
function showToast(message, type = "success") {
  // Remove existing toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
// ===== NOTIFICATION PANEL FUNCTIONS =====
window.openMobileNotifications = openMobileNotifications;
window.closeMobileNotifications = closeMobileNotifications;
window.loadMobileNotifications = loadMobileNotifications;
window.updateMobileNotificationBadge = updateMobileNotificationBadge;
// Initialize notifications on page load
// Initialize notifications on page load
async function initializeNotifications() {
  console.log("🔔 Initializing notification system...");

  if (!currentUser) {
    console.log("ℹ️ No user logged in, hiding notifications");
    hideNotificationPanel();
    return;
  }

  // ✅ ENSURE panel is visible
  showNotificationPanel();

  // Load notifications from backend
  await loadNotifications();

  // Update unread badge
  await updateNotificationBadge();

  // Setup click listeners
  setupNotificationListeners();

  // Add refresh button
  addRefreshButtonToNotifications();
  setupClearNotificationsModalListeners();
  console.log("✅ Notification system initialized");
  // Show mobile notification button
  if (window.innerWidth <= 991) {
    const mobileBtn = document.getElementById("mobileNotificationsBtn");
    if (mobileBtn) {
      mobileBtn.style.display = "flex";
    }
  }
}
function setupClearNotificationsModalListeners() {
  const confirmBtn = document.getElementById("btnConfirmClear");
  const cancelBtn = document.getElementById("btnCancelClear");
  const modalOverlay = document.getElementById(
    "clearNotificationsModalOverlay"
  );

  if (confirmBtn) {
    confirmBtn.addEventListener("click", confirmClearNotifications);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelClearNotifications);
  }

  // Close modal when clicking outside
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        cancelClearNotifications();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      modalOverlay &&
      modalOverlay.classList.contains("active")
    ) {
      cancelClearNotifications();
    }
  });
}
function showClearNotificationsModal() {
  const modal = document.getElementById("clearNotificationsModalOverlay");
  if (modal) {
    modal.classList.add("active");
    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }
}
async function confirmClearNotifications() {
  if (!currentUser) return;

  const modal = document.getElementById("clearNotificationsModalOverlay");
  const confirmBtn = document.getElementById("btnConfirmClear");

  // Disable button and show loading
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      // Hide confirmation modal first
      if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
      }

      showSuccess(`${data.count || "All"} notifications deleted`);

      // Close the notifications modal if it's open
      const notificationsModal = document.querySelector(".notifications-modal");
      if (notificationsModal) {
        notificationsModal.remove();
      }

      // Refresh all notification displays
      await loadNotifications();
      await updateNotificationBadge();
    } else {
      showError(data.message || "Failed to clear notifications");
      if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
      }
    }
  } catch (error) {
    console.error("❌ Error clearing notifications:", error);
    showError("Failed to clear notifications");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  } finally {
    // Reset button
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Clear All';
    }
  }
}
// ===== CANCEL CLEAR NOTIFICATIONS =====
function cancelClearNotifications() {
  const modal = document.getElementById("clearNotificationsModalOverlay");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}
// Make the function globally accessible
window.showNotificationPanel = showNotificationPanel;

console.log("✅ Fixed notification panel visibility after login");

console.log("✅ Enhanced notification modal and helpers loaded");

// Hide notification panel for guests
function hideNotificationPanel() {
  const notificationsCard = document.querySelector(".notifications-card");
  if (notificationsCard) {
    notificationsCard.style.display = "none";
    console.log("✅ Notification panel hidden");
  }
}
// Update notification badge count
async function updateNotificationBadge() {
  if (!currentUser) return;

  const badge = document.getElementById("notificationBadge");
  if (!badge) return;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log("📊 Unread count:", data);

    if (data.success) {
      const count = data.unread_count || 0;
      badge.textContent = count;

      // Hide badge if no unread notifications
      if (count === 0) {
        badge.style.display = "none";
      } else {
        badge.style.display = "inline-block";
      }

      // ✅ NEW: Update mobile badge too
      updateMobileNotificationBadge(count);
    }
  } catch (error) {
    console.error("❌ Error fetching unread count:", error);
  }
}

// Setup notification click listeners
function setupNotificationListeners() {
  const notificationItems = document.querySelectorAll(".notification-item");

  notificationItems.forEach((item) => {
    // Click handler is already attached via onclick in createNotificationItem
    // This is for any additional setup if needed
  });
}

async function handleNotificationClick(notification) {
  console.log("🔔 Notification clicked:", notification);

  // Mark as read (fire-and-forget)
  markNotificationAsRead(notification.notification_id).catch(() => {});

  // ── Deal notifications: navigate to mydeals with filters ──
  const dealNavTypes = {
    // Products — seller side
    order_request: "my-deals.html?role=seller&type=products&status=pending",
    order_cancelled: "my-deals.html?role=seller&type=products&status=cancelled",
    payment_received: "my-deals.html?role=seller&type=products",
    // Products — buyer side
    order_accepted: "my-deals.html?role=buyer&type=products&status=confirmed",
    order_rejected: "my-deals.html?role=buyer&type=products&status=cancelled",
    order_status_update: "my-deals.html?role=buyer&type=products",
    // Services — provider side
    booking_request: "my-deals.html?role=seller&type=services&status=pending",
    booking_cancelled:
      "my-deals.html?role=seller&type=services&status=cancelled",
    // Services — customer side
    booking_accepted: "my-deals.html?role=buyer&type=services&status=accepted",
    booking_rejected: "my-deals.html?role=buyer&type=services&status=rejected",
  };

  // Check if the notification carries a server-supplied nav_url (takes priority)
  const serverNav = notification.nav_url;
  const typeNav = dealNavTypes[notification.notification_type];
  const navTarget = serverNav || typeNav;

  if (navTarget) {
    // Close any open notification panels first
    closeNotificationsModal();
    closeMobileNotifications();
    window.location.href = navTarget;
    return;
  }

  // ── Standard non-deal notifications ──
  if (notification.related_post_id) {
    openPostDetail(notification.related_post_id);
  } else if (
    notification.notification_type === "follow" ||
    notification.notification_type === "follow_request" ||
    notification.notification_type === "follow_accepted"
  ) {
    goToProfile(notification.sender_id);
  }
}

// View all notifications (navigate to notifications page)
function viewAllNotifications() {
  console.log("📋 View all notifications");
  createNotificationsModal();
}
function addRefreshButtonToNotifications() {
  const notificationsHeader = document.querySelector(".notifications-header");
  if (!notificationsHeader) return;

  // Check if refresh button already exists
  if (notificationsHeader.querySelector(".refresh-notifications-btn")) return;

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "refresh-notifications-btn";
  refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
  refreshBtn.title = "Refresh notifications";
  refreshBtn.style.cssText = `
    background: transparent;
    border: none;
    color: var(--primary-purple);
    font-size: 1rem;
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    transition: all 0.3s ease;
    margin-left: auto;
  `;

  refreshBtn.onmouseover = () => {
    refreshBtn.style.background = "var(--light-purple)";
    refreshBtn.style.transform = "rotate(180deg)";
  };

  refreshBtn.onmouseout = () => {
    refreshBtn.style.background = "transparent";
    refreshBtn.style.transform = "rotate(0deg)";
  };

  refreshBtn.onclick = async () => {
    refreshBtn.style.animation = "spin 1s linear";
    await loadNotifications();
    await updateNotificationBadge();

    setTimeout(() => {
      refreshBtn.style.animation = "none";
    }, 1000);
  };

  notificationsHeader.appendChild(refreshBtn);
}

// ✅ NEW: Add CSS for refresh button animation
const refreshButtonStyles = document.createElement("style");
refreshButtonStyles.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .notifications-modal {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .refresh-notifications-btn:active {
    transform: scale(0.95) !important;
  }
`;
document.head.appendChild(refreshButtonStyles);
async function createNotificationsModal() {
  if (!currentUser) {
    showError("Please login to view notifications");
    return;
  }

  // ✅ NEW: Close existing modal if open
  const existingModal = document.querySelector(".notifications-modal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.className = "notifications-modal";
  modal.innerHTML = `
    <div class="notifications-modal-overlay" onclick="closeNotificationsModal()">
      <div class="notifications-modal-content" onclick="event.stopPropagation()">
        <div class="notifications-modal-header">
          <h3>
            <i class="fas fa-bell"></i>
            All Notifications
          </h3>
          <button class="notifications-modal-close" onclick="closeNotificationsModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="notifications-modal-body" id="allNotificationsList">
          <div class="notifications-loading">
            <div class="notification-skeleton">
              <div class="skeleton-circle"></div>
              <div class="skeleton-text">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
            <div class="notification-skeleton">
              <div class="skeleton-circle"></div>
              <div class="skeleton-text">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="notifications-modal-footer">
          <button class="btn-secondary" onclick="markAllNotificationsAsRead()">
            <i class="fas fa-check-double"></i>
            Mark All as Read
          </button>
          <button class="btn-danger" onclick="clearAllNotifications()">
            <i class="fas fa-trash"></i>
            Clear All
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  // ✅ NEW: Add fade-in animation
  setTimeout(() => {
    modal.style.opacity = "1";
  }, 10);

  // ✅ ENHANCED: Load all notifications with fresh data
  await loadAllNotifications();
}
function closeNotificationsModal() {
  const modal = document.querySelector(".notifications-modal");
  if (modal) {
    modal.style.opacity = "0";
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = "auto";
    }, 300);
  }
}
// ✅ NEW: Make closeNotificationsModal globally accessible
window.closeNotificationsModal = closeNotificationsModal;
async function loadAllNotifications() {
  if (!currentUser) return;

  const allNotificationsList = document.getElementById("allNotificationsList");
  if (!allNotificationsList) return;

  // Show loading state
  allNotificationsList.innerHTML = `
    <div class="notifications-loading">
      <div class="notification-skeleton">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
      <div class="notification-skeleton">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/notifications?limit=50`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log("📊 All notifications response:", data);

    if (data.success && data.notifications && data.notifications.length > 0) {
      allNotificationsList.innerHTML = "";

      data.notifications.forEach((notification) => {
        const notificationItem = createNotificationItem(notification);
        allNotificationsList.appendChild(notificationItem);
      });
    } else {
      allNotificationsList.innerHTML = `
        <div class="notifications-empty">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications yet</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error loading all notifications:", error);
    allNotificationsList.innerHTML = `
      <div class="notifications-empty">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load notifications</p>
      </div>
    `;
  }
}

async function markAllNotificationsAsRead() {
  if (!currentUser) return;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(
      `${API_BASE_URL}/notifications/mark-all-read`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      showSuccess(`${data.count || "All"} notifications marked as read`);

      // ✅ NEW: Refresh all notification displays
      await loadNotifications();
      await updateNotificationBadge();

      // Reload modal if open
      if (isNotificationModalOpen()) {
        await loadAllNotifications();
      }
    }
  } catch (error) {
    console.error("❌ Error marking all as read:", error);
    showError("Failed to mark notifications as read");
  }
}
async function clearAllNotifications() {
  if (!currentUser) return;

  // Show the custom confirmation modal instead of browser confirm
  showClearNotificationsModal();
}

console.log("✅ Enhanced notification helpers loaded");
function startNotificationPolling() {
  if (!currentUser) return;

  console.log("🔄 Starting notification polling (every 30 seconds)");

  // Poll every 30 seconds
  setInterval(async () => {
    await updateNotificationBadge();

    // Optionally reload the notification list too
    // await loadNotifications();
  }, 30000);
}
// Load notifications from API (for future integration)
async function loadNotifications() {
  if (!currentUser) return;

  const notificationsList = document.getElementById("notificationsList");
  if (!notificationsList) {
    console.error("❌ notificationsList element not found");
    return;
  }

  // Show loading state
  notificationsList.innerHTML = `
    <div class="notifications-loading">
      <div class="notification-skeleton">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
      <div class="notification-skeleton">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
      <div class="notification-skeleton">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/notifications?limit=4`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log("📊 Notifications response:", data);

    if (data.success && data.notifications && data.notifications.length > 0) {
      renderNotifications(data.notifications);
    } else {
      // Show empty state
      notificationsList.innerHTML = `
        <div class="notifications-empty">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications yet<br/>We'll notify you when something happens!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error loading notifications:", error);

    // Show error state
    notificationsList.innerHTML = `
      <div class="notifications-empty">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load notifications<br/>Please try again later</p>
      </div>
    `;
  }
}

// Render notifications
function renderNotifications(notifications) {
  const notificationsList = document.getElementById("notificationsList");
  if (!notificationsList) return;

  notificationsList.innerHTML = "";

  notifications.forEach((notification) => {
    const notificationItem = createNotificationItem(notification);
    notificationsList.appendChild(notificationItem);
  });
}

// ✅ NEW: Function to handle notification refresh on visibility change
document.addEventListener("visibilitychange", async () => {
  if (!document.hidden && currentUser) {
    console.log("👁️ Page became visible - refreshing notifications");
    await loadNotifications();
    await updateNotificationBadge();
  }
});

// Create notification item
// Create notification item
function createNotificationItem(notification) {
  const item = document.createElement("div");
  item.className = `notification-item ${notification.is_read ? "" : "unread"}`;
  item.setAttribute("data-notification-id", notification.notification_id);
  item.dataset.notificationId = notification.notification_id;

  const timeAgo = getTimeAgo(notification.created_at);

  // ── Icon / avatar ──
  let iconHTML = "";
  const avatarUrl = notification.sender_avatar
    ? constructMediaUrl(notification.sender_avatar, "profile")
    : null;
  const avatarTag = avatarUrl
    ? `<img src="${avatarUrl}" alt="User" class="notification-avatar" onerror="this.onerror=null;this.src=generateDefaultAvatar(notification.sender_name||'U')" />`
    : null;

  const iconMap = {
    like: `<div class="notification-icon like"><i class="fas fa-heart"></i></div>`,
    comment: `<div class="notification-icon comment"><i class="fas fa-comment"></i></div>`,
    share: `<div class="notification-icon share"><i class="fas fa-share"></i></div>`,
    // Deal — products
    order_request: `<div class="notification-icon" style="background:linear-gradient(135deg,#f39c12,#e67e22)"><i class="fas fa-shopping-cart"></i></div>`,
    order_accepted: `<div class="notification-icon" style="background:linear-gradient(135deg,#27ae60,#2ecc71)"><i class="fas fa-check-circle"></i></div>`,
    order_rejected: `<div class="notification-icon" style="background:linear-gradient(135deg,#c0392b,#e74c3c)"><i class="fas fa-times-circle"></i></div>`,
    order_cancelled: `<div class="notification-icon" style="background:linear-gradient(135deg,#95a5a6,#7f8c8d)"><i class="fas fa-ban"></i></div>`,
    order_status_update: `<div class="notification-icon" style="background:linear-gradient(135deg,#2980b9,#3498db)"><i class="fas fa-truck"></i></div>`,
    payment_received: `<div class="notification-icon" style="background:linear-gradient(135deg,#27ae60,#1abc9c)"><i class="fas fa-credit-card"></i></div>`,
    // Deal — services
    booking_request: `<div class="notification-icon" style="background:linear-gradient(135deg,#8e44ad,#9b59b6)"><i class="fas fa-calendar-plus"></i></div>`,
    booking_accepted: `<div class="notification-icon" style="background:linear-gradient(135deg,#27ae60,#2ecc71)"><i class="fas fa-handshake"></i></div>`,
    booking_rejected: `<div class="notification-icon" style="background:linear-gradient(135deg,#c0392b,#e74c3c)"><i class="fas fa-calendar-times"></i></div>`,
    booking_cancelled: `<div class="notification-icon" style="background:linear-gradient(135deg,#95a5a6,#7f8c8d)"><i class="fas fa-calendar-minus"></i></div>`,
    message_request:
      avatarTag ||
      `<div class="notification-icon" style="background:linear-gradient(135deg,#e60aea,#bf33e6)">
     <i class="fas fa-envelope-open-text"></i>
   </div>`,
    group_invite:
      avatarTag ||
      `<div class="notification-icon" style="background:linear-gradient(135deg,#7c3aed,#db2777)"><i class="fas fa-users"></i></div>`,
    group_added:
      avatarTag ||
      `<div class="notification-icon" style="background:linear-gradient(135deg,#22c55e,#16a34a)"><i class="fas fa-user-check"></i></div>`,

    // Social
    follow:
      avatarTag ||
      `<div class="notification-icon follow"><i class="fas fa-user-plus"></i></div>`,
    follow_request:
      avatarTag ||
      `<div class="notification-icon follow"><i class="fas fa-user-clock"></i></div>`,
    follow_accepted:
      avatarTag ||
      `<div class="notification-icon follow"><i class="fas fa-user-check"></i></div>`,
    message:
      avatarTag ||
      `<div class="notification-icon message"><i class="fas fa-envelope"></i></div>`,
    shared_post:
      avatarTag ||
      `<div class="notification-icon shared-post"><i class="fas fa-share-square"></i></div>`,
    message_reaction:
      avatarTag ||
      `<div class="notification-icon reaction"><i class="fas fa-thumbs-up"></i></div>`,
  };

  iconHTML =
    iconMap[notification.notification_type] ||
    `<div class="notification-icon"><i class="fas fa-bell"></i></div>`;

  // ── Follow-request action buttons ──
  const isFollowRequest = notification.notification_type === "follow_request";
  let actionButtonsHTML = "";
  if (isFollowRequest) {
    if (
      notification.request_status === "pending" &&
      notification.request_exists
    ) {
      actionButtonsHTML = `
        <div class="notification-actions" onclick="event.stopPropagation()">
          <button class="notification-btn accept-btn" onclick="acceptFollowRequest(${notification.notification_id}, ${notification.sender_id})">
            <i class="fas fa-check"></i> Accept
          </button>
          <button class="notification-btn reject-btn" onclick="rejectFollowRequest(${notification.notification_id}, ${notification.sender_id})">
            <i class="fas fa-times"></i> Reject
          </button>
        </div>`;
    } else if (notification.request_status === "accepted") {
      actionButtonsHTML = `<div class="notification-actions"><div style="padding:8px 12px;background:linear-gradient(135deg,#4ade80,#22c55e);color:white;border-radius:8px;font-size:.8rem;font-weight:600;display:flex;align-items:center;gap:6px"><i class="fas fa-check-circle"></i><span>Accepted</span></div></div>`;
    } else if (notification.request_status === "rejected") {
      actionButtonsHTML = `<div class="notification-actions"><div style="padding:8px 12px;background:linear-gradient(135deg,#ff6b6b,#ee5a6f);color:white;border-radius:8px;font-size:.8rem;font-weight:600;display:flex;align-items:center;gap:6px"><i class="fas fa-times-circle"></i><span>Rejected</span></div></div>`;
    } else {
      actionButtonsHTML = `<div class="notification-actions"><div style="padding:8px 12px;background:var(--light-purple);color:var(--text-secondary);border-radius:8px;font-size:.75rem;font-weight:600">Already Processed</div></div>`;
    }
  }

  // ── "View in My Deals" chip for deal notifications ──
  const dealTypes = [
    "order_request",
    "order_accepted",
    "order_rejected",
    "order_cancelled",
    "order_status_update",
    "payment_received",
    "booking_request",
    "booking_accepted",
    "booking_rejected",
    "booking_cancelled",
  ];
  let dealChipHTML = "";
  if (dealTypes.includes(notification.notification_type)) {
    dealChipHTML = `
      <div style="margin-top:6px;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;font-weight:600;
          color:var(--primary-purple);background:var(--light-purple);
          padding:3px 9px;border-radius:20px;cursor:pointer;"
          onclick="event.stopPropagation();handleNotificationClick(${JSON.stringify(
            notification
          ).replace(/"/g, "&quot;")})">
          <i class="fas fa-external-link-alt"></i> View in My Deals
        </span>
      </div>`;
  }

  item.innerHTML = `
    ${iconHTML}
    <div class="notification-content">
      <span class="notification-user">${escapeHtml(
        notification.sender_name || notification.sender_username || "Someone"
      )}</span>
      <p class="notification-text">${escapeHtml(notification.message)}</p>
      <div class="notification-time"><i class="far fa-clock"></i><span>${timeAgo}</span></div>
      ${dealChipHTML}
      ${actionButtonsHTML}
    </div>
  `;

  // ── Click handler ──
  const isMessageNotification =
    notification.notification_type === "message" ||
    notification.notification_type === "message_request";
  const isSharedPost = notification.notification_type === "shared_post";
  const isMessageReaction =
    notification.notification_type === "message_reaction";
  const isDealNotification = dealTypes.includes(notification.notification_type);
  const isPendingFollowRequest =
    isFollowRequest && notification.request_status === "pending";

  if (isDealNotification) {
    item.style.cursor = "pointer";
    item.onclick = () => handleNotificationClick(notification);
  } else if (isMessageNotification || isMessageReaction) {
    item.style.cursor = "pointer";
    item.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      markNotificationAsRead(notification.notification_id).catch(() => {});
      closeNotificationsModal();
      closeMobileNotifications();
      await new Promise((r) => setTimeout(r, 100));
      window.location.href = `messages.html?user=${notification.sender_id}`;
    };
  } else if (isSharedPost) {
    item.style.cursor = "pointer";
    item.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      markNotificationAsRead(notification.notification_id).catch(() => {});
      closeNotificationsModal();
      closeMobileNotifications();
      await new Promise((r) => setTimeout(r, 100));
      if (notification.related_post_id) {
        openPostDetail(notification.related_post_id);
      } else {
        window.location.href = `messages.html?user=${notification.sender_id}`;
      }
    };
  } else if (!isPendingFollowRequest) {
    item.onclick = () => handleNotificationClick(notification);
  } else {
    // Pending follow request — make name/text area clickable to visit profile
    const contentDiv = item.querySelector(".notification-content");
    [
      contentDiv.querySelector(".notification-user"),
      contentDiv.querySelector(".notification-text"),
    ].forEach((el) => {
      if (el) {
        el.style.cursor = "pointer";
        el.onclick = (e) => {
          e.stopPropagation();
          goToProfile(notification.sender_id);
        };
      }
    });
  }

  return item;
}

console.log(
  "✅ Updated notification handler with shared_post and message_reaction support"
);

// Mark notification as read (API call)
async function markNotificationAsRead(notificationId) {
  if (!currentUser) return;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("✅ Notification marked as read:", notificationId);

    // Update UI
    const notificationItem = document.querySelector(
      `[data-notification-id="${notificationId}"]`
    );
    if (notificationItem) {
      notificationItem.classList.remove("unread");
    }

    // Update badge (don't wait)
    updateNotificationBadge().catch((err) => {
      console.error("Failed to update badge:", err);
    });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
  }
}

// ✅ NEW: Helper function to close notification modals
function closeNotificationsModal() {
  const modal = document.querySelector(".notifications-modal");
  if (modal) {
    modal.style.opacity = "0";
    modal.remove();
    document.body.style.overflow = "auto";
  }
}

function closeMobileNotifications() {
  const modal = document.getElementById("mobileNotificationsModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

console.log("✅ Fixed message notification click handler loaded");

// Poll for new notifications (optional, for real-time updates)
function startNotificationPolling() {
  if (!currentUser) return;

  // Poll every 30 seconds
  setInterval(() => {
    loadNotifications();
  }, 30000);
}

// Add to your initializeApp function:
// initializeNotifications();
// startNotificationPolling(); // Optional: for real-time updates

console.log("✅ Notification panel functions loaded");
function handleCreatePostClick() {
  if (!currentUser) {
    // User not logged in - open login modal instead of redirecting
    console.log("🔒 User not logged in, opening login modal...");

    // Call parent window's openLoginModal function
    if (window.parent && typeof window.parent.openLoginModal === "function") {
      window.parent.openLoginModal();
    } else if (typeof openLoginModal === "function") {
      openLoginModal();
    } else {
      // Fallback: send message to parent
      window.parent.postMessage({ action: "openLoginModal" }, "*");
    }
  } else {
    // User is logged in - proceed to upload page
    window.location.href = "upload.html";
  }
}
function openMobileNotifications() {
  if (!currentUser) {
    showError("Please login to view notifications");
    return;
  }

  const modal = document.getElementById("mobileNotificationsModal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Load notifications into mobile panel
    loadMobileNotifications();
  }
}

// Close mobile notifications panel
function closeMobileNotifications() {
  const modal = document.getElementById("mobileNotificationsModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

// Load notifications for mobile panel
async function loadMobileNotifications() {
  const mobileList = document.getElementById("mobileNotificationsList");
  if (!mobileList) return;

  // Show loading state
  mobileList.innerHTML = `
    <div class="notifications-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading notifications...</p>
    </div>
  `;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/notifications?limit=50`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success && data.notifications && data.notifications.length > 0) {
      mobileList.innerHTML = "";

      data.notifications.forEach((notification) => {
        const notificationItem = createNotificationItem(notification);
        mobileList.appendChild(notificationItem);
      });
    } else {
      mobileList.innerHTML = `
        <div class="notifications-empty">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications yet<br/>We'll notify you when something happens!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error loading mobile notifications:", error);
    mobileList.innerHTML = `
      <div class="notifications-empty">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load notifications<br/>Please try again later</p>
      </div>
    `;
  }
}

// Update mobile notification badge
function updateMobileNotificationBadge(count) {
  const mobileBadge = document.getElementById("mobileNotificationBadge");
  if (mobileBadge) {
    mobileBadge.textContent = count;
    if (count > 0) {
      mobileBadge.classList.add("show");
    } else {
      mobileBadge.classList.remove("show");
    }
  }
}
function togglePostMenu(event, postId) {
  event.stopPropagation();

  const menu = document.getElementById(`post-menu-${postId}`);

  // Close all other menus
  document.querySelectorAll(".post-menu-dropdown").forEach((m) => {
    if (m !== menu) {
      m.classList.remove("active");
    }
  });

  // Toggle current menu
  if (menu) {
    menu.classList.toggle("active");
  }

  // Close menu when clicking outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target) && !e.target.closest(".post-menu-btn")) {
      menu.classList.remove("active");
      document.removeEventListener("click", closeMenu);
    }
  };

  if (menu.classList.contains("active")) {
    setTimeout(() => {
      document.addEventListener("click", closeMenu);
    }, 0);
  }
}
async function toggleSaveFromMenu(postId, currentlySaved) {
  // Close the menu
  const menu = document.getElementById(`post-menu-${postId}`);
  if (menu) {
    menu.classList.remove("active");
  }

  if (!currentUser) {
    showError("Please login to save posts");
    return;
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      // Update the menu option icon and text
      const menuOption = menu.querySelector(".post-menu-option");
      const icon = menuOption.querySelector("i");
      const text = menuOption.querySelector("span");

      if (data.saved) {
        icon.classList.remove("far");
        icon.classList.add("fas");
        text.textContent = "Unsave Post";
        showSuccess("Post saved successfully!");
      } else {
        icon.classList.remove("fas");
        icon.classList.add("far");
        text.textContent = "Save Post";
        showSuccess("Post removed from saved");
      }

      // Update post in allPosts array
      const postIndex = allPosts.findIndex((p) => p.post_id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].user_saved = data.saved;
      }
    } else {
      showError(data.message || "Failed to save post");
    }
  } catch (error) {
    console.error("❌ Error toggling save:", error);
    showError("Failed to save post. Please try again.");
  }
}

// ===== COPY POST LINK =====
function copyPostLink(postId) {
  const menu = document.getElementById(`post-menu-${postId}`);
  if (menu) {
    menu.classList.remove("active");
  }

  const url = `${window.location.origin}/post.html?id=${postId}`;

  navigator.clipboard
    .writeText(url)
    .then(() => {
      showSuccess("Link copied to clipboard!");
    })
    .catch(() => {
      showError("Failed to copy link");
    });
}

// ===== DELETE POST (placeholder) =====
function deletePost(postId) {
  const menu = document.getElementById(`post-menu-${postId}`);
  if (menu) {
    menu.classList.remove("active");
  }

  if (confirm("Are you sure you want to delete this post?")) {
    // Implement delete functionality
    console.log("Delete post:", postId);
    showSuccess("Post deletion feature coming soon!");
  }
}

// Make functions globally accessible
window.togglePostMenu = togglePostMenu;
window.toggleSaveFromMenu = toggleSaveFromMenu;
window.copyPostLink = copyPostLink;
window.deletePost = deletePost;
// Make function globally accessible
window.sharePost = sharePost;
window.loadUsersForShare = loadUsersForShare;
window.searchUsersForShare = searchUsersForShare;
window.toggleUserSelection = toggleUserSelection;
window.clearSelectedUsers = clearSelectedUsers;
window.sendSharedPost = sendSharedPost;
window.shareViaLink = shareViaLink;
window.shareViaNative = shareViaNative;
window.closeShareModal = closeShareModal;

console.log("✅ Complete share post system loaded");
window.handleCreatePostClick = handleCreatePostClick;

console.log("✅ Create post click handler loaded");
// ===== AUTOPLAY VIDEOS ON SCROLL =====
(function setupVideoAutoplay() {
  // Reusable observer — watches all .autoplay-video elements
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Video is at least 50% visible — play it
          video.play().catch(() => {
            // Autoplay blocked (e.g. data saver mode) — silently ignore
          });
        } else {
          // Video scrolled out of view — pause and reset
          video.pause();
          video.currentTime = 0;
        }
      });
    },
    {
      threshold: 0.5, // Trigger when 50% of video is visible
      rootMargin: "0px",
    }
  );

  // Observe any video that exists now
  function observeVideos() {
    document.querySelectorAll(".autoplay-video").forEach((video) => {
      if (!video.dataset.observed) {
        videoObserver.observe(video);
        video.dataset.observed = "true";
      }
    });
  }

  // Watch for new posts being added to the feed (load more, filter change, etc.)
  const feedObserver = new MutationObserver(() => {
    observeVideos();
  });

  const postsFeed = document.getElementById("postsFeed");
  if (postsFeed) {
    feedObserver.observe(postsFeed, { childList: true, subtree: true });
  }

  // Initial scan
  observeVideos();

  // Re-scan when posts are rendered (filter change)
  window.addEventListener("postsRendered", observeVideos);

  console.log("✅ Video autoplay observer initialized");
})();
