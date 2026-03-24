// =====================================================================
// upload.js — FINAL
// FIX 3: autofillServiceLocation() — pre-fills service address from profile
// FIX 4: onShippingAvailableChange() — shows pickup fields when shipping unchecked
// FIX 5: Conditional required validation for delivery charge fields
//         Product: Flat Charge required for flat; Base+PerKm required for per_km
//         Service: Full Address required for at_provider/both
//                  Base Travel Fee + Per KM Rate required for doorstep/both
//                  Travel fee CAN be 0 (free doorstep)
// =====================================================================

let currentStep = 1;
const totalSteps = 5;
let selectedPostType = "showcase";
let mediaFile = null;
let croppedMediaFile = null;
let cropper = null;

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

let allCategories = {};

// ── Slot builder state ─────────────────────────────────────────────────
let _serviceSlots = [];

// ===== CUSTOM MODAL =====
function showModal(title, message, type = "info") {
  const existingModal = document.querySelector(".custom-modal-overlay");
  if (existingModal) existingModal.remove();
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal-box">
      <div class="custom-modal-icon ${type}">
        <i class="fas ${
          type === "error"
            ? "fa-exclamation-circle"
            : type === "success"
            ? "fa-check-circle"
            : "fa-info-circle"
        }"></i>
      </div>
      <h3 class="custom-modal-title">${title}</h3>
      <p class="custom-modal-message">${message}</p>
      <button class="custom-modal-btn" onclick="closeCustomModal()">OK</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("show"), 10);
}

function closeCustomModal() {
  const modal = document.querySelector(".custom-modal-overlay");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 300);
  }
}
window.closeCustomModal = closeCustomModal;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const preloader = document.getElementById("preloader");
    if (preloader) preloader.classList.add("hidden");
  }, 1000);

  loadHeader();
  loadSidebar();
  initializePostTypeSelector();
  initializeMediaUpload();
  initializeFormListeners();
  loadCategories();
  updateStepDisplay();

  setTimeout(() => {
    detectAndSetPostType();
  }, 500);

  document
    .querySelectorAll('input[name="serviceLocationType"]')
    .forEach((radio) => {
      radio.addEventListener("change", updateServiceLocationFields);
    });
  updateServiceLocationFields();
});

function loadHeader() {
  fetch("header.html")
    .then((r) => r.text())
    .then((data) => {
      document.getElementById("header").innerHTML = data;
      const script = document.createElement("script");
      script.src = "js/header.js";
      document.body.appendChild(script);
    });
}

function loadSidebar() {
  fetch("sidebar.html")
    .then((r) => r.text())
    .then((data) => {
      document.getElementById("sidebar").innerHTML = data;
      const script = document.createElement("script");
      script.src = "js/sidebar.js";
      script.onload = () => {
        if (typeof window.updateSidebar === "function") window.updateSidebar();
      };
      document.body.appendChild(script);
    });
}

// ===== STEP NAVIGATION =====
function changeStep(direction) {
  const newStep = currentStep + direction;
  if (direction > 0 && !validateCurrentStep()) return;
  if (newStep >= 1 && newStep <= totalSteps) {
    currentStep = newStep;
    updateStepDisplay();
    if (currentStep === 5) generateReviewContent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
window.changeStep = changeStep;

function updateStepDisplay() {
  document.querySelectorAll(".step-item").forEach((item, index) => {
    const stepNum = index + 1;
    item.classList.remove("active", "completed");
    if (stepNum < currentStep) item.classList.add("completed");
    else if (stepNum === currentStep) item.classList.add("active");
  });

  document
    .querySelectorAll(".step-content")
    .forEach((content) => content.classList.remove("active"));
  const activeContent = document.querySelector(
    `.step-content[data-step="${currentStep}"]`
  );
  if (activeContent) activeContent.classList.add("active");

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const publishBtn = document.getElementById("publishBtn");

  if (prevBtn) prevBtn.style.display = currentStep === 1 ? "none" : "flex";
  if (currentStep === totalSteps) {
    nextBtn.classList.add("hidden");
    publishBtn.classList.remove("hidden");
  } else {
    nextBtn.classList.remove("hidden");
    publishBtn.classList.add("hidden");
  }
}

function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2();
    case 3:
      return validateStep3();
    case 4:
      return validateStep4();
    default:
      return true;
  }
}

function validateStep1() {
  if (!selectedPostType) {
    showModal("Post Type Required", "Please select a post type.", "error");
    return false;
  }
  return true;
}
function validateStep2() {
  if (!mediaFile && !croppedMediaFile) {
    showModal(
      "Media Required",
      "Please upload an image or video for your post.",
      "error"
    );
    return false;
  }
  return true;
}
function validateStep3() {
  const caption = document.getElementById("caption").value.trim();
  const categoryId = document.getElementById("category").value;
  if (!caption) {
    showModal(
      "Caption Required",
      "Please write a caption for your post.",
      "error"
    );
    return false;
  }
  if (caption.length < 3) {
    showModal(
      "Caption Too Short",
      "Caption must be at least 3 characters long.",
      "error"
    );
    return false;
  }
  if (!categoryId) {
    showModal(
      "Category Required",
      "Please select a category for your post.",
      "error"
    );
    return false;
  }
  return true;
}
function validateStep4() {
  if (selectedPostType === "service") return validateServiceFields();
  if (selectedPostType === "product") return validateProductFields();
  return true;
}

// =====================================================================
// SERVICE VALIDATION — FIX 5
// =====================================================================
function validateServiceFields() {
  const title = document.getElementById("serviceTitle").value.trim();
  const price = document.getElementById("servicePrice").value;
  const shortDesc = document.getElementById("serviceShortDesc").value.trim();
  const email = document.getElementById("serviceEmail").value.trim();
  const phone = document.getElementById("servicePhone").value.trim();
  const locType =
    document.querySelector('input[name="serviceLocationType"]:checked')
      ?.value || "online";

  // ── Core required fields ──────────────────────────────────────────────────
  if (!title) {
    showModal(
      "Service Title Required",
      "Please enter a service title.",
      "error"
    );
    return false;
  }
  if (price === "" || price === null || parseFloat(price) < 0) {
    showModal(
      "Valid Price Required",
      "Please enter a valid price (0 = quote on request).",
      "error"
    );
    return false;
  }
  if (!shortDesc) {
    showModal(
      "Description Required",
      "Please enter a short description.",
      "error"
    );
    return false;
  }
  if (!email) {
    showModal("Email Required", "Please enter your contact email.", "error");
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showModal("Invalid Email", "Please enter a valid email address.", "error");
    return false;
  }
  if (!phone) {
    showModal(
      "Phone Required",
      "Please enter your phone / WhatsApp number.",
      "error"
    );
    return false;
  }
  if (!/^[\d\s\-\+\(\)]{10,}$/.test(phone)) {
    showModal(
      "Invalid Phone",
      "Please enter a valid phone number (at least 10 digits).",
      "error"
    );
    return false;
  }

  // ── Location-type conditional validation ──────────────────────────────────

  // at_provider / both — Full Address is required
  if (locType === "at_provider" || locType === "both") {
    const address = document
      .getElementById("serviceProviderAddress")
      ?.value.trim();
    if (!address) {
      showModal(
        "Address Required",
        "Please enter your full service address — it will be shown to customers as a Google Maps link.",
        "error"
      );
      return false;
    }

    // City or State also required so the map link is meaningful
    const city = document.getElementById("serviceProviderCity")?.value.trim();
    const state = document.getElementById("serviceProviderState")?.value.trim();
    if (!city && !state) {
      showModal(
        "City / State Required",
        "Please select at least a city or state for your service location.",
        "error"
      );
      return false;
    }
  }

  // doorstep / both — Base Travel Fee AND Per KM Rate are required
  // (both can be 0 — meaning free doorstep service — but must be explicitly entered)
  if (locType === "doorstep" || locType === "both") {
    const baseFeeEl = document.getElementById("doorstepBaseFee");
    const perKmEl = document.getElementById("doorstepPerKm");
    const baseFee = baseFeeEl?.value;
    const perKm = perKmEl?.value;

    // Field must exist and not be blank (0 is fine)
    if (baseFee === "" || baseFee === null || baseFee === undefined) {
      showModal(
        "Base Travel Fee Required",
        "Please enter a Base Travel Fee (₹). You can enter 0 for free doorstep service.",
        "error"
      );
      return false;
    }
    if (parseFloat(baseFee) < 0) {
      showModal(
        "Invalid Base Travel Fee",
        "Base Travel Fee cannot be negative.",
        "error"
      );
      return false;
    }

    if (perKm === "" || perKm === null || perKm === undefined) {
      showModal(
        "Per KM Rate Required",
        "Please enter a Per KM Rate (₹/km). You can enter 0 if you don't charge per km.",
        "error"
      );
      return false;
    }
    if (parseFloat(perKm) < 0) {
      showModal(
        "Invalid Per KM Rate",
        "Per KM Rate cannot be negative.",
        "error"
      );
      return false;
    }

    // Pincode required for distance calculation
    const pincode = document
      .getElementById("serviceDoorstepPincode")
      ?.value.trim();
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      showModal(
        "Pincode Required",
        "Please enter your valid 6-digit pincode so delivery distances can be calculated.",
        "error"
      );
      return false;
    }
  }

  return true;
}

// =====================================================================
// PRODUCT VALIDATION — FIX 5
// =====================================================================
function validateProductFields() {
  const title = document.getElementById("productTitle").value.trim();
  const price = document.getElementById("productPrice").value;
  const stock = document.getElementById("productStock").value;
  const shortDesc = document.getElementById("productShortDesc").value.trim();

  // ── Core required fields ──────────────────────────────────────────────────
  if (!title) {
    showModal(
      "Product Title Required",
      "Please enter a product title.",
      "error"
    );
    return false;
  }
  if (!price || parseFloat(price) <= 0) {
    showModal(
      "Valid Price Required",
      "Please enter a valid product price.",
      "error"
    );
    return false;
  }
  if (stock === "" || parseInt(stock) < 0) {
    showModal(
      "Valid Stock Required",
      "Please enter a valid stock quantity.",
      "error"
    );
    return false;
  }
  if (!shortDesc) {
    showModal(
      "Description Required",
      "Please enter a short description.",
      "error"
    );
    return false;
  }

  // ── Fulfillment-mode conditional validation ───────────────────────────────
  // _fulfillmentMode is defined in the inline script in upload.html
  const mode =
    typeof _fulfillmentMode !== "undefined" ? _fulfillmentMode : "shipping";

  // SHIPPING mode — seller pincode + delivery charge fields
  if (mode === "shipping" || mode === "both") {
    const pin = document.getElementById("sellerPincode")?.value.trim();
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      showModal(
        "Seller Pincode Required",
        "Please enter your valid 6-digit seller pincode — it is used to calculate delivery distance and charges.",
        "error"
      );
      return false;
    }

    const chargeType =
      document.querySelector('input[name="deliveryChargeType"]:checked')
        ?.value || "flat";

    if (chargeType === "flat") {
      const flatCharge = document.getElementById("baseDeliveryCharge")?.value;
      if (
        flatCharge === "" ||
        flatCharge === null ||
        flatCharge === undefined
      ) {
        showModal(
          "Flat Delivery Charge Required",
          "Please enter the flat delivery charge (₹). Enter 0 for free shipping.",
          "error"
        );
        return false;
      }
      if (parseFloat(flatCharge) < 0) {
        showModal(
          "Invalid Flat Charge",
          "Delivery charge cannot be negative.",
          "error"
        );
        return false;
      }
    }

    if (chargeType === "per_km") {
      const baseKm = document.getElementById("baseDeliveryChargeKm")?.value;
      if (baseKm === "" || baseKm === null || baseKm === undefined) {
        showModal(
          "Base Charge Required",
          "Please enter the Base Charge (₹) for per-km delivery. Enter 0 if there is no base charge.",
          "error"
        );
        return false;
      }
      if (parseFloat(baseKm) < 0) {
        showModal(
          "Invalid Base Charge",
          "Base delivery charge cannot be negative.",
          "error"
        );
        return false;
      }

      const perKm = document.getElementById("perKmRate")?.value;
      if (perKm === "" || perKm === null || perKm === undefined) {
        showModal(
          "Per KM Rate Required",
          "Please enter the Per KM Rate (₹/km). Enter 0 if you charge a flat base only.",
          "error"
        );
        return false;
      }
      if (parseFloat(perKm) < 0) {
        showModal(
          "Invalid Per KM Rate",
          "Per KM rate cannot be negative.",
          "error"
        );
        return false;
      }
    }
    // "free" type — no extra fields required
  }

  // PICKUP mode — at least city or pincode
  if (mode === "pickup" || mode === "both") {
    const pickupCity = document.getElementById("pickupCity")?.value.trim();
    const pickupPincode = document
      .getElementById("pickupPincode")
      ?.value.trim();
    if (!pickupCity && !pickupPincode) {
      showModal(
        "Pickup Location Required",
        "Please enter at least a pickup city or pincode so buyers know where to collect their order.",
        "error"
      );
      return false;
    }
  }

  return true;
}

// ===== POST TYPE SELECTION =====
function initializePostTypeSelector() {
  document.querySelectorAll(".type-card").forEach((card) => {
    card.addEventListener("click", () => {
      document
        .querySelectorAll(".type-card")
        .forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedPostType = card.dataset.type;
      updateStep4Content();
    });
  });
}

function updateStep4Content() {
  const showcaseTags = document.getElementById("showcaseTags");
  const showcaseMessage = document.getElementById("showcaseMessage");
  const serviceFields = document.getElementById("serviceFields");
  const productFields = document.getElementById("productFields");
  const step4Desc = document.getElementById("step4Description");

  [showcaseTags, showcaseMessage, serviceFields, productFields].forEach((el) =>
    el?.classList.add("hidden")
  );

  if (selectedPostType === "showcase") {
    showcaseTags?.classList.remove("hidden");
    showcaseMessage?.classList.remove("hidden");
    if (step4Desc) step4Desc.textContent = "Showcase posts are almost ready!";
  } else if (selectedPostType === "service") {
    serviceFields?.classList.remove("hidden");
    if (step4Desc)
      step4Desc.textContent = "Add your service details and pricing";
    setTimeout(() => _initSlotBuilder(), 50);
    setTimeout(() => autofillServiceLocation(), 400);
  } else if (selectedPostType === "product") {
    productFields?.classList.remove("hidden");
    if (step4Desc)
      step4Desc.textContent = "Complete your product listing information";
  }

  populateCategories(selectedPostType);
}

// =====================================================================
// FIX 3: SERVICE LOCATION AUTOFILL FROM PROFILE
// =====================================================================
async function autofillServiceLocation() {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) return;

  const cityEl = document.getElementById("serviceProviderCity");
  const stateEl = document.getElementById("serviceProviderState");
  if (cityEl && cityEl.value) return;

  try {
    const res = await fetch(`${API_BASE_URL}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success) return;
    const p = data.user || data.profile || data;

    if (p.city && cityEl) cityEl.value = p.city;
    if (p.state && stateEl) stateEl.value = p.state;

    const pincodeEl = document.getElementById("serviceProviderPincode");
    if (p.pincode && pincodeEl && !pincodeEl.value) pincodeEl.value = p.pincode;

    const addressEl = document.getElementById("serviceProviderAddress");
    if (p.address && addressEl && !addressEl.value) addressEl.value = p.address;

    console.log("✅ Service location autofilled from profile");
  } catch (e) {
    console.warn("autofillServiceLocation failed:", e);
  }
}
window.autofillServiceLocation = autofillServiceLocation;

// =====================================================================
// FIX 4: SHIPPING TOGGLE
// =====================================================================
function onShippingAvailableChange(checkbox) {
  const shippingDetails = document.getElementById("shippingDetails");
  const pickupDetails = document.getElementById("productPickupDetails");
  if (checkbox.checked) {
    if (shippingDetails) shippingDetails.style.display = "block";
    if (pickupDetails) pickupDetails.style.display = "none";
  } else {
    if (shippingDetails) shippingDetails.style.display = "none";
    if (pickupDetails) pickupDetails.style.display = "block";
  }
}
window.onShippingAvailableChange = onShippingAvailableChange;

// ===== CATEGORIES =====
async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories/all-organized`);
    const data = await response.json();
    if (data.success) {
      allCategories = data.categories;
      populateCategories(selectedPostType);
    } else {
      showModal(
        "Error",
        "Failed to load categories. Please refresh the page.",
        "error"
      );
    }
  } catch {
    showModal(
      "Error",
      "Failed to load categories. Please refresh the page.",
      "error"
    );
  }
}

function populateCategories(postType) {
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  if (!categorySelect) return;
  categorySelect.innerHTML = '<option value="">-- Select Category --</option>';
  subcategorySelect.innerHTML =
    '<option value="">-- Select Subcategory --</option>';
  (allCategories[postType] || []).forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.category_id;
    option.textContent = `${cat.icon || ""} ${cat.category_name}`.trim();
    option.dataset.subcategories = JSON.stringify(cat.subcategories || []);
    categorySelect.appendChild(option);
  });
}

function populateSubcategories(categoryId) {
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  if (!subcategorySelect || !categorySelect) return;
  subcategorySelect.innerHTML =
    '<option value="">-- Select Subcategory --</option>';
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];
  if (!selectedOption?.dataset.subcategories) return;
  try {
    JSON.parse(selectedOption.dataset.subcategories).forEach((sub) => {
      const option = document.createElement("option");
      option.value = sub.subcategory_id;
      option.textContent = sub.subcategory_name;
      subcategorySelect.appendChild(option);
    });
  } catch (e) {
    console.error("Error parsing subcategories:", e);
  }
}

// ===== MEDIA UPLOAD & CROPPING =====
function initializeMediaUpload() {
  const uploadArea = document.getElementById("mediaUploadArea");
  const mediaInput = document.getElementById("mediaInput");
  const cropBtn = document.getElementById("cropBtn");

  if (uploadArea && mediaInput) {
    uploadArea.addEventListener("click", () => mediaInput.click());
    mediaInput.addEventListener("change", (e) => {
      if (e.target.files[0]) handleMediaUpload(e.target.files[0]);
    });
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragleave", () =>
      uploadArea.classList.remove("dragover")
    );
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove("dragover");
      if (e.dataTransfer.files[0]) handleMediaUpload(e.dataTransfer.files[0]);
    });
  }
  if (cropBtn) cropBtn.addEventListener("click", openCropModal);
}

function handleMediaUpload(file) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
  ];
  const maxSize = 50 * 1024 * 1024;
  if (!allowedTypes.includes(file.type)) {
    showModal(
      "Invalid File Type",
      "Please use JPG, PNG, GIF, WebP, MP4, or WebM.",
      "error"
    );
    return;
  }
  if (file.size > maxSize) {
    showModal("File Too Large", "File size exceeds 50MB limit.", "error");
    return;
  }

  mediaFile = file;
  croppedMediaFile = null;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById("mediaPreview");
    const uploadArea = document.getElementById("mediaUploadArea");
    const cropBtn = document.getElementById("cropBtn");
    if (file.type.startsWith("image/")) {
      const imagePreview = document.getElementById("imagePreview");
      imagePreview.src = e.target.result;
      imagePreview.classList.remove("hidden");
      document.getElementById("videoPreview").classList.add("hidden");
      if (cropBtn) cropBtn.style.display = "flex";
    } else {
      const videoPreview = document.getElementById("videoPreview");
      videoPreview.src = e.target.result;
      videoPreview.classList.remove("hidden");
      document.getElementById("imagePreview").classList.add("hidden");
      if (cropBtn) cropBtn.style.display = "none";
    }
    preview.classList.remove("hidden");
    uploadArea.classList.add("hidden");
    document.getElementById("fileInfo").textContent = `${file.name} (${(
      file.size /
      (1024 * 1024)
    ).toFixed(2)} MB)`;
  };
  reader.onerror = () =>
    showModal("Error", "Error reading file. Please try again.", "error");
  reader.readAsDataURL(file);
}

function removeMedia() {
  mediaFile = null;
  croppedMediaFile = null;
  document.getElementById("mediaInput").value = "";
  document.getElementById("mediaPreview").classList.add("hidden");
  document.getElementById("mediaUploadArea").classList.remove("hidden");
  document.getElementById("imagePreview").classList.add("hidden");
  document.getElementById("videoPreview").classList.add("hidden");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}
window.removeMedia = removeMedia;

// ===== CROP FUNCTIONALITY =====
function openCropModal() {
  const imagePreview = document.getElementById("imagePreview");
  const cropModal = document.getElementById("cropModal");
  const cropImage = document.getElementById("cropImage");
  if (!imagePreview?.src) {
    showModal("No Image", "Please upload an image first.", "error");
    return;
  }
  cropImage.src = imagePreview.src;
  cropModal.classList.add("active");
  if (cropper) cropper.destroy();
  cropper = new Cropper(cropImage, {
    aspectRatio: NaN,
    viewMode: 1,
    autoCropArea: 1,
    responsive: true,
    background: false,
    rotatable: true,
    scalable: true,
    zoomable: true,
  });
}
function closeCropModal() {
  document.getElementById("cropModal").classList.remove("active");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}
window.closeCropModal = closeCropModal;

function rotateCrop(degree) {
  if (cropper) cropper.rotate(degree);
}
window.rotateCrop = rotateCrop;

function flipCrop(direction) {
  if (!cropper) return;
  if (direction === "horizontal")
    cropper.scaleX(-cropper.getData().scaleX || -1);
  else cropper.scaleY(-cropper.getData().scaleY || -1);
}
window.flipCrop = flipCrop;

function resetCrop() {
  if (cropper) cropper.reset();
}
window.resetCrop = resetCrop;

function applyCrop() {
  if (!cropper) return;
  cropper.getCroppedCanvas().toBlob((blob) => {
    const fileName = mediaFile.name.replace(/\.[^/.]+$/, "") + "_cropped.jpg";
    croppedMediaFile = new File([blob], fileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("imagePreview").src = e.target.result;
      document.getElementById("fileInfo").textContent = `${fileName} (${(
        blob.size /
        (1024 * 1024)
      ).toFixed(2)} MB) - Cropped`;
    };
    reader.readAsDataURL(blob);
    closeCropModal();
    showModal("Success", "Image cropped successfully!", "success");
  }, "image/jpeg");
}
window.applyCrop = applyCrop;

// ===== FORM LISTENERS =====
function initializeFormListeners() {
  const captionInput = document.getElementById("caption");
  if (captionInput)
    captionInput.addEventListener("input", (e) => {
      document.getElementById("charCount").textContent = e.target.value.length;
    });

  [
    "serviceShortDesc",
    "serviceFullDesc",
    "productShortDesc",
    "productFullDesc",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
      el.addEventListener("input", (e) => {
        const countEl = document.getElementById(id + "Count");
        if (countEl) countEl.textContent = e.target.value.length;
      });
  });

  const categorySelect = document.getElementById("category");
  if (categorySelect)
    categorySelect.addEventListener("change", (e) =>
      populateSubcategories(e.target.value)
    );

  const includesRevisions = document.getElementById("includesRevisions");
  const revisionsDetails = document.getElementById("revisionsDetails");
  if (includesRevisions && revisionsDetails)
    includesRevisions.addEventListener("change", (e) => {
      revisionsDetails.classList.toggle("hidden", !e.target.checked);
    });

  const requiresBooking = document.getElementById("requiresBooking");
  const bookingDetails = document.getElementById("bookingDetails");
  if (requiresBooking && bookingDetails)
    requiresBooking.addEventListener("change", (e) => {
      bookingDetails.classList.toggle("hidden", !e.target.checked);
    });

  const shippingAvailable = document.getElementById("shippingAvailable");
  const shippingDetails = document.getElementById("shippingDetails");
  const pickupDetails = document.getElementById("productPickupDetails");
  if (shippingAvailable) {
    if (shippingDetails)
      shippingDetails.style.display = shippingAvailable.checked
        ? "block"
        : "none";
    if (pickupDetails)
      pickupDetails.style.display = shippingAvailable.checked
        ? "none"
        : "block";
  }

  const form = document.getElementById("postForm");
  if (form)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitPost();
    });

  ["baseDeliveryChargeKm", "perKmRate", "deliveryMaxKm"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateDeliveryPreview);
  });

  updateDeliveryFields();
}

// ===== REVIEW GENERATION =====
function generateReviewContent() {
  const reviewContent = document.getElementById("reviewContent");
  if (!reviewContent) return;
  try {
    let html = "";

    html += `<div class="review-section"><h3><i class="fas fa-image"></i> Media</h3><div class="review-media">`;
    const imagePreview = document.getElementById("imagePreview");
    const videoPreview = document.getElementById("videoPreview");
    if (
      imagePreview &&
      !imagePreview.classList.contains("hidden") &&
      imagePreview.src
    )
      html += `<img src="${imagePreview.src}" alt="Post Media">`;
    else if (
      videoPreview &&
      !videoPreview.classList.contains("hidden") &&
      videoPreview.src
    )
      html += `<video src="${videoPreview.src}" controls></video>`;
    html += `</div></div>`;

    html += `<div class="review-section"><h3><i class="fas fa-tag"></i> Post Type</h3><div class="review-item"><span class="review-label">Type:</span><span class="review-value">${
      { showcase: "Showcase", service: "Service", product: "Product" }[
        selectedPostType
      ]
    }</span></div></div>`;

    const caption = document.getElementById("caption").value;
    const category = document.getElementById("category");
    const subcategory = document.getElementById("subcategory");
    const privacy = document.querySelector('input[name="privacy"]:checked');
    html += `
    <div class="review-section">
      <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
      <div class="review-item"><span class="review-label">Caption:</span><span class="review-value">${caption}</span></div>
      <div class="review-item"><span class="review-label">Category:</span><span class="review-value">${
        category.options[category.selectedIndex]?.text || "N/A"
      }</span></div>
      ${
        subcategory.value
          ? `<div class="review-item"><span class="review-label">Subcategory:</span><span class="review-value">${
              subcategory.options[subcategory.selectedIndex]?.text || "N/A"
            }</span></div>`
          : ""
      }
      <div class="review-item"><span class="review-label">Privacy:</span><span class="review-value">${
        privacy?.value === "public" ? "Public" : "Followers Only"
      }</span></div>
    </div>`;

    if (selectedPostType === "service") html += generateServiceReview();
    else if (selectedPostType === "product") html += generateProductReview();
    else if (selectedPostType === "showcase") {
      const tags = document.getElementById("tags").value;
      if (tags)
        html += `<div class="review-section"><h3><i class="fas fa-tags"></i> Tags</h3><div class="review-item"><span class="review-value">${tags}</span></div></div>`;
    }

    reviewContent.innerHTML = html;
  } catch (e) {
    console.error("❌ generateReviewContent error:", e);
    reviewContent.innerHTML = `<div style="padding:20px;color:#ef4444;background:rgba(239,68,68,.08);border-radius:10px;border:1px solid rgba(239,68,68,.3)"><strong>Review could not be generated.</strong><br><small style="color:#6b7280">${e.message}</small></div>`;
  }
}

function _getServiceLocationLabel() {
  const locType =
    document.querySelector('input[name="serviceLocationType"]:checked')
      ?.value || "online";
  return (
    {
      online: "Online / Remote",
      at_provider: "At My Location",
      doorstep: "I Travel to Customer (Doorstep)",
      both: "Both — At Location & Doorstep",
    }[locType] || "Online / Remote"
  );
}

function generateServiceReview() {
  const title = document.getElementById("serviceTitle").value;
  const price = document.getElementById("servicePrice").value;
  const duration = document.getElementById("serviceDuration").value;
  const deliveryTime = document.getElementById("deliveryTime").value;
  const shortDesc = document.getElementById("serviceShortDesc").value;
  const email = document.getElementById("serviceEmail").value;
  const phone = document.getElementById("servicePhone").value;

  let html = `
    <div class="review-section">
      <h3><i class="fas fa-briefcase"></i> Service Details</h3>
      <div class="review-item"><span class="review-label">Title:</span><span class="review-value">${title}</span></div>
      <div class="review-item"><span class="review-label">Starting Price:</span><span class="review-value">₹${
        price ? parseFloat(price).toFixed(2) : "0.00"
      }</span></div>
      <div class="review-item"><span class="review-label">Service Type:</span><span class="review-value">${_getServiceLocationLabel()}</span></div>
      ${
        duration
          ? `<div class="review-item"><span class="review-label">Duration:</span><span class="review-value">${duration}</span></div>`
          : ""
      }
      ${
        deliveryTime
          ? `<div class="review-item"><span class="review-label">Delivery Time:</span><span class="review-value">${deliveryTime}</span></div>`
          : ""
      }
      <div class="review-item"><span class="review-label">Description:</span><span class="review-value">${shortDesc}</span></div>
      <div class="review-item"><span class="review-label">Contact Email:</span><span class="review-value">${email}</span></div>
      <div class="review-item"><span class="review-label">Phone:</span><span class="review-value">${phone}</span></div>
    </div>`;

  const locType =
    document.querySelector('input[name="serviceLocationType"]:checked')
      ?.value || "online";
  if (locType !== "online") {
    const svcAddress = document
      .getElementById("serviceProviderAddress")
      ?.value.trim();
    const svcCity = document
      .getElementById("serviceProviderCity")
      ?.value.trim();
    const svcState = document
      .getElementById("serviceProviderState")
      ?.value.trim();
    const svcPin = document
      .getElementById("serviceProviderPincode")
      ?.value.trim();
    const svcRadius = document.getElementById("serviceRadiusKm")?.value;
    const addrParts = [svcAddress, svcCity, svcState, svcPin].filter(Boolean);
    if (addrParts.length > 0) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        addrParts.join(", ")
      )}`;
      html += `
        <div class="review-section">
          <h3><i class="fas fa-map-marker-alt"></i> Service Location</h3>
          ${
            svcAddress
              ? `<div class="review-item"><span class="review-label">Address:</span><span class="review-value">${svcAddress}</span></div>`
              : ""
          }
          ${
            svcCity || svcState
              ? `<div class="review-item"><span class="review-label">City / State:</span><span class="review-value">${[
                  svcCity,
                  svcState,
                ]
                  .filter(Boolean)
                  .join(", ")}</span></div>`
              : ""
          }
          ${
            svcPin
              ? `<div class="review-item"><span class="review-label">Pincode:</span><span class="review-value">${svcPin}</span></div>`
              : ""
          }
          ${
            svcRadius && parseInt(svcRadius) > 0
              ? `<div class="review-item"><span class="review-label">Service Radius:</span><span class="review-value">${svcRadius} km</span></div>`
              : ""
          }
          <div class="review-item"><span class="review-label">Map:</span><span class="review-value"><a href="${mapsUrl}" target="_blank" style="color:var(--primary-purple);font-weight:600;text-decoration:none"><i class="fas fa-map-marked-alt" style="margin-right:4px"></i>Open in Google Maps</a></span></div>
        </div>`;
    }
    const baseFee = document.getElementById("doorstepBaseFee")?.value;
    const perKm = document.getElementById("doorstepPerKm")?.value;
    if (locType === "doorstep" || locType === "both") {
      html += `
        <div class="review-section">
          <h3><i class="fas fa-car"></i> Travel / Doorstep Charges</h3>
          <div class="review-item"><span class="review-label">Base Fee:</span><span class="review-value">₹${parseFloat(
            baseFee || 0
          ).toFixed(0)} ${
        parseFloat(baseFee || 0) === 0 ? "(Free)" : ""
      }</span></div>
          <div class="review-item"><span class="review-label">Per KM Rate:</span><span class="review-value">₹${parseFloat(
            perKm || 0
          ).toFixed(1)}/km ${
        parseFloat(perKm || 0) === 0 ? "(No per-km charge)" : ""
      }</span></div>
        </div>`;
    }
  }

  html += _generateSlotReviewHtml();
  if (typeof generateVariantReviewHtml === "function")
    html += generateVariantReviewHtml();

  return html;
}

function generateProductReview() {
  const title = document.getElementById("productTitle").value;
  const price = document.getElementById("productPrice").value;
  const stock = document.getElementById("productStock").value;
  const condition = document.getElementById("productCondition");
  const shortDesc = document.getElementById("productShortDesc").value;
  const shippingAvailable =
    document.getElementById("shippingAvailable").checked;
  const mode =
    typeof _fulfillmentMode !== "undefined" ? _fulfillmentMode : "shipping";

  let html = `
    <div class="review-section">
      <h3><i class="fas fa-shopping-bag"></i> Product Details</h3>
      <div class="review-item"><span class="review-label">Title:</span><span class="review-value">${title}</span></div>
      <div class="review-item"><span class="review-label">Price:</span><span class="review-value">₹${parseFloat(
        price
      ).toFixed(2)}</span></div>
      <div class="review-item"><span class="review-label">Stock:</span><span class="review-value">${stock} units</span></div>
      <div class="review-item"><span class="review-label">Condition:</span><span class="review-value">${
        condition.options[condition.selectedIndex]?.text || "N/A"
      }</span></div>
      <div class="review-item"><span class="review-label">Description:</span><span class="review-value">${shortDesc}</span></div>
      <div class="review-item"><span class="review-label">Fulfillment:</span><span class="review-value">${
        mode === "pickup"
          ? "Pickup Only"
          : mode === "both"
          ? "Shipping & Pickup"
          : "Shipping"
      }</span></div>
    </div>`;

  if (mode === "shipping" || mode === "both") {
    const chargeTypeVal = document.querySelector(
      'input[name="deliveryChargeType"]:checked'
    )?.value;
    const chargeLabels = {
      flat: "Flat Rate",
      per_km: "Per KM (Dynamic)",
      free: "Free Shipping",
    };
    const sellerPin = document.getElementById("sellerPincode")?.value;
    html += `<div class="review-item"><span class="review-label">Delivery Type:</span><span class="review-value">${
      chargeLabels[chargeTypeVal] || "Not set"
    }</span></div>`;
    if (sellerPin)
      html += `<div class="review-item"><span class="review-label">Seller Pincode:</span><span class="review-value">${sellerPin}</span></div>`;
    if (chargeTypeVal === "flat") {
      const flatCharge =
        document.getElementById("baseDeliveryCharge")?.value || "0";
      html += `<div class="review-item"><span class="review-label">Flat Charge:</span><span class="review-value">₹${parseFloat(
        flatCharge
      ).toFixed(2)} ${
        parseFloat(flatCharge) === 0 ? "(Free)" : ""
      }</span></div>`;
    } else if (chargeTypeVal === "per_km") {
      const base =
        document.getElementById("baseDeliveryChargeKm")?.value || "0";
      const perKm = document.getElementById("perKmRate")?.value || "0";
      const maxKm = document.getElementById("deliveryMaxKm")?.value || "0";
      html += `<div class="review-item"><span class="review-label">Delivery Formula:</span><span class="review-value">₹${base} base + ₹${perKm}/km (max ${maxKm} km)</span></div>`;
    }
  }

  if (mode === "pickup" || mode === "both") {
    const pickupAddress = document
      .getElementById("pickupAddress")
      ?.value.trim();
    const pickupCity = document.getElementById("pickupCity")?.value.trim();
    const pickupState = document.getElementById("pickupState")?.value.trim();
    const pickupPincode = document
      .getElementById("pickupPincode")
      ?.value.trim();
    const pickupParts = [
      pickupAddress,
      pickupCity,
      pickupState,
      pickupPincode,
    ].filter(Boolean);
    if (pickupParts.length > 0) {
      html += `
        <div class="review-section">
          <h3><i class="fas fa-store"></i> Pickup Location</h3>
          <div class="review-item"><span class="review-value">${pickupParts.join(
            ", "
          )}</span></div>
        </div>`;
    }
  }

  return html;
}

// ===== FORM DATA GATHERING =====
function gatherFormData() {
  const formData = new FormData();
  formData.append("media", croppedMediaFile || mediaFile);
  formData.append("caption", document.getElementById("caption").value.trim());
  formData.append("post_type", selectedPostType);
  formData.append(
    "privacy",
    document.querySelector('input[name="privacy"]:checked').value
  );
  formData.append("category_id", document.getElementById("category").value);
  const subcategoryId = document.getElementById("subcategory").value;
  if (subcategoryId) formData.append("subcategory_id", subcategoryId);
  if (selectedPostType === "showcase") gatherShowcaseData(formData);
  else if (selectedPostType === "service") gatherServiceData(formData);
  else if (selectedPostType === "product") gatherProductData(formData);
  return formData;
}

function gatherShowcaseData(formData) {
  const tags = document.getElementById("tags").value.trim();
  if (tags) formData.append("tags", tags);
}

function gatherServiceData(formData) {
  formData.append(
    "title",
    document.getElementById("serviceTitle").value.trim()
  );
  formData.append(
    "price",
    parseFloat(document.getElementById("servicePrice").value)
  );
  formData.append("currency", "INR");

  const duration = document.getElementById("serviceDuration").value.trim();
  if (duration) formData.append("service_duration", duration);
  const deliveryTime = document.getElementById("deliveryTime").value.trim();
  if (deliveryTime) formData.append("service_delivery_time", deliveryTime);

  const includesRevisions =
    document.getElementById("includesRevisions").checked;
  formData.append("includes_revisions", includesRevisions);
  if (includesRevisions) {
    const maxRevisions = document.getElementById("maxRevisions").value;
    if (maxRevisions) formData.append("max_revisions", parseInt(maxRevisions));
  }

  const requiresBooking = document.getElementById("requiresBooking").checked;
  formData.append("requires_advance_booking", requiresBooking);
  if (requiresBooking) {
    const bookingDays = document.getElementById("bookingNoticeDays").value;
    if (bookingDays)
      formData.append("booking_notice_days", parseInt(bookingDays));
  }

  formData.append(
    "short_description",
    document.getElementById("serviceShortDesc").value.trim()
  );
  const fullDesc = document.getElementById("serviceFullDesc").value.trim();
  if (fullDesc) formData.append("full_description", fullDesc);
  const features = document.getElementById("serviceFeatures").value.trim();
  if (features) formData.append("features", features);

  formData.append(
    "contact_email",
    document.getElementById("serviceEmail").value.trim()
  );
  formData.append(
    "contact_phone",
    document.getElementById("servicePhone").value.trim()
  );

  gatherServiceVariantsAndLocation(formData);
}

function gatherProductData(formData) {
  formData.append(
    "product_title",
    document.getElementById("productTitle").value.trim()
  );
  formData.append(
    "price",
    parseFloat(document.getElementById("productPrice").value)
  );
  formData.append("currency", "INR");
  formData.append(
    "stock",
    parseInt(document.getElementById("productStock").value)
  );
  formData.append(
    "condition_type",
    document.getElementById("productCondition").value
  );

  const brand = document.getElementById("productBrand").value.trim();
  if (brand) formData.append("brand", brand);
  const sku = document.getElementById("productSku").value.trim();
  if (sku) formData.append("sku", sku);

  formData.append(
    "short_description",
    document.getElementById("productShortDesc").value.trim()
  );
  const fullDesc = document.getElementById("productFullDesc").value.trim();
  if (fullDesc) formData.append("full_description", fullDesc);
  const features = document.getElementById("productFeatures").value.trim();
  if (features) formData.append("features", features);

  const returnPolicy = document.getElementById("returnPolicy").value.trim();
  if (returnPolicy) formData.append("return_policy", returnPolicy);
  formData.append("accepts_cod", document.getElementById("productCOD").checked);

  const shippingAvailable =
    document.getElementById("shippingAvailable").checked;
  formData.append("shipping_available", shippingAvailable);

  if (shippingAvailable) {
    const sellerPincode = document.getElementById("sellerPincode").value.trim();
    if (sellerPincode) formData.append("seller_pincode", sellerPincode);
    const deliveryDays = document.getElementById("deliveryDays").value;
    if (deliveryDays && parseInt(deliveryDays) > 0)
      formData.append("estimated_delivery_days", parseInt(deliveryDays));
    const maxKm = document.getElementById("deliveryMaxKm")?.value;
    if (maxKm && parseInt(maxKm) > 0)
      formData.append("delivery_max_km", parseInt(maxKm));

    const chargeType =
      document.querySelector('input[name="deliveryChargeType"]:checked')
        ?.value || "flat";
    formData.append("delivery_charge_type", chargeType);

    if (chargeType === "flat") {
      const baseCharge = document.getElementById("baseDeliveryCharge").value;
      formData.append("base_delivery_charge", parseFloat(baseCharge) || 0);
      formData.append("shipping_cost", parseFloat(baseCharge) || 0);
      const threshold = document.getElementById("freeShippingThreshold").value;
      if (threshold)
        formData.append("free_shipping_threshold", parseFloat(threshold));
    } else if (chargeType === "per_km") {
      const baseKm = document.getElementById("baseDeliveryChargeKm").value;
      formData.append("base_delivery_charge", parseFloat(baseKm) || 0);
      const perKm = document.getElementById("perKmRate").value;
      formData.append("per_km_rate", parseFloat(perKm) || 0);
    } else if (chargeType === "free") {
      formData.append("base_delivery_charge", "0");
      formData.append("shipping_cost", "0");
    }
  } else {
    const pickupAddress = document
      .getElementById("pickupAddress")
      ?.value.trim();
    const pickupCity = document.getElementById("pickupCity")?.value.trim();
    const pickupState = document.getElementById("pickupState")?.value.trim();
    const pickupPincode = document
      .getElementById("pickupPincode")
      ?.value.trim();
    if (pickupAddress) formData.append("pickup_address", pickupAddress);
    if (pickupCity) formData.append("pickup_city", pickupCity);
    if (pickupState) formData.append("pickup_state", pickupState);
    if (pickupPincode) formData.append("pickup_pincode", pickupPincode);
  }
}

// ===== SUBMIT POST =====
async function submitPost() {
  if (!validateCurrentStep()) return;
  const form = document.getElementById("postForm");
  const submitBtn = document.getElementById("publishBtn");
  if (form) form.style.pointerEvents = "none";
  if (submitBtn) submitBtn.disabled = true;
  showLoadingModal();

  try {
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!authToken) {
      hideLoadingModal();
      if (form) form.style.pointerEvents = "auto";
      if (submitBtn) submitBtn.disabled = false;
      showModal(
        "Authentication Required",
        "You must be logged in to create a post.",
        "error"
      );
      return;
    }

    const formData = gatherFormData();
    const response = await fetch(`${API_BASE_URL}/create-post`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    const data = await response.json();
    hideLoadingModal();

    if (data.success) {
      const postTypeText =
        selectedPostType === "service"
          ? "Service"
          : selectedPostType === "product"
          ? "Product"
          : "Showcase";
      showModal(
        "Success!",
        `🎉 ${postTypeText} Post Published Successfully!\n\nRedirecting to home page...`,
        "success"
      );
      setTimeout(() => {
        window.location.replace("home.html");
      }, 2000);
    } else {
      if (form) form.style.pointerEvents = "auto";
      if (submitBtn) submitBtn.disabled = false;
      showModal(
        "Error",
        data.message || "Failed to create post. Please try again.",
        "error"
      );
    }
  } catch (error) {
    hideLoadingModal();
    if (form) form.style.pointerEvents = "auto";
    if (submitBtn) submitBtn.disabled = false;
    showModal(
      "Error",
      "Error creating post. Please check your connection and try again.",
      "error"
    );
  }
}

function showLoadingModal() {
  const m = document.getElementById("loadingModal");
  if (m) m.classList.add("show");
}
function hideLoadingModal() {
  const m = document.getElementById("loadingModal");
  if (m) m.classList.remove("show");
}

// ===== THEME SYNC =====
function syncTheme() {
  document.documentElement.setAttribute(
    "data-theme",
    localStorage.getItem("theme") || "light"
  );
}
window.addEventListener("load", syncTheme);
window.addEventListener("storage", (e) => {
  if (e.key === "theme") syncTheme();
});

// ===== AUTO-DETECT POST TYPE FROM URL =====
function detectAndSetPostType() {
  const typeParam = new URLSearchParams(window.location.search).get("type");
  if (typeParam && ["showcase", "service", "product"].includes(typeParam)) {
    document.querySelectorAll(".type-card").forEach((card) => {
      if (card.dataset.type === typeParam) {
        card.classList.add("selected");
        selectedPostType = typeParam;
        updateStep4Content();
      } else {
        card.classList.remove("selected");
      }
    });
  }
}

// ===== DELIVERY FIELDS =====
function updateDeliveryFields() {
  const type =
    document.querySelector('input[name="deliveryChargeType"]:checked')?.value ||
    "flat";
  const flatFields = document.getElementById("flatRateFields");
  const perKmFields = document.getElementById("perKmFields");
  const freeNote = document.getElementById("freeShippingNote");
  const previewWrap = document.getElementById("deliveryPreviewWrap");

  if (flatFields) flatFields.style.display = type === "flat" ? "grid" : "none";
  if (perKmFields)
    perKmFields.style.display = type === "per_km" ? "grid" : "none";
  if (freeNote) freeNote.style.display = type === "free" ? "block" : "none";
  if (previewWrap)
    previewWrap.style.display = type === "per_km" ? "block" : "none";

  const hint = document.getElementById("maxKmHint");
  if (hint) {
    if (type === "per_km")
      hint.innerHTML = `<span style="color:#ef4444;font-weight:600">Hard limit</span> — buyers beyond this distance <strong>cannot place an order</strong>. Set 0 for unlimited.`;
    else if (type === "flat")
      hint.innerHTML = `<span style="color:#f59e0b;font-weight:600">Advisory only</span> — buyers beyond this see a warning but <strong>can still order</strong>. Set 0 for no restriction.`;
    else if (type === "free")
      hint.innerHTML = `<span style="color:#f59e0b;font-weight:600">Advisory only</span> — free shipping everywhere. Set 0 for no restriction.`;
  }
  updateDeliveryPreview();
}

function updateDeliveryPreview() {
  const previewEl = document.getElementById("deliveryPreviewText");
  if (!previewEl) return;
  const type =
    document.querySelector('input[name="deliveryChargeType"]:checked')?.value ||
    "flat";
  if (type !== "per_km") return;
  const maxKm = parseInt(document.getElementById("deliveryMaxKm")?.value || 0);
  const baseDays = parseInt(
    document.getElementById("deliveryDays")?.value || 0
  );
  const base = parseFloat(
    document.getElementById("baseDeliveryChargeKm")?.value || 0
  );
  const perKm = parseFloat(document.getElementById("perKmRate")?.value || 0);

  if (base === 0 && perKm === 0) {
    previewEl.textContent = "Enter base charge + per km rate to see preview";
    return;
  }

  const examples = [5, 10, 25, 50, 100, 200].filter(
    (km) => !maxKm || km <= maxKm
  );
  const lines = examples.map((km) => {
    const charge = base + km * perKm;
    const etaDays =
      baseDays > 0
        ? baseDays + Math.floor(km / 200) + (km < 30 ? 0 : km < 500 ? 1 : 2)
        : "?";
    return `${km} km → ₹${charge.toFixed(0)} · ~${etaDays}d`;
  });
  if (maxKm > 0) lines.push(`> ${maxKm} km → ❌ Not deliverable`);
  if (baseDays === 0)
    lines.push(`⚠️ Set "Delivery Time (days)" to show ETA estimates`);
  previewEl.innerHTML = lines.join(" &nbsp;&nbsp;|&nbsp;&nbsp; ");
}

// =====================================================================
// VARIANT BUILDER
// =====================================================================
let serviceVariants = [];

function updateServiceLocationFields() {
  const type =
    document.querySelector('input[name="serviceLocationType"]:checked')
      ?.value || "online";
  const onlineNote = document.getElementById("serviceOnlineNote");
  const locationBlock = document.getElementById("serviceLocationBlock");
  const doorstepBlock = document.getElementById("serviceDoorstepBlock");
  if (onlineNote)
    onlineNote.style.display = type === "online" ? "block" : "none";
  if (locationBlock)
    locationBlock.style.display = ["at_provider", "both"].includes(type)
      ? "block"
      : "none";
  if (doorstepBlock)
    doorstepBlock.style.display = ["doorstep", "both"].includes(type)
      ? "block"
      : "none";
}
window.updateServiceLocationFields = updateServiceLocationFields;

function addVariantRow(prefill = {}) {
  const container = document.getElementById("variantRows");
  if (!container) return;
  const idx = container.children.length;
  const row = document.createElement("div");
  row.className = "variant-row";
  row.dataset.idx = idx;
  row.innerHTML = `
    <div class="variant-row-header">
      <span class="variant-number">Package ${idx + 1}</span>
      <button type="button" class="variant-remove-btn" onclick="removeVariantRow(this)" title="Remove"><i class="fas fa-times"></i></button>
    </div>
    <div class="variant-grid">
      <div class="form-group">
        <label class="form-label">Package Name *</label>
        <input type="text" class="form-input variant-name" placeholder="e.g. Both hands full mehndi" maxlength="200" value="${escSafe(
          prefill.name || ""
        )}" />
      </div>
      <div class="form-group">
        <label class="form-label">Price (₹) *</label>
        <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:8px;padding:8px 12px;background:var(--input-bg)">
          <span style="color:var(--primary);font-weight:600">₹</span>
          <input type="number" class="variant-price" placeholder="e.g. 1000" min="0" step="1" value="${
            prefill.price || ""
          }" style="border:none;background:transparent;outline:none;width:100%;color:var(--text-primary)" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Duration (hours)</label>
        <input type="number" class="form-input variant-duration" placeholder="e.g. 2" min="0.5" step="0.5" value="${
          prefill.duration_hours || ""
        }" />
      </div>
      <div class="form-group full-width">
        <label class="form-label">Description <small style="font-weight:400;color:var(--text-secondary)">(optional)</small></label>
        <input type="text" class="form-input variant-desc" placeholder="e.g. Includes fingers, wrist design" maxlength="500" value="${escSafe(
          prefill.description || ""
        )}" />
      </div>
    </div>`;
  container.appendChild(row);
  renumberVariantRows();
}
window.addVariantRow = addVariantRow;

function removeVariantRow(btn) {
  const row = btn.closest(".variant-row");
  if (row) {
    row.remove();
    renumberVariantRows();
  }
}
window.removeVariantRow = removeVariantRow;

function renumberVariantRows() {
  document.querySelectorAll("#variantRows .variant-row").forEach((row, i) => {
    const label = row.querySelector(".variant-number");
    if (label) label.textContent = `Package ${i + 1}`;
    row.dataset.idx = i;
  });
}

function collectVariants() {
  serviceVariants = [];
  document.querySelectorAll("#variantRows .variant-row").forEach((row) => {
    const name = row.querySelector(".variant-name")?.value.trim() || "";
    const price = row.querySelector(".variant-price")?.value.trim() || "";
    const desc = row.querySelector(".variant-desc")?.value.trim() || "";
    const dur = row.querySelector(".variant-duration")?.value.trim() || "";
    if (!name || !price) return;
    serviceVariants.push({
      name,
      price: parseFloat(price),
      description: desc || null,
      duration_hours: dur ? parseFloat(dur) : null,
    });
  });
  return serviceVariants;
}

function gatherServiceVariantsAndLocation(formData) {
  const variants = collectVariants();
  if (variants.length > 0) {
    formData.append("price_variants", JSON.stringify(variants));
    console.log(`📦 Appended ${variants.length} variant(s)`);
  }

  const locType =
    document.querySelector('input[name="serviceLocationType"]:checked')
      ?.value || "online";
  formData.append("service_location_type", locType);
  formData.append(
    "service_mode",
    {
      online: "online",
      at_provider: "offline",
      doorstep: "offline",
      both: "both",
    }[locType] || "online"
  );

  if (["at_provider", "both"].includes(locType)) {
    const address =
      document.getElementById("serviceProviderAddress")?.value.trim() || "";
    const city =
      document.getElementById("serviceProviderCity")?.value.trim() || "";
    const state =
      document.getElementById("serviceProviderState")?.value.trim() || "";
    const pincode =
      document.getElementById("serviceProviderPincode")?.value.trim() || "";
    const radius = document.getElementById("serviceRadiusKm")?.value || "0";
    if (address) formData.append("service_address", address);
    if (city) formData.append("service_city", city);
    if (state) formData.append("service_state", state);
    if (pincode) formData.append("service_pincode", pincode);
    formData.append("service_radius_km", parseInt(radius) || 0);
  }

  if (["doorstep", "both"].includes(locType)) {
    const baseFee = document.getElementById("doorstepBaseFee")?.value || "0";
    const perKm = document.getElementById("doorstepPerKm")?.value || "0";
    const pincode =
      document.getElementById("serviceDoorstepPincode")?.value.trim() || "";
    const radius =
      document.getElementById("serviceDoorstepRadius")?.value || "0";
    // Always send fees (even if 0 — meaning free doorstep)
    formData.append("doorstep_base_fee", parseFloat(baseFee) || 0);
    formData.append("doorstep_per_km", parseFloat(perKm) || 0);
    if (pincode && !formData.has("service_pincode"))
      formData.append("service_pincode", pincode);
    formData.append("service_radius_km", parseInt(radius) || 0);
  }

  _gatherSlots(formData);
  console.log(`📍 service_location_type: ${locType}`);
}
window.gatherServiceVariantsAndLocation = gatherServiceVariantsAndLocation;

function generateVariantReviewHtml() {
  const variants = collectVariants();
  if (variants.length === 0) return "";
  const rows = variants
    .map(
      (v) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border)">${escHtmlSafe(
        v.name
      )}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;font-weight:700">₹${v.price.toFixed(
        0
      )}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-secondary)">${
        v.duration_hours ? v.duration_hours + "h" : "—"
      }</td>
    </tr>`
    )
    .join("");
  return `
    <div class="review-section">
      <h3><i class="fas fa-tags"></i> Pricing Packages</h3>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <thead><tr style="background:var(--bg-secondary)"><th style="padding:8px 12px;text-align:left;border-bottom:2px solid var(--border)">Package</th><th style="padding:8px 12px;text-align:right;border-bottom:2px solid var(--border)">Price</th><th style="padding:8px 12px;border-bottom:2px solid var(--border)">Duration</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
window.generateVariantReviewHtml = generateVariantReviewHtml;

// =====================================================================
// SLOT BUILDER
// =====================================================================

function _fmt12(hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function _initSlotBuilder() {
  if (document.getElementById("slotBuilderBlock")) return;
  const serviceFields = document.getElementById("serviceFields");
  if (!serviceFields) return;

  const block = document.createElement("div");
  block.id = "slotBuilderBlock";
  block.style.cssText = "margin-top:20px";
  block.innerHTML = `
    <div style="border:1px solid var(--border-purple,#f889e5);border-radius:14px;overflow:hidden">
      <div style="background:linear-gradient(135deg,rgba(230,10,234,.12),rgba(230,10,234,.04));padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:700;font-size:.95rem;color:var(--text-primary)">
            <i class="fas fa-clock" style="color:var(--primary-purple);margin-right:8px"></i>Time Slots
          </div>
          <div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">
            Define available time slots. Buyers will pick from these.
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.85rem;font-weight:600">
          <input type="checkbox" id="slotEnabled" onchange="onSlotEnabledChange(this)"
                 style="width:16px;height:16px;accent-color:var(--primary-purple)">
          Enable Slots
        </label>
      </div>

      <div id="slotBuilderBody" style="display:none;padding:16px">
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.85rem">
            <input type="radio" name="slotGenMethod" value="manual" checked
                   onchange="onSlotGenMethodChange()" style="accent-color:var(--primary-purple)">
            Add slots manually
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.85rem">
            <input type="radio" name="slotGenMethod" value="auto"
                   onchange="onSlotGenMethodChange()" style="accent-color:var(--primary-purple)">
            Auto-generate from range
          </label>
        </div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <label style="font-size:.85rem;font-weight:600;color:var(--text-secondary);white-space:nowrap">
            <i class="fas fa-hourglass-half" style="color:var(--primary-purple);margin-right:4px"></i>
            Duration per slot:
          </label>
          <select id="slotDurationMins"
                  style="padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);
                         background:var(--bg-secondary);color:var(--text-primary);font-size:.88rem">
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60" selected>1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
            <option value="180">3 hours</option>
            <option value="240">4 hours</option>
            <option value="0">Custom / varies</option>
          </select>
        </div>

        <div id="slotManualInput">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <input type="time" id="manualSlotTime"
                   style="padding:8px 12px;border-radius:8px;border:1px solid var(--border-color);
                          background:var(--bg-secondary);color:var(--text-primary);font-size:.9rem;flex:1" />
            <button type="button" onclick="addManualSlot()"
                    style="padding:8px 16px;background:var(--primary-purple,#e60aea);color:white;
                           border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer">
              <i class="fas fa-plus"></i> Add Slot
            </button>
          </div>
        </div>

        <div id="slotAutoInput" style="display:none">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
            <div>
              <label style="font-size:.8rem;font-weight:600;color:var(--text-secondary)">From</label>
              <input type="time" id="slotRangeFrom" value="09:00"
                     style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border-color);
                            background:var(--bg-secondary);color:var(--text-primary);font-size:.88rem;margin-top:4px">
            </div>
            <div>
              <label style="font-size:.8rem;font-weight:600;color:var(--text-secondary)">To</label>
              <input type="time" id="slotRangeTo" value="18:00"
                     style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border-color);
                            background:var(--bg-secondary);color:var(--text-primary);font-size:.88rem;margin-top:4px">
            </div>
            <div>
              <label style="font-size:.8rem;font-weight:600;color:var(--text-secondary)">Interval</label>
              <select id="slotInterval"
                      style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border-color);
                             background:var(--bg-secondary);color:var(--text-primary);font-size:.88rem;margin-top:4px">
                <option value="30">30 min</option>
                <option value="60" selected>1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>
          <button type="button" onclick="autoGenerateSlots()"
                  style="padding:8px 16px;background:var(--primary-purple,#e60aea);color:white;
                         border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer">
            <i class="fas fa-magic"></i> Generate Slots
          </button>
        </div>

        <div id="slotChips" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;min-height:36px">
          <span id="slotEmptyMsg" style="font-size:.82rem;color:var(--text-secondary);padding:6px 0">No slots added yet</span>
        </div>
        <div style="margin-top:8px;font-size:.75rem;color:var(--text-secondary)">
          <i class="fas fa-info-circle" style="margin-right:4px"></i>
          Click a slot chip to remove it.
        </div>
      </div>
    </div>`;
  serviceFields.appendChild(block);
}
window._initSlotBuilder = _initSlotBuilder;

function onSlotEnabledChange(checkbox) {
  document.getElementById("slotBuilderBody").style.display = checkbox.checked
    ? "block"
    : "none";
  if (!checkbox.checked) {
    _serviceSlots = [];
    _renderSlotChips();
  }
}
window.onSlotEnabledChange = onSlotEnabledChange;

function onSlotGenMethodChange() {
  const method =
    document.querySelector('input[name="slotGenMethod"]:checked')?.value ||
    "manual";
  document.getElementById("slotManualInput").style.display =
    method === "manual" ? "block" : "none";
  document.getElementById("slotAutoInput").style.display =
    method === "auto" ? "block" : "none";
}
window.onSlotGenMethodChange = onSlotGenMethodChange;

function addManualSlot() {
  const timeInput = document.getElementById("manualSlotTime");
  const val = timeInput.value;
  if (!val) {
    alert("Please pick a time first.");
    return;
  }
  if (_serviceSlots.find((s) => s.label === val)) {
    alert("That slot is already added.");
    return;
  }
  const duration_mins = parseInt(
    document.getElementById("slotDurationMins")?.value || 60
  );
  _serviceSlots.push({ label: val, display: _fmt12(val), duration_mins });
  _serviceSlots.sort((a, b) => a.label.localeCompare(b.label));
  timeInput.value = "";
  _renderSlotChips();
}
window.addManualSlot = addManualSlot;

function autoGenerateSlots() {
  const from = document.getElementById("slotRangeFrom").value;
  const to = document.getElementById("slotRangeTo").value;
  const interval = parseInt(document.getElementById("slotInterval").value);
  const dur_mins = parseInt(
    document.getElementById("slotDurationMins")?.value || 60
  );
  if (!from || !to) {
    alert("Please set both From and To times.");
    return;
  }

  const [fH, fM] = from.split(":").map(Number);
  const [tH, tM] = to.split(":").map(Number);
  let curMin = fH * 60 + fM;
  const endMin = tH * 60 + tM;
  if (curMin >= endMin) {
    alert("'From' must be earlier than 'To'.");
    return;
  }

  while (curMin <= endMin) {
    const hh = String(Math.floor(curMin / 60)).padStart(2, "0");
    const mm = String(curMin % 60).padStart(2, "0");
    const label = `${hh}:${mm}`;
    if (!_serviceSlots.find((s) => s.label === label))
      _serviceSlots.push({
        label,
        display: _fmt12(label),
        duration_mins: dur_mins,
      });
    curMin += interval;
  }
  _serviceSlots.sort((a, b) => a.label.localeCompare(b.label));
  _renderSlotChips();
}
window.autoGenerateSlots = autoGenerateSlots;

function removeSlot(label) {
  _serviceSlots = _serviceSlots.filter((s) => s.label !== label);
  _renderSlotChips();
}
window.removeSlot = removeSlot;

function _renderSlotChips() {
  const container = document.getElementById("slotChips");
  if (!container) return;
  container.innerHTML = "";
  if (_serviceSlots.length === 0) {
    const span = document.createElement("span");
    span.id = "slotEmptyMsg";
    span.style.cssText =
      "font-size:.82rem;color:var(--text-secondary);padding:6px 0";
    span.textContent = "No slots added yet";
    container.appendChild(span);
    return;
  }
  _serviceSlots.forEach((slot) => {
    const chip = document.createElement("div");
    chip.style.cssText =
      "display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(230,10,234,.1);border:1px solid rgba(230,10,234,.3);border-radius:20px;font-size:.83rem;font-weight:600;color:var(--primary-purple,#e60aea);cursor:pointer;transition:all .15s";
    chip.title = "Click to remove";
    chip.innerHTML = `<i class="fas fa-clock" style="font-size:.75rem"></i>${
      slot.display
    }<span style="font-size:.7rem;opacity:.6;margin-left:2px">${
      slot.duration_mins > 0 ? slot.duration_mins + "m" : ""
    }</span><i class="fas fa-times" style="font-size:.7rem;opacity:.7"></i>`;
    chip.addEventListener("click", () => removeSlot(slot.label));
    container.appendChild(chip);
  });
}

function _gatherSlots(formData) {
  const enabled = document.getElementById("slotEnabled")?.checked;
  if (!enabled || _serviceSlots.length === 0) return;
  formData.append("time_slots", JSON.stringify(_serviceSlots));
  console.log(`🕐 Appended ${_serviceSlots.length} time slot(s)`);
}

function _generateSlotReviewHtml() {
  if (_serviceSlots.length === 0) return "";
  const chips = _serviceSlots
    .map(
      (s) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(230,10,234,.1);border:1px solid rgba(230,10,234,.3);border-radius:16px;font-size:.82rem;font-weight:600;color:var(--primary-purple,#e60aea);margin:3px">
      <i class="fas fa-clock" style="font-size:.7rem"></i>${s.display}${
          s.duration_mins > 0
            ? ` <span style="opacity:.6;font-size:.75rem">(${s.duration_mins}m)</span>`
            : ""
        }
    </span>`
    )
    .join("");
  return `
    <div class="review-section">
      <h3><i class="fas fa-clock"></i> Time Slots</h3>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${chips}</div>
    </div>`;
}

// ===== UTILITIES =====
function escSafe(str) {
  return String(str || "")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
function escHtmlSafe(str) {
  const d = document.createElement("div");
  d.textContent = String(str || "");
  return d.innerHTML;
}

console.log(
  "✅ upload.js — FIX 5: conditional required validation for delivery charges"
);
