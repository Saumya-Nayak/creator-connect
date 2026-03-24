// Sidebar.js - Dynamic menu based on login status with active state detection
const BASE_PATH =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "/frontend/"
    : "/";
// Menu items configuration
const menuItems = {
  beforeLogin: [
    { icon: "fas fa-home", text: "Home", page: "home", active: true },
    { icon: "fas fa-rocket", text: "Discover", page: "discover" },
    {
      icon: "fas fa-file-alt",
      text: "Terms and Conditions",
      page: "terms_and_conditions",
    },
    {
      icon: "fas fa-lock",
      text: "Privacy Policy",
      page: "privacy_policy",
    },
    { icon: "fas fa-info-circle", text: "About Us", page: "about" },

    { icon: "fas fa-sign-in-alt", text: "Login", action: "login" },
    { icon: "fas fa-user-plus", text: "Sign Up", action: "signup" },
  ],
  afterLogin: [
    { icon: "fas fa-home", text: "Home", page: "home" },

    { icon: "fas fa-comments", text: "Messages", page: "messages" },
    {
      icon: "fas fa-shopping-cart",
      text: "My Deals",
      page: "mydeals",
    },
    { icon: "fas fa-bookmark", text: "Saved", page: "saved" },
    { icon: "fas fa-cog", text: "Settings", page: "settings" },
    { icon: "fas fa-question-circle", text: "Help", page: "help" },
    {
      icon: "fas fa-file-alt",
      text: "Terms and Conditions",
      page: "terms_and_conditions",
    },

    { icon: "fas fa-info-circle", text: "About Us", page: "about" },
    { icon: "fas fa-sign-out-alt", text: "Logout", action: "logout" },
  ],
};
// Check if user is logged in (using auth-guard method)
function isUserLoggedIn() {
  // Check for authToken (used by auth-guard.js)
  const authToken =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const sessionData =
    localStorage.getItem("sessionData") ||
    sessionStorage.getItem("sessionData");

  if (!authToken || !sessionData) {
    return false;
  }

  // Verify session hasn't expired
  try {
    const parsed = JSON.parse(sessionData);
    const now = new Date().getTime();

    if (parsed.expiration && now > parsed.expiration) {
      return false;
    }

    return true;
  } catch (e) {
    console.error("Error checking login status:", e);
    return false;
  }
}

// ✅ NEW: Get current page name from URL
function getCurrentPage() {
  const path = window.location.pathname;
  // Get the filename without extension, e.g. "my-deals" from "my-deals.html"
  const filename = path.split("/").pop().replace(".html", "");

  if (!filename || filename === "" || filename === "frontend") {
    return "home";
  }

  // ✅ Normalize hyphenated filenames to match menu item page keys
  const pageAliases = {
    "my-deals": "mydeals",
    "terms-and-conditions": "terms_and_conditions",
    terms_and_conditions: "terms_and_conditions",
    "privacy-policy": "privacy_policy",
    privacy: "privacy_policy",
  };

  return pageAliases[filename] || filename;
}

// Render menu items
function renderMenuItems() {
  const menuContainer = document.getElementById("sideMenuItems");
  if (!menuContainer) return;

  const loggedIn = isUserLoggedIn();
  const items = loggedIn ? menuItems.afterLogin : menuItems.beforeLogin;
  const currentPage = getCurrentPage(); // ✅ Get current page

  console.log("📍 Current page:", currentPage); // Debug log

  menuContainer.innerHTML = "";

  items.forEach((item) => {
    const menuItem = document.createElement("a");
    menuItem.href = "#";
    menuItem.className = "side-menu-item";

    // ✅ Set active based on current page, not default
    if (item.page && item.page === currentPage) {
      menuItem.classList.add("active");
      console.log("✅ Active menu item:", item.text); // Debug log
    }

    if (item.page) {
      menuItem.setAttribute("data-page", item.page);
    }

    if (item.action) {
      menuItem.setAttribute("data-action", item.action);
    }

    menuItem.innerHTML = `
        <i class="${item.icon}"></i>
        <span>${item.text}</span>
      `;

    menuContainer.appendChild(menuItem);
  });

  attachMenuItemListeners();
}

// Attach event listeners to menu items
function attachMenuItemListeners() {
  document.querySelectorAll(".side-menu-item").forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Handle actions (login, signup, logout)
      const action = this.getAttribute("data-action");
      if (action) {
        handleMenuAction(action);
        return;
      }

      // Handle page navigation
      const page = this.getAttribute("data-page");
      if (page) {
        // Remove active class from all items
        document
          .querySelectorAll(".side-menu-item")
          .forEach((i) => i.classList.remove("active"));

        // Add active class to clicked item
        this.classList.add("active");

        // Navigate to page
        navigateToPage(page);
      }
    });
  });
}

// Handle menu actions (login, signup, logout)
function handleMenuAction(action) {
  switch (action) {
    case "login":
      // Call the openLoginModal function from header.js
      if (typeof openLoginModal === "function") {
        openLoginModal();
      } else {
        console.error("openLoginModal function not found");
      }
      break;

    case "signup":
      // Call the openSignupModal function from header.js
      if (typeof openSignupModal === "function") {
        openSignupModal();
      } else {
        console.error("openSignupModal function not found");
      }
      break;

    case "logout":
      // Call the logout function from header.js
      if (typeof logout === "function") {
        logout();
      } else {
        console.error("logout function not found");
      }
      break;

    default:
      console.log("Unknown action:", action);
  }
}

// Navigate to different pages
function navigateToPage(page) {
  switch (page) {
    case "home":
      window.location.href = BASE_PATH + "home.html";
      break;
    case "about":
      window.location.href = BASE_PATH + "about.html";
      break;
    case "explore":
    case "discover":
      window.location.href = BASE_PATH + "explore.html";
      break;
    case "messages":
      window.location.href = BASE_PATH + "messages.html";
      break;
    case "saved":
      window.location.href = BASE_PATH + "saved.html";
      break;
    case "mydeals":
      window.location.href = BASE_PATH + "my-deals.html";
      break;
    case "privacy_policy":
      window.location.href = BASE_PATH + "privacy.html";
      break;
    case "terms_and_conditions":
      window.location.href = BASE_PATH + "terms_and_conditions.html";
      break;
    case "settings":
      window.location.href = BASE_PATH + "settings.html";
      break;
    case "help":
      window.location.href = BASE_PATH + "help.html";
      break;
    default:
      console.log("Unknown page:", page);
  }
}

// Initialize sidebar on load
document.addEventListener("DOMContentLoaded", () => {
  renderMenuItems();

  // Listen for login/logout events to update menu
  window.addEventListener("storage", (e) => {
    if (e.key === "authToken" || e.key === "sessionData") {
      console.log("🔄 Auth status changed - updating sidebar");
      renderMenuItems();
    }
  });
});

// Listen for custom login/logout events
window.addEventListener("userLoggedIn", () => {
  console.log("✅ User logged in - updating sidebar");
  renderMenuItems();
});

window.addEventListener("userLoggedOut", () => {
  console.log("🚪 User logged out - updating sidebar");
  renderMenuItems();
});

// Export function for manual refresh
window.updateSidebar = renderMenuItems;
