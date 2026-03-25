"""
Deal Email Notification Service  —  Creator Connect
=====================================================
10 email triggers:

  PRODUCTS
  ├── send_order_placed_email         → SELLER   (new order)
  ├── send_order_confirmed_email      → BUYER    (seller confirmed)
  ├── send_order_rejected_email       → BUYER    (seller rejected)
  ├── send_order_cancelled_email      → SELLER   (buyer cancelled) ✨ NEW
  ├── send_order_status_email         → BUYER    (processing/shipped/delivered)
  └── send_payment_received_email     → SELLER   (payment done + withdraw CTA)

  SERVICES
  ├── send_booking_request_email      → PROVIDER (new booking)
  ├── send_booking_accepted_email     → CUSTOMER (accepted)
  ├── send_booking_rejected_email     → CUSTOMER (rejected)
  └── send_booking_cancelled_email    → PROVIDER (customer cancelled) ✨ NEW

Save to:  services/deal_email_service.py
"""

from flask_mail import Message
import threading
from flask import current_app
from config.app_config import mail
from database.db import get_db_connection
from mysql.connector import Error

# ── Brand tokens ──────────────────────────────────
BRAND  = "#e336cc"
ACCENT = "#9b27af"
GRAD   = "linear-gradient(135deg,#e336cc 0%,#9b27af 100%)"
FROM   = ("Creator Connect", "saumyan24@gmail.com")


# ═══════════════════════════════════════════════════
#  PRIVATE LAYOUT HELPERS
# ═══════════════════════════════════════════════════

def _wrap(body: str, preview: str = "") -> str:
    pre = (f'<div style="display:none;max-height:0;overflow:hidden;">'
           f'{preview}&nbsp;</div>') if preview else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Creator Connect</title>
</head>
<body style="margin:0;padding:0;background:#f0e8f8;
             font-family:'Segoe UI',Arial,sans-serif;">
{pre}
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#f0e8f8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="max-width:600px;width:100%;background:#fff;
              border-radius:20px;overflow:hidden;
              box-shadow:0 8px 40px rgba(227,54,204,.18);">

  <!-- HEADER -->
  <tr>
    <td style="background:{GRAD};padding:28px 40px 22px;text-align:center;">
      <p style="margin:0;font-size:27px;font-weight:800;color:#fff;
                letter-spacing:-.5px;">Creator Connect</p>
      <p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,.75);
                letter-spacing:2px;text-transform:uppercase;">
        Transaction Notification</p>
    </td>
  </tr>

  <!-- BODY -->
  <tr><td style="padding:36px 40px 28px;">{body}</td></tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8e8fb;padding:18px 40px;text-align:center;
               border-top:1px solid #f0d0f0;">
      <p style="margin:0;font-size:12px;color:#aaa;">
        &copy; 2025 Creator Connect &middot; All rights reserved</p>
      <p style="margin:4px 0 0;font-size:11px;color:#ccc;">
        You received this because you have a Creator Connect account.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _row(icon, label, value, bg="#f8e8fb"):
    """One info row inside a details table."""
    return (
        f'<tr>'
        f'<td style="padding:10px 14px;font-size:13px;color:#777;width:42%;'
        f'background:{bg};border-bottom:1px solid #f0dff5;">'
        f'{icon}&nbsp;{label}</td>'
        f'<td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:600;'
        f'background:{bg};border-bottom:1px solid #f0dff5;">'
        f'{value}</td>'
        f'</tr>'
    )


def _table(rows: list) -> str:
    return (
        '<table width="100%" cellpadding="0" cellspacing="0" '
        'style="border-radius:14px;overflow:hidden;margin-bottom:24px;">'
        + "".join(rows) +
        '</table>'
    )


def _btn(text, url, color=None):
    c = color or BRAND
    return (
        f'<div style="text-align:center;margin:28px 0 8px;">'
        f'<a href="{url}" style="display:inline-block;background:{c};color:#fff;'
        f'text-decoration:none;padding:14px 36px;border-radius:50px;'
        f'font-size:15px;font-weight:700;'
        f'box-shadow:0 4px 20px rgba(227,54,204,.32);">'
        f'{text}</a></div>'
    )


def _pill(label, color):
    return (
        f'<div style="display:inline-block;background:{color};color:#fff;'
        f'padding:5px 18px;border-radius:50px;font-size:13px;font-weight:700;'
        f'letter-spacing:.4px;margin-bottom:10px;">{label}</div>'
    )


def _note(icon, title, body, bg="#fff8e1", border="#ffca28", fg="#7a5f00"):
    return (
        f'<div style="background:{bg};border-left:4px solid {border};'
        f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
        f'<p style="margin:0;font-size:13px;color:{fg};font-weight:700;">'
        f'{icon} {title}</p>'
        f'<p style="margin:7px 0 0;font-size:13px;color:{fg};line-height:1.65;">'
        f'{body}</p>'
        f'</div>'
    )


# ── DB helpers ─────────────────────────────────────

def _get_user(uid):
    """Returns (email, display_name) or (None, None)."""
    try:
        conn = get_db_connection()
        cur  = conn.cursor(dictionary=True)
        cur.execute("SELECT email, full_name, username FROM users WHERE id = %s", (uid,))
        r = cur.fetchone()
        cur.close(); conn.close()
        if r:
            return r["email"], (r["full_name"] or r["username"] or "User")
    except Error as e:
        print(f"❌ _get_user({uid}): {e}")
    return None, None


def _send(subject, to_email, html):
    try:
        mail.send(Message(subject=subject, sender=FROM,
                          recipients=[to_email], html=html))
        print(f"✅ Email → {to_email} | {subject}")
        return True
    except Exception as e:
        print(f"❌ Email FAILED → {to_email} | {e}")
        return False


# ═══════════════════════════════════════════════════
#  1. ORDER PLACED  →  SELLER
# ═══════════════════════════════════════════════════

def send_order_placed_email(order_id, seller_id, buyer_id,
                             product_name, quantity, total_amount):
    """📦 New order placed — email goes to SELLER."""
    seller_email, seller_name = _get_user(seller_id)
    _,             buyer_name  = _get_user(buyer_id)
    if not seller_email:
        return False

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">📦</div>
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    You have a new order!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    <strong>{buyer_name}</strong> just purchased one of your products.
  </p>
</div>

{_table([
    _row("🛍️", "Product",     product_name),
    _row("🔢", "Quantity",    str(quantity)),
    _row("💰", "Order Total", f"&#8377;{float(total_amount):,.2f}"),
    _row("📋", "Order ID",    f"#{order_id}"),
    _row("👤", "Buyer",       buyer_name),
])}

{_note("⚡", "Action Required",
       "Please confirm or reject this order within 24 hours "
       "to keep your seller rating high.")}

{_btn("Review &amp; Confirm Order &rarr;",
      "my-deals.html?role=seller&type=products&status=pending")}
"""
    return _send(
        f"📦 New Order — ₹{float(total_amount):,.2f} | {product_name}",
        seller_email,
        _wrap(body, f"New order from {buyer_name} — ₹{float(total_amount):,.2f}")
    )


# ═══════════════════════════════════════════════════
#  2. ORDER CONFIRMED  →  BUYER
# ═══════════════════════════════════════════════════

def send_order_confirmed_email(order_id, buyer_id, seller_id,
                                product_name, total_amount):
    """✅ Seller confirmed order — email goes to BUYER."""
    buyer_email,  buyer_name  = _get_user(buyer_id)
    _,            seller_name = _get_user(seller_id)
    if not buyer_email:
        return False

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">✅</div>
  {_pill("Confirmed", "#27ae60")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Your order is confirmed!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Great news, <strong>{buyer_name}</strong>!
    <strong>{seller_name}</strong> confirmed your order.
  </p>
</div>

{_table([
    _row("🛍️", "Product",  product_name,                  "#e8f8ee"),
    _row("💰", "Total",    f"&#8377;{float(total_amount):,.2f}", "#e8f8ee"),
    _row("📋", "Order ID", f"#{order_id}",                  "#e8f8ee"),
    _row("🏪", "Seller",   seller_name,                    "#e8f8ee"),
])}

{_note("✅", "What happens next?",
       f"{seller_name} will now prepare and dispatch your order. "
       "You'll get another email with tracking details once it ships.",
       "#e8f5e9", "#4caf50", "#2e7d32")}

{_btn("Track My Order &rarr;",
      "my-deals.html?role=buyer&type=products&status=confirmed", "#27ae60")}
"""
    return _send(
        f"✅ Order Confirmed — {product_name}",
        buyer_email,
        _wrap(body, f"Your order for {product_name} is confirmed!")
    )


# ═══════════════════════════════════════════════════
#  3. ORDER REJECTED  →  BUYER                 (NEW)
# ═══════════════════════════════════════════════════

def send_order_rejected_email(order_id, buyer_id, seller_id,
                               product_name, total_amount, reason=""):
    """❌ Seller rejected/cancelled order — email goes to BUYER."""
    buyer_email,  buyer_name  = _get_user(buyer_id)
    _,            seller_name = _get_user(seller_id)
    if not buyer_email:
        return False

    reason_block = ""
    if reason:
        reason_block = (
            f'<div style="background:#fce8e8;border-left:4px solid #e74c3c;'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:#c0392b;font-weight:700;">'
            f'📝 Reason from seller</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{reason}</p>'
            f'</div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">❌</div>
  {_pill("Cancelled", "#e74c3c")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Order not accepted
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Sorry, <strong>{buyer_name}</strong>.
    <strong>{seller_name}</strong> was unable to fulfil your order at this time.
  </p>
</div>

{_table([
    _row("🛍️", "Product",  product_name,                  "#fdf0f0"),
    _row("💰", "Amount",   f"&#8377;{float(total_amount):,.2f}", "#fdf0f0"),
    _row("📋", "Order ID", f"#{order_id}",                  "#fdf0f0"),
    _row("🏪", "Seller",   seller_name,                    "#fdf0f0"),
])}

{reason_block}

{_note("💡", "What can you do?",
       "Browse other sellers on Creator Connect offering similar products. "
       "No payment has been deducted for this order.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_btn("Browse Products &rarr;", "home.html", "#e74c3c")}
"""
    return _send(
        f"❌ Order Cancelled — {product_name}",
        buyer_email,
        _wrap(body, f"Update on your order for {product_name}")
    )


# ═══════════════════════════════════════════════════
#  4. ORDER STATUS UPDATE  →  BUYER
#     (processing / shipped / out_for_delivery / delivered)
# ═══════════════════════════════════════════════════

def send_order_status_email(order_id, buyer_id, seller_id,
                             product_name, new_status,
                             tracking_number=None):
    """🚚 Order status changed — email goes to BUYER."""
    buyer_email, buyer_name = _get_user(buyer_id)
    if not buyer_email:
        return False

    META = {
        "processing": (
            "⚙️", "Processing", "#f39c12",
            "Your order is being prepared!",
            "The seller is currently packing your order.",
            "Hang tight — it will ship soon!",
        ),
        "shipped": (
            "🚚", "Shipped", "#2980b9",
            "Your order has shipped!",
            "Great news! Your package is on its way.",
            "Use your tracking number below to follow it in real time.",
        ),
        "out_for_delivery": (
            "🏃", "Out for Delivery", "#8e44ad",
            "Arriving today!",
            "Your package is on the final stretch — out for delivery!",
            "Please ensure someone is available to receive the package.",
        ),
        "delivered": (
            "🎉", "Delivered", "#27ae60",
            "Order delivered!",
            f"Your package has arrived. Enjoy, {buyer_name}!",
            "Loved it? Leave a review to help other buyers.",
        ),
    }

    emoji, pill_label, pill_color, title, subtitle, tip = META.get(
        new_status,
        ("📦", new_status.title(), "#888",
         f"Order: {new_status.title()}", "", "")
    )

    tracking_rows = (
        [_row("📍", "Tracking No.", tracking_number)]
        if tracking_number else []
    )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">{emoji}</div>
  {_pill(pill_label, pill_color)}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    {title}
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">{subtitle}</p>
</div>

{_table(
    [_row("🛍️", "Product",  product_name),
     _row("📋", "Order ID", f"#{order_id}")]
    + tracking_rows
)}

{_note("💡", "Tip", tip, "#e8f0fe", "#4285f4", "#1a73e8") if tip else ""}

{_btn("View Order &rarr;",
      "my-deals.html?role=buyer&type=products", pill_color)}
"""

    SUBJECTS = {
        "processing":       f"⚙️ Being prepared — {product_name}",
        "shipped":          f"🚚 Your order shipped! — {product_name}",
        "out_for_delivery": f"🏃 Out for delivery today — {product_name}",
        "delivered":        f"🎉 Delivered! — {product_name}",
    }
    return _send(
        SUBJECTS.get(new_status, f"📦 Order update — {product_name}"),
        buyer_email,
        _wrap(body, title)
    )


# ═══════════════════════════════════════════════════
#  5. PAYMENT RECEIVED  →  SELLER + WITHDRAW CTA  (NEW)
# ═══════════════════════════════════════════════════

def send_payment_received_email(order_id, seller_id, buyer_id,
                                 product_name, amount):
    """💸 Buyer paid — email goes to SELLER with withdrawal CTA."""
    seller_email, seller_name = _get_user(seller_id)
    _,             buyer_name  = _get_user(buyer_id)
    if not seller_email:
        return False

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">💸</div>
  {_pill("Payment Received", "#27ae60")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    You've been paid!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    <strong>{buyer_name}</strong> has completed payment for their order.
  </p>
</div>

{_table([
    _row("🛍️", "Product",  product_name,              "#e8f8ee"),
    _row("💰", "Amount",   f"&#8377;{float(amount):,.2f}", "#e8f8ee"),
    _row("📋", "Order ID", f"#{order_id}",              "#e8f8ee"),
    _row("👤", "Buyer",    buyer_name,                 "#e8f8ee"),
])}

<!-- WITHDRAW CARD -->
<div style="background:linear-gradient(135deg,#f8e8fb,#ede0f8);
            border:2px solid {BRAND};border-radius:16px;
            padding:22px 24px;margin-bottom:24px;">
  <p style="margin:0 0 6px;font-size:16px;color:{ACCENT};font-weight:800;">
    🏦 Ready to withdraw your earnings?
  </p>
  <p style="margin:0 0 18px;font-size:13px;color:#555;line-height:1.7;">
    Your balance has been credited on Creator Connect.
    Once the order is delivered and confirmed, you can request a withdrawal —
    funds arrive within <strong>2&ndash;3 business days</strong>.
  </p>
  <div style="text-align:center;">
    <a href="wallet.html"
       style="display:inline-block;background:{GRAD};color:#fff;
              text-decoration:none;padding:12px 30px;border-radius:50px;
              font-size:14px;font-weight:700;
              box-shadow:0 4px 16px rgba(227,54,204,.35);">
      Request Withdrawal &rarr;
    </a>
  </div>
</div>

{_btn("View My Orders &rarr;",
      "my-deals.html?role=seller&type=products")}
"""
    return _send(
        f"💸 Payment Received — ₹{float(amount):,.2f} | {product_name}",
        seller_email,
        _wrap(body, f"Payment of ₹{float(amount):,.2f} received from {buyer_name}")
    )


# ═══════════════════════════════════════════════════
#  6. ORDER CANCELLED BY BUYER  →  SELLER  (NEW)
# ═══════════════════════════════════════════════════

def send_order_cancelled_email(order_id, seller_id, buyer_id,
                                product_name, total_amount, reason=""):
    """🚫 Buyer cancelled order — email goes to SELLER."""
    seller_email, seller_name = _get_user(seller_id)
    _,             buyer_name  = _get_user(buyer_id)
    if not seller_email:
        return False

    reason_block = ""
    if reason:
        reason_block = (
            f'<div style="background:#fff4e6;border-left:4px solid #ff9800;'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:#e65100;font-weight:700;">'
            f'📝 Cancellation reason</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{reason}</p>'
            f'</div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">🚫</div>
  {_pill("Order Cancelled", "#ff9800")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Order cancelled by buyer
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    <strong>{buyer_name}</strong> has cancelled their order.
  </p>
</div>

{_table([
    _row("🛍️", "Product",  product_name,                  "#fef3e0"),
    _row("💰", "Amount",   f"&#8377;{float(total_amount):,.2f}", "#fef3e0"),
    _row("📋", "Order ID", f"#{order_id}",                  "#fef3e0"),
    _row("👤", "Buyer",    buyer_name,                     "#fef3e0"),
])}

{reason_block}

{_note("💡", "What this means",
       "This order has been cancelled and will not proceed. "
       "If you already prepared the item, you may need to restock it.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_btn("View My Orders &rarr;",
      "my-deals.html?role=seller&type=products&status=cancelled", "#ff9800")}
"""
    return _send(
        f"🚫 Order Cancelled by Buyer — {product_name}",
        seller_email,
        _wrap(body, f"{buyer_name} cancelled their order for {product_name}")
    )


# ═══════════════════════════════════════════════════
#  7. BOOKING REQUEST  →  PROVIDER
# ═══════════════════════════════════════════════════

def send_booking_request_email(booking_id, provider_id, customer_id,
                                service_name, total_amount,
                                preferred_start_date=None, requirements=None):
    """🗓️ New booking request — email goes to PROVIDER."""
    provider_email, provider_name = _get_user(provider_id)
    _,               customer_name = _get_user(customer_id)
    if not provider_email:
        return False

    start_row = (
        [_row("📅", "Preferred Start", str(preferred_start_date))]
        if preferred_start_date else []
    )
    req_block = ""
    if requirements:
        snippet = requirements[:200] + ("…" if len(requirements) > 200 else "")
        req_block = (
            f'<div style="background:#f8e8fb;border-left:4px solid {BRAND};'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:{ACCENT};font-weight:700;">'
            f'📋 Customer Requirements</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{snippet}</p>'
            f'</div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">🗓️</div>
  {_pill("New Request", BRAND)}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    New Booking Request!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    <strong>{customer_name}</strong> wants to book your service.
  </p>
</div>

{_table(
    [_row("💼", "Service",    service_name),
     _row("💰", "Quoted",     f"&#8377;{float(total_amount):,.2f}"),
     _row("📋", "Booking ID", f"#{booking_id}"),
     _row("👤", "Customer",   customer_name)]
    + start_row
)}

{req_block}

{_note("⚡", "Action Required",
       "Please accept or reject this booking within 24 hours. "
       "Fast responses improve your provider rating on Creator Connect!")}

{_btn("Review Booking &rarr;",
      "my-deals.html?role=seller&type=services&status=pending")}
"""
    return _send(
        f"🗓️ New Booking — {service_name} | ₹{float(total_amount):,.2f}",
        provider_email,
        _wrap(body, f"New booking from {customer_name} — ₹{float(total_amount):,.2f}")
    )


# ═══════════════════════════════════════════════════
#  7. BOOKING ACCEPTED  →  CUSTOMER
# ═══════════════════════════════════════════════════

def send_booking_accepted_email(booking_id, customer_id, provider_id,
                                 service_name, total_amount,
                                 provider_message=None):
    """🤝 Provider accepted — email goes to CUSTOMER."""
    customer_email, customer_name = _get_user(customer_id)
    _,               provider_name = _get_user(provider_id)
    if not customer_email:
        return False

    msg_block = ""
    if provider_message:
        msg_block = (
            f'<div style="background:#e8f5e9;border-left:4px solid #4caf50;'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:#2e7d32;font-weight:700;">'
            f'💬 Message from {provider_name}</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{provider_message}</p>'
            f'</div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">🤝</div>
  {_pill("Accepted!", "#27ae60")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Booking Accepted!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Exciting news, <strong>{customer_name}</strong>!
    <strong>{provider_name}</strong> has accepted your booking.
  </p>
</div>

{_table([
    _row("💼", "Service",    service_name,                  "#e8f8ee"),
    _row("💰", "Total",      f"&#8377;{float(total_amount):,.2f}", "#e8f8ee"),
    _row("📋", "Booking ID", f"#{booking_id}",               "#e8f8ee"),
    _row("👤", "Provider",   provider_name,                 "#e8f8ee"),
])}

{msg_block}

{_note("✅", "What happens next?",
       f"{provider_name} will reach out using your provided contact details. "
       "You can also view full booking info from your My Deals page.",
       "#e8f5e9", "#4caf50", "#2e7d32")}

{_btn("View My Booking &rarr;",
      "my-deals.html?role=buyer&type=services&status=accepted", "#27ae60")}
"""
    return _send(
        f"🤝 Booking Accepted — {service_name}",
        customer_email,
        _wrap(body, f"Your booking for {service_name} is accepted!")
    )


# ═══════════════════════════════════════════════════
#  8. BOOKING REJECTED  →  CUSTOMER              (NEW)
# ═══════════════════════════════════════════════════

def send_booking_rejected_email(booking_id, customer_id, provider_id,
                                 service_name, total_amount, reason=""):
    """😔 Provider rejected/cancelled — email goes to CUSTOMER."""
    customer_email, customer_name = _get_user(customer_id)
    _,               provider_name = _get_user(provider_id)
    if not customer_email:
        return False

    reason_block = ""
    if reason:
        reason_block = (
            f'<div style="background:#fce8e8;border-left:4px solid #e74c3c;'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:#c0392b;font-weight:700;">'
            f'📝 Message from {provider_name}</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{reason}</p>'
            f'</div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">😔</div>
  {_pill("Declined", "#e74c3c")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Booking not accepted
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Sorry, <strong>{customer_name}</strong>.
    <strong>{provider_name}</strong> is unable to take your booking at this time.
  </p>
</div>

{_table([
    _row("💼", "Service",    service_name,                  "#fdf0f0"),
    _row("💰", "Quoted",     f"&#8377;{float(total_amount):,.2f}", "#fdf0f0"),
    _row("📋", "Booking ID", f"#{booking_id}",               "#fdf0f0"),
    _row("👤", "Provider",   provider_name,                 "#fdf0f0"),
])}

{reason_block}

{_note("💡", "What can you do?",
       "Find other service providers on Creator Connect offering similar services. "
       "No payment has been deducted.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_btn("Find Another Provider &rarr;",
      "home.html?filter=services", "#e74c3c")}
"""
    return _send(
        f"😔 Booking Declined — {service_name}",
        customer_email,
        _wrap(body, f"Update on your booking for {service_name}")
    )


# ═══════════════════════════════════════════════════
#  10. BOOKING CANCELLED BY CUSTOMER  →  PROVIDER  (NEW)
# ═══════════════════════════════════════════════════

def send_booking_cancelled_email(booking_id, provider_id, customer_id,
                                  service_name, total_amount, reason=""):
    """🚫 Customer cancelled booking — email goes to PROVIDER."""
    provider_email, provider_name = _get_user(provider_id)
    _,               customer_name = _get_user(customer_id)
    if not provider_email:
        return False

    reason_block = ""
    if reason:
        reason_block = (
            f'<div style="background:#fff4e6;border-left:4px solid #ff9800;'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:#e65100;font-weight:700;">'
            f'📝 Cancellation reason</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{reason}</p>'
            f'</div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:52px;margin-bottom:10px;">🚫</div>
  {_pill("Booking Cancelled", "#ff9800")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Booking cancelled by customer
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    <strong>{customer_name}</strong> has cancelled their booking.
  </p>
</div>

{_table([
    _row("💼", "Service",    service_name,                  "#fef3e0"),
    _row("💰", "Quoted",     f"&#8377;{float(total_amount):,.2f}", "#fef3e0"),
    _row("📋", "Booking ID", f"#{booking_id}",               "#fef3e0"),
    _row("👤", "Customer",   customer_name,                 "#fef3e0"),
])}

{reason_block}

{_note("💡", "What this means",
       "This booking has been cancelled and will not proceed. "
       "Your calendar slot is now free for other bookings.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_btn("View My Bookings &rarr;",
      "my-deals.html?role=seller&type=services&status=cancelled", "#ff9800")}
"""
    return _send(
        f"🚫 Booking Cancelled by Customer — {service_name}",
        provider_email,
        _wrap(body, f"{customer_name} cancelled their booking for {service_name}")
    )


# ═══════════════════════════════════════════════════
#  PUBLIC HOOKS  (called by notification_operations.py)
# ═══════════════════════════════════════════════════

def on_order_placed(order_id, seller_id, buyer_id,
                     product_name, quantity, total_amount):
    send_order_placed_email(
        order_id, seller_id, buyer_id, product_name, quantity, total_amount)


def on_order_confirmed(order_id, buyer_id, seller_id,
                        product_name, total_amount):
    send_order_confirmed_email(
        order_id, buyer_id, seller_id, product_name, total_amount)


def on_order_rejected(order_id, buyer_id, seller_id,
                       product_name, total_amount, reason=""):
    send_order_rejected_email(
        order_id, buyer_id, seller_id, product_name, total_amount, reason)


def on_order_status_update(order_id, buyer_id, seller_id,
                            product_name, new_status, tracking_number=None):
    if new_status in ("processing", "shipped", "out_for_delivery", "delivered"):
        send_order_status_email(
            order_id, buyer_id, seller_id, product_name,
            new_status, tracking_number)


def on_payment_received(order_id, seller_id, buyer_id,
                         product_name, amount):
    send_payment_received_email(
        order_id, seller_id, buyer_id, product_name, amount)


def on_booking_request(booking_id, provider_id, customer_id,
                        service_name, total_amount,
                        preferred_start_date=None, requirements=None):
    send_booking_request_email(
        booking_id, provider_id, customer_id, service_name, total_amount,
        preferred_start_date, requirements)


def on_booking_accepted(booking_id, customer_id, provider_id,
                         service_name, total_amount, provider_message=None):
    send_booking_accepted_email(
        booking_id, customer_id, provider_id, service_name,
        total_amount, provider_message)


def on_booking_rejected(booking_id, customer_id, provider_id,
                         service_name, total_amount, reason=""):
    send_booking_rejected_email(
        booking_id, customer_id, provider_id, service_name, total_amount, reason)


def on_order_cancelled(order_id, seller_id, buyer_id,
                        product_name, total_amount, reason=""):
    """Hook: buyer cancelled order → email seller."""
    send_order_cancelled_email(
        order_id, seller_id, buyer_id, product_name, total_amount, reason)


def on_booking_cancelled(booking_id, provider_id, customer_id,
                          service_name, total_amount, reason=""):
    """Hook: customer cancelled booking → email provider."""
    send_booking_cancelled_email(
        booking_id, provider_id, customer_id, service_name, total_amount, reason)