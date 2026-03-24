// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

// ===== GLOBAL STATE =====
let currentUser = null;
let currentProfileData = null;
let viewMode = "own"; // 'own', 'view', or 'guest'
let viewingUserId = null;
let isGuest = false;
let cropper = null;
let originalProfilePicSrc = null;
let croppedProfileBlob = null;

// ===== MAKE FUNCTIONS GLOBALLY ACCESSIBLE =====
window.openPostDetail = openPostDetail;
window.closePostDetailModal = closePostDetailModal;
window.handleIframeMessage = handleIframeMessage;
window.viewPost = viewPost;
window.showDeleteModal = showDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeletePost = confirmDeletePost;
window.closeEditModal = closeEditModal;
window.closeCropModal = closeCropModal;
window.applyCrop = applyCrop;
window.rotateCropLeft = rotateCropLeft;
window.rotateCropRight = rotateCropRight;
window.flipCropHorizontal = flipCropHorizontal;
window.flipCropVertical = flipCropVertical;
window.resetCrop = resetCrop;
window.editPost = editPost;
window.togglePostMenu = togglePostMenu;
window.handleUserFollow = handleUserFollow;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Profile page loaded");
  loadHeaderAndSidebar();
  determineViewMode();
  verifyAuthAndLoadProfile();
  initializeEventListeners();
  initializeDeleteModal();
  injectModalStyles();
});

// ===== DETERMINE VIEW MODE =====
function determineViewMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("id");
  const session = getActiveSession();

  if (userId) {
    viewingUserId = parseInt(userId);

    if (!session) {
      viewMode = "guest";
      isGuest = true;
      console.log(`👁️ Guest mode: Viewing user ${viewingUserId}`);
    } else if (session.user.id === viewingUserId) {
      viewMode = "own";
      isGuest = false;
      currentUser = session.user;
      console.log(
        `📋 View mode: Own profile (via URL) - User ID: ${session.user.id}`
      );
    } else {
      viewMode = "view";
      isGuest = false;
      currentUser = session.user;
      console.log(
        `📋 View mode: Viewing user ${viewingUserId} as user ${session.user.id}`
      );
    }
  } else {
    if (!session) {
      viewMode = "guest";
      isGuest = true;
      console.log("❌ Guest trying to view profile without user ID");
      showNotification("Please provide a user ID to view profile", "error");
      setTimeout(() => {
        window.location.href = "home.html";
      }, 2000);
      return;
    } else {
      viewMode = "own";
      isGuest = false;
      currentUser = session.user;
      console.log(`📋 View mode: Own profile - User ID: ${session.user.id}`);
    }
  }

  console.log(`✅ ViewMode set to: ${viewMode}, isGuest: ${isGuest}`);
}

// ===== VERIFY AUTH AND LOAD PROFILE =====
async function verifyAuthAndLoadProfile() {
  const session = getActiveSession();

  if (isGuest) {
    console.log("👁️ Loading profile in guest mode");
    currentUser = null;

    try {
      showLoading(true);
      await loadOtherUserProfile(viewingUserId);
    } catch (error) {
      console.error("Profile load error:", error);
      showNotification("Failed to load profile", "error");
    } finally {
      showLoading(false);
    }
    return;
  }

  if (viewMode === "own") {
    if (!session) {
      console.error("❌ No active session found");
      window.location.href =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
          ? "/frontend/login.html"
          : "/login.html";
      return;
    }

    currentUser = session.user;
    console.log(`✅ Current user set:`, currentUser);

    try {
      showLoading(true);
      await loadProfileData(currentUser.id);
    } catch (error) {
      console.error("Auth verification error:", error);
      showNotification("Failed to load profile", "error");
    } finally {
      showLoading(false);
    }
  } else {
    if (session) {
      currentUser = session.user;
      console.log(`✅ Current user set for viewing:`, currentUser);
    }

    try {
      showLoading(true);
      await loadOtherUserProfile(viewingUserId);
    } catch (error) {
      console.error("Profile load error:", error);
      showNotification("Failed to load profile", "error");
    } finally {
      showLoading(false);
    }
  }
}

// ===== LOAD OWN PROFILE DATA =====
async function loadProfileData(userId) {
  try {
    const session = getActiveSession();
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      currentProfileData = data.profile;
      displayProfile(data.profile);
      loadPosts();
      console.log("✅ Profile loaded successfully");
    } else {
      showNotification("Failed to load profile", "error");
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    showNotification("Failed to load profile data", "error");
  }
}

// ===== LOAD OTHER USER'S PROFILE =====
async function loadOtherUserProfile(userId) {
  try {
    console.log(`📋 Loading profile for user ID: ${userId}`);

    const session = getActiveSession();
    const headers = {
      "Content-Type": "application/json",
    };

    if (session && !isGuest) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(`${API_BASE_URL}/profile/view/${userId}`, {
      method: "GET",
      headers: headers,
    });

    console.log(`📡 Profile API response status: ${response.status}`);

    if (response.status === 403) {
      const errData = await response.json().catch(() => ({}));
      if (errData.is_suspended) {
        // Show a suspended user banner instead of crashing
        const mainContent =
          document.querySelector(".profile-container") ||
          document.getElementById("main-content");
        if (mainContent) {
          mainContent.innerHTML = `
            <div style="
              display:flex; flex-direction:column; align-items:center;
              justify-content:center; min-height:60vh; text-align:center; padding:40px;
            ">
              <div style="
                background: rgba(239,68,68,0.08); border: 1.5px solid rgba(239,68,68,0.3);
                border-radius: 18px; padding: 40px 32px; max-width: 420px;
              ">
                <i class="fas fa-ban" style="font-size:3rem; color:#ef4444; margin-bottom:16px; display:block;"></i>
                <h2 style="color:#ef4444; margin-bottom:8px;">Account Suspended</h2>
                <p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.6;">
                  This account has been temporarily suspended by our moderation team 
                  and is not available to view.
                </p>
                <button onclick="history.back()" style="
                  margin-top:24px; padding:10px 24px; border-radius:20px;
                  background: linear-gradient(135deg,#e60aea,#e336cc);
                  color:#fff; border:none; font-weight:700; cursor:pointer;
                ">
                  <i class="fas fa-arrow-left"></i> Go Back
                </button>
              </div>
            </div>
          `;
        }
        return; // Stop further execution
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("📊 Profile data received:", data);

    if (data.success) {
      currentProfileData = data.profile;

      if (viewMode !== "own") {
        hideEditControls();
      }

      if (!isGuest) {
        updateFollowButton(data.profile);
      }

      displayProfile(data.profile);
      await loadPostsWithPrivacy(userId, data.profile.can_view_full);

      console.log("✅ Profile loaded successfully");
    } else {
      console.error("❌ Profile load failed:", data.message);
      showNotification(data.message || "Failed to load profile", "error");
      setTimeout(() => {
        window.location.href = "home.html";
      }, 2000);
    }
  } catch (error) {
    console.error("❌ Error loading user profile:", error);
    showNotification("Failed to load profile data", "error");
  }
}

// ===== DISPLAY PROFILE =====
function displayProfile(profile) {
  // Display Avatar
  const avatarElement = document.getElementById("profileAvatar");
  let hasProfilePic = false;

  if (profile.profile_pic) {
    hasProfilePic = true;
    let avatarSrc = "";
    if (
      profile.profile_pic.startsWith("http://") ||
      profile.profile_pic.startsWith("https://")
    ) {
      avatarSrc = profile.profile_pic;
    } else if (profile.profile_pic.startsWith("uploads/profile/")) {
      const filename = profile.profile_pic.split("/").pop();
      avatarSrc = `${API_BASE_URL}/get-profile-pic/${filename}`;
    }

    if (avatarSrc) {
      avatarElement.innerHTML = `<img src="${avatarSrc}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
  } else {
    avatarElement.innerHTML = '<i class="fas fa-user"></i>';
  }

  // ✅ NEW: Update remove button visibility
  updateRemoveButtonVisibility(hasProfilePic);

  // Update message button visibility
  const messageBtn = document.getElementById("messageBtn");
  if (messageBtn) {
    if (viewMode === "view" && !isGuest && currentUser) {
      messageBtn.style.display = "flex";
    } else {
      messageBtn.style.display = "none";
    }
  }

  // Display User Info
  document.getElementById("profileName").textContent =
    profile.full_name || profile.username;
  document.getElementById(
    "profileUsername"
  ).textContent = `@${profile.username}`;

  // Display Stats
  document.getElementById("postsCount").textContent = profile.posts_count || 0;
  document.getElementById("followersCount").textContent =
    profile.followers_count || 0;
  document.getElementById("followingCount").textContent =
    profile.following_count || 0;

  // Display About Preview
  const aboutPreview = profile.about_me || "No bio available";
  document.getElementById("aboutMePreview").textContent = aboutPreview;

  // Display Joined Date
  if (profile.created_at) {
    const joinDate = new Date(profile.created_at);
    document.getElementById("joinedQuick").textContent =
      joinDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // Check if private profile
  if (profile.can_view_full === false) {
    console.log("🔒 Private profile - hiding detailed information");

    document.getElementById("locationQuick").textContent = "Private";
    document.getElementById("websiteQuick").textContent = "Private";
    document.getElementById("dobQuick").textContent = "Private";

    const aboutTab = document.getElementById("aboutTab");
    if (aboutTab) {
      aboutTab.innerHTML = `
        <div class="private-message" style="text-align: center; padding: 60px 20px;">
          <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-purple); margin-bottom: 20px;"></i>
          <h3>This Account is Private</h3>
          <p style="color: var(--text-secondary); margin-top: 15px;">
            Follow this account to see their detailed information.
          </p>
        </div>
      `;
    }

    const followersTab = document.getElementById("followersTab");
    const followingTab = document.getElementById("followingTab");

    if (followersTab) {
      followersTab.innerHTML = `
        <div class="private-message" style="text-align: center; padding: 60px 20px;">
          <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-purple); margin-bottom: 20px;"></i>
          <h3>Followers List is Private</h3>
          <p style="color: var(--text-secondary); margin-top: 15px;">
            Follow this account to see their followers.
          </p>
        </div>
      `;
    }

    if (followingTab) {
      followingTab.innerHTML = `
        <div class="private-message" style="text-align: center; padding: 60px 20px;">
          <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-purple); margin-bottom: 20px;"></i>
          <h3>Following List is Private</h3>
          <p style="color: var(--text-secondary); margin-top: 15px;">
            Follow this account to see who they follow.
          </p>
        </div>
      `;
    }

    return;
  }

  // Display full profile details for public profiles
  const location =
    [profile.city, profile.state, profile.country].filter(Boolean).join(", ") ||
    "Not specified";
  document.getElementById("locationQuick").textContent = location;

  const websiteQuickEl = document.getElementById("websiteQuick");
  if (profile.website_url) {
    const displayUrl = profile.website_url
      .replace(/^https?:\/\//, "")
      .split("/")[0];

    websiteQuickEl.innerHTML = `<a href="${profile.website_url}" target="_blank" style="color: inherit; text-decoration: none; cursor: pointer;">${displayUrl}</a>`;
    websiteQuickEl.style.cursor = "pointer";
  } else {
    websiteQuickEl.textContent = "Not specified";
  }

  const dobQuickEl = document.getElementById("dobQuick");
  if (profile.date_of_birth) {
    dobQuickEl.textContent = formatDate(profile.date_of_birth);
  } else {
    dobQuickEl.textContent = "Not specified";
  }

  // About Tab - Personal Info
  document.getElementById("emailText").textContent =
    profile.email || "Not specified";
  document.getElementById("phoneText").textContent =
    profile.phone || "Not specified";
  document.getElementById("genderText").textContent =
    profile.gender || "Not specified";
  document.getElementById("dobText").textContent = profile.date_of_birth
    ? formatDate(profile.date_of_birth)
    : "Not specified";

  // About Tab - Location & Links
  document.getElementById("locationText").textContent = location;

  if (profile.website_url) {
    document.getElementById(
      "websiteText"
    ).innerHTML = `<a href="${profile.website_url}" target="_blank">${profile.website_url}</a>`;
  } else {
    document.getElementById("websiteText").textContent = "Not specified";
  }

  if (profile.created_at) {
    const joinDate = new Date(profile.created_at);
    document.getElementById("joinedText").textContent =
      joinDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  if (profile.social_links && profile.social_links.length > 0) {
    displaySocialLinks(profile.social_links);
  }

  window.currentProfile = profile;
}
function updateRemoveButtonVisibility(hasProfilePic) {
  const removeBtn = document.getElementById("removeAvatarBtn");

  if (removeBtn && viewMode === "own") {
    if (hasProfilePic) {
      removeBtn.style.display = "flex";
    } else {
      removeBtn.style.display = "none";
    }
  }
}

// ===== HELPER FUNCTIONS =====
function formatDate(dateString) {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function displaySocialLinks(links) {
  const socialSection = document.getElementById("socialLinksSection");
  const socialList = document.getElementById("socialLinksList");

  if (links.length === 0) {
    socialSection.style.display = "none";
    return;
  }

  socialSection.style.display = "block";
  socialList.innerHTML = "";

  links.forEach((link) => {
    const linkElement = document.createElement("a");
    linkElement.className = "social-link-item";
    linkElement.href = link.url;
    linkElement.target = "_blank";
    linkElement.innerHTML = `
      <i class="fab fa-${link.platform.toLowerCase()}"></i>
      <span>${link.platform}</span>
    `;
    socialList.appendChild(linkElement);
  });
}

// ===== HIDE EDIT CONTROLS =====
function hideEditControls() {
  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) editBtn.style.display = "none";

  const editAvatarBtn = document.getElementById("editAvatarBtn");
  if (editAvatarBtn) editAvatarBtn.style.display = "none";

  const shareBtn = document.getElementById("shareProfileBtn");
  if (shareBtn) {
    shareBtn.innerHTML = '<i class="fas fa-link"></i> Copy Link';
    shareBtn.onclick = () => copyProfileLink(viewingUserId);
  }
}

// ===== UPDATE FOLLOW BUTTON =====
function updateFollowButton(profile) {
  if (isGuest) {
    console.log("👁️ Guest mode - hiding follow button");
    return;
  }

  const actionButtons = document.querySelector(".action-buttons");
  if (!actionButtons) return;

  const existingFollowBtn = document.getElementById("followBtn");
  if (existingFollowBtn) existingFollowBtn.remove();

  if (viewMode === "view" && currentUser) {
    const followBtn = document.createElement("button");
    followBtn.id = "followBtn";

    if (profile.is_following) {
      followBtn.className = "btn-secondary following";
      followBtn.innerHTML = '<i class="fas fa-user-check"></i> Unfollow';
      followBtn.onclick = () => toggleFollowUser(viewingUserId, true);
    } else if (profile.is_pending) {
      followBtn.className = "btn-secondary requested";
      followBtn.innerHTML = '<i class="fas fa-clock"></i> Requested';
      followBtn.onclick = () => toggleFollowUser(viewingUserId, true);
    } else {
      followBtn.className = "btn-primary";
      followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
      followBtn.onclick = () => toggleFollowUser(viewingUserId, false);
    }

    const shareBtn = document.getElementById("shareProfileBtn");
    if (shareBtn) {
      actionButtons.insertBefore(followBtn, shareBtn);
    } else {
      actionButtons.appendChild(followBtn);
    }
  }
}

// ===== TOGGLE FOLLOW USER =====
async function toggleFollowUser(userId, isCurrentlyFollowing) {
  if (isGuest || !currentUser) {
    showNotification("Please login to follow users", "error");
    setTimeout(() => {
      window.location.href = `login.html?redirect=profile.html?id=${userId}`;
    }, 1500);
    return;
  }

  try {
    const session = getActiveSession();
    const endpoint = isCurrentlyFollowing
      ? `${API_BASE_URL}/profile/${userId}/unfollow`
      : `${API_BASE_URL}/profile/${userId}/follow`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      const followBtn = document.getElementById("followBtn");
      if (followBtn) {
        if (isCurrentlyFollowing || data.already_following) {
          // Was already following — ensure button shows Unfollow
          followBtn.className = "btn-secondary following";
          followBtn.innerHTML = '<i class="fas fa-user-check"></i> Unfollow';
          followBtn.onclick = () => toggleFollowUser(userId, true);
          if (!data.already_following) {
            showNotification("Unfollowed successfully", "success");
            currentProfileData.is_following = false;
            const followersCount = document.getElementById("followersCount");
            if (followersCount) {
              followersCount.textContent = Math.max(
                0,
                parseInt(followersCount.textContent) - 1
              );
            }
          } else {
            showNotification("Already following this user", "info");
          }
        } else {
          if (currentProfileData.is_private && data.request_pending) {
            followBtn.className = "btn-secondary requested";
            followBtn.innerHTML = '<i class="fas fa-clock"></i> Requested';
            followBtn.onclick = () => toggleFollowUser(userId, true);
            showNotification("Follow request sent!", "success");

            currentProfileData.is_following = false;
          } else {
            followBtn.className = "btn-secondary following";
            followBtn.innerHTML = '<i class="fas fa-user-check"></i> Unfollow';
            followBtn.onclick = () => toggleFollowUser(userId, true);
            showNotification("Now following!", "success");

            currentProfileData.is_following = true;

            const followersCount = document.getElementById("followersCount");
            if (followersCount) {
              const currentCount = parseInt(followersCount.textContent) || 0;
              followersCount.textContent = currentCount + 1;
            }
          }
        }
      }
    } else {
      showNotification(
        data.message || "Failed to update follow status",
        "error"
      );
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    showNotification("Failed to update follow status", "error");
  }
}

// ===== COPY PROFILE LINK =====
function copyProfileLink(userId) {
  const profileUrl = `${window.location.origin}/frontend/profile.html?id=${userId}`;

  navigator.clipboard
    .writeText(profileUrl)
    .then(() => {
      showNotification("Profile link copied to clipboard!", "success");
    })
    .catch(() => {
      showNotification("Failed to copy link", "error");
    });
}

// ===== LOAD POSTS WITH PRIVACY =====
async function loadPostsWithPrivacy(userId, canView) {
  const postsGrid = document.getElementById("postsGrid");

  if (!canView) {
    const message = isGuest
      ? `
      <div class="private-message" style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
        <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-purple); margin-bottom: 20px;"></i>
        <h3>This Account is Private</h3>
        <p style="color: var(--text-secondary); margin-top: 15px;">
          Login and follow this account to see their posts.
        </p>
        <button onclick="window.location.href='login.html?redirect=profile.html?id=${userId}'" 
                style="margin-top: 20px; background: var(--primary-purple); color: white; border: none; padding: 12px 24px; border-radius: 24px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-sign-in-alt"></i> Login to Follow
        </button>
      </div>
    `
      : `
      <div class="private-message" style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
        <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-purple); margin-bottom: 20px;"></i>
        <h3>This Account is Private</h3>
        <p style="color: var(--text-secondary); margin-top: 15px;">
          Follow this account to see their posts.
        </p>
      </div>
    `;

    postsGrid.innerHTML = message;
    return;
  }

  loadPosts();
}
// ===== CONTINUATION OF profile.js =====
// Add this after the loadPostsWithPrivacy function

// ===== LOAD HEADER & SIDEBAR =====
async function loadHeaderAndSidebar() {
  try {
    // Load header
    const headerRes = await fetch("header.html");
    const headerHtml = await headerRes.text();
    document.getElementById("header").innerHTML = headerHtml;

    // Load header script
    const headerScript = document.createElement("script");
    headerScript.src = "js/header.js";
    document.body.appendChild(headerScript);

    // Load sidebar
    const sidebarRes = await fetch("sidebar.html");
    const sidebarHtml = await sidebarRes.text();
    document.getElementById("sidebar").innerHTML = sidebarHtml;

    // Load sidebar script
    const sidebarScript = document.createElement("script");
    sidebarScript.src = "js/sidebar.js";
    document.body.appendChild(sidebarScript);

    console.log("✅ Header and sidebar loaded");
  } catch (error) {
    console.error("❌ Error loading header/sidebar:", error);
  }
}

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

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
  // Edit Profile Button (only for own profile)
  if (viewMode === "own") {
    const editProfileBtn = document.getElementById("editProfileBtn");
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", openEditModal);
    }

    // Profile pic upload with crop
    const editAvatarBtn = document.getElementById("editAvatarBtn");
    if (editAvatarBtn) {
      editAvatarBtn.addEventListener("click", () => {
        document.getElementById("profilePicInput").click();
      });
    }
    const removeAvatarBtn = document.getElementById("removeAvatarBtn");
    if (removeAvatarBtn) {
      removeAvatarBtn.addEventListener("click", showRemoveProfilePicModal);
    }
    const profilePicInput = document.getElementById("profilePicInput");
    if (profilePicInput) {
      profilePicInput.addEventListener("change", handleProfilePicChange);
    }

    const editProfileForm = document.getElementById("editProfileForm");
    if (editProfileForm) {
      editProfileForm.addEventListener("submit", handleProfileUpdate);
    }

    const editProfileModal = document.getElementById("editProfileModal");
    if (editProfileModal) {
      editProfileModal.addEventListener("click", (e) => {
        if (e.target.id === "editProfileModal") {
          closeEditModal();
        }
      });
    }
  }

  // Setup message button
  setupMessageButton();

  // Share button
  const shareBtn = document.getElementById("shareProfileBtn");
  if (shareBtn) {
    shareBtn.addEventListener(
      "click",
      viewMode === "own" ? shareProfile : () => copyProfileLink(viewingUserId)
    );
  }

  // Tab Navigation
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tabName = e.currentTarget.getAttribute("data-tab");
      switchTab(tabName);
    });
  });

  // Stats Click Navigation
  document.querySelectorAll(".stat-box").forEach((box) => {
    box.addEventListener("click", (e) => {
      const tabName = e.currentTarget.getAttribute("data-tab");
      if (tabName) {
        switchTab(tabName);
      }
    });
  });
}
window.showRemoveProfilePicModal = showRemoveProfilePicModal;
window.closeRemoveProfilePicModal = closeRemoveProfilePicModal;
window.confirmRemoveProfilePic = confirmRemoveProfilePic;

console.log("✅ Remove profile picture functionality loaded");
// ===== MESSAGE BUTTON FUNCTIONALITY =====
function setupMessageButton() {
  const messageBtn = document.getElementById("messageBtn");

  if (!messageBtn) return;

  messageBtn.addEventListener("click", () => {
    if (!viewingUserId) {
      showNotification("Cannot send message", "error");
      return;
    }

    // Redirect to messages page with user parameter
    window.location.href = `messages.html?user=${viewingUserId}`;
  });
}

// ===== TAB SWITCHING =====
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    }
  });

  // Update tab content
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.remove("active");
  });

  const activePane = document.getElementById(`${tabName}Tab`);
  if (activePane) {
    activePane.classList.add("active");
  }

  // Load tab-specific data if needed
  if (tabName === "followers") {
    loadFollowers();
  } else if (tabName === "following") {
    loadFollowing();
  } else if (tabName === "posts") {
    loadPosts();
  }
}

// ===== LOAD FOLLOWERS =====
async function loadFollowers() {
  const followersList = document.getElementById("followersList");
  followersList.innerHTML = '<p class="empty-state">Loading followers...</p>';

  try {
    const targetUserId = viewMode === "own" ? currentUser.id : viewingUserId;
    console.log(`📋 Loading followers for user ID: ${targetUserId}`);

    const session = getActiveSession();
    const headers = {};
    if (session && !isGuest) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/profile/${targetUserId}/followers`,
      { headers }
    );

    const data = await response.json();

    if (data.success && data.followers.length > 0) {
      displayUserList(data.followers, followersList);
      console.log(`✅ Loaded ${data.followers.length} followers`);
    } else {
      followersList.innerHTML = '<p class="empty-state">No followers yet</p>';
    }
  } catch (error) {
    console.error("Error loading followers:", error);
    followersList.innerHTML =
      '<p class="empty-state">Failed to load followers</p>';
  }
}

// ===== LOAD FOLLOWING =====
async function loadFollowing() {
  const followingList = document.getElementById("followingList");
  followingList.innerHTML = '<p class="empty-state">Loading following...</p>';

  try {
    const targetUserId = viewMode === "own" ? currentUser.id : viewingUserId;
    console.log(`📋 Loading following for user ID: ${targetUserId}`);

    const session = getActiveSession();
    const headers = {};
    if (session && !isGuest) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/profile/${targetUserId}/following`,
      { headers }
    );

    const data = await response.json();

    if (data.success && data.following.length > 0) {
      displayUserList(data.following, followingList);
      console.log(`✅ Loaded ${data.following.length} following`);
    } else {
      followingList.innerHTML =
        '<p class="empty-state">Not following anyone yet</p>';
    }
  } catch (error) {
    console.error("Error loading following:", error);
    followingList.innerHTML =
      '<p class="empty-state">Failed to load following</p>';
  }
}

// ===== LOAD POSTS =====
async function loadPosts() {
  const postsGrid = document.getElementById("postsGrid");
  postsGrid.innerHTML =
    '<div class="posts-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading posts...</p></div>';

  try {
    const targetUserId = viewMode === "own" ? currentUser.id : viewingUserId;
    console.log(`📋 Loading posts for user ID: ${targetUserId}`);

    const session = getActiveSession();
    const headers = {};
    if (session && !isGuest) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/posts/user/${targetUserId}/profile`,
      { headers }
    );

    const data = await response.json();
    console.log("📊 Posts data received:", data);

    if (data.success && data.posts && data.posts.length > 0) {
      displayPosts(data.posts, postsGrid);
      console.log(`✅ Loaded ${data.posts.length} posts`);
    } else {
      postsGrid.innerHTML = '<p class="empty-state">No posts yet</p>';
    }
  } catch (error) {
    console.error("❌ Error loading posts:", error);
    postsGrid.innerHTML = '<p class="empty-state">Failed to load posts</p>';
  }
}

// ===== DISPLAY POSTS =====
function displayPosts(posts, container) {
  container.innerHTML = "";

  console.log(`🎨 Displaying ${posts.length} posts. ViewMode: ${viewMode}`);

  posts.forEach((post) => {
    const postCard = document.createElement("div");
    postCard.className = `post-card ${
      post.post_type === "service" || post.post_type === "product"
        ? "selling-post"
        : ""
    }`;

    postCard.setAttribute("data-post-id", post.post_id);

    // Build proper media URL
    let mediaUrl = "";
    if (post.media_url) {
      if (
        post.media_url.startsWith("http://") ||
        post.media_url.startsWith("https://")
      ) {
        mediaUrl = post.media_url;
      } else {
        const filename = post.media_url.split("/").pop();
        const baseUrl = API_BASE_URL.replace("/api", "");
        mediaUrl = `${baseUrl}/api/uploads/${filename}`;
      }
    }

    // Media element (image or video)
    let mediaElement = "";
    if (post.media_type === "video") {
      mediaElement = `
        <video controls preload="metadata" style="width: 100%; height: 100%; object-fit: cover;">
          <source src="${mediaUrl}" type="video/mp4">
          <source src="${mediaUrl}" type="video/webm">
          Your browser does not support the video tag.
        </video>`;
    } else {
      mediaElement = `<img src="${mediaUrl}" alt="${
        post.caption || "Post image"
      }" onerror="this.src='images/placeholder.jpg'">`;
    }

    // Category badge
    let categoryBadge = "";
    if (post.category_name || post.subcategory_name) {
      const categoryText = post.subcategory_name || post.category_name || "";
      const categoryIcon = getCategoryIconForProfile(post.post_type);

      categoryBadge = `
        <div class="post-category-badge-small">
          <i class="${categoryIcon}"></i>
          <span>${categoryText}</span>
        </div>
      `;
    }

    // Post type badge
    const isSellingPost =
      post.post_type === "service" || post.post_type === "product";
    const typeBadge = `<div class="post-type-badge ${post.post_type}">${
      isSellingPost
        ? post.post_type === "service"
          ? "Service"
          : "Product"
        : "Showcase"
    }</div>`;

    // Edit button - show ONLY on own profile
    let editMenuButton = "";

    if (viewMode === "own" && !isGuest) {
      editMenuButton = `
        <div class="post-edit-menu-container">
          <button class="post-edit-menu-btn" onclick="event.stopPropagation(); togglePostMenu(${post.post_id});" title="Options">
            <i class="fas fa-edit"></i>
          </button>
          <div class="post-edit-dropdown" id="postMenu${post.post_id}">
            <button class="menu-item edit-item" onclick="event.stopPropagation(); editPost(${post.post_id});">
              <i class="fas fa-edit"></i>
              <span>Edit Post</span>
            </button>
            <button class="menu-item delete-item" onclick="event.stopPropagation(); showDeleteModal(${post.post_id});">
              <i class="fas fa-trash"></i>
              <span>Delete Post</span>
            </button>
          </div>
        </div>
      `;
    }

    // Post stats
    const stats = `
      <div class="post-stats">
        <div class="post-stat">
          <i class="fas fa-heart"></i>
          <span>${post.likes_count || 0}</span>
        </div>
        <div class="post-stat">
          <i class="fas fa-comment"></i>
          <span>${post.comments_count || 0}</span>
        </div>
        <div class="post-stat">
          <i class="fas fa-share"></i>
          <span>${post.shares_count || 0}</span>
        </div>
      </div>
    `;

    // Build post card HTML
    let postHTML = `
      <div class="post-media">
        ${mediaElement}
        ${typeBadge}
        ${editMenuButton}
      </div>
      <div class="post-content">
        ${categoryBadge}
        <div class="post-caption">${post.caption}</div>
        ${stats}
      </div>
    `;

    // Add price section for selling posts
    if (isSellingPost && post.price) {
      postHTML += `
        <div class="post-price">
          <div>
            <span class="price-tag">₹${parseFloat(post.price).toFixed(2)}</span>
            <span class="price-currency">${post.currency || "INR"}</span>
          </div>
          <button class="view-product-btn" onclick="viewPost(${post.post_id})">
            View ${post.post_type === "service" ? "Service" : "Product"}
          </button>
        </div>
      `;
    }

    postCard.innerHTML = postHTML;

    // Click handler for entire card
    postCard.addEventListener("click", (e) => {
      if (
        !e.target.classList.contains("view-product-btn") &&
        !e.target.classList.contains("post-edit-menu-btn") &&
        !e.target.closest(".post-edit-menu-btn") &&
        !e.target.closest(".post-edit-dropdown") &&
        e.target.tagName !== "VIDEO"
      ) {
        viewPost(post.post_id);
      }
    });

    container.appendChild(postCard);
  });
}

// ===== HELPER FUNCTION FOR CATEGORY ICONS =====
function getCategoryIconForProfile(postType) {
  const icons = {
    showcase: "fas fa-images",
    service: "fas fa-briefcase",
    product: "fas fa-shopping-bag",
  };
  return icons[postType] || "fas fa-folder";
}

// ===== TOGGLE POST MENU =====
function togglePostMenu(postId) {
  const menu = document.getElementById(`postMenu${postId}`);
  const allMenus = document.querySelectorAll(".post-edit-dropdown");

  // Close all other menus
  allMenus.forEach((m) => {
    if (m.id !== `postMenu${postId}`) {
      m.classList.remove("show");
    }
  });

  // Toggle current menu
  if (menu) {
    menu.classList.toggle("show");
  }
}

// Close menu when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".post-edit-menu-container")) {
    document.querySelectorAll(".post-edit-dropdown").forEach((menu) => {
      menu.classList.remove("show");
    });
  }
});

// ===== EDIT POST =====
function editPost(postId) {
  console.log(`✏️ Editing post ${postId}`);
  window.location.href = `edit-post.html?id=${postId}`;
}

// ===== VIEW POST =====
function viewPost(postId) {
  openPostDetail(postId);
  console.log("View post:", postId);
}

// ===== DISPLAY USER LIST =====
function displayUserList(users, container) {
  container.innerHTML = "";

  users.forEach((user) => {
    const userItem = document.createElement("div");
    userItem.className = "user-item";

    let avatarContent = "";
    if (user.profile_pic) {
      let avatarSrc = "";
      if (
        user.profile_pic.startsWith("http://") ||
        user.profile_pic.startsWith("https://")
      ) {
        avatarSrc = user.profile_pic;
      } else if (user.profile_pic.startsWith("uploads/profile/")) {
        const filename = user.profile_pic.split("/").pop();
        avatarSrc = `${API_BASE_URL}/get-profile-pic/${filename}`;
      }
      avatarContent = `<img src="${avatarSrc}" alt="${user.username}">`;
    } else {
      avatarContent = user.username.charAt(0).toUpperCase();
    }

    // Build follow button HTML
    let followButtonHTML = "";

    if (!isGuest && currentUser && !user.is_self) {
      if (user.is_following) {
        followButtonHTML = `
          <button class="user-follow-btn following" onclick="event.stopPropagation(); handleUserFollow(${user.id}, true)">
            <i class="fas fa-user-check"></i> Following
          </button>
        `;
      } else if (user.is_pending) {
        followButtonHTML = `
          <button class="user-follow-btn requested" onclick="event.stopPropagation(); handleUserFollow(${user.id}, true)">
            <i class="fas fa-clock"></i> Requested
          </button>
        `;
      } else {
        followButtonHTML = `
          <button class="user-follow-btn" onclick="event.stopPropagation(); handleUserFollow(${
            user.id
          }, false)">
            <i class="fas fa-user-plus"></i> Follow${
              viewMode === "own" ? " Back" : ""
            }
          </button>
        `;
      }
    }

    userItem.innerHTML = `
      <div class="user-avatar">${avatarContent}</div>
      <div class="user-info">
        <div class="user-name">${user.full_name || user.username}</div>
        <div class="user-username">@${user.username}</div>
      </div>
      ${followButtonHTML}
    `;

    // Click handler for entire card (navigate to profile)
    userItem.addEventListener("click", (e) => {
      if (!e.target.closest(".user-follow-btn")) {
        const session = getActiveSession();
        if (session && session.user.id === user.id) {
          window.location.href = "profile.html";
        } else {
          window.location.href = `profile.html?id=${user.id}`;
        }
      }
    });

    userItem.style.cursor = "pointer";
    container.appendChild(userItem);
  });
}

// ===== HANDLE USER FOLLOW =====
async function handleUserFollow(userId, isCurrentlyFollowing) {
  if (isGuest || !currentUser) {
    showNotification("Please login to follow users", "error");
    setTimeout(() => {
      window.location.href = `login.html?redirect=${window.location.href}`;
    }, 1500);
    return;
  }

  try {
    const session = getActiveSession();
    const endpoint = isCurrentlyFollowing
      ? `${API_BASE_URL}/profile/${userId}/unfollow`
      : `${API_BASE_URL}/profile/${userId}/follow`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      if (isCurrentlyFollowing) {
        showNotification("Unfollowed successfully", "success");
      } else {
        if (data.request_pending) {
          showNotification("Follow request sent!", "success");
        } else {
          showNotification("Following successfully", "success");
        }
      }

      // Reload the current tab to update the list
      const activeTab = document.querySelector(".tab-btn.active");
      if (activeTab) {
        const tabName = activeTab.getAttribute("data-tab");
        switchTab(tabName);
      }
    } else {
      if (data.message && data.message.includes("already sent")) {
        showNotification("Follow request already sent", "error");
        const activeTab = document.querySelector(".tab-btn.active");
        if (activeTab) {
          const tabName = activeTab.getAttribute("data-tab");
          switchTab(tabName);
        }
      } else {
        showNotification(
          data.message || "Failed to update follow status",
          "error"
        );
      }
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    showNotification("Failed to update follow status", "error");
  }
}

// ===== PROFILE PICTURE CROP FUNCTIONS =====

// Handle profile picture change
async function handleProfilePicChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!validTypes.includes(file.type)) {
    showNotification(
      "Please select a valid image file (JPG, PNG, GIF, WEBP)",
      "error"
    );
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showNotification("Image size must be less than 5MB", "error");
    return;
  }

  try {
    const reader = new FileReader();
    reader.onload = function (event) {
      originalProfilePicSrc = event.target.result;
      openProfileCropModal(event.target.result);
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error reading file:", error);
    showNotification("Failed to read image file", "error");
  }
}

// Open crop modal
function openProfileCropModal(imageSrc) {
  const cropModal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");

  if (!cropModal || !cropImage) {
    console.error("Crop modal elements not found");
    return;
  }

  cropImage.src = imageSrc;
  cropModal.classList.add("show");
  document.body.style.overflow = "hidden";

  // Initialize Cropper.js
  setTimeout(() => {
    if (cropper) {
      cropper.destroy();
    }

    cropper = new Cropper(cropImage, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
      background: false,
      zoomable: true,
      scalable: true,
      rotatable: true,
    });

    console.log("✅ Cropper initialized for profile picture");
  }, 100);
}

// Close crop modal
function closeCropModal() {
  const cropModal = document.getElementById("cropModal");

  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  cropModal.classList.remove("show");
  document.body.style.overflow = "auto";

  const fileInput = document.getElementById("profilePicInput");
  if (fileInput) {
    fileInput.value = "";
  }

  croppedProfileBlob = null;
  originalProfilePicSrc = null;
}

// Crop controls
function rotateCropLeft() {
  if (cropper) {
    cropper.rotate(-90);
  }
}

function rotateCropRight() {
  if (cropper) {
    cropper.rotate(90);
  }
}

function flipCropHorizontal() {
  if (cropper) {
    const scaleX = cropper.getData().scaleX || 1;
    cropper.scaleX(-scaleX);
  }
}

function flipCropVertical() {
  if (cropper) {
    const scaleY = cropper.getData().scaleY || 1;
    cropper.scaleY(-scaleY);
  }
}

function resetCrop() {
  if (cropper) {
    cropper.reset();
  }
}

// Apply crop and upload
async function applyCrop() {
  if (!cropper) {
    showNotification("No image to crop", "error");
    return;
  }

  try {
    showLoading(true);

    const canvas = cropper.getCroppedCanvas({
      width: 400,
      height: 400,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          throw new Error("Failed to create image blob");
        }

        croppedProfileBlob = blob;
        console.log("✅ Cropped image blob created:", blob.size, "bytes");

        await uploadCroppedProfilePic(blob);
        closeCropModal();
      },
      "image/jpeg",
      0.9
    );
  } catch (error) {
    console.error("❌ Error applying crop:", error);
    showNotification("Failed to crop image", "error");
    showLoading(false);
  }
}

// Upload cropped profile picture
async function uploadCroppedProfilePic(blob) {
  try {
    const formData = new FormData();
    formData.append("profile_pic", blob, "profile.jpg");

    const session = getActiveSession();
    const response = await fetch(`${API_BASE_URL}/profile/update`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Profile picture updated successfully!", "success");

      if (data.profile && data.profile.profile_pic) {
        currentProfileData.profile_pic = data.profile.profile_pic;

        await updateHeaderProfilePic(data.profile.profile_pic);

        const avatarElement = document.getElementById("profileAvatar");
        let avatarSrc = "";

        if (
          data.profile.profile_pic.startsWith("http://") ||
          data.profile.profile_pic.startsWith("https://")
        ) {
          avatarSrc = data.profile.profile_pic;
        } else if (data.profile.profile_pic.startsWith("uploads/profile/")) {
          const filename = data.profile.profile_pic.split("/").pop();
          avatarSrc = `${API_BASE_URL}/get-profile-pic/${filename}`;
        }

        if (avatarSrc) {
          avatarElement.innerHTML = `<img src="${avatarSrc}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
      }
    } else {
      showNotification(
        data.message || "Failed to update profile picture",
        "error"
      );
    }
  } catch (error) {
    console.error("Error uploading cropped profile picture:", error);
    showNotification("Failed to upload profile picture", "error");
  } finally {
    showLoading(false);
  }
}

// Update header profile picture
async function updateHeaderProfilePic(profilePicPath) {
  try {
    const session = getActiveSession();
    if (session && session.user) {
      const updatedUser = { ...session.user, profile_pic: profilePicPath };

      if (localStorage.getItem("userData")) {
        localStorage.setItem("userData", JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem("userData")) {
        sessionStorage.setItem("userData", JSON.stringify(updatedUser));
      }

      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: { profile_pic: profilePicPath },
        })
      );

      const headerAvatar = document.querySelector(".user-profile-dropdown img");
      if (headerAvatar && profilePicPath) {
        let avatarSrc = "";
        if (
          profilePicPath.startsWith("http://") ||
          profilePicPath.startsWith("https://")
        ) {
          avatarSrc = profilePicPath;
        } else if (profilePicPath.startsWith("uploads/profile/")) {
          const filename = profilePicPath.split("/").pop();
          avatarSrc = `${API_BASE_URL}/get-profile-pic/${filename}`;
        }

        if (avatarSrc) {
          headerAvatar.src = avatarSrc;
          console.log("✅ Header profile picture updated");
        }
      }
    }
  } catch (error) {
    console.error("❌ Error updating header profile pic:", error);
  }
}

// ===== EDIT PROFILE MODAL =====

let allCountriesData = [];

// Load countries data for edit modal
async function loadCountriesForEdit() {
  try {
    const res = await fetch("js/data/countries+states+cities.json");
    const data = await res.json();
    allCountriesData = data;

    const countrySelect = document.getElementById("editCountry");

    if (countrySelect.tagName.toLowerCase() === "input") {
      const newSelect = document.createElement("select");
      newSelect.id = "editCountry";
      newSelect.name = "country";
      newSelect.className = countrySelect.className;
      newSelect.style.fontSize = "15px";
      newSelect.onchange = updateEditStates;
      countrySelect.replaceWith(newSelect);
    }

    const select = document.getElementById("editCountry");
    select.innerHTML = '<option value="">Select Country</option>';

    allCountriesData.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.iso2 || c.name;
      option.textContent = c.name;
      select.appendChild(option);
    });

    console.log("✅ Countries loaded for edit modal");
  } catch (err) {
    console.error("Error loading countries:", err);
  }
}

// Update states dropdown
function updateEditStates() {
  const countrySelect = document.getElementById("editCountry");
  let stateElement = document.getElementById("editState");
  const cityElement = document.getElementById("editCity");

  if (!stateElement || !cityElement) return;

  const countryCode = countrySelect.value;

  if (cityElement.tagName.toLowerCase() === "select") {
    cityElement.innerHTML = `<option value="">Select City</option>`;
  } else {
    cityElement.value = "";
  }

  if (!countryCode) {
    if (stateElement.tagName.toLowerCase() === "select") {
      stateElement.innerHTML = `<option value="">Select Country First</option>`;
    } else {
      stateElement.value = "";
      stateElement.placeholder = "Select Country First";
    }
    return;
  }

  const countryData = allCountriesData.find((c) => c.iso2 === countryCode);

  if (!countryData || !countryData.states || countryData.states.length === 0) {
    if (stateElement.tagName.toLowerCase() === "select") {
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.id = "editState";
      newInput.name = "state";
      newInput.className = stateElement.className;
      newInput.placeholder = "Enter your state/province";
      stateElement.replaceWith(newInput);
    }
    return;
  }

  if (stateElement.tagName.toLowerCase() === "input") {
    const newSelect = document.createElement("select");
    newSelect.id = "editState";
    newSelect.name = "state";
    newSelect.className = stateElement.className;
    newSelect.style.fontSize = "15px";
    newSelect.onchange = updateEditCities;
    stateElement.replaceWith(newSelect);
    stateElement = newSelect;
  }

  const sortedStates = [...countryData.states].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  stateElement.innerHTML = `<option value="">Select State</option>`;
  sortedStates.forEach((s) => {
    const option = document.createElement("option");
    option.value = s.name;
    option.setAttribute("data-code", s.state_code);
    option.textContent = s.name;
    stateElement.appendChild(option);
  });
}

// Update cities dropdown
function updateEditCities() {
  const countrySelect = document.getElementById("editCountry");
  const stateSelect = document.getElementById("editState");
  let cityElement = document.getElementById("editCity");

  if (!cityElement || !stateSelect) return;

  const countryCode = countrySelect.value;
  const stateCode = stateSelect.value;

  if (!stateCode) {
    if (cityElement.tagName.toLowerCase() === "input") {
      const newSelect = document.createElement("select");
      newSelect.id = "editCity";
      newSelect.name = "city";
      newSelect.style.fontSize = "15px";
      newSelect.innerHTML = `<option value="">Select State First</option>`;
      cityElement.replaceWith(newSelect);
    } else {
      cityElement.innerHTML = `<option value="">Select State First</option>`;
    }
    return;
  }

  const countryData = allCountriesData.find((c) => c.iso2 === countryCode);
  if (!countryData) return;

  const stateData = countryData.states.find((s) => s.name === stateCode);

  if (!stateData || !stateData.cities || stateData.cities.length === 0) {
    if (cityElement.tagName.toLowerCase() === "select") {
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.id = "editCity";
      newInput.name = "city";
      newInput.className = cityElement.className;
      newInput.placeholder = "Enter your city";
      cityElement.replaceWith(newInput);
    }
    return;
  }

  if (cityElement.tagName.toLowerCase() === "input") {
    const newSelect = document.createElement("select");
    newSelect.id = "editCity";
    newSelect.name = "city";
    newSelect.style.fontSize = "15px";
    cityElement.replaceWith(newSelect);
    cityElement = newSelect;
  }

  const sortedCities = [...stateData.cities].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  cityElement.innerHTML = `<option value="">Select City</option>`;
  sortedCities.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.name;
    option.textContent = c.name;
    cityElement.appendChild(option);
  });
}

// Open edit modal
async function openEditModal() {
  if (!window.currentProfile) return;

  const profile = window.currentProfile;

  await loadCountriesForEdit();

  document.getElementById("editFullName").value = profile.full_name || "";
  document.getElementById("editAboutMe").value = profile.about_me || "";
  document.getElementById("editPhone").value = profile.phone || "";
  document.getElementById("editGender").value = profile.gender || "";
  document.getElementById("editDOB").value = profile.date_of_birth || "";
  document.getElementById("editWebsite").value = profile.website_url || "";
  document.getElementById("editIsPrivate").checked =
    profile.is_private || false;

  if (profile.country) {
    const countryData = allCountriesData.find(
      (c) => c.name === profile.country
    );
    if (countryData) {
      document.getElementById("editCountry").value = countryData.iso2;
      await updateEditStates();

      if (profile.state) {
        setTimeout(() => {
          const stateSelect = document.getElementById("editState");
          if (stateSelect.tagName.toLowerCase() === "select") {
            stateSelect.value = profile.state;
            updateEditCities();

            if (profile.city) {
              setTimeout(() => {
                const cityElement = document.getElementById("editCity");
                if (cityElement.tagName.toLowerCase() === "select") {
                  cityElement.value = profile.city;
                } else {
                  cityElement.value = profile.city;
                }
              }, 100);
            }
          } else {
            stateSelect.value = profile.state;
          }
        }, 100);
      }
    }
  }

  document.getElementById("editProfileModal").classList.add("show");
  document.body.style.overflow = "hidden";
}

// Close edit modal
function closeEditModal() {
  document.getElementById("editProfileModal").classList.remove("show");
  document.body.style.overflow = "auto";
}

// Handle profile update
async function handleProfileUpdate(e) {
  e.preventDefault();

  const dobInput = document.getElementById("editDOB");
  if (dobInput.value) {
    const selectedDate = new Date(dobInput.value);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (selectedDate >= currentDate) {
      showNotification(
        "Date of birth cannot be today or in the future",
        "error"
      );
      dobInput.closest(".form-group").classList.add("invalid");
      return;
    }

    dobInput.closest(".form-group").classList.remove("invalid");
  }

  const countrySelect = document.getElementById("editCountry");
  let countryValue = null;
  if (countrySelect.value) {
    const selectedOption = countrySelect.options[countrySelect.selectedIndex];
    countryValue = selectedOption.text;
  }

  const stateElement = document.getElementById("editState");
  let stateValue = null;
  if (stateElement.tagName.toLowerCase() === "select") {
    stateValue = stateElement.value || null;
  } else {
    stateValue = stateElement.value.trim() || null;
  }

  const cityElement = document.getElementById("editCity");
  let cityValue = null;
  if (cityElement.tagName.toLowerCase() === "select") {
    cityValue = cityElement.value || null;
  } else {
    cityValue = cityElement.value.trim() || null;
  }

  const updateData = {
    full_name: document.getElementById("editFullName").value.trim() || null,
    about_me: document.getElementById("editAboutMe").value.trim() || null,
    phone: document.getElementById("editPhone").value.trim() || null,
    gender: document.getElementById("editGender").value || null,
    date_of_birth: document.getElementById("editDOB").value || null,
    website_url: document.getElementById("editWebsite").value.trim() || null,
    country: countryValue,
    state: stateValue,
    city: cityValue,
    is_private: document.getElementById("editIsPrivate").checked,
  };

  console.log("📤 Sending update data:", updateData);

  try {
    showLoading(true);

    const session = getActiveSession();
    const response = await fetch(`${API_BASE_URL}/profile/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Profile updated successfully!", "success");
      closeEditModal();

      if (data.profile) {
        currentProfileData = {
          ...currentProfileData,
          ...data.profile,
          profile_pic:
            currentProfileData.profile_pic || data.profile.profile_pic,
        };

        const headerUpdateData = {};
        if (data.profile.full_name) {
          headerUpdateData.full_name = data.profile.full_name;
        }

        if (Object.keys(headerUpdateData).length > 0) {
          await updateHeaderProfileData(headerUpdateData);
        }

        displayProfile(currentProfileData);
      } else {
        await loadProfileData(currentUser.id);
      }
    } else {
      showNotification(data.message || "Failed to update profile", "error");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    showNotification("Failed to update profile", "error");
  } finally {
    showLoading(false);
  }
}

// Update header profile data
async function updateHeaderProfileData(updatedData) {
  try {
    const session = getActiveSession();
    if (session && session.user) {
      const updatedUser = {
        ...session.user,
        ...updatedData,
      };

      if (localStorage.getItem("userData")) {
        localStorage.setItem("userData", JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem("userData")) {
        sessionStorage.setItem("userData", JSON.stringify(updatedUser));
      }

      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: updatedData,
        })
      );

      console.log("✅ Header profile data updated:", updatedData);
    }
  } catch (error) {
    console.error("❌ Error updating header profile data:", error);
  }
}

// ===== SHARE PROFILE =====
function shareProfile() {
  const profileUrl = window.location.href;

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile && navigator.share) {
    navigator
      .share({
        title: `${currentUser.username}'s Profile`,
        text: "Check out my Creator Connect profile!",
        url: profileUrl,
      })
      .then(() => {
        showNotification("Profile shared successfully!", "success");
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          copyToClipboard(profileUrl);
        }
      });
  } else {
    copyToClipboard(profileUrl);
  }
}

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showNotification("Profile link copied to clipboard!", "success");
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showNotification("Failed to copy link", "error");
    });
}

// ===== DELETE POST MODAL =====

let postToDelete = null;

function initializeDeleteModal() {
  if (!document.getElementById("deletePostModal")) {
    const modalHTML = `
      <div id="deletePostModal" class="delete-modal">
        <div class="delete-modal-content">
          <div class="delete-modal-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 class="delete-modal-title">Delete Post?</h2>
          <p class="delete-modal-message">
            Are you sure you want to delete this post? This action cannot be undone and will permanently remove the post and its media file.
          </p>
          <div class="delete-modal-actions">
            <button class="cancel-delete-btn" onclick="closeDeleteModal()">
              <i class="fas fa-times"></i>
              Cancel
            </button>
            <button class="confirm-delete-btn" onclick="confirmDeletePost()">
              <i class="fas fa-trash"></i>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  document.getElementById("deletePostModal").addEventListener("click", (e) => {
    if (e.target.id === "deletePostModal") {
      closeDeleteModal();
    }
  });
}

function showDeleteModal(postId) {
  postToDelete = postId;
  const modal = document.getElementById("deletePostModal");
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
  console.log(`🗑️ Delete modal opened for post ${postId}`);
}

function closeDeleteModal() {
  const modal = document.getElementById("deletePostModal");
  modal.classList.remove("show");
  document.body.style.overflow = "auto";
  postToDelete = null;
  console.log("✅ Delete modal closed");
}

async function confirmDeletePost() {
  if (!postToDelete) {
    console.error("❌ No post selected for deletion");
    return;
  }

  const postId = postToDelete;
  closeDeleteModal();

  console.log(`🚀 Starting deletion of post ${postId}`);

  try {
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (postCard) {
      postCard.classList.add("deleting");
    }

    showLoading(true);

    const session = getActiveSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    showLoading(false);

    if (data.success) {
      console.log(`✅ Post ${postId} deleted successfully`);

      showDeleteNotification("Post deleted successfully!", "success");

      if (postCard) {
        postCard.style.transition = "all 0.3s ease";
        postCard.style.opacity = "0";
        postCard.style.transform = "scale(0.9)";

        setTimeout(() => {
          postCard.remove();

          const postsGrid = document.getElementById("postsGrid");
          if (postsGrid && postsGrid.children.length === 0) {
            postsGrid.innerHTML = '<p class="empty-state">No posts yet</p>';
          }

          updatePostCount(-1);
        }, 300);
      }
    } else {
      console.error(`❌ Failed to delete post: ${data.message}`);
      showDeleteNotification(data.message || "Failed to delete post", "error");

      if (postCard) {
        postCard.classList.remove("deleting");
      }
    }
  } catch (error) {
    console.error("❌ Error deleting post:", error);
    showLoading(false);
    showDeleteNotification("Failed to delete post. Please try again.", "error");

    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (postCard) {
      postCard.classList.remove("deleting");
    }
  }
}

function updatePostCount(change) {
  const postsCountEl = document.getElementById("postsCount");
  if (postsCountEl) {
    const currentCount = parseInt(postsCountEl.textContent) || 0;
    const newCount = Math.max(0, currentCount + change);
    postsCountEl.textContent = newCount;
  }
}

function showDeleteNotification(message, type = "success") {
  const existing = document.querySelector(".delete-notification");
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement("div");
  notification.className = `delete-notification ${type}`;

  const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

  notification.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 100);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===== POST DETAIL MODAL =====

function injectModalStyles() {
  if (!document.getElementById("postDetailModalStyles")) {
    const styleElement = document.createElement("style");
    styleElement.id = "postDetailModalStyles";
    styleElement.textContent = `
/* Post Detail Modal */
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
    `;
    document.head.appendChild(styleElement);
  }
}

function openPostDetail(postId) {
  console.log(`🔍 Opening post detail for ID: ${postId}`);

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

  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  window.addEventListener("message", handleIframeMessage);
}

function closePostDetailModal() {
  const modal = document.getElementById("postDetailModal");
  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.remove();
    document.body.style.overflow = "auto";
  }, 300);

  window.removeEventListener("message", handleIframeMessage);
}

function handleIframeMessage(event) {
  const { action, postId, message, type, userId } = event.data;

  switch (action) {
    case "closeModal":
      closePostDetailModal();
      break;

    case "showToast":
      showNotification(message, type);
      break;

    case "openBuyModal":
      closePostDetailModal();
      setTimeout(() => {
        console.log("Open buy modal for post:", postId);
      }, 300);
      break;

    case "navigateToProfile":
      // Navigate to user profile
      if (userId) {
        closePostDetailModal();
        setTimeout(() => {
          const session = getActiveSession();
          if (session && session.user.id === userId) {
            window.location.href = "profile.html";
          } else {
            window.location.href = `profile.html?id=${userId}`;
          }
        }, 300);
      }
      break;

    case "showComments":
      console.log("Show comments for post:", postId);
      closePostDetailModal();
      break;

    default:
      break;
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    sendThemeToIframe();
  }
});

window.addEventListener("themeChanged", () => {
  sendThemeToIframe();
});

function sendThemeToIframe() {
  const iframe = document.getElementById("postDetailIframe");
  if (iframe && iframe.contentWindow) {
    const theme = localStorage.getItem("theme") || "light";
    iframe.contentWindow.postMessage(
      { action: "themeChanged", theme: theme },
      "*"
    );
  }
}

// ===== UTILITY FUNCTIONS =====

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

function showNotification(message, type = "success") {
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

  notification.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 100);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

console.log("✅ Profile.js fully loaded and initialized");
let removeProfilePicModal = null;

// ===== INITIALIZE REMOVE PROFILE PICTURE MODAL =====
function initializeRemoveProfilePicModal() {
  if (!document.getElementById("removeProfilePicModal")) {
    const modalHTML = `
      <div id="removeProfilePicModal" class="remove-pic-modal">
        <div class="remove-pic-modal-content" onclick="event.stopPropagation()">
          <div class="remove-pic-modal-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 class="remove-pic-modal-title">Remove Profile Picture?</h2>
          <p class="remove-pic-modal-message">
            Are you sure you want to remove your profile picture? This will permanently delete the image from the server.
          </p>
          <div class="remove-pic-modal-actions">
            <button class="cancel-remove-btn" onclick="closeRemoveProfilePicModal()">
              <i class="fas fa-times"></i>
              Cancel
            </button>
            <button class="confirm-remove-btn" onclick="confirmRemoveProfilePic()">
              <i class="fas fa-trash"></i>
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    removeProfilePicModal = document.getElementById("removeProfilePicModal");

    // Close on overlay click
    removeProfilePicModal.addEventListener("click", (e) => {
      if (e.target.id === "removeProfilePicModal") {
        closeRemoveProfilePicModal();
      }
    });
  }
}

// ===== SHOW REMOVE PROFILE PICTURE MODAL =====
function showRemoveProfilePicModal() {
  initializeRemoveProfilePicModal();
  const modal = document.getElementById("removeProfilePicModal");
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
  console.log("🗑️ Remove profile picture modal opened");
}

// ===== CLOSE REMOVE PROFILE PICTURE MODAL =====
function closeRemoveProfilePicModal() {
  const modal = document.getElementById("removeProfilePicModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
  }
  console.log("✅ Remove profile picture modal closed");
}

// ===== CONFIRM REMOVE PROFILE PICTURE =====
async function confirmRemoveProfilePic() {
  console.log("🚀 Starting profile picture removal");

  closeRemoveProfilePicModal();
  showLoading(true);

  try {
    const session = getActiveSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/profile/remove-picture`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ Profile picture removed successfully");

      // Update UI - Remove image and show default icon
      const avatarElement = document.getElementById("profileAvatar");
      if (avatarElement) {
        avatarElement.innerHTML = '<i class="fas fa-user"></i>';
      }

      // Hide remove button since there's no picture now
      const removeBtn = document.getElementById("removeAvatarBtn");
      if (removeBtn) {
        removeBtn.style.display = "none";
      }

      // Update currentProfileData
      if (currentProfileData) {
        currentProfileData.profile_pic = null;
      }

      // Update header profile picture
      await updateHeaderProfilePic(null);

      showNotification("Profile picture removed successfully!", "success");
    } else {
      console.error("❌ Failed to remove profile picture:", data.message);
      showNotification(
        data.message || "Failed to remove profile picture",
        "error"
      );
    }
  } catch (error) {
    console.error("❌ Error removing profile picture:", error);
    showNotification(
      "Failed to remove profile picture. Please try again.",
      "error"
    );
  } finally {
    showLoading(false);
  }
}
