console.log("🚀 About.js script started loading");

// Apply saved theme immediately
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
console.log("🎨 Initial theme applied:", savedTheme);

// ===== DOM CONTENT LOADED =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM Content Loaded");

  // Load header and sidebar in parallel
  Promise.all([loadHeader(), loadSidebar()]).then(() => {
    console.log("✅ Header and Sidebar both loaded - initializing modals");
    initializeModals();
    initializeTabs();
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

// ===== INITIALIZE MODALS =====
function initializeModals() {
  console.log("🔧 Initializing modals...");

  // Update header UI
  if (typeof window.updateUIForLoggedInUser === "function") {
    console.log("✅ updateUIForLoggedInUser function available");
    window.updateUIForLoggedInUser();
  }

  // Update sidebar
  if (typeof window.updateSidebar === "function") {
    console.log("✅ updateSidebar function available");
    window.updateSidebar();
  }

  console.log("✅ Modals initialized and ready for use");
  logPageStatus();
}

// ===== TAB FUNCTIONALITY =====
function initializeTabs() {
  console.log("🔧 Initializing tab navigation...");

  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  if (tabButtons.length === 0) {
    console.warn("⚠️ No tab buttons found");
    return;
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");
      console.log("📑 Switching to tab:", targetTab);

      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      button.classList.add("active");
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add("active");

        // Scroll to tabs container smoothly
        const tabsContainer = document.querySelector(".tabs-container");
        if (tabsContainer) {
          const offset = 100; // Offset from top
          const elementPosition = tabsContainer.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }
    });
  });

  console.log("✅ Tab navigation initialized");
}

// ===== THEME SYNC =====
window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    const newTheme = e.newValue || "light";
    console.log("🎨 Theme changed (from another tab):", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }
});

// ===== MESSAGE HANDLING =====
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

// ===== BUTTON HANDLERS =====
function handleJoinNow() {
  console.log("👆 Join Now button clicked");

  const authToken =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  if (authToken) {
    console.log("✅ User already logged in - redirecting to home");
    window.location.href = "home.html";
  } else {
    console.log("📝 User not logged in - opening signup modal");
    openSignupModal();
  }
}

function handleExplore() {
  console.log("👆 Explore button clicked");
  window.location.href = "explore.html";
}

// ===== MODAL FUNCTIONS =====
function openSignupModal() {
  const originalFunc = window.__originalOpenSignupModal;
  if (typeof originalFunc === "function") {
    console.log("✅ Original openSignupModal found - opening");
    originalFunc();
  } else if (typeof window.openSignupModal === "function") {
    console.log("✅ openSignupModal found - opening");
    window.openSignupModal();
  } else {
    console.warn("⚠️ openSignupModal not found - redirecting to registration");
    window.location.href = "registration.html";
  }
}

function openLoginModal() {
  const originalFunc = window.__originalOpenLoginModal;
  if (typeof originalFunc === "function") {
    console.log("✅ Original openLoginModal found - opening");
    originalFunc();
  } else if (typeof window.openLoginModal === "function") {
    console.log("✅ openLoginModal found - opening");
    window.openLoginModal();
  } else {
    console.warn("⚠️ openLoginModal not found - redirecting to login");
    window.location.href = "login.html";
  }
}

// ===== SCROLL FUNCTIONS =====
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    console.log("📍 Scrolling to section:", sectionId);
    section.scrollIntoView({ behavior: "smooth" });
  }
}

function navigateTo(page) {
  const validPages = [
    "home.html",
    "explore.html",
    "profile.html",
    "registration.html",
    "login.html",
    "about.html",
  ];

  if (validPages.includes(page)) {
    console.log("🔗 Navigating to:", page);
    window.location.href = page;
  } else {
    console.warn("⚠️ Invalid page:", page);
  }
}

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

window.addEventListener("load", () => {
  console.log("⏱️ Window load event - attaching animation observers");

  // Add initial styles for animation
  const animateElements = [
    ...document.querySelectorAll(".problem-card"),
    ...document.querySelectorAll(".feature-item"),
    ...document.querySelectorAll(".why-card"),
    ...document.querySelectorAll(".team-card"),
    ...document.querySelectorAll(".stat-card"),
  ];

  animateElements.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });

  console.log("✅ Animation observers attached");
});

// ===== PAGE STATUS LOGGING =====
function logPageStatus() {
  const authToken =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");
  const currentTheme = document.documentElement.getAttribute("data-theme");

  console.log("📊 About Page Status:", {
    isLoggedIn: !!authToken,
    hasUserData: !!userData,
    currentTheme: currentTheme,
    openLoginModalAvailable: typeof window.openLoginModal === "function",
    openSignupModalAvailable: typeof window.openSignupModal === "function",
    updateUIAvailable: typeof window.updateUIForLoggedInUser === "function",
    updateSidebarAvailable: typeof window.updateSidebar === "function",
  });
}

window.addEventListener("load", logPageStatus);

// ===== EXPOSE FUNCTIONS GLOBALLY =====
window.handleJoinNow = handleJoinNow;
window.handleExplore = handleExplore;
window.scrollToSection = scrollToSection;
window.navigateTo = navigateTo;
window.logPageStatus = logPageStatus;
window.openSignupModal = openSignupModal;
window.openLoginModal = openLoginModal;

console.log("✅✅✅ About.js fully loaded and ready!");
