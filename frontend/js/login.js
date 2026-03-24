const SESSION_CONFIG = {
  REMEMBER_ME_DAYS: 7, // 7 days for "Remember Me"
  SESSION_ONLY_HOURS: 24, // 24 hours for browser session
  TOKEN_REFRESH_THRESHOLD: 3600000, // Refresh token if expires in 1 hour (milliseconds)
};
// API Configuration - Works on any device
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api";

// Google Client ID
const GOOGLE_CLIENT_ID =
  "837260828192-egcsohlqdn3c99dk3hu9iphnokicikkm.apps.googleusercontent.com";

// Initialize theme from parent window
let savedTheme = localStorage.getItem("theme") || "light";

document.body.classList.remove("light", "dark");
document.body.classList.add(savedTheme);

// Listen for theme changes from parent
window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(e.newValue);
  }
});

// Toggle password visibility
function togglePassword() {
  const field = document.getElementById("password");
  const icon = document.querySelector(".password-toggle");

  if (field.type === "password") {
    field.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    field.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

// Form validation
function validateField(field, regex) {
  const formGroup = field.closest(".form-group");
  if (field.value.trim() === "" || !regex.test(field.value)) {
    formGroup.classList.add("invalid");
    return false;
  } else {
    formGroup.classList.remove("invalid");
    return true;
  }
}

// Show loading state
function setLoading(isLoading) {
  const submitBtn = document.querySelector('button[type="submit"]');

  if (!submitBtn) return;

  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.style.opacity = "0.7";
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Login";
    submitBtn.style.opacity = "1";
  }
}

// Show error message (PERSISTENT - doesn't auto-remove)
function showError(message) {
  const existingError = document.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.cssText = `
    background-color: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    border: 1px solid #fcc;
    animation: slideDown 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;

  errorDiv.innerHTML = `
    <div>
      <i class="fas fa-exclamation-circle"></i> ${message}
    </div>
    <i class="fas fa-times" style="cursor: pointer; opacity: 0.7;" onclick="this.parentElement.remove()"></i>
  `;

  const form = document.getElementById("loginForm");
  form.parentNode.insertBefore(errorDiv, form);
}

// Show success message
function showSuccess(message) {
  const existingError = document.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.style.cssText = `
    background-color: #d4edda;
    color: #155724;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    border: 1px solid #c3e6cb;
    animation: slideDown 0.3s ease;
  `;
  successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

  const form = document.getElementById("loginForm");
  form.parentNode.insertBefore(successDiv, form);

  setTimeout(() => {
    successDiv.style.transition = "opacity 0.3s";
    successDiv.style.opacity = "0";
    setTimeout(() => successDiv.remove(), 300);
  }, 3000);
}

// Save user session
function saveUserSession(token, user, remember) {
  const now = new Date().getTime();

  const sessionData = {
    token: token,
    user: user,
    timestamp: now,
    rememberMe: remember,
  };

  if (remember) {
    // Remember Me: 7 days expiration
    const expirationTime =
      now + SESSION_CONFIG.REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
    sessionData.expiration = expirationTime;

    try {
      localStorage.setItem("authToken", token);
      localStorage.setItem("userData", JSON.stringify(user));
      localStorage.setItem("sessionData", JSON.stringify(sessionData));

      console.log("✅ Session saved with Remember Me:", {
        expiresIn: SESSION_CONFIG.REMEMBER_ME_DAYS + " days",
        expiresAt: new Date(expirationTime).toLocaleString(),
      });
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  } else {
    // Session only: 24 hours expiration
    const expirationTime =
      now + SESSION_CONFIG.SESSION_ONLY_HOURS * 60 * 60 * 1000;
    sessionData.expiration = expirationTime;

    try {
      sessionStorage.setItem("authToken", token);
      sessionStorage.setItem("userData", JSON.stringify(user));
      sessionStorage.setItem("sessionData", JSON.stringify(sessionData));

      console.log("✅ Session saved (browser session):", {
        expiresIn: SESSION_CONFIG.SESSION_ONLY_HOURS + " hours",
        expiresAt: new Date(expirationTime).toLocaleString(),
      });
    } catch (e) {
      console.error("Error saving to sessionStorage:", e);
    }
  }
}

// Redirect to home page
function redirectToDashboard() {
  if (window.parent && window.parent !== window) {
    // If inside iframe (modal), send message to parent to close modal
    console.log("🔄 Sending loginSuccess message to parent window...");

    window.parent.postMessage(
      {
        action: "loginSuccess",
        message: "Login successful!",
      },
      "*"
    );

    // Don't redirect here - let the parent handle it
  } else {
    // If standalone page, redirect directly
    console.log("🔄 Redirecting to home page...");
    setTimeout(() => {
      window.location.href =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
          ? "/frontend/home.html"
          : "/home.html";
    }, 1500);
  }
}

// Form submission with backend integration
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const remember = document.getElementById("remember").checked;

    let isValid = true;

    if (email.value.trim() === "") {
      validateField(email, /^.+$/);
      isValid = false;
    }

    if (!validateField(password, /^.{1,}$/)) {
      isValid = false;
    }

    if (!isValid) {
      showError("Please fill in all required fields");
      return;
    }

    const loginData = {
      email: email.value.trim(),
      password: password.value,
      remember: remember,
    };

    try {
      setLoading(true);

      console.log("🔄 Attempting login...", {
        email: loginData.email,
        rememberMe: remember,
      });

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (data.success) {
        saveUserSession(data.token, data.user, remember);

        showSuccess(
          `Welcome back, ${data.user.full_name || data.user.username}! 🎉`
        );

        console.log("✅ Login successful:", data.user);

        // Small delay to show success message
        setTimeout(() => {
          redirectToDashboard();
        }, 800);
      } else {
        showError(
          data.message || "Login failed. Please check your credentials."
        );
        console.error("❌ Login failed:", data.message);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      showError(
        "Unable to connect to server. Please check if the backend is running."
      );
    } finally {
      setLoading(false);
    }
  });

// Clear invalid state on input and remove error message
document.querySelectorAll("input").forEach((field) => {
  field.addEventListener("input", function () {
    this.closest(".form-group")?.classList.remove("invalid");

    const errorMsg = document.querySelector(".error-message");
    if (errorMsg) {
      errorMsg.remove();
    }
  });
});

// ===== GOOGLE SIGN-IN FUNCTIONALITY =====

// Handle Google Sign-In Response
async function handleGoogleSignIn(response) {
  console.log("🔄 Google Sign-In initiated...");

  // Get the "Remember Me" checkbox status
  const remember = document.getElementById("remember")?.checked || false;

  // Show loading state on the custom Google button if it exists
  const googleBtn = document.querySelector(".social-btn");
  const originalContent = googleBtn ? googleBtn.innerHTML : null;

  if (googleBtn) {
    googleBtn.disabled = true;
    googleBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  }

  try {
    console.log("📤 Sending credential to backend...");

    const res = await fetch(`${API_BASE_URL}/google-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credential: response.credential,
        remember: remember, // ✅ Now passing remember flag
      }),
    });

    const data = await res.json();

    if (data.success) {
      // Save session with remember preference
      saveUserSession(data.token, data.user, remember);

      // Show appropriate welcome message
      if (data.is_new_user) {
        showSuccess(
          `🎉 Welcome ${
            data.user.full_name || data.user.username
          }! Your account has been created.`
        );
      } else {
        showSuccess(
          `Welcome back, ${data.user.full_name || data.user.username}! 🎉`
        );
      }

      console.log("✅ Google login successful:", {
        email: data.user.email,
        isNewUser: data.is_new_user,
        rememberMe: remember,
      });

      // Redirect after showing success message
      setTimeout(() => {
        redirectToDashboard();
      }, 1500);
    } else {
      showError(data.message || "Google login failed. Please try again.");
      console.error("❌ Google login failed:", data.message);

      // Re-enable button on failure
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = originalContent;
      }
    }
  } catch (error) {
    console.error("❌ Google login error:", error);
    showError(
      "Unable to connect to server. Please check if backend is running."
    );

    // Re-enable button on error
    if (googleBtn) {
      googleBtn.disabled = false;
      googleBtn.innerHTML = originalContent;
    }
  }
}

// Initialize Google Sign-In with improved error handling
function initializeGoogleSignIn() {
  // Check if script already exists
  if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
    console.log("⚠️ Google Sign-In script already loaded");
    setupGoogleButton();
    return;
  }

  // Load Google Identity Services script
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;

  script.onload = () => {
    console.log("✅ Google Sign-In library loaded");
    setupGoogleButton();
  };

  script.onerror = () => {
    console.error("❌ Failed to load Google Sign-In library");
    showError("Failed to load Google Sign-In. Please refresh the page.");
  };

  document.head.appendChild(script);
}

// Setup Google Sign-In button
function setupGoogleButton() {
  try {
    // Initialize with FedCM support
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleSignIn,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    // Create hidden div for Google button
    let googleButtonDiv = document.getElementById("googleSignInDiv");
    if (!googleButtonDiv) {
      googleButtonDiv = document.createElement("div");
      googleButtonDiv.id = "googleSignInDiv";
      googleButtonDiv.style.display = "none";
      document.body.appendChild(googleButtonDiv);
    }

    // Render Google's native button (hidden)
    google.accounts.id.renderButton(googleButtonDiv, {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
    });

    console.log("✅ Google Sign-In button rendered");
  } catch (error) {
    console.error("❌ Error setting up Google button:", error);
  }
}
// Trigger hidden Google button
function socialLogin(provider) {
  if (provider === "google") {
    console.log("🔄 Triggering Google Sign-In...");

    try {
      // Method 1: Try One Tap prompt first
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log(
            "⚠️ One Tap not displayed:",
            notification.getNotDisplayedReason()
          );
          // Method 2: Trigger hidden button click
          triggerGoogleButton();
        } else if (notification.isSkippedMoment()) {
          console.log("⚠️ One Tap skipped by user");
          triggerGoogleButton();
        }
      });
    } catch (error) {
      console.error("❌ Error triggering Google Sign-In:", error);
      // Method 3: Fallback - trigger hidden button directly
      triggerGoogleButton();
    }
  } else {
    showError(`${provider} login coming soon!`);
  }
}

// Trigger hidden Google button
function triggerGoogleButton() {
  const googleDiv = document.getElementById("googleSignInDiv");
  if (googleDiv && googleDiv.querySelector('div[role="button"]')) {
    console.log("🔄 Clicking hidden Google button");
    googleDiv.querySelector('div[role="button"]').click();
  } else {
    console.log("⚠️ Hidden button not found");
    showError("Google Sign-In button not ready. Please refresh the page.");
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Login page loaded");
  checkExistingSession();
  initializeGoogleSignIn();

  // Setup forgot password link
  const forgotLink = document.querySelector(".forgot-password");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      handleForgotPassword();
    });
  }
});

// Show Google popup (fallback method)
function showGooglePopup() {
  console.log("🔄 Opening Google OAuth popup...");

  const redirectUri = encodeURIComponent(window.location.origin);
  const scope = encodeURIComponent("email profile");
  const responseType = "token id_token";
  const nonce = Math.random().toString(36).substring(2);

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&nonce=${nonce}&prompt=select_account`;

  // Open popup
  const popup = window.open(
    authUrl,
    "Google Sign-In",
    "width=500,height=600,scrollbars=yes"
  );

  if (!popup) {
    showError("Popup blocked. Please allow popups for this site.");
    return;
  }

  // Listen for popup close
  const checkPopup = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkPopup);
      console.log("Google popup closed");
    }
  }, 1000);
}

// Switch to signup
// Switch to signup
function switchToSignup() {
  console.log("🔄 Switching to signup page");

  if (window.parent && window.parent !== window) {
    // Inside iframe - send message to parent
    console.log("📤 Sending switchToSignup message to parent");
    window.parent.postMessage(
      {
        action: "switchToSignup",
      },
      "*"
    );
  } else {
    // Standalone page - redirect directly
    window.location.href = "registration.html";
  }
}

// Check if user is already logged in
async function checkExistingSession() {
  console.log("🔍 Checking for existing session...");

  // Check localStorage first (Remember Me)
  let token = localStorage.getItem("authToken");
  let sessionData = localStorage.getItem("sessionData");
  let storage = "localStorage";

  // If not in localStorage, check sessionStorage
  if (!token) {
    token = sessionStorage.getItem("authToken");
    sessionData = sessionStorage.getItem("sessionData");
    storage = "sessionStorage";
  }

  if (!token || !sessionData) {
    console.log("❌ No active session found");
    return;
  }

  try {
    const parsedSession = JSON.parse(sessionData);
    const now = new Date().getTime();

    // Check if session has expired
    if (parsedSession.expiration && now > parsedSession.expiration) {
      console.log(
        "⚠️ Session expired at:",
        new Date(parsedSession.expiration).toLocaleString()
      );
      clearSession();
      showError("Your session has expired. Please login again.");
      return;
    }

    // Calculate remaining time
    const remainingTime = parsedSession.expiration - now;
    const remainingHours = Math.floor(remainingTime / (60 * 60 * 1000));
    const remainingMinutes = Math.floor(
      (remainingTime % (60 * 60 * 1000)) / (60 * 1000)
    );

    console.log("✅ Active session found in", storage, {
      rememberMe: parsedSession.rememberMe,
      remainingTime: `${remainingHours}h ${remainingMinutes}m`,
      expiresAt: new Date(parsedSession.expiration).toLocaleString(),
    });

    // Verify token with backend
    const response = await fetch(`${API_BASE_URL}/verify-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ Token verified - User already logged in");

      // Update session timestamp (extends session on activity)
      parsedSession.timestamp = now;
      if (storage === "localStorage") {
        localStorage.setItem("sessionData", JSON.stringify(parsedSession));
      } else {
        sessionStorage.setItem("sessionData", JSON.stringify(parsedSession));
      }

      // Only show message and redirect if not already on home page
      if (!window.location.pathname.includes("home.html")) {
        showSuccess("Already logged in! Redirecting...");
        setTimeout(() => {
          redirectToDashboard();
        }, 1000);
      }
    } else {
      console.log("❌ Token verification failed:", data.message);
      clearSession();
      showError("Session invalid. Please login again.");
    }
  } catch (error) {
    console.error("❌ Error verifying session:", error);
    // Don't clear session on network errors - user might be offline
    if (error.message.includes("fetch")) {
      console.log("⚠️ Network error - keeping session for retry");
    } else {
      clearSession();
    }
  }
}
// Clear all session data
function clearSession() {
  console.log("🧹 Clearing all session data...");

  // Clear localStorage
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("sessionData");

  // Clear sessionStorage
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("userData");
  sessionStorage.removeItem("sessionData");

  console.log("✅ Session cleared");
}
function initSessionActivityMonitor() {
  let activityTimer;

  const updateSessionActivity = () => {
    // Get current session
    let sessionData = localStorage.getItem("sessionData");
    let storage = "localStorage";

    if (!sessionData) {
      sessionData = sessionStorage.getItem("sessionData");
      storage = "sessionStorage";
    }

    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        parsed.timestamp = new Date().getTime();

        // Save updated timestamp
        if (storage === "localStorage") {
          localStorage.setItem("sessionData", JSON.stringify(parsed));
        } else {
          sessionStorage.setItem("sessionData", JSON.stringify(parsed));
        }

        console.log("🔄 Session activity updated");
      } catch (e) {
        console.error("Error updating session activity:", e);
      }
    }
  };

  // Update session on user activity (debounced)
  const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];

  activityEvents.forEach((event) => {
    document.addEventListener(
      event,
      () => {
        clearTimeout(activityTimer);
        activityTimer = setTimeout(updateSessionActivity, 5000); // Update after 5s of activity
      },
      { passive: true }
    );
  });

  console.log("✅ Session activity monitor initialized");
}

// ===== PERIODIC SESSION CHECK =====
// Add this new function to check session validity periodically

function initPeriodicSessionCheck() {
  // Check session every 5 minutes
  setInterval(async () => {
    console.log("⏰ Periodic session check...");

    let token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/verify-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!data.success) {
          console.log("❌ Session expired - logging out");
          clearSession();

          // Redirect to login if not already there
          if (!window.location.pathname.includes("login.html")) {
            window.location.href =
              window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1"
                ? "/frontend/login.html"
                : "/login.html";
          }
        } else {
          console.log("✅ Session still valid");
        }
      } catch (error) {
        console.error("❌ Periodic check failed:", error);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
}
(function () {
  const isDark = document.body.classList.contains("dark");
  const root = document.documentElement;

  if (isDark) {
    root.style.setProperty("--fp-bg", "#1f1f1f");
    root.style.setProperty("--fp-text", "#f1f1f1");
    root.style.setProperty("--fp-subtext", "#bbbbbb");
    root.style.setProperty("--fp-input-bg", "#2a2a2a");
    root.style.setProperty("--fp-input-border", "#444");
    root.style.setProperty("--fp-card-shadow", "rgba(0,0,0,0.6)");
    root.style.setProperty("--fp-secondary-btn-bg", "#333");
    root.style.setProperty("--fp-secondary-btn-text", "#eee");
  } else {
    root.style.setProperty("--fp-bg", "#ffffff");
    root.style.setProperty("--fp-text", "#222");
    root.style.setProperty("--fp-subtext", "#666");
    root.style.setProperty("--fp-input-bg", "#ffffff");
    root.style.setProperty("--fp-input-border", "#ddd");
    root.style.setProperty("--fp-card-shadow", "rgba(0,0,0,0.2)");
    root.style.setProperty("--fp-secondary-btn-bg", "#f0f0f0");
    root.style.setProperty("--fp-secondary-btn-text", "#333");
  }
})();

// FORGOT PASSWORD FUNCTIONALITY
async function handleForgotPassword() {
  const existingModal = document.getElementById("forgotPasswordModal");
  if (existingModal) {
    existingModal.remove();
  }
  const modalHTML = `
  <div id="forgotPasswordModal" class="fp-overlay">
    <div class="fp-modal">
      <h2 class="fp-title">
        <i class="fas fa-key"></i> Forgot Password
      </h2>

      <p class="fp-desc">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <div class="form-group">
        <label class="fp-label">Email Address</label>
        <input 
          type="email" 
          id="resetEmail" 
          placeholder="Enter your email"
          class="fp-input"
          required
        />
      </div>

      <div class="fp-button-row">
        <button id="sendResetLink" class="fp-btn-primary">
          <i class="fas fa-paper-plane"></i> Send Reset Link
        </button>
        <button id="cancelReset" class="fp-btn-secondary">
          Cancel
        </button>
      </div>

      <div id="resetMessage" style="margin-top: 15px;"></div>
    </div>
  </div>

  <style>
    /* Overlay */
    .fp-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.1);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }

    /* Modal box */
    .fp-modal {
      background: var(--fp-bg);
      padding: 30px;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0,0,0,0.25);
      animation: slideUp 0.3s ease;
      transition: background 0.3s, color 0.3s;
    }
 
    /* Light Mode (Default) */
    :root {
      --fp-bg: #ffffff;
      --fp-text: #222;
      --fp-subtext: #666;
      --fp-input-bg: #ffffff;
      --fp-input-border: #ddd;
      --fp-btn-secondary-bg: #f0f0f0;
      --fp-btn-secondary-text: #333;
    }

    /* Auto Dark Mode */
    @media (prefers-color-scheme: dark) {
      /* LIGHT MODE (default) */
body.light {
  --fp-bg: #ffffff;
  --fp-text: #222222;
  --fp-subtext: #666666;
  --fp-input-bg: #ffffff;
  --fp-input-border: #dddddd;
  --fp-btn-secondary-bg: #f0f0f0;
  --fp-btn-secondary-text: #333333;
}

/* DARK MODE */
body.dark {
  --fp-bg: #1f1f1f;
  --fp-text: #f1f1f1;
  --fp-subtext: #bbbbbb;
  --fp-input-bg: #2a2a2a;
  --fp-input-border: #444444;
  --fp-btn-secondary-bg: #333333;
  --fp-btn-secondary-text: #eeeeee;
}

    .fp-title {
      margin: 0 0 10px 0;
      color: #e336cc;
      font-size: 24px;
    }

    .fp-desc {
      color: var(--fp-subtext);
      margin-bottom: 20px;
      font-size: 14px;
    }

    .fp-label {
      display: block;
      margin-bottom: 8px;
      color: var(--fp-text);
      font-weight: 500;
    }

    .fp-input {
      width: 100%;
      padding: 12px;
      border: 2px solid var(--fp-input-border);
      border-radius: 8px;
      font-size: 14px;
      background: var(--fp-input-bg);
      color: var(--fp-text);
      transition: border-color 0.3s, background 0.3s, color 0.3s;
    }

    .fp-input:focus {
      outline: none;
      border-color: #e336cc !important;
    }

    .fp-button-row {
      display: flex;
      gap: 10px;
    }

    .fp-btn-primary {
      flex: 1;
      background: #e336cc;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }

    .fp-btn-primary:hover {
      background: #c32bb3 !important;
    }

    .fp-btn-secondary {
      flex: 1;
      background: var(--fp-btn-secondary-bg);
      color: var(--fp-btn-secondary-text);
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }

    .fp-btn-secondary:hover {
      background:rgb(167, 165, 165) !important;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  </style>
`;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const modal = document.getElementById("forgotPasswordModal");
  const resetEmailInput = document.getElementById("resetEmail");
  const sendBtn = document.getElementById("sendResetLink");
  const cancelBtn = document.getElementById("cancelReset");
  const messageDiv = document.getElementById("resetMessage");

  const closeModal = () => {
    modal.style.animation = "fadeOut 0.3s ease";
    setTimeout(() => modal.remove(), 300);
  };

  cancelBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  sendBtn.addEventListener("click", async () => {
    const email = resetEmailInput.value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      messageDiv.innerHTML = `
        <div style="background: #fee; color: #c33; padding: 10px; border-radius: 6px; font-size: 13px;">
          <i class="fas fa-exclamation-circle"></i> Please enter a valid email address
        </div>
      `;
      return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        messageDiv.innerHTML = `
          <div style="background: #d4edda; color: #155724; padding: 12px; border-radius: 6px; font-size: 13px;">
            <i class="fas fa-check-circle"></i> ${data.message}
          </div>
        `;

        console.log("✅ Password reset link sent to:", email);
        setTimeout(closeModal, 3000);
      } else {
        messageDiv.innerHTML = `
          <div style="background: #fee; color: #c33; padding: 10px; border-radius: 6px; font-size: 13px;">
            <i class="fas fa-exclamation-circle"></i> ${data.message}
          </div>
        `;
      }
    } catch (error) {
      console.error("❌ Forgot password error:", error);
      messageDiv.innerHTML = `
        <div style="background: #fee; color: #c33; padding: 10px; border-radius: 6px; font-size: 13px;">
          <i class="fas fa-exclamation-circle"></i> Unable to connect to server. Please try again.
        </div>
      `;
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
    }
  });

  resetEmailInput.focus();
}

// Add CSS animation for fadeOut
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Login page loaded");

  // Initialize session monitoring
  checkExistingSession();
  initSessionActivityMonitor();
  initPeriodicSessionCheck();

  // Initialize Google Sign-In
  initializeGoogleSignIn();

  // Setup forgot password link
  const forgotLink = document.querySelector(".forgot-password");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      handleForgotPassword();
    });
  }

  console.log("📊 Session Configuration:", {
    rememberMeDays: SESSION_CONFIG.REMEMBER_ME_DAYS,
    sessionOnlyHours: SESSION_CONFIG.SESSION_ONLY_HOURS,
  });
});
window.addEventListener("load", function () {
  // Reset any loading states
  const googleBtn = document.querySelector('[data-provider="google"]');
  if (googleBtn) {
    // Remove loading class
    googleBtn.classList.remove("loading", "disabled");

    // Reset button text
    const btnText = googleBtn.querySelector(".btn-text");
    if (btnText) {
      btnText.textContent = "Continue with Google";
    }

    // Re-enable button
    googleBtn.disabled = false;

    console.log("✅ Google Sign-in button reset");
  }
});
// ===== HANDLE NAVIGATION FROM PARENT =====
window.addEventListener("message", function (event) {
  console.log("📩 Login.js received message:", event.data);

  if (event.data.action === "navigateToRegister") {
    // User clicked "Sign Up" link in login page
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          action: "switchToSignup",
        },
        "*"
      );
    } else {
      window.location.href = "registration.html";
    }
  }
});
// Also listen for when modal is opened
window.addEventListener("message", function (event) {
  if (event.data.action === "resetGoogleSignIn") {
    const googleBtn = document.querySelector('[data-provider="google"]');
    if (googleBtn) {
      googleBtn.classList.remove("loading", "disabled");
      googleBtn.disabled = false;

      const btnText = googleBtn.querySelector(".btn-text");
      if (btnText) {
        btnText.textContent = "Continue with Google";
      }
    }
  }
});

// ===== IF YOU'RE USING A GOOGLE SIGN-IN CLICK HANDLER, ADD THIS: =====

// Example Google Sign-in handler (adjust based on your implementation)
googleBtn.addEventListener("click", async function () {
  // Show loading state
  this.classList.add("loading");
  this.disabled = true;

  const btnText = this.querySelector(".btn-text");
  const originalText = btnText.textContent;
  btnText.textContent = "Signing in...";

  try {
    // Your Google Sign-in logic here
    // ...
  } catch (error) {
    console.error("Google Sign-in error:", error);

    // ✅ IMPORTANT: Reset state on error
    this.classList.remove("loading");
    this.disabled = false;
    btnText.textContent = originalText;
  }
});
