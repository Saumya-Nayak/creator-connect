"""
services/payout_email_service.py
─────────────────────────────────────────────────────────────────────────────
Withdrawal / Payout / Payment Email Notifications — CreatorConnect

Functions:
  Seller emails:
    send_withdrawal_approved_email(...)
    send_withdrawal_rejected_email(...)
    send_withdrawal_requested_email(...)

  Buyer emails (NEW):
    send_payment_verified_email(...)   ← call when admin APPROVES buyer payment
    send_payment_rejected_email(...)   ← call when admin REJECTS buyer payment
"""

from flask_mail import Message
from config.app_config import mail

# ── Brand tokens ──────────────────────────────────────────────────────────────
BRAND  = "#e336cc"
ACCENT = "#9b27af"
GRAD   = "linear-gradient(135deg,#e336cc 0%,#9b27af 100%)"
FROM   = ("Creator Connect", "saumyan24@gmail.com")


# ─────────────────────────────────────────────────────────────────────────────
#  PRIVATE LAYOUT HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _wrap(body: str, preview: str = "", subtitle: str = "Order Notification") -> str:
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
      <p style="margin:0;font-size:27px;font-weight:800;color:#fff;letter-spacing:-.5px;">
        Creator Connect</p>
      <p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,.75);
                letter-spacing:2px;text-transform:uppercase;">
        {subtitle}</p>
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
        This is an automated notification. Please do not reply.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _row(icon, label, value, bg="#f8e8fb"):
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


def _pill(label, color):
    return (
        f'<div style="display:inline-block;background:{color};color:#fff;'
        f'padding:5px 18px;border-radius:50px;font-size:13px;font-weight:700;'
        f'letter-spacing:.4px;margin-bottom:10px;">{label}</div>'
    )


def _note(icon, title, body_text, bg="#fff8e1", border="#ffca28", fg="#7a5f00"):
    return (
        f'<div style="background:{bg};border-left:4px solid {border};'
        f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
        f'<p style="margin:0;font-size:13px;color:{fg};font-weight:700;">'
        f'{icon} {title}</p>'
        f'<p style="margin:7px 0 0;font-size:13px;color:{fg};line-height:1.65;">'
        f'{body_text}</p>'
        f'</div>'
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


def _now():
    return __import__('datetime').datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')


def _send(subject, to_email, html):
    try:
        mail.send(Message(subject=subject, sender=FROM,
                          recipients=[to_email], html=html))
        print(f"✅ Email → {to_email} | {subject}")
        return True
    except Exception as e:
        print(f"❌ Email FAILED → {to_email} | {e}")
        return False


# ═════════════════════════════════════════════════════════════════════════════
#  1.  WITHDRAWAL APPROVED  →  SELLER
# ═════════════════════════════════════════════════════════════════════════════

def send_withdrawal_approved_email(seller_email, seller_name, amount,
                                    request_id, payment_method,
                                    payment_reference, admin_notes=None):
    """💸 Sent to seller when admin approves their withdrawal request."""
    notes_block = ""
    if admin_notes:
        notes_block = (
            f'<div style="background:#e8f5e9;border-left:4px solid #4caf50;'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:#2e7d32;font-weight:700;">'
            f'💬 Note from Admin</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{admin_notes}</p>'
            f'</div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:56px;margin-bottom:10px;">🎉</div>
  {_pill("Withdrawal Approved!", "#27ae60")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Your withdrawal has been processed!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Hi <strong>{seller_name}</strong>, great news — your withdrawal request
    has been approved and payment has been sent to you.
  </p>
</div>

<div style="background:linear-gradient(135deg,#e8f8ee,#c8f5d8);
            border:2px solid #4caf50;border-radius:16px;
            padding:22px 24px;margin-bottom:24px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#555;text-transform:uppercase;
            letter-spacing:1px;font-weight:600;">Amount Transferred</p>
  <p style="margin:0;font-size:38px;font-weight:900;color:#27ae60;">
    &#8377;{amount:,.2f}
  </p>
</div>

{_table([
    _row("📋", "Request ID",        f"#WD-{request_id:04d}",  "#e8f8ee"),
    _row("💳", "Payment Method",    payment_method,            "#e8f8ee"),
    _row("🔖", "Transaction / Ref", payment_reference,         "#e8f8ee"),
    _row("📅", "Processed On",      _now(),                    "#e8f8ee"),
])}

{notes_block}

{_note("⏱️", "When will I receive it?",
       "Funds typically appear in your UPI or bank account within "
       "<strong>a few minutes to 2 business days</strong> depending on your bank. "
       "Use the transaction reference above to track the transfer.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_note("✅", "What's next?",
       "Your Creator Connect wallet balance has been updated to reflect this withdrawal. "
       "Keep earning and withdraw anytime from your Settings page!",
       "#e8f5e9", "#4caf50", "#2e7d32")}

{_btn("View My Wallet &rarr;", "settings.html#wallet", "#27ae60")}
"""
    return _send(
        f"🎉 Withdrawal Approved — ₹{amount:,.2f} Sent to You!",
        seller_email,
        _wrap(body, f"Your withdrawal of ₹{amount:,.2f} has been approved and paid!",
              "Payout Notification")
    )


# ═════════════════════════════════════════════════════════════════════════════
#  2.  WITHDRAWAL REJECTED  →  SELLER
# ═════════════════════════════════════════════════════════════════════════════

def send_withdrawal_rejected_email(seller_email, seller_name, amount,
                                    request_id, rejection_reason):
    """❌ Sent to seller when admin rejects their withdrawal request."""
    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:56px;margin-bottom:10px;">😔</div>
  {_pill("Withdrawal Not Processed", "#e74c3c")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Your withdrawal request was declined
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Hi <strong>{seller_name}</strong>, unfortunately your withdrawal request
    could not be processed at this time.
  </p>
</div>

<div style="background:linear-gradient(135deg,#fdf0f0,#fce4e4);
            border:2px solid #e74c3c;border-radius:16px;
            padding:22px 24px;margin-bottom:24px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;
            letter-spacing:1px;font-weight:600;">Requested Amount (Not Deducted)</p>
  <p style="margin:0;font-size:38px;font-weight:900;color:#e74c3c;">
    &#8377;{amount:,.2f}
  </p>
</div>

{_table([
    _row("📋", "Request ID",  f"#WD-{request_id:04d}", "#fdf0f0"),
    _row("📅", "Reviewed On", _now(),                   "#fdf0f0"),
])}

<div style="background:#fce8e8;border-left:4px solid #e74c3c;
            padding:14px 18px;border-radius:8px;margin-bottom:24px;">
  <p style="margin:0;font-size:13px;color:#c0392b;font-weight:700;">
    📝 Reason for Rejection</p>
  <p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">
    {rejection_reason or "Your request did not meet the withdrawal criteria at this time."}
  </p>
</div>

{_note("💡", "Good news — your balance is safe!",
       f"Your available balance has <strong>not been deducted</strong>. "
       f"The full amount of ₹{amount:,.2f} remains in your Creator Connect wallet.",
       "#e8f5e9", "#4caf50", "#2e7d32")}

{_note("🔄", "What can you do?",
       "Please review the rejection reason above. Once resolved, you can submit "
       "a new withdrawal request from your Settings page. Ensure your payment "
       "details (UPI ID or bank account) are correctly set up before retrying.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_btn("Update Payment Settings &rarr;", "settings.html#payment", "#e74c3c")}
"""
    return _send(
        f"❌ Withdrawal Request Declined — ₹{amount:,.2f} (Request #{request_id:04d})",
        seller_email,
        _wrap(body, f"Your withdrawal of ₹{amount:,.2f} was not processed — see details inside.",
              "Payout Notification")
    )


# ═════════════════════════════════════════════════════════════════════════════
#  3.  WITHDRAWAL REQUESTED  →  SELLER  (Acknowledgement)
# ═════════════════════════════════════════════════════════════════════════════

def send_withdrawal_requested_email(seller_email, seller_name, amount,
                                     request_id, payment_method_label=""):
    """📤 Sent to seller immediately when they submit a withdrawal request."""
    rows = [_row("📋", "Request ID",   f"#WD-{request_id:04d}", "#f8e8fb"),
            _row("📅", "Submitted On", _now(),                   "#f8e8fb")]
    if payment_method_label:
        rows.append(_row("💳", "Payment Method", payment_method_label, "#f8e8fb"))

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:56px;margin-bottom:10px;">📤</div>
  {_pill("Request Submitted", BRAND)}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Withdrawal request received!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Hi <strong>{seller_name}</strong>, we've received your withdrawal request
    and it's now under review by our team.
  </p>
</div>

<div style="background:linear-gradient(135deg,#f8e8fb,#ede0f8);
            border:2px solid {BRAND};border-radius:16px;
            padding:22px 24px;margin-bottom:24px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;
            letter-spacing:1px;font-weight:600;">Requested Amount</p>
  <p style="margin:0;font-size:38px;font-weight:900;color:{BRAND};">
    &#8377;{amount:,.2f}
  </p>
</div>

{_table(rows)}

{_note("⏳", "What happens next?",
       "Our admin team will review and process your withdrawal within "
       "<strong>1–3 business days</strong>. You'll receive another email "
       "once your payment is sent or if any action is needed.",
       "#fff8e1", "#ffca28", "#7a5f00")}

{_note("🔒", "Your request is secure",
       "Your withdrawal is being processed through our secure payment system. "
       "Never share your bank or UPI details with anyone claiming to be from Creator Connect.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_btn("View Request Status &rarr;", "settings.html#wallet", BRAND)}
"""
    return _send(
        f"📤 Withdrawal Request Submitted — ₹{amount:,.2f} (Request #{request_id:04d})",
        seller_email,
        _wrap(body, f"We received your withdrawal request for ₹{amount:,.2f}!",
              "Payout Notification")
    )


# ═════════════════════════════════════════════════════════════════════════════
#  4.  PAYMENT VERIFIED (APPROVED)  →  BUYER   ← NEW
# ═════════════════════════════════════════════════════════════════════════════

def send_payment_verified_email(buyer_email, buyer_name, order_id,
                                 product_name, amount, seller_name,
                                 admin_note=None):
    """
    ✅ Sent to BUYER when admin approves/verifies their payment submission.
    Call this from payment_routes.py → admin_verify_payment() on action='approve'.
    """
    note_block = ""
    if admin_note:
        note_block = (
            f'<div style="background:#e8f5e9;border-left:4px solid #4caf50;'
            f'padding:14px 18px;border-radius:8px;margin-bottom:24px;">'
            f'<p style="margin:0;font-size:13px;color:#2e7d32;font-weight:700;">'
            f'💬 Note from Admin</p>'
            f'<p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">'
            f'{admin_note}</p></div>'
        )

    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:56px;margin-bottom:10px;">✅</div>
  {_pill("Payment Verified!", "#27ae60")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    Your payment has been confirmed!
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Hi <strong>{buyer_name}</strong>, we've verified your payment and your
    order is now being processed by the seller.
  </p>
</div>

<div style="background:linear-gradient(135deg,#e8f8ee,#c8f5d8);
            border:2px solid #4caf50;border-radius:16px;
            padding:22px 24px;margin-bottom:24px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#555;text-transform:uppercase;
            letter-spacing:1px;font-weight:600;">Amount Confirmed</p>
  <p style="margin:0;font-size:38px;font-weight:900;color:#27ae60;">
    &#8377;{amount:,.2f}
  </p>
</div>

{_table([
    _row("🛍️", "Order ID",    f"#ORD-{order_id:04d}", "#e8f8ee"),
    _row("📦", "Product",     product_name,            "#e8f8ee"),
    _row("🏪", "Seller",      seller_name,             "#e8f8ee"),
    _row("📅", "Verified On", _now(),                  "#e8f8ee"),
])}

{note_block}

{_note("📦", "What happens next?",
       "The seller has been notified and will begin preparing your order. "
       "You'll receive shipping updates as your order progresses.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_note("✅", "Your order is confirmed",
       "Your payment has been successfully verified. "
       "Thank you for shopping on Creator Connect!",
       "#e8f5e9", "#4caf50", "#2e7d32")}

{_btn("View My Orders &rarr;", "orders.html", "#27ae60")}
"""
    return _send(
        f"✅ Payment Verified — Order #{order_id:04d} is Confirmed!",
        buyer_email,
        _wrap(body, f"Your payment of ₹{amount:,.2f} for Order #{order_id} has been verified!",
              "Order Notification")
    )


# ═════════════════════════════════════════════════════════════════════════════
#  5.  PAYMENT REJECTED  →  BUYER   ← NEW
# ═════════════════════════════════════════════════════════════════════════════

def send_payment_rejected_email(buyer_email, buyer_name, order_id,
                                 product_name, amount, rejection_reason=None):
    """
    ❌ Sent to BUYER when admin rejects their payment submission.
    Call this from payment_routes.py → admin_verify_payment() on action='reject'.
    """
    body = f"""
<div style="text-align:center;margin-bottom:28px;">
  <div style="font-size:56px;margin-bottom:10px;">❌</div>
  {_pill("Payment Not Verified", "#e74c3c")}
  <h2 style="margin:0 0 8px;font-size:23px;color:#1a1a2e;font-weight:800;">
    We couldn't verify your payment
  </h2>
  <p style="margin:0;font-size:14px;color:#888;">
    Hi <strong>{buyer_name}</strong>, unfortunately we were unable to verify
    your payment submission for the order below.
  </p>
</div>

<div style="background:linear-gradient(135deg,#fdf0f0,#fce4e4);
            border:2px solid #e74c3c;border-radius:16px;
            padding:22px 24px;margin-bottom:24px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;
            letter-spacing:1px;font-weight:600;">Order Amount</p>
  <p style="margin:0;font-size:38px;font-weight:900;color:#e74c3c;">
    &#8377;{amount:,.2f}
  </p>
</div>

{_table([
    _row("🛍️", "Order ID",   f"#ORD-{order_id:04d}", "#fdf0f0"),
    _row("📦", "Product",    product_name,             "#fdf0f0"),
    _row("📅", "Reviewed On", _now(),                  "#fdf0f0"),
])}

<div style="background:#fce8e8;border-left:4px solid #e74c3c;
            padding:14px 18px;border-radius:8px;margin-bottom:24px;">
  <p style="margin:0;font-size:13px;color:#c0392b;font-weight:700;">
    📝 Reason</p>
  <p style="margin:7px 0 0;font-size:13px;color:#555;line-height:1.65;">
    {rejection_reason or "The payment details submitted could not be verified. "
     "Please ensure you submit the correct UTR / transaction ID."}
  </p>
</div>

{_note("🔄", "What can you do?",
       "Please re-submit your payment with the correct transaction reference. "
       "Go to your order page, click <strong>'Submit Payment Proof'</strong>, "
       "and enter your accurate UTR / transaction ID.",
       "#fff8e1", "#ffca28", "#7a5f00")}

{_note("💬", "Need help?",
       "If you believe this is an error, please contact our support team "
       "with your order ID and payment screenshot.",
       "#e8f0fe", "#4285f4", "#1a73e8")}

{_btn("View My Order &rarr;", f"order-detail.html?id={order_id}", "#e74c3c")}
"""
    return _send(
        f"❌ Payment Verification Failed — Order #{order_id:04d}",
        buyer_email,
        _wrap(body, f"Your payment for Order #{order_id} could not be verified.",
              "Order Notification")
    )