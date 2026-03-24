/**
 * messages-requests.js
 * ─────────────────────────────────────────────────────────────────
 * Instagram-style message request UI for Creator Connect
 *
 * ADD THIS SCRIPT to messages.html BEFORE messages.js:
 *   <script src="js/messages-requests.js"></script>
 *
 * WHAT THIS DOES:
 *   • Checks message mode (direct / request / blocked) when opening a chat
 *   • Shows correct bottom bar per mode
 *   • Adds "Requests" tab to sidebar with badge count
 *   • Handles send request, accept, decline flows
 * ─────────────────────────────────────────────────────────────────
 */

// =====================================================================
// CHECK MESSAGE MODE — called every time a conversation is opened
// =====================================================================

async function checkMessageMode(otherUserId) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(
      `${API_BASE_URL}/messages/request-status/${otherUserId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    return data; // { mode, request_id, request_status }
  } catch (e) {
    console.warn("checkMessageMode failed:", e);
    return { mode: "direct", request_id: null, request_status: null };
  }
}

// =====================================================================
// RENDER CORRECT BOTTOM INPUT BAR
// =====================================================================

/**
 * Call this after openConversation() loads.
 * Replaces the message input area with the correct UI.
 */
async function renderInputAreaForMode(otherUserId, otherUserName) {
  const modeData = await checkMessageMode(otherUserId);
  const mode = modeData.mode;

  console.log(`💬 Message mode for user ${otherUserId}: ${mode}`);

  const inputContainer = document.querySelector(".message-input-container");
  if (!inputContainer) return;

  if (mode === "direct") {
    // ── Normal chat: restore default input if it was replaced ──────
    _restoreDefaultInput(inputContainer);
  } else if (mode === "request") {
    // ── One-way follow: show request panel ──────────────────────────
    const reqStatus = modeData.request_status;

    if (reqStatus === "pending") {
      _showRequestPendingBar(inputContainer, otherUserName);
    } else if (reqStatus === "accepted") {
      // Was accepted — treat as direct now
      _restoreDefaultInput(inputContainer);
    } else if (reqStatus === "declined") {
      _showRequestDeclinedBar(inputContainer, otherUserId, otherUserName);
    } else {
      // No request sent yet — show send-request panel
      _showSendRequestPanel(inputContainer, otherUserId, otherUserName);
    }
  } else if (mode === "blocked") {
    // ── Not following: show blocked info bar ────────────────────────
    _showBlockedBar(inputContainer, otherUserName);
  } else if (mode === "self") {
    inputContainer.innerHTML = `
        <div class="msg-mode-bar" style="justify-content:center; color: var(--text-secondary);">
          <i class="fas fa-user"></i> This is your own profile
        </div>`;
  }
}

// ── Restore default typing input ──────────────────────────────────────

function _restoreDefaultInput(container) {
  // Only restore if it's been replaced
  if (container.querySelector(".message-input-wrapper")) return;

  container.innerHTML = `
      <div class="emoji-picker" id="emojiPicker">
        <div class="emoji-picker-header">
          <span class="emoji-picker-title">😊 Choose an emoji</span>
          <button class="emoji-picker-close" id="emojiPickerCloseBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="emoji-picker-search">
          <input type="text" placeholder="Search emoji..." id="emojiSearch" />
        </div>
        <div class="emoji-picker-categories" id="emojiCategories"></div>
        <div class="emoji-picker-content" id="emojiContent"></div>
        <div class="emoji-picker-footer">
          <span class="recently-used">Recently used emojis appear here</span>
        </div>
      </div>
  
      <div class="message-input-wrapper">
        <div class="message-input">
          <div class="input-actions">
            <button class="input-action-btn" title="Attach media" disabled>
              <i class="fas fa-image"></i>
            </button>
            <button class="input-action-btn" id="emojiBtn" title="Emoji">
              <i class="far fa-smile"></i>
            </button>
          </div>
          <textarea id="messageInput" placeholder="Type a message..." rows="1"></textarea>
        </div>
        <button class="send-button" id="sendButton" disabled>
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>`;

  // Re-attach listeners
  if (typeof setupMessageInputListeners === "function") {
    setupMessageInputListeners();
  }
  if (typeof initializeEmojiPicker === "function") {
    setTimeout(initializeEmojiPicker, 100);
  }
}

// ── Send Request panel (first contact) ───────────────────────────────

function _showSendRequestPanel(container, otherUserId, otherUserName) {
  container.innerHTML = `
      <div class="msg-request-panel">
        <div class="msg-request-info">
          <i class="fas fa-paper-plane" style="color:var(--primary-purple); font-size:1.2rem;"></i>
          <div>
            <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary);">
              Send a message request to <span style="color:var(--primary-purple);">@${escapeHtml(
                otherUserName
              )}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
              They need to accept before you can chat
            </div>
          </div>
        </div>
  
        <div class="msg-request-input-row">
          <textarea
            id="requestMessageInput"
            placeholder="Write your first message..."
            rows="2"
            maxlength="500"
            style="flex:1; resize:none; border-radius:12px; border:1.5px solid var(--border-purple,#f889e5);
                   padding:10px 14px; font-size:0.9rem; background:var(--card-bg); color:var(--text-primary);
                   outline:none; font-family:inherit;"
          ></textarea>
          <button
            id="sendRequestBtn"
            onclick="submitMessageRequest(${otherUserId}, '${escapeHtml(
    otherUserName
  ).replace(/'/g, "\\'")}')"
            style="padding:10px 20px; background:var(--primary-purple,#e60aea); color:#fff;
                   border:none; border-radius:12px; font-weight:700; cursor:pointer;
                   font-size:0.9rem; white-space:nowrap; align-self:flex-end; transition:opacity .2s;"
          >
            <i class="fas fa-paper-plane"></i> Send Request
          </button>
        </div>
      </div>`;
}

// ── Request already sent — pending ───────────────────────────────────

function _showRequestPendingBar(container, otherUserName) {
  container.innerHTML = `
      <div class="msg-mode-bar" style="background:rgba(230,10,234,.06); border-top:2px solid rgba(230,10,234,.2);">
        <i class="fas fa-clock" style="color:var(--primary-purple);"></i>
        <span>Message request sent to <strong>@${escapeHtml(
          otherUserName
        )}</strong> — waiting for them to accept</span>
      </div>`;
}

// ── Request declined ──────────────────────────────────────────────────

function _showRequestDeclinedBar(container, otherUserId, otherUserName) {
  container.innerHTML = `
      <div class="msg-mode-bar" style="background:rgba(239,68,68,.06); border-top:2px solid rgba(239,68,68,.2); flex-direction:column; gap:10px; padding:16px 20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="fas fa-times-circle" style="color:#ef4444;"></i>
          <span style="color:var(--text-secondary);">Your message request to <strong>@${escapeHtml(
            otherUserName
          )}</strong> was declined.</span>
        </div>
        <button
          onclick="_showSendRequestPanel(document.querySelector('.message-input-container'), ${otherUserId}, '${escapeHtml(
    otherUserName
  ).replace(/'/g, "\\'")}')"
          style="align-self:flex-start; padding:8px 18px; background:var(--primary-purple); color:#fff;
                 border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:0.85rem;"
        >
          <i class="fas fa-redo"></i> Send Again
        </button>
      </div>`;
}

// ── Not following — blocked ────────────────────────────────────────────

function _showBlockedBar(container, otherUserName) {
  container.innerHTML = `
      <div class="msg-mode-bar" style="background:var(--bg-secondary,#f8f9fa); border-top:2px solid var(--border-color,#eee);">
        <i class="fas fa-lock" style="color:var(--text-secondary);"></i>
        <span style="color:var(--text-secondary);">
          Follow <strong>@${escapeHtml(
            otherUserName
          )}</strong> to send them a message
        </span>
      </div>`;
}

// =====================================================================
// SUBMIT MESSAGE REQUEST
// =====================================================================

async function submitMessageRequest(receiverId, receiverName) {
  const textarea = document.getElementById("requestMessageInput");
  const firstMessage = textarea ? textarea.value.trim() : "";

  if (!firstMessage) {
    _flashError(textarea, "Please write a message before sending a request");
    return;
  }

  const btn = document.getElementById("sendRequestBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Sending...";
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const res = await fetch(`${API_BASE_URL}/messages/request/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiver_id: receiverId,
        first_message: firstMessage,
      }),
    });

    const data = await res.json();

    if (data.success) {
      const container = document.querySelector(".message-input-container");
      _showRequestPendingBar(container, receiverName);
      showSuccess("Message request sent!");
    } else {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
      }
      showError(data.message || "Failed to send request");
    }
  } catch (e) {
    console.error("submitMessageRequest error:", e);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
    }
    showError("Network error. Please try again.");
  }
}

function _flashError(el, msg) {
  showError(msg);
  if (el) {
    el.style.border = "1.5px solid #ef4444";
    el.focus();
    setTimeout(() => {
      el.style.border = "1.5px solid var(--border-purple,#f889e5)";
    }, 2000);
  }
}

// =====================================================================
// MESSAGE REQUESTS SIDEBAR TAB
// =====================================================================

let _requestsTabActive = false;

function injectRequestsTab() {
  const header = document.querySelector(".conversations-header");
  if (!header || document.getElementById("requestsTabBtn")) return;

  // Insert tab bar between title row and search
  const tabBar = document.createElement("div");
  tabBar.id = "msgTabBar";
  tabBar.style.cssText =
    "display:flex; border-bottom:2px solid var(--border-purple,#f889e5); margin-bottom:12px;";

  tabBar.innerHTML = `
      <button id="tabChats" onclick="switchMsgTab('chats')"
        style="flex:1; padding:10px; border:none; background:transparent; cursor:pointer;
               font-weight:700; font-size:0.88rem; color:var(--primary-purple);
               border-bottom:2px solid var(--primary-purple); margin-bottom:-2px;">
        <i class="fas fa-comments"></i> Chats
      </button>
      <button id="tabRequests" onclick="switchMsgTab('requests')"
        style="flex:1; padding:10px; border:none; background:transparent; cursor:pointer;
               font-weight:700; font-size:0.88rem; color:var(--text-secondary);">
        <i class="fas fa-inbox"></i> Requests
        <span id="requestsBadge" style="display:none; background:var(--primary-purple); color:#fff;
               border-radius:20px; padding:1px 8px; font-size:0.75rem; margin-left:4px;"></span>
      </button>`;

  // Insert before search bar
  const searchDiv = header.querySelector(".message-search");
  if (searchDiv) {
    header.insertBefore(tabBar, searchDiv);
  } else {
    header.appendChild(tabBar);
  }

  // Load request count badge
  updateRequestsBadge();
}

async function updateRequestsBadge() {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(`${API_BASE_URL}/messages/requests/count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const badge = document.getElementById("requestsBadge");
    const count = data.count || 0;
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline";
      } else {
        badge.style.display = "none";
      }
    }
  } catch (e) {
    console.warn("updateRequestsBadge failed:", e);
  }
}

function switchMsgTab(tab) {
  _requestsTabActive = tab === "requests";

  const tabChats = document.getElementById("tabChats");
  const tabRequests = document.getElementById("tabRequests");
  const list = document.getElementById("conversationsList");

  const activeStyle =
    "color:var(--primary-purple); border-bottom:2px solid var(--primary-purple); margin-bottom:-2px;";
  const inactiveStyle = "color:var(--text-secondary); border-bottom:none;";

  if (tab === "chats") {
    if (tabChats) tabChats.style.cssText += activeStyle;
    if (tabRequests) tabRequests.style.cssText += inactiveStyle;
    loadConversations();
  } else {
    if (tabRequests) tabRequests.style.cssText += activeStyle;
    if (tabChats) tabChats.style.cssText += inactiveStyle;
    loadMessageRequests();
  }
}

// =====================================================================
// LOAD & RENDER MESSAGE REQUESTS
// =====================================================================

async function loadMessageRequests() {
  const list = document.getElementById("conversationsList");
  if (!list) return;

  list.innerHTML = `
      <div style="text-align:center; padding:30px 20px; color:var(--text-secondary);">
        <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i>
        <p style="margin-top:8px;">Loading requests...</p>
      </div>`;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(`${API_BASE_URL}/messages/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success && data.requests && data.requests.length > 0) {
      list.innerHTML = "";
      data.requests.forEach((req) => {
        list.appendChild(_createRequestElement(req));
      });
    } else {
      list.innerHTML = `
          <div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
            <i class="fas fa-inbox" style="font-size:3rem; opacity:0.3; margin-bottom:16px;"></i>
            <p>No message requests</p>
            <p style="font-size:0.82rem; margin-top:6px;">When someone requests to message you, it will appear here</p>
          </div>`;
    }
  } catch (e) {
    console.error("loadMessageRequests error:", e);
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">Failed to load requests</div>`;
  }
}

function _createRequestElement(req) {
  const div = document.createElement("div");
  div.className = "request-item";
  div.style.cssText =
    "padding:16px 18px; border-bottom:1px solid var(--border-color,#eee); display:flex; flex-direction:column; gap:12px;";

  const avatarUrl = req.sender_avatar
    ? constructMediaUrl(req.sender_avatar, "profile")
    : null;
  const name = req.sender_name || req.sender_username || "User";
  const preview =
    req.first_message.length > 80
      ? req.first_message.substring(0, 80) + "..."
      : req.first_message;
  const timeAgo = getTimeAgo(req.created_at);

  div.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        ${getAvatarElement(avatarUrl, name, "48px")}
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary);">${escapeHtml(
            name
          )}</div>
          <div style="font-size:0.78rem; color:var(--text-secondary);">@${escapeHtml(
            req.sender_username || ""
          )} · ${timeAgo}</div>
        </div>
      </div>
  
      <div style="background:var(--light-purple,rgba(139,92,246,.07)); padding:10px 14px; border-radius:10px;
                  font-size:0.88rem; color:var(--text-primary); border-left:3px solid var(--primary-purple);">
        "${escapeHtml(preview)}"
      </div>
  
      <div style="display:flex; gap:10px;">
        <button
          onclick="handleAcceptRequest(${req.request_id}, ${
    req.sender_id
  }, '${escapeHtml(name).replace(/'/g, "\\'")}')"
          style="flex:1; padding:9px; background:var(--primary-purple,#e60aea); color:#fff;
                 border:none; border-radius:10px; font-weight:700; cursor:pointer; font-size:0.88rem;
                 transition:opacity .2s;"
          onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'"
        >
          <i class="fas fa-check"></i> Accept
        </button>
        <button
          onclick="handleDeclineRequest(${req.request_id}, '${escapeHtml(
    name
  ).replace(/'/g, "\\'")}')"
          style="flex:1; padding:9px; background:var(--bg-secondary,#f8f9fa); color:var(--text-secondary);
                 border:1.5px solid var(--border-color,#ddd); border-radius:10px; font-weight:700;
                 cursor:pointer; font-size:0.88rem; transition:opacity .2s;"
          onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'"
        >
          <i class="fas fa-times"></i> Decline
        </button>
      </div>`;

  return div;
}

// =====================================================================
// ACCEPT / DECLINE
// =====================================================================

async function handleAcceptRequest(requestId, senderId, senderName) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(
      `${API_BASE_URL}/messages/request/${requestId}/accept`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();

    if (data.success) {
      showSuccess(`You can now chat with ${senderName}!`);
      updateRequestsBadge();
      // Switch to chats tab and open conversation
      switchMsgTab("chats");
      setTimeout(async () => {
        const convo = conversations.find((c) => c.other_user_id === senderId);
        if (convo) {
          openConversation(convo);
        } else {
          await loadConversations();
          setTimeout(() => {
            const c = conversations.find((c) => c.other_user_id === senderId);
            if (c) openConversation(c);
          }, 500);
        }
      }, 300);
    } else {
      showError(data.message || "Failed to accept request");
    }
  } catch (e) {
    showError("Network error. Please try again.");
  }
}

async function handleDeclineRequest(requestId, senderName) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const res = await fetch(
      `${API_BASE_URL}/messages/request/${requestId}/decline`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();

    if (data.success) {
      showSuccess(`Request from ${senderName} declined`);
      updateRequestsBadge();
      loadMessageRequests(); // Refresh the list
    } else {
      showError(data.message || "Failed to decline request");
    }
  } catch (e) {
    showError("Network error. Please try again.");
  }
}

// =====================================================================
// CSS INJECTION
// =====================================================================

const _requestsCSS = `
  /* ── Message mode bars ─────────────────────────────────────── */
  .msg-mode-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    font-size: 0.88rem;
    color: var(--text-secondary);
    background: var(--card-bg);
  }
  
  /* ── Send request panel ────────────────────────────────────── */
  .msg-request-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
    background: var(--card-bg);
    border-top: 2px solid rgba(230,10,234,.2);
  }
  
  .msg-request-info {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  
  .msg-request-input-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  
  /* ── Request item in sidebar ───────────────────────────────── */
  .request-item:last-child {
    border-bottom: none;
  }
  
  .request-item:hover {
    background: var(--light-purple, rgba(139,92,246,.04));
  }
  
  /* Dark mode */
  [data-theme="dark"] .msg-mode-bar {
    background: var(--card-bg);
  }
  [data-theme="dark"] .msg-request-panel {
    background: var(--card-bg);
  }
  `;

if (!document.getElementById("msg-requests-css")) {
  const s = document.createElement("style");
  s.id = "msg-requests-css";
  s.textContent = _requestsCSS;
  document.head.appendChild(s);
}

// =====================================================================
// PATCH openConversation — inject mode check
// =====================================================================
// We wait for messages.js to load, then wrap its openConversation

window.addEventListener("load", () => {
  // Give messages.js time to define its functions
  setTimeout(() => {
    const _origOpenConversation = window.openConversation;

    if (typeof _origOpenConversation === "function") {
      window.openConversation = async function (convo) {
        // Run original
        await _origOpenConversation(convo);
        // Then apply mode-specific input bar
        await renderInputAreaForMode(
          convo.other_user_id,
          convo.other_user_name || convo.other_username || "User"
        );
      };
      console.log("✅ openConversation patched with mode check");
    } else {
      console.warn("⚠️ openConversation not found — patch skipped");
    }

    // Inject Requests tab into sidebar
    injectRequestsTab();
  }, 600);
});

// Expose globals
window.submitMessageRequest = submitMessageRequest;
window.handleAcceptRequest = handleAcceptRequest;
window.handleDeclineRequest = handleDeclineRequest;
window.switchMsgTab = switchMsgTab;
window.updateRequestsBadge = updateRequestsBadge;
window.loadMessageRequests = loadMessageRequests;
window.renderInputAreaForMode = renderInputAreaForMode;

console.log("✅ messages-requests.js loaded — Instagram-style messaging ready");
