// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

let currentPostId = null,
  currentPostData = null,
  currentUser = null;
let cropper = null,
  originalImageSrc = null,
  croppedBlob = null;
let _editVariants = [],
  _editSlots = [];
let _fulfillmentMode = "shipping"; // 'shipping'|'pickup'|'both'
let _locationCountries = [];
let _pendingPickupState = "",
  _pendingPickupCity = "";
let _pendingServiceState = "",
  _pendingServiceCity = "";
let _pickupAutofillDone = false; // guard: only autofill once per page load

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadHeaderAndSidebar();
  const urlParams = new URLSearchParams(window.location.search);
  currentPostId = urlParams.get("id");
  if (!currentPostId) {
    showNotification("No post ID provided", "error");
    setTimeout(() => (location.href = "profile.html"), 2000);
    return;
  }
  const session = getActiveSession();
  if (!session) {
    location.href = "login.html";
    return;
  }
  currentUser = session.user;
  await _loadLocationData();
  await loadPostData();
  initializeEventListeners();
});

async function loadHeaderAndSidebar() {
  try {
    const [hr, sr] = await Promise.all([
      fetch("header.html"),
      fetch("sidebar.html"),
    ]);
    document.getElementById("header").innerHTML = await hr.text();
    document.getElementById("sidebar").innerHTML = await sr.text();
    const hs = document.createElement("script");
    hs.src = "js/header.js";
    document.body.appendChild(hs);
    const ss = document.createElement("script");
    ss.src = "js/sidebar.js";
    document.body.appendChild(ss);
  } catch (e) {
    console.error(e);
  }
}

function getActiveSession() {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");
  if (!token || !userData) return null;
  try {
    return { token, user: JSON.parse(userData) };
  } catch {
    return null;
  }
}

// ===== LOCATION DATA =====
async function _loadLocationData() {
  try {
    const res = await fetch("js/data/countries+states+cities.json");
    _locationCountries = await res.json();
  } catch (e) {
    console.warn("Could not load location data:", e);
  }
}

// ===== LOAD POST =====
async function loadPostData() {
  try {
    showLoading(true);
    const session = getActiveSession();
    const res = await fetch(`${API_BASE_URL}/posts/${currentPostId}/edit`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (data.success) {
      currentPostData = data.post;
      if (currentPostData.post_type === "service") {
        await loadVariants();
        await loadSlots();
      }
      populateForm(currentPostData);
      updatePreview();
    } else {
      showNotification(data.message || "Failed to load post", "error");
      setTimeout(() => (location.href = "profile.html"), 2000);
    }
  } catch (e) {
    showNotification("Failed to load post data", "error");
    setTimeout(() => (location.href = "profile.html"), 2000);
  } finally {
    showLoading(false);
  }
}

async function loadVariants() {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${currentPostId}/variants`);
    const d = await res.json();
    _editVariants = d.success ? d.variants || [] : [];
  } catch {
    _editVariants = [];
  }
}
async function loadSlots() {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${currentPostId}/slots`);
    const d = await res.json();
    _editSlots = d.success ? d.slots || [] : [];
  } catch {
    _editSlots = [];
  }
}

// ===== POPULATE FORM =====
function populateForm(post) {
  document.getElementById("postCaption").value = post.caption || "";
  document.getElementById("postPrivacy").value = post.privacy || "public";
  updateCharCount();
  loadMediaPreview(post);

  const t = post.post_type;
  const show = (id, visible) => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? "block" : "none";
  };
  show("showcaseFields", t === "showcase");
  show("serviceFields", t === "service");
  show("serviceLocationSection", t === "service");
  show("serviceVariantsSection", t === "service");
  show("serviceSlotsSection", t === "service");
  show("productFields", t === "product");
  show("productFulfillmentSection", t === "product");

  if (t === "showcase") {
    _v("postTags", post.tags);
  } else if (t === "service") {
    _v("serviceTitle", post.title);
    _v("servicePrice", post.price);
    _v("serviceShortDesc", post.short_description);
    _v("serviceFullDesc", post.full_description);
    _v("serviceDuration", post.service_duration);
    _v("serviceDeliveryTime", post.service_delivery_time);
    _v("serviceFeatures", post.features);
    _v("contactEmail", post.contact_email);
    _v("contactPhone", post.contact_phone);

    const revEl = document.getElementById("includesRevisions");
    revEl.checked = !!post.includes_revisions;
    document.getElementById("revisionsDetail").style.display = revEl.checked
      ? "block"
      : "none";
    _v("maxRevisions", post.max_revisions);

    const bkEl = document.getElementById("requiresBooking");
    bkEl.checked = !!post.requires_advance_booking;
    document.getElementById("bookingDetail").style.display = bkEl.checked
      ? "block"
      : "none";
    _v("bookingNoticeDays", post.booking_notice_days);

    const locType = post.service_location_type || "online";
    document
      .querySelectorAll('input[name="service_location_type"]')
      .forEach((r) => (r.checked = r.value === locType));
    _v("serviceAddress", post.service_address);
    _v("servicePincode", post.service_pincode);
    _v("serviceRadiusKm", post.service_radius_km);
    _v("doorstepBaseFee", post.doorstep_base_fee);
    _v("doorstepPerKm", post.doorstep_per_km);
    if (locType === "doorstep" || locType === "both") {
      _v("doorstepPincode", post.service_pincode);
      _v("doorstepRadius", post.service_radius_km);
    }
    _pendingServiceState = post.service_state || "";
    _pendingServiceCity = post.service_city || "";
    onLocTypeChange();

    renderExistingVariants();
    renderExistingSlots();
  } else if (t === "product") {
    _v("productTitle", post.product_title);
    _v("productPrice", post.price);
    _v("productStock", post.stock);
    _v("productCondition", post.condition_type);
    _v("productBrand", post.brand);
    _v("productSku", post.sku);
    _v("productShortDesc", post.short_description);
    _v("productFullDesc", post.full_description);
    _v("productFeatures", post.features);
    _v("returnPolicy", post.return_policy);
    _cb("acceptsCod", post.accepts_cod);

    // Determine fulfillment mode from saved data
    const shippingOn = !!post.shipping_available;
    const hasPickup = !!(
      post.pickup_city ||
      post.pickup_address ||
      post.pickup_pincode
    );
    _fulfillmentMode =
      shippingOn && hasPickup ? "both" : !shippingOn ? "pickup" : "shipping";

    // Store pending pickup location for cascade
    _pendingPickupState = post.pickup_state || "";
    _pendingPickupCity = post.pickup_city || "";

    // Apply tabs (this will init cascade and fill saved state/city)
    _applyFulfillmentTabs(_fulfillmentMode);

    // Fill shipping fields
    _v("sellerPincode", post.seller_pincode);
    _v("estimatedDeliveryDays", post.estimated_delivery_days);
    _v("freeShippingThreshold", post.free_shipping_threshold);
    _v("deliveryMaxKm", post.delivery_max_km);

    const chargeType = post.delivery_charge_type || "flat";
    document
      .querySelectorAll('input[name="delivery_charge_type"]')
      .forEach((r) => (r.checked = r.value === chargeType));
    if (chargeType === "flat")
      _v("flatDeliveryCharge", post.base_delivery_charge);
    else if (chargeType === "per_km") {
      _v("baseDeliveryChargeKm", post.base_delivery_charge);
      _v("perKmRate", post.per_km_rate);
    }
    onDeliveryTypeChange();

    // Fill pickup text fields (address & pincode) — cascade handles state/city
    _v("pickupAddress", post.pickup_address);
    _v("pickupPincode", post.pickup_pincode);
  }
}

function _v(id, val) {
  const el = document.getElementById(id);
  if (el && val !== null && val !== undefined) el.value = val;
}
function _cb(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

// =====================================================================
// AUTOFILL: pre-fill pickup address from profile
// Only fires when there is NO saved pickup data on the post
// =====================================================================
async function _autofillPickupFromProfile() {
  if (_pickupAutofillDone) return;

  // Don't overwrite if user already has pickup data saved
  const addrEl = document.getElementById("pickupAddress");
  const pinEl = document.getElementById("pickupPincode");
  const cityEl = document.getElementById("pickupCity");

  const hasExistingData =
    (addrEl && addrEl.value.trim()) ||
    (pinEl && pinEl.value.trim()) ||
    (cityEl &&
      cityEl.value &&
      cityEl.value !== "" &&
      cityEl.tagName === "SELECT" &&
      cityEl.selectedIndex > 0);

  if (hasExistingData) {
    console.log("⏭️  Pickup autofill skipped — existing data found");
    _pickupAutofillDone = true;
    return;
  }

  const session = getActiveSession();
  if (!session) return;

  try {
    const res = await fetch(`${API_BASE_URL}/profile/me`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const data = await res.json();
    if (!data.success) return;

    const p = data.user || data.profile || data;

    // Helper: only fill if field is currently empty
    const _sf = (id, val) => {
      if (!val) return;
      const el = document.getElementById(id);
      if (el && !el.value.trim()) el.value = val;
    };

    _sf("pickupAddress", p.address || p.street_address || "");
    _sf("pickupPincode", p.pincode || p.postal_code || "");

    // Set state then cascade to city
    if (p.state) {
      setTimeout(() => {
        _lsSetVal("pickupState", p.state);
        const stEl = document.getElementById("pickupState");
        const code = document.getElementById("pickupCountry")?.value || "IN";
        if (stEl?.tagName === "SELECT" && stEl.value) {
          _fillCities(code, stEl.value, "pickupCity");
          if (p.city) {
            setTimeout(() => _lsSetVal("pickupCity", p.city), 100);
          }
        } else if (p.city) {
          _lsSetVal("pickupCity", p.city);
        }
      }, 150);
    }

    _pickupAutofillDone = true;

    // Show a subtle badge so the user knows it was autofilled
    _showAutofillBadge();
    console.log("✅ Edit-post pickup autofilled from profile");
  } catch (e) {
    console.warn("_autofillPickupFromProfile failed:", e);
  }
}

function _showAutofillBadge() {
  const sec = document.getElementById("productPickupSection");
  if (!sec || document.getElementById("_pickupAutofillBadge")) return;
  const heading = sec.querySelector("div"); // first child div (the title row)
  if (!heading) return;
  const badge = document.createElement("span");
  badge.id = "_pickupAutofillBadge";
  badge.innerHTML = `<i class="fas fa-magic"></i> Pre-filled from your profile`;
  badge.style.cssText =
    "display:inline-flex;align-items:center;gap:5px;font-size:.72rem;font-weight:500;" +
    "color:#e60aea;background:rgba(230,10,234,.08);border:1px solid rgba(230,10,234,.2);" +
    "padding:3px 10px;border-radius:20px;margin-left:10px;white-space:nowrap;";
  heading.appendChild(badge);
  setTimeout(() => {
    badge.style.transition = "opacity .6s";
    badge.style.opacity = "0";
    setTimeout(() => badge.remove(), 600);
  }, 4000);
}

// =====================================================================
// FULFILLMENT TABS
// =====================================================================
function setFulfillmentTab(mode) {
  _fulfillmentMode = mode;
  _applyFulfillmentTabs(mode);
  updatePreview();
}
window.setFulfillmentTab = setFulfillmentTab;

function _applyFulfillmentTabs(mode) {
  ["shipping", "pickup", "both"].forEach((key) => {
    const btn = document.getElementById(
      "tab" + key.charAt(0).toUpperCase() + key.slice(1)
    );
    if (!btn) return;
    btn.style.background =
      key === mode
        ? "var(--primary-purple,#e60aea)"
        : "var(--bg-secondary,#f8f9fa)";
    btn.style.color = key === mode ? "#fff" : "var(--text-secondary,#6c757d)";
  });

  const shipDet = document.getElementById("shippingDetails");
  const pickupSec = document.getElementById("productPickupSection");

  if (shipDet)
    shipDet.style.display =
      mode === "shipping" || mode === "both" ? "block" : "none";
  if (pickupSec)
    pickupSec.style.display =
      mode === "pickup" || mode === "both" ? "block" : "none";

  // Init cascade when pickup section becomes visible for the first time
  if ((mode === "pickup" || mode === "both") && pickupSec) {
    if (!pickupSec.dataset.cascadeReady) {
      // Pass saved state/city so cascade pre-selects them
      _initPickupCascade(_pendingPickupState, _pendingPickupCity);
    }

    // Autofill from profile ONLY when no pickup data exists on the post
    if (!_pendingPickupState && !_pendingPickupCity) {
      // Small delay so cascade dropdowns are built first
      setTimeout(_autofillPickupFromProfile, 300);
    }
  }
}

// ===== LOCATION TYPE (Service) =====
function onLocTypeChange() {
  const locType =
    document.querySelector('input[name="service_location_type"]:checked')
      ?.value || "online";
  const atBlock = document.getElementById("atProviderBlock");
  const dsBlock = document.getElementById("doorstepBlock");
  if (atBlock)
    atBlock.style.display = ["at_provider", "both"].includes(locType)
      ? "block"
      : "none";
  if (dsBlock)
    dsBlock.style.display = ["doorstep", "both"].includes(locType)
      ? "block"
      : "none";
  if (
    atBlock &&
    atBlock.style.display !== "none" &&
    !atBlock.dataset.cascadeReady
  ) {
    _initServiceCascade(_pendingServiceState, _pendingServiceCity);
  }
}
window.onLocTypeChange = onLocTypeChange;

function onDeliveryTypeChange() {
  const type =
    document.querySelector('input[name="delivery_charge_type"]:checked')
      ?.value || "flat";
  document.getElementById("flatFields").style.display =
    type === "flat" ? "grid" : "none";
  document.getElementById("perKmFields").style.display =
    type === "per_km" ? "grid" : "none";
  document.getElementById("perKmMaxField").style.display =
    type === "per_km" ? "block" : "none";
  document.getElementById("freeShippingNote").style.display =
    type === "free" ? "block" : "none";
}
window.onDeliveryTypeChange = onDeliveryTypeChange;

// =====================================================================
// LOCATION CASCADE  Country → State → City
// =====================================================================
function _lsSelect(id, placeholder, onChange) {
  let el = document.getElementById(id);
  if (!el) return null;
  let sel;
  if (el.tagName === "SELECT") {
    sel = el;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
  } else {
    sel = document.createElement("select");
    sel.id = id;
    sel.name = el.name || id;
    sel.className = el.className || "form-input";
    const sty = el.getAttribute("style") || "";
    if (sty) sel.setAttribute("style", sty);
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    el.replaceWith(sel);
  }
  if (onChange) sel.onchange = onChange;
  return sel;
}

function _lsText(id, placeholder) {
  let el = document.getElementById(id);
  if (!el) return null;
  if (el.tagName === "INPUT") {
    el.value = "";
    el.placeholder = placeholder;
    return el;
  }
  const inp = document.createElement("input");
  inp.type = "text";
  inp.id = id;
  inp.name = el.name || id;
  inp.className = el.className || "form-input";
  inp.placeholder = placeholder;
  el.replaceWith(inp);
  return inp;
}

function _lsSetVal(id, val) {
  if (!val) return;
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === "SELECT") {
    const opt =
      Array.from(el.options).find((o) => o.value === val) ||
      Array.from(el.options).find(
        (o) => o.value.toLowerCase() === val.toLowerCase()
      ) ||
      Array.from(el.options).find(
        (o) => o.text.toLowerCase() === val.toLowerCase()
      );
    if (opt) el.value = opt.value;
  } else {
    el.value = val;
  }
}

function _fillStates(code, stateId, cityId, onStateChange) {
  const cityEl = document.getElementById(cityId);
  if (cityEl?.tagName === "SELECT")
    cityEl.innerHTML = `<option value="">-- Select State First --</option>`;
  else if (cityEl) cityEl.value = "";
  if (!code) {
    _lsText(stateId, "Enter state");
    return;
  }
  const country = _locationCountries.find((c) => c.iso2 === code);
  if (!country?.states?.length) {
    _lsText(stateId, "Enter state");
    return;
  }
  const sel = _lsSelect(stateId, "-- Select State --", onStateChange);
  if (!sel) return;
  [...country.states]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((s) => {
      const o = document.createElement("option");
      o.value = s.name;
      o.textContent = s.name;
      sel.appendChild(o);
    });
}

function _fillCities(code, stateName, cityId) {
  if (!stateName) {
    const el = document.getElementById(cityId);
    if (el?.tagName === "SELECT")
      el.innerHTML = `<option value="">-- Select State First --</option>`;
    return;
  }
  const country = _locationCountries.find((c) => c.iso2 === code);
  const state = country?.states?.find((s) => s.name === stateName);
  if (!state?.cities?.length) {
    _lsText(cityId, "Enter city");
    return;
  }
  const sel = _lsSelect(cityId, "-- Select City --", null);
  if (!sel) return;
  [...state.cities]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((c) => {
      const o = document.createElement("option");
      o.value = c.name;
      o.textContent = c.name;
      sel.appendChild(o);
    });
}

function _buildCountryRow(countryId, stateId, cityId) {
  if (document.getElementById(countryId))
    return document.getElementById(countryId);
  const cityEl = document.getElementById(cityId);
  const stateEl = document.getElementById(stateId);
  if (!cityEl || !stateEl) return null;

  // Reorder: State before City in the form-row
  const formRow = cityEl.closest(".form-row");
  if (formRow) {
    const cg = cityEl.closest(".form-group") || cityEl.parentNode;
    const sg = stateEl.closest(".form-group") || stateEl.parentNode;
    const others = Array.from(formRow.children).filter(
      (c) => c !== cg && c !== sg
    );
    formRow.innerHTML = "";
    formRow.appendChild(sg);
    formRow.appendChild(cg);
    others.forEach((c) => formRow.appendChild(c));
  }

  const anchor =
    formRow || stateEl.closest(".form-group") || stateEl.parentNode;
  const countryRow = document.createElement("div");
  countryRow.className = "form-group";
  countryRow.innerHTML = `
    <label for="${countryId}" style="font-weight:600;font-size:.9rem;color:var(--text-primary);margin-bottom:6px;display:block">Country</label>
    <select id="${countryId}" class="${
    cityEl.className || "form-input"
  }" style="width:100%">
      <option value="">-- Select Country --</option>
    </select>`;
  anchor.parentNode.insertBefore(countryRow, anchor);

  const cSel = document.getElementById(countryId);
  _locationCountries.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.iso2 || c.name;
    o.textContent = c.name;
    cSel.appendChild(o);
  });
  return cSel;
}

function _initPickupCascade(savedState, savedCity) {
  const sec = document.getElementById("productPickupSection");
  if (!sec || sec.dataset.cascadeReady) return;
  sec.dataset.cascadeReady = "1";

  const cSel = _buildCountryRow("pickupCountry", "pickupState", "pickupCity");
  if (!cSel) return;

  const cascade = () => {
    const code = cSel.value;
    _fillStates(code, "pickupState", "pickupCity", () =>
      _fillCities(
        code,
        document.getElementById("pickupState")?.value,
        "pickupCity"
      )
    );
  };
  cSel.onchange = cascade;
  cSel.value = "IN";
  cascade(); // populate states for India

  // After cascade runs, restore saved state → then city
  if (savedState) {
    setTimeout(() => {
      _lsSetVal("pickupState", savedState);
      const st = document.getElementById("pickupState");
      if (st?.tagName === "SELECT" && st.value) {
        _fillCities("IN", st.value, "pickupCity");
        setTimeout(() => {
          if (savedCity) _lsSetVal("pickupCity", savedCity);
        }, 100);
      } else if (savedCity) {
        _lsSetVal("pickupCity", savedCity);
      }
    }, 80);
  }
}

function _initServiceCascade(savedState, savedCity) {
  const block = document.getElementById("atProviderBlock");
  if (!block || block.dataset.cascadeReady) return;
  block.dataset.cascadeReady = "1";

  const cSel = _buildCountryRow(
    "serviceCountry",
    "serviceState",
    "serviceCity"
  );
  if (!cSel) return;

  const cascade = () => {
    const code = cSel.value;
    _fillStates(code, "serviceState", "serviceCity", () =>
      _fillCities(
        code,
        document.getElementById("serviceState")?.value,
        "serviceCity"
      )
    );
  };
  cSel.onchange = cascade;
  cSel.value = "IN";
  cascade();

  if (savedState) {
    setTimeout(() => {
      _lsSetVal("serviceState", savedState);
      const st = document.getElementById("serviceState");
      if (st?.tagName === "SELECT" && st.value) {
        _fillCities("IN", st.value, "serviceCity");
        setTimeout(() => {
          if (savedCity) _lsSetVal("serviceCity", savedCity);
        }, 100);
      } else if (savedCity) {
        _lsSetVal("serviceCity", savedCity);
      }
    }, 80);
  }
}

// =====================================================================
// VARIANT BUILDER
// =====================================================================
function renderExistingVariants() {
  const c = document.getElementById("variantRows");
  if (!c) return;
  c.innerHTML = "";
  _editVariants.forEach((v) =>
    addVariantRow({
      variant_id: v.variant_id,
      name: v.variant_name,
      price: v.price,
      description: v.description,
      duration_hours: v.duration_hours,
    })
  );
}
function addVariantRow(prefill = {}) {
  const c = document.getElementById("variantRows");
  if (!c) return;
  const idx = c.children.length;
  const row = document.createElement("div");
  row.className = "variant-row";
  row.dataset.idx = idx;
  row.dataset.variantId = prefill.variant_id || "";
  const escQ = (s) => String(s || "").replace(/"/g, "&quot;");
  row.innerHTML = `<div class="variant-row-header"><span class="variant-number">Package ${
    idx + 1
  }</span><button type="button" onclick="removeVariantRow(this)" class="variant-remove-btn"><i class="fas fa-times"></i></button></div><div class="variant-grid"><div class="form-group"><label>Package Name *</label><input type="text" class="variant-name" placeholder="e.g. Bridal Package" maxlength="200" value="${escQ(
    prefill.name || ""
  )}" /></div><div class="form-group"><label>Price (₹) *</label><input type="number" class="variant-price" placeholder="e.g. 5000" min="0" step="1" value="${
    prefill.price || ""
  }" /></div><div class="form-group"><label>Duration (hours)</label><input type="number" class="variant-duration" placeholder="e.g. 2" min="0.5" step="0.5" value="${
    prefill.duration_hours || ""
  }" /></div><div class="form-group full-width"><label>Description</label><input type="text" class="variant-desc" placeholder="What's included..." maxlength="500" value="${escQ(
    prefill.description || ""
  )}" /></div></div>`;
  c.appendChild(row);
  _renumberVariants();
}
window.addVariantRow = addVariantRow;
function removeVariantRow(btn) {
  btn.closest(".variant-row")?.remove();
  _renumberVariants();
}
window.removeVariantRow = removeVariantRow;
function _renumberVariants() {
  document.querySelectorAll("#variantRows .variant-row").forEach((r, i) => {
    const l = r.querySelector(".variant-number");
    if (l) l.textContent = `Package ${i + 1}`;
    r.dataset.idx = i;
  });
}
function collectVariants() {
  return Array.from(
    document.querySelectorAll("#variantRows .variant-row")
  ).reduce((acc, row) => {
    const name = row.querySelector(".variant-name")?.value.trim() || "",
      price = row.querySelector(".variant-price")?.value.trim() || "";
    const desc = row.querySelector(".variant-desc")?.value.trim() || "",
      dur = row.querySelector(".variant-duration")?.value.trim() || "";
    if (name && price)
      acc.push({
        variant_id: row.dataset.variantId || null,
        name,
        price: parseFloat(price),
        description: desc || null,
        duration_hours: dur ? parseFloat(dur) : null,
      });
    return acc;
  }, []);
}

// ===== CROP =====
function openCropModal() {
  const cm = document.getElementById("currentMedia");
  const ci = document.getElementById("cropImage");
  if (!cm?.src) {
    showNotification("No image to crop", "error");
    return;
  }
  ci.src = originalImageSrc || cm.src;
  document.getElementById("cropModal").classList.add("active");
  if (cropper) cropper.destroy();
  cropper = new Cropper(ci, {
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
function rotateCrop(d) {
  if (cropper) cropper.rotate(d);
}
function flipCrop(dir) {
  if (!cropper) return;
  if (dir === "horizontal") cropper.scaleX(-cropper.getData().scaleX || -1);
  else cropper.scaleY(-cropper.getData().scaleY || -1);
}
function resetCrop() {
  if (cropper) cropper.reset();
}
function applyCrop() {
  if (!cropper) return;
  cropper.getCroppedCanvas().toBlob((blob) => {
    croppedBlob = blob;
    const r = new FileReader();
    r.onload = (e) => {
      const el = document.getElementById("currentMedia");
      if (el) el.src = e.target.result;
    };
    r.readAsDataURL(blob);
    closeCropModal();
    showNotification(
      "Image cropped! Click 'Save Changes' to apply.",
      "success"
    );
  }, "image/jpeg");
}
window.openCropModal = openCropModal;
window.closeCropModal = closeCropModal;
window.rotateCrop = rotateCrop;
window.flipCrop = flipCrop;
window.resetCrop = resetCrop;
window.applyCrop = applyCrop;

// ===== PREVIEW =====
function loadMediaPreview(post) {
  const pm = document.getElementById("previewMedia");
  const pa = document.getElementById("previewActions");
  if (!post.media_url) {
    pm.innerHTML = `<div class="placeholder"><i class="fas fa-image"></i><p>No media</p></div>`;
    pa.style.display = "none";
    return;
  }
  const url =
    post.media_url.startsWith("http://") ||
    post.media_url.startsWith("https://")
      ? post.media_url
      : `${API_BASE_URL}/uploads/${post.media_url.split("/").pop()}`;
  if (post.media_type === "video") {
    pm.innerHTML = `<video controls preload="metadata" id="currentMedia"><source src="${url}" type="video/mp4"></video>`;
    pa.style.display = "none";
  } else {
    pm.innerHTML = `<img src="${url}" alt="Post media" id="currentMedia">`;
    originalImageSrc = url;
    pa.style.display = "flex";
  }
}

function updatePreview() {
  if (!currentPostData) return;
  const t = currentPostData.post_type;
  const badge = document.getElementById("previewTypeBadge");
  badge.textContent =
    t === "service" ? "Service" : t === "product" ? "For Sale" : "Showcase";
  badge.style.background =
    t === "service"
      ? "linear-gradient(135deg,#3b82f6,#2563eb)"
      : t === "product"
      ? "linear-gradient(135deg,#10b981,#059669)"
      : "linear-gradient(135deg,#e336cc,#bf33e6)";
  document.getElementById("previewCaption").textContent =
    document.getElementById("postCaption").value ||
    "Your caption will appear here...";
  const det = document.getElementById("previewDetails");
  det.innerHTML = "";
  const _di = (icon, html) =>
    `<div class="preview-detail-item"><i class="fas ${icon}"></i><span>${html}</span></div>`;
  if (t === "service") {
    const title = document.getElementById("serviceTitle")?.value,
      price = document.getElementById("servicePrice")?.value;
    const loc = document.querySelector(
      'input[name="service_location_type"]:checked'
    )?.value;
    const locLbl =
      {
        online: "Online",
        at_provider: "At My Location",
        doorstep: "Doorstep",
        both: "At Location & Doorstep",
      }[loc] || "Online";
    if (title)
      det.innerHTML += _di(
        "fa-briefcase",
        `<strong>${escHtml(title)}</strong>`
      );
    if (price)
      det.innerHTML += _di("fa-rupee-sign", `₹${parseFloat(price).toFixed(2)}`);
    det.innerHTML += _di("fa-map-marker-alt", locLbl);
  } else if (t === "product") {
    const title = document.getElementById("productTitle")?.value,
      price = document.getElementById("productPrice")?.value,
      stock = document.getElementById("productStock")?.value;
    const fulfill =
      {
        shipping: "Shipping Only",
        pickup: "Pickup Only",
        both: "Shipping & Pickup",
      }[_fulfillmentMode] || "Shipping";
    if (title)
      det.innerHTML += _di(
        "fa-shopping-bag",
        `<strong>${escHtml(title)}</strong>`
      );
    if (price)
      det.innerHTML += _di("fa-rupee-sign", `₹${parseFloat(price).toFixed(2)}`);
    if (stock) det.innerHTML += _di("fa-boxes", `${stock} in stock`);
    det.innerHTML += _di("fa-truck", fulfill);
  } else {
    const tags = document.getElementById("postTags")?.value;
    if (tags) det.innerHTML += _di("fa-tags", escHtml(tags));
  }
}
function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
  document
    .getElementById("editPostForm")
    .addEventListener("submit", handleFormSubmit);
  document
    .getElementById("deletePostBtn")
    .addEventListener("click", showDeleteModal);
  document.getElementById("cropBtn")?.addEventListener("click", openCropModal);
  document.getElementById("postCaption").addEventListener("input", () => {
    updateCharCount();
    updatePreview();
  });
  document
    .querySelectorAll(
      "#editPostForm input, #editPostForm textarea, #editPostForm select"
    )
    .forEach((el) => {
      el.addEventListener("input", updatePreview);
      el.addEventListener("change", updatePreview);
    });
  document
    .getElementById("includesRevisions")
    ?.addEventListener("change", (e) => {
      document.getElementById("revisionsDetail").style.display = e.target
        .checked
        ? "block"
        : "none";
    });
  document
    .getElementById("requiresBooking")
    ?.addEventListener("change", (e) => {
      document.getElementById("bookingDetail").style.display = e.target.checked
        ? "block"
        : "none";
    });
}
function updateCharCount() {
  document.getElementById("charCount").textContent =
    document.getElementById("postCaption").value.length;
}

// =====================================================================
// FORM SUBMIT + VALIDATION
// =====================================================================
async function handleFormSubmit(e) {
  e.preventDefault();
  try {
    showLoading(true);
    const session = getActiveSession();
    const t = currentPostData.post_type;
    const updateData = {
      caption: document.getElementById("postCaption").value.trim(),
      privacy: document.getElementById("postPrivacy").value,
    };

    // ── Basic validation ──────────────────────────────────────────────
    if (!updateData.caption || updateData.caption.length < 3) {
      showNotification("Caption must be at least 3 characters", "error");
      return showLoading(false);
    }

    // ── SHOWCASE ─────────────────────────────────────────────────────
    if (t === "showcase") {
      const tags = document.getElementById("postTags").value.trim();
      if (tags) updateData.tags = tags;

      // ── SERVICE ──────────────────────────────────────────────────────
    } else if (t === "service") {
      const title = document.getElementById("serviceTitle").value.trim();
      const contactEmail = document.getElementById("contactEmail").value.trim();
      const contactPhone = document.getElementById("contactPhone").value.trim();
      const locType =
        document.querySelector('input[name="service_location_type"]:checked')
          ?.value || "online";

      // Mandatory for all service types
      if (!title) {
        showNotification("Service title is required", "error");
        return showLoading(false);
      }
      if (!contactEmail || !contactEmail.includes("@")) {
        showNotification("Valid contact email is required", "error");
        return showLoading(false);
      }
      if (!contactPhone || contactPhone.length < 10) {
        showNotification("Valid contact phone is required", "error");
        return showLoading(false);
      }
      if (!document.getElementById("serviceShortDesc").value.trim()) {
        showNotification("Short description is required", "error");
        return showLoading(false);
      }

      // Location-type specific validation
      if (locType === "at_provider" || locType === "both") {
        const city = document.getElementById("serviceCity")?.value.trim();
        const state = document.getElementById("serviceState")?.value.trim();
        if (!city && !state) {
          showNotification(
            "Please enter your service location (city/state)",
            "error"
          );
          return showLoading(false);
        }
      }
      if (locType === "doorstep" || locType === "both") {
        const dPin =
          document.getElementById("doorstepPincode")?.value.trim() ||
          document.getElementById("servicePincode")?.value.trim();
        if (!dPin || dPin.length !== 6) {
          showNotification(
            "Valid 6-digit pincode required for doorstep service",
            "error"
          );
          return showLoading(false);
        }
      }

      Object.assign(updateData, {
        title,
        price: parseFloat(document.getElementById("servicePrice").value) || 0,
        short_description: document
          .getElementById("serviceShortDesc")
          .value.trim(),
        full_description: document
          .getElementById("serviceFullDesc")
          .value.trim(),
        service_duration: document
          .getElementById("serviceDuration")
          .value.trim(),
        service_delivery_time: document
          .getElementById("serviceDeliveryTime")
          .value.trim(),
        features: document.getElementById("serviceFeatures").value.trim(),
        contact_email: contactEmail,
        contact_phone: contactPhone,
        includes_revisions:
          document.getElementById("includesRevisions").checked,
        max_revisions: parseInt(
          document.getElementById("maxRevisions").value || 0
        ),
        requires_advance_booking:
          document.getElementById("requiresBooking").checked,
        booking_notice_days: parseInt(
          document.getElementById("bookingNoticeDays").value || 0
        ),
        service_location_type: locType,
        service_mode:
          {
            online: "online",
            at_provider: "offline",
            doorstep: "offline",
            both: "both",
          }[locType] || "online",
      });

      if (["at_provider", "both"].includes(locType)) {
        updateData.service_address =
          document.getElementById("serviceAddress").value.trim() || null;
        updateData.service_city =
          document.getElementById("serviceCity")?.value.trim() || null;
        updateData.service_state =
          document.getElementById("serviceState")?.value.trim() || null;
        updateData.service_pincode =
          document.getElementById("servicePincode").value.trim() || null;
        updateData.service_radius_km = parseInt(
          document.getElementById("serviceRadiusKm").value || 0
        );
      }
      if (["doorstep", "both"].includes(locType)) {
        updateData.doorstep_base_fee = parseFloat(
          document.getElementById("doorstepBaseFee").value || 0
        );
        updateData.doorstep_per_km = parseFloat(
          document.getElementById("doorstepPerKm").value || 0
        );
        if (!updateData.service_pincode) {
          updateData.service_pincode =
            document.getElementById("doorstepPincode").value.trim() || null;
          updateData.service_radius_km = parseInt(
            document.getElementById("doorstepRadius").value || 0
          );
        }
      }
      if (locType === "online") {
        updateData.service_address =
          updateData.service_city =
          updateData.service_state =
          updateData.service_pincode =
            null;
        updateData.service_radius_km =
          updateData.doorstep_base_fee =
          updateData.doorstep_per_km =
            0;
      }

      // ── PRODUCT ──────────────────────────────────────────────────────
    } else if (t === "product") {
      const productTitle = document.getElementById("productTitle").value.trim();
      const price =
        parseFloat(document.getElementById("productPrice").value) || 0;
      const mode = _fulfillmentMode;

      if (!productTitle) {
        showNotification("Product title is required", "error");
        return showLoading(false);
      }
      if (!price || price <= 0) {
        showNotification("Valid price is required", "error");
        return showLoading(false);
      }
      if (!document.getElementById("productShortDesc").value.trim()) {
        showNotification("Short description is required", "error");
        return showLoading(false);
      }

      // Shipping validation
      if (mode === "shipping" || mode === "both") {
        const pin = (
          document.getElementById("sellerPincode")?.value || ""
        ).trim();
        if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
          showNotification(
            "Please enter a valid 6-digit seller pincode for shipping",
            "error"
          );
          return showLoading(false);
        }
      }

      // Pickup validation
      if (mode === "pickup" || mode === "both") {
        const pickupCity = (
          document.getElementById("pickupCity")?.value || ""
        ).trim();
        const pickupPincode = (
          document.getElementById("pickupPincode")?.value || ""
        ).trim();
        if (!pickupCity && !pickupPincode) {
          showNotification(
            "Please enter at least a pickup city or pincode so buyers know where to collect",
            "error"
          );
          return showLoading(false);
        }
      }

      Object.assign(updateData, {
        product_title: productTitle,
        price,
        stock: parseInt(document.getElementById("productStock").value || 0),
        condition_type: document.getElementById("productCondition").value,
        brand: document.getElementById("productBrand").value.trim() || null,
        sku: document.getElementById("productSku").value.trim() || null,
        short_description: document
          .getElementById("productShortDesc")
          .value.trim(),
        full_description: document
          .getElementById("productFullDesc")
          .value.trim(),
        features: document.getElementById("productFeatures").value.trim(),
        return_policy: document.getElementById("returnPolicy").value.trim(),
        accepts_cod: document.getElementById("acceptsCod").checked,
        accepts_upi: false,
        accepts_bank_transfer: false,
        shipping_available: mode === "shipping" || mode === "both",
      });

      if (mode === "shipping" || mode === "both") {
        const ct =
          document.querySelector('input[name="delivery_charge_type"]:checked')
            ?.value || "flat";
        updateData.delivery_charge_type = ct;
        updateData.seller_pincode =
          document.getElementById("sellerPincode").value.trim() || null;
        updateData.estimated_delivery_days =
          parseInt(
            document.getElementById("estimatedDeliveryDays").value || 0
          ) || null;
        updateData.delivery_max_km = parseInt(
          document.getElementById("deliveryMaxKm").value || 0
        );
        updateData.free_shipping_threshold =
          parseFloat(
            document.getElementById("freeShippingThreshold").value || 0
          ) || null;
        if (ct === "flat") {
          updateData.base_delivery_charge = parseFloat(
            document.getElementById("flatDeliveryCharge").value || 0
          );
          updateData.shipping_cost = updateData.base_delivery_charge;
          updateData.per_km_rate = 0;
        } else if (ct === "per_km") {
          updateData.base_delivery_charge = parseFloat(
            document.getElementById("baseDeliveryChargeKm").value || 0
          );
          updateData.per_km_rate = parseFloat(
            document.getElementById("perKmRate").value || 0
          );
          updateData.shipping_cost = 0;
        } else {
          updateData.base_delivery_charge = 0;
          updateData.shipping_cost = 0;
          updateData.per_km_rate = 0;
        }
      }

      if (mode === "pickup" || mode === "both") {
        updateData.pickup_address =
          document.getElementById("pickupAddress")?.value.trim() || null;
        updateData.pickup_city =
          document.getElementById("pickupCity")?.value.trim() || null;
        updateData.pickup_state =
          document.getElementById("pickupState")?.value.trim() || null;
        updateData.pickup_pincode =
          document.getElementById("pickupPincode")?.value.trim() || null;
      } else {
        // Clear pickup fields when switching to shipping-only
        updateData.pickup_address =
          updateData.pickup_city =
          updateData.pickup_state =
          updateData.pickup_pincode =
            null;
      }
    }

    // ── Upload cropped image if changed ───────────────────────────────
    if (croppedBlob) {
      const fd = new FormData();
      fd.append("media", croppedBlob, "cropped_image.jpg");
      const uRes = await fetch(
        `${API_BASE_URL}/posts/${currentPostId}/update-media`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.token}` },
          body: fd,
        }
      );
      const uData = await uRes.json();
      if (!uData.success) {
        showNotification("Failed to update image", "error");
        return showLoading(false);
      }
    }

    // ── Save post data ────────────────────────────────────────────────
    const res = await fetch(`${API_BASE_URL}/posts/${currentPostId}/update`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!data.success) {
      showNotification(data.message || "Failed to update post", "error");
      return showLoading(false);
    }

    if (currentPostData.post_type === "service") {
      await saveVariants(session.token, collectVariants());
      await saveSlots(session.token, collectSlots());
    }

    showNotification("Post updated successfully!", "success");
    setTimeout(() => (location.href = "profile.html"), 1500);
  } catch (err) {
    console.error(err);
    showNotification("Failed to update post. Please try again.", "error");
  } finally {
    showLoading(false);
  }
}

async function saveVariants(token, variants) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/posts/${currentPostId}/variants/update`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variants }),
      }
    );
    const d = await res.json();
    if (!d.success) console.warn("Variants:", d.message);
  } catch (e) {
    console.warn(e);
  }
}

// ===== DELETE =====
function showDeleteModal() {
  document.getElementById("deleteModal").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("show");
  document.body.style.overflow = "auto";
}
async function confirmDelete() {
  closeDeleteModal();
  try {
    showLoading(true);
    const session = getActiveSession();
    const res = await fetch(
      `${API_BASE_URL}/posts/${currentPostId}/hard-delete`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await res.json();
    if (data.success) {
      showNotification("Post deleted successfully!", "success");
      setTimeout(() => (location.href = "profile.html"), 1500);
    } else showNotification(data.message || "Failed to delete post", "error");
  } catch (e) {
    showNotification("Failed to delete post. Please try again.", "error");
  } finally {
    showLoading(false);
  }
}
function goBack() {
  location.href = "profile.html";
}
function showLoading(show) {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = show ? "flex" : "none";
}
function showNotification(msg, type = "success") {
  document.querySelector(".notification")?.remove();
  const n = document.createElement("div");
  n.className = `notification ${type}`;
  n.innerHTML = `<i class="fas ${
    type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
  }"></i><span>${msg}</span>`;
  document.body.appendChild(n);
  setTimeout(() => n.classList.add("show"), 100);
  setTimeout(() => {
    n.classList.remove("show");
    setTimeout(() => n.remove(), 300);
  }, 3000);
}

// =====================================================================
// TIME SLOTS
// =====================================================================
function renderExistingSlots() {
  const c = document.getElementById("slotRows");
  if (!c) return;
  c.innerHTML = "";
  _editSlots.forEach((s) =>
    addSlotRow({
      slot_id: s.slot_id,
      slot_label: s.slot_label,
      slot_display: s.slot_display,
      duration_mins: s.duration_mins,
    })
  );
}
function addSlotRow(p = {}) {
  const c = document.getElementById("slotRows");
  if (!c) return;
  const idx = c.children.length;
  const row = document.createElement("div");
  row.className = "variant-row";
  row.dataset.slotId = p.slot_id || "";
  const toD = (l) => {
    if (!l) return "";
    const [h, m] = l.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${
      h >= 12 ? "PM" : "AM"
    }`;
  };
  const display = p.slot_display || toD(p.slot_label);
  row.innerHTML = `<div class="variant-row-header"><span class="variant-number">Slot ${
    idx + 1
  }</span><button type="button" onclick="removeSlotRow(this)" class="variant-remove-btn"><i class="fas fa-times"></i></button></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px"><div class="form-group" style="margin:0"><label style="font-size:.8rem">Time (24hr) *</label><input type="time" class="slot-time" value="${
    p.slot_label || ""
  }" style="padding:10px 12px;font-size:.88rem;width:100%" /></div><div class="form-group" style="margin:0"><label style="font-size:.8rem">Display label</label><input type="text" class="slot-display" value="${display}" placeholder="e.g. 10:00 AM" maxlength="30" style="padding:10px 12px;font-size:.88rem;width:100%" /></div><div class="form-group" style="margin:0"><label style="font-size:.8rem">Duration (mins)</label><input type="number" class="slot-duration" value="${
    p.duration_mins || 60
  }" min="5" step="5" style="padding:10px 12px;font-size:.88rem;width:100%" /></div></div>`;
  row.querySelector(".slot-time").addEventListener("change", function () {
    const d = row.querySelector(".slot-display");
    if (!d.value || d.dataset.autoFilled) {
      const [h, m] = this.value.split(":").map(Number);
      d.value = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${
        h >= 12 ? "PM" : "AM"
      }`;
      d.dataset.autoFilled = "1";
    }
  });
  c.appendChild(row);
  _renumberSlots();
}
window.addSlotRow = addSlotRow;
function removeSlotRow(btn) {
  btn.closest(".variant-row")?.remove();
  _renumberSlots();
}
window.removeSlotRow = removeSlotRow;
function _renumberSlots() {
  document.querySelectorAll("#slotRows .variant-row").forEach((r, i) => {
    const l = r.querySelector(".variant-number");
    if (l) l.textContent = `Slot ${i + 1}`;
  });
}
function autoGenerateSlots() {
  const from = document.getElementById("autoFrom")?.value,
    to = document.getElementById("autoTo")?.value;
  const interval = parseInt(
      document.getElementById("autoInterval")?.value || 60
    ),
    duration = parseInt(document.getElementById("autoDuration")?.value || 60);
  if (!from || !to) {
    showNotification("Please set From and To times", "error");
    return;
  }
  const [fh, fm] = from.split(":").map(Number),
    [th, tm] = to.split(":").map(Number);
  let s = fh * 60 + fm;
  const end = th * 60 + tm;
  if (s >= end) {
    showNotification("From must be before To", "error");
    return;
  }
  document.getElementById("slotRows").innerHTML = "";
  while (s + duration <= end) {
    const h = Math.floor(s / 60),
      m = s % 60,
      l = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    addSlotRow({
      slot_label: l,
      slot_display: `${h % 12 || 12}:${String(m).padStart(2, "0")} ${
        h >= 12 ? "PM" : "AM"
      }`,
      duration_mins: duration,
    });
    s += interval;
  }
  showNotification(
    `Generated ${
      document.querySelectorAll("#slotRows .variant-row").length
    } slots`,
    "success"
  );
}
window.autoGenerateSlots = autoGenerateSlots;
function collectSlots() {
  return Array.from(document.querySelectorAll("#slotRows .variant-row")).reduce(
    (acc, row) => {
      const l = row.querySelector(".slot-time")?.value.trim() || "",
        d = row.querySelector(".slot-display")?.value.trim() || "",
        dur = parseInt(row.querySelector(".slot-duration")?.value || 60);
      if (l && l.includes(":"))
        acc.push({
          slot_id: row.dataset.slotId || null,
          slot_label: l,
          slot_display: d || l,
          duration_mins: isNaN(dur) ? 60 : dur,
        });
      return acc;
    },
    []
  );
}
async function saveSlots(token, slots) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/posts/${currentPostId}/slots/update`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slots }),
      }
    );
    const d = await res.json();
    if (!d.success) console.warn("Slots:", d.message);
    else console.log(`✅ Slots saved: ${d.count}`);
  } catch (e) {
    console.warn(e);
  }
}

window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.goBack = goBack;
