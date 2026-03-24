// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

let currentPost = null;
let currentUser = null;
let commentsData = {
  comments: [],
  offset: 0,
  limit: 10,
  hasMore: false,
  loading: false,
  sortBy: "newest",
};

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Post detail page loaded");

  applyTheme();

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  if (!postId) {
    showError("No post ID provided");
    return;
  }

  checkAuth();
  loadPostDetails(postId);
  setupEventListeners();
  setupCommentListeners();
  setupDeleteModalListeners();
});

// ===== THEME MANAGEMENT =====
function applyTheme() {
  try {
    const theme = window.parent.localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
    console.log(`✅ Applied theme: ${theme}`);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
    console.log("⚠️ Using default light theme");
  }
}

window.addEventListener("message", (event) => {
  if (event.data.action === "themeChanged") {
    document.documentElement.setAttribute("data-theme", event.data.theme);
    console.log(`🎨 Theme changed to: ${event.data.theme}`);
  }
});

// ===== AUTHENTICATION =====
function checkAuth() {
  try {
    const token =
      window.parent.localStorage.getItem("authToken") ||
      window.parent.sessionStorage.getItem("authToken");
    const userData =
      window.parent.localStorage.getItem("userData") ||
      window.parent.sessionStorage.getItem("userData");

    if (token && userData) {
      currentUser = JSON.parse(userData);
      console.log("✅ User authenticated:", currentUser.username);
      updateCommentFormAvatar();
    } else {
      console.log("ℹ️ No authentication - guest mode");
      hideCommentForm();
    }
  } catch (e) {
    console.log("⚠️ Cannot access parent storage:", e);
    hideCommentForm();
  }
}

function getAuthToken() {
  try {
    return (
      window.parent.localStorage.getItem("authToken") ||
      window.parent.sessionStorage.getItem("authToken")
    );
  } catch (e) {
    return null;
  }
}

// ===== UPDATE COMMENT FORM AVATAR =====
function updateCommentFormAvatar() {
  if (currentUser && currentUser.profile_pic) {
    const avatarUrl = constructMediaUrl(currentUser.profile_pic, "profile");
    const avatar = document.getElementById("commentUserAvatar");
    if (avatar) {
      avatar.src = avatarUrl;
      avatar.onerror = () => {
        avatar.src = generateDefaultAvatar(
          currentUser.full_name || currentUser.username || "U"
        );
        avatar.onerror = null;
      };
    }
  }
}

// ===== HIDE COMMENT FORM FOR GUESTS =====
function hideCommentForm() {
  const commentForm = document.getElementById("addCommentForm");
  if (commentForm) {
    commentForm.innerHTML = `
      <div style="text-align: center; padding: 20px; background: var(--light-purple); border-radius: 12px;">
        <i class="fas fa-lock" style="font-size: 2rem; color: var(--primary-purple); margin-bottom: 10px;"></i>
        <p style="color: var(--text-secondary); margin: 0;">Please login to comment</p>
      </div>
    `;
  }
}

// ===== LOAD POST DETAILS =====
async function loadPostDetails(postId) {
  console.log(`📥 Loading post ${postId}...`);

  try {
    const token = getAuthToken();
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📊 Post data received:", data);

    if (data.success && data.post) {
      currentPost = data.post;
      displayPost(data.post);
      hideLoading();
      loadComments(postId);
    } else {
      showError("Post not found");
    }
  } catch (error) {
    console.error("❌ Error loading post:", error);
    showError("Failed to load post");
  }
}

// ===== DISPLAY POST =====
function displayPost(post) {
  console.log(`🎨 Displaying post type: ${post.post_type}`);

  displayAuthorInfo(post);
  displayMedia(post);
  displayCategoryBadge(post);
  displayPostTypeBadge(post);

  if (post.caption) {
    document.getElementById("captionSection").style.display = "block";
    document.getElementById("postCaption").textContent = post.caption;
  }

  if (post.post_type === "showcase") {
    displayShowcasePost(post);
  } else if (post.post_type === "service" || post.post_type === "product") {
    displaySellingPost(post);
  }

  displayEngagementStats(post);
  setupActionButtons(post);
  setupSaveButton(post);
  document.getElementById("postDetailContainer").style.display = "block";
}

// ===== DISPLAY AUTHOR INFO =====
function displayAuthorInfo(post) {
  const avatarUrl = constructMediaUrl(post.profile_pic, "profile");
  const avatar = document.getElementById("authorAvatar");
  avatar.src = avatarUrl;
  avatar.onerror = () => {
    const name = post.full_name || post.username || "U";
    avatar.src = generateDefaultAvatar(name);
    avatar.onerror = null;
  };

  avatar.style.cursor = "pointer";
  avatar.onclick = () => {
    window.parent.location.href = `profile.html?id=${post.user_id}`;
  };

  document.getElementById("authorName").textContent =
    post.full_name || post.username;
  document.getElementById("authorUsername").textContent = `@${post.username}`;
  document.getElementById("postTime").textContent = getTimeAgo(post.created_at);
}

// ===== DISPLAY MEDIA =====
function displayMedia(post) {
  const mediaContainer = document.getElementById("mediaContainer");

  if (!post.media_url) {
    mediaContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary);">
        <i class="fas fa-image" style="font-size: 4rem; opacity: 0.3;"></i>
        <p>No media available</p>
      </div>
    `;
    return;
  }

  const mediaUrl = constructMediaUrl(post.media_url, "post");

  if (post.media_type === "video") {
    mediaContainer.innerHTML = `
      <video controls preload="metadata" style="max-width: 100%; max-height: 80vh; border-radius: 12px;">
        <source src="${mediaUrl}" type="video/mp4">
        <source src="${mediaUrl}" type="video/webm">
        Your browser does not support the video tag.
      </video>
    `;
  } else {
    mediaContainer.innerHTML = `
      <img 
        src="${mediaUrl}" 
        alt="${escapeHtml(post.caption || "Post image")}"
        onerror="this.src='images/placeholder.png'"
      >
    `;
  }
}

// ===== DISPLAY CATEGORY BADGE =====
function displayCategoryBadge(post) {
  const categoryBadge = document.getElementById("categoryBadge");

  if (post.category_name || post.subcategory_name) {
    const categoryText = post.subcategory_name || post.category_name;
    const icon = getCategoryIcon(post.post_type);

    categoryBadge.innerHTML = `
      <i class="${icon}"></i>
      <span>${escapeHtml(categoryText)}</span>
    `;
    categoryBadge.style.display = "flex";
  }
}

// ===== DISPLAY POST TYPE BADGE =====
function displayPostTypeBadge(post) {
  const badge = document.getElementById("postTypeBadge");
  const postType = post.post_type || "showcase";

  const badges = {
    showcase: '<i class="fas fa-images"></i> Showcase',
    service: '<i class="fas fa-briefcase"></i> Service',
    product: '<i class="fas fa-shopping-bag"></i> For Sale',
  };

  badge.innerHTML = badges[postType] || badges.showcase;
  badge.className = `post-type-badge ${postType}`;
}

// ===== DISPLAY SHOWCASE POST =====
function displayShowcasePost(post) {
  if (post.tags) {
    const tagsSection = document.getElementById("tagsSection");
    const tagsContainer = document.getElementById("tagsContainer");

    const tags = post.tags.split(",").map((tag) => tag.trim());
    tagsContainer.innerHTML = tags
      .map((tag) => `<span class="tag-item">#${escapeHtml(tag)}</span>`)
      .join("");

    tagsSection.style.display = "block";
  }
}

// ===== DISPLAY SELLING POST =====
function displaySellingPost(post) {
  const sellingDetails = document.getElementById("sellingDetails");
  sellingDetails.style.display = "block";

  const title = post.product_title || post.title || "Item";
  document.getElementById("itemTitle").textContent = title;

  if (post.price) {
    document.getElementById("priceAmount").textContent = `₹${parseFloat(
      post.price
    ).toFixed(2)}`;
    document.getElementById("priceCurrency").textContent =
      post.currency || "INR";
  }

  const description =
    post.full_description ||
    post.short_description ||
    post.product_description ||
    "No description available";
  document.getElementById("itemDescription").innerHTML =
    formatDescription(description);
  if (post.features) {
    const featuresSection = document.getElementById("featuresSection");
    const featuresList = document.getElementById("featuresList");
    const features = post.features.split("\n").filter((f) => f.trim());
    featuresList.innerHTML = features
      .map((feature) => `<li>${escapeHtml(feature)}</li>`)
      .join("");
    featuresSection.style.display = "block";
  }

  if (post.post_type === "service") {
    displayServiceInfo(post);
  }

  if (post.post_type === "product") {
    displayProductInfo(post);
  }

  displayPaymentMethods(post);
  displayContactSection(post);
  displayProductGSTAndDelivery(post);
  if (!currentUser || currentUser.id !== post.user_id) {
    displayPurchaseButton(post);
  }
}

// ===== DISPLAY SERVICE INFO =====
function displayServiceInfo(post) {
  const serviceInfo = document.getElementById("serviceInfo");
  let hasInfo = false;

  if (post.service_duration) {
    document.getElementById("durationInfo").style.display = "flex";
    document.getElementById("serviceDuration").textContent =
      post.service_duration;
    hasInfo = true;
  }
  if (post.service_delivery_time) {
    document.getElementById("deliveryInfo").style.display = "flex";
    document.getElementById("serviceDelivery").textContent =
      post.service_delivery_time;
    hasInfo = true;
  }
  if (post.includes_revisions) {
    document.getElementById("revisionsInfo").style.display = "flex";
    document.getElementById("serviceRevisions").textContent = post.max_revisions
      ? `Up to ${post.max_revisions} revisions`
      : "Revisions included";
    hasInfo = true;
  }
  if (hasInfo) serviceInfo.style.display = "block";

  displayServiceVariantsAndLocation(post);
}

// ===== DISPLAY SERVICE VARIANTS + LOCATION =====
// FIX 1: "both" now shows "At Location & Doorstep" instead of "Online or Doorstep"
async function displayServiceVariantsAndLocation(post) {
  document.getElementById("serviceVariantsLocationBlock")?.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "serviceVariantsLocationBlock";
  wrapper.style.cssText =
    "margin-top:16px;display:flex;flex-direction:column;gap:14px;";

  // ── 1. Fetch and show price variants ──────────────────────────────────
  try {
    const resp = await fetch(`${API_BASE_URL}/posts/${post.post_id}/variants`);
    const data = await resp.json();
    if (data.success && data.variants && data.variants.length > 0) {
      const varBlock = document.createElement("div");
      varBlock.innerHTML = `
        <h4 style="font-size:1rem;font-weight:700;color:var(--text-primary);
                   margin-bottom:10px;display:flex;align-items:center;gap:8px">
          <i class="fas fa-tags" style="color:var(--primary-purple)"></i>
          Pricing Packages
        </h4>
      `;
      const table = document.createElement("div");
      table.style.cssText = "display:flex;flex-direction:column;gap:8px;";

      data.variants.forEach((v) => {
        const row = document.createElement("div");
        row.style.cssText = `
          display:flex;justify-content:space-between;align-items:center;
          padding:10px 14px;background:var(--light-purple);
          border-radius:10px;border:1px solid var(--border-purple,#f889e5);
        `;
        row.innerHTML = `
          <div>
            <div style="font-weight:700;font-size:.9rem;color:var(--text-primary)">${escapeHtml(
              v.variant_name
            )}</div>
            ${
              v.description
                ? `<div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">${escapeHtml(
                    v.description
                  )}</div>`
                : ""
            }
            ${
              v.duration_hours
                ? `<div style="font-size:.75rem;color:var(--text-secondary);margin-top:2px"><i class="fas fa-clock" style="margin-right:3px"></i>${v.duration_hours}h</div>`
                : ""
            }
          </div>
          <div style="font-weight:800;font-size:1rem;color:var(--primary-purple);white-space:nowrap;margin-left:12px">
            ₹${parseFloat(v.price).toFixed(0)}
          </div>
        `;
        table.appendChild(row);
      });

      varBlock.appendChild(table);
      wrapper.appendChild(varBlock);
    }
  } catch (e) {
    console.warn("Could not load variants for post-detail:", e);
  }

  // ── 2. Show service location details ──────────────────────────────────
  const locType = post.service_location_type || "online";

  const locBlock = document.createElement("div");
  locBlock.innerHTML = `
    <h4 style="font-size:1rem;font-weight:700;color:var(--text-primary);
               margin-bottom:10px;display:flex;align-items:center;gap:8px">
      <i class="fas fa-map-marker-alt" style="color:var(--primary-purple)"></i>
      Service Location
    </h4>
  `;

  const badges = document.createElement("div");
  badges.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";

  // FIX 1: "both" label changed from "Online or Doorstep" to "At Location & Doorstep"
  const locLabels = {
    online: {
      icon: "fa-laptop",
      color: "#3b82f6",
      bg: "rgba(59,130,246,.1)",
      label: "Online / Remote",
    },
    at_provider: {
      icon: "fa-store",
      color: "#8b5cf6",
      bg: "rgba(139,92,246,.1)",
      label: "At Provider's Location",
    },
    doorstep: {
      icon: "fa-home",
      color: "#10b981",
      bg: "rgba(16,185,129,.1)",
      label: "Doorstep Service",
    },
    both: {
      icon: "fa-exchange-alt",
      color: "#f59e0b",
      bg: "rgba(245,158,11,.1)",
      label: "At Location & Doorstep", // ← FIXED (was "Online or Doorstep")
    },
  };

  const lc = locLabels[locType] || locLabels.online;
  const mainBadge = document.createElement("span");
  mainBadge.style.cssText = `
    display:inline-flex;align-items:center;gap:6px;
    background:${lc.bg};color:${lc.color};
    font-size:.78rem;font-weight:700;padding:6px 12px;
    border-radius:20px;border:1px solid ${lc.color}40;
  `;
  mainBadge.innerHTML = `<i class="fas ${lc.icon}" style="font-size:.7rem"></i> ${lc.label}`;
  badges.appendChild(mainBadge);

  if (post.service_city || post.service_state) {
    const locBadge = document.createElement("span");
    locBadge.style.cssText = `
      display:inline-flex;align-items:center;gap:6px;
      background:rgba(107,114,128,.1);color:#6b7280;
      font-size:.78rem;font-weight:600;padding:6px 12px;
      border-radius:20px;border:1px solid rgba(107,114,128,.2);
    `;
    locBadge.innerHTML = `<i class="fas fa-map-pin" style="font-size:.7rem"></i>
      ${[post.service_city, post.service_state].filter(Boolean).join(", ")}`;
    badges.appendChild(locBadge);
  }

  if (post.service_radius_km && parseInt(post.service_radius_km) > 0) {
    const radBadge = document.createElement("span");
    radBadge.style.cssText = `
      display:inline-flex;align-items:center;gap:6px;
      background:rgba(59,130,246,.1);color:#3b82f6;
      font-size:.78rem;font-weight:600;padding:6px 12px;
      border-radius:20px;border:1px solid rgba(59,130,246,.2);
    `;
    radBadge.innerHTML = `<i class="fas fa-circle-notch" style="font-size:.7rem"></i> Within ${post.service_radius_km} km`;
    badges.appendChild(radBadge);
  }

  if (
    (locType === "doorstep" || locType === "both") &&
    (parseFloat(post.doorstep_base_fee || 0) > 0 ||
      parseFloat(post.doorstep_per_km || 0) > 0)
  ) {
    const baseFee = parseFloat(post.doorstep_base_fee || 0);
    const perKm = parseFloat(post.doorstep_per_km || 0);
    const feeBadge = document.createElement("span");
    feeBadge.style.cssText = `
      display:inline-flex;align-items:center;gap:6px;
      background:rgba(245,158,11,.1);color:#f59e0b;
      font-size:.78rem;font-weight:600;padding:6px 12px;
      border-radius:20px;border:1px solid rgba(245,158,11,.2);
    `;
    feeBadge.innerHTML = `<i class="fas fa-car" style="font-size:.7rem"></i>
      Travel: ₹${baseFee}${perKm > 0 ? ` + ₹${perKm}/km` : ""}`;
    badges.appendChild(feeBadge);
  }

  locBlock.appendChild(badges);
  wrapper.appendChild(locBlock);

  const purchaseSection = document.getElementById("purchaseSection");
  if (purchaseSection) {
    purchaseSection.insertAdjacentElement("beforebegin", wrapper);
  } else {
    document.getElementById("sellingDetails")?.appendChild(wrapper);
  }
}

window.displayServiceVariantsAndLocation = displayServiceVariantsAndLocation;

// ===== DISPLAY PRODUCT INFO =====
function displayProductInfo(post) {
  const productInfo = document.getElementById("productInfo");
  let hasInfo = false;

  if (post.stock !== null && post.stock !== undefined) {
    document.getElementById("stockInfo").style.display = "flex";
    document.getElementById("productStock").textContent =
      post.stock > 0 ? `${post.stock} available` : "Out of stock";
    hasInfo = true;
  }

  if (post.condition_type) {
    document.getElementById("conditionInfo").style.display = "flex";
    const condition =
      post.condition_type.charAt(0).toUpperCase() +
      post.condition_type.slice(1).replace(/_/g, " ");
    document.getElementById("productCondition").textContent = condition;
    hasInfo = true;
  }

  if (
    post.shipping_available !== null &&
    post.shipping_available !== undefined
  ) {
    document.getElementById("shippingInfo").style.display = "flex";
    document.getElementById("productShipping").textContent =
      getShippingText(post);
    hasInfo = true;
  }

  if (hasInfo) {
    productInfo.style.display = "block";
  }
}

function getShippingText(post) {
  const shippingOn = Boolean(post.shipping_available);
  const hasPickup = !!(
    post.pickup_city ||
    post.pickup_address ||
    post.pickup_pincode
  );

  if (shippingOn && hasPickup) return "Shipping & Pickup";
  if (!shippingOn) return "Pickup only";

  const chargeType = post.delivery_charge_type;
  if (chargeType === "free") return "Free Delivery";
  if (chargeType === "per_km") {
    const base = parseFloat(post.base_delivery_charge || 0);
    const perKm = parseFloat(post.per_km_rate || 0);
    const maxKm = post.delivery_max_km;
    let text = `₹${base} base + ₹${perKm}/km`;
    if (maxKm) text += ` (max ${maxKm} km)`;
    return text;
  }
  if (chargeType === "flat") {
    const flatCharge = parseFloat(
      post.base_delivery_charge != null
        ? post.base_delivery_charge
        : post.shipping_cost || 0
    );
    return flatCharge === 0
      ? "Free Delivery"
      : `₹${flatCharge.toFixed(0)} flat`;
  }
  const legacyCost = parseFloat(post.shipping_cost || 0);
  return legacyCost === 0 ? "Available" : `₹${legacyCost.toFixed(0)}`;
}

// FIX 3: Added pickup badge when shipping_available=false but pickup_address/city exists
async function displayProductGSTAndDelivery(post) {
  if (post.post_type !== "product") return;

  let gstRate = 0;
  try {
    const resp = await fetch(`${API_BASE_URL}/posts/${post.post_id}/gst`);
    const data = await resp.json();
    if (data.success) gstRate = parseFloat(data.gst_rate || 0);
  } catch {}

  document.getElementById("gstDeliveryInfo")?.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "gstDeliveryInfo";
  wrapper.style.cssText =
    "margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;";

  const _badge = (bg, color, border, html) => {
    const s = document.createElement("span");
    s.style.cssText = `display:inline-flex;align-items:center;gap:5px;background:${bg};color:${color};font-size:0.78rem;font-weight:700;padding:5px 12px;border-radius:20px;border:1px solid ${border};`;
    s.innerHTML = html;
    return s;
  };

  // GST
  wrapper.appendChild(
    gstRate > 0
      ? _badge(
          "rgba(230,10,234,0.1)",
          "#e60aea",
          "rgba(230,10,234,0.2)",
          `<i class="fas fa-file-invoice" style="font-size:0.7rem"></i> GST ${gstRate}% incl.`
        )
      : _badge(
          "rgba(16,185,129,0.1)",
          "#10b981",
          "rgba(16,185,129,0.2)",
          `<i class="fas fa-check-circle" style="font-size:0.7rem"></i> GST 0%`
        )
  );

  const shippingOn = Boolean(post.shipping_available);
  const hasPickup = !!(
    post.pickup_city ||
    post.pickup_address ||
    post.pickup_pincode
  );
  const chargeType = post.delivery_charge_type || null;
  const flatCharge = parseFloat(
    post.base_delivery_charge != null
      ? post.base_delivery_charge
      : post.shipping_cost || 0
  );
  const base = parseFloat(post.base_delivery_charge || 0);
  const perKm = parseFloat(post.per_km_rate || 0);
  const loc = [post.pickup_city, post.pickup_state].filter(Boolean).join(", ");

  if (shippingOn && hasPickup) {
    // BOTH — show combined badge + delivery charge detail + pickup location
    wrapper.appendChild(
      _badge(
        "rgba(139,92,246,0.1)",
        "#7c3aed",
        "rgba(139,92,246,0.2)",
        `<i class="fas fa-exchange-alt" style="font-size:0.7rem"></i> Shipping &amp; Pickup`
      )
    );

    // Delivery charge detail
    if (chargeType === "free")
      wrapper.appendChild(
        _badge(
          "rgba(16,185,129,0.1)",
          "#10b981",
          "rgba(16,185,129,0.2)",
          `<i class="fas fa-truck" style="font-size:0.7rem"></i> Free Shipping`
        )
      );
    else if (chargeType === "per_km")
      wrapper.appendChild(
        _badge(
          "rgba(59,130,246,0.1)",
          "#3b82f6",
          "rgba(59,130,246,0.2)",
          `<i class="fas fa-route" style="font-size:0.7rem"></i> ₹${base}+₹${perKm}/km`
        )
      );
    else if (chargeType === "flat" && flatCharge > 0)
      wrapper.appendChild(
        _badge(
          "rgba(59,130,246,0.1)",
          "#3b82f6",
          "rgba(59,130,246,0.2)",
          `<i class="fas fa-truck" style="font-size:0.7rem"></i> Delivery: ₹${flatCharge}`
        )
      );

    // Pickup location
    wrapper.appendChild(
      _badge(
        "rgba(79,70,229,0.1)",
        "#4f46e5",
        "rgba(79,70,229,0.2)",
        `<i class="fas fa-store" style="font-size:0.7rem"></i> Pickup${
          loc ? ": " + loc : " Available"
        }`
      )
    );
  } else if (shippingOn) {
    // Shipping only
    if (chargeType === "free")
      wrapper.appendChild(
        _badge(
          "rgba(16,185,129,0.1)",
          "#10b981",
          "rgba(16,185,129,0.2)",
          `<i class="fas fa-truck" style="font-size:0.7rem"></i> Free Delivery`
        )
      );
    else if (chargeType === "per_km")
      wrapper.appendChild(
        _badge(
          "rgba(59,130,246,0.1)",
          "#3b82f6",
          "rgba(59,130,246,0.2)",
          `<i class="fas fa-route" style="font-size:0.7rem"></i> ₹${base}+₹${perKm}/km`
        )
      );
    else if (chargeType === "flat")
      wrapper.appendChild(
        flatCharge === 0
          ? _badge(
              "rgba(16,185,129,0.1)",
              "#10b981",
              "rgba(16,185,129,0.2)",
              `<i class="fas fa-truck" style="font-size:0.7rem"></i> Free Delivery`
            )
          : _badge(
              "rgba(59,130,246,0.1)",
              "#3b82f6",
              "rgba(59,130,246,0.2)",
              `<i class="fas fa-truck" style="font-size:0.7rem"></i> Delivery: ₹${flatCharge}`
            )
      );
    else {
      const legacyCost = parseFloat(post.shipping_cost || 0);
      wrapper.appendChild(
        _badge(
          "rgba(59,130,246,0.1)",
          "#3b82f6",
          "rgba(59,130,246,0.2)",
          legacyCost === 0
            ? `<i class="fas fa-truck" style="font-size:0.7rem"></i> Shipping Available`
            : `<i class="fas fa-truck" style="font-size:0.7rem"></i> Delivery: ₹${legacyCost}`
        )
      );
    }
  } else {
    // Pickup only
    wrapper.appendChild(
      _badge(
        "rgba(107,114,128,0.1)",
        "#6b7280",
        "rgba(107,114,128,0.2)",
        `<i class="fas fa-times-circle" style="font-size:0.7rem"></i> No Shipping`
      )
    );
    if (hasPickup)
      wrapper.appendChild(
        _badge(
          "rgba(139,92,246,0.1)",
          "#7c3aed",
          "rgba(139,92,246,0.2)",
          `<i class="fas fa-store" style="font-size:0.7rem"></i> Pickup${
            loc ? ": " + loc : " Available"
          }`
        )
      );
  }

  if (post.accepts_cod)
    wrapper.appendChild(
      _badge(
        "rgba(245,158,11,0.1)",
        "#f59e0b",
        "rgba(245,158,11,0.2)",
        `<i class="fas fa-money-bill-wave" style="font-size:0.7rem"></i> COD Available`
      )
    );

  const purchaseSection = document.getElementById("purchaseSection");
  if (purchaseSection)
    purchaseSection.insertAdjacentElement("beforebegin", wrapper);
  else document.getElementById("sellingDetails")?.appendChild(wrapper);
}

// ===== DISPLAY PAYMENT METHODS =====
function displayPaymentMethods(post) {
  const paymentSection = document.getElementById("paymentMethodsSection");
  const paymentBadges = document.getElementById("paymentBadges");
  const methods = [];

  if (post.accepts_upi) {
    methods.push(
      '<span class="payment-badge"><i class="fas fa-mobile-alt"></i> UPI</span>'
    );
  }
  if (post.accepts_bank_transfer) {
    methods.push(
      '<span class="payment-badge"><i class="fas fa-university"></i> Bank Transfer</span>'
    );
  }
  if (post.accepts_cod) {
    methods.push(
      '<span class="payment-badge"><i class="fas fa-money-bill-wave"></i> Cash on Delivery</span>'
    );
  }

  if (methods.length > 0) {
    paymentBadges.innerHTML = methods.join("");
    paymentSection.style.display = "block";
  }
}

// ===== DISPLAY CONTACT SECTION =====
function displayContactSection(post) {
  const contactSection = document.getElementById("contactSection");
  const contactButtons = document.getElementById("contactButtons");
  const buttons = [];

  if (post.contact_phone || post.seller_phone_number) {
    const phone = post.contact_phone || post.seller_phone_number;
    buttons.push(`
      <a href="tel:${phone}" class="contact-btn">
        <i class="fas fa-phone"></i>
        <span>Call: ${phone}</span>
      </a>
    `);

    buttons.push(`
      <a href="https://wa.me/${phone.replace(
        /\D/g,
        ""
      )}" target="_blank" class="contact-btn">
        <i class="fab fa-whatsapp"></i>
        <span>WhatsApp</span>
      </a>
    `);
  }

  if (post.contact_email) {
    buttons.push(`
      <a href="mailto:${post.contact_email}" class="contact-btn">
        <i class="fas fa-envelope"></i>
        <span>Email: ${post.contact_email}</span>
      </a>
    `);
  }

  if (buttons.length > 0) {
    contactButtons.innerHTML = buttons.join("");
    contactSection.style.display = "block";
  }
}

// ===== DISPLAY PURCHASE BUTTON =====
// FIX 2: Service shows "from ₹X" when price > 0, or "Get Quote" when 0
function displayPurchaseButton(post) {
  const purchaseSection = document.getElementById("purchaseSection");
  const purchaseBtn = document.getElementById("purchaseBtn");
  const purchaseText = document.getElementById("purchaseText");

  if (post.post_type === "service") {
    const priceLabel =
      parseFloat(post.price) > 0
        ? `from ₹${parseFloat(post.price).toFixed(0)}`
        : "Get Quote";
    purchaseText.innerHTML = `Book Now · ${priceLabel}`;
    purchaseBtn.innerHTML =
      '<i class="fas fa-calendar"></i>' + purchaseText.outerHTML;
    purchaseBtn.onclick = () => openServiceSummary(post.post_id);
  } else {
    purchaseText.innerHTML = `Buy Now · ₹${parseFloat(post.price).toFixed(2)}`;
    purchaseBtn.innerHTML =
      '<i class="fas fa-shopping-cart"></i>' + purchaseText.outerHTML;
    purchaseBtn.onclick = () => openProductSummary(post.post_id);
  }

  purchaseSection.style.display = "block";
}

// ===== OPEN SERVICE SUMMARY IN IFRAME =====
function openServiceSummary(postId) {
  if (!currentUser) {
    showToast("Please login to book services", "error");
    return;
  }

  console.log("🔖 Opening service booking for post:", postId);

  const modal = document.createElement("div");
  modal.className = "booking-modal";
  modal.id = "bookingModal";
  modal.innerHTML = `
    <div class="booking-modal-overlay" onclick="closeBookingModal()">
      <div class="booking-modal-content" onclick="event.stopPropagation()">
        <iframe 
          src="service-summary.html?id=${postId}" 
          frameborder="0"
          id="bookingIframe"
          style="width: 100%; height: 100%; border: none; display: block;">
        </iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  window.addEventListener("message", handleBookingMessage);
}

// ===== OPEN PRODUCT SUMMARY IN IFRAME =====
function openProductSummary(postId) {
  if (!currentUser) {
    showToast("Please login to purchase products", "error");
    return;
  }

  console.log("🛒 Opening product purchase for post:", postId);

  const modal = document.createElement("div");
  modal.className = "booking-modal";
  modal.id = "bookingModal";
  modal.innerHTML = `
    <div class="booking-modal-overlay" onclick="closeBookingModal()">
      <div class="booking-modal-content" onclick="event.stopPropagation()">
        <iframe 
          src="product-summary.html?id=${postId}" 
          frameborder="0"
          id="bookingIframe"
          style="width: 100%; height: 100%; border: none; display: block;">
        </iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    modal.classList.add("show");
  }, 10);

  window.addEventListener("message", handleBookingMessage);
}

// ===== CLOSE BOOKING MODAL =====
function closeBookingModal() {
  const modal = document.getElementById("bookingModal");
  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.remove();
    document.body.style.overflow = "auto";
  }, 300);

  window.removeEventListener("message", handleBookingMessage);
}

// ===== HANDLE BOOKING MESSAGE =====
function handleBookingMessage(event) {
  const { action, userId } = event.data;

  if (action === "closeModal") {
    closeBookingModal();
  } else if (action === "navigateToProfile" && userId) {
    closeBookingModal();
    setTimeout(() => {
      window.parent.location.href = `profile.html?id=${userId}`;
    }, 300);
  }
}

window.openServiceSummary = openServiceSummary;
window.openProductSummary = openProductSummary;
window.closeBookingModal = closeBookingModal;

// ===== DISPLAY ENGAGEMENT STATS =====
function displayEngagementStats(post) {
  document.getElementById("likesCount").textContent = post.likes_count || 0;
  document.getElementById("commentsCount").textContent =
    post.comments_count || 0;
  document.getElementById("sharesCount").textContent = post.shares_count || 0;

  if (post.views_count) {
    document.getElementById("viewsCount").style.display = "flex";
    document.getElementById("viewsNumber").textContent = post.views_count;
  }
}

// ===== SETUP ACTION BUTTONS =====
function setupActionButtons(post) {
  const likeBtn = document.getElementById("likeBtn");
  const commentBtn = document.getElementById("commentBtn");
  const shareBtn = document.getElementById("shareBtn");

  if (post.user_liked) {
    likeBtn.classList.add("liked");
    likeBtn.querySelector("i").classList.remove("far");
    likeBtn.querySelector("i").classList.add("fas");
  }

  likeBtn.onclick = () => toggleLike(post.post_id);

  commentBtn.onclick = () => {
    const commentsSection = document.getElementById("commentsSection");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        const commentInput = document.getElementById("commentInput");
        if (commentInput) {
          commentInput.focus();
        }
      }, 500);
    }
  };

  shareBtn.onclick = () => sharePost(post.post_id);
}

// ===== TOGGLE LIKE =====
async function toggleLike(postId) {
  if (!currentUser) {
    showToast("Please login to like posts", "error");
    return;
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      const likeBtn = document.getElementById("likeBtn");
      const likesCount = document.getElementById("likesCount");
      const icon = likeBtn.querySelector("i");

      if (data.liked) {
        likeBtn.classList.add("liked");
        icon.classList.remove("far");
        icon.classList.add("fas");
        showToast("Post liked!", "success");
      } else {
        likeBtn.classList.remove("liked");
        icon.classList.remove("fas");
        icon.classList.add("far");
        showToast("Post unliked", "success");
      }

      likesCount.textContent = data.likes_count || 0;
      currentPost.user_liked = data.liked;
      currentPost.likes_count = data.likes_count;
    } else {
      showToast(data.message || "Failed to like post", "error");
    }
  } catch (error) {
    console.error("❌ Error toggling like:", error);
    showToast("Failed to like post", "error");
  }
}

// ===== SHARE POST =====
let selectedShareUsers = new Set();

function sharePost(postId) {
  if (!currentUser) {
    showToast("Please login to share posts", "error");
    return;
  }

  const modal = document.getElementById("shareModal");
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    selectedShareUsers.clear();
    updateSelectedUsersDisplay();
    loadUsersForShare();
  }
}

function closeShareModal() {
  const modal = document.getElementById("shareModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
    selectedShareUsers.clear();
    updateSelectedUsersDisplay();
  }
}

async function loadUsersForShare() {
  const listEl = document.getElementById("shareCreatorsList");
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading people...</p>
    </div>
  `;

  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/share/search-users?limit=50`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success && data.users && data.users.length > 0) {
      listEl.innerHTML = "";

      data.users.forEach((user) => {
        const userItem = document.createElement("div");
        userItem.className = "share-user-item";
        userItem.dataset.userId = user.user_id;

        let profilePicUrl;
        if (user.profile_pic) {
          profilePicUrl = constructMediaUrl(user.profile_pic, "profile");
        } else {
          profilePicUrl = generateDefaultAvatar(
            user.full_name || user.username
          );
        }

        userItem.innerHTML = `
          <input 
            type="checkbox" 
            class="share-user-checkbox" 
            id="share-user-${user.user_id}"
            onchange="toggleUserSelection(${user.user_id}, this.checked)"
          />
          <label for="share-user-${user.user_id}" class="share-user-label">
            <img 
              src="${profilePicUrl}" 
              alt="${escapeHtml(user.full_name)}" 
              class="share-user-avatar"
              onerror="this.src='${generateDefaultAvatar(
                user.full_name || user.username
              )}'"
            />
            <div class="share-user-info">
              <span class="share-user-name">${escapeHtml(user.full_name)}</span>
              <span class="share-user-username">@${escapeHtml(
                user.username
              )}</span>
            </div>
          </label>
        `;

        listEl.appendChild(userItem);
      });
    } else {
      listEl.innerHTML = `
        <div class="share-empty-state">
          <i class="fas fa-user-slash"></i>
          <p>No one to share with</p>
          <small>Follow people to share posts with them</small>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error loading users for share:", error);
    listEl.innerHTML = `
      <div class="share-empty-state error">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load users</p>
        <small>Please try again</small>
      </div>
    `;
  }
}

function searchUsersForShare(query) {
  const listEl = document.getElementById("shareCreatorsList");
  if (!listEl) return;

  const items = listEl.querySelectorAll(".share-user-item");
  const lowerQuery = query.toLowerCase();

  items.forEach((item) => {
    const name = item.querySelector(".share-user-name").textContent;
    const username = item.querySelector(".share-user-username").textContent;

    if (
      name.toLowerCase().includes(lowerQuery) ||
      username.toLowerCase().includes(lowerQuery)
    ) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function toggleUserSelection(userId, isSelected) {
  if (isSelected) {
    selectedShareUsers.add(userId);
  } else {
    selectedShareUsers.delete(userId);
  }

  updateSelectedUsersDisplay();
}

function updateSelectedUsersDisplay() {
  const count = selectedShareUsers.size;
  const footerEl = document.getElementById("shareFooter");
  const countEl = document.getElementById("shareCount");
  const selectedContainer = document.getElementById("selectedUsers");
  const selectedList = document.getElementById("selectedUsersList");

  if (count > 0) {
    if (footerEl) footerEl.style.display = "flex";
    if (countEl) countEl.textContent = count;
    if (selectedContainer) selectedContainer.style.display = "block";

    if (selectedList) {
      selectedList.innerHTML = "";

      selectedShareUsers.forEach((userId) => {
        const userItem = document.querySelector(`[data-user-id="${userId}"]`);
        if (userItem) {
          const name = userItem.querySelector(".share-user-name").textContent;
          let avatar = userItem.querySelector(".share-user-avatar").src;

          if (!avatar || avatar.includes("default-avatar.png")) {
            avatar = generateDefaultAvatar(name);
          }

          const chip = document.createElement("div");
          chip.className = "selected-user-chip";
          chip.innerHTML = `
            <img src="${avatar}" alt="${name}" onerror="this.src='${generateDefaultAvatar(
            name
          )}'" />
            <span>${name}</span>
            <button onclick="toggleUserSelection(${userId}, false); document.getElementById('share-user-${userId}').checked = false;">
              <i class="fas fa-times"></i>
            </button>
          `;

          selectedList.appendChild(chip);
        }
      });
    }

    const headerCount = document.querySelector(".selected-count");
    if (headerCount) {
      headerCount.textContent = `${count} selected`;
    }
  } else {
    if (footerEl) footerEl.style.display = "none";
    if (selectedContainer) selectedContainer.style.display = "none";
  }
}

function clearSelectedUsers() {
  selectedShareUsers.clear();
  const checkboxes = document.querySelectorAll(".share-user-checkbox");
  checkboxes.forEach((cb) => (cb.checked = false));
  updateSelectedUsersDisplay();
}

async function sendSharedPost() {
  if (!currentPost) {
    showToast("Post not loaded", "error");
    return;
  }

  if (selectedShareUsers.size === 0) {
    showToast("Please select at least one person to share with", "error");
    return;
  }

  const sendBtn = document.getElementById("sendShareBtn");
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  }

  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/share/post/${currentPost.post_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_ids: Array.from(selectedShareUsers),
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      showToast(`Post shared with ${data.shared_count} person(s)!`, "success");
      closeShareModal();

      const shareCountEl = document.getElementById("sharesCount");
      if (shareCountEl) {
        const currentCount = parseInt(shareCountEl.textContent) || 0;
        shareCountEl.textContent = currentCount + data.shared_count;
      }
    } else {
      showToast(data.message || "Failed to share post", "error");
    }
  } catch (error) {
    console.error("❌ Error sharing post:", error);
    showToast("Failed to share post. Please try again.", "error");
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML =
        '<i class="fas fa-paper-plane"></i> <span>Send</span>';
    }
  }
}

function shareViaLink() {
  if (!currentPost) return;

  const url = `${window.location.origin}/post-detail.html?id=${currentPost.post_id}`;

  navigator.clipboard
    .writeText(url)
    .then(() => {
      showToast("Link copied to clipboard!", "success");
      closeShareModal();
    })
    .catch(() => {
      showToast("Failed to copy link", "error");
    });
}

function shareViaWhatsApp() {
  if (!currentPost) return;

  const url = `${window.location.origin}/post-detail.html?id=${currentPost.post_id}`;
  const text = encodeURIComponent(
    currentPost.caption || "Check out this amazing post on Creator Connect!"
  );

  window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  closeShareModal();
  showToast("Opening WhatsApp...", "success");
}

function shareViaFacebook() {
  if (!currentPost) return;

  const url = `${window.location.origin}/post-detail.html?id=${currentPost.post_id}`;
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    "_blank",
    "width=600,height=400"
  );
  closeShareModal();
  showToast("Opening Facebook...", "success");
}

function shareViaTwitter() {
  if (!currentPost) return;

  const url = `${window.location.origin}/post-detail.html?id=${currentPost.post_id}`;
  const text = encodeURIComponent(
    currentPost.caption || "Check out this amazing post on Creator Connect!"
  );

  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(
      url
    )}`,
    "_blank",
    "width=600,height=400"
  );
  closeShareModal();
  showToast("Opening Twitter...", "success");
}

function generateDefaultAvatar(name) {
  const initial = (name || "U").charAt(0).toUpperCase();
  const colors = [
    "#e60aea",
    "#e336cc",
    "#9b59b6",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#e74c3c",
    "#1abc9c",
    "#16a085",
    "#27ae60",
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];

  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${color}"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="45" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">${initial}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

window.sharePost = sharePost;
window.closeShareModal = closeShareModal;
window.searchUsersForShare = searchUsersForShare;
window.toggleUserSelection = toggleUserSelection;
window.clearSelectedUsers = clearSelectedUsers;
window.sendSharedPost = sendSharedPost;
window.shareViaLink = shareViaLink;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaFacebook = shareViaFacebook;
window.shareViaTwitter = shareViaTwitter;

// ============================================
// COMMENTS FUNCTIONALITY
// ============================================

function setupCommentListeners() {
  const commentInput = document.getElementById("commentInput");
  const postCommentBtn = document.getElementById("postCommentBtn");
  const charCount = document.getElementById("charCount");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const filterBtn = document.getElementById("filterBtn");
  const filterDropdown = document.getElementById("filterDropdown");

  if (commentInput && charCount) {
    commentInput.addEventListener("input", () => {
      const length = commentInput.value.length;
      charCount.textContent = `${length}/1000`;

      if (length > 900) {
        charCount.classList.add("danger");
        charCount.classList.remove("warning");
      } else if (length > 800) {
        charCount.classList.add("warning");
        charCount.classList.remove("danger");
      } else {
        charCount.classList.remove("warning", "danger");
      }

      if (postCommentBtn) {
        postCommentBtn.disabled = length === 0 || length > 1000;
      }

      commentInput.style.height = "auto";
      commentInput.style.height = commentInput.scrollHeight + "px";
    });
  }

  if (postCommentBtn) {
    postCommentBtn.addEventListener("click", postComment);
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreComments);
  }

  if (filterBtn && filterDropdown) {
    filterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      filterDropdown.classList.toggle("active");
    });

    const filterOptions = filterDropdown.querySelectorAll(".filter-option");
    filterOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const sortBy = option.getAttribute("data-sort");
        changeCommentSort(sortBy);
        filterDropdown.classList.remove("active");
      });
    });

    document.addEventListener("click", (e) => {
      if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.remove("active");
      }
    });
  }
}

async function loadComments(postId, append = false) {
  if (commentsData.loading) return;

  const commentsList = document.getElementById("commentsList");
  const commentsLoading = document.getElementById("commentsLoading");
  const commentsEmpty = document.getElementById("commentsEmpty");
  const loadMoreSection = document.getElementById("loadMoreComments");

  if (!append) {
    commentsData.offset = 0;
    commentsData.comments = [];
    if (commentsLoading) commentsLoading.style.display = "block";
    if (commentsEmpty) commentsEmpty.style.display = "none";
  }

  commentsData.loading = true;

  try {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/posts/${postId}/comments?limit=${commentsData.limit}&offset=${commentsData.offset}&include_replies=true&sort_by=${commentsData.sortBy}`;

    const response = await fetch(url, { method: "GET", headers: headers });
    const data = await response.json();

    if (data.success) {
      if (!append) {
        commentsData.comments = data.comments || [];
      } else {
        commentsData.comments = [
          ...commentsData.comments,
          ...(data.comments || []),
        ];
      }

      commentsData.hasMore = data.has_more || false;
      commentsData.offset += data.comments?.length || 0;

      updateCommentCount(data.total_count || 0);
      displayComments(append);

      if (loadMoreSection) {
        loadMoreSection.style.display = commentsData.hasMore ? "block" : "none";
      }

      if (commentsLoading) {
        commentsLoading.style.display = "none";
      }

      if (commentsData.comments.length === 0 && commentsEmpty) {
        commentsEmpty.style.display = "block";
      }
    } else {
      if (commentsLoading) commentsLoading.style.display = "none";
      showToast("Failed to load comments", "error");
    }
  } catch (error) {
    console.error("❌ Error loading comments:", error);
    if (commentsLoading) commentsLoading.style.display = "none";
    showToast("Failed to load comments", "error");
  } finally {
    commentsData.loading = false;
  }
}

function displayComments(append = false) {
  const commentsList = document.getElementById("commentsList");
  const commentsLoading = document.getElementById("commentsLoading");
  const commentsEmpty = document.getElementById("commentsEmpty");

  if (commentsLoading) commentsLoading.style.display = "none";
  if (commentsEmpty) commentsEmpty.style.display = "none";

  if (!append) {
    const existingComments = commentsList.querySelectorAll(".comment-item");
    existingComments.forEach((comment) => comment.remove());
  }

  commentsData.comments.forEach((comment) => {
    if (
      append &&
      commentsList.querySelector(`[data-comment-id="${comment.comment_id}"]`)
    ) {
      return;
    }

    const commentElement = createCommentElement(comment);

    if (commentsLoading) {
      commentsList.insertBefore(commentElement, commentsLoading);
    } else {
      commentsList.appendChild(commentElement);
    }
  });
}

function createCommentElement(comment) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "comment-item";
  commentDiv.setAttribute("data-comment-id", comment.comment_id);

  const avatarUrl = constructMediaUrl(comment.profile_pic, "profile");
  const isOwner = currentUser && currentUser.id === comment.user_id;

  const userLiked = comment.user_liked || false;
  const likeIconClass = userLiked ? "fas" : "far";
  const likeButtonStyle = userLiked ? 'style="color: #ff1744;"' : "";

  commentDiv.innerHTML = `
    <div class="comment-header">
      <img src="${avatarUrl}" alt="${escapeHtml(
    comment.username
  )}" class="comment-avatar" 
           onerror="this.onerror=null;this.src=generateDefaultAvatar('${escapeHtml(
             comment.full_name || comment.username
           )}')">
      <div class="comment-user-info">
        <span class="comment-user-name">${escapeHtml(
          comment.full_name || comment.username
        )}</span>
        <span class="comment-username">@${escapeHtml(comment.username)}</span>
        <span class="comment-time">${getTimeAgo(comment.created_at)}</span>
      </div>
      ${
        isOwner
          ? `
        <div style="position: relative;">
          <button class="comment-menu-btn" onclick="toggleCommentMenu(event, ${comment.comment_id})">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <div class="comment-options-menu" id="menu-${comment.comment_id}">
            <div class="comment-menu-option" onclick="startEditingComment(${comment.comment_id})">
              <i class="fas fa-edit"></i>
              <span>Edit</span>
            </div>
            <div class="comment-menu-option delete" onclick="deleteComment(${comment.comment_id})">
              <i class="fas fa-trash"></i>
              <span>Delete</span>
            </div>
          </div>
        </div>
      `
          : ""
      }
    </div>
    
    <div class="comment-content" id="comment-content-${comment.comment_id}">
      ${escapeHtml(comment.content)}
    </div>
    
    ${
      isOwner
        ? `
      <div class="comment-edit-form" id="comment-edit-${comment.comment_id}">
        <textarea class="comment-edit-input" id="edit-input-${
          comment.comment_id
        }">${escapeHtml(comment.content)}</textarea>
        <div class="comment-edit-actions">
          <button class="btn-save-edit" onclick="saveCommentEdit(${
            comment.comment_id
          })">
            <i class="fas fa-check"></i> Save
          </button>
          <button class="btn-cancel-edit" onclick="cancelCommentEdit(${
            comment.comment_id
          })">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
      </div>
    `
        : ""
    }
    
    <div class="comment-actions-bar">
      <button class="comment-action-btn" onclick="likeComment(${
        comment.comment_id
      }, this)" ${likeButtonStyle}>
        <i class="${likeIconClass} fa-heart"></i>
        <span>${comment.likes_count || 0}</span>
      </button>
      <button class="comment-action-btn" onclick="replyToComment(${
        comment.comment_id
      }, '${escapeHtml(comment.username)}')">
        <i class="far fa-comment"></i>
        <span>Reply</span>
      </button>
    </div>
    
    ${
      comment.replies && comment.replies.length > 0
        ? `
      <div class="comment-replies">
        ${comment.replies.map((reply) => createReplyHTML(reply)).join("")}
      </div>
    `
        : ""
    }
  `;

  return commentDiv;
}

function createReplyHTML(reply) {
  const avatarUrl = constructMediaUrl(reply.profile_pic, "profile");
  const isOwner = currentUser && currentUser.id === reply.user_id;

  const userLiked = reply.user_liked || false;
  const likeIconClass = userLiked ? "fas" : "far";
  const likeButtonStyle = userLiked ? 'style="color: #ff1744;"' : "";

  return `
    <div class="reply-item comment-item" data-comment-id="${reply.comment_id}">
      <div class="comment-header">
        <img src="${avatarUrl}" alt="${escapeHtml(
    reply.username
  )}" class="comment-avatar" 
             onerror="this.onerror=null;this.src=generateDefaultAvatar('${escapeHtml(
               reply.full_name || reply.username
             )}')">
        <div class="comment-user-info">
          <span class="comment-user-name">${escapeHtml(
            reply.full_name || reply.username
          )}</span>
          <span class="comment-username">@${escapeHtml(reply.username)}</span>
          <span class="comment-time">${getTimeAgo(reply.created_at)}</span>
        </div>
        ${
          isOwner
            ? `
          <div style="position: relative;">
            <button class="comment-menu-btn" onclick="toggleCommentMenu(event, ${reply.comment_id})">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="comment-options-menu" id="menu-${reply.comment_id}">
              <div class="comment-menu-option" onclick="startEditingComment(${reply.comment_id})">
                <i class="fas fa-edit"></i>
                <span>Edit</span>
              </div>
              <div class="comment-menu-option delete" onclick="deleteComment(${reply.comment_id})">
                <i class="fas fa-trash"></i>
                <span>Delete</span>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
      
      <div class="comment-content" id="comment-content-${reply.comment_id}">
        ${escapeHtml(reply.content)}
      </div>
      
      ${
        isOwner
          ? `
        <div class="comment-edit-form" id="comment-edit-${reply.comment_id}">
          <textarea class="comment-edit-input" id="edit-input-${
            reply.comment_id
          }">${escapeHtml(reply.content)}</textarea>
          <div class="comment-edit-actions">
            <button class="btn-save-edit" onclick="saveCommentEdit(${
              reply.comment_id
            })">
              <i class="fas fa-check"></i> Save
            </button>
            <button class="btn-cancel-edit" onclick="cancelCommentEdit(${
              reply.comment_id
            })">
              <i class="fas fa-times"></i> Cancel
            </button>
          </div>
        </div>
      `
          : ""
      }
      
      <div class="comment-actions-bar">
        <button class="comment-action-btn" onclick="likeComment(${
          reply.comment_id
        }, this)" ${likeButtonStyle}>
          <i class="${likeIconClass} fa-heart"></i>
          <span>${reply.likes_count || 0}</span>
        </button>
      </div>
    </div>
  `;
}

async function postComment() {
  if (!currentUser) {
    showToast("Please login to comment", "error");
    return;
  }

  if (!currentPost) {
    showToast("Post not loaded", "error");
    return;
  }

  const commentInput = document.getElementById("commentInput");
  const content = commentInput.value.trim();

  if (!content) {
    showToast("Comment cannot be empty", "error");
    return;
  }

  if (content.length > 1000) {
    showToast("Comment too long (max 1000 characters)", "error");
    return;
  }

  const postCommentBtn = document.getElementById("postCommentBtn");
  if (postCommentBtn) {
    postCommentBtn.disabled = true;
    postCommentBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Posting...';
  }

  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/posts/${currentPost.post_id}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content }),
      }
    );

    const data = await response.json();

    if (data.success && data.comment) {
      commentInput.value = "";
      commentInput.style.height = "auto";
      document.getElementById("charCount").textContent = "0/1000";

      const commentsList = document.getElementById("commentsList");
      const commentsLoading = document.getElementById("commentsLoading");
      const commentsEmpty = document.getElementById("commentsEmpty");

      if (commentsEmpty) commentsEmpty.style.display = "none";

      const newCommentElement = createCommentElement(data.comment);
      if (commentsLoading) {
        commentsList.insertBefore(newCommentElement, commentsLoading);
      } else {
        commentsList.insertBefore(newCommentElement, commentsList.firstChild);
      }

      const currentCount = parseInt(
        document.getElementById("commentsBadge").textContent || "0"
      );
      updateCommentCount(currentCount + 1);

      const postCommentsCount = document.getElementById("commentsCount");
      if (postCommentsCount) {
        postCommentsCount.textContent = currentCount + 1;
      }

      showToast("Comment posted successfully!", "success");
    } else {
      showToast(data.message || "Failed to post comment", "error");
    }
  } catch (error) {
    console.error("❌ Error posting comment:", error);
    showToast("Failed to post comment", "error");
  } finally {
    if (postCommentBtn) {
      postCommentBtn.disabled = false;
      postCommentBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';
    }
  }
}

window.toggleCommentMenu = function (event, commentId) {
  event.stopPropagation();

  const menu = document.getElementById(`menu-${commentId}`);

  document.querySelectorAll(".comment-options-menu").forEach((m) => {
    if (m !== menu) {
      m.classList.remove("active");
    }
  });

  if (menu) {
    menu.classList.toggle("active");
  }

  const closeMenu = (e) => {
    if (!menu.contains(e.target) && !e.target.closest(".comment-menu-btn")) {
      menu.classList.remove("active");
      document.removeEventListener("click", closeMenu);
    }
  };

  if (menu.classList.contains("active")) {
    setTimeout(() => {
      document.addEventListener("click", closeMenu);
    }, 0);
  }
};

function startEditingComment(commentId) {
  const menu = document.getElementById(`menu-${commentId}`);
  if (menu) {
    menu.classList.remove("active");
  }

  const contentDiv = document.getElementById(`comment-content-${commentId}`);
  const editForm = document.getElementById(`comment-edit-${commentId}`);

  if (contentDiv && editForm) {
    contentDiv.style.display = "none";
    editForm.classList.add("active");

    const textarea = document.getElementById(`edit-input-${commentId}`);
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }
}

window.saveCommentEdit = async function (commentId) {
  const textarea = document.getElementById(`edit-input-${commentId}`);
  const newContent = textarea.value.trim();

  if (!newContent) {
    showToast("Comment cannot be empty", "error");
    return;
  }

  if (newContent.length > 1000) {
    showToast("Comment too long (max 1000 characters)", "error");
    return;
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newContent }),
    });

    const data = await response.json();

    if (data.success) {
      const contentDiv = document.getElementById(
        `comment-content-${commentId}`
      );
      const editForm = document.getElementById(`comment-edit-${commentId}`);

      if (contentDiv && editForm) {
        contentDiv.textContent = newContent;
        contentDiv.style.display = "block";
        editForm.classList.remove("active");
      }

      showToast("Comment updated successfully!", "success");
    } else {
      showToast(data.message || "Failed to update comment", "error");
    }
  } catch (error) {
    console.error("❌ Error updating comment:", error);
    showToast("Failed to update comment", "error");
  }
};

window.cancelCommentEdit = function (commentId) {
  const contentDiv = document.getElementById(`comment-content-${commentId}`);
  const editForm = document.getElementById(`comment-edit-${commentId}`);

  if (contentDiv && editForm) {
    contentDiv.style.display = "block";
    editForm.classList.remove("active");

    const textarea = document.getElementById(`edit-input-${commentId}`);
    if (textarea) {
      textarea.value = contentDiv.textContent.trim();
    }
  }
};

let commentToDelete = null;

window.deleteComment = function (commentId) {
  const menu = document.getElementById(`menu-${commentId}`);
  if (menu) {
    menu.classList.remove("active");
  }

  commentToDelete = commentId;

  const modal = document.getElementById("deleteModalOverlay");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
};

async function confirmDeleteComment() {
  if (!commentToDelete) return;

  const modal = document.getElementById("deleteModalOverlay");
  const confirmBtn = document.getElementById("btnConfirmDelete");

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  }

  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/comments/${commentToDelete}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      }

      const commentElement = document.querySelector(
        `[data-comment-id="${commentToDelete}"]`
      );
      if (commentElement) {
        commentElement.style.animation = "fadeOut 0.3s ease";
        setTimeout(() => {
          commentElement.remove();

          const remainingComments = document.querySelectorAll(
            ".comment-item:not(.reply-item)"
          ).length;
          if (remainingComments === 0) {
            const commentsEmpty = document.getElementById("commentsEmpty");
            if (commentsEmpty) {
              commentsEmpty.style.display = "block";
            }
          }
        }, 300);
      }

      const currentCount = parseInt(
        document.getElementById("commentsBadge").textContent || "0"
      );
      updateCommentCount(Math.max(0, currentCount - 1));

      const postCommentsCount = document.getElementById("commentsCount");
      if (postCommentsCount) {
        postCommentsCount.textContent = Math.max(0, currentCount - 1);
      }

      showToast("Comment deleted successfully!", "success");
    } else {
      showToast(data.message || "Failed to delete comment", "error");
      if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      }
    }
  } catch (error) {
    console.error("❌ Error deleting comment:", error);
    showToast("Failed to delete comment", "error");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    }
    commentToDelete = null;
  }
}

function cancelDeleteComment() {
  const modal = document.getElementById("deleteModalOverlay");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
  commentToDelete = null;
}

window.likeComment = async function (commentId, buttonElement) {
  if (!currentUser) {
    showToast("Please login to like comments", "error");
    return;
  }

  const likeBtn = buttonElement;
  const icon = likeBtn.querySelector("i");
  const countSpan = likeBtn.querySelector("span");

  if (likeBtn.disabled) return;
  likeBtn.disabled = true;

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      if (data.liked) {
        icon.classList.remove("far");
        icon.classList.add("fas");
        likeBtn.style.color = "#ff1744";
        showToast("Comment liked! ❤️", "success");
      } else {
        icon.classList.remove("fas");
        icon.classList.add("far");
        likeBtn.style.color = "";
        showToast("Comment unliked", "success");
      }

      if (data.likes_count !== undefined) {
        countSpan.textContent = data.likes_count;
      }

      likeBtn.style.transform = "scale(1.2)";
      setTimeout(() => {
        likeBtn.style.transform = "";
      }, 200);
    } else {
      showToast(data.message || "Failed to toggle like", "error");
    }
  } catch (error) {
    console.error("❌ Error toggling comment like:", error);
    showToast("Failed to toggle like", "error");
  } finally {
    setTimeout(() => {
      likeBtn.disabled = false;
    }, 300);
  }
};

window.replyToComment = function (commentId, username) {
  const commentInput = document.getElementById("commentInput");
  if (commentInput) {
    commentInput.value = `@${username} `;
    commentInput.focus();
    commentInput.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

function loadMoreComments() {
  if (currentPost && !commentsData.loading) {
    loadComments(currentPost.post_id, true);
  }
}

function updateCommentCount(count) {
  const badge = document.getElementById("commentsBadge");
  if (badge) {
    badge.textContent = count;
  }
}

function changeCommentSort(sortBy) {
  commentsData.sortBy = sortBy;

  const filterText = document.getElementById("filterText");
  const filterOptions = document.querySelectorAll(".filter-option");

  const sortLabels = {
    newest: "Newest",
    oldest: "Oldest",
    most_liked: "Most Liked",
  };

  if (filterText) {
    filterText.textContent = sortLabels[sortBy] || "Newest";
  }

  filterOptions.forEach((option) => {
    if (option.getAttribute("data-sort") === sortBy) {
      option.classList.add("active");
    } else {
      option.classList.remove("active");
    }
  });

  if (currentPost) {
    loadComments(currentPost.post_id, false);
  }
}

// ============================================
// UTILITY FUNCTIONS & EVENT LISTENERS
// ============================================

function constructMediaUrl(path, type = "post") {
  if (!path) return "images/placeholder.png";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  let cleanPath = path.replace(/^\/+/, "").replace(/^uploads\//, "");

  if (type === "profile") {
    const filename = cleanPath.split("/").pop();
    return `${API_BASE_URL}/get-profile-pic/${filename}`;
  } else {
    const filename = cleanPath.replace("posts/", "");
    return `${API_BASE_URL}/uploads/${filename}`;
  }
}

function getCategoryIcon(postType) {
  const icons = {
    showcase: "fas fa-images",
    service: "fas fa-briefcase",
    product: "fas fa-shopping-bag",
  };
  return icons[postType] || "fas fa-folder";
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const postTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - postTime) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;

  const options = { month: "short", day: "numeric" };
  if (now.getFullYear() !== postTime.getFullYear()) {
    options.year = "numeric";
  }
  return postTime.toLocaleDateString("en-US", options);
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  document.getElementById("loadingOverlay").style.display = "none";
  document.getElementById("errorContainer").style.display = "flex";
  console.error("❌", message);
}

function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

function showToast(message, type = "success") {
  window.parent.postMessage(
    { action: "showToast", message: message, type: type },
    "*"
  );
}

function setupEventListeners() {
  window.addEventListener("message", (event) => {
    if (event.data.action === "closeModal") {
      console.log("Received close request from parent");
    }
  });
}

function setupDeleteModalListeners() {
  const confirmBtn = document.getElementById("btnConfirmDelete");
  const cancelBtn = document.getElementById("btnCancelDelete");
  const modalOverlay = document.getElementById("deleteModalOverlay");

  if (confirmBtn) {
    confirmBtn.addEventListener("click", confirmDeleteComment);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelDeleteComment);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        cancelDeleteComment();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      modalOverlay &&
      modalOverlay.classList.contains("active")
    ) {
      cancelDeleteComment();
    }
  });
}

async function setupSaveButton(post) {
  const saveBtn = document.getElementById("saveBtn");
  if (!saveBtn || !currentUser) return;

  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/posts/${post.post_id}/is-saved`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (data.saved) {
      saveBtn.classList.add("saved");
      saveBtn.querySelector("i").classList.remove("far");
      saveBtn.querySelector("i").classList.add("fas");
      saveBtn.querySelector("span").textContent = "Saved";
    }
  } catch (error) {
    console.error("Error checking save status:", error);
  }

  saveBtn.onclick = () => toggleSave(post.post_id);
}

async function toggleSave(postId) {
  if (!currentUser) {
    showToast("Please login to save posts", "error");
    return;
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      const saveBtn = document.getElementById("saveBtn");
      const icon = saveBtn.querySelector("i");
      const text = saveBtn.querySelector("span");

      if (data.saved) {
        saveBtn.classList.add("saved");
        icon.classList.remove("far");
        icon.classList.add("fas");
        text.textContent = "Saved";
        showToast("Post saved successfully!", "success");
      } else {
        saveBtn.classList.remove("saved");
        icon.classList.remove("fas");
        icon.classList.add("far");
        text.textContent = "Save";
        showToast("Post removed from saved", "success");

        window.parent.postMessage({ action: "postUnsaved" }, "*");
      }
    } else {
      showToast(data.message || "Failed to save post", "error");
    }
  } catch (error) {
    console.error("❌ Error toggling save:", error);
    showToast("Failed to save post", "error");
  }
}
function formatDescription(text) {
  if (!text) return "No description available";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}
console.log(
  "✅ Post detail page fully loaded — v2 (both label fix + from price + pickup badge)"
);
