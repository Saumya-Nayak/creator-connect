const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";
// ===== CUSTOM MODAL SYSTEM =====
function showModal(message, type = "info") {
  const existingModal = document.querySelector(".custom-modal-overlay");
  if (existingModal) {
    existingModal.remove();
  }

  const theme = localStorage.getItem("theme") || "light";

  const overlay = document.createElement("div");
  overlay.className = "custom-modal-overlay";

  const modal = document.createElement("div");
  modal.className = `custom-modal ${theme}-theme`;

  let icon = "";
  let iconClass = "";
  switch (type) {
    case "success":
      icon = "fa-check-circle";
      iconClass = "success";
      break;
    case "error":
      icon = "fa-exclamation-circle";
      iconClass = "error";
      break;
    case "warning":
      icon = "fa-exclamation-triangle";
      iconClass = "warning";
      break;
    default:
      icon = "fa-info-circle";
      iconClass = "info";
  }

  modal.innerHTML = `
    <div class="modal-icon ${iconClass}">
      <i class="fas ${icon}"></i>
    </div>
    <div class="modal-message">${message}</div>
    <button class="modal-button" onclick="closeModal()">OK</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ✅ FIX: Use requestAnimationFrame instead of setTimeout(10ms) for reliable animation triggering
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add("active");
    });
  });
}

function closeModal() {
  const overlay = document.querySelector(".custom-modal-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("custom-modal-overlay")) {
    closeModal();
  }
});

const modalStyles = document.createElement("style");
modalStyles.textContent = `
  .custom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .custom-modal-overlay.active {
    opacity: 1;
  }
  .custom-modal {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    transform: scale(0.9);
    transition: transform 0.3s ease;
    text-align: center;
  }
  .custom-modal-overlay.active .custom-modal {
    transform: scale(1);
  }
  .custom-modal.dark-theme {
    background: rgba(0, 0, 0, 0.92);
    color: rgb(255, 255, 255);
  }
  .custom-modal.light-theme {
    background: white;
    color: #1e293b;
  }
  .modal-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }
  .modal-icon.success {
    color: #10b981;
  }
  .modal-icon.error {
    color: #ef4444;
  }
  .modal-icon.warning {
    color: #f59e0b;
  }
  .modal-icon.info {
    color: #3b82f6;
  }
  .modal-message {
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 24px;
    white-space: pre-line;
  }
  .modal-button {
    background: #e336cc;
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .modal-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  .modal-button:active {
    transform: translateY(0);
  }
`;
document.head.appendChild(modalStyles);

let currentStep = 1;
const totalSteps = 4;

let otpSent = false;
let otpVerified = false;
let resendTimer = null;
let resendSeconds = 60;

let allCountriesData = [];

let credentialsLocked = false;

// ===== INITIALIZATION =====
function initDatePicker() {
  const dobInput = document.getElementById("dob");

  if (dobInput && typeof flatpickr !== "undefined") {
    flatpickr("#dob", {
      dateFormat: "Y-m-d",
      maxDate: "today",
      altInput: true,
      altFormat: "F j, Y",
      disableMobile: false,
      onChange: function (selectedDates, dateStr, instance) {
        document
          .getElementById("dob")
          .closest(".form-group")
          ?.classList.remove("invalid");
      },
    });
  }
}

function updateProgressBar() {
  const steps = document.querySelectorAll(".progress-step");
  const progressBar = document.getElementById("progressBar");

  if (!progressBar) return;

  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  progressBar.style.setProperty("--progress-width", `${percentage}%`);

  steps.forEach((step, index) => {
    const circle = step.querySelector(".step-circle");
    const label = step.querySelector(".step-label");

    if (index + 1 < currentStep) {
      circle.classList.add("completed");
      circle.classList.remove("active");
      circle.innerHTML = '<i class="fas fa-check"></i>';
    } else if (index + 1 === currentStep) {
      circle.classList.add("active");
      circle.classList.remove("completed");
      circle.textContent = index + 1;
      label.classList.add("active");
    } else {
      circle.classList.remove("active", "completed");
      circle.textContent = index + 1;
      label.classList.remove("active");
    }
  });

  progressBar.style.setProperty("--progress", percentage + "%");
}

const style = document.createElement("style");
style.textContent = `
  .progress-bar::after {
    width: var(--progress, 0%);
  }
`;
document.head.appendChild(style);

// ===== CHECK EMAIL AND USERNAME AVAILABILITY =====
async function checkAvailability(email, username) {
  try {
    const response = await fetch(`${API_BASE_URL}/check-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking availability:", error);
    return { available: true };
  }
}

// ===== NAVIGATION =====
async function nextStep() {
  if (currentStep === 1) {
    if (!validateStep(1)) {
      return;
    }

    const email = document.getElementById("email").value;
    const username = document.getElementById("username").value;

    const nextButton = document.querySelector(
      '.form-step[data-step="1"] .btn-primary'
    );
    const originalText = nextButton.textContent;
    nextButton.disabled = true;
    nextButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

    const availability = await checkAvailability(email, username);

    nextButton.disabled = false;
    nextButton.textContent = originalText;

    if (!availability.available) {
      const field = availability.field === "email" ? "Email" : "Username";
      showModal(
        `❌ ${field} Already Exists\n\n${availability.message}`,
        "error"
      );

      const fieldElement = document.getElementById(
        availability.field === "email" ? "email" : "username"
      );
      fieldElement.closest(".form-group").classList.add("invalid");

      return;
    }
  }

  if (validateStep(currentStep)) {
    if (currentStep < totalSteps) {
      document
        .querySelector(`.form-step[data-step="${currentStep}"]`)
        .classList.remove("active");
      currentStep++;
      document
        .querySelector(`.form-step[data-step="${currentStep}"]`)
        .classList.add("active");
      updateProgressBar();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

function prevStep() {
  if (currentStep > 1) {
    document
      .querySelector(`.form-step[data-step="${currentStep}"]`)
      .classList.remove("active");
    currentStep--;
    document
      .querySelector(`.form-step[data-step="${currentStep}"]`)
      .classList.add("active");
    updateProgressBar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ===== PHONE VALIDATION =====
function updatePhoneValidation() {
  const countryCodeSelect = document.getElementById("countryCode");
  const phoneInput = document.getElementById("phone");

  if (!countryCodeSelect || !phoneInput) return;

  const selectedOption =
    countryCodeSelect.options[countryCodeSelect.selectedIndex];
  const length = selectedOption.getAttribute("data-length");

  if (length && length.includes(",")) {
    const lengths = length.split(",");
    phoneInput.setAttribute("maxlength", lengths[1]);
    phoneInput.setAttribute(
      "placeholder",
      `Enter ${lengths[0]}-${lengths[1]} digit number`
    );
  } else if (length) {
    phoneInput.setAttribute("maxlength", length);
    phoneInput.setAttribute("placeholder", `Enter ${length} digit number`);
  }
}

// ===== PASSWORD VALIDATION =====
function validatePassword(passwordField, confirmPasswordField) {
  const password = passwordField.value;
  const errorElement = passwordField
    .closest(".form-group")
    .querySelector(".error");

  if (!password) {
    errorElement.textContent = "Password is required";
    passwordField.closest(".form-group").classList.add("invalid");
    return false;
  }

  if (password.length < 8 || password.length > 50) {
    errorElement.textContent = "Password must be 8-50 characters";
    passwordField.closest(".form-group").classList.add("invalid");
    return false;
  }

  if (/\s/.test(password)) {
    errorElement.textContent = "Spaces not allowed in password";
    passwordField.closest(".form-group").classList.add("invalid");
    return false;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errorElement.textContent =
      "Password must contain at least one special character (!@#$%^&*...)";
    passwordField.closest(".form-group").classList.add("invalid");
    return false;
  }

  passwordField.closest(".form-group").classList.remove("invalid");
  return true;
}

// ===== VALIDATION =====
function validateStep(step) {
  let isValid = true;

  if (step === 1) {
    const email = document.getElementById("email");
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      const emailError = email.closest(".form-group").querySelector(".error");
      emailError.textContent = "Please enter a valid email address";
      email.closest(".form-group").classList.add("invalid");
      isValid = false;
    } else {
      email.closest(".form-group").classList.remove("invalid");
    }

    if (!username.value) {
      const usernameError = username
        .closest(".form-group")
        .querySelector(".error");
      usernameError.textContent = "Username is required";
      username.closest(".form-group").classList.add("invalid");
      isValid = false;
    } else if (/\s/.test(username.value)) {
      const usernameError = username
        .closest(".form-group")
        .querySelector(".error");
      usernameError.textContent = "Spaces are not allowed in username";
      username.closest(".form-group").classList.add("invalid");
      isValid = false;
    } else if (username.value.length < 3 || username.value.length > 50) {
      const usernameError = username
        .closest(".form-group")
        .querySelector(".error");
      usernameError.textContent = "Username must be 3-50 characters";
      username.closest(".form-group").classList.add("invalid");
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.value)) {
      const usernameError = username
        .closest(".form-group")
        .querySelector(".error");
      usernameError.textContent =
        "Only letters, numbers, and underscore allowed";
      username.closest(".form-group").classList.add("invalid");
      isValid = false;
    } else {
      username.closest(".form-group").classList.remove("invalid");
    }

    isValid = validatePassword(password, confirmPassword) && isValid;

    if (password.value !== confirmPassword.value) {
      confirmPassword.closest(".form-group").classList.add("invalid");
      isValid = false;
    } else {
      confirmPassword.closest(".form-group").classList.remove("invalid");
    }
  }

  if (step === 2) {
    const fullName = document.getElementById("fullName");
    const phone = document.getElementById("phone");

    if (fullName.value.trim() !== "") {
      isValid = validateField(fullName, /^[a-zA-Z\s]+$/) && isValid;
    }

    if (phone.value.trim() !== "") {
      const countryCodeSelect = document.getElementById("countryCode");
      const selectedOption =
        countryCodeSelect.options[countryCodeSelect.selectedIndex];
      const length = selectedOption.getAttribute("data-length");

      let phoneRegex;
      if (length.includes(",")) {
        const lengths = length.split(",");
        phoneRegex = new RegExp(`^[0-9]{${lengths[0]},${lengths[1]}}$`);
      } else {
        phoneRegex = new RegExp(`^[0-9]{${length}}$`);
      }

      if (!phoneRegex.test(phone.value)) {
        phone.closest(".form-group").classList.add("invalid");
        const phoneError = document.getElementById("phoneError");
        if (phoneError) {
          phoneError.textContent = `Please enter a valid ${length} digit phone number`;
        }
        isValid = false;
      } else {
        phone.closest(".form-group").classList.remove("invalid");
      }
    }
  }

  if (step === 3) {
    const dob = document.getElementById("dob");
    const aboutMe = document.getElementById("aboutMe");

    if (dob && dob.value) {
      const selectedDate = new Date(dob.value);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      if (selectedDate > currentDate) {
        dob.closest(".form-group").classList.add("invalid");
        showModal("Date of birth cannot be in the future", "error");
        isValid = false;
      }
    }

    if (aboutMe && aboutMe.value.trim() !== "" && aboutMe.value.length > 250) {
      aboutMe.closest(".form-group").classList.add("invalid");
      showModal("About Me should not exceed 250 characters", "error");
      isValid = false;
    }
  }

  if (step === 4) {
    const terms = document.getElementById("terms");
    if (!terms.checked) {
      showModal(
        "Please accept the Terms of Service and Privacy Policy",
        "warning"
      );
      isValid = false;
    }

    if (!otpVerified) {
      showModal("Please verify your OTP before creating account", "warning");
      isValid = false;
    }
  }

  return isValid;
}

function validateField(field, regex) {
  if (!field) return false;

  const formGroup = field.closest(".form-group");
  if (field.value.trim() === "" || !regex.test(field.value)) {
    formGroup.classList.add("invalid");
    return false;
  } else {
    formGroup.classList.remove("invalid");
    return true;
  }
}

// ===== PASSWORD TOGGLE =====
function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const icon = field.nextElementSibling;

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

// ===== PREVENT PASSWORD COPY/PASTE INTO CONFIRM PASSWORD =====
function preventPasswordPaste() {
  const confirmPasswordField = document.getElementById("confirmPassword");

  if (confirmPasswordField) {
    confirmPasswordField.addEventListener("paste", (e) => {
      e.preventDefault();
      showModal(
        "You cannot paste password in confirm password field",
        "warning"
      );
    });

    confirmPasswordField.addEventListener("drop", (e) => {
      e.preventDefault();
      showModal(
        "You cannot paste password in confirm password field",
        "warning"
      );
    });
  }
}

// ===== IMAGE PREVIEW WITH CANCEL BUTTON =====
function previewImage(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("preview");
  const placeholder = document.getElementById("uploadPlaceholder");
  const cancelBtn = document.getElementById("cancelProfilePicBtn");

  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    showModal(
      "Please upload a valid image file (JPG, PNG, GIF, or WEBP).",
      "error"
    );
    event.target.value = "";
    preview.style.display = "none";
    placeholder.style.display = "flex";
    if (cancelBtn) cancelBtn.style.display = "none";
    return;
  }

  if (file.size > maxSize) {
    showModal(
      "File size exceeds 5 MB. Please choose a smaller image.",
      "error"
    );
    event.target.value = "";
    preview.style.display = "none";
    placeholder.style.display = "flex";
    if (cancelBtn) cancelBtn.style.display = "none";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    preview.src = e.target.result;
    preview.style.display = "block";
    placeholder.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "flex";
  };
  reader.readAsDataURL(file);
}

// ===== REMOVE PROFILE PICTURE =====
function removeProfilePic(event) {
  event.preventDefault();
  event.stopPropagation();

  const profilePicInput = document.getElementById("profilePic");
  const preview = document.getElementById("preview");
  const placeholder = document.getElementById("uploadPlaceholder");
  const cancelBtn = document.getElementById("cancelProfilePicBtn");

  profilePicInput.value = "";

  preview.style.display = "none";
  preview.src = "";

  placeholder.style.display = "flex";

  if (cancelBtn) cancelBtn.style.display = "none";

  console.log("Profile picture removed");
}

// ===== LOCATION FUNCTIONS =====
async function loadCountries() {
  const countrySelect = document.getElementById("country");
  try {
    const res = await fetch("js/data/countries+states+cities.json");
    const data = await res.json();
    allCountriesData = data;

    countrySelect.innerHTML = '<option value="">Select Country</option>';
    allCountriesData.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.iso2 || c.name;
      option.textContent = c.name;
      countrySelect.appendChild(option);
    });

    countrySelect.value = "IN";
    updateStates();
  } catch (err) {
    console.error("Error loading countries:", err);
    if (typeof loadFallbackCountries === "function") {
      loadFallbackCountries();
    }
  }
}

function updateStates() {
  const countrySelect = document.getElementById("country");
  let stateElement = document.getElementById("state");
  const cityElement = document.getElementById("city");

  if (!stateElement || !cityElement) return;

  const countryCode = countrySelect.value;

  if (cityElement.tagName.toLowerCase() === "select") {
    cityElement.innerHTML = `<option value="">Select City</option>`;
  } else {
    cityElement.value = "";
  }

  if (!countryCode) {
    if (stateElement.tagName.toLowerCase() === "select") {
      stateElement.innerHTML = `<option value="">Select Country First</option>`;
    } else {
      stateElement.value = "";
      stateElement.placeholder = "Select Country First";
    }
    return;
  }

  const countryData = allCountriesData.find((c) => c.iso2 === countryCode);
  if (!countryData || !countryData.states || countryData.states.length === 0) {
    if (stateElement.tagName.toLowerCase() === "select") {
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.id = "state";
      newInput.name = "state";
      newInput.className = stateElement.className;
      newInput.placeholder = "Enter your state/province";
      stateElement.replaceWith(newInput);
      stateElement = newInput;
    }
    return;
  }

  if (stateElement.tagName.toLowerCase() === "input") {
    const newSelect = document.createElement("select");
    newSelect.id = "state";
    newSelect.name = "state";
    newSelect.className = stateElement.className;
    newSelect.style.fontSize = "12px";
    newSelect.onchange = updateCities;
    stateElement.replaceWith(newSelect);
    stateElement = newSelect;
  }

  const sortedStates = [...countryData.states].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  stateElement.innerHTML = `<option value="">Select State</option>`;
  sortedStates.forEach((s) => {
    const option = document.createElement("option");
    option.value = s.name;
    option.setAttribute("data-code", s.state_code);
    option.textContent = s.name;
    stateElement.appendChild(option);
  });
}

function updateCities() {
  const countrySelect = document.getElementById("country");
  const stateSelect = document.getElementById("state");
  let cityElement = document.getElementById("city");

  if (!cityElement || !stateSelect) return;

  const countryCode = countrySelect.value;
  const stateCode = stateSelect.value;

  if (!stateCode) {
    if (cityElement.tagName.toLowerCase() === "input") {
      const newSelect = document.createElement("select");
      newSelect.id = "city";
      newSelect.name = "city";
      newSelect.style.fontSize = "12px";
      newSelect.innerHTML = `<option value="">Select State First</option>`;
      cityElement.replaceWith(newSelect);
      cityElement = newSelect;
    } else {
      cityElement.innerHTML = `<option value="">Select State First</option>`;
    }
    return;
  }

  const countryData = allCountriesData.find((c) => c.iso2 === countryCode);
  if (!countryData) return;

  const stateData = countryData.states.find((s) => s.name === stateCode);

  if (!stateData || !stateData.cities || stateData.cities.length === 0) {
    if (cityElement.tagName.toLowerCase() === "select") {
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.id = "city";
      newInput.name = "city";
      newInput.placeholder = "Enter your city";
      cityElement.replaceWith(newInput);
    }
    return;
  }

  if (cityElement.tagName.toLowerCase() === "input") {
    const newSelect = document.createElement("select");
    newSelect.id = "city";
    newSelect.name = "city";
    newSelect.style.fontSize = "12px";
    newSelect.onchange = function () {
      document
        .getElementById("city")
        .closest(".form-group")
        ?.classList.remove("invalid");
    };
    cityElement.replaceWith(newSelect);
    cityElement = newSelect;
  }

  const sortedCities = [...stateData.cities].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  cityElement.innerHTML = `<option value="">Select City</option>`;
  sortedCities.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.name;
    option.textContent = c.name;
    cityElement.appendChild(option);
  });
}

// ===== LOCK CREDENTIALS AFTER OTP =====
function lockCredentials() {
  const emailInput = document.getElementById("email");
  const usernameInput = document.getElementById("username");

  if (emailInput) {
    emailInput.disabled = true;
    emailInput.style.backgroundColor = "#f3f4f6";
    emailInput.style.cursor = "not-allowed";
    emailInput.style.opacity = "0.7";
  }

  if (usernameInput) {
    usernameInput.disabled = true;
    usernameInput.style.backgroundColor = "#f3f4f6";
    usernameInput.style.cursor = "not-allowed";
    usernameInput.style.opacity = "0.7";
  }

  credentialsLocked = true;
}

// ===== OTP FUNCTIONALITY =====
async function sendOTP() {
  const email = document.getElementById("email").value;

  if (!email) {
    showModal("Please enter your email in Step 1", "warning");
    return;
  }

  const sendButton = document.getElementById("sendOtpBtn");
  sendButton.disabled = true;
  sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    const response = await fetch(`${API_BASE_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        method: "email",
      }),
    });
    const data = await response.json();

    if (data.success) {
      otpSent = true;
      document.getElementById("otpInputSection").style.display = "block";
      sendButton.style.display = "none";
      startResendTimer();
      showModal("OTP sent successfully to your Email!", "success");
    } else {
      showModal(
        data.message || "Failed to send OTP. Please try again.",
        "error"
      );
      sendButton.disabled = false;
      sendButton.textContent = "Send OTP";
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    showModal(
      "Error sending OTP. Please check your connection and try again.",
      "error"
    );
    sendButton.disabled = false;
    sendButton.textContent = "Send OTP";
  }
}

async function verifyOTP() {
  const otpInput = document.getElementById("otpCode").value;
  const email = document.getElementById("email").value;

  if (!otpInput || otpInput.length !== 6) {
    showModal("Please enter a valid 6-digit OTP", "warning");
    return;
  }

  const verifyButton = document.getElementById("verifyOtpBtn");
  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying...";

  try {
    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        otp: otpInput,
        method: "email",
      }),
    });
    const data = await response.json();

    if (data.success) {
      otpVerified = true;
      document.getElementById("otpVerificationSection").style.display = "none";
      document.getElementById("otpSuccessMessage").style.display = "block";
      clearInterval(resendTimer);

      lockCredentials();

      showModal("OTP verified successfully! ✓", "success");
    } else {
      showModal(data.message || "Invalid OTP. Please try again.", "error");
      verifyButton.disabled = false;
      verifyButton.textContent = "Verify OTP";
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    showModal(
      "Error verifying OTP. Please check your connection and try again.",
      "error"
    );
    verifyButton.disabled = false;
    verifyButton.textContent = "Verify OTP";
  }
}

function startResendTimer() {
  resendSeconds = 60;
  const resendButton = document.getElementById("resendOtpBtn");
  resendButton.disabled = true;

  resendTimer = setInterval(() => {
    resendSeconds--;
    resendButton.textContent = `Resend OTP (${resendSeconds}s)`;

    if (resendSeconds <= 0) {
      clearInterval(resendTimer);
      resendButton.disabled = false;
      resendButton.textContent = "Resend OTP";
    }
  }, 1000);
}

function resendOTP() {
  const sendButton = document.getElementById("sendOtpBtn");
  sendButton.style.display = "block";
  document.getElementById("otpInputSection").style.display = "none";
  document.getElementById("otpCode").value = "";
  otpSent = false;
  sendOTP();
}

// ===== FORM SUBMISSION =====
// ✅ FIX: Track submission state to prevent double submissions
let isSubmitting = false;

function initFormSubmit() {
  const form = document.getElementById("registrationForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // ✅ FIX 1: Guard against double submissions
    if (isSubmitting) {
      console.warn("⚠️ Submission already in progress, ignoring duplicate");
      return;
    }

    if (validateStep(4)) {
      const submitButton = document.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;

      // ✅ FIX 2: Set flag AND disable button together before any async work
      isSubmitting = true;
      submitButton.disabled = true;
      submitButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

      let registrationSuccess = false; // ✅ FIX 3: Track success separately

      try {
        const formData = new FormData();
        formData.append("email", document.getElementById("email").value);
        formData.append("user_name", document.getElementById("username").value);
        formData.append("password", document.getElementById("password").value);
        formData.append(
          "full_name",
          document.getElementById("fullName").value || ""
        );
        formData.append(
          "about_me",
          document.getElementById("aboutMe").value || ""
        );

        const phone = document.getElementById("phone").value;
        if (phone) {
          formData.append(
            "phone",
            document.getElementById("countryCode").value + phone
          );
        }

        const countrySelect = document.getElementById("country");
        const countryName =
          countrySelect.options[countrySelect.selectedIndex].text;
        if (countryName && countryName !== "Select Country") {
          formData.append("country", countryName);
        }
        formData.append("state", document.getElementById("state").value || "");
        formData.append("city", document.getElementById("city").value || "");

        const gender = document.querySelector(
          'input[name="gender"]:checked'
        )?.value;
        if (gender) formData.append("gender", gender);

        const dob = document.getElementById("dob").value;
        if (dob) formData.append("date_of_birth", dob);

        formData.append(
          "is_private",
          document.querySelector('input[name="privacy"]:checked').value
        );
        formData.append("otp_verified", otpVerified.toString());
        formData.append("verification_method", "email");

        const profilePicInput = document.getElementById("profilePicInput");

        if (window.regProfilePicBlob) {
          formData.append(
            "profilePic",
            window.regProfilePicBlob,
            "profile.jpg"
          );
          console.log("✅ Using cropped profile picture blob");
        } else if (
          profilePicInput &&
          profilePicInput.files &&
          profilePicInput.files[0]
        ) {
          formData.append("profilePic", profilePicInput.files[0]);
          console.log("⚠️ Using original profile picture file (not cropped)");
        }

        const response = await fetch(`${API_BASE_URL}/register`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          console.log("✅ Registration successful! User ID:", data.user_id);
          registrationSuccess = true; // ✅ FIX 4: Mark success BEFORE showing modal
          showRegistrationSuccessModal();
        } else {
          showModal(
            "❌ Registration Failed\n\n" +
              (data.message || "Please try again later."),
            "error"
          );
        }
      } catch (error) {
        console.error("Registration error:", error);
        showModal(
          "❌ Registration Failed\n\nUnable to connect to server. Please check your connection and try again.",
          "error"
        );
      } finally {
        // ✅ FIX 5: Only re-enable button if registration FAILED
        // On success, the modal handles navigation — no need to re-enable
        if (!registrationSuccess) {
          isSubmitting = false;
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
        // If success: button stays disabled so user can't resubmit while modal is open
      }
    }
  });
}

function showRegistrationSuccessModal() {
  console.log("🎉 Showing registration success modal");

  // ✅ FIX: Remove any existing success modal before creating a new one
  const existingModal = document.querySelector(".registration-success-modal");
  if (existingModal) {
    existingModal.remove();
  }

  const theme = localStorage.getItem("theme") || "light";

  const overlay = document.createElement("div");
  overlay.className = "registration-success-modal";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  const modal = document.createElement("div");
  modal.className = `reg-success-content ${theme}-theme`;
  modal.style.cssText = `
    background: ${theme === "dark" ? "#1f2937" : "white"};
    border-radius: 20px;
    padding: 40px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
    transform: scale(0.8);
    transition: transform 0.3s ease;
    text-align: center;
    color: ${theme === "dark" ? "#f9fafb" : "#1e293b"};
  `;

  modal.innerHTML = `
    <div style="font-size: 80px; color: #10b981; margin-bottom: 20px; animation: successBounce 0.6s ease;">
      <i class="fas fa-check-circle"></i>
    </div>
    <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 15px; color: ${
      theme === "dark" ? "#fff" : "#1e293b"
    };">
      🎉 Account Created!
    </h2>
    <p style="font-size: 16px; color: ${
      theme === "dark" ? "#d1d5db" : "#64748b"
    }; margin-bottom: 30px; line-height: 1.6;">
      Welcome aboard! Your account has been successfully created.<br>
      Please login with your credentials to get started.
    </p>
    <button id="proceedToLoginBtn" style="
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 16px 40px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(16, 185, 129, 0.3)'">
      <i class="fas fa-sign-in-alt"></i>
      Login Now
    </button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  if (!document.getElementById("regSuccessAnimStyle")) {
    const animStyle = document.createElement("style");
    animStyle.id = "regSuccessAnimStyle";
    animStyle.textContent = `
      @keyframes successBounce {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(animStyle);
  }

  // ✅ FIX: Use requestAnimationFrame for reliable animation triggering
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      modal.style.transform = "scale(1)";
    });
  });

  // ✅ FIX: Use addEventListener with { once: true } to prevent multiple handler attachments
  const loginBtn = document.getElementById("proceedToLoginBtn");
  loginBtn.addEventListener("click", handleRegistrationComplete, {
    once: true,
  });

  // ✅ FIX: Block clicks on overlay — success modal should only close via the button
  overlay.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent accidental dismissal
  });
}

// ===== HANDLE REGISTRATION COMPLETE =====
function handleRegistrationComplete() {
  console.log("🔤 User clicked Login Now - proceeding to login");

  // ✅ FIX: Reset submission state when navigating away
  isSubmitting = false;

  const modal = document.querySelector(".registration-success-modal");
  if (modal) {
    modal.style.opacity = "0";
    setTimeout(() => modal.remove(), 300);
  }

  const regForm = document.getElementById("registrationForm");
  if (regForm) regForm.reset();

  // Reset OTP state
  otpSent = false;
  otpVerified = false;
  credentialsLocked = false;

  currentStep = 1;
  updateProgressBar();
  document
    .querySelectorAll(".form-step")
    .forEach((step) => step.classList.remove("active"));
  const firstStep = document.querySelector('.form-step[data-step="1"]');
  if (firstStep) firstStep.classList.add("active");

  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        action: "closeSignupAndOpenLogin",
        message: "Registration successful! Please login with your credentials.",
      },
      "*"
    );
  } else {
    window.location.href = "login.html";
  }
}

// ===== CONVERT CITY INPUT TO SELECT ON LOAD =====
function convertCityToSelect() {
  let cityElement = document.getElementById("city");

  if (cityElement && cityElement.tagName.toLowerCase() === "input") {
    const newSelect = document.createElement("select");
    newSelect.id = "city";
    newSelect.name = "city";
    newSelect.style.fontSize = "12px";
    newSelect.className = cityElement.className;
    newSelect.innerHTML = `<option value="">Select City</option>`;
    newSelect.onchange = function () {
      document
        .getElementById("city")
        .closest(".form-group")
        ?.classList.remove("invalid");
    };
    cityElement.replaceWith(newSelect);
  }
}

// ===== DOM CONTENT LOADED =====
document.addEventListener("DOMContentLoaded", function () {
  console.log("Initializing registration form...");

  const aboutMe = document.getElementById("aboutMe");
  const charCount = document.getElementById("charCount");

  convertCityToSelect();
  updateProgressBar();
  loadCountries();
  updatePhoneValidation();
  preventPasswordPaste();
  initDatePicker();
  initFormSubmit();

  const countrySelect = document.getElementById("country");
  if (countrySelect) {
    countrySelect.addEventListener("change", function () {
      updateStates();
    });
  }

  if (aboutMe && charCount) {
    aboutMe.addEventListener("input", function () {
      charCount.textContent = this.value.length;

      if (this.value.length > 250) {
        charCount.style.color = "#ef4444";
      } else {
        charCount.style.color = "#999";
      }
    });
  }

  document.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", function () {
      this.closest(".form-group")?.classList.remove("invalid");
    });
  });

  console.log("Registration form initialized successfully");
});

function switchToLogin() {
  console.log("🔄 Switching to login page");

  if (window.parent && window.parent !== window) {
    console.log("📤 Sending messages to parent to switch modals");

    window.parent.postMessage(
      {
        action: "closeSignupModal",
      },
      "*"
    );

    setTimeout(() => {
      window.parent.postMessage(
        {
          action: "openLoginModal",
        },
        "*"
      );
    }, 300);
  } else {
    window.location.href = "login.html";
  }
}
