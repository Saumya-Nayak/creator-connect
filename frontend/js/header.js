const _H_API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

const _H_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "/frontend/"
    : "/";
// Theme toggle functionality
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const html = document.documentElement;

const currentTheme = localStorage.getItem("theme") || "light";
// ===== TEMPORARY DEBUG - Add this at the top of header.js =====
window.addEventListener(
  "message",
  function (event) {
    console.log("🔍 RAW MESSAGE RECEIVED:", {
      hasAction: "action" in event.data,
      action: event.data.action,
      hasMessage: "message" in event.data,
      message: event.data.message,
      allKeys: Object.keys(event.data),
      fullData: JSON.stringify(event.data),
      origin: event.origin,
    });
  },
  true
);
html.setAttribute("data-theme", currentTheme);
updateThemeButton(currentTheme);

themeToggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  const newTheme = current === "light" ? "dark" : "light";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeButton(newTheme);

  // Sync with both modals if they're open
  const signupModal = document.getElementById("signupModal");
  const loginModal = document.getElementById("loginModal");

  if (signupModal && signupModal.classList.contains("show")) {
    const iframe = signupModal.querySelector("iframe");
    if (iframe && iframe.contentDocument) {
      try {
        const iframeBody = iframe.contentDocument.body;
        iframeBody.classList.remove("light", "dark");
        iframeBody.classList.add(newTheme);
      } catch (e) {
        console.log("Theme sync:", e);
      }
    }
  }

  if (loginModal && loginModal.classList.contains("show")) {
    const iframe = loginModal.querySelector("iframe");
    if (iframe && iframe.contentDocument) {
      try {
        const iframeBody = iframe.contentDocument.body;
        iframeBody.classList.remove("light", "dark");
        iframeBody.classList.add(newTheme);
      } catch (e) {
        console.log("Theme sync:", e);
      }
    }
  }
});

function updateThemeButton(theme) {
  if (theme === "dark") {
    themeIcon.className = "fas fa-sun";
  } else {
    themeIcon.className = "fas fa-moon";
  }
}

// Navigation items
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", function (e) {
    e.preventDefault();

    // Get the href attribute
    const href = this.getAttribute("href");

    // Only navigate if href is not "#" (placeholder links)
    if (href && href !== "#") {
      // Navigate to the page
      window.location.href = href;
    }

    // Update active state
    document
      .querySelectorAll(".nav-item")
      .forEach((i) => i.classList.remove("active"));
    this.classList.add("active");
  });
});
function setActiveNavItem() {
  // Get current page name
  const currentPage = window.location.pathname.split("/").pop() || "home.html";

  console.log("📍 Current page:", currentPage);

  // Remove active from all nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    (function setMobileNavActive() {
      const page = window.location.pathname.split("/").pop() || "home.html";
      document.querySelectorAll(".mobile-nav-btn").forEach((btn) => {
        const href = (btn.getAttribute("href") || "").split("/").pop();
        if (href === page) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    })();
    item.classList.remove("active");
  });

  // Find and set active based on current page
  document.querySelectorAll(".nav-item").forEach((item) => {
    const href = item.getAttribute("href");

    if (
      href === currentPage ||
      (currentPage === "home.html" && href === "home.html") ||
      (currentPage === "profile.html" && href === "profile.html") ||
      (currentPage === "explore.html" && href === "explore.html") ||
      (currentPage === "creator-bazaar.html" && href === "creator-bazaar.html")
    ) {
      item.classList.add("active");
      console.log("✅ Active nav item set:", href);
    }
  });
}

// Call setActiveNavItem when header loads
document.addEventListener("DOMContentLoaded", function () {
  setActiveNavItem();
});
// === SHOW LOGIN SUCCESS ONLY ONCE ===
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("showLoginSuccessOnce") === "true") {
    showSuccessNotification("Login successful!");
    sessionStorage.removeItem("showLoginSuccessOnce");
  }
});

// Also call it immediately if DOM is already loaded
if (document.readyState !== "loading") {
  setActiveNavItem();
}
// Notification badges (example)
document.querySelectorAll(".icon-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    if (this.querySelector(".badge")) {
      console.log("Badge clicked");
    }
  });
});

// Login/Signup button handler
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Check if user is logged in
    const userData =
      localStorage.getItem("userData") || sessionStorage.getItem("userData");

    if (userData) {
      // User is logged in - show profile menu
      showProfileMenu();
    } else {
      // User not logged in - open login modal
      openLoginModal();
    }
  });
}

// Login modal functions
function openLoginModal() {
  const modal = document.getElementById("loginModal");
  if (!modal) {
    console.error("loginModal not found in HTML");
    return;
  }

  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  const currentTheme = html.getAttribute("data-theme");
  localStorage.setItem("theme", currentTheme);

  const iframe = modal.querySelector("iframe");

  if (iframe) {
    iframe.addEventListener("load", function () {
      try {
        const iframeBody = iframe.contentDocument.body;
        iframeBody.classList.remove("light", "dark");
        iframeBody.classList.add(currentTheme);
      } catch (e) {
        console.log("Theme sync:", e);
      }
    });

    if (
      iframe.contentDocument &&
      iframe.contentDocument.readyState === "complete"
    ) {
      try {
        const iframeBody = iframe.contentDocument.body;
        iframeBody.classList.remove("light", "dark");
        iframeBody.classList.add(currentTheme);
      } catch (e) {
        console.log("Theme sync:", e);
      }
    }
  }
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "auto";

  console.log("✅ Login modal closed");
}

// Close login modal when clicking outside
const loginModalElement = document.getElementById("loginModal");
if (loginModalElement) {
  loginModalElement.addEventListener("click", function (e) {
    if (e.target === this) {
      closeLoginModal();
    }
  });
}

// Signup modal functions
function openSignupModal() {
  const modal = document.getElementById("signupModal");
  if (!modal) {
    console.error("signupModal not found in HTML");
    return;
  }

  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  const currentTheme = html.getAttribute("data-theme");
  localStorage.setItem("theme", currentTheme);

  const iframe = modal.querySelector("iframe");

  if (iframe) {
    iframe.addEventListener("load", function () {
      try {
        const iframeBody = iframe.contentDocument.body;
        iframeBody.classList.remove("light", "dark");
        iframeBody.classList.add(currentTheme);
      } catch (e) {
        console.log("Theme sync:", e);
      }
    });

    if (
      iframe.contentDocument &&
      iframe.contentDocument.readyState === "complete"
    ) {
      try {
        const iframeBody = iframe.contentDocument.body;
        iframeBody.classList.remove("light", "dark");
        iframeBody.classList.add(currentTheme);
      } catch (e) {
        console.log("Theme sync:", e);
      }
    }
  }
}

function closeSignupModal() {
  const modal = document.getElementById("signupModal");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "auto";
}

// Close signup modal when clicking outside
const signupModalElement = document.getElementById("signupModal");
if (signupModalElement) {
  signupModalElement.addEventListener("click", function (e) {
    if (e.target === this) {
      closeSignupModal();
    }
  });
}

// Update UI for logged-in user
// Update UI for logged-in user
function updateUIForLoggedInUser() {
  const loginBtn = document.getElementById("loginBtn");
  if (!loginBtn) return;

  // Get user data from storage
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");

  if (userData) {
    try {
      const user = JSON.parse(userData);
      document.body.classList.add("logged-in");

      // Create upload content button if it doesn't exist
      let uploadBtn = document.getElementById("uploadContentBtn");
      if (!uploadBtn) {
        uploadBtn = document.createElement("button");
        uploadBtn.id = "uploadContentBtn";
        uploadBtn.className = "nav-btn upload-btn";
        uploadBtn.innerHTML = `
          <i class="fas fa-cloud-upload-alt"></i>
          <span><font size="3.9rm">Upload</font></span>
        `;
        uploadBtn.onclick = (e) => {
          e.preventDefault();
          window.location.href = _H_BASE + "upload.html";
        };

        // Insert before login button
        loginBtn.parentNode.insertBefore(uploadBtn, loginBtn);
      }

      // ✅ NEW: Function to get profile picture for button
      function getButtonProfilePic(user) {
        const profilePic = user.profile_pic;

        if (profilePic) {
          // Google URL
          if (
            profilePic.startsWith("http://") ||
            profilePic.startsWith("https://")
          ) {
            return `<img src="${profilePic}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" alt="" onerror="this.style.display='none'">`;
          }
          // Local uploaded image
          else if (profilePic.startsWith("uploads/profile/")) {
            const filename = profilePic.split("/").pop();
            return `<img src="${_H_API}/get-profile-pic/${filename}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" alt="" onerror="this.style.display='none'">`;
          }
        }

        // Fallback to icon
        return '<i class="fas fa-user-circle" style="font-size: 18px;"></i>';
      }

      // Change login button to user profile
      loginBtn.innerHTML = `
        ${getButtonProfilePic(user)}
        <span>${user.username || "Profile"}</span>
        <i class="fas fa-chevron-down" style="font-size: 12px; margin-left: 4px; opacity: 0.7;"></i>
      `;

      // Remove any previous onclick handlers
      loginBtn.onclick = null;

      console.log("✅ UI updated for logged-in user:", user.username);
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  } else {
    // User not logged in - remove upload button if exists
    const uploadBtn = document.getElementById("uploadContentBtn");
    if (uploadBtn) {
      uploadBtn.remove();
    }

    // Reset login button
    loginBtn.innerHTML = `
      <i class="fas fa-sign-in-alt"></i>
      <span>Login</span>
    `;
  }
}
// Add this code to your header.js file after the existing profileUpdated event listener

// ✅ ENHANCED: Listen for profile updates (name, picture, etc.)
window.addEventListener("profileUpdated", function (event) {
  console.log("📢 Profile updated event received in header:", event.detail);

  if (!event.detail) return;

  const { profile_pic, username, full_name } = event.detail;

  // Update userData in storage
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");

  if (userData) {
    try {
      const user = JSON.parse(userData);

      // Update only the fields that are provided
      if (profile_pic !== undefined) user.profile_pic = profile_pic;
      if (username !== undefined) user.username = username;
      if (full_name !== undefined) user.full_name = full_name;

      // Update in storage
      if (localStorage.getItem("userData")) {
        localStorage.setItem("userData", JSON.stringify(user));
      }
      if (sessionStorage.getItem("userData")) {
        sessionStorage.setItem("userData", JSON.stringify(user));
      }

      console.log("✅ User data updated in storage");
    } catch (e) {
      console.error("Error updating user data:", e);
    }
  }

  // Update header display
  const loginBtn = document.getElementById("loginBtn");
  if (!loginBtn) return;

  try {
    const session =
      localStorage.getItem("userData") || sessionStorage.getItem("userData");
    if (!session) return;

    const user = JSON.parse(session);

    // Helper function to get profile pic HTML
    function getButtonProfilePic(user) {
      const profilePic = user.profile_pic;

      if (profilePic) {
        if (
          profilePic.startsWith("http://") ||
          profilePic.startsWith("https://")
        ) {
          return `<img src="${profilePic}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" alt="" onerror="this.style.display='none'">`;
        } else if (profilePic.startsWith("uploads/profile/")) {
          const filename = profilePic.split("/").pop();
          return `<img src="${_H_API}/get-profile-pic/${filename}?t=${Date.now()}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" alt="" onerror="this.style.display='none'">`;
        }
      }

      return '<i class="fas fa-user-circle" style="font-size: 18px;"></i>';
    }

    // ✅ FIXED: Use username (not full_name) for header button display
    const displayName = user.username || "Profile";

    loginBtn.innerHTML = `
      ${getButtonProfilePic(user)}
      <span>${displayName}</span>
      <i class="fas fa-chevron-down" style="font-size: 12px; margin-left: 4px; opacity: 0.7;"></i>
    `;

    console.log("✅ Header profile display updated!");

    // Close any open dropdown menu so it refreshes with new data
    const existingMenu = document.querySelector(".profile-dropdown-menu");
    if (existingMenu) {
      existingMenu.remove();
    }
  } catch (e) {
    console.error("Error updating header profile display:", e);
  }
});
// ✅ Function to update header profile image immediately
function updateHeaderProfileImage(profilePic) {
  const loginBtn = document.getElementById("loginBtn");
  if (!loginBtn) return;

  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");
  if (!userData) return;

  try {
    const user = JSON.parse(userData);
    user.profile_pic = profilePic;

    // Helper function to get profile pic HTML
    function getButtonProfilePic(user) {
      const profilePic = user.profile_pic;

      if (profilePic) {
        // Google URL
        if (
          profilePic.startsWith("http://") ||
          profilePic.startsWith("https://")
        ) {
          return `<img src="${profilePic}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" alt="" onerror="this.style.display='none'">`;
        }
        // Local uploaded image
        else if (profilePic.startsWith("uploads/profile/")) {
          const filename = profilePic.split("/").pop();
          return `<img src="${_H_API}/get-profile-pic/${filename}?t=${Date.now()}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" alt="" onerror="this.style.display='none'">`;
        }
      }

      // Fallback to icon
      return '<i class="fas fa-user-circle" style="font-size: 18px;"></i>';
    }

    // Update login button with new profile picture
    loginBtn.innerHTML = `
      ${getButtonProfilePic(user)}
      <span>${user.username || "Profile"}</span>
      <i class="fas fa-chevron-down" style="font-size: 12px; margin-left: 4px; opacity: 0.7;"></i>
    `;

    console.log("✅ Header profile picture updated immediately!");

    // Also update dropdown menu if it's open
    const existingMenu = document.querySelector(".profile-dropdown-menu");
    if (existingMenu) {
      existingMenu.remove();
    }
  } catch (e) {
    console.error("Error updating header profile image:", e);
  }
}

// Show profile menu dropdown
// Show profile menu dropdown
function showProfileMenu() {
  // Remove existing menu if any
  const existingMenu = document.querySelector(".profile-dropdown-menu");
  if (existingMenu) {
    existingMenu.style.animation = "slideUp 0.2s ease";
    setTimeout(() => existingMenu.remove(), 200);
    return; // Toggle behavior
  }

  // Get user data
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");
  let user = null;

  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }

  const menu = document.createElement("div");
  menu.className = "profile-dropdown-menu";
  menu.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 10000;
    min-width: 220px;
    overflow: hidden;
    animation: slideDown 0.2s ease;
    border: 1px solid var(--border-color, #e0e0e0);
  `;

  // Function to get profile picture URL or initials
  function getProfileDisplay(user) {
    const profilePic = user.profile_pic;

    if (profilePic) {
      if (
        profilePic.startsWith("http://") ||
        profilePic.startsWith("https://")
      ) {
        return `<img src="${profilePic}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #e336cc;" alt="Profile">`;
      } else if (profilePic.startsWith("uploads/profile/")) {
        const filename = profilePic.split("/").pop();
        return `<img src="${_H_API}/get-profile-pic/${filename}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #e336cc;" alt="Profile" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="width: 45px; height: 45px; border-radius: 50%; background: #e336cc; display: none; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">
                  ${user.username ? user.username.charAt(0).toUpperCase() : "U"}
                </div>`;
      }
    }

    return `<div style="width: 45px; height: 45px; border-radius: 50%; background: #e336cc; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">
              ${user.username ? user.username.charAt(0).toUpperCase() : "U"}
            </div>`;
  }

  // ✅ FIXED: Display full_name (if available) and username separately
  menu.innerHTML = `
    ${
      user
        ? `
      <div style="padding: 15px; border-bottom: 1px solid var(--border-color, #e0e0e0); background: linear-gradient(135deg, #e336cc15 0%, #9b4dca15 100%);">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${getProfileDisplay(user)}
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--text-primary, #333); font-size: 15px;">
              ${user.full_name || user.username || "User"}
            </div>
            <div style="font-size: 12px; color: var(--text-secondary, #666);">
              @${user.username || "username"}
            </div>
          </div>
        </div>
      </div>
    `
        : ""
    }
    
    <div class="menu-item" onclick="window.location.href= _H_BASE + 'profile.html'" style="padding: 14px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s; color: var(--text-primary, #333); font-size: 14px;">
      <i class="fas fa-user" style="width: 20px; color: #e336cc; font-size: 15px;"></i>
      <span>My Profile</span>
    </div>
    
    <div class="menu-item" onclick="logout()" style="padding: 14px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s; color: #e74c3c; border-top: 1px solid var(--border-color, #e0e0e0); font-size: 14px;">
      <i class="fas fa-sign-out-alt" style="width: 20px; font-size: 15px;"></i>
      <span>Logout</span>
    </div>
  `;

  document.body.appendChild(menu);

  // Add hover effects
  const menuItems = menu.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("mouseenter", function () {
      this.style.background = "var(--hover-bg, #f5f5f5)";
    });
    item.addEventListener("mouseleave", function () {
      this.style.background = "transparent";
    });
  });

  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener("click", function closeMenu(e) {
      const loginBtn = document.getElementById("loginBtn");
      if (!menu.contains(e.target) && !loginBtn.contains(e.target)) {
        menu.style.animation = "slideUp 0.2s ease";
        setTimeout(() => {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }, 200);
      }
    });
  }, 100);
}
// Logout function
// Logout function with custom modal
function logout() {
  showLogoutModal();
}

// Custom Logout Confirmation Modal
function showLogoutModal() {
  // Remove any existing logout modals
  const existingModal = document.querySelector(".logout-modal-overlay");
  if (existingModal) {
    existingModal.remove();
  }

  // Get current theme
  const currentTheme = html.getAttribute("data-theme") || "light";

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "logout-modal-overlay";

  // Create modal container
  const modal = document.createElement("div");
  modal.className = `logout-modal ${currentTheme}-theme`;

  // Build modal HTML
  modal.innerHTML = `
    <div class="logout-modal-icon">
      <i class="fas fa-sign-out-alt"></i>
    </div>
    <h3 class="logout-modal-title">Confirm Logout</h3>
    <p class="logout-modal-message">Are you sure you want to logout?</p>
    <div class="logout-modal-buttons">
      <button class="logout-cancel-btn" onclick="closeLogoutModal()">
        <i class="fas fa-times"></i> Cancel
      </button>
      <button class="logout-confirm-btn" onclick="confirmLogout()">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Trigger animation
  setTimeout(() => {
    overlay.classList.add("active");
  }, 10);
}

function closeLogoutModal() {
  const overlay = document.querySelector(".logout-modal-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

function confirmLogout() {
  closeLogoutModal();

  // Clear all session data
  document.body.classList.remove("logged-in");
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("sessionData");
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("userData");
  sessionStorage.removeItem("sessionData");
  sessionStorage.removeItem("loginSuccessShown");

  console.log("✅ User logged out");

  // ✅ ENHANCED: Dispatch event FIRST
  window.dispatchEvent(new Event("userLoggedOut"));
  console.log("📢 userLoggedOut event dispatched");

  // Show logout notification
  showSuccessNotification("Logged out successfully!");

  // Update sidebar
  if (typeof window.updateSidebar === "function") {
    window.updateSidebar();
  }

  // Update UI instead of reloading
  setTimeout(() => {
    updateUIForLoggedInUser();

    // If on profile page, redirect to home
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "profile.html" || currentPage === "upload.html") {
      window.location.href = "home.html";
    }
  }, 1000);
}

console.log("✅ Enhanced header event dispatching loaded");

// Close logout modal on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("logout-modal-overlay")) {
    closeLogoutModal();
  }
});

// Function to show success notification on home page
function showSuccessNotification(message) {
  // Remove any existing notifications first
  const existingNotification = document.querySelector(
    ".login-success-notification"
  );
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  notification.className = "login-success-notification";
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #d4edda;
    color: #155724;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    border-left: 4px solid #28a745;
  `;
  notification.innerHTML = `
    <i class="fas fa-check-circle" style="font-size: 20px;"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// IMPORTANT: Listen for messages from iframes to switch between login/signup
// IMPORTANT: Listen for messages from iframes to switch between login/signup
// IMPORTANT: Listen for messages from iframes to switch between login/signup
window.addEventListener("message", function (event) {
  console.log("📨 Header received message from iframe:", event.data);

  const { action, userId, message, type } = event.data;

  // Handle different message actions
  switch (action) {
    case "navigateToProfile":
      console.log("🔗 Navigating to profile:", userId);

      if (!userId) {
        console.error("❌ No userId provided for navigation");
        return;
      }

      // Get current user session
      const session = getActiveSession();

      // Navigate to profile
      if (session && session.user.id === parseInt(userId)) {
        // Own profile
        window.location.href = _H_BASE + "profile.html";
      } else {
        // Other user's profile
        window.location.href = _H_BASE + `profile.html?id=${userId}`;
      }
      break;

    case "closeModal":
      console.log("✅ Closing modal");
      // Close any open modals
      closeLoginModal();
      closeSignupModal();
      // Add other modal close functions as needed
      break;

    case "switchToSignup":
      console.log("✅ Switching from login to signup");
      closeLoginModal();
      setTimeout(() => openSignupModal(), 100);
      break;

    case "switchToLogin":
      console.log("✅ Switching from signup to login");
      closeSignupModal();
      setTimeout(() => openLoginModal(), 100);
      break;

    case "closeSignupModal":
      console.log("✅ Closing signup modal");
      closeSignupModal();
      break;

    case "openLoginModal":
      console.log("✅ Opening login modal");
      setTimeout(() => openLoginModal(), 100);
      break;

    case "closeSignupAndOpenLogin":
      console.log("✅ Registration success - closing signup and opening login");
      closeSignupModal();
      setTimeout(() => {
        openLoginModal();
        showSuccessNotification(
          message || "Registration successful! Please login."
        );
      }, 400);
      break;

    case "loginSuccess":
      console.log("✅ Login success message received!");

      // Close login modal
      closeLoginModal();

      // Dispatch event
      window.dispatchEvent(new Event("userLoggedIn"));
      console.log("📢 userLoggedIn event dispatched");

      // Update UI for logged-in user
      setTimeout(() => {
        updateUIForLoggedInUser();

        // Update sidebar
        if (typeof window.updateSidebar === "function") {
          window.updateSidebar();
        }

        // Show notification ONLY ONCE
        if (!sessionStorage.getItem("loginSuccessShown")) {
          sessionStorage.setItem("loginSuccessShown", "true");
          setTimeout(() => {
            showSuccessNotification("Login successful!");
          }, 100);
        }
      }, 500);
      break;

    default:
      // Ignore messages without recognized actions
      break;
  }
});
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

console.log("✅ Enhanced message handling loaded");
// Add animation styles
const notificationStyle = document.createElement("style");
notificationStyle.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  
  /* ===== LOGOUT MODAL STYLES ===== */
  .logout-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .logout-modal-overlay.active {
    opacity: 1;
  }
  
  .logout-modal {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    transform: scale(0.9);
    transition: transform 0.3s ease;
    text-align: center;
  }
  
  .logout-modal-overlay.active .logout-modal {
    transform: scale(1);
  }
  
  /* Dark theme */
  .logout-modal.dark-theme {
    background: #1f2937;
    color: #f9fafb;
    border: 1px solid #374151;
  }
  
  /* Light theme */
  .logout-modal.light-theme {
    background: white;
    color: #1e293b;
  }
  
  .logout-modal-icon {
    width: 70px;
    height: 70px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: white;
  }
  
  .logout-modal.dark-theme .logout-modal-icon {
    background: linear-gradient(135deg, #ef4444, #dc2626);
  }
  
  .logout-modal-title {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 12px;
    color: inherit;
  }
  
  .logout-modal-message {
    font-size: 15px;
    color: #6b7280;
    margin-bottom: 28px;
    line-height: 1.5;
  }
  
  .logout-modal.dark-theme .logout-modal-message {
    color: #9ca3af;
  }
  
  .logout-modal-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
  
  .logout-cancel-btn,
  .logout-confirm-btn {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .logout-cancel-btn {
    background: #f3f4f6;
    color: #374151;
  }
  
  .logout-cancel-btn:hover {
    background: #e5e7eb;
    transform: translateY(-2px);
  }
  
  .logout-modal.dark-theme .logout-cancel-btn {
    background: #374151;
    color: #f9fafb;
  }
  
  .logout-modal.dark-theme .logout-cancel-btn:hover {
    background: #4b5563;
  }
  
  .logout-confirm-btn {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
  }
  
  .logout-confirm-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }
  
  .logout-cancel-btn:active,
  .logout-confirm-btn:active {
    transform: translateY(0);
  }
  
  /* Upload button styling */
  .upload-btn {
    background: #e901c2;
    transition: all 0.3s ease !important;
    width:110px;
    height:40px;
  }
  .upload-btn:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 5px 15px rgba(227, 54, 204, 0.4) !important;
  }
`;
document.head.appendChild(notificationStyle);

// Check if user is logged in on page load and update UI
document.addEventListener("DOMContentLoaded", function () {
  updateUIForLoggedInUser();
});

// Make functions globally accessible for sidebar
window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;
window.logout = logout;
// EXPOSE MESSAGE HANDLER TO PARENT PAGE
window.parent.addEventListener("message", function (event) {
  if (!event.data || !event.data.action) return;

  console.log("📩 HEADER RECEIVED:", event.data.action);

  if (event.data.action === "closeSignupAndOpenLogin") {
    closeSignupModal();

    setTimeout(() => {
      openLoginModal();
      showSuccessNotification(
        event.data.message || "Registration successful! Please login."
      );
    }, 300);
  }
});
// ===== ADD THIS TO THE END OF header.js =====

// ===== ADD TO header.js =====
// Replace existing search functionality with this enhanced version

// ===== SEARCH FUNCTIONALITY WITH TABS =====
const searchInput = document.querySelector(".search-input");
const searchIcon = document.querySelector(".search-icon");
if (typeof window.searchTimeout === "undefined") {
  window.searchTimeout = null;
}

let searchResultsContainer;
let currentSearchTab = "users"; // Default tab

// Create search results container with tabs
function createSearchResultsContainer() {
  if (searchResultsContainer) return;

  searchResultsContainer = document.createElement("div");
  searchResultsContainer.className = "search-results-dropdown";
  searchResultsContainer.style.cssText = `
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    max-height: 500px;
    overflow: hidden;
    z-index: 1000;
    display: none;
    border: 1px solid var(--border-purple, #f889e5);
  `;

  document.querySelector(".search-box").style.position = "relative";
  document.querySelector(".search-box").appendChild(searchResultsContainer);
}

// Initialize search
if (searchInput) {
  createSearchResultsContainer();

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();

    clearTimeout(window.searchTimeout);

    if (query.length < 2) {
      hideSearchResults();
      return;
    }

    window.searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  });

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length >= 2) {
      performSearch(searchInput.value.trim());
    }
  });

  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) {
      hideSearchResults();
    }
  });
}

// Perform search on current tab
async function performSearch(query) {
  if (!query || query.trim().length < 2) {
    hideSearchResults();
    return;
  }

  displaySearchLoading();

  if (currentSearchTab === "users") {
    await searchUsers(query);
  } else if (currentSearchTab === "posts") {
    await searchPosts(query);
  }
}

// Search users (existing function - enhanced)
async function searchUsers(query) {
  try {
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const headers = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${_H_API}/users/search-all?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers,
      }
    );

    const data = await response.json();

    if (data.success && data.users) {
      displaySearchResultsWithTabs(data.users, [], query);
    } else {
      displayNoResults(query);
    }
  } catch (error) {
    console.error("Search error:", error);
    displaySearchError();
  }
}

// ✅ NEW: Search posts
async function searchPosts(query) {
  try {
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const headers = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${_H_API}/posts/search?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers,
      }
    );

    const data = await response.json();

    if (data.success && data.posts) {
      displaySearchResultsWithTabs([], data.posts, query);
    } else {
      displayNoResults(query);
    }
  } catch (error) {
    console.error("Post search error:", error);
    displaySearchError();
  }
}

// Display loading state
function displaySearchLoading() {
  if (!searchResultsContainer) createSearchResultsContainer();

  searchResultsContainer.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--primary-purple, #e336cc);"></i>
      <p style="margin-top: 10px; color: var(--text-secondary, #6c757d); font-size: 14px;">Searching...</p>
    </div>
  `;

  searchResultsContainer.style.display = "block";
}

// ✅ NEW: Display search results with tabs
function displaySearchResultsWithTabs(users, posts, query) {
  if (!searchResultsContainer) createSearchResultsContainer();

  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";

  const hasUsers = users && users.length > 0;
  const hasPosts = posts && posts.length > 0;

  if (!hasUsers && !hasPosts) {
    displayNoResults(query);
    return;
  }

  searchResultsContainer.innerHTML = `
    <div class="search-tabs">
      <button class="search-tab ${
        currentSearchTab === "users" ? "active" : ""
      }" data-tab="users" onclick="switchSearchTab('users', '${query}')">
        <i class="fas fa-users"></i>
        <span>Users</span>
        ${hasUsers ? `<span class="tab-count">${users.length}</span>` : ""}
      </button>
      <button class="search-tab ${
        currentSearchTab === "posts" ? "active" : ""
      }" data-tab="posts" onclick="switchSearchTab('posts', '${query}')">
        <i class="fas fa-images"></i>
        <span>Posts</span>
        ${hasPosts ? `<span class="tab-count">${posts.length}</span>` : ""}
      </button>
    </div>
    
    <div class="search-results-content">
      ${
        currentSearchTab === "users"
          ? renderUserResults(users, query)
          : renderPostResults(posts, query)
      }
    </div>
  `;

  searchResultsContainer.style.display = "block";
}

// Render user results
function renderUserResults(users, query) {
  if (!users || users.length === 0) {
    return `
      <div style="padding: 32px 16px; text-align: center;">
        <i class="fas fa-user-slash" style="font-size: 48px; color: var(--text-secondary, #6c757d); opacity: 0.3; margin-bottom: 12px;"></i>
        <h3 style="font-size: 16px; color: var(--text-primary, #1a1a1a); margin-bottom: 8px;">No users found</h3>
        <p style="font-size: 14px; color: var(--text-secondary, #6c757d);">
          No users found for "${query}"
        </p>
      </div>
    `;
  }

  return `
    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-purple, #f889e5); background: linear-gradient(135deg, #e336cc15 0%, #9b4dca15 100%);">
      <div style="font-size: 13px; color: var(--text-secondary, #6c757d); font-weight: 600;">
        Found ${users.length} user${users.length > 1 ? "s" : ""}
      </div>
    </div>
    ${users
      .map(
        (user) => `
      <div class="search-result-item" onclick="navigateToProfile(${user.id})"
           style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s; border-bottom: 1px solid #f0f0f0;">
        <div style="position: relative;">
          ${getProfilePicHTML(user)}
          ${
            user.is_private
              ? '<i class="fas fa-lock" style="position: absolute; bottom: 0; right: 0; background: white; border-radius: 50%; padding: 3px; font-size: 10px; color: #666;"></i>'
              : ""
          }
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: var(--text-primary, #1a1a1a); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(user.full_name || user.username || "Unknown User")}
          </div>
          <div style="font-size: 13px; color: var(--text-secondary, #6c757d); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            @${escapeHtml(user.username || "unknown")}
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary, #6c757d); display: flex; align-items: center; gap: 4px;">
          <i class="fas fa-users"></i>
          <span>${user.followers_count || 0}</span>
        </div>
      </div>
    `
      )
      .join("")}
  `;
}

// ✅ NEW: Render post results
function renderPostResults(posts, query) {
  if (!posts || posts.length === 0) {
    return `
      <div style="padding: 32px 16px; text-align: center;">
        <i class="fas fa-image" style="font-size: 48px; color: var(--text-secondary, #6c757d); opacity: 0.3; margin-bottom: 12px;"></i>
        <h3 style="font-size: 16px; color: var(--text-primary, #1a1a1a); margin-bottom: 8px;">No posts found</h3>
        <p style="font-size: 14px; color: var(--text-secondary, #6c757d);">
          No posts found for "${query}"
        </p>
      </div>
    `;
  }

  return `
    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-purple, #f889e5); background: linear-gradient(135deg, #e336cc15 0%, #9b4dca15 100%);">
      <div style="font-size: 13px; color: var(--text-secondary, #6c757d); font-weight: 600;">
        Found ${posts.length} post${posts.length > 1 ? "s" : ""}
      </div>
    </div>
    ${posts
      .map(
        (post) => `
      <div class="search-result-item post-result" onclick="openPostDetailFromSearch(${
        post.post_id
      })"
           style="padding: 12px 16px; cursor: pointer; display: flex; gap: 12px; transition: background 0.2s; border-bottom: 1px solid #f0f0f0;">
        <div style="width: 60px; height: 60px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: var(--light-purple, #f5f3ff);">
          ${getPostThumbnailHTML(post)}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-weight: 600; font-size: 13px; color: var(--text-primary, #1a1a1a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(post.product_title || post.title || "Post")}
            </span>
            ${getPostTypeBadge(post.post_type)}
          </div>
          <div style="font-size: 12px; color: var(--text-secondary, #6c757d); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${escapeHtml(post.caption || "").substring(0, 80)}${
          (post.caption || "").length > 80 ? "..." : ""
        }
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 11px; color: var(--text-secondary, #6c757d);">
            <span><i class="fas fa-user"></i> ${escapeHtml(
              post.username
            )}</span>
            ${
              post.category_name
                ? `<span><i class="fas fa-folder"></i> ${escapeHtml(
                    post.category_name
                  )}</span>`
                : ""
            }
            <span><i class="fas fa-heart"></i> ${post.likes_count || 0}</span>
          </div>
        </div>
      </div>
    `
      )
      .join("")}
  `;
}

// Helper: Get profile pic HTML
function getProfilePicHTML(user) {
  if (user.profile_pic) {
    const picUrl = getProfilePicUrl(user.profile_pic);
    return `
      <img src="${picUrl}" 
           style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #e336cc;"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
      <div style="width: 45px; height: 45px; border-radius: 50%; background: #e336cc; display: none; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
        ${user.username ? user.username.charAt(0).toUpperCase() : "U"}
      </div>
    `;
  }
  return `
    <div style="width: 45px; height: 45px; border-radius: 50%; background: #e336cc; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
      ${user.username ? user.username.charAt(0).toUpperCase() : "U"}
    </div>
  `;
}

// Helper: Get post thumbnail HTML
function getPostThumbnailHTML(post) {
  const mediaUrl = getPostMediaUrl(post.media_url);

  if (post.media_type === "video") {
    return `
      <video style="width: 100%; height: 100%; object-fit: cover;">
        <source src="${mediaUrl}" type="video/mp4">
      </video>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 20px;">
        <i class="fas fa-play-circle"></i>
      </div>
    `;
  } else {
    return `
      <img src="${mediaUrl}" 
           style="width: 100%; height: 100%; object-fit: cover;"
           onerror="this.src='images/placeholder.png'">
    `;
  }
}

// Helper: Get post type badge
function getPostTypeBadge(postType) {
  const badges = {
    showcase:
      '<span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">SHOWCASE</span>',
    service:
      '<span style="background: linear-gradient(135deg, #f093fb, #f5576c); color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">SERVICE</span>',
    product:
      '<span style="background: linear-gradient(135deg, #4ade80, #22c55e); color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">PRODUCT</span>',
  };
  return badges[postType] || "";
}

// Helper: Get profile pic URL
function getProfilePicUrl(profilePic) {
  if (!profilePic) return "images/default-avatar.png";

  if (profilePic.startsWith("http://") || profilePic.startsWith("https://")) {
    return profilePic;
  }

  if (profilePic.startsWith("uploads/profile/")) {
    const filename = profilePic.split("/").pop();
    return `${_H_API}/get-profile-pic/${filename}`;
  }

  return profilePic;
}

// Helper: Get post media URL
function getPostMediaUrl(mediaUrl) {
  if (!mediaUrl) return "images/placeholder.png";

  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    return mediaUrl;
  }

  const filename = mediaUrl.replace(/^uploads\/posts\//, "");
  return `${_H_API}/uploads/${filename}`;
}

// Helper: Escape HTML
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Switch between tabs
function switchSearchTab(tab, query) {
  currentSearchTab = tab;

  // Update active tab styling
  document.querySelectorAll(".search-tab").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tab === tab) {
      btn.classList.add("active");
    }
  });

  // Perform search again for the new tab
  performSearch(query);
}

// Open post detail from search
function openPostDetailFromSearch(postId) {
  hideSearchResults();
  searchInput.value = "";

  // Use the existing openPostDetail function from home-content.js
  if (typeof openPostDetail === "function") {
    openPostDetail(postId);
  } else {
    window.location.href = `post-detail.html?id=${postId}`;
  }
}

// Navigate to profile (existing function)
function navigateToProfile(userId) {
  hideSearchResults();
  searchInput.value = "";

  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");

  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.id === parseInt(userId)) {
        window.location.href = _H_BASE + "profile.html";
        return;
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }

  window.location.href = _H_BASE + `profile.html?id=${userId}`;
}

// Display no results message
function displayNoResults(query) {
  if (!searchResultsContainer) createSearchResultsContainer();

  searchResultsContainer.innerHTML = `
    <div class="search-tabs">
      <button class="search-tab ${
        currentSearchTab === "users" ? "active" : ""
      }" data-tab="users" onclick="switchSearchTab('users', '${query}')">
        <i class="fas fa-users"></i>
        <span>Users</span>
      </button>
      <button class="search-tab ${
        currentSearchTab === "posts" ? "active" : ""
      }" data-tab="posts" onclick="switchSearchTab('posts', '${query}')">
        <i class="fas fa-images"></i>
        <span>Posts</span>
      </button>
    </div>
    <div style="padding: 32px 16px; text-align: center;">
      <i class="fas fa-search" style="font-size: 48px; color: var(--text-secondary, #6c757d); opacity: 0.3; margin-bottom: 12px;"></i>
      <h3 style="font-size: 16px; color: var(--text-primary, #1a1a1a); margin-bottom: 8px;">No results found</h3>
      <p style="font-size: 14px; color: var(--text-secondary, #6c757d);">
        No ${currentSearchTab} found for "${query}"
      </p>
    </div>
  `;

  searchResultsContainer.style.display = "block";
}

// Display error message
function displaySearchError() {
  if (!searchResultsContainer) createSearchResultsContainer();

  searchResultsContainer.innerHTML = `
    <div style="padding: 32px 16px; text-align: center;">
      <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; opacity: 0.8; margin-bottom: 12px;"></i>
      <h3 style="font-size: 16px; color: var(--text-primary, #1a1a1a); margin-bottom: 8px;">Search failed</h3>
      <p style="font-size: 14px; color: var(--text-secondary, #6c757d);">
        Unable to search. Please try again.
      </p>
    </div>
  `;

  searchResultsContainer.style.display = "block";
}

// Hide search results
function hideSearchResults() {
  if (searchResultsContainer) {
    searchResultsContainer.style.display = "none";
  }
}
// ─────────────────────────────────────────────────────────
// mobile-nav-dropdown.js  — paste entire contents at END of header.js
//
// Uses MutationObserver so it works even when header.html is
// injected dynamically via fetch() into #header div.
// ─────────────────────────────────────────────────────────
(function initMobileNav() {
  var attached = false;

  function setup() {
    if (attached) return;

    var trigger = document.getElementById("mobileMenuTrigger");
    var dropdown = document.getElementById("mobileNavDropdown");
    var wrapper = document.getElementById("mobileMenuWrapper");
    if (!trigger || !dropdown || !wrapper) return;

    attached = true; // mark done so we don't double-attach

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = dropdown.classList.contains("open");
      dropdown.classList.toggle("open", !isOpen);
      trigger.classList.toggle("open", !isOpen);
    });

    // Close when clicking anywhere outside the wrapper
    document.addEventListener("click", function (e) {
      if (!wrapper.contains(e.target)) {
        dropdown.classList.remove("open");
        trigger.classList.remove("open");
      }
    });

    // Highlight the active page link
    var page = window.location.pathname.split("/").pop() || "home.html";
    wrapper.querySelectorAll(".mobile-nav-link").forEach(function (a) {
      if ((a.getAttribute("href") || "").split("/").pop() === page) {
        a.classList.add("active");
      }
    });

    console.log("✅ Mobile nav dropdown initialised");
  }

  // Try immediately (works if header.html is already in DOM)
  setup();

  // Also try on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", setup);

  // Watch for the #header div to receive content (dynamic fetch injection)
  var headerDiv = document.getElementById("header");
  if (headerDiv) {
    var observer = new MutationObserver(function () {
      setup();
      if (attached) observer.disconnect(); // stop watching once done
    });
    observer.observe(headerDiv, { childList: true, subtree: true });
  } else {
    // If #header doesn't exist yet, watch <body> for it
    var bodyObserver = new MutationObserver(function () {
      var hd = document.getElementById("header");
      if (hd) {
        bodyObserver.disconnect();
        var obs2 = new MutationObserver(function () {
          setup();
          if (attached) obs2.disconnect();
        });
        obs2.observe(hd, { childList: true, subtree: true });
        setup(); // try immediately too
      }
    });
    bodyObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: false,
    });
  }
})();
// Make functions globally accessible
window.switchSearchTab = switchSearchTab;
window.openPostDetailFromSearch = openPostDetailFromSearch;
window.navigateToProfile = navigateToProfile;

console.log("✅ Enhanced search with tabs loaded");
window.dispatchEvent(new Event("header:ready"));
window.dispatchEvent(new Event("sidebar:ready"));
