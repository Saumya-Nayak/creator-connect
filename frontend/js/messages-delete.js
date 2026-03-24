/**
 * messages-delete.js
 * ─────────────────────────────────────────────────────────────
 * Add this file as:  js/messages-delete.js
 * Include in messages.html BEFORE messages.js:
 *   <script src="js/messages-delete.js"></script>
 *
 * FEATURES:
 *   • Right-click / long-press on any message → context menu
 *     - Delete for Me    (both sender & receiver)
 *     - Delete for Everyone (sender only)
 *   • Conversation delete modal:
 *     - Delete for Me
 *     - Delete for Everyone (clears entire chat for both)
 *   • Real-time: notifies other user via WebSocket
 * ─────────────────────────────────────────────────────────────
 */

// =====================================================================
// MESSAGE CONTEXT MENU (right-click / long-press)
// =====================================================================

let _contextMenuEl = null;
let _longPressTimer = null;

/**
 * Call this from messages.js after rendering each message element.
 * Attaches right-click and long-press listeners.
 */
function attachMessageDeleteListeners(messageEl, message) {
  if (!messageEl || !message) return;

  const isSender = message.sender_id === currentUser?.id;

  // Right-click (desktop)
  messageEl.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showMessageContextMenu(e.clientX, e.clientY, message, isSender);
  });

  // Long press (mobile)
  messageEl.addEventListener(
    "touchstart",
    (e) => {
      _longPressTimer = setTimeout(() => {
        const touch = e.touches[0];
        showMessageContextMenu(touch.clientX, touch.clientY, message, isSender);
      }, 600);
    },
    { passive: true }
  );

  messageEl.addEventListener("touchend", () => {
    clearTimeout(_longPressTimer);
  });

  messageEl.addEventListener("touchmove", () => {
    clearTimeout(_longPressTimer);
  });
}

function showMessageContextMenu(x, y, message, isSender) {
  removeContextMenu();

  // Don't show menu on already-deleted messages
  if (message.is_deleted_for_everyone) return;

  const menu = document.createElement("div");
  menu.id = "_msgContextMenu";
  menu.style.cssText = `
    position: fixed;
    left: ${Math.min(x, window.innerWidth - 200)}px;
    top: ${Math.min(y, window.innerHeight - 120)}px;
    background: var(--card-bg, #fff);
    border: 1.5px solid var(--border-purple, #f889e5);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 99999;
    min-width: 190px;
    overflow: hidden;
    animation: fadeInScale 0.15s ease;
  `;

  const _item = (icon, label, color, onClick) => {
    const div = document.createElement("div");
    div.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 11px 16px; cursor: pointer; font-size: 0.88rem;
      font-weight: 600; color: ${color};
      transition: background 0.15s;
    `;
    div.innerHTML = `<i class="fas ${icon}" style="width:16px;text-align:center"></i> ${label}`;
    div.onmouseenter = () =>
      (div.style.background = "var(--light-purple, rgba(139,92,246,.08))");
    div.onmouseleave = () => (div.style.background = "transparent");
    div.onclick = () => {
      removeContextMenu();
      onClick();
    };
    return div;
  };

  // Delete for Me — available to both sender and receiver
  menu.appendChild(
    _item("fa-eye-slash", "Delete for Me", "var(--text-primary, #333)", () =>
      confirmDeleteMessage(message.message_id, "me")
    )
  );

  // Delete for Everyone — only sender, and only if not already deleted
  if (isSender) {
    const sep = document.createElement("div");
    sep.style.cssText =
      "height:1px;background:var(--border-color,#eee);margin:2px 0;";
    menu.appendChild(sep);

    menu.appendChild(
      _item("fa-trash-alt", "Delete for Everyone", "#ef4444", () =>
        confirmDeleteMessage(message.message_id, "everyone")
      )
    );
  }

  document.body.appendChild(menu);
  _contextMenuEl = menu;

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", removeContextMenu, { once: true });
  }, 0);
}

function removeContextMenu() {
  if (_contextMenuEl) {
    _contextMenuEl.remove();
    _contextMenuEl = null;
  }
}

// =====================================================================
// CONFIRM DELETE MESSAGE MODAL
// =====================================================================

function confirmDeleteMessage(messageId, mode) {
  const existing = document.getElementById("_deleteMessageModal");
  if (existing) existing.remove();

  const isEveryone = mode === "everyone";

  const modal = document.createElement("div");
  modal.id = "_deleteMessageModal";
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 99998;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div style="
      background: var(--card-bg, #fff);
      border-radius: 16px;
      padding: 24px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    ">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="
          width:44px;height:44px;border-radius:50%;
          background:${
            isEveryone ? "rgba(239,68,68,.12)" : "rgba(139,92,246,.12)"
          };
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        ">
          <i class="fas ${isEveryone ? "fa-trash-alt" : "fa-eye-slash"}"
             style="color:${
               isEveryone ? "#ef4444" : "var(--primary-purple)"
             }"></i>
        </div>
        <div>
          <div style="font-weight:700;font-size:1rem;color:var(--text-primary)">
            ${isEveryone ? "Delete for Everyone?" : "Delete for Me?"}
          </div>
          <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:3px;">
            ${
              isEveryone
                ? "This message will be removed for everyone in this chat."
                : "This message will only be removed from your view."
            }
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
        <button
          onclick="document.getElementById('_deleteMessageModal').remove()"
          style="
            padding:9px 20px;border-radius:10px;border:none;cursor:pointer;
            background:var(--light-purple,rgba(139,92,246,.1));
            color:var(--text-primary);font-weight:700;font-size:0.88rem;
          "
        >Cancel</button>
        <button
          id="_confirmDeleteMsgBtn"
          onclick="executeDeleteMessage(${messageId}, '${mode}')"
          style="
            padding:9px 20px;border-radius:10px;border:none;cursor:pointer;
            background:${
              isEveryone ? "#ef4444" : "var(--primary-purple,#e60aea)"
            };
            color:#fff;font-weight:700;font-size:0.88rem;
          "
        >
          <i class="fas ${isEveryone ? "fa-trash-alt" : "fa-eye-slash"}"></i>
          ${isEveryone ? "Delete for Everyone" : "Delete for Me"}
        </button>
      </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

async function executeDeleteMessage(messageId, mode) {
  const btn = document.getElementById("_confirmDeleteMsgBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const endpoint =
      mode === "everyone"
        ? `${API_BASE_URL}/messages/delete-for-everyone/${messageId}`
        : `${API_BASE_URL}/messages/delete-for-me/${messageId}`;

    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    document.getElementById("_deleteMessageModal")?.remove();

    if (data.success) {
      if (mode === "everyone") {
        // Replace message bubble with deleted placeholder
        _showDeletedPlaceholder(messageId);

        // Notify via WebSocket so other user's UI updates too
        if (socket?.connected && currentConversation) {
          socket.emit("delete_for_everyone", {
            message_id: messageId,
            other_user_id: currentConversation.other_user_id,
          });
        }
        showSuccess("Message deleted for everyone");
      } else {
        // Remove message from DOM silently
        _removeMessageFromDOM(messageId);
        showSuccess("Message deleted for you");
      }

      // Update messages array
      messages = messages.filter((m) => m.message_id !== messageId);
    } else {
      showError(data.message || "Failed to delete message");
    }
  } catch (e) {
    console.error("executeDeleteMessage error:", e);
    showError("Failed to delete message");
    document.getElementById("_deleteMessageModal")?.remove();
  }
}

function _showDeletedPlaceholder(messageId) {
  const el = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!el) return;

  const contentEl = el.querySelector(".message-content") || el;
  const textEl = contentEl.querySelector(".message-text");

  if (textEl) {
    textEl.innerHTML = `
      <span style="
        font-style:italic;color:var(--text-secondary);
        font-size:0.85rem;display:flex;align-items:center;gap:6px;
      ">
        <i class="fas fa-ban" style="font-size:0.75rem"></i>
        This message was deleted
      </span>`;
    // Remove reaction buttons from deleted messages
    el.querySelector(".message-reaction-btn")?.remove();
  }
}

function _removeMessageFromDOM(messageId) {
  const el = document.querySelector(`[data-message-id="${messageId}"]`);
  if (el) {
    el.style.transition = "opacity 0.3s, max-height 0.3s";
    el.style.opacity = "0";
    el.style.maxHeight = "0";
    el.style.overflow = "hidden";
    setTimeout(() => el.remove(), 300);
  }
}

// =====================================================================
// CONVERSATION DELETE MODAL (replaces the old one in messages.js)
// =====================================================================

function showDeleteConversationModal(otherUserName, otherUserId) {
  return new Promise((resolve) => {
    const existing = document.getElementById("_deleteConvModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "_deleteConvModal";
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 99998;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    `;

    modal.innerHTML = `
      <div style="
        background: var(--card-bg,#fff);
        border-radius: 20px;
        padding: 28px;
        max-width: 420px;
        width: 100%;
        box-shadow: 0 16px 48px rgba(0,0,0,0.25);
      ">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
          <div style="
            width:50px;height:50px;border-radius:50%;
            background:rgba(239,68,68,.12);
            display:flex;align-items:center;justify-content:center;flex-shrink:0;
          ">
            <i class="fas fa-trash-alt" style="color:#ef4444;font-size:1.3rem;"></i>
          </div>
          <div>
            <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary)">
              Delete Conversation?
            </div>
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:3px;">
              Chat with <strong>${escapeHtml(otherUserName)}</strong>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">

          <!-- Delete for Me -->
          <button id="_delConvMeBtn" style="
            padding:14px 16px;border-radius:12px;border:1.5px solid var(--border-purple,#f889e5);
            background:var(--card-bg);cursor:pointer;text-align:left;
            display:flex;flex-direction:column;gap:4px;transition:background .2s;
          "
          onmouseover="this.style.background='var(--light-purple,rgba(139,92,246,.06))'"
          onmouseout="this.style.background='var(--card-bg)'">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:var(--text-primary);font-size:.9rem;">
              <i class="fas fa-eye-slash" style="color:var(--primary-purple)"></i>
              Delete for Me
            </div>
            <div style="font-size:.78rem;color:var(--text-secondary);padding-left:22px;">
              Remove from your inbox only. ${escapeHtml(
                otherUserName
              )} can still see it.
            </div>
          </button>

          <!-- Delete for Everyone -->
          <button id="_delConvEveryoneBtn" style="
            padding:14px 16px;border-radius:12px;border:1.5px solid rgba(239,68,68,.3);
            background:var(--card-bg);cursor:pointer;text-align:left;
            display:flex;flex-direction:column;gap:4px;transition:background .2s;
          "
          onmouseover="this.style.background='rgba(239,68,68,.05)'"
          onmouseout="this.style.background='var(--card-bg)'">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#ef4444;font-size:.9rem;">
              <i class="fas fa-trash-alt"></i>
              Delete for Everyone
            </div>
            <div style="font-size:.78rem;color:var(--text-secondary);padding-left:22px;">
              Permanently delete all messages for both you and ${escapeHtml(
                otherUserName
              )}.
              <strong style="color:#ef4444;">This cannot be undone.</strong>
            </div>
          </button>

          <!-- Cancel -->
          <button style="
            padding:12px;border-radius:12px;border:none;
            background:var(--light-purple,rgba(139,92,246,.1));
            color:var(--text-secondary);font-weight:700;cursor:pointer;
            font-size:.88rem;
          "
          onclick="document.getElementById('_deleteConvModal').remove()">
            Cancel
          </button>
        </div>
      </div>
    `;

    // Delete for Me
    modal.querySelector("#_delConvMeBtn").onclick = () => {
      modal.remove();
      resolve("me");
    };

    // Delete for Everyone
    modal.querySelector("#_delConvEveryoneBtn").onclick = () => {
      modal.remove();
      resolve("everyone");
    };

    // Click outside = cancel
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(null);
      }
    });

    document.body.appendChild(modal);
  });
}

// =====================================================================
// UPDATED deleteConversation (replaces the one in messages.js)
// =====================================================================

async function deleteConversation(otherUserId, otherUserName) {
  const mode = await showDeleteConversationModal(otherUserName, otherUserId);
  if (!mode) return; // user cancelled

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(
      `${API_BASE_URL}/messages/delete-conversation/${otherUserId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      }
    );
    const data = await res.json();

    if (data.success) {
      showSuccess(
        mode === "everyone"
          ? "Conversation deleted for everyone"
          : "Conversation deleted for you"
      );

      // Remove from UI
      conversations = conversations.filter(
        (c) => c.other_user_id !== otherUserId
      );
      if (typeof renderConversations === "function")
        renderConversations(conversations);

      // Close chat panel if this was active
      if (currentConversation?.other_user_id === otherUserId) {
        if (typeof closeCurrentConversation === "function")
          closeCurrentConversation();
      }
    } else {
      showError(data.message || "Failed to delete conversation");
    }
  } catch (e) {
    console.error("deleteConversation error:", e);
    showError("Network error. Please try again.");
  }
}

// =====================================================================
// WEBSOCKET: handle incoming delete-for-everyone from other user
// =====================================================================

// Add this to your setupWebSocketListeners() in messages.js:
//
//   socket.on('message_deleted_for_everyone', (data) => {
//     _showDeletedPlaceholder(data.message_id);
//     messages = messages.map(m =>
//       m.message_id === data.message_id
//         ? { ...m, is_deleted_for_everyone: true, message: null, media_url: null }
//         : m
//     );
//   });

// =====================================================================
// CSS
// =====================================================================

const _deleteCss = `
@keyframes fadeInScale {
  from { opacity:0; transform:scale(.92); }
  to   { opacity:1; transform:scale(1); }
}

/* Message right-click highlight */
.message-bubble:active,
.message-bubble.context-open {
  opacity: 0.85;
}

/* Deleted message style */
.message-bubble .message-text[data-deleted] {
  opacity: 0.6;
}
`;

if (!document.getElementById("_deleteMsgCss")) {
  const s = document.createElement("style");
  s.id = "_deleteMsgCss";
  s.textContent = _deleteCss;
  document.head.appendChild(s);
}

// =====================================================================
// PATCH createMessageElement in messages.js
// =====================================================================
//
// After the existing messages.js loads, we patch createMessageElement
// to attach the right-click listeners automatically.
//
window.addEventListener("load", () => {
  setTimeout(() => {
    const _origCreate = window.createMessageElement;
    if (typeof _origCreate === "function") {
      window.createMessageElement = function (msg) {
        const el = _origCreate(msg);
        attachMessageDeleteListeners(el, msg);

        // If already deleted for everyone, show placeholder immediately
        if (msg.is_deleted_for_everyone) {
          setTimeout(() => _showDeletedPlaceholder(msg.message_id), 0);
        }
        return el;
      };
      console.log("✅ createMessageElement patched with delete listeners");
    }
  }, 700);
});

// Expose globals
window.attachMessageDeleteListeners = attachMessageDeleteListeners;
window.confirmDeleteMessage = confirmDeleteMessage;
window.executeDeleteMessage = executeDeleteMessage;
window.showDeleteConversationModal = showDeleteConversationModal;
window.deleteConversation = deleteConversation;
window._showDeletedPlaceholder = _showDeletedPlaceholder;

console.log(
  "✅ messages-delete.js loaded — delete for me / for everyone ready"
);
