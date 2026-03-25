//=====================================================
// service-summary.js  — PATCH v3
// Fixes:
//   ✅ FIX 1: Remove duplicate preferred-date in at_provider / doorstep
//             (startDate already lives in the outer form — only render
//              the location-specific info card, no extra date input)
//   ✅ FIX 2: Travel fee NOW correctly adds to total
//             (totalPrice element found reliably via ID, not querySelector)
//   ✅ FIX 3: Out-of-range pincode fully blocks form submit
//   ✅ FIX 4: Slot-wise preferred time — loaded from API,
//             greys out booked slots when a date is chosen
// =====================================================

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

let currentServiceData = null;
let currentUser = null;
let providerId = null;
let selectedVariantId = null;
let selectedPrice = 0;
let buyerChosenLocType = null; // 'at_provider' | 'doorstep'  (for "both")

// Slot state
let _availableSlots = []; // [{slot_id, slot_label, slot_display}]
let _bookedSlots = {}; // { "YYYY-MM-DD": ["09:00","14:00",...] }
let _selectedSlot = null; // "09:00"

// Travel fee state
let _pincodeBlocked = false;
let _calculatedTravelFee = 0;
let _pincodeDebounce = null;

// =====================================================================
// INITIALIZATION
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
  initializePage();
});

async function initializePage() {
  const postId = new URLSearchParams(window.location.search).get("id");
  if (!postId) {
    showError("No service specified");
    return;
  }
  checkAuth();
  await loadServiceDetails(postId);
  setupFormHandlers();
  _initDateConstraints();
}

function _initDateConstraints() {
  const startDate = document.getElementById("startDate");
  if (!startDate) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 30);
  const fmt = (d) => d.toISOString().split("T")[0];

  startDate.min = fmt(today);
  startDate.max = fmt(maxDate);

  let hint = document.getElementById("startDateHint");
  if (!hint) {
    hint = document.createElement("small");
    hint.id = "startDateHint";
    hint.style.cssText =
      "display:block;margin-top:4px;font-size:.76rem;color:var(--text-secondary)";
    startDate.parentNode.insertBefore(hint, startDate.nextSibling);
  }
  hint.textContent = `Bookings only available today through ${fmt(
    maxDate
  )} (max 30 days ahead).`;

  const msg = document.createElement("div");
  msg.id = "startDateMsg";
  msg.style.cssText =
    "display:none;margin-top:5px;padding:8px 12px;background:rgba(239,68,68,.08);" +
    "border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:.82rem;color:#dc2626";
  startDate.parentNode.insertBefore(msg, hint.nextSibling);

  startDate.addEventListener("change", () => {
    if (!startDate.value) {
      msg.style.display = "none";
      return;
    }
    const val = new Date(startDate.value + "T00:00:00");
    if (val < today || val > maxDate) {
      msg.textContent = `Please pick a date between today and ${fmt(maxDate)}.`;
      msg.style.display = "block";
      startDate.value = "";
    } else {
      msg.style.display = "none";
    }
    // Refresh slot availability when date changes
    _renderSlotDropdown(startDate.value);
  });
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
    showError("Please login to book services");
    setTimeout(() => closeSummary(), 2000);
  }
}

// =====================================================================
// LOAD SERVICE + VARIANTS + SLOTS
// =====================================================================
async function loadServiceDetails(postId) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const [postRes, variantRes, slotRes] = await Promise.all([
      fetch(`${API_BASE_URL}/posts/${postId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }),
      fetch(`${API_BASE_URL}/posts/${postId}/variants`),
      fetch(`${API_BASE_URL}/posts/${postId}/slots`),
    ]);

    const postData = await postRes.json();
    const variantData = await variantRes.json();
    const slotData = await slotRes.json();

    if (!postData.success)
      throw new Error(postData.message || "Failed to load service");
    const post = postData.post;
    if (post.post_type !== "service")
      throw new Error("This is not a service post");
    if (currentUser && post.user_id === currentUser.id)
      throw new Error("You cannot book your own service");

    providerId = post.user_id;
    currentServiceData = post;
    selectedPrice = parseFloat(post.price || 0);

    _availableSlots = (slotData.success ? slotData.slots : null) || [];

    const variants = (variantData.success ? variantData.variants : null) || [];
    renderServiceDetails(post, variants);
    renderLocationFields(post);
  } catch (err) {
    showError(err.message);
  }
}

// =====================================================================
// RENDER SERVICE DETAILS
// =====================================================================
function renderServiceDetails(service, variants) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("summaryContent").style.display = "grid";

  const mediaUrl = constructMediaUrl(service.media_url, "post");
  const isVideo =
    service.media_type === "video" ||
    /\.(mp4|webm|mov)$/i.test(service.media_url || "");
  const img = document.getElementById("serviceImage");
  const vid = document.getElementById("serviceVideo");
  const muteBtn = document.getElementById("serviceVideoMuteBtn");

  if (isVideo) {
    img.style.display = "none";
    vid.style.display = "block";
    vid.src = mediaUrl;
    if (muteBtn) muteBtn.style.display = "flex";
  } else {
    img.src = mediaUrl;
    img.onerror = () => {
      img.src = "images/placeholder.png";
    };
    vid.style.display = "none";
    if (muteBtn) muteBtn.style.display = "none";
  }

  document.getElementById("serviceTitle").textContent =
    service.product_title || service.title || "Service";

  const provName = service.full_name || service.username || "Provider";
  const avatar = document.getElementById("providerAvatar");
  if (service.profile_pic) {
    avatar.src = constructMediaUrl(service.profile_pic, "profile");
    avatar.onerror = () => {
      avatar.src = generateDefaultAvatar(provName);
      avatar.onerror = null;
    };
  } else {
    avatar.src = generateDefaultAvatar(provName);
  }
  document.getElementById("providerName").textContent = provName;
  document.getElementById(
    "providerUsername"
  ).textContent = `@${service.username}`;

  const durEl = document.getElementById("serviceDuration");
  if (service.service_duration && durEl)
    durEl.textContent = service.service_duration;
  else
    durEl?.closest(".meta-item") &&
      (durEl.closest(".meta-item").style.display = "none");

  const dtEl = document.getElementById("deliveryTime");
  if (dtEl)
    dtEl.textContent = service.service_delivery_time
      ? `Delivery: ${service.service_delivery_time}`
      : "Delivery time not specified";

  const revEl = document.getElementById("revisionsInfo");
  if (service.includes_revisions && revEl) {
    revEl.style.display = "flex";
    document.getElementById("revisions").textContent = service.max_revisions
      ? `${service.max_revisions} revision${
          service.max_revisions > 1 ? "s" : ""
        }`
      : "Unlimited revisions";
  }

  document.getElementById("serviceDescription").textContent =
    service.full_description ||
    service.short_description ||
    "No description available";

  if (service.features) {
    try {
      let features = Array.isArray(service.features)
        ? service.features
        : service.features.trim().startsWith("[")
        ? JSON.parse(service.features)
        : service.features
            .split(/[\n,]/)
            .map((f) => f.trim().replace(/^[•✓✔-]\s*/, ""))
            .filter(Boolean);
      if (features.length > 0) {
        document.getElementById("serviceFeaturesContainer").style.display =
          "block";
        const list = document.getElementById("featuresList");
        list.innerHTML = "";
        features.forEach((f) => {
          const li = document.createElement("li");
          li.textContent = typeof f === "string" ? f : String(f);
          list.appendChild(li);
        });
      }
    } catch {
      /* silent */
    }
  }

  renderPricingSection(service, variants);
}

// ─────────────────────────────────────────────────────────────────────
// PRICING SECTION
// ─────────────────────────────────────────────────────────────────────
function renderPricingSection(service, variants) {
  const pricingCard = document.querySelector(".pricing-section .pricing-card");
  if (!pricingCard) return;

  const currency = service.currency || "INR";
  const basePrice = parseFloat(service.price || 0);

  // Build the bottom summary block separately so it's never wiped by variant re-renders
  // The pricingCard gets: [variant chooser OR service fee row] + [fixed bottom block]
  // The fixed bottom block always contains #travelFeeRow and #totalPrice

  const _bottomBlock = () => `
    <div id="priceSummaryBlock">
      <div class="price-divider"></div>
      <div id="travelFeeRow" class="price-row"
           style="display:none;justify-content:space-between;align-items:center;
                  font-size:.88rem;color:var(--text-secondary);padding:4px 0">
        <span><i class="fas fa-car" style="margin-right:4px;color:var(--primary-purple,#e60aea)"></i>Travel fee</span>
        <span id="travelFeeAmt" style="color:var(--primary-purple,#e60aea);font-weight:600"></span>
      </div>
      <div class="price-row total" style="font-weight:600;font-size:1.1rem">
        <span>Total Amount</span>
        <span class="total-price" id="totalPrice"></span>
      </div>
    </div>`;

  if (variants && variants.length > 0) {
    let variantHtml = `
      <div style="margin-bottom:14px">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:8px;color:var(--text-primary)">
          <i class="fas fa-tags" style="color:var(--primary-purple);margin-right:6px"></i>Choose a Package *
        </div>
        <div id="variantList" style="display:flex;flex-direction:column;gap:10px">
    `;
    variants.forEach((v, i) => {
      variantHtml += `
        <label class="variant-option" data-variant-id="${
          v.variant_id
        }" data-price="${v.price}"
               style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;
                      border:2px solid var(--border-color,#e5e7eb);border-radius:12px;
                      cursor:pointer;transition:all .2s;background:var(--bg-secondary)">
          <input type="radio" name="selectedVariant" value="${
            v.variant_id
          }" data-price="${v.price}"
                 onchange="onVariantChange(this)" ${i === 0 ? "checked" : ""}
                 style="margin-top:3px;accent-color:var(--primary-purple)" />
          <div style="flex:1">
            <div style="font-weight:700;font-size:.92rem;color:var(--text-primary)">${escHtml(
              v.variant_name
            )}</div>
            ${
              v.description
                ? `<div style="font-size:.8rem;color:var(--text-secondary);margin-top:2px">${escHtml(
                    v.description
                  )}</div>`
                : ""
            }
            ${
              v.duration_hours
                ? `<div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px"><i class="fas fa-clock" style="margin-right:4px"></i>${v.duration_hours}h</div>`
                : ""
            }
          </div>
          <div style="font-weight:800;font-size:1.05rem;color:var(--primary-purple);white-space:nowrap">
            ${formatCurrency(v.price, currency)}
          </div>
        </label>
      `;
    });
    variantHtml += `</div></div>${_bottomBlock()}`;
    selectedVariantId = variants[0].variant_id;
    selectedPrice = parseFloat(variants[0].price);
    pricingCard.innerHTML = variantHtml;
    highlightSelectedVariant();
  } else {
    selectedPrice = basePrice;
    pricingCard.innerHTML = `
      <div class="price-row">
        <span>Service Fee</span>
        <span class="price">${formatCurrency(basePrice, currency)}</span>
      </div>
      ${_bottomBlock()}`;
  }

  // Always set the total display after rendering
  _refreshTotalDisplay();
}

// ── Refresh total + fee row purely by ID — called after any render or fee change ──
function _refreshTotalDisplay() {
  const currency = currentServiceData?.currency || "INR";
  const fee = _calculatedTravelFee || 0;
  const total = parseFloat(selectedPrice) + fee;

  const totalEl = document.getElementById("totalPrice");
  const feeRow = document.getElementById("travelFeeRow");
  const feeAmt = document.getElementById("travelFeeAmt");

  if (totalEl) {
    totalEl.textContent = formatCurrency(total, currency);
    totalEl.style.color = fee > 0 ? "var(--primary-purple,#e60aea)" : "";
    totalEl.style.fontWeight = fee > 0 ? "800" : "";
  }

  if (feeRow) {
    feeRow.style.display = fee > 0 ? "flex" : "none";
  }
  if (feeAmt && fee > 0) {
    feeAmt.textContent = `+ ${formatCurrency(fee, currency)}`;
  }

  console.log(
    `💰 _refreshTotalDisplay: selectedPrice=₹${selectedPrice}, fee=₹${fee}, total=₹${total}, totalEl=${!!totalEl}`
  );
}

function onVariantChange(radio) {
  selectedVariantId = parseInt(radio.value);
  selectedPrice = parseFloat(radio.dataset.price);
  highlightSelectedVariant();
  _refreshTotalDisplay(); // re-render total with current fee
}
window.onVariantChange = onVariantChange;

function highlightSelectedVariant() {
  document.querySelectorAll(".variant-option").forEach((el) => {
    const isSelected = parseInt(el.dataset.variantId) === selectedVariantId;
    el.style.borderColor = isSelected
      ? "var(--primary-purple,#e60aea)"
      : "var(--border-color,#e5e7eb)";
    el.style.background = isSelected
      ? "rgba(230,10,234,.05)"
      : "var(--bg-secondary)";
  });
}

// ─────────────────────────────────────────────────────────────────────
// Travel fee updater — sets _calculatedTravelFee then refreshes display
// ─────────────────────────────────────────────────────────────────────
function _updateTotalWithTravelFee(travelFee) {
  _calculatedTravelFee = travelFee;
  _refreshTotalDisplay();
}

// ─────────────────────────────────────────────────────────────────────
// LOCATION FIELDS
// ─────────────────────────────────────────────────────────────────────
function renderLocationFields(service) {
  const locType = service.service_location_type || "online";
  const form = document.getElementById("bookingForm");
  if (!form) return;

  document.getElementById("dynamicLocationBlock")?.remove();

  const block = document.createElement("div");
  block.id = "dynamicLocationBlock";

  if (locType === "online") {
    block.innerHTML = _onlineTimelineHtml();
  } else if (locType === "at_provider") {
    block.innerHTML = _atProviderInfoHtml(service); // FIX 1: no extra date input
  } else if (locType === "doorstep") {
    block.innerHTML = _doorstepHtml(service);
  } else if (locType === "both") {
    buyerChosenLocType = null;
    const city = service.service_city || "";
    const state = service.service_state || "";
    const baseFee = parseFloat(service.doorstep_base_fee || 0);
    const perKm = parseFloat(service.doorstep_per_km || 0);

    block.innerHTML = `
      <div id="locationChoiceGroup" style="
        padding:16px;background:rgba(230,10,234,.05);
        border:2px solid var(--border-purple,#f889e5);
        border-radius:12px;margin-bottom:16px">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:12px">
          <i class="fas fa-map-marker-alt" style="color:var(--primary-purple)"></i>
          Where would you like the service? *
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div id="choiceAtProvider"
               style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                      border:2px solid var(--border-color,#e5e7eb);border-radius:10px;
                      cursor:pointer;background:var(--bg-secondary);transition:all .2s"
               onclick="document.getElementById('radioAtProvider').click()">
            <input type="radio" id="radioAtProvider" name="buyerLocChoice" value="at_provider"
                   onchange="onLocationChoiceChange(this)"
                   style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary-purple);cursor:pointer;pointer-events:none" />
            <div style="flex:1">
              <div style="font-weight:700;font-size:.9rem">
                <i class="fas fa-store" style="color:var(--primary-purple);margin-right:6px"></i>Visit provider's location
              </div>
              <div style="font-size:.8rem;color:var(--text-secondary);margin-top:3px">
                ${
                  city || state
                    ? `📍 ${[city, state].filter(Boolean).join(", ")}`
                    : "You travel to the provider"
                }
              </div>
            </div>
          </div>
          <div id="choiceDoorstep"
               style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                      border:2px solid var(--border-color,#e5e7eb);border-radius:10px;
                      cursor:pointer;background:var(--bg-secondary);transition:all .2s"
               onclick="document.getElementById('radioDoorstep').click()">
            <input type="radio" id="radioDoorstep" name="buyerLocChoice" value="doorstep"
                   onchange="onLocationChoiceChange(this)"
                   style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary-purple);cursor:pointer;pointer-events:none" />
            <div style="flex:1">
              <div style="font-weight:700;font-size:.9rem">
                <i class="fas fa-home" style="color:var(--primary-purple);margin-right:6px"></i>Provider comes to me (doorstep)
              </div>
              <div style="font-size:.8rem;color:var(--text-secondary);margin-top:3px">
                ${
                  baseFee > 0 || perKm > 0
                    ? `Travel fee: ₹${baseFee} base${
                        perKm > 0 ? ` + ₹${perKm}/km` : ""
                      }`
                    : "Provider travels to your location"
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="locationSubFields"></div>
    `;
  }

  const reqGroup = document
    .getElementById("requirements")
    ?.closest(".form-group");
  if (reqGroup) form.insertBefore(block, reqGroup);
  else form.appendChild(block);
}

function onLocationChoiceChange(radio) {
  buyerChosenLocType = radio.value;
  ["choiceAtProvider", "choiceDoorstep"].forEach((id) => {
    const card = document.getElementById(id);
    if (!card) return;
    const isChosen =
      card.querySelector("input[type=radio]")?.value === buyerChosenLocType;
    card.style.borderColor = isChosen
      ? "var(--primary-purple,#e60aea)"
      : "var(--border-color,#e5e7eb)";
    card.style.background = isChosen
      ? "rgba(230,10,234,.05)"
      : "var(--bg-secondary)";
  });
  const sub = document.getElementById("locationSubFields");
  if (!sub) return;
  if (buyerChosenLocType === "at_provider")
    sub.innerHTML = _atProviderInfoHtml(currentServiceData);
  else sub.innerHTML = _doorstepHtml(currentServiceData);
}
window.onLocationChoiceChange = onLocationChoiceChange;

// ── HTML helpers ──────────────────────────────────────────────────────

function _onlineTimelineHtml() {
  return `
    <div class="form-group">
      <label for="deliveryTimeline">
        <i class="fas fa-calendar-check"></i> Expected Delivery Timeline
      </label>
      <select id="deliveryTimeline" name="deliveryTimeline" class="form-group select"
              style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);
                     background:var(--bg-secondary);color:var(--text-primary);font-size:.9rem">
        <option value="">-- Select expected timeline --</option>
        <option value="1-2 days">1–2 days</option>
        <option value="3-5 days">3–5 days</option>
        <option value="1 week">1 week</option>
        <option value="2 weeks">2 weeks</option>
        <option value="1 month">1 month</option>
        <option value="flexible">Flexible — I'll discuss with provider</option>
      </select>
      <small style="color:var(--text-secondary);font-size:.78rem;margin-top:4px;display:block">
        Helps the provider plan their schedule
      </small>
    </div>
  `;
}

// FIX 1 — at_provider: only the info card, NO extra date input
// (startDate is already in the outer form)
function _atProviderInfoHtml(service) {
  const address = service.service_address || "";
  const city = service.service_city || "";
  const state = service.service_state || "";
  const pincode = service.service_pincode || "";
  const radius = parseInt(service.service_radius_km || 0);
  const mapsQuery = [address, city, state, pincode].filter(Boolean).join(", ");
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        mapsQuery
      )}`
    : null;
  const embedUrl = mapsQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(
        mapsQuery
      )}&output=embed&z=15`
    : null;
  const line1 = address;
  const line2 = [city, state].filter(Boolean).join(", ");
  const hasAny = address || city || state || pincode;

  return `
    <div class="form-group">
      <div style="border:1px solid rgba(59,130,246,.3);border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(59,130,246,.1)">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:12px 16px;display:flex;align-items:center;gap:10px">
          <i class="fas fa-store" style="color:white;font-size:1.1rem"></i>
          <span style="color:white;font-weight:700;font-size:.95rem">Visit Provider's Location</span>
        </div>
        ${
          hasAny
            ? `
        <div style="padding:14px 16px;background:rgba(59,130,246,.04)">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <i class="fas fa-map-marker-alt" style="color:#ef4444;font-size:1.1rem;margin-top:2px;flex-shrink:0"></i>
            <div style="flex:1">
              ${
                line1
                  ? `<div style="font-weight:700;font-size:.92rem;color:var(--text-primary);margin-bottom:2px">${escHtml(
                      line1
                    )}</div>`
                  : ""
              }
              ${
                line2
                  ? `<div style="font-size:.85rem;color:var(--text-secondary)">${escHtml(
                      line2
                    )}</div>`
                  : ""
              }
              ${
                pincode
                  ? `<span style="display:inline-block;margin-top:5px;background:#dbeafe;padding:2px 10px;border-radius:20px;font-size:.78rem;color:#1d4ed8;font-weight:600">📮 ${escHtml(
                      pincode
                    )}</span>`
                  : ""
              }
            </div>
          </div>
          ${
            radius > 0
              ? `<div style="margin-top:8px;font-size:.78rem;color:#3b82f6;display:flex;align-items:center;gap:5px"><i class="fas fa-broadcast-tower"></i>Service available within <strong>${radius} km</strong> of this location</div>`
              : ""
          }
        </div>`
            : `
        <div style="padding:14px 16px;font-size:.85rem;color:#6b7280;text-align:center;background:rgba(59,130,246,.04)">
          <i class="fas fa-map-marker-alt" style="margin-right:5px;opacity:.4"></i>Provider location not specified yet.
        </div>`
        }
        ${
          embedUrl
            ? `
        <div style="position:relative;width:100%;height:200px;background:#e2e8f0">
          <iframe src="${embedUrl}" width="100%" height="200" style="border:0;display:block"
                  allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>`
            : ""
        }
        ${
          mapsUrl
            ? `
        <div style="padding:12px 16px;background:white;border-top:1px solid rgba(59,130,246,.15)">
          <a href="${mapsUrl}" target="_blank" rel="noopener"
             style="display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;
                    background:#1d4ed8;color:white;border-radius:10px;font-size:.88rem;font-weight:700;
                    text-decoration:none;transition:background .2s"
             onmouseover="this.style.background='#1e40af'" onmouseout="this.style.background='#1d4ed8'">
            <i class="fas fa-directions" style="font-size:1rem"></i>Get Directions in Google Maps
          </a>
          <div style="text-align:center;margin-top:8px;font-size:.74rem;color:#6b7280">
            <i class="fas fa-info-circle" style="margin-right:3px"></i>You will travel to this location to receive the service
          </div>
        </div>`
            : ""
        }
      </div>
    </div>
  `;
  // NOTE: startDate is already in the outer form — no extra date input here
}

function _doorstepHtml(service) {
  const baseFee = parseFloat(service.doorstep_base_fee || 0);
  const perKm = parseFloat(service.doorstep_per_km || 0);
  const hasFee = baseFee > 0 || perKm > 0;
  const feeNote = hasFee
    ? `<div style="font-size:.78rem;color:var(--text-secondary);margin-top:4px">Formula: ₹${baseFee} base fee + ₹${perKm}/km × distance</div>`
    : "";

  return `
    <div class="form-group">
      <label><i class="fas fa-home"></i> Your Address (for doorstep service) *</label>
      <textarea id="buyerAddress" name="buyerAddress" rows="2"
                placeholder="Full address where service is needed"
                style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);
                       background:var(--bg-secondary);color:var(--text-primary);font-size:.9rem"
                required></textarea>
    </div>
    <div class="form-group">
      <label for="buyerPincode"><i class="fas fa-map-pin"></i> Your Pincode *</label>
      <input type="text" id="buyerPincode" name="buyerPincode"
             placeholder="6-digit pincode" inputmode="numeric" maxlength="6"
             oninput="onBuyerPincodeInput(this)"
             style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);
                    background:var(--bg-secondary);color:var(--text-primary);font-size:.9rem"
             required />
      ${feeNote}
      <div id="travelFeePreview" style="margin-top:8px;display:none;
           padding:10px 14px;background:rgba(230,10,234,.06);
           border:1px solid var(--border-purple,#f889e5);border-radius:8px;
           font-size:.83rem;color:var(--text-primary)">
        <i class="fas fa-calculator" style="color:var(--primary-purple);margin-right:5px"></i>
        <span id="travelFeeText">Calculating...</span>
      </div>
    </div>
  `;
  // NOTE: startDate is already in the outer form — no extra date input here
}

// ── Live travel fee calculation ────────────────────────────────────────
async function onBuyerPincodeInput(input) {
  const pincode = input.value.trim();
  const preview = document.getElementById("travelFeePreview");
  const text = document.getElementById("travelFeeText");
  if (!preview || !text) return;

  if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    preview.style.display = "none";
    _pincodeBlocked = false;
    _calculatedTravelFee = 0;
    _updateTotalWithTravelFee(0);
    _reEnableBookBtn();
    return;
  }

  preview.style.display = "block";
  text.innerHTML =
    '<i class="fas fa-spinner fa-spin" style="margin-right:5px"></i> Calculating travel distance...';

  clearTimeout(_pincodeDebounce);
  _pincodeDebounce = setTimeout(async () => {
    try {
      const service = currentServiceData;
      const baseFee = parseFloat(service.doorstep_base_fee || 0);
      const perKm = parseFloat(service.doorstep_per_km || 0);
      const radiusKm = parseInt(service.service_radius_km || 0);

      const resp = await fetch(`${API_BASE_URL}/delivery/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: service.post_id,
          buyer_pincode: pincode,
          type: "service",
        }),
      });
      const data = await resp.json();

      if (!data.success) {
        // Cannot verify pincode → hard block, not a soft warning
        _pincodeBlocked = true;
        _calculatedTravelFee = 0;
        _updateTotalWithTravelFee(0);
        preview.style.background = "rgba(239,68,68,.06)";
        preview.style.borderColor = "rgba(239,68,68,.35)";
        text.innerHTML = `
          <span style="font-weight:700;color:#dc2626">
            <i class="fas fa-times-circle" style="margin-right:5px"></i>Service not available at this pincode.
          </span><br>
          <span style="font-size:.8rem;color:#6b7280">
            Could not verify your location. Please check your pincode and try again.
          </span>`;
        _disableBookBtn("Service not available at this pincode");
        return;
      }

      const dist = parseFloat(data.distance_km || 0);
      const travelFee = Math.round(baseFee + dist * perKm);
      const isOutOfRange = !data.within_radius;

      if (isOutOfRange) {
        // FIX 3: hard block
        _pincodeBlocked = true;
        _calculatedTravelFee = 0;
        _updateTotalWithTravelFee(0);
        preview.style.background = "rgba(239,68,68,.06)";
        preview.style.borderColor = "rgba(239,68,68,.35)";
        text.innerHTML = `
          <span style="font-weight:700;color:#dc2626">
            <i class="fas fa-times-circle" style="margin-right:5px"></i>Service not available at your location.
          </span><br>
          <span style="font-size:.8rem;color:#6b7280">
            Provider travels within <strong>${radiusKm} km</strong>. Your distance: <strong>${dist.toFixed(
          1
        )} km</strong> — too far.
          </span>`;
        _disableBookBtn("Your location is outside the provider's service area");
      } else {
        _pincodeBlocked = false;
        _calculatedTravelFee = travelFee;
        _updateTotalWithTravelFee(travelFee);
        preview.style.background = "rgba(16,185,129,.06)";
        preview.style.borderColor = "rgba(16,185,129,.3)";
        text.innerHTML = `
          <i class="fas fa-check-circle" style="color:#10b981;margin-right:5px"></i>
          Distance: <strong>~${dist.toFixed(1)} km</strong>&nbsp;|&nbsp;
          Travel fee: <strong style="color:var(--primary-purple)">₹${travelFee}</strong>
          ${
            baseFee > 0 || perKm > 0
              ? `<span style="color:#6b7280;font-size:.78rem;margin-left:4px">(₹${baseFee} base + ${dist.toFixed(
                  1
                )} km × ₹${perKm})</span>`
              : ""
          }
          <br><span style="font-size:.78rem;color:#6b7280">Travel fee added to your total below.</span>`;
        _reEnableBookBtn();
      }
    } catch (e) {
      console.error("Travel fee error:", e);
      // Network/server error → block booking, don't silently proceed
      _pincodeBlocked = true;
      _calculatedTravelFee = 0;
      _updateTotalWithTravelFee(0);
      preview.style.background = "rgba(239,68,68,.06)";
      preview.style.borderColor = "rgba(239,68,68,.35)";
      text.innerHTML = `
        <span style="font-weight:700;color:#dc2626">
          <i class="fas fa-times-circle" style="margin-right:5px"></i>Service not available at this pincode.
        </span><br>
        <span style="font-size:.8rem;color:#6b7280">Unable to check delivery range. Please try again.</span>`;
      _disableBookBtn("Service not available at this pincode");
    }
  }, 600);
}
window.onBuyerPincodeInput = onBuyerPincodeInput;

function _disableBookBtn(reason) {
  const btn = document.getElementById("bookNowBtn");
  if (!btn) return;
  btn.disabled = true;
  btn.style.opacity = "0.5";
  btn.title = reason;
}
function _reEnableBookBtn() {
  const btn = document.getElementById("bookNowBtn");
  if (!btn) return;
  btn.disabled = false;
  btn.style.opacity = "";
  btn.title = "";
}

// =====================================================================
// FIX 4: SLOT-WISE PREFERRED TIME
// =====================================================================

/**
 * Inject the slot dropdown after the startDate field.
 * Called once during page init, then _renderSlotDropdown refreshes on date change.
 */
function _injectSlotPicker() {
  // Remove any stale injected slot picker
  document.getElementById("slotPickerGroup")?.remove();

  // Hide the static startTime input that may already be in the HTML
  // We replace it entirely with our dynamic slot picker group
  const existingStartTime = document.getElementById("startTime");
  if (existingStartTime) {
    // Hide its entire form-group wrapper so no duplicate time field shows
    const existingGroup =
      existingStartTime.closest(".form-group") || existingStartTime.parentNode;
    existingGroup.style.display = "none";
  }

  const startDateEl = document.getElementById("startDate");
  if (!startDateEl) return;

  const group = document.createElement("div");
  group.id = "slotPickerGroup";
  group.className = "form-group";

  if (_availableSlots.length === 0) {
    // Provider defined no slots → show a simple optional time input
    group.innerHTML = `
      <label><i class="fas fa-clock"></i> Preferred Time <small style="font-weight:400;color:var(--text-secondary)">(optional)</small></label>
      <input type="time" id="startTime" name="startTime"
             style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);
                    background:var(--bg-secondary);color:var(--text-primary);font-size:.9rem" />
      <small style="color:var(--text-secondary);font-size:.78rem;margin-top:4px;display:block">Indicate your preferred time — provider will confirm</small>
    `;
  } else {
    // Provider has defined slots → show slot grid, hide free-text input
    group.innerHTML = `
      <label><i class="fas fa-clock"></i> Preferred Time Slot *</label>
      <div id="slotGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:6px">
        <div style="color:var(--text-secondary);font-size:.85rem;padding:8px 0;grid-column:1/-1">
          <i class="fas fa-calendar-alt" style="margin-right:4px"></i>Select a date first to see available slots
        </div>
      </div>
      <input type="hidden" id="startTime" name="startTime" value="" />
    `;
  }

  // Insert right after startDate's parent group
  const dateGroup =
    startDateEl.closest(".form-group") || startDateEl.parentNode;
  dateGroup.parentNode.insertBefore(group, dateGroup.nextSibling);
}

/**
 * Re-render slot buttons for a given date, marking booked ones.
 * Fetches booked slots from API if not already cached.
 */
async function _renderSlotDropdown(dateStr) {
  const grid = document.getElementById("slotGrid");
  if (!grid || _availableSlots.length === 0) return;

  if (!dateStr) {
    grid.innerHTML = `<div style="color:var(--text-secondary);font-size:.85rem;padding:8px 0"><i class="fas fa-calendar-alt" style="margin-right:4px"></i>Select a date first to see available slots</div>`;
    return;
  }

  grid.innerHTML = `<div style="color:var(--text-secondary);font-size:.85rem;padding:8px 0"><i class="fas fa-spinner fa-spin" style="margin-right:4px"></i>Loading slots…</div>`;

  // Fetch booked slots for this date if not cached
  if (!_bookedSlots[dateStr]) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/posts/${currentServiceData.post_id}/booked-slots?date=${dateStr}`
      );
      const data = await res.json();
      _bookedSlots[dateStr] = data.success ? data.booked_slots : [];
    } catch {
      _bookedSlots[dateStr] = [];
    }
  }

  const booked = _bookedSlots[dateStr] || [];
  _selectedSlot = null;
  document.getElementById("startTime").value = "";

  grid.innerHTML = "";
  _availableSlots.forEach((slot) => {
    const isBooked = booked.includes(slot.slot_label);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.slotLabel = slot.slot_label;
    btn.disabled = isBooked;
    btn.title = isBooked
      ? "Already booked — choose another slot"
      : `Select ${slot.slot_display}`;
    btn.style.cssText = `
      padding:10px 12px;border-radius:10px;font-size:.85rem;font-weight:600;
      text-align:center;cursor:${isBooked ? "not-allowed" : "pointer"};
      border:2px solid ${
        isBooked ? "rgba(220,38,38,.3)" : "var(--border-color,#e5e7eb)"
      };
      background:${isBooked ? "rgba(220,38,38,.06)" : "var(--bg-secondary)"};
      color:${isBooked ? "#b91c1c" : "var(--text-primary)"};
      opacity:${isBooked ? "0.6" : "1"};
      transition:all .2s;position:relative;`;
    btn.innerHTML = isBooked
      ? `<span style="display:flex;align-items:center;justify-content:center;gap:4px">
           <i class="fas fa-lock" style="font-size:.68rem"></i>${slot.slot_display}
         </span>
         <small style="display:block;font-size:.68rem;font-weight:700;margin-top:2px;letter-spacing:.3px">BOOKED</small>`
      : `<span>${slot.slot_display}</span>
         ${
           slot.duration_mins > 0
             ? `<small style="display:block;font-size:.68rem;color:var(--text-secondary);font-weight:400;margin-top:1px">${slot.duration_mins}m</small>`
             : ""
         }`;

    if (!isBooked) {
      btn.addEventListener("click", () => _selectSlot(slot.slot_label, btn));
    }
    grid.appendChild(btn);
  });
}

function _selectSlot(label, btn) {
  _selectedSlot = label;
  document.getElementById("startTime").value = label;

  // Highlight selected
  document.querySelectorAll("#slotGrid button").forEach((b) => {
    const sel = b.dataset.slotLabel === label;
    b.style.borderColor = sel
      ? "var(--primary-purple,#e60aea)"
      : "var(--border-color,#e5e7eb)";
    b.style.background = sel ? "rgba(230,10,234,.1)" : "var(--bg-secondary)";
    b.style.color = sel
      ? "var(--primary-purple,#e60aea)"
      : "var(--text-primary)";
  });
}

// =====================================================================
// FORM HANDLING
// =====================================================================
function setupFormHandlers() {
  const req = document.getElementById("requirements");
  const charCount = document.getElementById("charCount");
  if (req && charCount) {
    req.addEventListener("input", (e) => {
      charCount.textContent = e.target.value.length;
      charCount.style.color =
        e.target.value.length > 500 ? "var(--error-red)" : "var(--text-muted)";
    });
  }

  const contactMethod = document.getElementById("contactMethod");
  const contactInfo = document.getElementById("contactInfo");
  if (contactMethod && contactInfo) {
    contactMethod.addEventListener("change", (e) => {
      const m = e.target.value;
      contactInfo.type = m === "email" ? "email" : "tel";
      contactInfo.placeholder =
        m === "email" ? "Enter your email address" : "Enter your phone number";
    });
  }

  // Inject slot picker after form is ready
  _injectSlotPicker();
}
// =====================================================================
// REPLACE ONLY the submitBooking function in service-summary.js
// Find:  async function submitBooking() {
// Replace the entire function with this:
// =====================================================================

async function submitBooking() {
  try {
    if (!currentUser) {
      showToast("Please login to book services", "error");
      return;
    }
    if (!currentServiceData) {
      showToast("Service data not loaded", "error");
      return;
    }

    const locType = currentServiceData.service_location_type || "online";
    if (locType === "both" && !buyerChosenLocType) {
      showToast(
        "Please choose whether you will visit the provider or need doorstep service.",
        "error"
      );
      return;
    }
    const resolvedLocType = locType === "both" ? buyerChosenLocType : locType;

    if (resolvedLocType === "doorstep" && _pincodeBlocked) {
      showToast(
        "Your location is outside the provider's service area. Booking not possible.",
        "error"
      );
      return;
    }

    const requirements = document.getElementById("requirements")?.value.trim();
    if (!requirements) {
      showToast("Please describe your project requirements.", "error");
      return;
    }

    const contactInfo = document.getElementById("contactInfo")?.value.trim();
    if (!contactInfo) {
      showToast("Please enter your contact information.", "error");
      return;
    }

    const startDateVal = document.getElementById("startDate")?.value;
    if (startDateVal) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 30);
      const picked = new Date(startDateVal + "T00:00:00");
      if (picked < today || picked > maxDate) {
        showToast("Please pick a start date within the next 30 days.", "error");
        return;
      }
    }

    const variantRadios = document.querySelectorAll(
      'input[name="selectedVariant"]'
    );
    if (variantRadios.length > 0 && !selectedVariantId) {
      showToast("Please select a pricing package.", "error");
      return;
    }

    if (_availableSlots.length > 0 && startDateVal && !_selectedSlot) {
      showToast("Please select a preferred time slot.", "error");
      return;
    }

    if (resolvedLocType === "doorstep") {
      const pin = document.getElementById("buyerPincode")?.value.trim();
      if (!pin || pin.length !== 6) {
        showToast("Please enter your 6-digit pincode.", "error");
        return;
      }
      const addr = document.getElementById("buyerAddress")?.value.trim();
      if (!addr) {
        showToast("Please enter your address for doorstep service.", "error");
        return;
      }
    }

    const formData = {
      post_id: currentServiceData.post_id,
      preferred_start_date: startDateVal || null,
      preferred_time: document.getElementById("startTime")?.value || null,
      booked_slot: _selectedSlot || null,
      customer_requirements: requirements,
      contact_method: document.getElementById("contactMethod").value,
      customer_contact: contactInfo,
      additional_notes:
        document.getElementById("additionalNotes")?.value.trim() || "",
      currency: currentServiceData.currency || "INR",
      variant_id: selectedVariantId || null,
      selected_variant_name: selectedVariantId
        ? document
            .querySelector('input[name="selectedVariant"]:checked')
            ?.closest("label")
            ?.querySelector("div")
            ?.textContent?.trim() || null
        : null,
      variant_price: selectedVariantId ? selectedPrice : null,
      travel_fee_preview: _calculatedTravelFee || 0,
      location_type: resolvedLocType,
      delivery_timeline:
        document.getElementById("deliveryTimeline")?.value || null,
      buyer_address:
        document.getElementById("buyerAddress")?.value.trim() || null,
      buyer_pincode:
        document.getElementById("buyerPincode")?.value.trim() || null,
    };

    const bookBtn = document.getElementById("bookNowBtn");
    const originalHTML = bookBtn.innerHTML;
    bookBtn.disabled = true;
    bookBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Sending Request...';

    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}/service-bookings/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!data.success)
      throw new Error(data.message || "Failed to create booking");

    // ✅ FIX: Show toast FIRST, then close + redirect AFTER toast is visible
    bookBtn.disabled = false;
    bookBtn.innerHTML = '<i class="fas fa-check"></i> Booking Sent!';
    bookBtn.style.background = "#10b981";

    showToast("✅ Booking request sent successfully!", "success");

    // ✅ Wait 1.8s so the user sees the success message, THEN close and redirect
    setTimeout(() => {
      // Notify parent to close modal
      if (
        window.parent &&
        typeof window.parent.closeBookingModal === "function"
      ) {
        window.parent.closeBookingModal();
      } else {
        window.parent.postMessage({ action: "closeModal" }, "*");
      }
      // Redirect to My Deals
      window.location.href = "my-deals.html?role=buyer&type=services";
    }, 1800);
  } catch (err) {
    console.error("Booking error:", err);
    showToast(err.message || "Failed to send booking request", "error");
    const bookBtn = document.getElementById("bookNowBtn");
    if (bookBtn) {
      bookBtn.disabled = false;
      bookBtn.innerHTML =
        '<i class="fas fa-calendar-check"></i> Send Booking Request';
      bookBtn.style.background = "";
    }
  }
}

// =====================================================================
// UTILITIES  (unchanged from original)
// =====================================================================
function constructMediaUrl(path, type = "post") {
  if (!path)
    return type === "profile"
      ? "images/default-avatar.png"
      : "images/placeholder.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path.replace(/^\/+/, "").replace(/^uploads\//, "");
  return type === "profile"
    ? `${API_BASE_URL}/get-profile-pic/${clean.split("/").pop()}`
    : `${API_BASE_URL}/uploads/${clean.replace("posts/", "")}`;
}

function formatCurrency(amount, currency = "INR") {
  const symbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
  return `${symbols[currency] || currency}${parseFloat(
    amount || 0
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function generateDefaultAvatar(name) {
  const initial = (name || "U").charAt(0).toUpperCase();
  const colors = [
    "%23e60aea",
    "%23e336cc",
    "%239b59b6",
    "%233498db",
    "%232ecc71",
    "%23f39c12",
    "%23e74c3c",
    "%231abc9c",
  ];
  const c = colors[initial.charCodeAt(0) % colors.length];
  return `data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='80' height='80' rx='40' fill='${c}'/%3E%3Ctext x='40' y='40' font-family='Arial,sans-serif' font-size='36' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central'%3E${initial}%3C/text%3E%3C/svg%3E`;
}

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str || "");
  return d.innerHTML;
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.classList.remove("success", "error");
  toast.classList.add(type);
  toast.querySelector("i").className =
    type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle";
  document.getElementById("toastMessage").textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function showError(message) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("summaryContent").style.display = "none";
  document.getElementById("errorState").style.display = "block";
  document.getElementById("errorMessage").textContent = message;
}

function closeSummary() {
  // Send message to parent to close modal
  window.parent.postMessage({ action: "closeModal" }, "*");
}
function navigateToProfile() {
  if (!providerId) return;
  window.parent.postMessage(
    { action: "navigateToProfile", userId: providerId },
    "*"
  );
}
function toggleSummaryVideoMute(videoId, btnId) {
  const video = document.getElementById(videoId);
  const btn = document.getElementById(btnId);
  if (!video || !btn) return;
  video.muted = !video.muted;
  btn.querySelector("i").className = video.muted
    ? "fas fa-volume-mute"
    : "fas fa-volume-up";
}

window.submitBooking = submitBooking;
window.closeSummary = closeSummary;
window.navigateToProfile = navigateToProfile;
window.loadServiceDetails = loadServiceDetails;
window.toggleSummaryVideoMute = toggleSummaryVideoMute;

console.log(
  "✅ service-summary.js v3 — slot picker + travel fee fix + no duplicate date + range block"
);
