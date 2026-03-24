// explorer-mobile-filter.js
// Wraps the filter sidebar content in a collapsible panel — MOBILE ONLY.
// On desktop/tablet (> 768px) it does absolutely nothing.
// Add: <script src="js/explorer-mobile-filter.js"></script> after explorer.js in explore.html

(function initMobileFilter() {
  var MOBILE_MAX = 768;
  var initialized = false;

  function setup() {
    // Only run on mobile
    if (window.innerWidth > MOBILE_MAX) return;
    if (initialized) return;

    var section = document.querySelector(".filter-section");
    if (!section) return;
    initialized = true;

    // Wrap ALL existing children in .filter-inner div
    var inner = document.createElement("div");
    inner.className = "filter-inner";
    // Move all children into inner
    while (section.firstChild) {
      inner.appendChild(section.firstChild);
    }
    section.appendChild(inner);

    // Create the toggle button (inserted BEFORE inner)
    var btn = document.createElement("button");
    btn.className = "filter-toggle-btn";
    btn.setAttribute("type", "button");
    btn.innerHTML =
      '<span><i class="fas fa-sliders-h" style="margin-right:8px;color:var(--primary-purple)"></i>' +
      "<strong>Filters &amp; Sort</strong></span>" +
      '<i class="fas fa-chevron-down toggle-arrow" style="font-size:0.8rem;transition:transform 0.3s ease;"></i>';
    section.insertBefore(btn, inner);

    btn.addEventListener("click", function () {
      var isOpen = section.classList.toggle("expanded");
      // Rotate chevron
      var arrow = btn.querySelector(".toggle-arrow");
      if (arrow)
        arrow.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
    });
  }

  // Run on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }

  // Also re-check on resize (in case user resizes to mobile)
  window.addEventListener("resize", function () {
    if (window.innerWidth <= MOBILE_MAX && !initialized) {
      setup();
    }
  });
})();
