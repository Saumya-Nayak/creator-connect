/**
 * Payment Handler for Creator Connect - Direct P2P Payments
 * Buyers pay sellers directly via UPI/Bank Transfer/COD
 * No payment gateway fees - platform just facilitates connection
 */

// API Base URL
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/api"
    : "/api";

console.log("💳 Payment system initialized (Direct P2P mode)");

/**
 * Show Purchase Modal - Display seller's payment details to buyer
 */
function showPurchaseModal(post) {
  console.log("🛒 Opening purchase modal for post:", post.post_id);

  const modal = document.createElement("div");
  modal.id = "purchaseModal";
  modal.className = "purchase-modal";

  // Check if post has payment info
  const hasUPI = post.accepts_upi && post.seller_upi_id;
  const hasBankTransfer =
    post.accepts_bank_transfer && post.seller_bank_account;
  const hasCOD = post.accepts_cod;

  modal.innerHTML = `
    <div class="purchase-content">
      <!-- Close Button -->
      <button class="close-purchase" onclick="closePurchaseModal()">
        <i class="fas fa-times"></i>
      </button>

      <!-- Product Image -->
      <div class="purchase-image">
        ${
          post.media_url.includes("video")
            ? `<video src="${post.media_url}" controls></video>`
            : `<img src="${post.media_url}" alt="${post.product_title}">`
        }
      </div>

      <!-- Product Info -->
      <div class="purchase-info">
        <h2>${post.product_title}</h2>
        <p class="product-desc">${post.short_description || post.caption}</p>

        <!-- Seller Info -->
        <div class="seller-info">
          <img src="${post.profile_pic || "images/default-avatar.png"}" alt="${
    post.username
  }" class="seller-avatar">
          <div>
            <p class="seller-name">${post.full_name || post.username}</p>
            <p class="seller-handle">@${post.username}</p>
          </div>
        </div>

        <!-- Price & Stock -->
        <div class="price-stock">
          <div class="price">
            <span class="label">Price:</span>
            <span class="amount">
              ${getCurrencySymbol(post.currency)}${parseFloat(
    post.price
  ).toFixed(2)} ${post.currency}
            </span>
          </div>
          ${
            post.stock
              ? `
            <div class="stock">
              <span class="label">Available:</span>
              <span class="amount">${post.stock} items</span>
            </div>
          `
              : ""
          }
        </div>

        <!-- Quantity Selector (if has stock) -->
        ${
          post.stock
            ? `
          <div class="quantity-selector">
            <label>Quantity:</label>
            <input type="number" id="purchaseQuantity" min="1" max="${
              post.stock
            }" value="1" onchange="updateTotalAmount(${post.price}, '${
                post.currency
              }')">
          </div>
          <div class="total-amount">
            <span class="label">Total Amount:</span>
            <span class="amount" id="totalAmount">${getCurrencySymbol(
              post.currency
            )}${parseFloat(post.price).toFixed(2)}</span>
          </div>
        `
            : ""
        }

        <!-- Features -->
        ${
          post.highlights
            ? `
          <div class="features">
            <h4>✨ What's Included:</h4>
            <ul>
              ${post.highlights
                .split("\n")
                .filter((h) => h.trim())
                .map((h) => `<li>${h.trim()}</li>`)
                .join("")}
            </ul>
          </div>
        `
            : ""
        }

        <!-- Delivery Info -->
        ${
          post.delivery_time
            ? `
          <div class="delivery">
            <i class="fas fa-clock"></i>
            <span>Delivery: ${post.delivery_time}</span>
          </div>
        `
            : ""
        }

        <hr style="margin: 20px 0; border: 1px solid var(--border-purple);">

        <!-- PAYMENT INSTRUCTIONS -->
        <div class="payment-instructions-section">
          <h3><i class="fas fa-wallet"></i> How to Pay Seller Directly:</h3>
          
          ${
            hasUPI
              ? `
          <div class="payment-method-box upi-box">
            <div class="payment-method-header">
              <i class="fas fa-mobile-alt"></i>
              <span>UPI Payment (Instant)</span>
            </div>
            <div class="payment-method-details">
              <p><strong>Seller's UPI ID:</strong></p>
              <div class="copy-field">
                <input type="text" value="${post.seller_upi_id}" id="upiIdField" readonly>
                <button onclick="copyToClipboard('upiIdField', 'UPI ID')" class="copy-btn">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
              <small class="help-text">
                Open GPay/PhonePe/Paytm → Send Money → Enter this UPI ID → Pay
              </small>
              <button onclick="openUPIApp('${post.seller_upi_id}', ${post.price}, '${post.product_title}')" class="btn btn-primary btn-sm">
                <i class="fas fa-mobile-alt"></i> Open UPI App
              </button>
            </div>
          </div>
          `
              : ""
          }

          ${
            hasBankTransfer
              ? `
          <div class="payment-method-box bank-box">
            <div class="payment-method-header">
              <i class="fas fa-university"></i>
              <span>Bank Transfer (NEFT/IMPS)</span>
            </div>
            <div class="payment-method-details">
              <p><strong>Account Number:</strong></p>
              <div class="copy-field">
                <input type="text" value="${
                  post.seller_bank_account
                }" id="bankAccountField" readonly>
                <button onclick="copyToClipboard('bankAccountField', 'Account Number')" class="copy-btn">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
              <p><strong>IFSC Code:</strong></p>
              <div class="copy-field">
                <input type="text" value="${
                  post.seller_bank_ifsc
                }" id="ifscField" readonly>
                <button onclick="copyToClipboard('ifscField', 'IFSC Code')" class="copy-btn">
                  <i class="fas fa-copy"></i> Copy
                </button>
              </div>
              ${
                post.seller_bank_holder_name
                  ? `
              <p><strong>Account Holder:</strong> ${post.seller_bank_holder_name}</p>
              `
                  : ""
              }
            </div>
          </div>
          `
              : ""
          }

          ${
            hasCOD
              ? `
          <div class="payment-method-box cod-box">
            <div class="payment-method-header">
              <i class="fas fa-money-bill-wave"></i>
              <span>Cash on Delivery (COD)</span>
            </div>
            <div class="payment-method-details">
              <p>💵 Pay in cash when you receive the product</p>
              <small class="help-text">Contact seller to arrange delivery</small>
            </div>
          </div>
          `
              : ""
          }

          <!-- Contact Seller -->
          <div class="contact-seller-section">
            <h4><i class="fas fa-phone"></i> Contact Seller:</h4>
            <p><strong>Phone/WhatsApp:</strong> ${post.seller_phone_number}</p>
            ${
              post.contact_info
                ? `
            <p><strong>Email:</strong> ${post.contact_info}</p>
            `
                : ""
            }
            ${
              post.payment_instructions
                ? `
            <div class="seller-instructions">
              <p><strong>📝 Seller's Instructions:</strong></p>
              <p>${post.payment_instructions}</p>
            </div>
            `
                : ""
            }
            <div class="contact-buttons">
              <button onclick="openWhatsApp('${post.seller_phone_number}', '${
    post.product_title
  }')" class="btn btn-success">
                <i class="fab fa-whatsapp"></i> WhatsApp Seller
              </button>
              <button onclick="callSeller('${
                post.seller_phone_number
              }')" class="btn btn-secondary">
                <i class="fas fa-phone"></i> Call Seller
              </button>
            </div>
          </div>

          <!-- Payment Confirmation -->
          <div class="payment-confirmation-section">
            <h4><i class="fas fa-check-circle"></i> After Payment:</h4>
            <ol class="payment-steps">
              <li>Complete payment using any method above</li>
              <li>Take screenshot of payment confirmation</li>
              <li>Click "I Have Paid" button below</li>
              <li>Upload payment proof</li>
              <li>Seller will verify and confirm your order</li>
            </ol>
            <button onclick="markAsPaid(${post.post_id}, ${post.price}, '${
    post.currency
  }')" class="btn btn-primary btn-lg">
              <i class="fas fa-check"></i> I Have Paid - Submit Proof
            </button>
          </div>
        </div>

        <button class="btn btn-outline" onclick="closePurchaseModal()">
          <i class="fas fa-times"></i> Cancel
        </button>

        <div class="secure-note">
          <i class="fas fa-shield-alt"></i> 
          <span>Platform facilitates connection. Buyer and seller are responsible for safe transaction.</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.classList.add("show");
}

/**
 * Close Purchase Modal
 */
function closePurchaseModal() {
  const modal = document.getElementById("purchaseModal");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Update Total Amount (for quantity changes)
 */
function updateTotalAmount(price, currency) {
  const quantity =
    parseInt(document.getElementById("purchaseQuantity").value) || 1;
  const total = price * quantity;
  document.getElementById("totalAmount").textContent = `${getCurrencySymbol(
    currency
  )}${total.toFixed(2)}`;
}

/**
 * Get Currency Symbol
 */
function getCurrencySymbol(currency) {
  const symbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  return symbols[currency] || currency + " ";
}

/**
 * Copy to Clipboard
 */
function copyToClipboard(fieldId, fieldName) {
  const field = document.getElementById(fieldId);
  field.select();
  field.setSelectionRange(0, 99999); // For mobile

  try {
    document.execCommand("copy");
    showSuccessNotification(`${fieldName} copied to clipboard!`);
  } catch (err) {
    // Fallback for modern browsers
    navigator.clipboard
      .writeText(field.value)
      .then(() => {
        showSuccessNotification(`${fieldName} copied to clipboard!`);
      })
      .catch(() => {
        showErrorNotification("Failed to copy. Please copy manually.");
      });
  }
}

/**
 * Open UPI App with pre-filled details
 */
function openUPIApp(upiId, amount, productTitle) {
  // UPI Intent URL format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&tn=NOTE
  const upiUrl = `upi://pay?pa=${upiId}&am=${amount}&tn=${encodeURIComponent(
    productTitle
  )}`;

  console.log("📱 Opening UPI app:", upiUrl);

  // Try to open UPI app
  window.location.href = upiUrl;

  showSuccessNotification("Opening UPI app... Please complete payment there.");

  // Fallback: show instructions if UPI app doesn't open
  setTimeout(() => {
    showInfoNotification(
      "If UPI app didn't open, please copy UPI ID and pay manually."
    );
  }, 2000);
}

/**
 * Open WhatsApp with pre-filled message
 */
function openWhatsApp(phoneNumber, productTitle) {
  // Remove all non-numeric characters
  const cleanNumber = phoneNumber.replace(/\D/g, "");

  // Add country code if not present (assuming India +91)
  const fullNumber = cleanNumber.startsWith("91")
    ? cleanNumber
    : "91" + cleanNumber;

  const message = `Hi! I'm interested in buying: ${productTitle}`;
  const whatsappUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(
    message
  )}`;

  console.log("💬 Opening WhatsApp:", whatsappUrl);
  window.open(whatsappUrl, "_blank");
}

/**
 * Call Seller
 */
function callSeller(phoneNumber) {
  window.location.href = `tel:${phoneNumber}`;
}

/**
 * Mark as Paid - Upload Payment Proof
 */
function markAsPaid(postId, amount, currency) {
  console.log("✅ User marking payment as complete for post:", postId);

  // Create file input for payment proof
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading
    showLoadingNotification("Uploading payment proof...");

    try {
      // Upload screenshot
      const proofUrl = await uploadPaymentProof(file);

      if (!proofUrl) {
        showErrorNotification("Failed to upload payment proof");
        return;
      }

      // Create transaction
      const quantity = parseInt(
        document.getElementById("purchaseQuantity")?.value || 1
      );
      const result = await createTransaction(postId, quantity, "upi", proofUrl);

      if (result.success) {
        closePurchaseModal();
        showSuccessNotification(
          "Payment proof submitted! Seller will verify and confirm your order. " +
            "You'll be notified once verified."
        );
      } else {
        showErrorNotification(
          result.message || "Failed to submit payment proof"
        );
      }
    } catch (error) {
      console.error("❌ Error submitting payment:", error);
      showErrorNotification("Error submitting payment proof");
    }
  };

  fileInput.click();
}

/**
 * Upload Payment Proof (Screenshot)
 */
async function uploadPaymentProof(file) {
  try {
    const formData = new FormData();
    formData.append("paymentProof", file);

    const response = await fetch(`${API_BASE_URL}/upload-payment-proof`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return data.filepath;
    } else {
      return null;
    }
  } catch (error) {
    console.error("❌ Error uploading proof:", error);
    return null;
  }
}

/**
 * Create Transaction Record
 */
async function createTransaction(postId, quantity, paymentMethod, proofUrl) {
  try {
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!authToken) {
      showErrorNotification("Please login to continue");
      return { success: false };
    }

    const response = await fetch(`${API_BASE_URL}/transactions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        post_id: postId,
        quantity: quantity,
        payment_method: paymentMethod,
        payment_proof_url: proofUrl,
        notes: "Payment made via " + paymentMethod.toUpperCase(),
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error creating transaction:", error);
    return { success: false };
  }
}

// ===== NOTIFICATION HELPERS =====

function showSuccessNotification(message) {
  const notification = document.createElement("div");
  notification.className = "payment-success-notification";
  notification.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 16px 24px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    max-width: 400px;
  `;

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function showErrorNotification(message) {
  const notification = document.createElement("div");
  notification.className = "payment-error-notification";
  notification.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    padding: 16px 24px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    max-width: 400px;
  `;

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function showInfoNotification(message) {
  const notification = document.createElement("div");
  notification.innerHTML = `
    <i class="fas fa-info-circle"></i>
    <span>${message}</span>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    padding: 16px 24px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    max-width: 400px;
  `;

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function showLoadingNotification(message) {
  // Remove existing loading notification
  const existing = document.querySelector(".loading-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = "loading-notification";
  notification.innerHTML = `
    <div class="spinner-small"></div>
    <span>${message}</span>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
    padding: 16px 24px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  `;

  document.body.appendChild(notification);
}

// Add CSS for spinner
const style = document.createElement("style");
style.textContent = `
  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log("✅ Payment.js loaded - Direct P2P payment system ready");
