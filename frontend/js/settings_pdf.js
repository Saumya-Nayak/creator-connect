/* ============================================================
   SETTINGS PDF EXPORT — Creator Connect  v5
   - Logo in white circle + rounded pink bar header (compact 26mm)
   - Images fetched from backend/uploads/posts & backend/uploads/profile
   - _safe() strips emoji/Gujarati/Unicode so text never corrupts
   - Dark pink table headers, profile hero card, post image cards
   - Watermark logo on every page
   ============================================================ */

// ── Lazy library loader ───────────────────────────────────────
async function _loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}
async function ensurePDFLibs() {
  if (typeof window.jspdf === "undefined")
    await _loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    );
  if (!window.jspdf?.jsPDF?.prototype?.autoTable)
    await _loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
    );
  if (typeof Chart === "undefined")
    await _loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
    );
}

// ── Fetch logo as base64 ──────────────────────────────────────
async function _fetchLogo() {
  try {
    const res = await fetch("images/logo2.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Fetch any image URL as base64 ─────────────────────────────
// DB stores paths as:  uploads/profile/filename.jpg
//                      uploads/posts/filename.jpg
// Server serves them:  http://host:3000/uploads/posts/filename.jpg
// ── Fetch any image as base64 ─────────────────────────────────
// ✅ EXACT MIRROR of explore.js  constructMediaUrl():
//
//   Profile pic DB value:  "uploads/profile/20260224_224850_profile.jpg"
//   → cleanPath = "profile/20260224_224850_profile.jpg"
//   → filename  = "20260224_224850_profile.jpg"
//   → URL = API_BASE_URL + "/get-profile-pic/" + filename
//
//   Post image DB value:   "uploads/posts/8_20260228_181330_file.png"
//   → cleanPath = "posts/8_file.png"
//   → postFile  = "8_file.png"   (strips "posts/")
//   → URL = API_BASE_URL + "/uploads/" + postFile
//
async function _fetchImageB64(url, hint) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  // If it's already a full URL (including Cloudinary), use directly
  if (url.startsWith("http")) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.size || !blob.type.startsWith("image/")) return null;
      return await new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  }
  // Fallback for any non-HTTP path (should not happen after Cloudinary migration)

  try {
    const res = await fetch(fetchUrl, { cache: "force-cache" });
    if (!res.ok) {
      console.warn("[PDF] Image fetch failed:", fetchUrl, res.status);
      return null;
    }
    const blob = await res.blob();
    if (!blob.size || !blob.type.startsWith("image/")) {
      console.warn("[PDF] Not an image:", fetchUrl, blob.type);
      return null;
    }
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("[PDF] Fetch error:", fetchUrl, e.message);
    return null;
  }
}

// ── Detect image format from base64 data URI ─────────────────
function _imgFmt(b64) {
  if (!b64) return "JPEG";
  if (b64.startsWith("data:image/png")) return "PNG";
  if (b64.startsWith("data:image/webp")) return "WEBP";
  if (b64.startsWith("data:image/gif")) return "GIF";
  return "JPEG";
}

// ── Sanitize text for jsPDF (helvetica = Latin-1 only) ───────
// jsPDF's helvetica can only render ISO-8859-1 (0x00–0xFF).
// Emoji, Devanagari, Gujarati, smart-quotes etc. all render as
// garbled characters. This function:
//   • Replaces common "fancy" punctuation with ASCII equivalents
//   • Replaces rupee sign with "Rs."
//   • Strips everything else outside Latin-1
function _safe(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/[\u2018\u2019\u02BC\u02B9]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"') // smart double quotes
    .replace(/[\u2013\u2012]/g, "-") // en-dash / figure-dash
    .replace(/\u2014/g, "--") // em-dash
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/[\u20B9\u20A8]/g, "Rs.") // rupee signs
    .replace(/\u00A0/g, " ") // non-breaking space
    .replace(/[\u2022\u25CF\u25AA\u2023]/g, "-") // bullets -> dash
    .replace(/[^\x00-\xFF]/g, "") // strip all non-Latin-1
    .replace(/\s+/g, " ")
    .trim();
}

// ── Chart → PNG helper ────────────────────────────────────────
function renderChartToBase64(config, width = 500, height = 230) {
  return new Promise((resolve) => {
    const dpr = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.cssText = `position:fixed;left:${-(
      width * dpr +
      30
    )}px;top:0;`;
    document.body.appendChild(canvas);
    const cleanup = (chart) => {
      const png = canvas.toDataURL("image/png");
      chart.destroy();
      if (document.body.contains(canvas)) document.body.removeChild(canvas);
      resolve(png);
    };
    const cfg = {
      ...config,
      options: {
        ...config.options,
        animation: false,
        responsive: false,
        devicePixelRatio: dpr,
      },
      plugins: [
        ...(config.plugins || []),
        { id: "_snap", afterRender: (c) => setTimeout(() => cleanup(c), 25) },
      ],
    };
    try {
      new Chart(canvas, cfg);
    } catch {
      document.body.contains(canvas) && document.body.removeChild(canvas);
      resolve(null);
    }
  });
}

// ── Constants ─────────────────────────────────────────────────
const _P = {
  W: 210,
  H: 297,
  MX: 14,
  get CW() {
    return this.W - this.MX * 2;
  },
  C: {
    brand: [230, 10, 234],
    pink: [200, 0, 180], // dark pink for table headers
    pinkHdr: [210, 20, 180], // header gradient mid
    dark: [28, 14, 40],
    white: [255, 255, 255],
    light: [250, 245, 255],
    softGray: [240, 235, 248],
    gray: [120, 110, 130],
    green: [34, 197, 94],
    blue: [59, 130, 246],
    amber: [245, 158, 11],
    red: [239, 68, 68],
    purple: [139, 92, 246],
    teal: [20, 184, 166],
  },
};

const PALETTE = [
  "rgba(230,10,234,0.80)",
  "rgba(59,130,246,0.80)",
  "rgba(34,197,94,0.80)",
  "rgba(245,158,11,0.80)",
  "rgba(239,68,68,0.80)",
  "rgba(139,92,246,0.80)",
  "rgba(20,184,166,0.80)",
];

const _inr = (v) =>
  "Rs. " +
  (parseFloat(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const _date = (s) =>
  s
    ? new Date(s).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "--";
const _cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const _t = (s) => _safe(s); // shorthand — wrap all user text before passing to doc.text()

function _newDoc() {
  const { jsPDF } = window.jspdf;
  return new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
}

// ══════════════════════════════════════════════════════════════
// LAYOUT HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Draw watermark logo centred on the current page (low opacity).
 * Call AFTER adding content so it sits in the background layer,
 * or call before — jsPDF draws in order so call first.
 */
function _addWatermark(doc, logoB64) {
  if (!logoB64) return;
  const { W, H } = _P;
  const size = 60; // watermark size mm
  const x = (W - size) / 2;
  const y = (H - size) / 2;
  try {
    // jsPDF doesn't support native opacity for images;
    // we draw a white semi-transparent rect over it to fake low opacity
    doc.addImage(logoB64, "PNG", x, y, size, size);
    // overlay white at ~80% to make logo ~20% visible
    doc.setFillColor(255, 255, 255);
    doc.setGState && doc.setGState(new doc.GState({ opacity: 0.82 }));
    doc.rect(x, y, size, size, "F");
    doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
  } catch {
    // fallback: just try addImage without opacity tricks
    try {
      doc.addImage(logoB64, "PNG", x, y, size, size);
    } catch {}
  }
}

/**
 * Header — logo in clean white area left, compact pink rounded bar right.
 * Height: 18mm (very compact). Logo has no border — pure white background only.
 */
function _addHeader(doc, logoB64, pageLabel, ts) {
  const { W, MX } = _P;

  const hH = 18; // compact height
  const logoD = 13; // logo size
  const logoR = logoD / 2;
  const logoX = 2;
  const logoCX = logoX + logoR;
  const logoCY = hH / 2;
  const barX = logoCX + logoR + 1.5; // bar starts just after logo

  // ① Full white background for the whole header row first
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, hH, "F");

  // ② Pink rounded bar — starts after logo, rounded left corners
  const barW = W - barX;
  doc.setFillColor(229, 27, 222);
  doc.roundedRect(barX, 0, barW, hH, 3.5, 3.5, "F");
  doc.rect(W - 5, 0, 5, hH, "F"); // square off far right edge

  // ③ Logo sits directly on white — NO circle, NO border, NO ring
  if (logoB64) {
    try {
      doc.addImage(logoB64, "PNG", logoX, logoCY - logoR, logoD, logoD);
    } catch {}
  }

  // ④ Text on bar
  const barCX = barX + barW / 2;

  // "Creator Connect"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Creator Connect", barCX, hH * 0.46, { align: "center" });

  // Tagline
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(5.5);
  doc.setTextColor(255, 230, 255);
  doc.text("Your Creative Marketplace", barCX, hH * 0.78, { align: "center" });

  // Page label top-right
  if (pageLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(_safe(pageLabel), W - MX, hH * 0.36, { align: "right" });
  }

  // Timestamp bottom-right
  if (ts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(255, 215, 255);
    doc.text(
      "Generated: " + new Date(ts).toLocaleString("en-IN"),
      W - MX,
      hH - 2.5,
      { align: "right" }
    );
  }

  return hH + 6;
}

/** Page footer */
function _addFooter(doc, n, total) {
  const { W, H, MX } = _P;
  doc.setFillColor(..._P.C.softGray);
  doc.rect(0, H - 10, W, 10, "F");
  doc.setDrawColor(..._P.C.brand);
  doc.setLineWidth(0.35);
  doc.line(0, H - 10, W, H - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(..._P.C.gray);
  doc.text("Creator Connect — Confidential Data Export", MX, H - 3.5);
  doc.text(`Page ${n} / ${total}`, W - MX, H - 3.5, { align: "right" });
}

/** Branded section heading. Returns new y. */
function _section(doc, y, title) {
  const { MX, CW } = _P;
  y = _checkY(doc, y, 18);
  doc.setFillColor(..._P.C.light);
  doc.roundedRect(MX, y, CW, 10, 2, 2, "F");
  doc.setFillColor(..._P.C.brand);
  doc.rect(MX, y, 3.5, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(..._P.C.dark);
  doc.text(title, MX + 7, y + 7);
  return y + 15;
}

/** Coloured stat cards. Returns new y. */
function _statCards(doc, y, cards) {
  const { MX, CW } = _P;
  const gap = 3;
  const cardW = (CW - gap * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => {
    const x = MX + i * (cardW + gap);
    const bg = c.bg || _P.C.light;
    doc.setFillColor(...bg);
    doc.roundedRect(x, y, cardW, 22, 2.5, 2.5, "F");
    doc.setFillColor(...(c.color || _P.C.brand));
    doc.rect(x, y, cardW, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(c.color || _P.C.brand));
    doc.text(String(c.value), x + cardW / 2, y + 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(..._P.C.gray);
    doc.text(c.label, x + cardW / 2, y + 18.5, { align: "center" });
  });
  return y + 27;
}

/** Embed chart image. Returns new y. */
function _chartImg(doc, y, png, caption, imgW, imgH) {
  if (!png) return y;
  const { MX, CW } = _P;
  if (!imgW) imgW = CW;
  if (!imgH) imgH = imgW * 0.44;
  y = _checkY(doc, y, imgH + 8);
  const x = MX + (CW - imgW) / 2;
  doc.setFillColor(..._P.C.softGray);
  doc.roundedRect(x - 2, y - 2, imgW + 4, imgH + 4, 2, 2, "F");
  doc.addImage(png, "PNG", x, y, imgW, imgH);
  if (caption) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(..._P.C.gray);
    doc.text(caption, MX + CW / 2, y + imgH + 5.5, { align: "center" });
    return y + imgH + 10;
  }
  return y + imgH + 5;
}

/**
 * AutoTable shorthand — uses dark pink header (theme-matching).
 * Returns new y.
 */
function _table(doc, y, cols, rows, extra = {}) {
  y = _checkY(doc, y, 20);
  doc.autoTable({
    startY: y,
    margin: { left: _P.MX, right: _P.MX },
    head: [cols.map((c) => c.h)],
    body: rows.map((r) => cols.map((c) => (r[c.k] != null ? r[c.k] : "--"))),
    styles: {
      fontSize: 7.5,
      cellPadding: 2.8,
      textColor: _P.C.dark,
      lineColor: [230, 220, 242],
      lineWidth: 0.25,
    },
    headStyles: {
      // ✅ Dark pink header matching brand theme
      fillColor: [180, 0, 160],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: _P.C.light },
    ...extra,
  });
  return doc.lastAutoTable.finalY + 8;
}

/** Add new page if content won't fit. */
function _checkY(doc, y, need = 30) {
  if (y + need > _P.H - 14) {
    doc.addPage();
    return 16;
  }
  return y;
}

// ══════════════════════════════════════════════════════════════
// TABLE OF CONTENTS HELPER
// ══════════════════════════════════════════════════════════════
function _addTOC(doc, y, sections) {
  const { MX, CW } = _P;
  y = _section(doc, y, "Table of Contents");
  sections.forEach((s, i) => {
    const rowY = y + i * 9;
    doc.setFillColor(..._P.C.brand);
    doc.circle(MX + 4, rowY + 3.5, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), MX + 4, rowY + 5.2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(..._P.C.dark);
    doc.text(s.name, MX + 12, rowY + 5.2);
    const textW = doc.getTextWidth(s.name);
    let dotX = MX + 14 + textW;
    doc.setFillColor(..._P.C.softGray);
    while (dotX < MX + CW - 20) {
      doc.circle(dotX, rowY + 4, 0.4, "F");
      dotX += 2.5;
    }
    doc.setFontSize(7.5);
    doc.setTextColor(..._P.C.brand);
    doc.text("p." + s.page, MX + CW, rowY + 5.2, { align: "right" });
  });
  return y + sections.length * 9 + 8;
}

// ══════════════════════════════════════════════════════════════
// POST IMAGE CARD RENDERER
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// POST TABLE RENDERER  (no images — clean table layout)
// ══════════════════════════════════════════════════════════════
async function _renderPostCards(doc, y, posts, logoB64, ts) {
  return _table(
    doc,
    y,
    [
      { h: "#", k: "num" },
      { h: "Type", k: "type" },
      { h: "Caption / Title", k: "cap" },
      { h: "Price", k: "price" },
      { h: "Sales", k: "sales" },
      { h: "Date", k: "date" },
    ],
    posts.map((p, i) => ({
      num: String(i + 1),
      type: _cap(p.post_type || ""),
      cap: _safe(p.product_title || p.title || p.caption || "").substring(
        0,
        55
      ),
      price: p.price ? _inr(p.price) : "Free",
      sales: String(p.total_sales || 0),
      date: _date(p.created_at),
    })),
    {
      columnStyles: {
        0: { cellWidth: 8, fontStyle: "bold" },
        1: { cellWidth: 20 },
        2: { cellWidth: 80 },
        3: { cellWidth: 28 },
        4: { cellWidth: 14 },
        5: { cellWidth: 28 },
      },
    }
  );
}

function _drawImagePlaceholder(doc, x, y, w, h, label) {
  doc.setFillColor(235, 220, 250);
  doc.rect(x, y, w, h, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(180, 100, 200);
  doc.text(label || "No Image", x + w / 2, y + h / 2 + 3, { align: "center" });
  // dashed border
  doc.setDrawColor(200, 150, 220);
  doc.setLineWidth(0.3);
  doc.rect(x + 1, y + 1, w - 2, h - 2);
}

function _drawInitialsCircle(doc, avatarX, avatarCY, picR, u) {
  doc.setFillColor(229, 27, 222);
  doc.circle(avatarX + picR, avatarCY, picR, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(picR * 1.1);
  doc.setTextColor(255, 255, 255);
  const initial =
    _safe(u.full_name || u.username || "U")
      .charAt(0)
      .toUpperCase() || "U";
  doc.text(initial, avatarX + picR, avatarCY + picR * 0.35, {
    align: "center",
  });
}

// ══════════════════════════════════════════════════════════════
// ALL DATA EXPORT
// ══════════════════════════════════════════════════════════════
async function _buildAllData(doc, data, ts, logoB64) {
  const profile = data.profile || {};
  const posts = data.posts || [];
  const bOrders = data.orders_as_buyer || [];
  const sOrders = data.orders_as_seller || [];
  const bookings = data.service_bookings || [];

  const totalSpent = bOrders.reduce(
    (s, o) => s + (parseFloat(o.total_amount) || 0),
    0
  );
  const totalRevenue = sOrders.reduce(
    (s, o) => s + (parseFloat(o.total_amount) || 0),
    0
  );

  // ─── PAGE 1: COVER + TOC ──────────────────────────────────
  let y = _addHeader(doc, logoB64, "Full Data Export", ts);
  _addWatermark(doc, logoB64);

  // Title block
  doc.setFillColor(..._P.C.light);
  doc.roundedRect(_P.MX, y, _P.CW, 26, 3, 3, "F");
  doc.setFillColor(..._P.C.brand);
  doc.rect(_P.MX, y, 4, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(..._P.C.brand);
  doc.text("Full Data Export", _P.MX + 10, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(..._P.C.gray);
  doc.text(
    "Complete account snapshot -- " +
      (profile.username ? "@" + _safe(profile.username) : "account"),
    _P.MX + 10,
    y + 20
  );
  y += 32;

  // Stats row
  y = _statCards(doc, y, [
    {
      label: "Total Posts",
      value: posts.length,
      color: _P.C.brand,
      bg: [253, 236, 254],
    },
    {
      label: "Orders (Buyer)",
      value: bOrders.length,
      color: _P.C.blue,
      bg: [237, 246, 255],
    },
    {
      label: "Orders (Seller)",
      value: sOrders.length,
      color: _P.C.purple,
      bg: [246, 240, 255],
    },
    {
      label: "Bookings",
      value: bookings.length,
      color: _P.C.teal,
      bg: [236, 253, 252],
    },
  ]);

  // Table of Contents
  const tocSections = [
    { name: "Profile Summary", page: 2 },
    { name: "Activity Charts", page: 3 },
    posts.length && { name: "Posts", page: 4 },
    bOrders.length && { name: "Orders as Buyer", page: 5 },
    sOrders.length && { name: "Orders as Seller", page: 6 },
    bookings.length && { name: "Service Bookings", page: 6 },
  ].filter(Boolean);
  y = _addTOC(doc, y, tocSections);

  // ✅ Profile Summary FORCED to new page
  doc.addPage();
  y = _addHeader(doc, logoB64, "Profile Summary", ts);
  _addWatermark(doc, logoB64);

  const flds = [
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
  const filled = flds.filter((f) => profile[f]).length;
  const pct = Math.round((filled / flds.length) * 100);

  y = _section(doc, y, "Profile Summary");
  y = _table(
    doc,
    y,
    [
      { h: "Field", k: "k" },
      { h: "Value", k: "v" },
    ],
    [
      { k: "Full Name", v: _safe(profile.full_name) || "--" },
      {
        k: "Username",
        v: profile.username ? "@" + _safe(profile.username) : "--",
      },
      { k: "Email", v: _safe(profile.email) || "--" },
      { k: "Phone", v: _safe(profile.phone) || "--" },
      { k: "Date of Birth", v: _date(profile.date_of_birth) },
      { k: "Gender", v: _cap(profile.gender || "") },
      {
        k: "Location",
        v:
          _safe(
            [profile.city, profile.state, profile.country]
              .filter(Boolean)
              .join(", ")
          ) || "--",
      },
      {
        k: "Profile Complete",
        v: pct + "% (" + filled + "/" + flds.length + " fields)",
      },
      { k: "Member Since", v: _date(profile.created_at) },
      { k: "Total Posts", v: String(posts.length) },
      {
        k: "Buyer Spending",
        v: _inr(totalSpent) + " across " + bOrders.length + " orders",
      },
      {
        k: "Seller Earnings",
        v: _inr(totalRevenue) + " across " + sOrders.length + " orders",
      },
      { k: "Service Bookings", v: String(bookings.length) },
    ],
    { columnStyles: { 0: { fontStyle: "bold", cellWidth: 44 } } }
  );

  // ─── PAGE 3: ALL CHARTS ────────────────────────────────────
  doc.addPage();
  y = _addHeader(doc, logoB64, "Activity Charts", ts);
  _addWatermark(doc, logoB64);
  y = _section(doc, y, "Activity Overview");

  const overviewPng = await renderChartToBase64(
    {
      type: "bar",
      data: {
        labels: ["Posts", "Buyer Orders", "Seller Orders", "Bookings"],
        datasets: [
          {
            label: "Count",
            data: [
              posts.length,
              bOrders.length,
              sOrders.length,
              bookings.length,
            ],
            backgroundColor: PALETTE.slice(0, 4),
            borderRadius: 7,
            borderSkipped: false,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Activity Summary",
            font: { size: 14, weight: "bold" },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } },
          x: { ticks: { font: { size: 11 } } },
        },
      },
    },
    500,
    230
  );
  y = _chartImg(doc, y, overviewPng, "Count of each activity type", 170, 58);

  if (posts.length > 0) {
    const tc = { Showcase: 0, Service: 0, Product: 0 };
    posts.forEach((p) => {
      const k = _cap(p.post_type);
      if (tc[k] !== undefined) tc[k]++;
    });
    y = _section(doc, y, "Post Types");
    const postPng = await renderChartToBase64(
      {
        type: "doughnut",
        data: {
          labels: Object.keys(tc),
          datasets: [
            {
              data: Object.values(tc),
              backgroundColor: PALETTE.slice(0, 3),
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: "66%",
          plugins: {
            legend: {
              position: "right",
              labels: { font: { size: 12 }, padding: 14 },
            },
            title: {
              display: true,
              text: "Posts by Type",
              font: { size: 13, weight: "bold" },
            },
          },
        },
      },
      440,
      210
    );
    y = _chartImg(doc, y, postPng, "Post type split", 122, 58);
  }

  if (bOrders.length > 0) {
    const bsc = {};
    bOrders.forEach((o) => {
      bsc[o.status] = (bsc[o.status] || 0) + 1;
    });
    y = _section(doc, y, "Buyer Order Status");
    const bPng = await renderChartToBase64(
      {
        type: "doughnut",
        data: {
          labels: Object.keys(bsc).map(_cap),
          datasets: [
            {
              data: Object.values(bsc),
              backgroundColor: PALETTE,
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: "62%",
          plugins: {
            legend: {
              position: "right",
              labels: { font: { size: 12 }, padding: 12 },
            },
            title: {
              display: true,
              text: "Buyer Order Status",
              font: { size: 13, weight: "bold" },
            },
          },
        },
      },
      440,
      200
    );
    y = _chartImg(doc, y, bPng, "Status breakdown", 122, 55);
  }

  if (sOrders.length > 1) {
    const monthly = {};
    sOrders.forEach((o) => {
      if (!o.order_date) return;
      const mk = new Date(o.order_date).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      monthly[mk] = (monthly[mk] || 0) + (parseFloat(o.total_amount) || 0);
    });
    const mks = Object.keys(monthly).slice(-8);
    if (mks.length > 1) {
      y = _checkY(doc, y, 70);
      y = _section(doc, y, "Seller Monthly Revenue");
      const revPng = await renderChartToBase64(
        {
          type: "bar",
          data: {
            labels: mks,
            datasets: [
              {
                label: "Revenue (Rs.)",
                data: mks.map((k) => +monthly[k].toFixed(2)),
                backgroundColor: "rgba(139,92,246,0.78)",
                borderRadius: 5,
              },
            ],
          },
          options: {
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Monthly Seller Revenue",
                font: { size: 13, weight: "bold" },
              },
            },
            scales: {
              y: { beginAtZero: true, ticks: { font: { size: 10 } } },
              x: { ticks: { font: { size: 10 } } },
            },
          },
        },
        500,
        220
      );
      y = _chartImg(doc, y, revPng, "Seller revenue by month (Rs.)", 165, 56);
    }
  }

  // ─── POSTS — image cards ───────────────────────────────────
  if (posts.length > 0) {
    doc.addPage();
    y = _addHeader(doc, logoB64, "Posts", ts);
    _addWatermark(doc, logoB64);
    y = _section(doc, y, "Posts  (" + posts.length + " total)");
    y = await _renderPostCards(doc, y, posts, logoB64, ts);
  }

  // ─── ORDERS AS BUYER ──────────────────────────────────────
  if (bOrders.length > 0) {
    doc.addPage();
    y = _addHeader(doc, logoB64, "Orders as Buyer", ts);
    _addWatermark(doc, logoB64);
    y = _section(doc, y, "Orders as Buyer  (" + bOrders.length + " total)");
    y = _statCards(doc, y, [
      {
        label: "Total Orders",
        value: bOrders.length,
        color: _P.C.blue,
        bg: [237, 246, 255],
      },
      {
        label: "Total Spent",
        value: _inr(totalSpent),
        color: _P.C.brand,
        bg: [253, 236, 254],
      },
    ]);
    y = _table(
      doc,
      y,
      [
        { h: "Order #", k: "id" },
        { h: "Product", k: "name" },
        { h: "Qty", k: "qty" },
        { h: "Amount", k: "amt" },
        { h: "Status", k: "status" },
        { h: "Date", k: "date" },
      ],
      bOrders.map((o) => ({
        id: "#" + o.order_id,
        name: (o.product_name || "").substring(0, 30),
        qty: o.quantity || 1,
        amt: _inr(o.total_amount),
        status: _cap(o.status || ""),
        date: _date(o.order_date),
      }))
    );
  }

  // ─── ORDERS AS SELLER ─────────────────────────────────────
  if (sOrders.length > 0) {
    y = _checkY(doc, y, 40);
    y = _section(doc, y, "Orders as Seller  (" + sOrders.length + " total)");
    y = _statCards(doc, y, [
      {
        label: "Orders Sold",
        value: sOrders.length,
        color: _P.C.purple,
        bg: [246, 240, 255],
      },
      {
        label: "Gross Revenue",
        value: _inr(totalRevenue),
        color: _P.C.green,
        bg: [236, 254, 244],
      },
    ]);
    y = _table(
      doc,
      y,
      [
        { h: "Order #", k: "id" },
        { h: "Product", k: "name" },
        { h: "Amount", k: "amt" },
        { h: "Status", k: "status" },
        { h: "Date", k: "date" },
      ],
      sOrders.map((o) => ({
        id: "#" + o.order_id,
        name: (o.product_name || "").substring(0, 32),
        amt: _inr(o.total_amount),
        status: _cap(o.status || ""),
        date: _date(o.order_date),
      }))
    );
  }

  // ─── SERVICE BOOKINGS ─────────────────────────────────────
  if (bookings.length > 0) {
    y = _checkY(doc, y, 40);
    y = _section(doc, y, "Service Bookings  (" + bookings.length + " total)");
    y = _table(
      doc,
      y,
      [
        { h: "Booking #", k: "id" },
        { h: "Amount", k: "amt" },
        { h: "Status", k: "status" },
        { h: "Date", k: "date" },
      ],
      bookings.map((b) => ({
        id: "#" + b.booking_id,
        amt: _inr(b.total_amount),
        status: _cap(b.status || ""),
        date: _date(b.booking_date),
      }))
    );
  }
}

// ══════════════════════════════════════════════════════════════
// INDIVIDUAL REPORTS
// ══════════════════════════════════════════════════════════════

// ── Crop image into a circle using offscreen canvas ──────────
async function _cropCircle(b64, size = 200) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        // Draw image centered and cropped to square
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s) / 2;
        const sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = b64;
  });
}

async function _buildProfile(doc, data, ts, logoB64) {
  const u = data.profile || {};
  const flds = [
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
  const filled = flds.filter((f) => u[f]).length;
  const pct = Math.round((filled / flds.length) * 100);
  const pctCol =
    pct >= 80 ? _P.C.green : pct >= 50 ? _P.C.amber : [229, 27, 222];

  let y = _addHeader(doc, logoB64, "Profile Report", ts);
  _addWatermark(doc, logoB64);

  const { MX, CW } = _P;

  // ── Stat cards row ──
  const memberYear = u.created_at ? new Date(u.created_at).getFullYear() : "--";
  y = _statCards(doc, y, [
    {
      label: "Profile Complete",
      value: pct + "%",
      color: pctCol,
      bg: [253, 236, 254],
    },
    {
      label: "Fields Filled",
      value: filled + "/" + flds.length,
      color: _P.C.blue,
      bg: [237, 246, 255],
    },
    {
      label: "Gender",
      value: _safe(_cap(u.gender || "--")),
      color: _P.C.purple,
      bg: [246, 240, 255],
    },
    {
      label: "Member Since",
      value: memberYear,
      color: _P.C.teal,
      bg: [236, 253, 252],
    },
  ]);

  // ── Profile Details table ──
  y = _section(doc, y, "Profile Details");
  const profileRows = [
    { k: "Full Name", v: _safe(u.full_name) || "--" },
    { k: "Username", v: u.username ? "@" + _safe(u.username) : "--" },
    { k: "Email", v: _safe(u.email) || "--" },
    { k: "Phone", v: _safe(u.phone) || "--" },
    { k: "Date of Birth", v: _date(u.date_of_birth) },
    { k: "Gender", v: _cap(u.gender || "") || "--" },
    { k: "Country", v: _safe(u.country) || "--" },
    { k: "State", v: _safe(u.state) || "--" },
    { k: "City", v: _safe(u.city) || "--" },
    { k: "About Me", v: _safe(u.about_me || "").substring(0, 120) || "--" },
    { k: "Website", v: _safe(u.website_url) || "--" },
    { k: "Joined", v: _date(u.created_at) },
    {
      k: "Completion",
      v: pct + "% (" + filled + " of " + flds.length + " fields filled)",
    },
  ].filter((r) => r.v && r.v !== "--");

  y = _table(
    doc,
    y,
    [
      { h: "Field", k: "k" },
      { h: "Value", k: "v" },
    ],
    profileRows,
    { columnStyles: { 0: { fontStyle: "bold", cellWidth: 44 } } }
  );

  // Page 2: Completion chart
  doc.addPage();
  y = _addHeader(doc, logoB64, "Profile -- Charts", ts);
  _addWatermark(doc, logoB64);
  y = _section(doc, y, "Profile Completion");
  const png = await renderChartToBase64(
    {
      type: "doughnut",
      data: {
        labels: ["Completed", "Missing"],
        datasets: [
          {
            data: [filled, flds.length - filled],
            backgroundColor: ["rgba(229,27,222,0.85)", "rgba(200,190,220,0.5)"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: "72%",
        plugins: {
          legend: {
            position: "right",
            labels: { font: { size: 12 }, padding: 16 },
          },
          title: {
            display: true,
            text: pct + "% Profile Complete",
            font: { size: 15, weight: "bold" },
            color: "#1c0a28",
          },
        },
      },
    },
    400,
    210
  );
  y = _chartImg(doc, y, png, "Profile completeness", 116, 62);
}

async function _buildPosts(doc, data, ts, logoB64) {
  const posts = data.posts || [];
  const totalSales = posts.reduce(
    (s, p) => s + (parseFloat(p.total_sales) || 0),
    0
  );
  const avgPrice = posts.length
    ? posts.reduce((s, p) => s + (parseFloat(p.price) || 0), 0) / posts.length
    : 0;
  const tc = { Showcase: 0, Service: 0, Product: 0 };
  posts.forEach((p) => {
    const k = _cap(p.post_type);
    if (tc[k] !== undefined) tc[k]++;
  });

  let y = _addHeader(doc, logoB64, "Posts Report", ts);
  _addWatermark(doc, logoB64);

  y = _statCards(doc, y, [
    {
      label: "Total Posts",
      value: posts.length,
      color: _P.C.brand,
      bg: [253, 236, 254],
    },
    {
      label: "Total Sales",
      value: totalSales,
      color: _P.C.green,
      bg: [236, 254, 244],
    },
    {
      label: "Avg Price",
      value: _inr(avgPrice),
      color: _P.C.blue,
      bg: [237, 246, 255],
    },
    {
      label: "Showcase Posts",
      value: tc.Showcase,
      color: _P.C.purple,
      bg: [246, 240, 255],
    },
  ]);

  if (posts.length > 0) {
    y = _section(doc, y, "Posts  (" + posts.length + " total)");
    // ✅ Image cards for posts
    y = await _renderPostCards(doc, y, posts, logoB64, ts);
  }

  // Charts page
  doc.addPage();
  y = _addHeader(doc, logoB64, "Posts -- Charts", ts);
  _addWatermark(doc, logoB64);
  y = _section(doc, y, "Post Type Distribution");
  const pie = await renderChartToBase64(
    {
      type: "pie",
      data: {
        labels: Object.keys(tc),
        datasets: [
          {
            data: Object.values(tc),
            backgroundColor: PALETTE.slice(0, 3),
            borderColor: "#fff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "right",
            labels: { font: { size: 12 }, padding: 14 },
          },
          title: {
            display: true,
            text: "Posts by Type",
            font: { size: 14, weight: "bold" },
          },
        },
      },
    },
    450,
    210
  );
  y = _chartImg(doc, y, pie, "Distribution of post types", 128, 60);

  if (posts.length > 0) {
    const sb = { Showcase: 0, Service: 0, Product: 0 };
    posts.forEach((p) => {
      const k = _cap(p.post_type);
      if (sb[k] !== undefined) sb[k] += parseFloat(p.total_sales) || 0;
    });
    y = _section(doc, y, "Sales by Post Type");
    const bar = await renderChartToBase64(
      {
        type: "bar",
        data: {
          labels: Object.keys(sb),
          datasets: [
            {
              label: "Units Sold",
              data: Object.values(sb),
              backgroundColor: PALETTE.slice(0, 3),
              borderRadius: 6,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { font: { size: 11 }, precision: 0 },
            },
            x: { ticks: { font: { size: 11 } } },
          },
        },
      },
      480,
      220
    );
    y = _chartImg(doc, y, bar, "Units sold per category", 162, 56);
  }
}

async function _buildOrders(doc, data, ts, logoB64) {
  const orders = data.orders || [];
  const totalSpent = orders.reduce(
    (s, o) => s + (parseFloat(o.total_amount) || 0),
    0
  );
  const delivered = orders.filter((o) =>
    ["delivered", "completed"].includes(o.status)
  ).length;

  let y = _addHeader(doc, logoB64, "Orders Report", ts);
  _addWatermark(doc, logoB64);

  y = _statCards(doc, y, [
    {
      label: "Total Orders",
      value: orders.length,
      color: _P.C.brand,
      bg: [253, 236, 254],
    },
    {
      label: "Total Spent",
      value: _inr(totalSpent),
      color: _P.C.blue,
      bg: [237, 246, 255],
    },
    {
      label: "Avg Order",
      value: _inr(orders.length ? totalSpent / orders.length : 0),
      color: _P.C.purple,
      bg: [246, 240, 255],
    },
    {
      label: "Delivered",
      value: delivered,
      color: _P.C.green,
      bg: [236, 254, 244],
    },
  ]);

  if (orders.length > 0) {
    y = _section(doc, y, "Order List  (" + orders.length + " total)");
    y = _table(
      doc,
      y,
      [
        { h: "Order #", k: "id" },
        { h: "Product", k: "name" },
        { h: "Qty", k: "qty" },
        { h: "Amount", k: "amt" },
        { h: "Status", k: "status" },
        { h: "Date", k: "date" },
      ],
      orders.map((o) => ({
        id: "#" + o.order_id,
        name: (o.product_name || "").substring(0, 30),
        qty: o.quantity || 1,
        amt: _inr(o.total_amount),
        status: _cap(o.status || ""),
        date: _date(o.order_date),
      }))
    );
  }

  doc.addPage();
  y = _addHeader(doc, logoB64, "Orders -- Charts", ts);
  _addWatermark(doc, logoB64);

  if (orders.length > 0) {
    const sc = {};
    orders.forEach((o) => {
      sc[o.status] = (sc[o.status] || 0) + 1;
    });
    y = _section(doc, y, "Order Status Breakdown");
    const sp = await renderChartToBase64(
      {
        type: "doughnut",
        data: {
          labels: Object.keys(sc).map(_cap),
          datasets: [
            {
              data: Object.values(sc),
              backgroundColor: PALETTE,
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: "62%",
          plugins: {
            legend: {
              position: "right",
              labels: { font: { size: 12 }, padding: 12 },
            },
            title: {
              display: true,
              text: "Orders by Status",
              font: { size: 14, weight: "bold" },
            },
          },
        },
      },
      440,
      210
    );
    y = _chartImg(doc, y, sp, "Order status distribution", 122, 58);
  }

  if (orders.length > 1) {
    const monthly = {};
    orders.forEach((o) => {
      if (!o.order_date) return;
      const mk = new Date(o.order_date).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      monthly[mk] = (monthly[mk] || 0) + (parseFloat(o.total_amount) || 0);
    });
    const mks = Object.keys(monthly).slice(-9);
    if (mks.length > 1) {
      y = _section(doc, y, "Monthly Spending Trend");
      const mp = await renderChartToBase64(
        {
          type: "bar",
          data: {
            labels: mks,
            datasets: [
              {
                label: "Spent (Rs.)",
                data: mks.map((k) => +monthly[k].toFixed(2)),
                backgroundColor: "rgba(230,10,234,0.75)",
                borderRadius: 5,
              },
            ],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { font: { size: 10 } } },
              x: { ticks: { font: { size: 10 } } },
            },
          },
        },
        480,
        220
      );
      y = _chartImg(doc, y, mp, "Monthly spending (Rs.)", 163, 56);
    }
  }
}

async function _buildTransactions(doc, data, ts, logoB64) {
  const txns = data.transactions || [];
  const total = txns.reduce((s, t) => s + (parseFloat(t.total_amount) || 0), 0);
  const paid = txns.filter((t) => t.payment_status === "completed").length;
  const pend = txns.filter((t) => t.payment_status === "pending").length;

  let y = _addHeader(doc, logoB64, "Transactions Report", ts);
  _addWatermark(doc, logoB64);

  y = _statCards(doc, y, [
    {
      label: "Total Volume",
      value: _inr(total),
      color: _P.C.brand,
      bg: [253, 236, 254],
    },
    { label: "Completed", value: paid, color: _P.C.green, bg: [236, 254, 244] },
    { label: "Pending", value: pend, color: _P.C.amber, bg: [255, 249, 235] },
  ]);

  if (txns.length > 0) {
    y = _section(doc, y, "Transaction List  (" + txns.length + " total)");
    y = _table(
      doc,
      y,
      [
        { h: "Order #", k: "id" },
        { h: "Product", k: "name" },
        { h: "Amount", k: "amt" },
        { h: "Method", k: "method" },
        { h: "Status", k: "status" },
        { h: "Date", k: "date" },
      ],
      txns.map((t) => ({
        id: "#" + t.order_id,
        name: (t.product_name || "").substring(0, 28),
        amt: _inr(t.total_amount),
        method: _cap(t.payment_method || "Unknown"),
        status: _cap(t.payment_status || ""),
        date: _date(t.order_date),
      }))
    );
  }

  doc.addPage();
  y = _addHeader(doc, logoB64, "Transactions -- Charts", ts);
  _addWatermark(doc, logoB64);

  if (txns.length > 0) {
    const methods = {};
    txns.forEach((t) => {
      const m = t.payment_method || "Unknown";
      methods[m] = (methods[m] || 0) + 1;
    });
    y = _section(doc, y, "Payment Method Breakdown");
    const mp = await renderChartToBase64(
      {
        type: "pie",
        data: {
          labels: Object.keys(methods).map(_cap),
          datasets: [
            {
              data: Object.values(methods),
              backgroundColor: PALETTE,
              borderColor: "#fff",
              borderWidth: 2,
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              position: "right",
              labels: { font: { size: 12 }, padding: 12 },
            },
            title: {
              display: true,
              text: "Payment Methods",
              font: { size: 14, weight: "bold" },
            },
          },
        },
      },
      440,
      200
    );
    y = _chartImg(doc, y, mp, "Transaction count by payment method", 122, 55);
  }

  if (txns.length > 1) {
    const monthly = {};
    txns.forEach((t) => {
      if (!t.order_date) return;
      const mk = new Date(t.order_date).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      monthly[mk] = (monthly[mk] || 0) + (parseFloat(t.total_amount) || 0);
    });
    const mks = Object.keys(monthly).slice(-9);
    if (mks.length > 1) {
      y = _section(doc, y, "Monthly Volume Trend");
      const lp = await renderChartToBase64(
        {
          type: "line",
          data: {
            labels: mks,
            datasets: [
              {
                label: "Volume (Rs.)",
                data: mks.map((k) => +monthly[k].toFixed(2)),
                borderColor: "rgba(230,10,234,1)",
                backgroundColor: "rgba(230,10,234,0.10)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "rgba(230,10,234,1)",
                pointRadius: 4,
              },
            ],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { font: { size: 10 } } },
              x: { ticks: { font: { size: 10 } } },
            },
          },
        },
        480,
        220
      );
      y = _chartImg(doc, y, lp, "Monthly transaction volume (Rs.)", 163, 56);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════

window.downloadDataAsPDF = async function (type) {
  const session = getSession();
  if (!session) return;
  showToast("Generating PDF — please wait…", "info");
  try {
    await ensurePDFLibs();
    const [logoB64, res] = await Promise.all([
      _fetchLogo(),
      fetch(API_BASE_URL + "/settings/download-data?type=" + type, {
        headers: authHeaders(session.token),
      }),
    ]);
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    const doc = _newDoc();
    const d = json.data;

    if (type === "profile")
      await _buildProfile(doc, d, json.exported_at, logoB64);
    else if (type === "posts")
      await _buildPosts(doc, d, json.exported_at, logoB64);
    else if (type === "orders")
      await _buildOrders(doc, d, json.exported_at, logoB64);
    else if (type === "transactions")
      await _buildTransactions(doc, d, json.exported_at, logoB64);

    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      _addFooter(doc, i, total);
    }
    doc.save("creator-connect-" + type + ".pdf");
    showToast(_cap(type) + " PDF downloaded!", "success");
  } catch (e) {
    console.error("PDF error:", e);
    showToast("PDF generation failed — try again.", "error");
  }
};

window.downloadAllDataAsPDF = async function () {
  const session = getSession();
  if (!session) return;
  showToast("Generating full PDF export — please wait…", "info");
  try {
    await ensurePDFLibs();
    const [logoB64, res] = await Promise.all([
      _fetchLogo(),
      fetch(API_BASE_URL + "/settings/download-all-data", {
        headers: authHeaders(session.token),
      }),
    ]);
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    const doc = _newDoc();
    await _buildAllData(doc, json.data, json.exported_at, logoB64);

    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      _addFooter(doc, i, total);
    }
    doc.save("creator-connect-full-export.pdf");
    showToast("Full PDF export downloaded!", "success");
  } catch (e) {
    console.error("PDF error:", e);
    showToast("PDF export failed — try again.", "error");
  }
};
