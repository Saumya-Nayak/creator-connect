const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

console.log("🔗 API Base URL:", API_BASE_URL);

// Check if already logged in
window.addEventListener("DOMContentLoaded", () => {
  checkExistingAuth();
});

function checkExistingAuth() {
  const token =
    localStorage.getItem("adminAuthToken") ||
    sessionStorage.getItem("adminAuthToken");
  const adminData =
    localStorage.getItem("adminData") || sessionStorage.getItem("adminData");

  if (token && adminData) {
    console.log("✅ Admin already authenticated, redirecting to dashboard...");
    window.location.href = "dashboard.html";
  }
}

// Form submission
document
  .getElementById("adminLoginForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    if (!email || !password) {
      showAlert("Please fill in all fields", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showAlert("Please enter a valid email address", "error");
      return;
    }

    setLoading(true);

    try {
      console.log("🔄 Attempting login to:", `${API_BASE_URL}/admin/login`);

      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      console.log("📡 Response status:", response.status);

      let data;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        console.log("📦 Response data:", data);
      } else {
        const text = await response.text();
        console.log("📄 Response text:", text);
        throw new Error("Server returned non-JSON response");
      }

      if (response.ok && data.success) {
        console.log("✅ Admin login successful");

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("adminAuthToken", data.token);
        storage.setItem("adminData", JSON.stringify(data.admin));

        showAlert("Login successful! Redirecting...", "success");

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1500);
      } else {
        console.error("❌ Login failed:", data.message);
        showAlert(data.message || "Invalid email or password", "error");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      showAlert(
        "Connection error. Please check your internet and try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  });

// Toggle password visibility
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const toggleBtn = document.querySelector(
    ".input-icon.fa-eye, .input-icon.fa-eye-slash"
  );

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleBtn.classList.remove("fa-eye");
    toggleBtn.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleBtn.classList.remove("fa-eye-slash");
    toggleBtn.classList.add("fa-eye");
  }
}

// Show alert
function showAlert(message, type = "error") {
  const alertContainer = document.getElementById("alertContainer");
  alertContainer.innerHTML = "";

  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;

  const icon = type === "error" ? "fa-exclamation-circle" : "fa-check-circle";

  alert.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            `;

  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.style.animation = "slideUp 0.3s ease";
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

// Loading state
function setLoading(isLoading) {
  const loginBtn = document.getElementById("loginBtn");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const form = document.getElementById("adminLoginForm");

  if (isLoading) {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SIGNING IN...';
    loadingOverlay.classList.add("active");
    form.querySelectorAll("input").forEach((input) => (input.disabled = true));
  } else {
    loginBtn.disabled = false;
    loginBtn.innerHTML = "LOGIN";
    loadingOverlay.classList.remove("active");
    form.querySelectorAll("input").forEach((input) => (input.disabled = false));
  }
}

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

console.log("✅ Admin authentication script loaded");
