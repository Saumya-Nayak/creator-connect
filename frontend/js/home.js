document.addEventListener("DOMContentLoaded", () => {
  console.log("🏠 Home.js: DOM Content Loaded");

  // Hide preloader when page loads
  window.addEventListener("load", () => {
    const preloader = document.getElementById("preloader");
    if (preloader) {
      preloader.style.opacity = "0";
      setTimeout(() => {
        preloader.style.display = "none";
      }, 500);
    }
  });
  // Force hide Creator Bazaar preloader if it exists

  // 1. Load home-content.html and CSS FIRST — WAIT for it
  loadHomeContent()
    .then(() => {
      console.log("✅ home-content fully loaded BEFORE running rest");
    })
    .catch((error) => {
      console.error("❌ Error loading home content:", error);
      showErrorMessage("Failed to load home feed. Please refresh the page.");
    });

  // 2. Load Header
  fetch("header.html")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.text();
    })
    .then((data) => {
      const headerElement = document.getElementById("header");
      if (headerElement) {
        headerElement.innerHTML = data;

        const script = document.createElement("script");
        script.src = "js/header.js";
        script.onerror = () => console.error("Failed to load header.js");

        script.onload = () => {
          console.log("✅ Header.js loaded");
          checkAndOpenLoginModal();
        };

        document.body.appendChild(script);
      }
    })
    .catch((error) => {
      console.error("Error loading header:", error);
    });

  // 3. Load Sidebar
  fetch("sidebar.html")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.text();
    })
    .then((data) => {
      const sidebarElement = document.getElementById("sidebar");
      if (sidebarElement) {
        sidebarElement.innerHTML = data;

        const script = document.createElement("script");
        script.src = "js/sidebar.js";
        script.onerror = () => console.error("Failed to load sidebar.js");
        script.onload = () => {
          console.log("✅ Sidebar.js loaded");
          setTimeout(() => {
            if (typeof window.updateSidebar === "function") {
              window.updateSidebar();
            }
          }, 100);
        };

        document.body.appendChild(script);
      }
    })
    .catch((error) => {
      console.error("Error loading sidebar:", error);
    });
});

// Load home-content.html and CSS
function loadHomeContent() {
  return new Promise((resolve, reject) => {
    console.log("📥 Loading home-content.html...");

    // Load CSS first
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "css/home-content.css";
    cssLink.onload = () => console.log("✅ home-content.css loaded");
    cssLink.onerror = () => console.error("❌ Failed to load home-content.css");
    document.head.appendChild(cssLink);

    // Load HTML
    fetch("home-content.html")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.text();
      })
      .then((html) => {
        console.log("✅ home-content.html fetched");

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const content = doc.querySelector("body").innerHTML;

        const mainContent = document.getElementById("main-content");
        if (!mainContent) {
          throw new Error("main-content element not found");
        }

        mainContent.innerHTML = content;
        console.log("✅ home-content.html inserted into DOM");

        // Load JS AFTER HTML is ready
        const script = document.createElement("script");
        script.src = "js/home-content.js";
        script.onload = () => {
          console.log("✅ home-content.js loaded and executed");
          resolve();
        };
        script.onerror = (error) => {
          console.error("❌ Failed to load home-content.js");
          reject(new Error("Failed to load home-content.js"));
        };

        document.body.appendChild(script);
      })
      .catch((error) => {
        console.error("❌ Error in loadHomeContent:", error);
        reject(error);
      });
  });
}

function checkAndOpenLoginModal() {
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get("openLogin") === "true") {
    console.log("🔓 Password reset successful - Opening login modal...");

    let attempts = 0;
    const maxAttempts = 10;

    const tryOpenModal = setInterval(() => {
      attempts++;

      if (typeof openLoginModal === "function") {
        console.log("✅ openLoginModal() function found - opening modal");
        clearInterval(tryOpenModal);

        openLoginModal();

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        console.log("✅ Login modal opened successfully");
      } else if (attempts >= maxAttempts) {
        console.error(
          "❌ openLoginModal() function not found after",
          maxAttempts,
          "attempts"
        );
        clearInterval(tryOpenModal);

        alert(
          "Password reset successful! Please login with your new password."
        );
        window.location.href = "/frontend/login.html";
      } else {
        console.log(
          `⏳ Waiting for openLoginModal() function... (attempt ${attempts}/${maxAttempts})`
        );
      }
    }, 300);
  }
}

// Listen for storage changes across tabs/windows
window.addEventListener("storage", (e) => {
  if (e.key === "authToken" || e.key === "sessionData") {
    console.log("🔄 Auth status changed in another tab - updating UI");

    if (typeof updateUIForLoggedInUser === "function") {
      updateUIForLoggedInUser();
    }

    if (typeof window.updateSidebar === "function") {
      window.updateSidebar();
    }
  }
});

// Listen for custom login/logout events
window.addEventListener("userLoggedIn", () => {
  console.log("✅ User logged in event - updating all UI components");

  setTimeout(() => {
    if (typeof updateUIForLoggedInUser === "function") {
      updateUIForLoggedInUser();
    }

    if (typeof window.updateSidebar === "function") {
      window.updateSidebar();
    }
  }, 100);
});

window.addEventListener("userLoggedOut", () => {
  console.log("🚪 User logged out event - updating all UI components");

  if (typeof updateUIForLoggedInUser === "function") {
    updateUIForLoggedInUser();
  }

  if (typeof window.updateSidebar === "function") {
    window.updateSidebar();
  }
});

// Debug helper - check current auth status
function checkAuthStatus() {
  const authToken =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const sessionData =
    localStorage.getItem("sessionData") ||
    sessionStorage.getItem("sessionData");
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");

  console.log("🔍 Current Auth Status:", {
    hasAuthToken: !!authToken,
    hasSessionData: !!sessionData,
    hasUserData: !!userData,
    isLoggedIn: !!(authToken && sessionData),
  });

  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData);
      console.log("📅 Session expires:", new Date(parsed.expiration));
    } catch (e) {
      console.error("Error parsing session data:", e);
    }
  }
}

window.checkAuthStatus = checkAuthStatus;

// Listen for registration completion from iframe (Signup)
window.addEventListener("message", (event) => {
  if (event.data.action === "closeSignupAndOpenLogin") {
    console.log("📩 Received signup completion message from iframe");

    if (typeof closeSignupModal === "function") {
      closeSignupModal();
    }

    setTimeout(() => {
      if (typeof openLoginModal === "function") {
        console.log("🔓 Opening login modal after registration success...");
        openLoginModal();
      } else {
        console.warn(
          "⚠️ openLoginModal() not found — redirecting to login.html"
        );
        window.location.href = "login.html";
      }
    }, 300);
  }

  if (event.data.action === "closeSignupModal") {
    console.log("📩 Received close signup modal request");
    if (typeof closeSignupModal === "function") {
      closeSignupModal();
    }
  }

  if (event.data.action === "openLoginModal") {
    console.log("📩 Received open login modal request");
    if (typeof openLoginModal === "function") {
      openLoginModal();
    } else {
      console.warn("⚠️ openLoginModal() not found — redirecting to login.html");
      window.location.href = "login.html";
    }
  }
});

// Run auth status check on load (for debugging)
window.addEventListener("load", () => {
  console.log("🏠 Home page loaded");
  checkAuthStatus();
});

// Show error message if home content fails to load
function showErrorMessage(message) {
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
        text-align: center;
        padding: 20px;
      ">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #e60aea; margin-bottom: 20px;"></i>
        <h2 style="color: var(--text-primary); margin-bottom: 10px;">Oops! Something went wrong</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">${message}</p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: linear-gradient(135deg, #e60aea, #e336cc);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 24px;
            font-weight: 600;
            cursor: pointer;
            font-size: 1rem;
          "
        >
          <i class="fas fa-redo"></i> Refresh Page
        </button>
      </div>
    `;
  }
}
