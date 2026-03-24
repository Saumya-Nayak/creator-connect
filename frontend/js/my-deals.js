// ===== CONFIGURATION =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

console.log("🔗 API Base URL:", API_BASE_URL);

// ===== GLOBAL STATE =====
let currentUser = null;
let currentRole = "buyer";
let currentType = { buyer: "all", seller: "all" };
let currentStatus = { buyer: "all", seller: "all" };
let currentView = "list";
let allDeals = {
  buyer: { products: [], services: [] },
  seller: { products: [], services: [] },
};

const STATUS_CONFIG = {
  buyer: {
    all: [
      { key: "all", label: "All Deals", icon: "fa-th" },
      { key: "pending", label: "Pending", icon: "fa-clock" },
      { key: "confirmed", label: "Confirmed", icon: "fa-check" },
      { key: "accepted", label: "Accepted", icon: "fa-handshake" },
      { key: "processing", label: "Processing", icon: "fa-cog" },
      { key: "in_progress", label: "In Progress", icon: "fa-spinner" },
      { key: "shipped", label: "Shipped", icon: "fa-truck" },
      { key: "delivered", label: "Delivered", icon: "fa-check-circle" },
      { key: "completed", label: "Completed", icon: "fa-check-double" },
      { key: "cancelled", label: "Cancelled", icon: "fa-times-circle" },
      { key: "rejected", label: "Rejected", icon: "fa-ban" },
    ],
    products: [
      { key: "all", label: "All Orders", icon: "fa-th" },
      { key: "pending", label: "Pending", icon: "fa-clock" },
      { key: "confirmed", label: "Confirmed", icon: "fa-check" },
      { key: "processing", label: "Processing", icon: "fa-cog" },
      { key: "shipped", label: "Shipped", icon: "fa-truck" },
      { key: "delivered", label: "Delivered", icon: "fa-check-circle" },
      { key: "cancelled", label: "Cancelled", icon: "fa-times-circle" },
    ],
    services: [
      { key: "all", label: "All Bookings", icon: "fa-th" },
      { key: "pending", label: "Pending", icon: "fa-clock" },
      { key: "accepted", label: "Accepted", icon: "fa-handshake" },
      { key: "in_progress", label: "In Progress", icon: "fa-spinner" },
      { key: "completed", label: "Completed", icon: "fa-check-double" },
      { key: "cancelled", label: "Cancelled", icon: "fa-times-circle" },
      { key: "rejected", label: "Rejected", icon: "fa-ban" },
    ],
  },
  seller: {
    all: [
      { key: "all", label: "All Deals", icon: "fa-th" },
      { key: "pending", label: "Pending", icon: "fa-clock" },
      { key: "confirmed", label: "Confirmed", icon: "fa-check" },
      { key: "accepted", label: "Accepted", icon: "fa-handshake" },
      { key: "processing", label: "Processing", icon: "fa-cog" },
      { key: "in_progress", label: "In Progress", icon: "fa-spinner" },
      { key: "shipped", label: "Shipped", icon: "fa-truck" },
      { key: "delivered", label: "Delivered", icon: "fa-check-circle" },
      { key: "completed", label: "Completed", icon: "fa-check-double" },
      { key: "cancelled", label: "Cancelled", icon: "fa-times-circle" },
      { key: "rejected", label: "Rejected", icon: "fa-ban" },
    ],
    products: [
      { key: "all", label: "All Orders", icon: "fa-th" },
      { key: "pending", label: "Pending", icon: "fa-clock" },
      { key: "confirmed", label: "Confirmed", icon: "fa-check" },
      { key: "processing", label: "Processing", icon: "fa-cog" },
      { key: "shipped", label: "Shipped", icon: "fa-truck" },
      { key: "delivered", label: "Delivered", icon: "fa-check-circle" },
      { key: "cancelled", label: "Cancelled", icon: "fa-times-circle" },
    ],
    services: [
      { key: "all", label: "All Bookings", icon: "fa-th" },
      { key: "pending", label: "Pending", icon: "fa-clock" },
      { key: "accepted", label: "Accepted", icon: "fa-handshake" },
      { key: "in_progress", label: "In Progress", icon: "fa-spinner" },
      { key: "completed", label: "Completed", icon: "fa-check-double" },
      { key: "cancelled", label: "Cancelled", icon: "fa-times-circle" },
      { key: "rejected", label: "Rejected", icon: "fa-ban" },
    ],
  },
};

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 MyDeals page initializing...");

  if (!checkAuth()) {
    showToast("Please login to view your deals", "error");
    setTimeout(() => (window.location.href = "home.html"), 2000);
    return;
  }

  await loadComponents();
  applyTheme();
  initializeStatusFilters();
  await loadAllDeals();
  setupEventListeners();
  await loadAdminPaymentConfig();
  applyUrlFilters();

  console.log("✅ MyDeals page initialized");
});

async function generateUpiQr(upiId, amount) {
  const container = document.getElementById("upiQrCode");
  if (!container) return;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent(
    adminPaymentConfig.upi_name || "Admin"
  )}&am=${amount}&cu=INR`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
    upiUrl
  )}`;
  container.innerHTML = `<img src="${qrApiUrl}" alt="UPI QR Code" style="width:130px;height:130px;border-radius:8px;display:block;" onerror="this.parentElement.innerHTML='<span style=\\'font-size:0.72rem;color:#aaa;\\'>QR unavailable</span>'" />`;
}
window.generateUpiQr = generateUpiQr;

let adminPaymentConfig = {};
async function loadAdminPaymentConfig() {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(`${API_BASE_URL}/payments/admin-config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    if (d.success) {
      adminPaymentConfig = d.config;
      console.log("✅ Admin payment config loaded");
    }
  } catch (e) {
    console.warn("⚠️ Could not load admin payment config:", e);
  }
}

function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const type = params.get("type");
  const status = params.get("status");

  if (!role) return;

  if (role === "buyer" || role === "seller") {
    switchRole(role);
  }

  if (type && type !== "all") {
    filterByType(role, type);
  }

  if (status) {
    filterByStatus(role, status);
  }

  setTimeout(() => {
    const grid = document.getElementById(`${role || "buyer"}DealsGrid`);
    if (grid) {
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 300);
}

window.applyUrlFilters = applyUrlFilters;

// ===== LOAD COMPONENTS =====
async function loadComponents() {
  try {
    const headerResponse = await fetch("header.html");
    if (headerResponse.ok) {
      document.getElementById("headerContainer").innerHTML =
        await headerResponse.text();
      const headerScript = document.createElement("script");
      headerScript.src = "js/header.js";
      document.body.appendChild(headerScript);
    }

    const sidebarResponse = await fetch("sidebar.html");
    if (sidebarResponse.ok) {
      document.getElementById("sidebarContainer").innerHTML =
        await sidebarResponse.text();
      const sidebarScript = document.createElement("script");
      sidebarScript.src = "js/sidebar.js";
      sidebarScript.onload = () => {
        if (typeof window.updateSidebar === "function") {
          window.updateSidebar();
        }
      };
      document.body.appendChild(sidebarScript);
    }
  } catch (error) {
    console.error("❌ Error loading components:", error);
  }
}

// ===== AUTHENTICATION =====
function checkAuth() {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const userData =
    localStorage.getItem("userData") || sessionStorage.getItem("userData");

  if (token && userData) {
    try {
      currentUser = JSON.parse(userData);
      console.log("✅ User authenticated:", currentUser.username);
      return true;
    } catch (e) {
      console.error("❌ Error parsing user data:", e);
      return false;
    }
  }
  return false;
}

// ===== THEME =====
function applyTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
}

window.addEventListener("storage", (e) => {
  if (e.key === "theme") applyTheme();
});

// ===== STATUS FILTERS =====
function initializeStatusFilters() {
  ["buyer", "seller"].forEach((role) => {
    ["all", "products", "services"].forEach((type) => {
      const filterId = `${role}StatusFilter`;
      const filterEl = document.getElementById(filterId);
      if (!filterEl) return;

      const statuses = STATUS_CONFIG[role][type];
      filterEl.innerHTML = statuses
        .map(
          (status) => `
          <div class="status-item ${status.key === "all" ? "active" : ""}" 
               data-status="${status.key}"
               onclick="filterByStatus('${role}', '${status.key}')">
              <div class="status-item-left">
                  <i class="fas ${status.icon}"></i>
                  <span>${status.label}</span>
              </div>
              <span class="status-count" id="${role}-${type}-${
            status.key
          }-count">0</span>
          </div>
        `
        )
        .join("");
    });
  });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.addEventListener("click", (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const action = button.getAttribute("data-action");
    handleAction(action, button);
  });

  window.addEventListener("message", handleIframeMessage);
}

// ===== VIEW TOGGLE =====
function toggleView(view) {
  currentView = view;

  document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  document.querySelectorAll(".deals-grid").forEach((grid) => {
    grid.classList.remove("view-list", "view-grid");
    grid.classList.add(`view-${view}`);
  });
}

// ===== ACTION HANDLER =====
function handleAction(action, button) {
  const orderId = button.getAttribute("data-order-id");
  const bookingId = button.getAttribute("data-booking-id");
  const postId = button.getAttribute("data-post-id");
  const dealType = button.getAttribute("data-type");
  const amount = button.getAttribute("data-amount");

  switch (action) {
    case "view-deal-details":
      if (postId) openPostDetailModal(postId);
      break;
    case "cancel-order":
      showCancelOrderModal(orderId);
      break;
    case "make-payment":
      showPaymentModal(orderId, amount);
      break;
    case "view-order-details":
      showOrderDetailsModal(orderId);
      break;
    case "change-order-details":
      showChangeOrderDetailsModal(orderId);
      break;
    case "cancel-booking":
      showCancelBookingModal(bookingId);
      break;
    case "view-booking-details":
      showBookingDetailsModal(bookingId);
      break;
    case "reject-order":
      showRejectOrderModal(orderId);
      break;
    case "confirm-order":
      confirmOrder(orderId);
      break;
    case "update-order-status":
      showUpdateOrderStatusModal(orderId);
      break;
    case "accept-booking":
      acceptBooking(bookingId);
      break;
    case "reject-booking":
      showRejectBookingModal(bookingId);
      break;
    case "update-booking-status":
      showUpdateBookingStatusModal(bookingId);
      break;
    case "close-modal":
      closeModal();
      break;
    case "execute-cancel-order":
      executeCancelOrder(button.getAttribute("data-id"));
      break;
    case "execute-payment":
      executePayment(button.getAttribute("data-id"));
      break;
    case "execute-reject-order":
      executeRejectOrder(button.getAttribute("data-id"));
      break;
    case "execute-update-status":
      executeUpdateStatus(
        button.getAttribute("data-id"),
        button.getAttribute("data-entity-type")
      );
      break;
    case "execute-cancel-booking":
      executeCancelBooking(button.getAttribute("data-id"));
      break;
    case "execute-reject-booking":
      executeRejectBooking(button.getAttribute("data-id"));
      break;
    case "execute-change-details":
      executeChangeOrderDetails(button.getAttribute("data-id"));
      break;
    default:
      console.warn("⚠️ Unknown action:", action);
  }
}

// ===== ROLE SWITCHING =====
function switchRole(role) {
  currentRole = role;

  document.querySelectorAll(".role-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.role === role);
  });

  document.getElementById("buyerTypeButtons").style.display =
    role === "buyer" ? "flex" : "none";
  document.getElementById("sellerTypeButtons").style.display =
    role === "seller" ? "flex" : "none";
  document.getElementById("buyerStatusFilter").style.display =
    role === "buyer" ? "flex" : "none";
  document.getElementById("sellerStatusFilter").style.display =
    role === "seller" ? "flex" : "none";

  document.querySelectorAll(".deals-section").forEach((section) => {
    section.classList.remove("active");
  });
  document.getElementById(`${role}Section`).classList.add("active");

  updateStatusFilter();
  renderDeals();
}

// ===== TYPE FILTERING =====
function filterByType(role, type) {
  currentType[role] = type;
  currentStatus[role] = "all";

  const container =
    role === "buyer"
      ? document.getElementById("buyerTypeButtons")
      : document.getElementById("sellerTypeButtons");

  container.querySelectorAll(".type-filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  updateStatusFilter();
  renderDeals();
}

// ===== STATUS FILTERING =====
function filterByStatus(role, status) {
  currentStatus[role] = status;

  const container = document.getElementById(`${role}StatusFilter`);
  container.querySelectorAll(".status-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.status === status);
  });

  renderDeals();
}

// ===== UPDATE STATUS FILTER =====
function updateStatusFilter() {
  const role = currentRole;
  const type = currentType[role];
  const statuses = STATUS_CONFIG[role][type];

  const filterEl = document.getElementById(`${role}StatusFilter`);
  if (!filterEl) return;

  filterEl.innerHTML = statuses
    .map((status) => {
      const count = getStatusCount(role, type, status.key);
      return `
        <div class="status-item ${
          status.key === currentStatus[role] ? "active" : ""
        }" 
             data-status="${status.key}"
             onclick="filterByStatus('${role}', '${status.key}')">
            <div class="status-item-left">
                <i class="fas ${status.icon}"></i>
                <span>${status.label}</span>
            </div>
            <span class="status-count">${count}</span>
        </div>
      `;
    })
    .join("");
}

// ===== GET STATUS COUNT =====
function getStatusCount(role, type, status) {
  if (type === "all") {
    const products = allDeals[role].products;
    const services = allDeals[role].services;
    const allItems = [...products, ...services];
    if (status === "all") return allItems.length;
    return allItems.filter((d) => d.status === status).length;
  }

  const deals = allDeals[role][type];
  if (status === "all") return deals.length;
  return deals.filter((d) => d.status === status).length;
}

// ===== LOAD ALL DEALS =====
async function loadAllDeals() {
  console.log("📥 Loading all deals...");

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const [buyerProducts, buyerServices] = await Promise.all([
      fetchData("/deals/buyer/products", token),
      fetchData("/deals/buyer/services", token),
    ]);

    const [sellerProducts, sellerServices] = await Promise.all([
      fetchData("/deals/seller/products", token),
      fetchData("/deals/seller/services", token),
    ]);

    allDeals.buyer.products = buyerProducts.orders || [];
    allDeals.buyer.services = buyerServices.bookings || [];
    allDeals.seller.products = sellerProducts.orders || [];
    allDeals.seller.services = sellerServices.bookings || [];

    updateBadges();
    updateQuickStats();
    updateStatusFilter();
    renderDeals();
  } catch (error) {
    console.error("❌ Error loading deals:", error);
    showToast("Failed to load deals. Please refresh the page.", "error");
  }
}

// ===== FETCH DATA HELPER =====
async function fetchData(endpoint, token) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("API request failed");
  return await response.json();
}

// ===== UPDATE BADGES =====
function updateBadges() {
  const buyerTotal =
    allDeals.buyer.products.length + allDeals.buyer.services.length;
  const sellerTotal =
    allDeals.seller.products.length + allDeals.seller.services.length;

  document.getElementById("buyerBadge").textContent = buyerTotal;
  document.getElementById("sellerBadge").textContent = sellerTotal;
  document.getElementById("buyerProductCount").textContent =
    allDeals.buyer.products.length;
  document.getElementById("buyerServiceCount").textContent =
    allDeals.buyer.services.length;
  document.getElementById("buyerAllCount").textContent = buyerTotal;
  document.getElementById("sellerProductCount").textContent =
    allDeals.seller.products.length;
  document.getElementById("sellerServiceCount").textContent =
    allDeals.seller.services.length;
  document.getElementById("sellerAllCount").textContent = sellerTotal;
}

// ===== UPDATE QUICK STATS =====
function updateQuickStats() {
  const totalOrders =
    allDeals.buyer.products.length +
    allDeals.buyer.services.length +
    allDeals.seller.products.length +
    allDeals.seller.services.length;

  const activeOrders = [
    ...allDeals.buyer.products,
    ...allDeals.buyer.services,
    ...allDeals.seller.products,
    ...allDeals.seller.services,
  ].filter(
    (d) =>
      !["delivered", "completed", "cancelled", "rejected"].includes(d.status)
  ).length;

  const completedOrders = [
    ...allDeals.buyer.products,
    ...allDeals.buyer.services,
    ...allDeals.seller.products,
    ...allDeals.seller.services,
  ].filter((d) => ["delivered", "completed"].includes(d.status)).length;

  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("activeOrders").textContent = activeOrders;
  document.getElementById("completedOrders").textContent = completedOrders;
}

// ===== RENDER DEALS =====
function renderDeals() {
  const role = currentRole;
  const type = currentType[role];
  const status = currentStatus[role];

  const gridId = `${role}DealsGrid`;
  const emptyStateId = `${role}EmptyState`;
  const dealsGrid = document.getElementById(gridId);
  const emptyState = document.getElementById(emptyStateId);

  let deals;

  if (type === "all") {
    deals = [...allDeals[role].products, ...allDeals[role].services];
  } else {
    deals = allDeals[role][type];
  }

  if (status !== "all") {
    deals = deals.filter((d) => d.status === status);
  }

  deals.sort((a, b) => {
    const dateA = new Date(a.order_date || a.booking_date || 0);
    const dateB = new Date(b.order_date || b.booking_date || 0);
    return dateB - dateA;
  });

  dealsGrid.innerHTML = "";

  if (deals.length === 0) {
    emptyState.style.display = "block";
    dealsGrid.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  dealsGrid.style.display = currentView === "grid" ? "grid" : "flex";

  dealsGrid.classList.remove("view-list", "view-grid");
  dealsGrid.classList.add(`view-${currentView}`);

  deals.forEach((deal) => {
    const isProduct = deal.hasOwnProperty("order_id");
    const card = isProduct
      ? createProductCard(deal, role)
      : createServiceCard(deal, role);
    dealsGrid.appendChild(card);
  });
}

// ===== SHARED UTILITIES =====

function _fmt12hr(t) {
  if (!t) return null;
  const str = String(t);
  const parts = str.split(":");
  if (parts.length < 2) return str;
  let hh = parseInt(parts[0]);
  const mm = parts[1].padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${hh}:${mm} ${ampm}`;
}

function _isServiceExpired(booking) {
  if (["completed", "cancelled", "rejected"].includes(booking.status))
    return false;
  if (!booking.preferred_start_date) return false;

  const slotLabel =
    booking.booked_slot ||
    (booking.preferred_time
      ? String(booking.preferred_time).substring(0, 5)
      : null);

  let expiryMs;
  if (slotLabel && slotLabel.includes(":")) {
    const [hh, mm] = slotLabel.split(":").map(Number);
    const d = new Date(booking.preferred_start_date + "T00:00:00");
    d.setHours(hh, mm, 0, 0);
    expiryMs = d.getTime();
  } else {
    const d = new Date(booking.preferred_start_date + "T23:59:59");
    expiryMs = d.getTime();
  }
  return Date.now() > expiryMs;
}

function _isProductOverdue(order) {
  if (["delivered", "cancelled", "rejected"].includes(order.status))
    return false;
  if (!order.estimated_delivery_date && !order.order_date) return false;

  let deadline;
  if (order.estimated_delivery_date) {
    deadline = new Date(order.estimated_delivery_date + "T23:59:59");
  } else {
    deadline = new Date(order.order_date);
    deadline.setDate(deadline.getDate() + 7);
  }
  return Date.now() > deadline.getTime();
}

// ===== CREATE PRODUCT CARD =====
// Includes: COD badge, overdue badge, is_pickup fulfillment badge
function createProductCard(order, role) {
  const card = document.createElement("div");
  card.className = "deal-card";

  card.addEventListener("click", (e) => {
    if (e.target.closest(".deal-actions")) return;
    if (order.post_id) openPostDetailModal(order.post_id);
  });

  const isBuyer = role === "buyer";
  const counterparty = isBuyer
    ? order.seller_name || order.seller_username || "Unknown Seller"
    : order.buyer_name || order.buyer_username || "Unknown Buyer";

  const imageUrl = getImageUrl(order.media_url);
  const isProductVideo =
    order.media_type === "video" ||
    /\.(mp4|webm|mov)$/i.test(order.media_url || "");

  const isCod = order.payment_method === "cod";
  const codBadge = isCod
    ? `<span class="cod-available-badge"><i class="fas fa-money-bill-wave"></i> Cash on Delivery</span>`
    : "";

  const paymentBadge = getPaymentBadgeHtml(order);

  const rejectionInfo =
    order.status === "cancelled" && order.cancellation_reason
      ? `<div class="rejection-reason"><i class="fas fa-info-circle"></i> <strong>Reason:</strong> ${escapeHtml(
          order.cancellation_reason
        )}</div>`
      : "";

  // Overdue badge
  const overdue = _isProductOverdue(order);
  const overdueBadge = overdue
    ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(239,68,68,.1);color:#dc2626;border:1px solid rgba(239,68,68,.35);border-radius:20px;padding:3px 10px;font-size:.75rem;font-weight:700;margin-top:4px">
         <i class="fas fa-exclamation-circle"></i> Delivery Overdue
       </span>`
    : "";

  // Pickup fulfillment badge
  const isPickup = Boolean(order.is_pickup);
  const fulfillmentBadge = isPickup
    ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(139,92,246,0.1);color:#7c3aed;font-size:.73rem;font-weight:600;padding:3px 8px;border-radius:20px;border:1px solid rgba(139,92,246,0.2);margin-top:4px">
         <i class="fas fa-store" style="font-size:.65rem"></i> Pickup Order
       </span>`
    : "";

  // For pickup orders, relabel status display
  const statusLabel = _getOrderStatusLabel(order.status, isPickup);

  card.innerHTML = `
    <div class="deal-card-image">
      ${
        imageUrl
          ? isProductVideo
            ? `<div style="position:relative;width:100%;height:100%;">
              <video class="deals-autoplay-video" muted loop playsinline preload="metadata"
                style="width:100%;height:100%;object-fit:cover;display:block;">
                <source src="${imageUrl}" type="video/mp4">
              </video>
              <button onclick="event.stopPropagation();toggleDealsVideoMute(event,this)"
                style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);color:white;border:none;border-radius:50%;width:28px;height:28px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;">
                <i class="fas fa-volume-mute"></i>
              </button>
            </div>`
            : `<img src="${imageUrl}" alt="${escapeHtml(
                order.product_name || order.product_title
              )}"
               onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-box\\'></i></div>';">`
          : '<div class="no-image"><i class="fas fa-box"></i></div>'
      }
      <span class="deal-type-badge product grid-image-badge">
        <i class="fas fa-box"></i> Product
      </span>
      ${
        isCod
          ? `<span class="cod-grid-badge"><i class="fas fa-money-bill-wave"></i> COD</span>`
          : ""
      }
    </div>
    <div class="deal-card-body">
      <div class="deal-card-header">
        <div class="deal-info">
          <span class="deal-type-badge product list-body-badge">
            <i class="fas fa-box"></i> Product
          </span>
          ${codBadge}
          <div class="deal-id">Order #${order.order_id}</div>
          <h3 class="deal-title">${escapeHtml(
            order.product_name || order.product_title
          )}</h3>
          <div class="deal-meta">
            <span class="deal-meta-item"><i class="fas fa-user"></i> ${escapeHtml(
              counterparty
            )}</span>
            <span class="deal-meta-item"><i class="fas fa-calendar"></i> ${formatDate(
              order.order_date
            )}</span>
            <span class="deal-meta-item"><i class="fas fa-shopping-cart"></i> Qty: ${
              order.quantity
            }</span>
          </div>
          ${fulfillmentBadge}
          ${overdueBadge}
          ${rejectionInfo}
        </div>
        <div class="deal-status-container">
          <span class="status-badge ${order.status}">
            ${getStatusIcon(order.status)} ${statusLabel}
          </span>
          <div class="deal-amount">₹${formatMoney(order.total_amount)}</div>
          <div class="payment-status">${paymentBadge}</div>
        </div>
      </div>
      ${createProductActions(order, role)}
    </div>
  `;

  return card;
}

// ===== CREATE SERVICE CARD =====
// Includes: slot display, expiry badge
function createServiceCard(booking, role) {
  const card = document.createElement("div");
  card.className = "deal-card";

  card.addEventListener("click", (e) => {
    if (e.target.closest(".deal-actions")) return;
    if (booking.post_id) openPostDetailModal(booking.post_id);
  });

  const isProvider = role === "seller";
  const counterparty = isProvider
    ? booking.customer_name || booking.customer_username || "Unknown Customer"
    : booking.provider_name || booking.provider_username || "Unknown Provider";

  const serviceTitle =
    booking.service_title || booking.title || "Service Booking";
  const imageUrl = getImageUrl(booking.media_url);
  const isServiceVideo =
    booking.media_type === "video" ||
    /\.(mp4|webm|mov)$/i.test(booking.media_url || "");

  const providerMessageInfo = booking.provider_message
    ? `<div class="provider-message"><i class="fas fa-comment"></i> <strong>Message:</strong> ${escapeHtml(
        booking.provider_message
      )}</div>`
    : "";

  const cancellationInfo =
    booking.status === "cancelled" && booking.cancellation_reason
      ? `<div class="rejection-reason"><i class="fas fa-info-circle"></i> <strong>Cancellation Reason:</strong> ${escapeHtml(
          booking.cancellation_reason
        )}</div>`
      : "";

  // Expiry badge
  const expired = _isServiceExpired(booking);
  const expiryBadge = expired
    ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(245,158,11,.12);color:#b45309;border:1px solid rgba(245,158,11,.4);border-radius:20px;padding:3px 10px;font-size:.75rem;font-weight:700;margin-top:4px">
         <i class="fas fa-hourglass-end"></i> Service Time Passed
       </span>`
    : "";

  // Slot display in meta
  const slotLabel =
    booking.booked_slot ||
    (booking.preferred_time
      ? String(booking.preferred_time).substring(0, 5)
      : null);
  const slotDisplay = slotLabel ? _fmt12hr(slotLabel) : null;
  const slotMeta = slotDisplay
    ? `<span class="deal-meta-item"><i class="fas fa-clock"></i> ${slotDisplay}</span>`
    : "";

  card.innerHTML = `
    <div class="deal-card-image">
      ${
        imageUrl
          ? isServiceVideo
            ? `<div style="position:relative;width:100%;height:100%;">
              <video class="deals-autoplay-video" muted loop playsinline preload="metadata"
                style="width:100%;height:100%;object-fit:cover;display:block;">
                <source src="${imageUrl}" type="video/mp4">
              </video>
              <button onclick="event.stopPropagation();toggleDealsVideoMute(event,this)"
                style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);color:white;border:none;border-radius:50%;width:28px;height:28px;font-size:0.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;">
                <i class="fas fa-volume-mute"></i>
              </button>
            </div>`
            : `<img src="${imageUrl}" alt="${escapeHtml(serviceTitle)}"
               onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-briefcase\\'></i></div>';">`
          : '<div class="no-image"><i class="fas fa-briefcase"></i></div>'
      }
      <span class="deal-type-badge service grid-image-badge">
        <i class="fas fa-briefcase"></i> Service
      </span>
    </div>
    <div class="deal-card-body">
      <div class="deal-card-header">
        <div class="deal-info">
          <span class="deal-type-badge service list-body-badge">
            <i class="fas fa-briefcase"></i> Service
          </span>
          <div class="deal-id">Booking #${booking.booking_id}</div>
          <h3 class="deal-title">${escapeHtml(serviceTitle)}</h3>
          <div class="deal-meta">
            <span class="deal-meta-item"><i class="fas fa-user"></i> ${escapeHtml(
              counterparty
            )}</span>
            <span class="deal-meta-item"><i class="fas fa-calendar"></i> ${formatDate(
              booking.booking_date
            )}</span>
            ${
              booking.preferred_start_date
                ? `<span class="deal-meta-item"><i class="fas fa-calendar-check"></i> ${formatDate(
                    booking.preferred_start_date
                  )}</span>`
                : ""
            }
            ${slotMeta}
          </div>
          ${expiryBadge}
          ${providerMessageInfo}
          ${cancellationInfo}
        </div>
        <div class="deal-status-container">
          <span class="status-badge ${booking.status}">
            ${getStatusIcon(booking.status)} ${formatStatus(booking.status)}
          </span>
          <div class="deal-amount">₹${formatMoney(booking.total_amount)}</div>
        </div>
      </div>
      ${createServiceActions(booking, role)}
    </div>
  `;

  return card;
}

// ===== GET ORDER STATUS LABEL (pickup-aware) =====
function _getOrderStatusLabel(status, isPickup) {
  if (!isPickup) return formatStatus(status);

  const pickupLabels = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Ready for Pickup",
    shipped: "Ready for Pickup",
    delivered: "Picked Up",
    cancelled: "Cancelled",
    rejected: "Rejected",
  };
  return pickupLabels[status] || formatStatus(status);
}

// ===== CREATE PRODUCT ACTIONS =====
function createProductActions(order, role) {
  const actions = [];

  if (role === "buyer") {
    if (["pending", "confirmed"].includes(order.status)) {
      actions.push(`
        <button class="btn btn-danger" data-action="cancel-order" data-order-id="${order.order_id}"
          onclick="setButtonLoading(this, 'Opening...')">
            <i class="fas fa-times"></i> Cancel Order
        </button>
      `);
    }

    const canPay =
      !["pending", "cancelled", "delivered"].includes(order.status) &&
      !["completed", "verification_pending", "cod_pending"].includes(
        order.payment_status
      );
    if (canPay) {
      actions.push(`
        <button class="btn btn-warning" data-action="make-payment" data-order-id="${
          order.order_id
        }" data-amount="${order.total_amount}" data-accepts-cod="${
        order.accepts_cod || 0
      }">
            <i class="fas fa-credit-card"></i> Make Payment
        </button>
      `);
    }

    actions.push(`
      <button class="btn btn-secondary" data-action="view-order-details" data-order-id="${order.order_id}">
          <i class="fas fa-eye"></i> View Details
      </button>
    `);

    if (
      !["shipped", "out_for_delivery", "delivered", "cancelled"].includes(
        order.status
      )
    ) {
      actions.push(`
        <button class="btn btn-secondary" data-action="change-order-details" data-order-id="${order.order_id}">
            <i class="fas fa-edit"></i> Change Details
        </button>
      `);
    }
  } else {
    if (order.status === "pending") {
      actions.push(`
        <button class="btn btn-success" data-action="confirm-order" data-order-id="${order.order_id}"
          onclick="setButtonLoading(this, 'Confirming...')">
            <i class="fas fa-check"></i> Confirm Order
        </button>
        <button class="btn btn-danger" data-action="reject-order" data-order-id="${order.order_id}"
          onclick="setButtonLoading(this, 'Opening...')">
            <i class="fas fa-times"></i> Reject Order
        </button>
      `);
    }

    if (["confirmed", "processing", "shipped"].includes(order.status)) {
      actions.push(`
        <button class="btn btn-primary" data-action="update-order-status" data-order-id="${order.order_id}">
            <i class="fas fa-sync"></i> Update Status
        </button>
      `);
    }

    if (order.payment_status === "completed") {
      actions.push(`
        <button class="btn btn-success" onclick="window.location.href='settings.html?tab=seller'">
            <i class="fas fa-money-bill-transfer"></i> Withdraw
        </button>
      `);
    }

    actions.push(`
      <button class="btn btn-secondary" data-action="view-order-details" data-order-id="${order.order_id}">
          <i class="fas fa-eye"></i> View Details
      </button>
    `);
  }

  return actions.length > 0
    ? `<div class="deal-actions">${actions.join("")}</div>`
    : "";
}

// ===== CREATE SERVICE ACTIONS =====
function createServiceActions(booking, role) {
  const actions = [];

  if (role === "buyer") {
    if (["pending", "accepted"].includes(booking.status)) {
      actions.push(`
        <button class="btn btn-danger" 
          data-action="cancel-booking" 
          data-booking-id="${booking.booking_id}"
          onclick="setButtonLoading(this, 'Cancelling...')"
        >
          <i class="fas fa-times"></i> Cancel Booking
        </button>
      `);
    }

    if (booking.status === "accepted" || booking.status === "in_progress") {
      const contactHref = buildContactHref(
        booking.contact_method,
        booking.provider_contact || booking.provider_email || "",
        booking.service_title || booking.title || "Service"
      );
      if (contactHref) {
        actions.push(`
          <a class="btn btn-success" href="${contactHref}" target="_blank" rel="noopener noreferrer">
            <i class="${getContactIcon(booking.contact_method)}"></i>
            Contact Provider
          </a>
        `);
      }
    }

    actions.push(`
      <button class="btn btn-secondary" data-action="view-booking-details" data-booking-id="${booking.booking_id}">
        <i class="fas fa-eye"></i> View Details
      </button>
    `);
  } else {
    if (booking.status === "pending") {
      actions.push(`
        <button class="btn btn-success" 
          data-action="accept-booking" 
          data-booking-id="${booking.booking_id}"
          onclick="setButtonLoading(this, 'Accepting...')"
        >
          <i class="fas fa-check"></i> Accept Booking
        </button>
        <button class="btn btn-danger" 
          data-action="reject-booking" 
          data-booking-id="${booking.booking_id}"
          onclick="setButtonLoading(this, 'Opening...')"
        >
          <i class="fas fa-times"></i> Reject Booking
        </button>
      `);
    }

    if (["accepted", "in_progress"].includes(booking.status)) {
      actions.push(`
        <button class="btn btn-primary" 
          data-action="update-booking-status" 
          data-booking-id="${booking.booking_id}"
          onclick="setButtonLoading(this, 'Loading...')"
        >
          <i class="fas fa-sync"></i> Update Status
        </button>
      `);

      const contactHref = buildContactHref(
        booking.contact_method,
        booking.customer_contact || booking.customer_email || "",
        booking.service_title || booking.title || "Service"
      );
      if (contactHref) {
        actions.push(`
          <a class="btn btn-success" href="${contactHref}" target="_blank" rel="noopener noreferrer">
            <i class="${getContactIcon(booking.contact_method)}"></i>
            Contact Customer
            <span style="font-size:0.75rem; opacity:0.85; display:block; margin-top:2px;">
              via ${formatContactMethod(booking.contact_method)}
            </span>
          </a>
        `);
      }
    }

    actions.push(`
      <button class="btn btn-secondary" data-action="view-booking-details" data-booking-id="${booking.booking_id}">
        <i class="fas fa-eye"></i> View Details
      </button>
    `);
  }

  return actions.length > 0
    ? `<div class="deal-actions">${actions.join("")}</div>`
    : "";
}

function buildContactHref(method, contact, title) {
  if (!contact) return null;
  const clean = contact.toString().trim();
  if (!clean) return null;

  switch ((method || "email").toLowerCase()) {
    case "whatsapp": {
      const phone = clean.replace(/[^\d+]/g, "");
      const msg = encodeURIComponent(
        `Hi! I'm reaching out about the service: "${title}"`
      );
      return `https://wa.me/${phone}?text=${msg}`;
    }
    case "phone":
      return `tel:${clean}`;
    case "email":
    default:
      return `mailto:${clean}?subject=${encodeURIComponent(
        "Regarding: " + title
      )}`;
  }
}

function getContactIcon(method) {
  const icons = {
    whatsapp: "fab fa-whatsapp",
    phone: "fas fa-phone",
    email: "fas fa-envelope",
  };
  return icons[(method || "email").toLowerCase()] || "fas fa-envelope";
}

function formatContactMethod(method) {
  const labels = { whatsapp: "WhatsApp", phone: "Phone", email: "Email" };
  return labels[(method || "email").toLowerCase()] || "Email";
}

// ===== OPEN POST DETAIL MODAL =====
function openPostDetailModal(postId) {
  const modal = document.getElementById("postDetailModal");
  const iframe = document.getElementById("postDetailIframe");

  iframe.src = `post-detail.html?id=${postId}`;
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

// ===== CLOSE POST DETAIL MODAL =====
function closePostDetailModal() {
  const modal = document.getElementById("postDetailModal");
  const iframe = document.getElementById("postDetailIframe");

  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "auto";

  setTimeout(() => {
    iframe.src = "";
  }, 300);
}

// ===== HANDLE IFRAME MESSAGES =====
function handleIframeMessage(event) {
  const { action, postId, message, type } = event.data;

  switch (action) {
    case "closeModal":
      closePostDetailModal();
      break;
    case "showToast":
      showToast(message, type);
      break;
    case "refreshDeals":
      loadAllDeals();
      break;
    default:
      break;
  }
}

// ===== MODAL FUNCTIONS =====
function showModal(title, bodyHTML, footerHTML) {
  const modal = document.getElementById("actionModal");
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = bodyHTML;
  document.getElementById("modalFooter").innerHTML = footerHTML;
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("actionModal");
  modal.classList.remove("show");
  document.body.style.overflow = "auto";
}

// ===== PAYMENT MODAL =====
function showPaymentModal(orderId, amount) {
  const order = [...allDeals.buyer.products].find((o) => o.order_id == orderId);
  const acceptsCod = order && order.accepts_cod;

  const upiId = adminPaymentConfig.upi_id || "—";
  const upiName = adminPaymentConfig.upi_name || "—";
  const upiDesc =
    adminPaymentConfig.upi_description ||
    "Send to the UPI ID above and click I Have Paid.";
  const bankName = adminPaymentConfig.bank_name || "—";
  const bankHolder = adminPaymentConfig.bank_holder || "—";
  const bankAccount = adminPaymentConfig.bank_account || "—";
  const bankIfsc = adminPaymentConfig.bank_ifsc || "—";
  const bankBranch = adminPaymentConfig.bank_branch || "—";
  const bankDesc =
    adminPaymentConfig.bank_description ||
    "Transfer via NEFT/IMPS and click I Have Paid.";
  const onlinePct = adminPaymentConfig.platform_fee_online_pct || "5";
  const codPct = adminPaymentConfig.platform_fee_cod_pct || "2";

  const codOption = acceptsCod
    ? `<option value="cod">💵 Cash on Delivery (COD)</option>`
    : "";

  const bodyHTML = `
    <div style="padding: 4px 0 20px;">
      <div style="background: var(--light-purple); padding: 18px; border-radius: 14px; text-align:center; margin-bottom: 20px;">
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">Amount to Pay</div>
        <div style="font-size: 2.2rem; font-weight: 800; color: var(--primary-purple);">₹${formatMoney(
          amount
        )}</div>
      </div>

      <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 10px;">
        <span style="background: var(--primary-purple); color:#fff; border-radius:50%; width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;margin-right:8px;">1</span>
        Choose Payment Method
      </div>
      <select id="paymentMethod" onchange="handlePaymentMethodChange(this.value)"
        style="width:100%; padding:12px 14px; border-radius:10px; border:2px solid var(--border-purple); font-size:0.95rem; margin-bottom:20px; background: var(--bg, #fff); color: inherit;">
        <option value="upi">📱 UPI (Recommended)</option>
        <option value="bank_transfer">🏦 Bank Transfer / NEFT</option>
        ${codOption}
      </select>

      <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 10px;" id="step2Label">
        <span style="background: var(--primary-purple); color:#fff; border-radius:50%; width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;margin-right:8px;">2</span>
        Send Payment to Admin
      </div>

      <div id="paymentDetails-upi"
        style="background:rgba(99,102,241,0.07); border:1.5px solid rgba(99,102,241,0.2); border-radius:12px; padding:16px; margin-bottom:16px;">
        <div style="display:flex; align-items:flex-start; gap:16px; flex-wrap:wrap;">
          <div style="flex-shrink:0; text-align:center;">
            <div id="upiQrCode" style="width:130px;height:130px;background:#f3f4f6;border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-circle-notch fa-spin" style="color:#ccc;font-size:2rem;"></i>
            </div>
            <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:4px;">Scan & Pay</div>
          </div>
          <div style="flex:1;min-width:160px;">
            <div style="font-size:0.8rem;color:var(--text-secondary);">UPI ID</div>
            <div style="font-size:1.1rem;font-weight:800;letter-spacing:0.5px;margin-bottom:4px;">${escapeHtml(
              upiId
            )}</div>
            <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">${escapeHtml(
              upiName
            )}</div>
            <button onclick="navigator.clipboard.writeText('${escapeHtml(
              upiId
            )}').then(()=>showToast('UPI ID copied!','success'))"
              style="padding:6px 14px;border-radius:8px;border:1.5px solid var(--border-purple);background:transparent;color:var(--primary-purple);font-weight:600;cursor:pointer;font-size:0.8rem;">
              <i class="fas fa-copy"></i> Copy
            </button>
          </div>
        </div>
        <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:12px;">${escapeHtml(
          upiDesc
        )}</div>
      </div>

      <div id="paymentDetails-bank_transfer"
        style="display:none; background:rgba(34,197,94,0.07); border:1.5px solid rgba(34,197,94,0.2); border-radius:12px; padding:16px; margin-bottom:16px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div><div style="font-size:0.75rem; color:var(--text-secondary);">Bank Name</div><div style="font-weight:700;">${escapeHtml(
            bankName
          )}</div></div>
          <div><div style="font-size:0.75rem; color:var(--text-secondary);">Account Holder</div><div style="font-weight:700;">${escapeHtml(
            bankHolder
          )}</div></div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">Account Number</div>
            <div style="font-weight:700; display:flex; align-items:center; gap:8px;">
              ${escapeHtml(bankAccount)}
              <button onclick="navigator.clipboard.writeText('${escapeHtml(
                bankAccount
              )}').then(()=>showToast('Account number copied!','success'))"
                style="padding:3px 8px; border-radius:6px; border:1px solid #ccc; background:transparent; cursor:pointer; font-size:0.72rem;">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
          <div><div style="font-size:0.75rem; color:var(--text-secondary);">IFSC Code</div><div style="font-weight:700;">${escapeHtml(
            bankIfsc
          )}</div></div>
          <div style="grid-column:1/-1;"><div style="font-size:0.75rem; color:var(--text-secondary);">Branch</div><div style="font-weight:700;">${escapeHtml(
            bankBranch
          )}</div></div>
        </div>
        <div style="font-size:0.82rem; color:var(--text-secondary);">${escapeHtml(
          bankDesc
        )}</div>
      </div>

      <div id="paymentDetails-cod"
        style="display:none; background:rgba(245,158,11,0.08); border:1.5px solid rgba(245,158,11,0.3); border-radius:12px; padding:16px; margin-bottom:16px;">
        <div style="font-size:1.5rem; margin-bottom:8px;">💵</div>
        <div style="font-weight:700; margin-bottom:6px;">Cash on Delivery</div>
        <ul style="font-size:0.85rem; color:var(--text-secondary); padding-left:18px; line-height:1.8;">
          <li>No online payment required now</li>
          <li>Pay cash directly to the delivery person / seller</li>
          <li>A <strong>${codPct}% platform fee</strong> is deducted from the seller's earnings</li>
        </ul>
      </div>

      <div id="step3Wrap">
        <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 10px;">
          <span style="background: var(--primary-purple); color:#fff; border-radius:50%; width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;margin-right:8px;">3</span>
          Enter Transaction Reference <span style="font-weight:400; color:var(--text-secondary); font-size:0.82rem;">(optional)</span>
        </div>
        <input type="text" id="paymentReferenceBuyer"
          placeholder="UPI Reference / UTR / NEFT Ref No."
          style="width:100%; padding:12px 14px; border-radius:10px; border:2px solid var(--border-purple); font-size:0.9rem; margin-bottom:16px;">
      </div>

      <div style="background:rgba(99,102,241,0.06); border-left:3px solid var(--primary-purple); border-radius:0 10px 10px 0; padding:12px 14px; font-size:0.82rem; color:var(--text-secondary);">
        <i class="fas fa-info-circle" style="color:var(--primary-purple);margin-right:6px;"></i>
        After you click <strong>"I Have Paid"</strong>, our admin will verify your payment. Your order status will update to <strong>Payment Verified ✓</strong> once confirmed.
        <br><br>
        <i class="fas fa-shield-alt" style="color:#22c55e; margin-right:6px;"></i>
        Platform fee: <strong>${onlinePct}% on UPI/Bank</strong> · <strong>${codPct}% on COD</strong>
      </div>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-success" data-action="execute-payment" data-id="${orderId}" id="iHavePaidBtn">
        <i class="fas fa-check-circle"></i> I Have Paid
    </button>
  `;

  showModal("Complete Payment", bodyHTML, footerHTML);
  setTimeout(() => generateUpiQr(upiId, amount), 50);
}

function handlePaymentMethodChange(method) {
  ["upi", "bank_transfer", "cod"].forEach((m) => {
    const el = document.getElementById(`paymentDetails-${m}`);
    if (el) el.style.display = m === method ? "block" : "none";
  });

  const step3 = document.getElementById("step3Wrap");
  if (step3) step3.style.display = method === "cod" ? "none" : "block";

  const btn = document.getElementById("iHavePaidBtn");
  if (btn) {
    btn.innerHTML =
      method === "cod"
        ? '<i class="fas fa-truck"></i> Confirm COD Order'
        : '<i class="fas fa-check-circle"></i> I Have Paid';
  }
}

async function executePayment(orderId) {
  const method = document.getElementById("paymentMethod")?.value || "upi";
  const ref = (
    document.getElementById("paymentReferenceBuyer")?.value || ""
  ).trim();

  const btn = document.getElementById("iHavePaidBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(
      `${API_BASE_URL}/payments/orders/${orderId}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_method: method,
          payment_reference_buyer: ref,
        }),
      }
    );
    const data = await res.json();

    if (data.success) {
      const msg =
        method === "cod"
          ? "✅ COD order confirmed! Pay cash on delivery."
          : "✅ Payment submitted! Admin will verify within a few hours.";
      showToast(msg, "success");
      await loadAllDeals();
      closeModal();
    } else {
      showToast(data.message || "Submission failed", "error");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> I Have Paid';
      }
    }
  } catch (err) {
    console.error("❌ Payment submission error:", err);
    showToast("Network error. Please try again.", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> I Have Paid';
    }
  }
}

// ===== VIEW ORDER DETAILS MODAL =====
function showOrderDetailsModal(orderId) {
  const order = [...allDeals.buyer.products, ...allDeals.seller.products].find(
    (o) => o.order_id == orderId
  );

  if (!order) {
    showToast("Order not found", "error");
    return;
  }

  const imageUrl = getImageUrl(order.media_url);
  const isCod = order.payment_method === "cod";
  const isPickup = Boolean(order.is_pickup);
  const isProductVideo =
    order.media_type === "video" ||
    /\.(mp4|webm|mov)$/i.test(order.media_url || "");

  const paymentMethodDisplay = isCod
    ? "💵 Cash on Delivery"
    : order.payment_method
    ? formatStatus(order.payment_method)
    : "—";
  const paymentStatusDisplay =
    isCod && order.payment_status !== "completed"
      ? "🕐 Pay on Delivery"
      : formatPaymentStatus(order.payment_status, order.payment_method);

  const deliveryChargeSection =
    order.delivery_charge && parseFloat(order.delivery_charge) > 0
      ? `<div class="modal-detail-row"><strong>Delivery Charge:</strong> ₹${formatMoney(
          order.delivery_charge
        )}</div>`
      : "";

  const distanceSection = order.delivery_distance_km
    ? `<div class="modal-detail-row"><strong>Delivery Distance:</strong> ${parseFloat(
        order.delivery_distance_km
      ).toFixed(1)} km</div>`
    : "";

  // Pickup address section (instead of shipping address for pickup orders)
  let addressSection = "";
  if (isPickup && (order.pickup_address || order.pickup_city)) {
    const mapsQuery = [
      order.pickup_address,
      order.pickup_city,
      order.pickup_state,
      order.pickup_pincode,
    ]
      .filter(Boolean)
      .join(", ");
    const mapsUrl = mapsQuery
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          mapsQuery
        )}`
      : null;
    addressSection = `
    <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">🏪 Pickup Address</h4>
    <div class="modal-detail-row" style="line-height:1.8">
      ${
        order.pickup_address
          ? `<strong>${escapeHtml(order.pickup_address)}</strong><br>`
          : ""
      }
      ${[order.pickup_city, order.pickup_state].filter(Boolean).join(", ")}
      ${order.pickup_pincode ? ` — ${escapeHtml(order.pickup_pincode)}` : ""}
    </div>
    ${
      mapsUrl
        ? `<div class="modal-detail-row"><a href="${mapsUrl}" target="_blank" style="color:var(--primary-purple);font-weight:600;text-decoration:none"><i class="fas fa-map-marked-alt" style="margin-right:4px"></i>Open in Google Maps</a></div>`
        : ""
    }`;
  } else if (order.shipping_address_line1) {
    addressSection = `
    <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">📦 Shipping Address</h4>
    <div class="modal-detail-row" style="line-height:1.8">
      <strong>${escapeHtml(order.shipping_full_name || "")}</strong><br>
      ${escapeHtml(order.shipping_address_line1 || "")}
      ${
        order.shipping_address_line2
          ? `<br>${escapeHtml(order.shipping_address_line2)}`
          : ""
      }
      <br>${escapeHtml(order.shipping_city || "")}, ${escapeHtml(
      order.shipping_state || ""
    )} — ${escapeHtml(order.shipping_pincode || "")}
      ${
        order.shipping_landmark
          ? `<br><span style="color:var(--text-secondary);font-size:.85rem">Landmark: ${escapeHtml(
              order.shipping_landmark
            )}</span>`
          : ""
      }
      ${
        order.shipping_phone ? `<br>📱 ${escapeHtml(order.shipping_phone)}` : ""
      }
    </div>`;
  }

  const trackingSection =
    order.tracking_number && !isPickup
      ? `<h4 style="color:var(--primary-purple);margin:20px 0 12px 0">🚚 Tracking</h4>
       <div class="modal-detail-row"><strong>Tracking Number:</strong>
         <span style="font-family:monospace;background:var(--bg-secondary);padding:3px 8px;border-radius:6px;font-size:.9rem">${escapeHtml(
           order.tracking_number
         )}</span>
       </div>`
      : "";

  const overdueBanner = _isProductOverdue(order)
    ? `<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:.85rem;font-weight:600;color:#dc2626;display:flex;align-items:center;gap:8px">
         <i class="fas fa-exclamation-circle" style="font-size:1.1rem"></i>
         ${
           isPickup
             ? "Please follow up with the seller to arrange pickup."
             : "Estimated delivery date has passed. Please follow up with the seller."
         }
       </div>`
    : "";

  const showInvoiceBtn = ["delivered"].includes(order.status);

  const bodyHTML = `
    <div style="max-height:65vh;overflow-y:auto;padding-right:4px">
      ${overdueBanner}
      ${
        imageUrl
          ? `
        <div style="margin-bottom:20px;border-radius:12px;overflow:hidden">
          ${
            isProductVideo
              ? `<video src="${imageUrl}" muted autoplay loop playsinline style="width:100%;max-height:180px;object-fit:cover"></video>`
              : `<img src="${imageUrl}" alt="Product" style="width:100%;max-height:200px;object-fit:cover">`
          }
        </div>`
          : ""
      }

      <h4 style="color:var(--primary-purple);margin:0 0 12px 0">🛍️ Order Information</h4>
      <div class="modal-detail-row"><strong>Order ID:</strong> #${
        order.order_id
      }</div>
      <div class="modal-detail-row"><strong>Product:</strong> ${escapeHtml(
        order.product_name || order.product_title || "—"
      )}</div>
      <div class="modal-detail-row"><strong>Status:</strong> ${getStatusIcon(
        order.status
      )} ${_getOrderStatusLabel(order.status, isPickup)}</div>
      <div class="modal-detail-row"><strong>Fulfillment:</strong> ${
        isPickup ? "🏪 Pickup" : "🚚 Delivery"
      }</div>
      <div class="modal-detail-row"><strong>Order Date:</strong> ${formatDate(
        order.order_date
      )}</div>

      <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">💰 Pricing</h4>
      <div class="modal-detail-row"><strong>Quantity:</strong> ${
        order.quantity
      }</div>
      <div class="modal-detail-row"><strong>Unit Price:</strong> ₹${formatMoney(
        order.product_price
      )}</div>
      ${
        order.gst_amount && parseFloat(order.gst_amount) > 0
          ? `<div class="modal-detail-row"><strong>GST (${
              order.gst_rate || 0
            }%):</strong> ₹${formatMoney(order.gst_amount)}</div>`
          : ""
      }
      ${deliveryChargeSection}
      ${distanceSection}
      <div class="modal-detail-row"><strong>Total Amount:</strong> <span style="font-size:1.1rem;font-weight:800;color:var(--primary-purple)">₹${formatMoney(
        order.total_amount
      )}</span></div>

      <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">💳 Payment</h4>
      <div class="modal-detail-row"><strong>Method:</strong> ${paymentMethodDisplay}</div>
      <div class="modal-detail-row"><strong>Status:</strong> ${paymentStatusDisplay}</div>
      ${
        order.payment_reference
          ? `<div class="modal-detail-row"><strong>Reference:</strong> <span style="font-family:monospace;font-size:.88rem">${escapeHtml(
              order.payment_reference
            )}</span></div>`
          : ""
      }

      ${addressSection}
      ${trackingSection}

      ${
        order.buyer_notes
          ? `
        <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">📝 Special Instructions</h4>
        <div class="modal-detail-row" style="white-space:pre-wrap;line-height:1.6">${escapeHtml(
          order.buyer_notes
        )}</div>`
          : ""
      }

      ${
        order.cancellation_reason
          ? `
        <h4 style="color:#dc3545;margin:20px 0 12px 0">❌ Cancellation</h4>
        <div class="modal-detail-row"><strong>Reason:</strong> ${escapeHtml(
          order.cancellation_reason
        )}</div>`
          : ""
      }
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Close</button>
    ${
      showInvoiceBtn
        ? `<button class="btn btn-primary" onclick="generateInvoice('product', ${orderId})">
           <i class="fas fa-file-invoice"></i> View Invoice
         </button>`
        : ""
    }`;

  showModal("Order Details", bodyHTML, footerHTML);
}

// ===== VIEW BOOKING DETAILS MODAL =====
function showBookingDetailsModal(bookingId) {
  const booking = [
    ...allDeals.buyer.services,
    ...allDeals.seller.services,
  ].find((b) => b.booking_id == bookingId);

  if (!booking) {
    showToast("Booking not found", "error");
    return;
  }

  const imageUrl = getImageUrl(booking.media_url);

  const locLabels = {
    online: "Online / Remote",
    at_provider: "At Provider's Location",
    doorstep: "Doorstep (Provider comes to you)",
    both: "At Location & Doorstep",
  };

  let _variantName = booking.selected_variant_name || null;
  if (_variantName) {
    _variantName = _variantName.split("\n")[0].trim();
    _variantName = _variantName.replace(/\s*\d+(\.\d+)?h\s*$/, "").trim();
  }
  const variantRow = _variantName
    ? `<div class="modal-detail-row">
         <strong>Package Selected:</strong>
         <span style="font-weight:700;color:var(--primary-purple)">${escapeHtml(
           _variantName
         )}</span>
         ${
           booking.variant_price
             ? `<span style="color:var(--text-secondary);margin-left:6px;font-size:.88rem">(₹${formatMoney(
                 booking.variant_price
               )})</span>`
             : ""
         }
       </div>`
    : "";

  const _slotLabel =
    booking.booked_slot ||
    (booking.preferred_time
      ? String(booking.preferred_time).substring(0, 5)
      : null);
  const _slotDisplay = _slotLabel ? _fmt12hr(_slotLabel) : null;
  const slotRow = _slotDisplay
    ? `<div class="modal-detail-row"><strong>Time Slot:</strong>
         <span style="background:rgba(230,10,234,.1);color:var(--primary-purple);font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid rgba(230,10,234,.3);font-size:.9rem">
           <i class="fas fa-clock" style="margin-right:4px;font-size:.8rem"></i>${_slotDisplay}
         </span>
       </div>`
    : "";

  const expiredBanner = _isServiceExpired(booking)
    ? `<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.4);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:.85rem;font-weight:600;color:#92400e;display:flex;align-items:center;gap:8px">
         <i class="fas fa-hourglass-end" style="font-size:1.1rem"></i>
         The scheduled service date/time has passed. Please contact the provider to reschedule.
       </div>`
    : "";

  const doorstepSection =
    (booking.location_type === "doorstep" ||
      booking.location_type === "both") &&
    (booking.buyer_address || booking.buyer_pincode)
      ? `<h4 style="color:var(--primary-purple);margin:20px 0 12px 0;">📍 Buyer's Location</h4>
         ${
           booking.buyer_address
             ? `<div class="modal-detail-row"><strong>Address:</strong> ${escapeHtml(
                 booking.buyer_address
               )}</div>`
             : ""
         }
         ${
           booking.buyer_pincode
             ? `<div class="modal-detail-row"><strong>Pincode:</strong> ${escapeHtml(
                 booking.buyer_pincode
               )}</div>`
             : ""
         }
         ${
           booking.distance_km
             ? `<div class="modal-detail-row"><strong>Distance:</strong> ~${parseFloat(
                 booking.distance_km
               ).toFixed(1)} km</div>`
             : ""
         }`
      : "";

  const travelFeeRow =
    booking.travel_fee && parseFloat(booking.travel_fee) > 0
      ? `<div class="modal-detail-row"><strong>Travel Fee:</strong> <span style="color:var(--primary-purple);font-weight:700">₹${formatMoney(
          booking.travel_fee
        )}</span></div>`
      : "";

  const showInvoiceBtn = ["completed"].includes(booking.status);

  const bodyHTML = `
    <div style="max-height:65vh;overflow-y:auto;padding-right:4px">
      ${expiredBanner}
      ${
        imageUrl
          ? `
        <div style="margin-bottom:20px;border-radius:12px;overflow:hidden">
          <img src="${imageUrl}" alt="Service" style="width:100%;max-height:200px;object-fit:cover">
        </div>`
          : ""
      }

      <h4 style="color:var(--primary-purple);margin:0 0 12px 0">📋 Booking Information</h4>
      <div class="modal-detail-row"><strong>Booking ID:</strong> #${
        booking.booking_id
      }</div>
      <div class="modal-detail-row"><strong>Service:</strong> ${escapeHtml(
        booking.service_title || booking.title || "Service"
      )}</div>
      <div class="modal-detail-row"><strong>Status:</strong> ${getStatusIcon(
        booking.status
      )} ${formatStatus(booking.status)}</div>
      <div class="modal-detail-row"><strong>Booking Date:</strong> ${formatDate(
        booking.booking_date
      )}</div>
      ${
        booking.preferred_start_date
          ? `<div class="modal-detail-row"><strong>Preferred Date:</strong> ${formatDate(
              booking.preferred_start_date
            )}</div>`
          : ""
      }
      ${slotRow}
      ${
        booking.delivery_timeline
          ? `<div class="modal-detail-row"><strong>Delivery Timeline:</strong> ${escapeHtml(
              booking.delivery_timeline
            )}</div>`
          : ""
      }

      <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">💰 Pricing</h4>
      ${variantRow}
      <div class="modal-detail-row"><strong>Quoted Price:</strong> ₹${formatMoney(
        booking.quoted_price
      )}</div>
      ${travelFeeRow}
      <div class="modal-detail-row"><strong>Total Amount:</strong> <span style="font-size:1.1rem;font-weight:800;color:var(--primary-purple)">₹${formatMoney(
        booking.total_amount
      )}</span></div>

      <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">📍 Service Location</h4>
      <div class="modal-detail-row"><strong>Type:</strong> ${
        locLabels[booking.location_type] || "Online / Remote"
      }</div>
      ${doorstepSection}

      <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">📞 Contact</h4>
      <div class="modal-detail-row"><strong>Method:</strong> ${
        { email: "Email", phone: "Phone", whatsapp: "WhatsApp" }[
          booking.contact_method
        ] ||
        booking.contact_method ||
        "—"
      }</div>
      <div class="modal-detail-row"><strong>Contact:</strong> ${escapeHtml(
        booking.customer_contact || "—"
      )}</div>

      ${
        booking.customer_requirements
          ? `
        <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">📝 Project Requirements</h4>
        <div class="modal-detail-row" style="white-space:pre-wrap;line-height:1.6">${escapeHtml(
          booking.customer_requirements
        )}</div>`
          : ""
      }

      ${
        booking.provider_message
          ? `
        <h4 style="color:var(--primary-purple);margin:20px 0 12px 0">💬 Provider Message</h4>
        <div class="modal-detail-row" style="white-space:pre-wrap;line-height:1.6">${escapeHtml(
          booking.provider_message
        )}</div>`
          : ""
      }

      ${
        booking.cancellation_reason
          ? `
        <h4 style="color:#dc3545;margin:20px 0 12px 0">❌ Cancellation</h4>
        <div class="modal-detail-row"><strong>Reason:</strong> ${escapeHtml(
          booking.cancellation_reason
        )}</div>`
          : ""
      }
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Close</button>
    ${
      showInvoiceBtn
        ? `<button class="btn btn-primary" onclick="generateInvoice('service', ${bookingId})">
           <i class="fas fa-file-invoice"></i> View Invoice
         </button>`
        : ""
    }`;

  showModal("Booking Details", bodyHTML, footerHTML);
}

// ===== CANCEL ORDER MODAL =====
function showCancelOrderModal(orderId) {
  const bodyHTML = `
    <div class="form-group">
        <label>Reason for cancellation (optional)</label>
        <textarea id="cancelReason" placeholder="Please provide a reason..." 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);"></textarea>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-danger" data-action="execute-cancel-order" data-id="${orderId}">
        <i class="fas fa-times"></i> Confirm Cancellation
    </button>
  `;

  showModal("Cancel Order", bodyHTML, footerHTML);
}

async function executeCancelOrder(orderId) {
  const reason = document.getElementById("cancelReason")?.value || "";
  await updateOrderStatus(orderId, "cancelled", {
    cancellation_reason: reason,
  });
  closeModal();
}

// ===== REJECT ORDER MODAL =====
function showRejectOrderModal(orderId) {
  const bodyHTML = `
    <div class="form-group">
        <label>Reason for rejection *</label>
        <textarea id="rejectReason" placeholder="Please provide a reason..." required
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);"></textarea>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-danger" data-action="execute-reject-order" data-id="${orderId}">
        <i class="fas fa-times"></i> Confirm Rejection
    </button>
  `;

  showModal("Reject Order", bodyHTML, footerHTML);
}

async function executeRejectOrder(orderId) {
  const reason = document.getElementById("rejectReason")?.value || "";
  if (!reason.trim()) {
    showToast("Please provide a reason for rejection", "warning");
    return;
  }
  await updateOrderStatus(orderId, "cancelled", {
    cancellation_reason: reason,
  });
  closeModal();
}

// ===== CONFIRM ORDER =====
async function confirmOrder(orderId) {
  const btn = document.querySelector(
    `[data-action="confirm-order"][data-order-id="${orderId}"]`
  );

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';
    btn.style.opacity = "0.8";
  }

  try {
    await updateOrderStatus(orderId, "confirmed");
  } finally {
    if (btn && document.contains(btn)) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Confirm Order';
      btn.style.opacity = "1";
    }
  }
}

// ===== UPDATE ORDER STATUS MODAL =====
// Pickup-aware: shows "Mark Ready for Pickup" / "Mark as Picked Up" for pickup orders
function showUpdateOrderStatusModal(orderId) {
  const order = [...allDeals.seller.products].find(
    (o) => o.order_id == orderId
  );
  if (!order) return;

  const isPickup = Boolean(order.is_pickup);

  // Pickup orders use processing → delivered (skip shipped)
  // Shipped orders use confirmed → processing → shipped → delivered
  let nextStatuses;
  if (isPickup) {
    nextStatuses = {
      confirmed: {
        value: "processing",
        label: "Mark Ready for Pickup",
        icon: "fa-store",
      },
      processing: {
        value: "delivered",
        label: "Mark as Picked Up",
        icon: "fa-box-open",
      },
    };
  } else {
    nextStatuses = {
      confirmed: {
        value: "processing",
        label: "Mark as Processing",
        icon: "fa-cog",
      },
      processing: {
        value: "shipped",
        label: "Mark as Shipped",
        icon: "fa-truck",
      },
      shipped: {
        value: "delivered",
        label: "Mark as Delivered",
        icon: "fa-check-circle",
      },
    };
  }

  const nextStatus = nextStatuses[order.status];
  if (!nextStatus) {
    showToast("No status update available", "info");
    return;
  }

  const codDeliveryNote =
    nextStatus.value === "delivered" && order.payment_method === "cod"
      ? `<div style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 10px; padding: 12px; margin-top: 16px; font-size: 0.88rem; text-align: left;">
           <i class="fas fa-info-circle" style="color: #22c55e; margin-right: 6px;"></i>
           <strong>COD Order:</strong> ${
             isPickup
               ? "Buyer pays you cash on pickup."
               : "Buyer pays you cash on delivery."
           } A 2% platform commission (₹${formatMoney(
          order.total_amount * 0.02
        )}) will be deducted from your balance.
         </div>`
      : "";

  const trackingField =
    nextStatus.value === "shipped" && !isPickup
      ? `<div class="form-group">
          <label>Tracking Number (optional)</label>
          <input type="text" id="trackingNumber" placeholder="Enter tracking number..." 
              style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);">
      </div>`
      : "";

  const bodyHTML = `
    <div style="text-align: center; padding: 20px;">
        <i class="fas ${nextStatus.icon}" style="font-size: 4rem; color: var(--primary-purple); margin-bottom: 20px;"></i>
        <h3 style="margin-bottom: 10px;">${nextStatus.label}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
            Update the order status to inform the buyer
        </p>
        ${trackingField}
        ${codDeliveryNote}
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-primary" data-action="execute-update-status" data-id="${orderId}" data-entity-type="order">
        <i class="fas fa-sync"></i> Update Status
    </button>
  `;

  showModal("Update Order Status", bodyHTML, footerHTML);
}

async function executeUpdateStatus(id, entityType) {
  if (entityType === "order") {
    const order = [...allDeals.seller.products].find((o) => o.order_id == id);
    const isPickup = Boolean(order.is_pickup);

    let nextStatuses;
    if (isPickup) {
      nextStatuses = { confirmed: "processing", processing: "delivered" };
    } else {
      nextStatuses = {
        confirmed: "processing",
        processing: "shipped",
        shipped: "delivered",
      };
    }

    const newStatus = nextStatuses[order.status];
    const trackingNumber =
      document.getElementById("trackingNumber")?.value || "";

    await updateOrderStatus(id, newStatus, { tracking_number: trackingNumber });
  } else if (entityType === "booking") {
    const booking = [...allDeals.seller.services].find(
      (b) => b.booking_id == id
    );
    const nextStatuses = { accepted: "in_progress", in_progress: "completed" };
    const newStatus = nextStatuses[booking.status];
    await updateBookingStatus(id, newStatus);
  }
  closeModal();
}

// ===== ACCEPT BOOKING =====
async function acceptBooking(bookingId) {
  await updateBookingStatus(bookingId, "accepted");
}

// ===== REJECT BOOKING MODAL =====
function showRejectBookingModal(bookingId) {
  const bodyHTML = `
    <div class="form-group">
        <label>Reason for rejection *</label>
        <textarea id="rejectReason" placeholder="Please provide a reason..." required
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);"></textarea>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-danger" data-action="execute-reject-booking" data-id="${bookingId}">
        <i class="fas fa-times"></i> Confirm Rejection
    </button>
  `;

  showModal("Reject Booking", bodyHTML, footerHTML);
}

async function executeRejectBooking(bookingId) {
  const reason = document.getElementById("rejectReason")?.value || "";
  if (!reason.trim()) {
    showToast("Please provide a reason for rejection", "warning");
    return;
  }
  await updateBookingStatus(bookingId, "rejected", {
    provider_message: reason,
  });
  closeModal();
}

// ===== CANCEL BOOKING MODAL =====
function showCancelBookingModal(bookingId) {
  const bodyHTML = `
    <div class="form-group">
        <label>Reason for cancellation (optional)</label>
        <textarea id="cancelReason" placeholder="Please provide a reason..." 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);"></textarea>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-danger" data-action="execute-cancel-booking" data-id="${bookingId}">
        <i class="fas fa-times"></i> Confirm Cancellation
    </button>
  `;

  showModal("Cancel Booking", bodyHTML, footerHTML);
}

async function executeCancelBooking(bookingId) {
  const reason = document.getElementById("cancelReason")?.value || "";
  await updateBookingStatus(bookingId, "cancelled", {
    cancellation_reason: reason,
  });
  closeModal();
}

// ===== UPDATE BOOKING STATUS MODAL =====
function showUpdateBookingStatusModal(bookingId) {
  const booking = [...allDeals.seller.services].find(
    (b) => b.booking_id == bookingId
  );
  if (!booking) return;

  const nextStatuses = {
    accepted: {
      value: "in_progress",
      label: "Mark as In Progress",
      icon: "fa-spinner",
    },
    in_progress: {
      value: "completed",
      label: "Mark as Completed",
      icon: "fa-check-double",
    },
  };

  const nextStatus = nextStatuses[booking.status];
  if (!nextStatus) {
    showToast("No status update available", "info");
    return;
  }

  const bodyHTML = `
    <div style="text-align: center; padding: 20px;">
        <i class="fas ${nextStatus.icon}" style="font-size: 4rem; color: var(--primary-purple); margin-bottom: 20px;"></i>
        <h3 style="margin-bottom: 10px;">${nextStatus.label}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">
            Update the booking status to inform the customer
        </p>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-primary" data-action="execute-update-status" data-id="${bookingId}" data-entity-type="booking">
        <i class="fas fa-sync"></i> Update Status
    </button>
  `;

  showModal("Update Booking Status", bodyHTML, footerHTML);
}

// ===== CHANGE ORDER DETAILS MODAL =====
function showChangeOrderDetailsModal(orderId) {
  const order = [...allDeals.buyer.products].find((o) => o.order_id == orderId);
  if (!order) return;

  // Pickup orders don't need shipping address change
  if (order.is_pickup) {
    showToast("Pickup orders don't require a delivery address.", "info");
    return;
  }

  const bodyHTML = `
    <div class="form-group">
        <label>Full Name *</label>
        <input type="text" id="shippingFullName" value="${escapeHtml(
          order.shipping_full_name || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);" required>
    </div>
    <div class="form-group">
        <label>Phone Number *</label>
        <input type="tel" id="shippingPhone" value="${escapeHtml(
          order.shipping_phone || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);" required>
    </div>
    <div class="form-group">
        <label>Address Line 1 *</label>
        <input type="text" id="shippingAddress1" value="${escapeHtml(
          order.shipping_address_line1 || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);" required>
    </div>
    <div class="form-group">
        <label>Address Line 2</label>
        <input type="text" id="shippingAddress2" value="${escapeHtml(
          order.shipping_address_line2 || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);">
    </div>
    <div class="form-group">
        <label>City *</label>
        <input type="text" id="shippingCity" value="${escapeHtml(
          order.shipping_city || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);" required>
    </div>
    <div class="form-group">
        <label>State *</label>
        <input type="text" id="shippingState" value="${escapeHtml(
          order.shipping_state || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);" required>
    </div>
    <div class="form-group">
        <label>Pincode *</label>
        <input type="text" id="shippingPincode" value="${escapeHtml(
          order.shipping_pincode || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);" required>
    </div>
    <div class="form-group">
        <label>Landmark</label>
        <input type="text" id="shippingLandmark" value="${escapeHtml(
          order.shipping_landmark || ""
        )}" 
            style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);">
    </div>
    <div class="form-group">
        <label>Special Instructions</label>
        <textarea id="buyerNotes" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid var(--border-purple);">${escapeHtml(
          order.buyer_notes || ""
        )}</textarea>
    </div>
  `;

  const footerHTML = `
    <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
    <button class="btn btn-primary" data-action="execute-change-details" data-id="${orderId}">
        <i class="fas fa-save"></i> Save Changes
    </button>
  `;

  showModal("Change Order Details", bodyHTML, footerHTML);
}

async function executeChangeOrderDetails(orderId) {
  const fullName = document.getElementById("shippingFullName")?.value || "";
  const phone = document.getElementById("shippingPhone")?.value || "";
  const address1 = document.getElementById("shippingAddress1")?.value || "";
  const address2 = document.getElementById("shippingAddress2")?.value || "";
  const city = document.getElementById("shippingCity")?.value || "";
  const state = document.getElementById("shippingState")?.value || "";
  const pincode = document.getElementById("shippingPincode")?.value || "";
  const landmark = document.getElementById("shippingLandmark")?.value || "";
  const notes = document.getElementById("buyerNotes")?.value || "";

  if (
    !fullName.trim() ||
    !phone.trim() ||
    !address1.trim() ||
    !city.trim() ||
    !state.trim() ||
    !pincode.trim()
  ) {
    showToast("Please fill all required fields", "warning");
    return;
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/deals/orders/${orderId}/details`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipping_full_name: fullName,
          shipping_phone: phone,
          shipping_address_line1: address1,
          shipping_address_line2: address2,
          shipping_city: city,
          shipping_state: state,
          shipping_pincode: pincode,
          shipping_landmark: landmark,
          buyer_notes: notes,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      showToast("Order details updated successfully!", "success");
      await loadAllDeals();
      closeModal();
    } else {
      showToast(data.message || "Failed to update order details", "error");
    }
  } catch (error) {
    console.error("❌ Error updating order details:", error);
    showToast("Failed to update order. Please try again.", "error");
  }
}

// ===== MODAL BUTTON LOADING STATE =====
function setModalButtonLoading(loading) {
  const footer = document.getElementById("modalFooter");
  if (!footer) return;
  const buttons = footer.querySelectorAll(".btn");
  buttons.forEach((btn) => {
    if (loading) {
      btn.disabled = true;
      if (
        !btn.classList.contains("btn-secondary") &&
        btn.dataset.action !== "close-modal"
      ) {
        btn._originalHTML = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Updating...`;
      }
    } else {
      btn.disabled = false;
      if (btn._originalHTML) {
        btn.innerHTML = btn._originalHTML;
        delete btn._originalHTML;
      }
    }
  });
}

// ===== UPDATE ORDER STATUS =====
async function updateOrderStatus(orderId, status, additionalData = {}) {
  setModalButtonLoading(true);
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/deals/orders/${orderId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, ...additionalData }),
      }
    );
    const data = await response.json();
    if (data.success) {
      showToast(`Order ${formatStatus(status)} successfully!`, "success");
      await loadAllDeals();
    } else {
      showToast(data.message || "Failed to update order status", "error");
    }
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    showToast("Failed to update order. Please try again.", "error");
  } finally {
    setModalButtonLoading(false);
  }
}

// ===== UPDATE BOOKING STATUS =====
async function updateBookingStatus(bookingId, status, additionalData = {}) {
  setModalButtonLoading(true);
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const response = await fetch(
      `${API_BASE_URL}/deals/bookings/${bookingId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, ...additionalData }),
      }
    );
    const data = await response.json();
    if (data.success) {
      showToast(`Booking ${formatStatus(status)} successfully!`, "success");
      await loadAllDeals();
    } else {
      showToast(data.message || "Failed to update booking status", "error");
    }
  } catch (error) {
    console.error("❌ Error updating booking status:", error);
    showToast("Failed to update booking. Please try again.", "error");
  } finally {
    setModalButtonLoading(false);
  }
}

// ===== INVOICE GENERATOR =====
function generateInvoice(type, id) {
  const isProduct = type === "product";

  const record = isProduct
    ? [...allDeals.buyer.products, ...allDeals.seller.products].find(
        (o) => o.order_id == id
      )
    : [...allDeals.buyer.services, ...allDeals.seller.services].find(
        (b) => b.booking_id == id
      );

  if (!record) {
    showToast("Record not found", "error");
    return;
  }

  const now = new Date();
  const invDate = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const invNo = isProduct
    ? `INV-ORD-${record.order_id}`
    : `INV-BKG-${record.booking_id}`;

  const buyerName = isProduct
    ? record.shipping_full_name || record.buyer_name || "Buyer"
    : record.customer_name || "Customer";
  const sellerName = isProduct
    ? record.seller_name || "Seller"
    : record.provider_name || "Provider";
  const buyerContact = isProduct
    ? record.shipping_phone || ""
    : record.customer_contact || "";
  const buyerAddr =
    isProduct && record.shipping_address_line1
      ? [
          record.shipping_address_line1,
          record.shipping_address_line2,
          record.shipping_city,
          record.shipping_state,
          record.shipping_pincode,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

  let lineItems = "";
  if (isProduct) {
    const lineTotal =
      parseFloat(record.product_price) * parseInt(record.quantity || 1);
    lineItems = `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">${escapeHtml(
        record.product_name || record.product_title || "Product"
      )}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center">${
        record.quantity
      }</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right">₹${formatMoney(
        record.product_price
      )}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right">₹${formatMoney(
        lineTotal
      )}</td>
    </tr>`;
  } else {
    let _vn =
      record.selected_variant_name ||
      record.service_title ||
      record.title ||
      "Service";
    _vn = _vn
      .split("\n")[0]
      .trim()
      .replace(/\s*\d+(\.\d+)?h\s*$/, "")
      .trim();
    const basePrice = parseFloat(
      record.quoted_price || record.total_amount || 0
    );
    lineItems = `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">${escapeHtml(
        _vn
      )}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center">1</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right">₹${formatMoney(
        basePrice
      )}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right">₹${formatMoney(
        basePrice
      )}</td>
    </tr>`;
    if (record.travel_fee && parseFloat(record.travel_fee) > 0) {
      lineItems += `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">Travel / Doorstep Fee</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center">1</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right">₹${formatMoney(
          record.travel_fee
        )}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right">₹${formatMoney(
          record.travel_fee
        )}</td>
      </tr>`;
    }
  }

  const gstAmt = isProduct ? parseFloat(record.gst_amount || 0) : 0;
  const delivCharge = isProduct ? parseFloat(record.delivery_charge || 0) : 0;
  const total = parseFloat(record.total_amount || 0);
  let chargesHtml = "";
  if (delivCharge > 0)
    chargesHtml += `<tr><td colspan="3" style="padding:6px 14px;text-align:right;color:#555">Delivery Charge</td><td style="padding:6px 14px;text-align:right;color:#555">₹${formatMoney(
      delivCharge
    )}</td></tr>`;
  if (gstAmt > 0)
    chargesHtml += `<tr><td colspan="3" style="padding:6px 14px;text-align:right;color:#555">GST (${
      record.gst_rate || 0
    }%)</td><td style="padding:6px 14px;text-align:right;color:#555">₹${formatMoney(
      gstAmt
    )}</td></tr>`;

  const pmDisplay = isProduct
    ? record.payment_method === "cod"
      ? "Cash on Delivery"
      : formatStatus(record.payment_method || "Online")
    : "Online / Agreed";

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Invoice ${invNo}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;}.page{max-width:760px;margin:30px auto;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);overflow:hidden;}.header{background:linear-gradient(135deg,#e60aea,#9b59b6);padding:32px 40px;color:white;display:flex;justify-content:space-between;align-items:flex-start;}.brand{font-size:1.6rem;font-weight:900;}.brand small{display:block;font-size:.75rem;font-weight:400;opacity:.85;margin-top:2px;}.inv-meta{text-align:right;}.inv-meta h2{font-size:1.4rem;font-weight:800;}.body-wrap{padding:36px 40px;}.parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px;}.party h4{font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px;}.party .name{font-size:1rem;font-weight:700;margin-bottom:4px;}.party p{font-size:.83rem;color:#555;line-height:1.6;}.items-table{width:100%;border-collapse:collapse;margin-bottom:8px;}.items-table thead tr{background:#f8f0ff;}.items-table th{padding:11px 14px;text-align:left;font-size:.78rem;text-transform:uppercase;letter-spacing:.5px;color:#888;}.items-table th:last-child,.items-table td:last-child{text-align:right;}.total-row td{padding:14px 14px;font-size:1.05rem;font-weight:800;color:#e60aea;border-top:2px solid #e60aea!important;}.footer{background:#fafafa;border-top:1px solid #eee;padding:20px 40px;text-align:center;font-size:.78rem;color:#aaa;}@media print{body{background:white;}.page{box-shadow:none;margin:0;border-radius:0;}.no-print{display:none!important;}}</style>
</head><body><div class="page">
<div class="header">
  <div><div class="brand">Creator Connect<small>Marketplace Invoice</small></div></div>
  <div class="inv-meta"><h2>${invNo}</h2><p>Date: ${invDate}</p><p>Type: ${
    isProduct ? "Product Order" : "Service Booking"
  }</p></div>
</div>
<div class="body-wrap">
  <div class="parties">
    <div class="party"><h4>Bill To</h4><div class="name">${escapeHtml(
      buyerName
    )}</div>${buyerContact ? `<p>📱 ${escapeHtml(buyerContact)}</p>` : ""}${
    buyerAddr ? `<p>${escapeHtml(buyerAddr)}</p>` : ""
  }</div>
    <div class="party"><h4>${
      isProduct ? "Sold By" : "Service Provider"
    }</h4><div class="name">${escapeHtml(sellerName)}</div><p>@${escapeHtml(
    isProduct ? record.seller_username || "" : record.provider_username || ""
  )}</p></div>
  </div>
  <table class="items-table">
    <thead><tr><th style="width:45%">Description</th><th style="text-align:center;width:10%">Qty</th><th style="text-align:right;width:20%">Unit Price</th><th style="text-align:right;width:25%">Amount</th></tr></thead>
    <tbody>${lineItems}${chargesHtml}<tr class="total-row"><td colspan="3" style="text-align:right;letter-spacing:.5px">TOTAL</td><td>₹${formatMoney(
    total
  )}</td></tr></tbody>
  </table>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px;padding-top:28px;border-top:1px solid #f0f0f0;">
    <div><h5 style="font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:10px;">${
      isProduct ? "Order Details" : "Service Details"
    }</h5>
      <table style="font-size:.85rem;border-collapse:collapse;width:100%;">
        <tr><td style="padding:4px 0;color:#666;width:120px">${
          isProduct ? "Order ID" : "Booking ID"
        }</td><td style="padding:4px 0;font-weight:600">${
    isProduct ? "#" + record.order_id : "#" + record.booking_id
  }</td></tr>
        <tr><td style="padding:4px 0;color:#666">${
          isProduct ? "Order Date" : "Booked On"
        }</td><td style="padding:4px 0">${formatDate(
    isProduct ? record.order_date : record.booking_date
  )}</td></tr>
      </table>
    </div>
    <div><h5 style="font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:10px;">Payment Details</h5>
      <table style="font-size:.85rem;border-collapse:collapse;width:100%;">
        <tr><td style="padding:4px 0;color:#666;width:120px">Method</td><td style="padding:4px 0">${pmDisplay}</td></tr>
        <tr><td style="padding:4px 0;color:#666">Status</td><td style="padding:4px 0;color:#16a34a;font-weight:700">✓ Paid / Completed</td></tr>
      </table>
    </div>
  </div>
</div>
<div class="footer">
  <p>Thank you for using Creator Connect! This is a computer-generated invoice.</p>
  <p style="margin-top:4px">Generated on ${invDate} &nbsp;•&nbsp; ${invNo}</p>
  <br>
  <button class="no-print" onclick="window.print()" style="padding:8px 24px;background:#e60aea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:.88rem;font-weight:700;margin-top:4px">🖨️ Print / Save as PDF</button>
</div>
</div></body></html>`;

  const win = window.open("", "_blank", "width=820,height=700,scrollbars=yes");
  if (!win) {
    showToast("Please allow popups to view the invoice", "error");
    return;
  }
  win.document.write(html);
  win.document.close();
}
window.generateInvoice = generateInvoice;

// ===== UTILITY FUNCTIONS =====
function getImageUrl(mediaUrl) {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))
    return mediaUrl;

  let cleanPath = mediaUrl.replace(/\\/g, "/").replace(/^\/+/, "");
  if (cleanPath.startsWith("uploads/")) {
    if (cleanPath.includes("uploads/posts/")) {
      const filename = cleanPath.split("uploads/posts/")[1];
      return `${API_BASE_URL}/uploads/${filename}`;
    }
    return `${API_BASE_URL}/${cleanPath}`;
  }
  return `${API_BASE_URL}/uploads/${cleanPath}`;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount) {
  if (!amount) return "0.00";
  return parseFloat(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatStatus(status) {
  if (!status) return "Unknown";
  return status
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPaymentStatus(paymentStatus, paymentMethod) {
  if (paymentStatus === "completed") return "✅ Paid";
  if (paymentStatus === "verification_pending")
    return "⏳ Verification Pending";
  if (paymentStatus === "failed") return "❌ Payment Rejected";
  if (paymentStatus === "cod_pending") return "💵 COD — Pay on Delivery";
  if (paymentStatus === "pending") {
    if (paymentMethod === "cod") return "💵 COD — Pay on Delivery";
    return "⚠️ Payment Pending";
  }
  return paymentStatus ? formatStatus(paymentStatus) : "—";
}

function getStatusIcon(status) {
  const icons = {
    pending: '<i class="fas fa-clock"></i>',
    confirmed: '<i class="fas fa-check"></i>',
    processing: '<i class="fas fa-cog fa-spin"></i>',
    shipped: '<i class="fas fa-truck"></i>',
    out_for_delivery: '<i class="fas fa-shipping-fast"></i>',
    delivered: '<i class="fas fa-check-circle"></i>',
    completed: '<i class="fas fa-check-double"></i>',
    cancelled: '<i class="fas fa-times-circle"></i>',
    rejected: '<i class="fas fa-ban"></i>',
    accepted: '<i class="fas fa-handshake"></i>',
    in_progress: '<i class="fas fa-spinner fa-spin"></i>',
    verification_pending: '<i class="fas fa-hourglass-half"></i>',
    cod_pending: '<i class="fas fa-money-bill-wave"></i>',
    failed: '<i class="fas fa-exclamation-circle"></i>',
  };
  return icons[status] || '<i class="fas fa-question"></i>';
}

function getPaymentBadgeHtml(order) {
  const ps = order.payment_status;
  const pm = order.payment_method;

  if (ps === "completed") {
    return '<span class="payment-badge paid"><i class="fas fa-check-circle"></i> Paid</span>';
  }
  if (ps === "verification_pending") {
    return '<span class="payment-badge verification-pending"><i class="fas fa-hourglass-half"></i> Verification Pending</span>';
  }
  if (ps === "failed") {
    return '<span class="payment-badge failed"><i class="fas fa-times-circle"></i> Payment Rejected</span>';
  }
  if (ps === "cod_pending" || pm === "cod") {
    return '<span class="payment-badge cod"><i class="fas fa-money-bill-wave"></i> COD — Pay on Delivery</span>';
  }
  return '<span class="payment-badge pending"><i class="fas fa-clock"></i> Payment Pending</span>';
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = "success") {
  const existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };

  toast.innerHTML = `
    <i class="fas ${iconMap[type] || iconMap.info}"></i>
    <span class="toast-message">${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== BUTTON LOADING STATE =====
function setButtonLoading(btn, text = "Loading...") {
  if (!btn || btn.dataset.loading === "true") return;
  btn.dataset.loading = "true";
  btn.dataset.originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
  btn.style.opacity = "0.8";

  setTimeout(() => restoreButton(btn), 4000);
}

function restoreButton(btn) {
  if (!btn || btn.dataset.loading !== "true") return;
  btn.dataset.loading = "false";
  btn.disabled = false;
  btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
  btn.style.opacity = "1";
}

window.setButtonLoading = setButtonLoading;

// ===== DEALS VIDEO AUTOPLAY =====
(function setupDealsVideoAutoplay() {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      });
    },
    { threshold: 0.5 }
  );

  function observeVideos() {
    document.querySelectorAll(".deals-autoplay-video").forEach((video) => {
      if (!video.dataset.observed) {
        videoObserver.observe(video);
        video.dataset.observed = "true";
      }
    });
  }

  ["buyerDealsGrid", "sellerDealsGrid"].forEach((id) => {
    const grid = document.getElementById(id);
    if (grid) {
      new MutationObserver(observeVideos).observe(grid, {
        childList: true,
        subtree: true,
      });
    }
  });

  observeVideos();
  console.log("✅ Deals video autoplay initialized");
})();

function toggleDealsVideoMute(event, btn) {
  event.stopPropagation();
  const wrapper = btn.closest("div[style*='position:relative']");
  const video = wrapper.querySelector("video");
  const icon = btn.querySelector("i");
  video.muted = !video.muted;
  icon.className = video.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
}

window.toggleDealsVideoMute = toggleDealsVideoMute;

// Make functions globally accessible
window.switchRole = switchRole;
window.filterByType = filterByType;
window.filterByStatus = filterByStatus;
window.toggleView = toggleView;
window.closeModal = closeModal;
window.closePostDetailModal = closePostDetailModal;
window.executeChangeOrderDetails = executeChangeOrderDetails;
window.handlePaymentMethodChange = handlePaymentMethodChange;

console.log(
  "✅ MyDeals JavaScript loaded — v2 (pickup labels + expiry badges + invoice)"
);
