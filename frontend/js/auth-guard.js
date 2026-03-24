// auth-guard.js
// Add this script to ALL protected pages (home.html, profile.html, etc.)
// Include BEFORE other scripts: <script src="js/auth-guard.js"></script>

(function () {
  "use strict";

  const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/api"
      : "/api";

  const PUBLIC_PAGES = [
    "login.html",
    "registration.html",
    "forgot-password.html",
    "reset-password.html",
    "index.html",
    "profile.html",
    "explore.html",
    "CreatorBazaar.html",
  ];

  function isPublicPage() {
    const currentPage = window.location.pathname.split("/").pop();
    return PUBLIC_PAGES.some((page) => currentPage.includes(page));
  }

  function getActiveSession() {
    let token = localStorage.getItem("authToken");
    let sessionData = localStorage.getItem("sessionData");
    let storage = "localStorage";

    if (!token) {
      token = sessionStorage.getItem("authToken");
      sessionData = sessionStorage.getItem("sessionData");
      storage = "sessionStorage";
    }

    if (!token || !sessionData) return null;

    try {
      const parsed = JSON.parse(sessionData);
      return { token, data: parsed, storage };
    } catch (e) {
      console.error("Error parsing session data:", e);
      return null;
    }
  }

  async function verifySession() {
    const session = getActiveSession();
    if (!session) {
      console.log("❌ No active session found");
      return false;
    }

    const now = new Date().getTime();
    if (session.data.expiration && now > session.data.expiration) {
      console.log("⚠️ Session expired");
      clearSession();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.token }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Session verified");
        return true;
      } else {
        console.log("❌ Session verification failed:", data.message);
        clearSession();
        return false;
      }
    } catch (error) {
      console.error("❌ Error verifying session:", error);
      return true; // On network error, keep session
    }
  }

  function clearSession() {
    ["authToken", "userData", "sessionData"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  }

  function redirectToLogin(message) {
    const loginUrl =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "/frontend/login.html"
        : "/login.html";
    if (window.location.pathname !== loginUrl) {
      console.log("🔄 Redirecting to login...");
      if (message) {
        sessionStorage.setItem("authMessage", message);
      }
      window.location.href = loginUrl;
    }
  }

  // ✅ NEW: Check if logged-in user's account is suspended via the API
  async function checkIfSuspended() {
    const session = getActiveSession();
    if (!session) return false;

    try {
      const userData =
        localStorage.getItem("userData") || sessionStorage.getItem("userData");
      if (!userData) return false;

      const user = JSON.parse(userData);
      if (!user || !user.id) return false;

      const response = await fetch(`${API_BASE_URL}/profile/view/${user.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (response.status === 200) {
        return false; // Active
      }

      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.is_suspended) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false; // Network error — don't block
    }
  }

  async function checkAuthentication() {
    if (isPublicPage()) {
      console.log("ℹ️ Public page - skipping auth check");
      return;
    }

    console.log("🔍 Checking authentication...");
    const isValid = await verifySession();

    if (!isValid) {
      console.log("❌ Authentication failed - redirecting to login");
      redirectToLogin();
      return;
    }

    // ✅ NEW: Check suspension status for logged-in users
    const suspended = await checkIfSuspended();
    if (suspended) {
      console.log("🚫 Account suspended - logging out");
      clearSession();
      redirectToLogin(
        "Your account has been suspended. Please check your email for details."
      );
      return;
    }

    console.log("✅ Authentication successful");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAuthentication);
  } else {
    checkAuthentication();
  }

  // Periodic session check every 5 minutes
  setInterval(async () => {
    if (!isPublicPage()) {
      console.log("⏰ Periodic authentication check...");
      const isValid = await verifySession();
      if (!isValid) {
        alert("Your session has expired. Please login again.");
        redirectToLogin();
        return;
      }

      // ✅ Also check suspension periodically
      const suspended = await checkIfSuspended();
      if (suspended) {
        clearSession();
        alert(
          "Your account has been suspended. You will be logged out. Please check your email."
        );
        redirectToLogin();
      }
    }
  }, 5 * 60 * 1000);

  window.authGuard = {
    getActiveSession,
    verifySession,
    clearSession,
    redirectToLogin,
  };
})();
