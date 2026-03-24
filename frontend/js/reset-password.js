const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

// ===== THEME INITIALIZATION =====
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.body.classList.remove("light", "dark");
  document.body.classList.add(savedTheme);
  console.log("🎨 Theme initialized:", savedTheme);
}

// Listen for theme changes
window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(e.newValue);
    console.log("🎨 Theme changed to:", e.newValue);
  }
});

// Initialize theme on load
initTheme();

// ===== CUSTOM POPUP FUNCTIONS =====
function showPopup(title, message, type = "error") {
  const popup = document.getElementById("customPopup");
  const header = document.getElementById("popupHeader");
  const titleEl = document.getElementById("popupTitle");
  const messageEl = document.getElementById("popupMessage");

  // Set content
  titleEl.textContent = title;
  messageEl.textContent = message;

  // Set icon based on type
  header.className = `popup-header ${type}`;

  let icon = "fa-exclamation-circle";
  if (type === "success") {
    icon = "fa-check-circle";
  } else if (type === "info") {
    icon = "fa-info-circle";
  } else if (type === "error") {
    icon = "fa-exclamation-circle";
  }

  header.innerHTML = `
    <i class="fas ${icon}"></i>
    <div class="popup-title">${title}</div>
  `;

  // Show popup
  popup.classList.add("active");
}

function closePopup() {
  const popup = document.getElementById("customPopup");
  popup.classList.remove("active");
}

// Close popup on overlay click
document.getElementById("customPopup").addEventListener("click", function (e) {
  if (e.target === this) {
    closePopup();
  }
});

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get("token");

// Toggle password visibility
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling;

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

// Show message
function showMessage(message, type = "error") {
  const messageBox = document.getElementById("messageBox");
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
}

// Password strength checker
function checkPasswordStrength(password) {
  let strength = 0;
  const strengthBar = document.getElementById("strengthBar");
  const strengthText = document.getElementById("strengthText");

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;

  const strengthPercent = (strength / 5) * 100;
  strengthBar.style.width = strengthPercent + "%";

  if (strength <= 2) {
    strengthBar.style.background = "#dc3545";
    strengthText.textContent = "Weak password";
    strengthText.style.color = "#dc3545";
  } else if (strength <= 3) {
    strengthBar.style.background = "#ffc107";
    strengthText.textContent = "Medium password";
    strengthText.style.color = "#ffc107";
  } else {
    strengthBar.style.background = "#28a745";
    strengthText.textContent = "Strong password";
    strengthText.style.color = "#28a745";
  }
}

// Add password strength checker
document.getElementById("newPassword").addEventListener("input", function () {
  checkPasswordStrength(this.value);
});

// Verify token on page load
async function verifyToken() {
  if (!resetToken) {
    showPopup(
      "Invalid Token",
      "Invalid or missing reset token. Please request a new password reset link.",
      "error"
    );
    document.getElementById("resetPasswordForm").style.display = "none";
    return false;
  }

  document.getElementById("loadingOverlay").classList.add("active");

  try {
    const response = await fetch(`${API_BASE_URL}/verify-reset-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: resetToken }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ Token verified successfully");
      return true;
    } else {
      showPopup(
        "Invalid Token",
        data.message || "Invalid or expired reset link",
        "error"
      );
      document.getElementById("resetPasswordForm").style.display = "none";
      return false;
    }
  } catch (error) {
    console.error("❌ Token verification error:", error);
    showPopup(
      "Connection Error",
      "Unable to verify reset link. Please try again.",
      "error"
    );
    document.getElementById("resetPasswordForm").style.display = "none";
    return false;
  } finally {
    document.getElementById("loadingOverlay").classList.remove("active");
  }
}

// Handle form submission
document
  .getElementById("resetPasswordForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // ===== VALIDATION =====

    // Check password length
    if (newPassword.length < 8 || newPassword.length > 50) {
      showPopup(
        "Invalid Password",
        "Password must be between 8 and 50 characters long",
        "error"
      );
      return;
    }

    // Check for spaces
    if (newPassword.includes(" ")) {
      showPopup("Invalid Password", "Password cannot contain spaces", "error");
      return;
    }

    // Check for special characters
    const specialCharPattern = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/;
    if (!specialCharPattern.test(newPassword)) {
      showPopup(
        "Invalid Password",
        "Password must contain at least one special character",
        "error"
      );
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      showPopup("Passwords Mismatch", "Passwords do not match", "error");
      return;
    }

    // ===== SUBMIT PASSWORD RESET =====

    const resetBtn = document.getElementById("resetBtn");
    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage(
          "✅ Password reset successfully! Redirecting to login...",
          "success"
        );
        showPopup(
          "Success!",
          "Password reset successfully! Redirecting to home page...",
          "success"
        );

        console.log(
          "✅ Password reset successful - redirecting to home with login modal"
        );

        // ===== REDIRECT TO HOME.HTML WITH LOGIN MODAL =====
        setTimeout(() => {
          window.location.href = "/frontend/home.html?openLogin=true";
        }, 2000);
      } else {
        showPopup(
          "Reset Failed",
          data.message || "Failed to reset password",
          "error"
        );
        resetBtn.disabled = false;
        resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset Password';
      }
    } catch (error) {
      console.error("❌ Password reset error:", error);
      showPopup(
        "Connection Error",
        "Unable to connect to server. Please try again.",
        "error"
      );
      resetBtn.disabled = false;
      resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset Password';
    }
  });

// Verify token when page loads
window.addEventListener("DOMContentLoaded", () => {
  verifyToken();
});
