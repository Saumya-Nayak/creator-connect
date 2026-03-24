/* ============================================================
   SETTINGS PAGE JS — Creator Connect  v5
   ============================================================ */

// ── Config ──────────────────────────────────────────────────
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

// ── State ────────────────────────────────────────────────────
let isDirty = false;
let sellerPaymentDirty = false;
let privacyDirty = false;
let activeTab = "profile";
let usernameCheckTimer = null;
let userData = null;
let allCountriesData = [];
let regCropper = null;
let isInitialLoad = true;
let currentAvailableBalance = 0;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  applyTheme();
  await loadHeaderAndSidebar();
  hidePreloader();
  setupTabs();
  await loadAllSettings();
  await loadCountriesForSettings();
  setupAvatarCropper();

  setTimeout(() => {
    isInitialLoad = false;
  }, 500);

  const urlTab = new URLSearchParams(window.location.search).get("tab");
  if (urlTab) switchTab(urlTab);

  console.log("✅ Settings page ready");
});

// ── Theme ──────────────────────────────────────────────────────
function applyTheme() {
  const t = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", t);
}
window.addEventListener("storage", (e) => {
  if (e.key === "theme") applyTheme();
});
window.addEventListener("themeChanged", applyTheme);

// ── Preloader ──────────────────────────────────────────────────
function hidePreloader() {
  setTimeout(() => {
    const p = document.getElementById("preloader");
    if (p) {
      p.style.opacity = "0";
      setTimeout(() => (p.style.display = "none"), 500);
    }
  }, 900);
}

// ── Header/Sidebar ─────────────────────────────────────────────
async function loadHeaderAndSidebar() {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const hr = await fetch("header.html");
    if (hr.ok) {
      document.getElementById("header").innerHTML = await hr.text();
      const hs = document.createElement("script");
      hs.src = "js/header.js";
      document.body.appendChild(hs);
    }
    if (token) {
      const sr = await fetch("sidebar.html");
      if (sr.ok) {
        document.getElementById("sidebar").innerHTML = await sr.text();
        const ss = document.createElement("script");
        ss.src = "js/sidebar.js";
        ss.onload = () => {
          if (typeof window.updateSidebar === "function")
            window.updateSidebar();
        };
        document.body.appendChild(ss);
      }
    } else {
      const sb = document.getElementById("sidebar");
      if (sb) sb.style.display = "none";
    }
  } catch (err) {
    console.error("Component load error:", err);
  }
}

// ── Session ────────────────────────────────────────────────────
function getSession() {
  let token = localStorage.getItem("authToken");
  let raw = localStorage.getItem("userData");
  if (!token) {
    token = sessionStorage.getItem("authToken");
    raw = sessionStorage.getItem("userData");
  }
  if (!token) return null;
  try {
    return { token, user: JSON.parse(raw) };
  } catch {
    return { token, user: null };
  }
}

// ── Dirty flags ────────────────────────────────────────────────
function markDirty() {
  if (isInitialLoad) return;
  if (!isDirty) {
    isDirty = true;
    document.getElementById("saveBar").classList.add("visible");
  }
}
function clearDirty() {
  isDirty = false;
  document.getElementById("saveBar").classList.remove("visible");
}

function markSellerPaymentDirty() {
  if (isInitialLoad) return;
  sellerPaymentDirty = true;
  const btn = document.getElementById("savePaymentBtn");
  if (btn) btn.classList.add("visible");
  markDirty();
}
function clearSellerPaymentDirty() {
  sellerPaymentDirty = false;
  const btn = document.getElementById("savePaymentBtn");
  if (btn) btn.classList.remove("visible");
}

function markPrivacyDirty() {
  if (isInitialLoad) return;
  privacyDirty = true;
  const btn = document.getElementById("savePrivacyBtn");
  if (btn) btn.classList.add("visible");
  markDirty();
}
function clearPrivacyDirty() {
  privacyDirty = false;
  const btn = document.getElementById("savePrivacyBtn");
  if (btn) btn.classList.remove("visible");
}

// ── Tabs ──────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".snav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (isDirty) {
        if (!confirm("You have unsaved changes. Switch tabs and discard them?"))
          return;
        clearDirty();
      }
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  activeTab = tab;
  document
    .querySelectorAll(".snav-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document
    .querySelectorAll(".stab")
    .forEach((s) => s.classList.toggle("active", s.id === "tab-" + tab));
}

window.saveCurrentTab = function () {
  const fns = {
    profile: saveProfileSettings,
    security: null,
    seller: saveSellerSettings,
    buyer: saveBillingAddress,
    account: savePrivacySettings,
  };
  if (fns[activeTab]) fns[activeTab]();
  else clearDirty();
};

// ── Load All Settings ──────────────────────────────────────────
async function loadAllSettings() {
  const session = getSession();
  if (!session) {
    showToast("Please login to access settings", "error");
    setTimeout(() => (window.location.href = "login.html"), 1500);
    return;
  }
  try {
    const [profileRes, paymentRes, balanceRes, sessionsRes] =
      await Promise.allSettled([
        fetch(`${API_BASE_URL}/settings/profile`, {
          headers: authHeaders(session.token),
        }),
        fetch(`${API_BASE_URL}/settings/seller-payment`, {
          headers: authHeaders(session.token),
        }),
        fetch(`${API_BASE_URL}/settings/seller-balance`, {
          headers: authHeaders(session.token),
        }),
        fetch(`${API_BASE_URL}/settings/sessions`, {
          headers: authHeaders(session.token),
        }),
      ]);

    if (profileRes.status === "fulfilled" && profileRes.value.ok) {
      const d = await profileRes.value.json();
      if (d.success) populateProfile(d.user, d.social_links || []);
    }
    if (paymentRes.status === "fulfilled" && paymentRes.value.ok) {
      const d = await paymentRes.value.json();
      if (d.success) populatePayment(d.payment);
    }
    if (balanceRes.status === "fulfilled" && balanceRes.value.ok) {
      const d = await balanceRes.value.json();
      if (d.success) populateBalance(d.balance);
    }
    if (sessionsRes.status === "fulfilled" && sessionsRes.value.ok) {
      const d = await sessionsRes.value.json();
      if (d.success) populateSessions(d.sessions);
    }

    await loadBuyerOrders(session.token);
    await loadBillingAddress(session.token);
    await loadCommissionLedger(session.token);
    populateSecurityStatus();
  } catch (err) {
    console.error("Load settings error:", err);
    showToast("Failed to load some settings", "error");
  }
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ══════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════
function populateProfile(u, socialLinks) {
  userData = u;
  setValue("fullName", u.full_name || "");
  setValue("username", u.username || "");
  setValue("email", u.email || "");
  setValue("phone", u.phone || "");
  setValue("dob", u.date_of_birth ? u.date_of_birth.split("T")[0] : "");
  setValue("gender", u.gender || "");
  setValue("aboutMe", u.about_me || "");
  setValue("websiteUrl", u.website_url || "");

  const nameEl = document.getElementById("avatarDisplayName");
  const userEl = document.getElementById("avatarDisplayUser");
  if (nameEl) nameEl.textContent = u.full_name || u.username || "Your Name";
  if (userEl) userEl.textContent = "@" + (u.username || "username");

  const preview = document.getElementById("avatarPreview");
  if (preview) {
    if (u.profile_pic) {
      preview.src = u.profile_pic.startsWith("http")
        ? u.profile_pic
        : `${API_BASE_URL}/get-profile-pic/${u.profile_pic.split("/").pop()}`;
      preview.onerror = () => {
        preview.src = generateDefaultAvatar(u.full_name || u.username);
        preview.onerror = null;
      };
    } else {
      preview.src = generateDefaultAvatar(u.full_name || u.username);
    }
  }

  updateCharCount("aboutMe", "aboutCnt", 500);
  setCheck("isPrivate", !!u.is_private);
  renderSocialLinks(socialLinks);
  updateCompletion(u);
  window._pendingLocation = {
    country: u.country || "",
    state: u.state || "",
    city: u.city || "",
  };
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function setCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = val;
}

function updateCompletion(u) {
  const fields = [
    "full_name",
    "username",
    "email",
    "phone",
    "date_of_birth",
    "gender",
    "about_me",
    "country",
    "profile_pic",
  ];
  const filled = fields.filter((f) => {
    const v = u[f];
    return v !== null && v !== undefined && v !== "";
  }).length;
  const pct = Math.round((filled / fields.length) * 100);

  const svg = document.querySelector(".completion-ring svg");
  if (svg && !svg.querySelector("defs")) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `<linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e60aea"/><stop offset="100%" stop-color="#e336cc"/></linearGradient>`;
    svg.prepend(defs);
  }

  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#e60aea";
  const arc = document.getElementById("completionArc");
  const pctEl = document.getElementById("completionPct");
  const hint = document.getElementById("completionHint");
  if (arc) {
    arc.setAttribute("stroke-dasharray", `${pct},100`);
    arc.style.stroke = color;
  }
  if (pctEl) {
    pctEl.textContent = pct + "%";
    pctEl.style.color = color;
  }
  if (hint)
    hint.textContent =
      pct === 100
        ? "Profile is complete! 🎉"
        : `${fields.length - filled} field(s) missing`;
}

// ── Countries ─────────────────────────────────────────────────
async function loadCountriesForSettings() {
  try {
    const res = await fetch("js/data/countries+states+cities.json");
    const data = await res.json();
    allCountriesData = data;

    let countryEl = document.getElementById("country");
    if (countryEl && countryEl.tagName.toLowerCase() === "input") {
      const sel = document.createElement("select");
      sel.id = "country";
      sel.className = countryEl.className;
      sel.oninput = markDirty;
      sel.onchange = onSettingsCountryChange;
      countryEl.replaceWith(sel);
    }

    const countrySelect = document.getElementById("country");
    if (!countrySelect) return;
    countrySelect.innerHTML = '<option value="">Select Country</option>';
    allCountriesData.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.iso2 || c.name;
      opt.textContent = c.name;
      countrySelect.appendChild(opt);
    });

    ensureSelectForState();
    ensureSelectForCity();

    const loc = window._pendingLocation;
    if (loc && loc.country) {
      const countryData = allCountriesData.find(
        (c) => c.name === loc.country || c.iso2 === loc.country
      );
      if (countryData) {
        countrySelect.value = countryData.iso2 || countryData.name;
        await onSettingsCountryChange(null, loc.state, loc.city);
      }
    }
  } catch (err) {
    console.error("Error loading countries:", err);
  }
}

function ensureSelectForState() {
  let el = document.getElementById("state");
  if (!el) return;
  if (el.tagName.toLowerCase() === "input") {
    const sel = document.createElement("select");
    sel.id = "state";
    sel.className = el.className;
    sel.innerHTML = '<option value="">Select Country First</option>';
    sel.onchange = onSettingsStateChange;
    el.replaceWith(sel);
  }
}

function ensureSelectForCity() {
  let el = document.getElementById("city");
  if (!el) return;
  if (el.tagName.toLowerCase() === "input") {
    const sel = document.createElement("select");
    sel.id = "city";
    sel.className = el.className;
    sel.innerHTML = '<option value="">Select State First</option>';
    sel.oninput = markDirty;
    el.replaceWith(sel);
  }
}

async function onSettingsCountryChange(
  event,
  prefillState = null,
  prefillCity = null
) {
  markDirty();
  const countrySelect = document.getElementById("country");
  const countryCode = countrySelect ? countrySelect.value : "";

  let cityEl = document.getElementById("city");
  if (cityEl && cityEl.tagName.toLowerCase() === "select")
    cityEl.innerHTML = '<option value="">Select State First</option>';
  if (cityEl && cityEl.tagName.toLowerCase() === "input") cityEl.value = "";

  if (!countryCode) {
    let stateEl = document.getElementById("state");
    if (stateEl && stateEl.tagName.toLowerCase() === "select")
      stateEl.innerHTML = '<option value="">Select Country First</option>';
    return;
  }

  const countryData = allCountriesData.find(
    (c) => c.iso2 === countryCode || c.name === countryCode
  );
  if (!countryData || !countryData.states || countryData.states.length === 0) {
    let stateEl = document.getElementById("state");
    if (stateEl && stateEl.tagName.toLowerCase() === "select") {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.id = "state";
      inp.className = stateEl.className;
      inp.placeholder = "Enter your state/province";
      inp.oninput = () => {
        markDirty();
        onSettingsStateChangeText();
      };
      stateEl.replaceWith(inp);
      if (prefillState) inp.value = prefillState;
    }
    return;
  }

  let stateEl = document.getElementById("state");
  if (!stateEl || stateEl.tagName.toLowerCase() === "input") {
    const sel = document.createElement("select");
    sel.id = "state";
    sel.className = (stateEl || {}).className || "";
    stateEl && stateEl.replaceWith(sel);
    stateEl = sel;
  }

  const sorted = [...countryData.states].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  stateEl.innerHTML = '<option value="">Select State</option>';
  stateEl.onchange = onSettingsStateChange;
  sorted.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.setAttribute("data-code", s.state_code);
    opt.textContent = s.name;
    stateEl.appendChild(opt);
  });
  if (prefillState) {
    stateEl.value = prefillState;
    await onSettingsStateChange(null, prefillCity);
  }
}

async function onSettingsStateChange(event, prefillCity = null) {
  markDirty();
  const countrySelect = document.getElementById("country");
  const stateEl = document.getElementById("state");
  if (!stateEl) return;
  const stateVal = stateEl.value;
  const countryCode = countrySelect ? countrySelect.value : "";

  let cityEl = document.getElementById("city");
  if (!stateVal) {
    if (cityEl && cityEl.tagName.toLowerCase() === "select")
      cityEl.innerHTML = '<option value="">Select State First</option>';
    if (cityEl && cityEl.tagName.toLowerCase() === "input") cityEl.value = "";
    return;
  }

  const countryData = allCountriesData.find(
    (c) => c.iso2 === countryCode || c.name === countryCode
  );
  if (!countryData) return;
  const stateData = countryData.states.find((s) => s.name === stateVal);

  if (!stateData || !stateData.cities || stateData.cities.length === 0) {
    if (cityEl && cityEl.tagName.toLowerCase() === "select") {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.id = "city";
      inp.className = cityEl.className;
      inp.placeholder = "Enter your city";
      inp.oninput = markDirty;
      cityEl.replaceWith(inp);
      cityEl = inp;
    }
    if (prefillCity) cityEl.value = prefillCity;
    return;
  }

  if (!cityEl || cityEl.tagName.toLowerCase() === "input") {
    const sel = document.createElement("select");
    sel.id = "city";
    sel.className = (cityEl || {}).className || "";
    sel.oninput = markDirty;
    cityEl && cityEl.replaceWith(sel);
    cityEl = sel;
  }

  const sorted = [...stateData.cities].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  cityEl.innerHTML = '<option value="">Select City</option>';
  sorted.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    cityEl.appendChild(opt);
  });
  if (prefillCity) cityEl.value = prefillCity;
}

function onSettingsStateChangeText() {
  let cityEl = document.getElementById("city");
  if (cityEl && cityEl.tagName.toLowerCase() === "select")
    cityEl.innerHTML = '<option value="">Select City</option>';
  markDirty();
}

// ── Social Links ──────────────────────────────────────────────
const PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    icon: "pi-instagram",
    fa: "fab fa-instagram",
  },
  {
    id: "twitter",
    label: "Twitter / X",
    icon: "pi-twitter",
    fa: "fab fa-twitter",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "pi-facebook",
    fa: "fab fa-facebook-f",
  },
  { id: "youtube", label: "YouTube", icon: "pi-youtube", fa: "fab fa-youtube" },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "pi-linkedin",
    fa: "fab fa-linkedin-in",
  },
  { id: "github", label: "GitHub", icon: "pi-github", fa: "fab fa-github" },
  { id: "website", label: "Website", icon: "pi-website", fa: "fas fa-globe" },
];

function renderSocialLinks(links) {
  const grid = document.getElementById("socialLinksGrid");
  if (!grid) return;
  grid.innerHTML = "";
  (links || []).forEach((link) => addSocialLinkRow(link.platform, link.url));
}

window.addSocialLink = function () {
  addSocialLinkRow("website", "");
  markDirty();
};

function addSocialLinkRow(platform, url) {
  const grid = document.getElementById("socialLinksGrid");
  const p = PLATFORMS.find((x) => x.id === platform) || PLATFORMS[6];
  const row = document.createElement("div");
  row.className = "social-row";
  row.innerHTML = `
    <select class="social-plat-sel" onchange="updatePlatformIcon(this)" style="width:130px;padding:6px 8px;font-size:.82rem;">
      ${PLATFORMS.map(
        (x) =>
          `<option value="${x.id}" ${x.id === platform ? "selected" : ""}>${
            x.label
          }</option>`
      ).join("")}
    </select>
    <div class="plat-icon ${p.icon}"><i class="${p.fa}"></i></div>
    <input type="url" value="${escHtml(
      url
    )}" placeholder="https://..." oninput="markDirty()" />
    <button class="rm-social" onclick="this.closest('.social-row').remove(); markDirty();" title="Remove"><i class="fas fa-times"></i></button>`;
  grid.appendChild(row);
}

window.updatePlatformIcon = function (sel) {
  const row = sel.closest(".social-row");
  const p = PLATFORMS.find((x) => x.id === sel.value) || PLATFORMS[6];
  const ico = row.querySelector(".plat-icon");
  ico.className = "plat-icon " + p.icon;
  ico.innerHTML = `<i class="${p.fa}"></i>`;
  markDirty();
};

// ── Avatar Cropper ────────────────────────────────────────────
function setupAvatarCropper() {
  const input = document.getElementById("avatarInput");
  if (!input) return;

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "error");
      return;
    }
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      showToast("Please select JPG, PNG, GIF or WEBP", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => openSettingsCropModal(ev.target.result);
    reader.readAsDataURL(file);
  });

  if (!document.getElementById("settingsCropModal")) {
    const html = `
      <div id="settingsCropModal" style="display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);align-items:center;justify-content:center;">
        <div style="background:var(--card);border-radius:20px;width:90%;max-width:560px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:2px solid var(--border-p);">
            <h3 style="font-size:1.1rem;font-weight:700;display:flex;gap:8px;align-items:center;"><i class="fas fa-crop-alt" style="color:var(--purple)"></i> Crop Profile Picture</h3>
            <button onclick="closeSettingsCropModal()" style="width:34px;height:34px;border-radius:50%;border:none;background:var(--lp);color:var(--purple);cursor:pointer;font-size:1rem;"><i class="fas fa-times"></i></button>
          </div>
          <div style="padding:20px;max-height:400px;overflow:hidden;background:var(--bg2);">
            <img id="settingsCropImg" src="" alt="" style="display:block;max-width:100%;" />
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;padding:14px 20px;background:var(--bg2);justify-content:center;">
            <button onclick="scCrop('rotateL')" class="btn-outline-xs"><i class="fas fa-undo"></i> Left</button>
            <button onclick="scCrop('rotateR')" class="btn-outline-xs"><i class="fas fa-redo"></i> Right</button>
            <button onclick="scCrop('flipH')"   class="btn-outline-xs"><i class="fas fa-arrows-alt-h"></i> Flip H</button>
            <button onclick="scCrop('flipV')"   class="btn-outline-xs"><i class="fas fa-arrows-alt-v"></i> Flip V</button>
            <button onclick="scCrop('reset')"   class="btn-outline-xs"><i class="fas fa-sync"></i> Reset</button>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end;padding:16px 22px;border-top:2px solid var(--border-p);">
            <button onclick="closeSettingsCropModal()" class="btn-cancel">Cancel</button>
            <button onclick="applySettingsCrop()" class="btn-primary"><i class="fas fa-check"></i> Apply & Upload</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
  }
}

function openSettingsCropModal(src) {
  const modal = document.getElementById("settingsCropModal");
  const img = document.getElementById("settingsCropImg");
  if (!modal || !img) return;
  img.src = src;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    if (regCropper) {
      regCropper.destroy();
      regCropper = null;
    }
    if (typeof Cropper !== "undefined") {
      regCropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        background: false,
      });
    } else {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js";
      s.onload = () => {
        regCropper = new Cropper(img, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 1,
          background: false,
        });
      };
      document.head.appendChild(s);
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href =
        "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css";
      document.head.appendChild(l);
    }
  }, 100);
}

window.scCrop = function (action) {
  if (!regCropper) return;
  if (action === "rotateL") regCropper.rotate(-90);
  if (action === "rotateR") regCropper.rotate(90);
  if (action === "flipH")
    regCropper.scaleX(-(regCropper.getData().scaleX || 1));
  if (action === "flipV")
    regCropper.scaleY(-(regCropper.getData().scaleY || 1));
  if (action === "reset") regCropper.reset();
};

window.closeSettingsCropModal = function () {
  const modal = document.getElementById("settingsCropModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "auto";
  if (regCropper) {
    regCropper.destroy();
    regCropper = null;
  }
  const input = document.getElementById("avatarInput");
  if (input) input.value = "";
};

window.applySettingsCrop = async function () {
  if (!regCropper) {
    showToast("No image to crop", "error");
    return;
  }
  const canvas = regCropper.getCroppedCanvas({
    width: 400,
    height: 400,
    imageSmoothingQuality: "high",
  });
  canvas.toBlob(
    async (blob) => {
      if (!blob) {
        showToast("Failed to create image", "error");
        return;
      }
      closeSettingsCropModal();
      const prev = document.getElementById("avatarPreview");
      if (prev) prev.src = URL.createObjectURL(blob);
      await uploadAvatarBlob(blob);
    },
    "image/jpeg",
    0.9
  );
};

async function uploadAvatarBlob(blob) {
  const session = getSession();
  if (!session) return;
  const form = new FormData();
  form.append("profile_pic", blob, "profile.jpg");
  showToast("Uploading photo…", "info");
  try {
    const res = await fetch(`${API_BASE_URL}/profile/update`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      body: form,
    });
    const d = await res.json();
    if (d.success) {
      showToast("Profile picture updated!", "success");
      if (d.profile && userData) {
        userData.profile_pic = d.profile.profile_pic;
        updateCompletion(userData);
      }
    } else showToast(d.message || "Upload failed", "error");
  } catch {
    showToast("Upload failed — check your connection", "error");
  }
}

window.removeAvatar = async function () {
  if (!confirm("Remove profile picture?")) return;
  const session = getSession();
  if (!session) return;
  try {
    const res = await fetch(`${API_BASE_URL}/profile/remove-picture`, {
      method: "DELETE",
      headers: authHeaders(session.token),
    });
    const d = await res.json();
    if (d.success) {
      const prev = document.getElementById("avatarPreview");
      if (prev) prev.src = "images/default-avatar.png";
      showToast("Profile picture removed", "success");
    } else showToast(d.message || "Failed", "error");
  } catch {
    showToast("Failed to remove picture", "error");
  }
};

// ── Username ──────────────────────────────────────────────────
window.onUsernameInput = function () {
  markDirty();
  clearTimeout(usernameCheckTimer);
  const val = document.getElementById("username").value.trim();
  const st = document.getElementById("unStatus");
  if (!val || val === userData?.username) {
    st.textContent = "";
    st.className = "un-status";
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(val)) {
    st.textContent = "Invalid characters";
    st.className = "un-status un-taken";
    return;
  }
  st.textContent = "Checking…";
  st.className = "un-status un-checking";
  usernameCheckTimer = setTimeout(() => checkUsername(val), 600);
};

async function checkUsername(username) {
  const st = document.getElementById("unStatus");
  try {
    const res = await fetch(
      `${API_BASE_URL}/settings/check-username?username=${encodeURIComponent(
        username
      )}`
    );
    const d = await res.json();
    if (d.available) {
      st.textContent = "✓ Available";
      st.className = "un-status un-ok";
    } else {
      st.textContent = "✗ Taken";
      st.className = "un-status un-taken";
    }
  } catch {
    st.textContent = "";
    st.className = "un-status";
  }
}

window.onAboutInput = function () {
  markDirty();
  updateCharCount("aboutMe", "aboutCnt", 500);
};
function updateCharCount(inputId, cntId, max) {
  const el = document.getElementById(inputId);
  const cnt = document.getElementById(cntId);
  if (el && cnt) cnt.textContent = `${el.value.length}/${max}`;
}

// ── Profile Validation ────────────────────────────────────────
function validateProfileFields() {
  const errors = [];
  const fullName = (document.getElementById("fullName")?.value || "").trim();
  if (fullName && !/^[a-zA-Z\s]+$/.test(fullName))
    errors.push("Full name should only contain letters and spaces.");
  const username = (document.getElementById("username")?.value || "").trim();
  if (username) {
    if (/\s/.test(username)) errors.push("Username cannot contain spaces.");
    else if (username.length < 3 || username.length > 50)
      errors.push("Username must be 3–50 characters.");
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      errors.push("Username can only contain letters, numbers and underscore.");
    const st = document.getElementById("unStatus");
    if (st && st.classList.contains("un-taken"))
      errors.push("Username is already taken.");
  }
  const phone = (document.getElementById("phone")?.value || "").trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15)
      errors.push("Phone number must be 10–15 digits.");
  }
  const dob = document.getElementById("dob")?.value;
  if (dob) {
    const dobDate = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dobDate >= today) errors.push("Date of birth must be in the past.");
  }
  const aboutMe = (document.getElementById("aboutMe")?.value || "").trim();
  if (aboutMe.length > 500)
    errors.push("About Me cannot exceed 500 characters.");
  const website = (document.getElementById("websiteUrl")?.value || "").trim();
  if (website && !/^https?:\/\//i.test(website))
    errors.push("Website URL must start with http:// or https://");
  return errors;
}

window.saveProfileSettings = async function () {
  const errors = validateProfileFields();
  if (errors.length > 0) {
    showValidationModal(errors);
    return;
  }
  showConfirmSaveModal(async () => {
    const session = getSession();
    if (!session) return;
    const countryEl = document.getElementById("country");
    let countryValue = "";
    if (countryEl) {
      if (countryEl.tagName.toLowerCase() === "select") {
        const opt = countryEl.options[countryEl.selectedIndex];
        countryValue = opt ? opt.text : "";
        if (countryValue === "Select Country") countryValue = "";
      } else countryValue = countryEl.value.trim();
    }
    const stateEl = document.getElementById("state");
    const stateValue = stateEl ? stateEl.value.trim() : "";
    const cityEl = document.getElementById("city");
    const cityValue = cityEl ? cityEl.value.trim() : "";
    const links = [];
    document.querySelectorAll(".social-row").forEach((row) => {
      const plat = row.querySelector(".social-plat-sel")?.value;
      const url = row.querySelector("input[type=url]")?.value.trim();
      if (plat && url) links.push({ platform: plat, url });
    });
    const payload = {
      full_name: (document.getElementById("fullName")?.value || "").trim(),
      username: (document.getElementById("username")?.value || "").trim(),
      phone: (document.getElementById("phone")?.value || "").trim(),
      date_of_birth: document.getElementById("dob")?.value || null,
      gender: document.getElementById("gender")?.value || "",
      about_me: (document.getElementById("aboutMe")?.value || "").trim(),
      country: countryValue,
      state: stateValue,
      city: cityValue,
      website_url: (document.getElementById("websiteUrl")?.value || "").trim(),
      social_links: links,
    };
    if (payload.website_url && !/^https?:\/\//i.test(payload.website_url))
      payload.website_url = "https://" + payload.website_url;
    try {
      const res = await fetch(`${API_BASE_URL}/settings/profile`, {
        method: "PUT",
        headers: authHeaders(session.token),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        showToast("Profile saved successfully!", "success");
        clearDirty();
        const nameEl = document.getElementById("avatarDisplayName");
        if (nameEl && payload.full_name) nameEl.textContent = payload.full_name;
        if (userData) {
          userData = { ...userData, ...payload };
          updateCompletion(userData);
        }
      } else showToast(d.message || "Save failed", "error");
    } catch {
      showToast("Failed to save profile", "error");
    }
  });
};

function showValidationModal(errors) {
  const existing = document.getElementById("validationModal");
  if (existing) existing.remove();
  const html = `
    <div id="validationModal" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:var(--card);border-radius:18px;padding:32px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.4);border:2px solid rgba(239,68,68,.3);">
        <div style="width:56px;height:56px;border-radius:50%;background:#fef2f2;color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 16px;"><i class="fas fa-exclamation-triangle"></i></div>
        <h3 style="text-align:center;font-size:1.1rem;font-weight:800;margin-bottom:12px;color:#ef4444;">Please fix these issues</h3>
        <ul style="padding-left:18px;margin-bottom:22px;display:flex;flex-direction:column;gap:6px;">${errors
          .map(
            (e) => `<li style="font-size:.88rem;color:var(--txt2)">${e}</li>`
          )
          .join("")}</ul>
        <button onclick="document.getElementById('validationModal').remove()" style="width:100%;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;">OK, I'll Fix It</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function showConfirmSaveModal(onConfirm) {
  const existing = document.getElementById("confirmSaveModal");
  if (existing) existing.remove();
  const html = `
    <div id="confirmSaveModal" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:var(--card);border-radius:18px;padding:32px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.4);border:2px solid var(--border-p);text-align:center;">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--lp);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin:0 auto 16px;"><i class="fas fa-floppy-disk"></i></div>
        <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:8px;">Save Profile Changes?</h3>
        <p style="font-size:.88rem;color:var(--txt2);margin-bottom:24px;">Your profile will be updated with the new information.</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button onclick="document.getElementById('confirmSaveModal').remove()" class="btn-cancel">Cancel</button>
          <button id="confirmSaveBtn" class="btn-primary"><i class="fas fa-check"></i> Save</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  document.getElementById("confirmSaveBtn").addEventListener("click", () => {
    document.getElementById("confirmSaveModal").remove();
    onConfirm();
  });
}

// ══════════════════════════════════════════════════════════════
// PASSWORD
// ══════════════════════════════════════════════════════════════
window.togglePw = function (id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const isText = el.type === "text";
  el.type = isText ? "password" : "text";
  btn.querySelector("i").className = isText ? "fas fa-eye" : "fas fa-eye-slash";
};

window.checkStrength = function (val) {
  const fill = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");
  if (!fill || !label) return;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const map = [
    { w: "0%", bg: "#ef4444", txt: "Too short" },
    { w: "25%", bg: "#ef4444", txt: "Weak" },
    { w: "50%", bg: "#f59e0b", txt: "Fair" },
    { w: "75%", bg: "#3b82f6", txt: "Good" },
    { w: "100%", bg: "#22c55e", txt: "Strong 💪" },
  ];
  const m = map[score];
  fill.style.width = m.w;
  fill.style.background = m.bg;
  label.textContent = val ? m.txt : "";
  label.style.color = m.bg;
};

window.changePassword = async function () {
  const session = getSession();
  if (!session) return;
  const cur = document.getElementById("currentPw")?.value;
  const nw = document.getElementById("newPw")?.value;
  const conf = document.getElementById("confirmPw")?.value;
  if (!cur || !nw || !conf) {
    showToast("Fill all password fields", "error");
    return;
  }
  if (nw.length < 8) {
    showToast("Password must be at least 8 characters", "error");
    return;
  }
  if (/\s/.test(nw)) {
    showToast("Password cannot contain spaces", "error");
    return;
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nw)) {
    showToast("Password needs at least one special character", "error");
    return;
  }
  if (nw !== conf) {
    showToast("New passwords do not match", "error");
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/settings/change-password`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ current_password: cur, new_password: nw }),
    });
    const d = await res.json();
    if (d.success) {
      showToast("Password updated successfully!", "success");
      ["currentPw", "newPw", "confirmPw"].forEach((id) => setValue(id, ""));
      document.getElementById("strengthFill").style.width = "0";
      document.getElementById("strengthLabel").textContent = "";
    } else showToast(d.message || "Failed to change password", "error");
  } catch {
    showToast("Failed to change password", "error");
  }
};

// ══════════════════════════════════════════════════════════════
// SECURITY STATUS
// ══════════════════════════════════════════════════════════════
function populateSecurityStatus() {
  const session = getSession();
  if (!session) return;
  const list = document.getElementById("secStatusList");
  if (!list) return;
  fetch(`${API_BASE_URL}/settings/security-status`, {
    headers: authHeaders(session.token),
  })
    .then((r) => r.json())
    .then((d) => {
      if (!d.success) throw new Error();
      const s = d.status;
      list.innerHTML = `
        <div class="sec-row">
          <div class="sec-ico ${s.is_locked ? "bad" : "safe"}"><i class="fas ${
        s.is_locked ? "fa-lock" : "fa-lock-open"
      }"></i></div>
          <div class="sec-row-info"><strong>Account Status</strong><span>${
            s.is_locked
              ? `Locked until ${new Date(s.locked_until).toLocaleString()}`
              : "Account is active"
          }</span></div>
          <span class="status-pill ${s.is_locked ? "pill-bad" : "pill-safe"}">${
        s.is_locked ? "Locked" : "Active"
      }</span>
        </div>
        <div class="sec-row">
          <div class="sec-ico ${
            s.login_attempts > 3 ? "warn" : "safe"
          }"><i class="fas fa-circle-exclamation"></i></div>
          <div class="sec-row-info"><strong>Failed Login Attempts</strong><span>${
            s.login_attempts
          } failed attempt${s.login_attempts !== 1 ? "s" : ""}</span></div>
          <span class="status-pill ${
            s.login_attempts > 3 ? "pill-warn" : "pill-safe"
          }">${s.login_attempts > 3 ? "Warning" : "OK"}</span>
        </div>
        <div class="sec-row">
          <div class="sec-ico safe"><i class="fas fa-clock"></i></div>
          <div class="sec-row-info"><strong>Last Login</strong><span>${
            s.last_login ? new Date(s.last_login).toLocaleString() : "Never"
          }</span></div>
          <span class="status-pill pill-safe">Info</span>
        </div>`;
    })
    .catch(() => {
      if (list)
        list.innerHTML = `<div class="empty-box"><i class="fas fa-shield-halved"></i><p>Could not load security status</p></div>`;
    });
}

// ══════════════════════════════════════════════════════════════
// SESSIONS
// ══════════════════════════════════════════════════════════════
function populateSessions(sessions) {
  const list = document.getElementById("sessionsList");
  if (!list) return;
  if (!sessions || sessions.length === 0) {
    list.innerHTML = `<div class="empty-box"><i class="fas fa-desktop"></i><p>No active sessions found</p></div>`;
    return;
  }
  const deviceIcon = (ua) => {
    if (/Mobile|Android/i.test(ua)) return "fa-mobile-screen";
    if (/Tablet|iPad/i.test(ua)) return "fa-tablet";
    return "fa-desktop";
  };
  list.innerHTML = sessions
    .map(
      (s) => `
    <div class="session-item">
      <div class="sess-ico"><i class="fas ${deviceIcon(
        s.user_agent || ""
      )}"></i></div>
      <div class="sess-info"><strong>${getDeviceName(
        s.user_agent || "Unknown Device"
      )}</strong><small>IP: ${
        s.ip_address || "Unknown"
      } &nbsp;·&nbsp; ${formatTimeAgo(s.created_at)}</small></div>
      ${
        s.is_current
          ? '<span class="curr-badge">Current</span>'
          : `<button class="btn-danger-xs" onclick="logoutSession(${s.session_id})"><i class="fas fa-sign-out-alt"></i></button>`
      }
    </div>`
    )
    .join("");
}

window.logoutSession = async function (sessionId) {
  if (!confirm("Logout this device?")) return;
  const session = getSession();
  if (!session) return;
  try {
    const res = await fetch(
      `${API_BASE_URL}/settings/logout-session/${sessionId}`,
      { method: "DELETE", headers: authHeaders(session.token) }
    );
    const d = await res.json();
    if (d.success) {
      showToast("Device logged out", "success");
      const sr = await fetch(`${API_BASE_URL}/settings/sessions`, {
        headers: authHeaders(session.token),
      });
      const sd = await sr.json();
      if (sd.success) populateSessions(sd.sessions);
    } else showToast(d.message || "Failed", "error");
  } catch {
    showToast("Failed to logout device", "error");
  }
};

window.logoutAllDevices = async function () {
  if (!confirm("This will log you out from all other devices. Continue?"))
    return;
  const session = getSession();
  if (!session) return;
  try {
    const res = await fetch(`${API_BASE_URL}/settings/logout-all-sessions`, {
      method: "DELETE",
      headers: authHeaders(session.token),
    });
    const d = await res.json();
    if (d.success) {
      showToast("All other sessions terminated", "success");
      const sr = await fetch(`${API_BASE_URL}/settings/sessions`, {
        headers: authHeaders(session.token),
      });
      const sd = await sr.json();
      if (sd.success) populateSessions(sd.sessions);
    } else showToast(d.message || "Failed", "error");
  } catch {
    showToast("Failed", "error");
  }
};

function getDeviceName(ua) {
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown Device";
}

// ══════════════════════════════════════════════════════════════
// SELLER — BALANCE (redesigned)
// ══════════════════════════════════════════════════════════════
function populateBalance(b) {
  if (!b) return;
  const fmt = (v) =>
    "₹" +
    (parseFloat(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const el = (id) => document.getElementById(id);
  if (el("availBal")) el("availBal").textContent = fmt(b.available_balance);
  if (el("totalEarn")) el("totalEarn").textContent = fmt(b.total_earnings);
  if (el("pendingBal")) el("pendingBal").textContent = fmt(b.pending_clearance);
  if (el("totalSales")) el("totalSales").textContent = b.total_sales || 0;
  currentAvailableBalance = parseFloat(b.available_balance) || 0;
  const session = getSession();
  if (session) loadWithdrawalRequests(session.token);
}

window.refreshBalance = async function () {
  const session = getSession();
  if (!session) return;
  showToast("Refreshing balance…", "info");
  try {
    const res = await fetch(`${API_BASE_URL}/settings/seller-balance`, {
      headers: authHeaders(session.token),
    });
    const d = await res.json();
    if (d.success) {
      populateBalance(d.balance);
      showToast("Balance updated!", "success");
    }
  } catch {
    showToast("Refresh failed", "error");
  }
};

// ── Payment Settings ───────────────────────────────────────────
function populatePayment(p) {
  if (!p) return;
  setCheck("acceptsUpi", !!p.accepts_upi);
  if (p.accepts_upi) toggleSection("upiSection", true);
  setValue("upiId", p.upi_id || "");
  setValue("upiName", p.upi_name || "");
  setCheck("acceptsBank", !!p.accepts_bank_transfer);
  if (p.accepts_bank_transfer) toggleSection("bankSection", true);
  setValue("bankName", p.bank_name || "");
  setValue("bankHolder", p.bank_holder_name || "");
  setValue("bankAccNo", p.bank_account_number || "");
  setValue("bankIfsc", p.bank_ifsc_code || "");
  setValue("bankBranch", p.bank_branch || "");
}

window.toggleSection = function (id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? "block" : "none";
  if (!isInitialLoad) markSellerPaymentDirty();
};

window.saveSellerSettings = async function () {
  const session = getSession();
  if (!session) return;
  const acceptsUpi = document.getElementById("acceptsUpi")?.checked;
  const upiId = document.getElementById("upiId")?.value.trim();
  const upiName = document.getElementById("upiName")?.value.trim();
  if (acceptsUpi) {
    if (!upiId) {
      showToast("UPI ID is required", "error");
      return;
    }
    if (!upiName) {
      showToast("UPI Account Name is required", "error");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(upiId)) {
      showToast("Invalid UPI ID format (e.g., yourname@upi)", "error");
      return;
    }
  }
  const acceptsBank = document.getElementById("acceptsBank")?.checked;
  const bankName = document.getElementById("bankName")?.value.trim();
  const bankHolder = document.getElementById("bankHolder")?.value.trim();
  const bankAccNo = document.getElementById("bankAccNo")?.value.trim();
  const bankIfsc = document.getElementById("bankIfsc")?.value.trim();
  const bankBranch = document.getElementById("bankBranch")?.value.trim();
  if (acceptsBank) {
    if (!bankName) {
      showToast("Bank Name is required", "error");
      return;
    }
    if (!bankHolder) {
      showToast("Account Holder Name is required", "error");
      return;
    }
    if (!bankAccNo) {
      showToast("Bank Account Number is required", "error");
      return;
    }
    if (!/^\d{9,18}$/.test(bankAccNo)) {
      showToast("Account Number must be 9-18 digits", "error");
      return;
    }
    if (!bankIfsc) {
      showToast("IFSC Code is required", "error");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc.toUpperCase())) {
      showToast("Invalid IFSC Code format (e.g., SBIN0001234)", "error");
      return;
    }
    if (!bankBranch) {
      showToast("Branch Name is required", "error");
      return;
    }
  }
  const payload = {
    accepts_upi: acceptsUpi,
    upi_id: upiId,
    upi_name: upiName,
    accepts_bank_transfer: acceptsBank,
    bank_name: bankName,
    bank_holder_name: bankHolder,
    bank_account_number: bankAccNo,
    bank_ifsc_code: bankIfsc ? bankIfsc.toUpperCase() : "",
    bank_branch: bankBranch,
  };
  try {
    const res = await fetch(`${API_BASE_URL}/settings/seller-payment`, {
      method: "PUT",
      headers: authHeaders(session.token),
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (d.success) {
      showToast("Payment settings saved!", "success");
      clearDirty();
      clearSellerPaymentDirty();
    } else showToast(d.message || "Save failed", "error");
  } catch {
    showToast("Failed to save settings", "error");
  }
};

// ── Withdrawal Requests — Card Layout ─────────────────────────
async function loadWithdrawalRequests(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/settings/withdrawal-requests`, {
      headers: authHeaders(token),
    });
    const d = await res.json();
    if (d.success) renderWithdrawals(d.requests);
  } catch (err) {
    console.error("Load withdrawals error:", err);
  }
}

function renderWithdrawals(requests) {
  const list = document.getElementById("withdrawalsList");
  if (!list) return;
  if (!requests || requests.length === 0) {
    list.innerHTML = `<div class="empty-box"><i class="fas fa-money-bill-transfer"></i><p>No withdrawal requests yet</p></div>`;
    return;
  }

  const statusConfig = {
    pending: {
      icon: "fa-clock",
      cls: "pending",
      badge: "wd-badge-pending",
      prog: 35,
      progClr: "var(--amber)",
      label: "Pending Review",
    },
    approved: {
      icon: "fa-check-circle",
      cls: "approved",
      badge: "wd-badge-approved",
      prog: 70,
      progClr: "var(--blue)",
      label: "Approved",
    },
    completed: {
      icon: "fa-circle-check",
      cls: "completed",
      badge: "wd-badge-completed",
      prog: 100,
      progClr: "var(--green)",
      label: "Paid ✓",
    },
    rejected: {
      icon: "fa-circle-xmark",
      cls: "rejected",
      badge: "wd-badge-rejected",
      prog: 100,
      progClr: "var(--red)",
      label: "Rejected",
    },
  };

  list.innerHTML =
    `<div class="withdrawal-cards-grid">` +
    requests
      .map((r) => {
        const cfg = statusConfig[r.status] || statusConfig.pending;
        const reqDate = r.request_date
          ? new Date(r.request_date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—";
        const paidDate = r.processed_date
          ? new Date(r.processed_date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null;
        return `
    <div class="wd-card">
      <div class="wd-card-top">
        <div class="wd-card-icon ${cfg.cls}"><i class="fas ${
          cfg.icon
        }"></i></div>
        <div class="wd-card-main">
          <div class="wd-card-amount">₹${parseFloat(r.amount).toLocaleString(
            "en-IN",
            { minimumFractionDigits: 2 }
          )}</div>
          <div class="wd-card-date"><i class="fas fa-calendar-alt" style="font-size:.7rem;margin-right:3px;"></i>${reqDate}</div>
        </div>
        <span class="wd-card-badge ${cfg.badge}">${cfg.label}</span>
      </div>
      ${
        r.status !== "pending"
          ? ""
          : `
        <div class="wd-card-progress">
          <div class="wd-card-progress-fill" style="width:${cfg.prog}%;background:${cfg.progClr};"></div>
        </div>`
      }
      <div class="wd-card-footer">
        <div class="wd-card-meta">
          ${
            r.payment_method
              ? `<div><strong>Method:</strong> ${r.payment_method}</div>`
              : ""
          }
          ${paidDate ? `<div><strong>Paid on:</strong> ${paidDate}</div>` : ""}
          ${
            r.admin_notes
              ? `<div><strong>Note:</strong> ${r.admin_notes}</div>`
              : ""
          }
          ${
            r.payment_reference
              ? `<div><strong>Ref:</strong> ${r.payment_reference}</div>`
              : ""
          }
        </div>
        ""
      </div>
    </div>`;
      })
      .join("") +
    `</div>`;
}

window.showWithdrawModal = function () {
  const modal = document.getElementById("withdrawModal");
  const availEl = document.getElementById("withdrawAvailable");
  if (availEl)
    availEl.textContent = `₹${currentAvailableBalance.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    })}`;
  modal.style.display = "flex";
};
window.closeWithdrawModal = function () {
  document.getElementById("withdrawModal").style.display = "none";
  document.getElementById("withdrawAmount").value = "";
};

window.submitWithdrawal = async function () {
  const session = getSession();
  if (!session) return;
  const amount = parseFloat(
    document.getElementById("withdrawAmount")?.value || 0
  );
  if (amount < 100) {
    showToast("Minimum withdrawal is ₹100", "error");
    return;
  }
  if (amount > currentAvailableBalance) {
    showToast("Insufficient balance", "error");
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/settings/withdrawal-requests`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ amount }),
    });
    const d = await res.json();
    if (d.success) {
      showToast(d.message, "success");
      closeWithdrawModal();
      await loadWithdrawalRequests(session.token);
      const balRes = await fetch(`${API_BASE_URL}/settings/seller-balance`, {
        headers: authHeaders(session.token),
      });
      const balData = await balRes.json();
      if (balData.success) populateBalance(balData.balance);
    } else showToast(d.message || "Request failed", "error");
  } catch {
    showToast("Failed to submit request", "error");
  }
};

// ── Commission Ledger — Table View ────────────────────────────
async function loadCommissionLedger(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/payments/my-commission-ledger`, {
      headers: authHeaders(token),
    });
    const d = await res.json();
    if (d.success)
      renderCommissionLedger(
        d.ledger,
        d.commission_deficit,
        d.is_withdrawal_blocked
      );
  } catch (err) {
    console.warn("Could not load commission ledger:", err);
  }
}
function renderCommissionLedger(entries, deficit, isBlocked) {
  const deficitBanner = document.getElementById("commissionDeficitBanner");
  if (deficitBanner) {
    if (deficit > 0) {
      deficitBanner.style.display = "flex";
      deficitBanner.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size:1.4rem;color:#f59e0b;"></i><div><strong>Outstanding Commission Deficit: ₹${parseFloat(
        deficit
      ).toFixed(
        2
      )}</strong><p style="font-size:.82rem;margin:2px 0 0;color:var(--txt2);">This amount will be automatically recovered from your next order earnings.${
        isBlocked
          ? '<br><span style="color:var(--red);">⛔ Withdrawals are blocked until deficit is cleared.</span>'
          : ""
      }</p></div>`;
    } else {
      deficitBanner.style.display = "none";
    }
  }

  const list = document.getElementById("commissionLedgerList");
  if (!list) return;
  if (!entries || entries.length === 0) {
    list.innerHTML = `<div class="empty-box"><i class="fas fa-receipt"></i><p>No commission events yet</p></div>`;
    return;
  }

  const eventCfg = {
    online_commission: {
      icon: "fa-percent",
      bg: "rgba(230,10,234,.12)",
      color: "#e60aea",
      label: "Online Commission",
    },
    cod_commission: {
      icon: "fa-money-bill-wave",
      bg: "rgba(245,158,11,.12)",
      color: "#b45309",
      label: "COD Commission",
    },
    cod_deficit: {
      icon: "fa-triangle-exclamation",
      bg: "rgba(239,68,68,.12)",
      color: "#dc2626",
      label: "COD Deficit",
    },
    deficit_recovery: {
      icon: "fa-circle-up",
      // ✅ CHANGED: Red colors to show this is a deduction (money going out)
      bg: "rgba(239,68,68,.12)",
      color: "#dc2626",
      label: "Deficit Recovered",
    },
    withdrawal: {
      icon: "fa-money-bill-transfer",
      bg: "rgba(59,130,246,.12)",
      color: "#1d4ed8",
      label: "Withdrawal",
    },
    refund_reversal: {
      icon: "fa-rotate-left",
      bg: "rgba(139,92,246,.12)",
      color: "#7c3aed",
      label: "Refund Reversal",
    },
  };

  list.innerHTML = `
    <div class="ledger-table-wrap">
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Order / Product</th>
            <th>Date</th>
            <th>Commission</th>
            <th style="text-align:right;">Net Amount</th>
            <th style="text-align:right;">Balance After</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map((e) => {
              const cfg = eventCfg[e.event_type] || {
                icon: "fa-circle",
                bg: "rgba(100,100,100,.12)",
                color: "#666",
                label: e.event_type,
              };
              const date = e.created_at
                ? new Date(e.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              const netAmt = parseFloat(e.net_credit) || 0;

              // ✅ FIXED: deficit_recovery entries now have NEGATIVE net_credit (-recover)
              // isPos correctly identifies: positive = green (+), negative = red (-)
              const isPos = netAmt >= 0;

              return `
      <tr>
        <td>
          <div class="ledger-type-cell">
            <div class="ledger-type-ico" style="background:${cfg.bg};color:${
                cfg.color
              };"><i class="fas ${cfg.icon}"></i></div>
            <div>
              <div class="ledger-type-name">${cfg.label}</div>
              ${
                e.notes
                  ? `<div class="ledger-type-sub">${escHtml(e.notes)}</div>`
                  : ""
              }
            </div>
          </div>
        </td>
        <td>
          <div style="font-size:.82rem;font-weight:600;">
            ${e.order_id ? `#${e.order_id}` : "—"}
          </div>
          ${
            e.product_name
              ? `<div class="ledger-type-sub">${escHtml(e.product_name)}</div>`
              : ""
          }
        </td>
        <td style="font-size:.8rem;color:var(--txt2);white-space:nowrap;">
          ${date}
        </td>
        <td style="font-size:.8rem;color:var(--txt2);">
          ${
            e.commission_pct > 0
              ? `${
                  e.commission_pct
                }%<br><span style="font-size:.72rem;">₹${parseFloat(
                  e.commission_amt
                ).toFixed(2)}</span>`
              : "—"
          }
        </td>
        <td style="text-align:right;" class="${
          isPos ? "ledger-amount-pos" : "ledger-amount-neg"
        }">
          <strong>${isPos ? "+" : ""}₹${Math.abs(netAmt).toFixed(2)}</strong>
        </td>
        <td style="text-align:right;" class="ledger-bal">
          ${
            e.seller_balance_after != null
              ? `₹${parseFloat(e.seller_balance_after).toFixed(2)}`
              : "—"
          }
        </td>
      </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// BUYER ORDERS — Card view with product image
// ══════════════════════════════════════════════════════════════
async function loadBuyerOrders(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/settings/my-orders`, {
      headers: authHeaders(token),
    });
    const d = await res.json();
    if (d.success) renderOrders(d.orders);
  } catch {
    /* silently fail */
  }
}

function renderOrders(orders) {
  const list = document.getElementById("ordersList");
  const pill = document.getElementById("orderPill");
  if (!list) return;
  if (pill) pill.textContent = (orders?.length || 0) + " orders";
  if (!orders || orders.length === 0) {
    list.innerHTML = `<div class="empty-box"><i class="fas fa-box-open"></i><p>No orders yet</p></div>`;
    return;
  }

  const statusConfig = {
    confirmed: { cls: "ob-ok", icon: "fa-check" },
    pending: { cls: "ob-pend", icon: "fa-clock" },
    delivered: { cls: "ob-del", icon: "fa-truck-ramp-box" },
    completed: { cls: "ob-ok", icon: "fa-circle-check" },
    cancelled: { cls: "ob-can", icon: "fa-xmark" },
    rejected: { cls: "ob-can", icon: "fa-ban" },
    refunded: { cls: "ob-pend", icon: "fa-rotate-left" },
  };

  list.innerHTML =
    `<div class="order-cards-grid">` +
    orders
      .map((o) => {
        const cfg = statusConfig[o.status] || {
          cls: "ob-pend",
          icon: "fa-circle",
        };
        const date = o.order_date
          ? new Date(o.order_date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—";
        const isService = o.order_type === "service";

        // Build image section
        let imgHtml = "";
        if (o.product_image && !o.product_image.includes("undefined")) {
          const imgSrc = o.product_image.startsWith("http")
            ? o.product_image
            : `${API_BASE_URL}/uploads/${o.product_image.split("/").pop()}`;
          imgHtml = `<div class="order-card-img"><img src="${escHtml(
            imgSrc
          )}" alt="${escHtml(
            o.product_name || "Product"
          )}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-${
            isService ? "handshake" : "box"
          }\\' style=\\'font-size:2.5rem;color:var(--purple);opacity:.4;\\'></i>'"/></div>`;
        } else {
          imgHtml = `<div class="order-card-img" style="height:100px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-${
            isService ? "handshake" : "box"
          }" style="font-size:2.5rem;opacity:.4;"></i></div>`;
        }

        return `
    <div class="order-card">
      ${imgHtml}
      <div class="order-card-body">
        <div class="order-card-id">
          <span>${isService ? "Service" : "Product"} · #${o.order_id}</span>
          ${
            isService
              ? `<span style="font-size:.68rem;background:rgba(139,92,246,.12);color:#7c3aed;padding:2px 8px;border-radius:20px;font-weight:700;">Service</span>`
              : ""
          }
        </div>
        <div class="order-card-name">${escHtml(
          o.product_name || "Product"
        )}</div>
        <div class="order-card-meta">
          <span><i class="fas fa-calendar"></i>${date}</span>
          ${
            !isService
              ? `<span><i class="fas fa-layer-group"></i>Qty: ${o.quantity}</span>`
              : ""
          }
          <span><i class="fas fa-coins"></i>${o.currency || "INR"}</span>
        </div>
      </div>
      <div class="order-card-footer">
        <div class="order-card-price">₹${parseFloat(
          o.total_amount
        ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        <span class="order-card-badge ${cfg.cls}"><i class="fas ${
          cfg.icon
        }"></i> ${capitalize(o.status || "pending")}</span>
      </div>
    </div>`;
      })
      .join("") +
    `</div>`;
}

// ══════════════════════════════════════════════════════════════
// PRIVACY
// ══════════════════════════════════════════════════════════════
window.savePrivacySettings = async function () {
  const session = getSession();
  if (!session) return;
  const payload = { is_private: document.getElementById("isPrivate")?.checked };
  try {
    const res = await fetch(`${API_BASE_URL}/settings/privacy`, {
      method: "PUT",
      headers: authHeaders(session.token),
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (d.success) {
      showToast("Privacy settings saved!", "success");
      clearDirty();
      clearPrivacyDirty();
    } else showToast(d.message || "Save failed", "error");
  } catch {
    showToast("Failed to save privacy settings", "error");
  }
};

// ── Billing Address ────────────────────────────────────────────
window.saveBillingAddress = async function () {
  const session = getSession();
  if (!session) return;
  const payload = {
    full_name: document.getElementById("billingName")?.value.trim(),
    address: document.getElementById("billingAddr")?.value.trim(),
    city: document.getElementById("billingCity")?.value.trim(),
    pincode: document.getElementById("billingPin")?.value.trim(),
  };
  try {
    const res = await fetch(`${API_BASE_URL}/settings/billing-address`, {
      method: "PUT",
      headers: authHeaders(session.token),
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (d.success) {
      showToast("Billing address saved!", "success");
      clearDirty();
    } else showToast(d.message || "Save failed", "error");
  } catch {
    showToast("Failed to save address", "error");
  }
};

async function loadBillingAddress(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/settings/billing-address`, {
      headers: authHeaders(token),
    });
    const d = await res.json();
    if (d.success && d.address) {
      setValue("billingName", d.address.full_name || "");
      setValue("billingAddr", d.address.address || "");
      setValue("billingCity", d.address.city || "");
      setValue("billingPin", d.address.pincode || "");
    }
  } catch {
    /* silently fail */
  }
}

// ══════════════════════════════════════════════════════════════
// DOWNLOAD DATA — XLSX format via SheetJS
// ══════════════════════════════════════════════════════════════
async function ensureSheetJS() {
  if (typeof XLSX !== "undefined") return;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

window.downloadData = async function (type) {
  const session = getSession();
  if (!session) return;
  showToast(`Preparing ${type} data…`, "info");
  try {
    const res = await fetch(
      `${API_BASE_URL}/settings/download-data?type=${type}`,
      { headers: authHeaders(session.token) }
    );
    if (!res.ok) throw new Error();
    const json = await res.json();
    await ensureSheetJS();

    const wb = XLSX.utils.book_new();
    const data = json.data;

    if (type === "profile" && data.profile) {
      const rows = Object.entries(data.profile).map(([k, v]) => ({
        Field: k,
        Value: v ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 25 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws, "Profile");
    } else if (type === "orders" && data.orders) {
      if (data.orders.length === 0)
        data.orders = [{ message: "No orders found" }];
      const ws = XLSX.utils.json_to_sheet(data.orders);
      autoFitColumns(ws, data.orders);
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
    } else if (type === "posts" && data.posts) {
      if (data.posts.length === 0) data.posts = [{ message: "No posts found" }];
      const ws = XLSX.utils.json_to_sheet(data.posts);
      autoFitColumns(ws, data.posts);
      XLSX.utils.book_append_sheet(wb, ws, "Posts");
    } else if (type === "transactions" && data.transactions) {
      if (data.transactions.length === 0)
        data.transactions = [{ message: "No transactions found" }];
      const ws = XLSX.utils.json_to_sheet(data.transactions);
      autoFitColumns(ws, data.transactions);
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    } else {
      const ws = XLSX.utils.json_to_sheet([{ note: "No data available" }]);
      XLSX.utils.book_append_sheet(wb, ws, "Data");
    }

    XLSX.writeFile(wb, `creator-connect-${type}.xlsx`);
    showToast(`${capitalize(type)} data downloaded as XLSX!`, "success");
  } catch (e) {
    console.error(e);
    showToast("Download failed. Please try again.", "error");
  }
};

window.downloadAllData = async function () {
  const session = getSession();
  if (!session) return;
  showToast("Preparing full data export…", "info");
  try {
    const res = await fetch(`${API_BASE_URL}/settings/download-all-data`, {
      headers: authHeaders(session.token),
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    await ensureSheetJS();

    const wb = XLSX.utils.book_new();
    const data = json.data;

    // Profile sheet
    if (data.profile) {
      const rows = Object.entries(data.profile).map(([k, v]) => ({
        Field: k,
        Value: v ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 25 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws, "Profile");
    }

    // Social links
    if (data.social_links && data.social_links.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data.social_links);
      autoFitColumns(ws, data.social_links);
      XLSX.utils.book_append_sheet(wb, ws, "Social Links");
    }

    // Posts
    if (data.posts && data.posts.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data.posts);
      autoFitColumns(ws, data.posts);
      XLSX.utils.book_append_sheet(wb, ws, "My Posts");
    }

    // Orders as buyer
    if (data.orders_as_buyer && data.orders_as_buyer.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data.orders_as_buyer);
      autoFitColumns(ws, data.orders_as_buyer);
      XLSX.utils.book_append_sheet(wb, ws, "Orders (Buyer)");
    }

    // Orders as seller
    if (data.orders_as_seller && data.orders_as_seller.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data.orders_as_seller);
      autoFitColumns(ws, data.orders_as_seller);
      XLSX.utils.book_append_sheet(wb, ws, "Orders (Seller)");
    }

    // Service bookings
    if (data.service_bookings && data.service_bookings.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data.service_bookings);
      autoFitColumns(ws, data.service_bookings);
      XLSX.utils.book_append_sheet(wb, ws, "Service Bookings");
    }

    if (wb.SheetNames.length === 0) {
      const ws = XLSX.utils.json_to_sheet([{ note: "No data available" }]);
      XLSX.utils.book_append_sheet(wb, ws, "Export");
    }

    XLSX.writeFile(wb, "creator-connect-full-export.xlsx");
    showToast("Full data exported as XLSX!", "success");
  } catch (e) {
    console.error(e);
    showToast("Export failed. Please try again.", "error");
  }
};

function autoFitColumns(ws, data) {
  if (!data || data.length === 0) return;
  const cols = Object.keys(data[0]);
  ws["!cols"] = cols.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((r) => String(r[key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
  });
}

// ══════════════════════════════════════════════════════════════
// DEACTIVATE / DELETE
// ══════════════════════════════════════════════════════════════
window.deactivateAccount = async function () {
  if (
    !confirm(
      "Deactivate your account? Your profile will be hidden until you log back in."
    )
  )
    return;
  const session = getSession();
  if (!session) return;
  try {
    const res = await fetch(`${API_BASE_URL}/settings/deactivate`, {
      method: "POST",
      headers: authHeaders(session.token),
    });
    const d = await res.json();
    if (d.success) {
      showToast("Account deactivated. Logging out…", "info");
      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
      }, 2000);
    } else showToast(d.message || "Failed", "error");
  } catch {
    showToast("Failed to deactivate", "error");
  }
};

window.showDeleteModal = function () {
  document.getElementById("deleteModal").style.display = "flex";
};
window.closeDeleteModal = function () {
  document.getElementById("deleteModal").style.display = "none";
  setValue("delPw", "");
  setValue("delConfirmText", "");
};

window.deleteAccount = async function () {
  const pw = document.getElementById("delPw")?.value;
  const conf = document.getElementById("delConfirmText")?.value;
  if (!pw) {
    showToast("Enter your password", "error");
    return;
  }
  if (conf !== "DELETE") {
    showToast("Type DELETE in the confirmation box", "error");
    return;
  }
  const session = getSession();
  if (!session) return;
  try {
    const res = await fetch(`${API_BASE_URL}/settings/delete-account`, {
      method: "DELETE",
      headers: authHeaders(session.token),
      body: JSON.stringify({ password: pw }),
    });
    const d = await res.json();
    if (d.success) {
      showToast("Account deleted. Goodbye! 👋", "info");
      closeDeleteModal();
      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
      }, 2000);
    } else showToast(d.message || "Deletion failed", "error");
  } catch {
    showToast("Failed to delete account", "error");
  }
};

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
let toastTimer = null;
function showToast(msg, type = "info") {
  const t = document.getElementById("sToast");
  if (!t) return;
  clearTimeout(toastTimer);
  t.className = `s-toast ${type}`;
  t.innerHTML = `<i class="fas ${
    type === "success"
      ? "fa-check-circle"
      : type === "error"
      ? "fa-circle-xmark"
      : "fa-circle-info"
  }"></i> ${msg}`;
  t.classList.add("show");
  toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════
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
  const colorIndex = initial.charCodeAt(0) % colors.length;
  return `data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='200' rx='100' fill='${colors[colorIndex]}'/%3E%3Ctext x='100' y='100' font-family='Arial,sans-serif' font-size='88' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central'%3E${initial}%3C/text%3E%3C/svg%3E`;
}
function escHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
function formatTimeAgo(ts) {
  if (!ts) return "Unknown time";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
