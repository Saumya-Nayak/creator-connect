/**
 * group-notification-patch.js
 * ────────────────────────────────────────────────────────────────
 * Add this AFTER home-content.js in home.html:
 *   <script src="js/group-notification-patch.js"></script>
 *
 * Also add to home-content.html notification bell (after line "message_request:"):
 *   group_invite:  avatarTag || `<div class="notification-icon" style="background:linear-gradient(135deg,#7c3aed,#db2777)"><i class="fas fa-users"></i></div>`,
 *   group_added:   avatarTag || `<div class="notification-icon" style="background:linear-gradient(135deg,#22c55e,#16a34a)"><i class="fas fa-user-check"></i></div>`,
 * ────────────────────────────────────────────────────────────────
 */

(function patchGroupNotifications() {
  "use strict";

  // ── 1. Patch handleNotificationClick for group types ────────────
  function applyClickPatch() {
    const _origClick = window.handleNotificationClick;
    if (typeof _origClick === "function") {
      window.handleNotificationClick = function (notification) {
        if (
          notification.notification_type === "group_invite" ||
          notification.notification_type === "group_added"
        ) {
          if (typeof markNotificationAsRead === "function")
            markNotificationAsRead(notification.notification_id).catch(
              () => {}
            );
          if (typeof closeNotificationsModal === "function")
            closeNotificationsModal();
          if (typeof closeMobileNotifications === "function")
            closeMobileNotifications();
          window.location.href = "messages.html";
          return;
        }
        return _origClick.call(this, notification);
      };
      console.log("✅ Group notification click handler patched");
      return true;
    }
    return false;
  }

  // ── 2. Inject group_invite / group_added icons into createNotificationItem ──
  // We patch createNotificationItem to inject the icons for group types
  function applyIconPatch() {
    const _origCreate = window.createNotificationItem;
    if (typeof _origCreate !== "function") return false;

    window.createNotificationItem = function (notification) {
      const item = _origCreate.call(this, notification);

      // If it's a group notification, replace the generic bell icon
      if (
        notification.notification_type === "group_invite" ||
        notification.notification_type === "group_added"
      ) {
        const iconEl = item.querySelector(
          ".notification-icon, .notification-avatar"
        );
        if (iconEl) {
          const isInvite = notification.notification_type === "group_invite";
          iconEl.outerHTML = isInvite
            ? `<div class="notification-icon" style="background:linear-gradient(135deg,#7c3aed,#db2777);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-users" style="color:#fff;font-size:1rem;"></i></div>`
            : `<div class="notification-icon" style="background:linear-gradient(135deg,#22c55e,#16a34a);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-user-check" style="color:#fff;font-size:1rem;"></i></div>`;
        }
        // Make it clickable → messages.html
        item.style.cursor = "pointer";
        item.onclick = (e) => {
          e.preventDefault();
          if (typeof markNotificationAsRead === "function")
            markNotificationAsRead(notification.notification_id).catch(
              () => {}
            );
          if (typeof closeNotificationsModal === "function")
            closeNotificationsModal();
          if (typeof closeMobileNotifications === "function")
            closeMobileNotifications();
          window.location.href = "messages.html";
        };
      }
      return item;
    };
    console.log("✅ Group notification icon patch applied");
    return true;
  }

  // ── 3. Apply patches — retry until home-content.js is ready ─────
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const clickDone = applyClickPatch();
    const iconDone = applyIconPatch();
    if ((clickDone && iconDone) || attempts > 20) {
      clearInterval(interval);
      if (attempts > 20)
        console.warn("⚠️ group-notification-patch: gave up after 20 attempts");
    }
  }, 300);
})();
