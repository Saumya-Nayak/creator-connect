// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Privacy page loading...");

  await loadHeaderAndSidebar();
  initializeTabs();
  createBackToTopButton();
  applyTheme();

  console.log("✅ Privacy page ready");
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

// ===== TABS FUNCTIONALITY =====
function initializeTabs() {
  const tabItems = document.querySelectorAll(".tab-item");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // Set first tab as active by default
  if (tabItems.length > 0 && tabPanels.length > 0) {
    tabItems[0].classList.add("active");
    tabPanels[0].classList.add("active");
  }

  // Add click event listeners to all tabs
  tabItems.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and panels
      tabItems.forEach((t) => t.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("active"));

      // Add active class to clicked tab and corresponding panel
      tab.classList.add("active");
      tabPanels[index].classList.add("active");

      // Scroll to top of content area on mobile
      if (window.innerWidth <= 1024) {
        const contentArea = document.querySelector(".tabs-content");
        if (contentArea) {
          contentArea.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      // Add animation effect
      tabPanels[index].style.animation = "none";
      setTimeout(() => {
        tabPanels[index].style.animation = "fadeIn 0.5s ease";
      }, 10);
    });
  });

  // Keyboard navigation
  tabItems.forEach((tab, index) => {
    tab.setAttribute("role", "tab");
    tab.setAttribute("tabindex", index === 0 ? "0" : "-1");

    tab.addEventListener("keydown", (e) => {
      let newIndex = index;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        newIndex = (index + 1) % tabItems.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        newIndex = (index - 1 + tabItems.length) % tabItems.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        newIndex = tabItems.length - 1;
      }

      if (newIndex !== index) {
        tabItems[newIndex].click();
        tabItems[newIndex].focus();
      }
    });
  });

  console.log("✅ Tabs initialized");
}

// ===== BACK TO TOP BUTTON =====
function createBackToTopButton() {
  const button = document.createElement("button");
  button.id = "backToTop";
  button.innerHTML = '<i class="fas fa-arrow-up"></i>';
  button.className = "back-to-top";

  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  document.body.appendChild(button);

  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      button.style.display = "flex";
    } else {
      button.style.display = "none";
    }
  });
}

// ===== PRINT FUNCTIONALITY =====
function printPrivacy() {
  // Show all panels before printing
  const tabPanels = document.querySelectorAll(".tab-panel");
  tabPanels.forEach((panel) => {
    panel.style.display = "block";
  });

  window.print();

  // Restore original display after printing
  setTimeout(() => {
    tabPanels.forEach((panel, index) => {
      const isActive = panel.classList.contains("active");
      panel.style.display = isActive ? "block" : "none";
    });
  }, 1000);
}

// ===== THEME =====
function applyTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
}

window.addEventListener("storage", (e) => {
  if (e.key === "theme") applyTheme();
});

window.addEventListener("themeChanged", applyTheme);

// ===== ADD PRINT BUTTON =====
function addPrintButton() {
  const heroContent = document.querySelector(".hero-content");
  if (heroContent) {
    const printBtn = document.createElement("button");
    printBtn.className = "btn-print";
    printBtn.innerHTML = '<i class="fas fa-print"></i> Print Policy';
    printBtn.style.cssText = `
          margin-top: 20px;
          padding: 12px 30px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        `;

    printBtn.addEventListener("mouseenter", function () {
      this.style.background = "rgba(255, 255, 255, 0.3)";
      this.style.transform = "translateY(-2px)";
    });

    printBtn.addEventListener("mouseleave", function () {
      this.style.background = "rgba(255, 255, 255, 0.2)";
      this.style.transform = "translateY(0)";
    });

    printBtn.onclick = printPrivacy;
    heroContent.appendChild(printBtn);
  }
}

setTimeout(addPrintButton, 500);

// ===== SMOOTH SCROLLING FOR HORIZONTAL TABS ON MOBILE =====
function setupHorizontalScrolling() {
  const tabsList = document.querySelector(".tabs-list");
  if (!tabsList) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  tabsList.addEventListener("mousedown", (e) => {
    if (window.innerWidth > 1024) return;
    isDown = true;
    tabsList.classList.add("active");
    startX = e.pageX - tabsList.offsetLeft;
    scrollLeft = tabsList.scrollLeft;
  });

  tabsList.addEventListener("mouseleave", () => {
    isDown = false;
  });

  tabsList.addEventListener("mouseup", () => {
    isDown = false;
  });

  tabsList.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    if (window.innerWidth > 1024) return;
    e.preventDefault();
    const x = e.pageX - tabsList.offsetLeft;
    const walk = (x - startX) * 2;
    tabsList.scrollLeft = scrollLeft - walk;
  });
}

setTimeout(setupHorizontalScrolling, 1000);

// ===== EXPORT FOR GLOBAL ACCESS =====
window.printPrivacy = printPrivacy;
