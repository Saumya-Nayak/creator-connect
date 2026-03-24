// ===== MESSAGES PAGE INITIALIZATION (BASED ON ABOUT.JS PATTERN) =====

console.log("🚀 Messages-init.js script started loading");

// Apply theme immediately (before DOM loads)
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
console.log("🎨 Initial theme applied:", savedTheme);

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM Content Loaded");

  // Load header and sidebar in parallel, but ensure proper initialization
  Promise.all([loadHeader(), loadSidebar()]).then(() => {
    console.log("✅ Header and Sidebar both loaded - initializing modals");
    initializeModals();
  });
});

// ===== LOAD HEADER =====
function loadHeader() {
  return new Promise((resolve, reject) => {
    console.log("📥 Loading header.html...");

    fetch("header.html")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((data) => {
        const headerElement = document.getElementById("header");
        if (headerElement) {
          headerElement.innerHTML = data;
          console.log("✅ Header HTML injected into DOM");

          // Load header.js script
          loadHeaderScript().then(resolve).catch(reject);
        } else {
          reject(new Error("Header element not found"));
        }
      })
      .catch((error) => {
        console.error("❌ Error loading header.html:", error);
        reject(error);
      });
  });
}

// ===== LOAD HEADER SCRIPT =====
function loadHeaderScript() {
  return new Promise((resolve, reject) => {
    console.log("📥 Loading header.js script...");

    const script = document.createElement("script");
    script.src = "js/header.js";
    script.type = "text/javascript";

    script.onload = () => {
      console.log("✅ header.js script loaded successfully");
      resolve();
    };

    script.onerror = () => {
      console.error("❌ Failed to load header.js");
      reject(new Error("Failed to load header.js"));
    };

    document.body.appendChild(script);
  });
}

// ===== LOAD SIDEBAR =====
function loadSidebar() {
  return new Promise((resolve, reject) => {
    console.log("📥 Loading sidebar.html...");

    fetch("sidebar.html")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((data) => {
        const sidebarElement = document.getElementById("sidebar");
        if (sidebarElement) {
          sidebarElement.innerHTML = data;
          console.log("✅ Sidebar HTML injected into DOM");

          // Load sidebar.js script
          loadSidebarScript().then(resolve).catch(reject);
        } else {
          reject(new Error("Sidebar element not found"));
        }
      })
      .catch((error) => {
        console.error("❌ Error loading sidebar.html:", error);
        reject(error);
      });
  });
}

// ===== LOAD SIDEBAR SCRIPT =====
function loadSidebarScript() {
  return new Promise((resolve, reject) => {
    console.log("📥 Loading sidebar.js script...");

    const script = document.createElement("script");
    script.src = "js/sidebar.js";
    script.type = "text/javascript";

    script.onload = () => {
      console.log("✅ sidebar.js script loaded successfully");
      resolve();
    };

    script.onerror = () => {
      console.error("❌ Failed to load sidebar.js");
      reject(new Error("Failed to load sidebar.js"));
    };

    document.body.appendChild(script);
  });
}

// ===== INITIALIZE MODALS (EXACTLY LIKE ABOUT.JS) =====
function initializeModals() {
  console.log("🔧 Initializing modals...");

  // Wait a moment for scripts to fully execute their initialization code
  setTimeout(() => {
    // Update header UI
    if (typeof window.updateUIForLoggedInUser === "function") {
      console.log("✅ updateUIForLoggedInUser function available");
      window.updateUIForLoggedInUser();
    } else {
      console.warn("⚠️ updateUIForLoggedInUser function not found");
      console.log(
        "Available window functions:",
        Object.keys(window).filter(
          (k) => k.includes("UI") || k.includes("update")
        )
      );
    }

    // Update sidebar
    if (typeof window.updateSidebar === "function") {
      console.log("✅ updateSidebar function available");
      window.updateSidebar();
    } else {
      console.warn("⚠️ updateSidebar function not found");
    }

    console.log("✅ Modals initialized and ready for use");
    logPageStatus();
  }, 100); // Small delay to ensure script execution
}

// ===== LISTEN FOR THEME CHANGES =====
window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    const newTheme = e.newValue || "light";
    console.log("🎨 Theme changed (from another tab):", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }
});

// ===== HANDLE POSTMESSAGE EVENTS (FOR MODALS) =====
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
          "⚠️ openLoginModal() not found – redirecting to login.html"
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
      console.warn("⚠️ openLoginModal() not found – redirecting to login.html");
      window.location.href = "login.html";
    }
  }

  if (event.data.action === "openSignupModal") {
    console.log("📩 Received open signup modal request");
    if (typeof openSignupModal === "function") {
      openSignupModal();
    } else {
      console.warn(
        "⚠️ openSignupModal() not found – redirecting to registration.html"
      );
      window.location.href = "registration.html";
    }
  }

  if (event.data.action === "closeLoginModal") {
    console.log("📩 Received close login modal request");
    if (typeof closeLoginModal === "function") {
      closeLoginModal();
    }
  }
});

// ===== LOG PAGE STATUS =====
function logPageStatus() {
  const authToken =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");
  const currentTheme = document.documentElement.getAttribute("data-theme");

  console.log("📊 Messages Page Status:", {
    isLoggedIn: !!authToken,
    hasUserData: !!userData,
    currentTheme: currentTheme,
    openLoginModalAvailable: typeof window.openLoginModal === "function",
    openSignupModalAvailable: typeof window.openSignupModal === "function",
    updateUIAvailable: typeof window.updateUIForLoggedInUser === "function",
    updateSidebarAvailable: typeof window.updateSidebar === "function",
  });
}

// Make functions globally available
window.logPageStatus = logPageStatus;

console.log("✅✅✅ Messages-init.js fully loaded and ready!");
