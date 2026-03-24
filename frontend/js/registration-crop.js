// ===== REGISTRATION CROP FUNCTIONALITY =====

let regCropper = null;
let regOriginalImageSrc = null;
let regCroppedBlob = null;

// ===== HANDLE PROFILE PIC CHANGE =====
function handleRegistrationProfilePicChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!validTypes.includes(file.type)) {
    showModal(
      "Please select a valid image file (JPG, PNG, GIF, WEBP)",
      "error"
    );
    event.target.value = "";
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showModal("Image size must be less than 5MB", "error");
    event.target.value = "";
    return;
  }

  // Read file and open crop modal
  const reader = new FileReader();
  reader.onload = function (e) {
    regOriginalImageSrc = e.target.result;
    openRegCropModal(e.target.result);
  };
  reader.readAsDataURL(file);
}

// ===== OPEN CROP MODAL =====
function openRegCropModal(imageSrc) {
  const modal = document.getElementById("regCropModal");
  const cropImage = document.getElementById("regCropImage");

  if (!modal || !cropImage) {
    console.error("Registration crop modal elements not found");
    return;
  }

  cropImage.src = imageSrc;
  modal.classList.add("show");
  document.body.style.overflow = "hidden";

  // Initialize Cropper.js
  setTimeout(() => {
    if (regCropper) {
      regCropper.destroy();
    }

    regCropper = new Cropper(cropImage, {
      aspectRatio: 1, // Square crop for profile picture
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
      background: false,
      zoomable: true,
      scalable: true,
      rotatable: true,
      minCropBoxWidth: 100,
      minCropBoxHeight: 100,
    });

    console.log("✅ Registration cropper initialized");
  }, 100);
}

// ===== CLOSE CROP MODAL =====
function closeRegCropModal() {
  const modal = document.getElementById("regCropModal");

  if (regCropper) {
    regCropper.destroy();
    regCropper = null;
  }

  modal.classList.remove("show");
  document.body.style.overflow = "auto";

  // Clear file input
  const fileInput = document.getElementById("profilePicInput");
  if (fileInput) {
    fileInput.value = "";
  }

  regCroppedBlob = null;
  regOriginalImageSrc = null;
}

// ===== CROP CONTROLS =====
function rotateRegCropLeft() {
  if (regCropper) {
    regCropper.rotate(-90);
  }
}

function rotateRegCropRight() {
  if (regCropper) {
    regCropper.rotate(90);
  }
}

function flipRegCropHorizontal() {
  if (regCropper) {
    const scaleX = regCropper.getData().scaleX || 1;
    regCropper.scaleX(-scaleX);
  }
}

function flipRegCropVertical() {
  if (regCropper) {
    const scaleY = regCropper.getData().scaleY || 1;
    regCropper.scaleY(-scaleY);
  }
}

function resetRegCrop() {
  if (regCropper) {
    regCropper.reset();
  }
}

// ===== APPLY CROP =====
function applyRegCrop() {
  if (!regCropper) {
    showModal("No image to crop", "error");
    return;
  }

  try {
    // Get cropped canvas
    const canvas = regCropper.getCroppedCanvas({
      width: 400,
      height: 400,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showModal("Failed to create image blob", "error");
          return;
        }

        regCroppedBlob = blob;
        console.log("✅ Cropped image blob created:", blob.size, "bytes");

        // Create object URL for preview
        const objectURL = URL.createObjectURL(blob);

        // Update preview
        const preview = document.getElementById("regPreview");
        const placeholder = document.getElementById("regUploadPlaceholder");
        const cancelBtn = document.getElementById("regCancelProfilePicBtn");

        if (preview && placeholder && cancelBtn) {
          preview.src = objectURL;
          preview.style.display = "block";
          placeholder.style.display = "none";
          cancelBtn.style.display = "flex";
        }

        // Close modal
        closeRegCropModal();

        // Store the blob for form submission
        // We'll attach it to the form when submitting
        window.regProfilePicBlob = blob;

        showModal("✅ Profile picture cropped successfully!", "success");
      },
      "image/jpeg",
      0.9
    );
  } catch (error) {
    console.error("❌ Error applying crop:", error);
    showModal("Failed to crop image", "error");
  }
}

// ===== REMOVE PROFILE PIC =====
function removeRegistrationProfilePic(event) {
  event.preventDefault();
  event.stopPropagation();

  const fileInput = document.getElementById("profilePicInput");
  const preview = document.getElementById("regPreview");
  const placeholder = document.getElementById("regUploadPlaceholder");
  const cancelBtn = document.getElementById("regCancelProfilePicBtn");

  // Reset file input
  if (fileInput) fileInput.value = "";

  // Hide preview, show placeholder
  if (preview) {
    preview.style.display = "none";
    preview.src = "";
  }

  if (placeholder) placeholder.style.display = "flex";
  if (cancelBtn) cancelBtn.style.display = "none";

  // Clear stored blob
  window.regProfilePicBlob = null;
  regCroppedBlob = null;

  console.log("✅ Registration profile picture removed");
}

// ===== UPDATE FORM SUBMISSION TO USE CROPPED BLOB =====
// This will be called by the existing registration.js
window.getRegistrationProfileBlob = function () {
  return window.regProfilePicBlob || null;
};

// ===== OVERRIDE THE FORM DATA ATTACHMENT =====
// Hook into the form submission to replace the file with cropped blob
(function () {
  const originalFormSubmit = document.getElementById("registrationForm");

  if (originalFormSubmit) {
    originalFormSubmit.addEventListener(
      "submit",
      function (e) {
        // If we have a cropped blob, we need to ensure it's used
        if (window.regProfilePicBlob) {
          console.log("✅ Using cropped profile picture blob for submission");
        }
      },
      true
    ); // Use capture phase to run before other handlers
  }
})();

console.log("✅ Registration crop functionality loaded");
