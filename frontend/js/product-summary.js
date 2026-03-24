// =====================================================================
// product-summary.js — COMPLETE FINAL
// FIX: "Both" mode lets buyer choose Shipping OR Pickup
// FIX: All address fields stored correctly
// FIX: Both-mode shipping/pickup toggle fully reliable
// =====================================================================

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

let currentProductData = null,
  currentUser = null,
  sellerId = null;
let allCountriesData = [];

let pricingData = {
  basePrice: 0,
  quantity: 1,
  subtotal: 0,
  gstRate: 0,
  gstAmount: 0,
  deliveryCharge: 0,
  deliveryAvailable: true,
  total: 0,
  currency: "INR",
  eta: null,
  deliveryWarning: null,
  deliveryChecked: false,
  _isPickup: false,
  _isBothMode: false,
};

const STATE_NORM = {
  uttaranchal: "Uttarakhand",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "jammu & kashmir": "Jammu and Kashmir",
  "andaman & nicobar": "Andaman and Nicobar Islands",
  "andaman and nicobar": "Andaman and Nicobar Islands",
};
function normState(s) {
  if (!s) return "";
  const key = s.trim().toLowerCase();
  return STATE_NORM[key] || s.trim();
}

document.addEventListener("DOMContentLoaded", () => initializePage());

async function initializePage() {
  const postId = new URLSearchParams(window.location.search).get("id");
  if (!postId) {
    showError("No product specified");
    return;
  }
  checkAuth();
  await loadCountriesData();
  await autofillAddress();
  await loadProductDetails(postId);
  setupFormHandlers();
}

function checkAuth() {
  const t =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const u =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");
  if (t && u) {
    try {
      currentUser = JSON.parse(u);
    } catch {
      currentUser = null;
    }
  } else {
    currentUser = null;
    showError("Please login to place orders");
    setTimeout(closeSummary, 2000);
  }
}

// =====================================================================
// LOAD PRODUCT
// =====================================================================
async function loadProductDetails(postId) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const data = await res.json();
    if (!data.success)
      throw new Error(data.message || "Failed to load product");
    const post = data.post;
    if (post.post_type !== "product")
      throw new Error("This is not a product post");
    if (currentUser && post.user_id === currentUser.id)
      throw new Error("You cannot buy your own product");

    sellerId = post.user_id;
    currentProductData = post;
    pricingData.basePrice = parseFloat(post.price || 0);
    pricingData.currency = post.currency || "INR";

    renderProductDetails(post);
    await fetchGST(post.post_id);

    const shippingOn = Boolean(post.shipping_available);
    const hasPickup = !!(
      post.pickup_city ||
      post.pickup_address ||
      post.pickup_pincode
    );

    if (shippingOn && hasPickup) {
      // BOTH mode — buyer chooses shipping or pickup
      pricingData._isBothMode = true;
      _renderBothFulfillmentSelector(post);
    } else if (!shippingOn) {
      _renderPickupMode(post);
    } else {
      // Shipping only
      _applyShippingDefaults(post);
      setTimeout(() => {
        _updatePlaceOrderBtn();
        _showPincodeRequiredBanner(true);
        const label = document.querySelector('label[for="deliveryPincode"]');
        if (label && !label.querySelector(".req-star")) {
          const star = document.createElement("span");
          star.className = "req-star";
          star.style.cssText = "color:#ef4444;margin-left:2px;font-weight:700;";
          star.textContent = "*";
          label.appendChild(star);
        }
      }, 150);
    }
    updateBillDisplay();
  } catch (e) {
    showError(e.message);
  }
}

// Apply flat/free delivery defaults for shipping-only mode
function _applyShippingDefaults(post) {
  const ct = post.delivery_charge_type || "flat";
  if (ct === "free") {
    setDeliveryResult(0, null, "free");
  } else if (ct === "flat") {
    const fc = parseFloat(post.base_delivery_charge ?? post.shipping_cost ?? 0);
    const fst = parseFloat(post.free_shipping_threshold || 0);
    setDeliveryResult(
      fst > 0 && pricingData.subtotal >= fst ? 0 : fc,
      null,
      "flat"
    );
  }
  // per_km requires pincode — leave deliveryChecked = false
}

// =====================================================================
// BOTH MODE — Buyer chooses shipping or pickup
// =====================================================================
function _renderBothFulfillmentSelector(post) {
  const deliverySection = document.getElementById("deliverySection");
  if (!deliverySection) return;

  // Remove old if re-rendered
  document.getElementById("fulfillmentSelectorCard")?.remove();

  const card = document.createElement("div");
  card.id = "fulfillmentSelectorCard";
  card.style.cssText =
    "background:var(--card-bg,#fff);border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,.08);border:1px solid var(--border-color,#dee2e6);margin-bottom:12px;";
  card.innerHTML = `
    <h2 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin:0 0 12px 0;display:flex;align-items:center;gap:7px;padding-bottom:10px;border-bottom:1px solid var(--border-color,#dee2e6)">
      <i class="fas fa-exchange-alt" style="color:var(--primary-purple,#e60aea)"></i>
      How would you like to receive it?
    </h2>
    <div style="display:flex;border:2px solid var(--primary-purple,#e60aea);border-radius:12px;overflow:hidden">
      <button type="button" id="btnChooseShipping" onclick="chooseFulfillment('shipping')"
        style="flex:1;padding:12px 8px;border:none;cursor:pointer;font-size:.88rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px;background:var(--primary-purple,#e60aea);color:#fff;transition:all .2s">
        <i class="fas fa-truck"></i> Shipping
      </button>
      <button type="button" id="btnChoosePickup" onclick="chooseFulfillment('pickup')"
        style="flex:1;padding:12px 8px;border:none;cursor:pointer;font-size:.88rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px;background:var(--bg-secondary,#f8f9fa);color:var(--text-secondary,#6c757d);border-left:2px solid var(--primary-purple,#e60aea);transition:all .2s">
        <i class="fas fa-store"></i> Pickup (Free)
      </button>
    </div>
    <div style="margin-top:8px;font-size:.76rem;color:var(--text-secondary);text-align:center">
      <i class="fas fa-info-circle" style="margin-right:4px"></i>Seller offers both options — pick what works for you
    </div>`;

  deliverySection.parentNode.insertBefore(card, deliverySection);

  // Update product shipping badge in post detail
  const shippingInfoEl = document.getElementById("productShipping");
  if (shippingInfoEl)
    shippingInfoEl.textContent = "Shipping & Pickup Available";

  // Default to shipping — all shipping fields visible, pickup hidden
  chooseFulfillment("shipping");
}

function chooseFulfillment(mode) {
  if (!currentProductData) return;

  // Update button styles
  const btnS = document.getElementById("btnChooseShipping");
  const btnP = document.getElementById("btnChoosePickup");
  if (btnS) {
    btnS.style.background =
      mode === "shipping"
        ? "var(--primary-purple,#e60aea)"
        : "var(--bg-secondary,#f8f9fa)";
    btnS.style.color =
      mode === "shipping" ? "#fff" : "var(--text-secondary,#6c757d)";
  }
  if (btnP) {
    btnP.style.background =
      mode === "pickup"
        ? "var(--primary-purple,#e60aea)"
        : "var(--bg-secondary,#f8f9fa)";
    btnP.style.color =
      mode === "pickup" ? "#fff" : "var(--text-secondary,#6c757d)";
  }

  if (mode === "pickup") {
    _switchToPickup();
  } else {
    _switchToShipping();
  }

  updateBillDisplay();
}

function _switchToPickup() {
  pricingData._isPickup = true;
  pricingData.deliveryChecked = true;
  pricingData.deliveryCharge = 0;
  pricingData.deliveryAvailable = true;

  // Hide delivery section
  const deliverySection = document.getElementById("deliverySection");
  if (deliverySection) deliverySection.style.display = "none";

  // Hide shipping address form sections — mark each with data-hidden-by-pickup
  document.querySelectorAll(".form-section, .section").forEach((section) => {
    const h = section.querySelector("h3,h2");
    if (!h) return;
    const txt = h.textContent.toLowerCase();
    if (
      txt.includes("shipping") ||
      txt.includes("delivery address") ||
      txt.includes("address") ||
      txt.includes("contact") ||
      txt.includes("phone")
    ) {
      if (section.style.display !== "none") {
        section.dataset.hiddenByPickup = "1";
        section.style.display = "none";
      }
    }
  });

  // Also hide by common IDs
  [
    "shippingForm",
    "addressSection",
    "deliveryAddressSection",
    "contactSection",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.style.display !== "none") {
      el.dataset.hiddenByPickup = "1";
      el.style.display = "none";
    }
  });

  // Show or create pickup card
  let pickupCard = document.getElementById("pickupCard");
  if (!pickupCard) {
    _renderPickupCard(currentProductData);
  } else {
    pickupCard.style.display = "block";
  }

  _showPincodeRequiredBanner(false);
  _updatePlaceOrderBtn();
}

function _switchToShipping() {
  pricingData._isPickup = false;
  pricingData.deliveryChecked = false;
  pricingData.deliveryCharge = 0;

  // Show delivery section again
  const deliverySection = document.getElementById("deliverySection");
  if (deliverySection) deliverySection.style.display = "block";

  // Re-show all sections that were hidden for pickup
  document.querySelectorAll("[data-hidden-by-pickup='1']").forEach((el) => {
    el.style.display = "";
    delete el.dataset.hiddenByPickup;
  });

  // Hide pickup card
  const pickupCard = document.getElementById("pickupCard");
  if (pickupCard) pickupCard.style.display = "none";

  // Apply initial delivery charge based on type
  _applyShippingDefaults(currentProductData);

  const needsPincode =
    (currentProductData.delivery_charge_type || "flat") === "per_km";
  _updatePlaceOrderBtn();
  _showPincodeRequiredBanner(needsPincode || !pricingData.deliveryChecked);
}

window.chooseFulfillment = chooseFulfillment;

// =====================================================================
// PICKUP ONLY MODE (shipping_available = false)
// =====================================================================
function _renderPickupMode(post) {
  pricingData._isPickup = true;
  pricingData.deliveryChecked = true;
  pricingData.deliveryCharge = 0;
  pricingData.deliveryAvailable = true;

  const deliverySection = document.getElementById("deliverySection");
  if (deliverySection) deliverySection.style.display = "none";

  document.querySelectorAll(".form-section,.section").forEach((section) => {
    const h = section.querySelector("h3,h2");
    if (!h) return;
    const txt = h.textContent.toLowerCase();
    if (
      txt.includes("shipping") ||
      txt.includes("delivery address") ||
      txt.includes("address") ||
      txt.includes("contact") ||
      txt.includes("phone")
    )
      section.style.display = "none";
  });

  [
    "shippingForm",
    "addressSection",
    "deliveryAddressSection",
    "contactSection",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  const noShip = document.getElementById("noShippingMsg");
  if (noShip) noShip.style.display = "block";

  _renderPickupCard(post);
  updateBillDisplay();
}

// =====================================================================
// PICKUP CARD — shared between pickup-only and both-mode pickup
// =====================================================================
function _renderPickupCard(post) {
  document.getElementById("pickupCard")?.remove();

  const pickupAddress = post.pickup_address || post.service_address || "";
  const pickupCity = post.pickup_city || post.service_city || "";
  const pickupState = post.pickup_state || post.service_state || "";
  const pickupPincode = post.pickup_pincode || post.service_pincode || "";

  const cityStateLine = [pickupCity, pickupState].filter(Boolean).join(", ");
  const hasAnyAddress = pickupAddress || cityStateLine || pickupPincode;

  // Address parts for Maps query
  const mapsQueryParts = [
    pickupAddress,
    pickupCity,
    pickupState,
    pickupPincode,
  ].filter(Boolean);
  const mapsQuery = mapsQueryParts.join(", ");

  // Directions button: always prefer address text
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        mapsQuery
      )}`
    : post.pickup_lat && post.pickup_lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${post.pickup_lat},${post.pickup_lng}`
    : null;

  // ── FIX: Embed uses address query (same as service-summary) ──────────
  // This means clicking the embedded map opens the address name, not coords.
  // Coords-only fallback used only when no address text is stored at all.
  let embedUrl = null;
  if (mapsQuery) {
    embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
      mapsQuery
    )}&output=embed&z=15`;
  } else if (post.pickup_lat && post.pickup_lng) {
    embedUrl = `https://maps.google.com/maps?q=${post.pickup_lat},${post.pickup_lng}&z=16&output=embed`;
  }

  const pickupCard = document.createElement("div");
  pickupCard.id = "pickupCard";
  pickupCard.style.cssText =
    "margin:16px 0;border-radius:16px;overflow:hidden;border:1.5px solid rgba(139,92,246,.25);background:var(--card-bg,#fff);box-shadow:0 2px 12px rgba(139,92,246,.08);";

  const headerHtml = `
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:14px 18px;display:flex;align-items:center;gap:10px">
      <div style="background:rgba(255,255,255,.2);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas fa-store" style="color:#fff;font-size:.9rem"></i>
      </div>
      <div>
        <div style="font-weight:800;font-size:.95rem;color:#fff">Pickup Location</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,.8)">Collect in person from seller</div>
      </div>
      <span style="margin-left:auto;background:rgba(16,185,129,.9);color:#fff;font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:20px">
        <i class="fas fa-tag" style="margin-right:3px;font-size:.62rem"></i>Free
      </span>
    </div>`;

  let addressHtml = "";
  if (hasAnyAddress) {
    addressHtml = `
      <div style="padding:14px 18px 0 18px">
        ${
          pickupAddress
            ? `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
              <i class="fas fa-map-marker-alt" style="color:#7c3aed;margin-top:3px;flex-shrink:0;font-size:1rem"></i>
              <div>
                <div style="font-weight:700;font-size:.92rem;color:var(--text-primary,#1a1a1a);line-height:1.5">${escapeHtmlSafe(
                  pickupAddress
                )}</div>
                ${
                  cityStateLine
                    ? `<div style="font-size:.82rem;color:var(--text-secondary,#6c757d);margin-top:2px">${escapeHtmlSafe(
                        cityStateLine
                      )}</div>`
                    : ""
                }
              </div>
            </div>`
            : cityStateLine
            ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <i class="fas fa-map-marker-alt" style="color:#7c3aed;flex-shrink:0;font-size:1rem"></i>
              <div style="font-weight:600;font-size:.9rem;color:var(--text-primary,#1a1a1a)">${escapeHtmlSafe(
                cityStateLine
              )}</div>
            </div>`
            : ""
        }
        ${
          pickupPincode
            ? `<div style="margin-bottom:12px;margin-left:24px">
              <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(139,92,246,.1);color:#7c3aed;font-size:.75rem;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid rgba(139,92,246,.25)">
                <i class="fas fa-map-pin" style="font-size:.65rem"></i>${escapeHtmlSafe(
                  pickupPincode
                )}
              </span>
            </div>`
            : ""
        }
      </div>`;
  } else {
    addressHtml = `
      <div style="padding:14px 18px 0 18px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <i class="fas fa-map-marker-alt" style="color:#7c3aed;font-size:1rem;flex-shrink:0"></i>
          <div style="font-size:.85rem;color:var(--text-secondary,#6c757d);font-style:italic">
            Seller will share pickup address after order confirmation
          </div>
        </div>
      </div>`;
  }

  const mapHtml = embedUrl
    ? `<div style="margin:0 18px 14px 18px;border-radius:10px;overflow:hidden;height:170px;background:#f3f4f6;border:1px solid rgba(139,92,246,.15)">
        <iframe src="${embedUrl}" width="100%" height="170" style="border:0;display:block" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>`
    : "";

  const directionsHtml = mapsUrl
    ? `<div style="padding:0 18px 14px 18px">
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
           style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:11px 0;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:10px;font-size:.88rem;font-weight:700;text-decoration:none">
          <i class="fas fa-directions"></i> Get Directions in Google Maps
        </a>
      </div>`
    : "";

  const noteHtml = `
    <div style="margin:0 18px 10px 18px;padding:10px 12px;background:rgba(139,92,246,.07);border-radius:8px;font-size:.78rem;color:#5b21b6;display:flex;align-items:flex-start;gap:7px;line-height:1.5">
      <i class="fas fa-info-circle" style="margin-top:1px;flex-shrink:0"></i>
      <span>No delivery address needed — coordinate pickup timing with the seller after placing your order.</span>
    </div>`;

  const notesHtml = `
    <div style="padding:0 18px 16px 18px">
      <label style="font-size:.82rem;font-weight:600;color:var(--text-primary);display:block;margin-bottom:5px">
        <i class="fas fa-sticky-note" style="color:#7c3aed;margin-right:5px"></i>Special Instructions (Optional)
      </label>
      <textarea id="buyerNotesPickup" rows="2" placeholder="Preferred pickup time, any special requests..."
        style="width:100%;padding:8px 10px;border:1px solid var(--border-color,#dee2e6);border-radius:8px;font-size:.85rem;background:var(--bg-secondary,#f8f9fa);color:var(--text-primary);box-sizing:border-box;resize:vertical"></textarea>
    </div>`;

  pickupCard.innerHTML =
    headerHtml + addressHtml + mapHtml + directionsHtml + noteHtml + notesHtml;

  const orderForm = document.getElementById("orderForm");
  const summaryContent = document.getElementById("summaryContent");
  if (orderForm && orderForm.parentNode) {
    orderForm.parentNode.insertBefore(pickupCard, orderForm);
  } else if (summaryContent) {
    summaryContent.appendChild(pickupCard);
  }
}

async function fetchGST(postId) {
  try {
    const r = await fetch(`${API_BASE_URL}/posts/${postId}/gst`);
    const d = await r.json();
    if (d.success) pricingData.gstRate = parseFloat(d.gst_rate || 0);
  } catch {}
}

// =====================================================================
// RENDER PRODUCT DETAILS
// =====================================================================
function renderProductDetails(p) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("summaryContent").style.display = "grid";

  const mu = constructMediaUrl(p.media_url, "post");
  const isV =
    p.media_type === "video" || /\.(mp4|webm|mov)$/i.test(p.media_url || "");
  const img = document.getElementById("productImage"),
    vid = document.getElementById("productVideo");
  if (isV) {
    img.style.display = "none";
    vid.style.display = "block";
    vid.src = mu;
  } else {
    img.src = mu;
    img.onerror = () => {
      img.src = "images/placeholder.png";
    };
    vid.style.display = "none";
  }

  document.getElementById("productTitle").textContent =
    p.product_title || p.title || "Product";

  const sb = document.getElementById("stockBadge"),
    st = document.getElementById("stockText");
  if (p.stock !== null && p.stock !== undefined) {
    if (p.stock === 0) {
      sb.classList.add("out-of-stock");
      st.textContent = "Out of Stock";
    } else if (p.stock < 5) {
      sb.classList.add("low-stock");
      st.textContent = `Only ${p.stock} left`;
    } else {
      st.textContent = `${p.stock} available`;
    }
    document.getElementById("quantity").max = p.stock;
  } else sb.style.display = "none";

  const sn = p.full_name || p.username || "Seller";
  const av = document.getElementById("sellerAvatar");
  av.src = p.profile_pic
    ? constructMediaUrl(p.profile_pic, "profile")
    : generateDefaultAvatar(sn);
  av.onerror = () => {
    av.src = generateDefaultAvatar(sn);
    av.onerror = null;
  };
  document.getElementById("sellerName").textContent = sn;
  document.getElementById("sellerUsername").textContent = `@${p.username}`;

  if (p.condition_type)
    document.getElementById("condition").textContent = p.condition_type;
  else document.getElementById("conditionInfo").style.display = "none";

  const shippingOn = Boolean(p.shipping_available);
  const hasPickup = !!(p.pickup_city || p.pickup_address || p.pickup_pincode);
  let shippingLabel = "Pickup only";
  if (shippingOn && hasPickup) shippingLabel = "Shipping & Pickup";
  else if (shippingOn)
    shippingLabel = p.estimated_delivery_days
      ? `Est. ${p.estimated_delivery_days} day(s)`
      : "Shipping available";
  document.getElementById("shippingTime").textContent = shippingLabel;

  if (p.category_name)
    document.getElementById("category").textContent = p.category_name;
  else document.getElementById("categoryInfo").style.display = "none";
  document.getElementById("productDescription").textContent =
    p.full_description || p.short_description || "No description available";

  if (p.features) {
    try {
      let f = Array.isArray(p.features)
        ? p.features
        : (() => {
            const c = String(p.features).trim();
            return c.startsWith("[")
              ? JSON.parse(c)
              : c
                  .split(/[\n,]/)
                  .map((x) => x.trim().replace(/^[•✓✔-]\s*/, ""))
                  .filter(Boolean);
          })();
      if (f.length) {
        document.getElementById("productFeaturesContainer").style.display =
          "block";
        const l = document.getElementById("featuresList");
        l.innerHTML = "";
        f.forEach((x) => {
          const li = document.createElement("li");
          li.textContent = String(x);
          l.appendChild(li);
        });
      }
    } catch {}
  }
  updateBillDisplay();
}

// =====================================================================
// PINCODE → LOCATION SYNC
// =====================================================================
async function onPincodeInput(value) {
  const dp = document.getElementById("deliveryPincode"),
    ap = document.getElementById("pincode");
  if (dp && dp.value !== value) dp.value = value;
  if (ap && ap.value !== value) ap.value = value;
  if (!/^\d{6}$/.test(value)) return;
  checkDelivery(value);
  await fillLocationFromPincode(value);
}

async function fillLocationFromPincode(pincode) {
  if (!/^\d{6}$/.test(pincode)) return;
  try {
    const res = await fetch(
      `${API_BASE_URL}/pincode/lookup?pincode=${pincode}`
    );
    const data = await res.json();
    if (!data.success) return;
    const state = normState(data.state || ""),
      city = data.city || "",
      country = data.country || "India";
    if (!state && !city) return;
    await setLocationForce(country, state, city);
    showSmallBadge(
      "pincodeResult",
      `📍 ${city}${state ? ", " + state : ""}`,
      "blue"
    );
  } catch (e) {
    console.warn("fillLocationFromPincode error:", e);
  }
}

async function setLocationForce(country, state, city) {
  const cSel = document.getElementById("country");
  if (!cSel) return;
  const cOpt = Array.from(cSel.options).find(
    (o) =>
      o.getAttribute("data-name")?.toLowerCase() === country.toLowerCase() ||
      o.text.toLowerCase() === country.toLowerCase() ||
      o.value.toLowerCase() === country.toLowerCase()
  );
  if (!cOpt) return;
  cSel.value = cOpt.value;
  updateProductStates();
  await delay(250);

  if (!state) return;
  let sEl = document.getElementById("state");
  if (!sEl) return;
  if (sEl.tagName.toLowerCase() === "select") {
    const sOpt =
      Array.from(sEl.options).find((o) => o.value === state) ||
      Array.from(sEl.options).find(
        (o) => o.value.toLowerCase() === state.toLowerCase()
      ) ||
      Array.from(sEl.options).find(
        (o) => o.text.toLowerCase() === state.toLowerCase()
      ) ||
      Array.from(sEl.options).find((o) =>
        o.text.toLowerCase().startsWith(state.toLowerCase().slice(0, 5))
      );
    if (!sOpt) {
      console.warn("State not found:", state);
      return;
    }
    sEl.value = sOpt.value;
  } else sEl.value = state;
  updateProductCities();
  await delay(250);

  if (!city) return;
  let ciEl = document.getElementById("city");
  if (!ciEl) return;
  if (ciEl.tagName.toLowerCase() === "select") {
    const cOpt2 =
      Array.from(ciEl.options).find(
        (o) => o.value.toLowerCase() === city.toLowerCase()
      ) ||
      Array.from(ciEl.options).find(
        (o) => o.text.toLowerCase() === city.toLowerCase()
      ) ||
      Array.from(ciEl.options).find((o) =>
        o.text.toLowerCase().includes(city.toLowerCase())
      ) ||
      Array.from(ciEl.options).find(
        (o) =>
          city.toLowerCase().includes(o.text.toLowerCase()) && o.text.length > 3
      );
    if (cOpt2) ciEl.value = cOpt2.value;
    else {
      const inp = makeInput("city", "Enter your city", ciEl);
      inp.value = city;
      ciEl.replaceWith(inp);
    }
  } else ciEl.value = city;
}

function showSmallBadge(anchorId, text, color) {
  const anchor = document.getElementById(anchorId);
  if (!anchor) return;
  document.getElementById("_locBadge")?.remove();
  const badge = document.createElement("div");
  badge.id = "_locBadge";
  const colors = { blue: "rgba(59,130,246,.1)", purple: "rgba(139,92,246,.1)" };
  const fgs = { blue: "#3b82f6", purple: "#7c3aed" };
  badge.style.cssText = `margin-top:4px;display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:600;color:${
    fgs[color] || fgs.blue
  };background:${colors[color] || colors.blue};border:1px solid ${
    fgs[color] || fgs.blue
  }33;padding:2px 9px;border-radius:20px;`;
  badge.textContent = text;
  anchor.insertAdjacentElement("afterend", badge);
  setTimeout(() => {
    badge.style.transition = "opacity .5s";
    badge.style.opacity = "0";
    setTimeout(() => badge.remove(), 500);
  }, 3500);
}

// =====================================================================
// DELIVERY CHECK
// =====================================================================
async function checkDelivery(pincodeOverride) {
  if (!currentProductData || pricingData._isPickup) return;
  const pinInput = document.getElementById("deliveryPincode");
  const pincode = pincodeOverride || pinInput?.value?.trim() || "";
  if (!/^\d{6}$/.test(pincode)) {
    setPincodeResult("Enter a valid 6-digit pincode", false);
    return;
  }
  const btn = document.getElementById("pincodeCheckBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  try {
    const qty = parseInt(document.getElementById("quantity").value) || 1;
    const res = await fetch(`${API_BASE_URL}/calculate-order-total`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: currentProductData.post_id,
        quantity: qty,
        buyer_pincode: pincode,
      }),
    });
    const data = await res.json();
    if (data.success) {
      pricingData.gstRate = data.gst_rate || 0;
      pricingData.gstAmount = data.gst_amount || 0;
      pricingData.deliveryCharge = data.delivery_charge || 0;
      pricingData.deliveryAvailable = data.delivery_available !== false;
      pricingData.eta = data.eta || null;
      pricingData.deliveryWarning = data.delivery_warning || null;
      const km = data.delivery_distance_km;
      if (!data.delivery_available && data.delivery_error) {
        setPincodeResult(`❌ ${data.delivery_error}`, false);
        setDeliveryResult(0, null, "unavailable");
      } else {
        const ct =
          data.delivery_charge === 0
            ? "Free Delivery"
            : `₹${data.delivery_charge} delivery`;
        setPincodeResult(
          `✅ Available${km ? ` · ${km} km` : ""} — ${ct}`,
          true
        );
        setDeliveryResult(data.delivery_charge, km, "ok");
        const chip = document.getElementById("distanceChip"),
          chipText = document.getElementById("distanceText");
        if (chip && km) {
          chip.style.display = "flex";
          chipText.textContent = `${km} km from seller`;
        }
        if (data.delivery_warning) showDeliveryWarning(data.delivery_warning);
        else hideDeliveryWarning();
      }
      updateBillDisplay();
    } else
      setPincodeResult(
        `❌ ${data.message || "Could not check delivery"}`,
        false
      );
  } catch {
    setPincodeResult("❌ Could not connect", false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search"></i> Check';
    }
  }
}

function showDeliveryWarning(msg) {
  let el = document.getElementById("deliveryRangeWarning");
  if (!el) {
    el = document.createElement("div");
    el.id = "deliveryRangeWarning";
    el.style.cssText =
      "margin-top:8px;padding:7px 10px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:8px;font-size:.78rem;color:#92400e;display:flex;align-items:flex-start;gap:6px;line-height:1.4;";
    document
      .getElementById("pincodeResult")
      ?.insertAdjacentElement("afterend", el);
  }
  el.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#f59e0b;margin-top:1px;flex-shrink:0"></i><span>${msg}</span>`;
}
function hideDeliveryWarning() {
  document.getElementById("deliveryRangeWarning")?.remove();
}
function syncDeliveryPincode(v) {
  onPincodeInput(v);
}
function setPincodeResult(msg, ok) {
  const el = document.getElementById("pincodeResult");
  if (!el) return;
  el.textContent = msg;
  el.className = `pincode-result ${ok ? "ok" : "err"}`;
}
function setDeliveryResult(charge, km, type) {
  pricingData.deliveryCharge = charge;
  pricingData.deliveryAvailable =
    type !== "unavailable" && type !== "no_shipping";
  if (
    ["flat", "free", "no_shipping", "pickup", "ok", "unavailable"].includes(
      type
    )
  )
    pricingData.deliveryChecked = true;
  updateBillDisplay();
}

// =====================================================================
// BILL DISPLAY
// =====================================================================
function updateBillDisplay() {
  const qty = parseInt(document.getElementById("quantity")?.value) || 1;
  pricingData.quantity = qty;
  pricingData.subtotal = pricingData.basePrice * qty;
  pricingData.gstAmount =
    Math.round(((pricingData.subtotal * pricingData.gstRate) / 100) * 100) /
    100;
  pricingData.total =
    pricingData.subtotal + pricingData.gstAmount + pricingData.deliveryCharge;

  const s = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  };
  s("priceQty", qty);
  s("subtotalDisplay", fmt(pricingData.subtotal));
  s("gstBadge", `${pricingData.gstRate}%`);
  s(
    "gstDisplay",
    pricingData.gstRate > 0 ? fmt(pricingData.gstAmount) : "₹0.00 (Exempt)"
  );
  s("totalDisplay", fmt(pricingData.total));

  const dd = document.getElementById("deliveryDisplay");
  if (dd) {
    if (pricingData._isPickup) {
      dd.innerHTML = `<span style="color:#7c3aed;font-weight:700"><i class="fas fa-store" style="margin-right:4px;font-size:.8rem"></i>Pickup (Free)</span>`;
    } else if (!pricingData.deliveryAvailable) {
      dd.innerHTML = `<span style="color:#ef4444">Not deliverable</span>`;
    } else if (!pricingData.deliveryChecked) {
      dd.innerHTML = `<span class="delivery-calculating">Enter pincode to calculate</span>`;
    } else if (pricingData.deliveryCharge === 0) {
      dd.innerHTML = `<span style="color:#10b981;font-weight:700">FREE</span>`;
    } else {
      dd.innerHTML = fmt(pricingData.deliveryCharge);
    }
  }

  const etaRow = document.getElementById("etaRow"),
    etaDisplay = document.getElementById("etaDisplay");
  if (etaRow && etaDisplay) {
    if (
      pricingData.eta &&
      pricingData.deliveryAvailable &&
      !pricingData._isPickup
    ) {
      etaRow.style.display = "flex";
      etaDisplay.innerHTML = `<span style="font-weight:700;color:var(--primary-purple)">${pricingData.eta.eta_label}</span><span style="color:var(--text-secondary);font-size:.75rem;margin-left:4px">(est.)</span>`;
    } else etaRow.style.display = "none";
  }

  const unavailMsg = document.getElementById("deliveryUnavailableMsg");
  if (unavailMsg) unavailMsg.style.display = "none";

  _updatePlaceOrderBtn();
}

function _updatePlaceOrderBtn() {
  const btn = document.getElementById("placeOrderBtn");
  if (!btn) return;

  // Pickup mode — always enabled
  if (pricingData._isPickup) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.title = "";
    const el = document.getElementById("placeOrderText");
    if (el) el.textContent = `Place Order · ${fmt(pricingData.total)}`;
    _showPincodeRequiredBanner(false);
    return;
  }

  // Shipping mode
  const isShipped =
    !pricingData._isPickup && currentProductData?.shipping_available;
  if (!isShipped) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.title = "";
    const el = document.getElementById("placeOrderText");
    if (el) el.textContent = `Place Order · ${fmt(pricingData.total)}`;
    _showPincodeRequiredBanner(false);
    return;
  }
  if (!pricingData.deliveryChecked) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    btn.title = "Check delivery availability for your pincode first";
    const el = document.getElementById("placeOrderText");
    if (el) el.textContent = "Check Pincode First";
    _showPincodeRequiredBanner(true);
    return;
  }
  if (!pricingData.deliveryAvailable) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    btn.title = "Delivery not available to your pincode";
    const el = document.getElementById("placeOrderText");
    if (el) el.textContent = "Delivery Not Available";
    _showPincodeRequiredBanner(false);
    return;
  }
  btn.disabled = false;
  btn.style.opacity = "1";
  btn.style.cursor = "pointer";
  btn.title = "";
  const el = document.getElementById("placeOrderText");
  if (el) el.textContent = `Place Order · ${fmt(pricingData.total)}`;
  _showPincodeRequiredBanner(false);
}

function _showPincodeRequiredBanner(show) {
  const BANNER_ID = "_pincodeRequiredBanner";
  let banner = document.getElementById(BANNER_ID);
  if (!show) {
    if (banner) banner.remove();
    return;
  }
  if (banner) return;
  const pinInput = document.getElementById("deliveryPincode");
  if (!pinInput) return;
  banner = document.createElement("div");
  banner.id = BANNER_ID;
  banner.style.cssText =
    "margin-top:6px;padding:8px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:.78rem;color:#dc2626;display:flex;align-items:center;gap:6px;font-weight:500;";
  banner.innerHTML =
    '<i class="fas fa-exclamation-circle"></i> Enter your 6-digit pincode and tap <strong style="margin:0 3px">Check</strong> to verify delivery before ordering.';
  const parent =
    pinInput.closest(".form-group,.pincode-row,.input-group") ||
    pinInput.parentNode;
  parent.insertAdjacentElement("afterend", banner);
}

function updateTotals() {
  updateBillDisplay();
}

// =====================================================================
// QUANTITY
// =====================================================================
function increaseQuantity() {
  const i = document.getElementById("quantity"),
    m = parseInt(i.max) || 999,
    c = parseInt(i.value) || 1;
  if (c < m) {
    i.value = c + 1;
    updateBillDisplay();
  }
}
function decreaseQuantity() {
  const i = document.getElementById("quantity"),
    c = parseInt(i.value) || 1;
  if (c > 1) {
    i.value = c - 1;
    updateBillDisplay();
  }
}

// =====================================================================
// SUBMIT ORDER
// =====================================================================
async function submitOrder() {
  try {
    if (!pricingData._isPickup && currentProductData?.shipping_available) {
      if (!pricingData.deliveryChecked) {
        showToast(
          "Please check delivery availability for your pincode first",
          "error"
        );
        const pinInput = document.getElementById("deliveryPincode");
        if (pinInput) {
          pinInput.focus();
          pinInput.style.outline = "2px solid #ef4444";
          pinInput.style.boxShadow = "0 0 0 3px rgba(239,68,68,.2)";
          setTimeout(() => {
            pinInput.style.outline = "";
            pinInput.style.boxShadow = "";
          }, 3000);
          pinInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      if (!pricingData.deliveryAvailable) {
        showToast("Delivery is not available to your pincode.", "error");
        return;
      }
    }

    if (!pricingData._isPickup) {
      const pi = document.getElementById("phone");
      if (pi) {
        const pd = pi.value.replace(/\D/g, "");
        if (pd.length !== 10) {
          pi.setCustomValidity("Enter a valid 10-digit mobile number");
          pi.reportValidity();
          return;
        }
        pi.setCustomValidity("");
      }
      const form = document.getElementById("orderForm");
      if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
    }

    if (!currentUser) {
      showToast("Please login", "error");
      return;
    }
    if (!currentProductData) {
      showToast("Product not loaded", "error");
      return;
    }

    const qty = parseInt(document.getElementById("quantity").value);
    const stock = currentProductData.stock;
    if (stock !== null && stock !== undefined && qty > stock) {
      showToast(`Only ${stock} available`, "error");
      return;
    }

    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const orderBtn = document.getElementById("placeOrderBtn");
    const originalHTML = orderBtn.innerHTML;

    orderBtn.disabled = true;
    orderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing...';

    let requestBody;
    if (pricingData._isPickup) {
      const buyerNotes =
        document.getElementById("buyerNotesPickup")?.value?.trim() ||
        document.getElementById("buyerNotes")?.value?.trim() ||
        "";
      requestBody = {
        post_id: currentProductData.post_id,
        quantity: qty,
        currency: pricingData.currency,
        is_pickup: true,
        shipping_address: null,
        buyer_notes: buyerNotes,
      };
    } else {
      const pincode =
        document.getElementById("deliveryPincode")?.value?.trim() ||
        document.getElementById("pincode")?.value?.trim() ||
        "";
      const cs = document.getElementById("country");
      const cn =
        cs?.options[cs.selectedIndex]?.getAttribute("data-name") ||
        cs?.options[cs.selectedIndex]?.text ||
        "";
      const pi = document.getElementById("phone");
      const pd = pi ? pi.value.replace(/\D/g, "") : "";
      requestBody = {
        post_id: currentProductData.post_id,
        quantity: qty,
        currency: pricingData.currency,
        buyer_pincode: pincode,
        is_pickup: false,
        shipping_address: {
          full_name: document.getElementById("fullName")?.value.trim() || "",
          phone: pd,
          address_line1:
            document.getElementById("address1")?.value.trim() || "",
          address_line2:
            document.getElementById("address2")?.value.trim() || "",
          city: document.getElementById("city")?.value.trim() || "",
          state: document.getElementById("state")?.value.trim() || "",
          pincode: document.getElementById("pincode")?.value.trim() || "",
          country: cn,
          landmark: document.getElementById("landmark")?.value.trim() || "",
        },
        buyer_notes: document.getElementById("buyerNotes")?.value.trim() || "",
      };
    }

    const res = await fetch(`${API_BASE_URL}/product-orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to place order");

    const successMsg = pricingData._isPickup
      ? `Order placed! Coordinate pickup with the seller. Total: ${fmt(
          data.total_amount || pricingData.total
        )}`
      : `Order placed! Total: ${fmt(data.total_amount || pricingData.total)}`;

    showToast(successMsg, "success");

    // ✅ Reset button state before redirect
    orderBtn.disabled = false;
    orderBtn.innerHTML = originalHTML;

    // ✅ Close modal and redirect
    if (
      window.parent &&
      typeof window.parent.closeBookingModal === "function"
    ) {
      window.parent.closeBookingModal();
    } else {
      window.parent.postMessage({ action: "closeModal" }, "*");
    }

    setTimeout(() => {
      window.location.href = "my-deals.html?role=buyer&type=products";
    }, 500);
  } catch (e) {
    console.error("Order error:", e);
    showToast(e.message, "error");
    const orderBtn = document.getElementById("placeOrderBtn");
    if (orderBtn) {
      orderBtn.disabled = false;
      orderBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Place Order';
    }
  }
}

// =====================================================================
// AUTOFILL ADDRESS
// =====================================================================
async function autofillAddress() {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (!token) return;
  let filled = false;
  try {
    const res = await fetch(`${API_BASE_URL}/deals/buyer/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.orders?.length > 0) {
      const l = data.orders[0];
      if (l.shipping_full_name || l.shipping_address_line1) {
        sf("fullName", l.shipping_full_name);
        sf("phone", scc(l.shipping_phone));
        sf("address1", l.shipping_address_line1);
        sf("address2", l.shipping_address_line2);
        sf("pincode", l.shipping_pincode);
        sf("deliveryPincode", l.shipping_pincode);
        sf("landmark", l.shipping_landmark);
        await setLocationForce(
          l.shipping_country || "India",
          normState(l.shipping_state || ""),
          l.shipping_city || ""
        );
        filled = true;
        showAutofillBadge("last used address");
      }
    }
  } catch {}
  if (filled) return;
  try {
    const res = await fetch(`${API_BASE_URL}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success) return;
    const p = data.user || data.profile || data;
    sf("fullName", p.full_name);
    sf("phone", scc(p.phone));
    await setLocationForce(
      p.country || "India",
      normState(p.state || ""),
      p.city || ""
    );
    showAutofillBadge("your profile");
  } catch {}
}
function sf(id, v) {
  if (!v) return;
  const e = document.getElementById(id);
  if (e) e.value = v;
}
function scc(p) {
  if (!p) return "";
  return String(p)
    .trim()
    .replace(/^\+\d{1,3}[-\s]?/, "")
    .replace(/^0/, "")
    .replace(/\D/g, "");
}
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function showAutofillBadge(src) {
  if (document.getElementById("_autofillBadge")) return;
  const h = document.querySelector(".form-section h3");
  if (!h) return;
  const b = document.createElement("span");
  b.id = "_autofillBadge";
  b.innerHTML = `<i class="fas fa-magic"></i> Pre-filled from ${src}`;
  b.style.cssText =
    "display:inline-flex;align-items:center;gap:5px;font-size:.73rem;font-weight:500;color:#e60aea;background:rgba(230,10,234,.08);border:1px solid rgba(230,10,234,.2);padding:3px 10px;border-radius:20px;margin-left:10px;vertical-align:middle;white-space:nowrap;";
  h.appendChild(b);
  setTimeout(() => {
    b.style.transition = "opacity .6s";
    b.style.opacity = "0";
    setTimeout(() => b.remove(), 600);
  }, 5000);
}

// =====================================================================
// LOCATION DROPDOWNS
// =====================================================================
async function loadCountriesData() {
  const cSel = document.getElementById("country");
  if (!cSel) return;
  try {
    const res = await fetch("js/data/countries+states+cities.json");
    allCountriesData = await res.json();
    cSel.innerHTML = '<option value="">Select Country</option>';
    allCountriesData.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.iso2 || c.name;
      o.textContent = c.name;
      o.setAttribute("data-name", c.name);
      cSel.appendChild(o);
    });
    cSel.value = "IN";
    updateProductStates();
  } catch {}
}
function updateProductStates() {
  const cSel = document.getElementById("country");
  let sEl = document.getElementById("state");
  const cEl = document.getElementById("city");
  if (!sEl || !cEl) return;
  if (cEl.tagName.toLowerCase() === "select")
    cEl.innerHTML = `<option value="">Select State First</option>`;
  else cEl.value = "";
  const code = cSel.value;
  if (!code) {
    if (sEl.tagName.toLowerCase() === "select")
      sEl.innerHTML = `<option value="">Select Country First</option>`;
    else sEl.value = "";
    return;
  }
  const cd = allCountriesData.find((c) => c.iso2 === code);
  if (!cd?.states?.length) {
    if (sEl.tagName.toLowerCase() === "select") {
      const inp = makeInput("state", "Enter your state", sEl);
      sEl.replaceWith(inp);
    }
    return;
  }
  if (sEl.tagName.toLowerCase() === "input") {
    const sel = makeSelect("state", updateProductCities, sEl);
    sEl.replaceWith(sel);
    sEl = sel;
  }
  sEl.innerHTML = `<option value="">Select State</option>`;
  [...cd.states]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((s) => {
      const o = document.createElement("option");
      o.value = s.name;
      o.setAttribute("data-code", s.state_code);
      o.textContent = s.name;
      sEl.appendChild(o);
    });
}
function updateProductCities() {
  const cSel = document.getElementById("country"),
    sEl = document.getElementById("state");
  let ciEl = document.getElementById("city");
  if (!ciEl || !sEl) return;
  const code = cSel.value,
    sn = sEl.value;
  if (!sn) {
    if (ciEl.tagName.toLowerCase() === "select")
      ciEl.innerHTML = `<option value="">Select State First</option>`;
    else ciEl.value = "";
    return;
  }
  const cd = allCountriesData.find((c) => c.iso2 === code);
  if (!cd) return;
  const sd = cd.states.find((s) => s.name === sn);
  if (!sd?.cities?.length) {
    if (ciEl.tagName.toLowerCase() === "select") {
      const inp = makeInput("city", "Enter your city", ciEl);
      ciEl.replaceWith(inp);
    }
    return;
  }
  if (ciEl.tagName.toLowerCase() === "input") {
    const sel = makeSelect("city", null, ciEl);
    ciEl.replaceWith(sel);
    ciEl = sel;
  }
  ciEl.innerHTML = `<option value="">Select City</option>`;
  [...sd.cities]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((c) => {
      const o = document.createElement("option");
      o.value = c.name;
      o.textContent = c.name;
      ciEl.appendChild(o);
    });
}
function makeInput(id, ph, src) {
  const e = document.createElement("input");
  e.type = "text";
  e.id = id;
  e.className = src.className;
  e.placeholder = ph;
  e.required = true;
  return e;
}
function makeSelect(id, oc, src) {
  const e = document.createElement("select");
  e.id = id;
  e.className = src.className;
  e.style.fontSize = "12px";
  e.required = true;
  if (oc) e.onchange = oc;
  return e;
}

// =====================================================================
// FORM HANDLERS
// =====================================================================
function setupFormHandlers() {
  document
    .getElementById("quantity")
    ?.addEventListener("change", updateBillDisplay);
  const ph = document.getElementById("phone");
  if (ph) {
    ph.removeAttribute("pattern");
    ph.setAttribute("maxlength", "10");
    ph.setAttribute("inputmode", "numeric");
    ph.setAttribute("placeholder", "10-digit mobile number");
    ph.addEventListener("input", () => {
      let d = ph.value.replace(/\D/g, "").slice(0, 10);
      ph.value = d;
      ph.setCustomValidity(
        d.length === 10 ? "" : " Enter valid 10-digit number"
      );
    });
  }
  ["pincode", "deliveryPincode"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const val = el.value.replace(/\D/g, "").slice(0, 6);
      el.value = val;
      onPincodeInput(val);
    });
  });
  const form = document.getElementById("orderForm");
  if (form) {
    form.addEventListener("change", (e) => {
      const id = e.target?.id;
      if (id === "state") updateProductCities();
      if (id === "country") updateProductStates();
    });
  }
}

// =====================================================================
// UTILITIES
// =====================================================================
function constructMediaUrl(path, type = "post") {
  if (!path)
    return type === "profile"
      ? "images/default-avatar.png"
      : "images/placeholder.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const c = path.replace(/^\/+/, "").replace(/^uploads\//, "");
  return type === "profile"
    ? `${API_BASE_URL}/get-profile-pic/${c.split("/").pop()}`
    : `${API_BASE_URL}/uploads/${c.replace("posts/", "")}`;
}
function fmt(a, cur = pricingData.currency) {
  const s = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  return `${s[cur] || cur}${parseFloat(a || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function generateDefaultAvatar(n) {
  const i = (n || "U").charAt(0).toUpperCase(),
    c = [
      "%23e60aea",
      "%23e336cc",
      "%239b59b6",
      "%233498db",
      "%232ecc71",
      "%23f39c12",
      "%23e74c3c",
      "%231abc9c",
    ];
  return `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='80' height='80' rx='40' fill='${
    c[i.charCodeAt(0) % c.length]
  }'/%3E%3Ctext x='40' y='40' font-family='Arial,sans-serif' font-size='36' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central'%3E${i}%3C/text%3E%3C/svg%3E`;
}
function escapeHtmlSafe(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
function showToast(m, t = "success") {
  const el = document.getElementById("toast");
  el.classList.remove("success", "error");
  el.classList.add(t);
  el.querySelector("i").className =
    t === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle";
  document.getElementById("toastMessage").textContent = m;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}
function showError(m) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("summaryContent").style.display = "none";
  document.getElementById("errorState").style.display = "block";
  document.getElementById("errorMessage").textContent = m;
}
function closeSummary() {
  window.parent.postMessage({ action: "closeModal" }, "*");
}
function navigateToProfile() {
  if (!sellerId) return;
  window.parent.postMessage(
    { action: "navigateToProfile", userId: sellerId },
    "*"
  );
}
function toggleSummaryVideoMute(vid, btn) {
  const v = document.getElementById(vid),
    b = document.getElementById(btn);
  if (!v || !b) return;
  v.muted = !v.muted;
  b.querySelector("i").className = v.muted
    ? "fas fa-volume-mute"
    : "fas fa-volume-up";
}

window.checkDelivery = checkDelivery;
window.syncDeliveryPincode = syncDeliveryPincode;
window.submitOrder = submitOrder;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.updateTotals = updateTotals;
window.updateBillDisplay = updateBillDisplay;
window.closeSummary = closeSummary;
window.navigateToProfile = navigateToProfile;
window.loadProductDetails = loadProductDetails;
window.updateProductStates = updateProductStates;
window.updateProductCities = updateProductCities;
window.toggleSummaryVideoMute = toggleSummaryVideoMute;
window._updatePlaceOrderBtn = _updatePlaceOrderBtn;
window.chooseFulfillment = chooseFulfillment;

console.log(
  "✅ product-summary.js — Both-mode fixed: shipping fields properly restore on switch back"
);
