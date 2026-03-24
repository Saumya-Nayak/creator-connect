/**
 * js/groups-integrated.js
 * ─────────────────────────────────────────────────────────────────
 * Group messaging integrated INTO the messages.html page.
 * Works alongside messages.js, messages-requests.js, messages-delete.js
 *
 * Uses the SAME socket from messages.js (window.socket)
 * Uses the SAME currentUser from messages.js
 * Renders into the SAME conversations-list and chat-area
 * ─────────────────────────────────────────────────────────────────
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
if (typeof API_BASE_URL === "undefined") {
  var API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/api"
      : "/api";
}
const GROUP_API = `${API_BASE_URL}/groups`;

// ─── STATE ────────────────────────────────────────────────────────────────────
let groups = [];
let currentGroup = null;
let groupMessages = [];
let groupTypingTimeout = null;
let _groupsLoaded = false;

// ─── INIT (called once messages.js socket is ready) ───────────────────────────
window.addEventListener("load", () => {
  setTimeout(() => {
    setupGroupSocketListeners();
    setupGroupInputListeners();
    updateGroupInviteBadge();
    console.log("✅ groups-integrated.js ready");
  }, 1000);
});

// ─── GROUP SOCKET LISTENERS (piggyback on messages.js socket) ─────────────────
function setupGroupSocketListeners() {
  // socket is defined in messages.js as window.socket
  const checkSocket = setInterval(() => {
    if (window.socket) {
      clearInterval(checkSocket);
      _attachGroupSocketEvents(window.socket);
      console.log("✅ Group socket listeners attached");
    }
  }, 300);
}

function _attachGroupSocketEvents(sock) {
  sock.on("new_group_message", (data) => {
    if (!data?.message) return;
    handleNewGroupMessage(data.message);
  });

  sock.on("group_message_sent", (data) => {
    if (data?.success && data.message) updateTempGroupMessage(data.message);
  });

  sock.on("group_message_error", (data) => {
    showGroupError(data.error || "Failed to send message");
    removeTempGroupMessage();
  });

  sock.on("group_user_typing", (data) => {
    handleGroupTypingIndicator(data);
  });

  sock.on("group_message_deleted_for_everyone", (data) => {
    showGroupDeletedPlaceholder(data.message_id);
  });

  // Rejoin current group room on reconnect
  sock.on("connect", () => {
    if (currentGroup) {
      sock.emit("join_group", { group_id: currentGroup.group_id });
    }
  });
}

// ─── LOAD GROUPS INTO SIDEBAR LIST ───────────────────────────────────────────
async function loadGroupsIntoList() {
  const list = document.getElementById("conversationsList");
  if (!list) return;

  if (!_groupsLoaded) {
    list.innerHTML = `
      <div class="conversations-loading">
        <div class="skeleton skeleton-conversation"></div>
        <div class="skeleton skeleton-conversation"></div>
        <div class="skeleton skeleton-conversation"></div>
      </div>`;
  }

  try {
    const res = await fetch(GROUP_API, {
      headers: { Authorization: `Bearer ${_getToken()}` },
    });
    const data = await res.json();

    _groupsLoaded = true;

    if (data.success && data.groups?.length > 0) {
      groups = data.groups;
      _renderGroupList(groups);
    } else {
      list.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
          <i class="fas fa-users" style="font-size:3rem;opacity:.3;margin-bottom:16px;"></i>
          <p>No groups yet</p>
          <p style="font-size:.85rem;margin-top:8px;">Create your first group!</p>
          <button onclick="openCreateGroupModal()"
            style="margin-top:16px;padding:10px 24px;border-radius:20px;border:none;cursor:pointer;
                   background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));
                   color:#fff;font-weight:700;">
            <i class="fas fa-plus"></i> Create Group
          </button>
        </div>`;
    }
  } catch (e) {
    console.error("loadGroupsIntoList error:", e);
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">Failed to load groups</div>`;
  }
}

function filterGroupsList(query) {
  const filtered = groups.filter((g) => g.name.toLowerCase().includes(query));
  _renderGroupList(filtered);
}

function _renderGroupList(arr) {
  const list = document.getElementById("conversationsList");
  if (!list) return;
  list.innerHTML = "";
  arr.forEach((g) => list.appendChild(_createGroupListItem(g)));
}

function _createGroupListItem(group) {
  const div = document.createElement("div");
  div.className = "conversation-item";
  div.dataset.groupId = group.group_id;

  const time = _timeAgo(group.last_message_time || group.updated_at);
  let preview = "No messages yet";
  if (group.last_message_text) {
    const isOwn =
      group.last_message_sender_id === (currentUser || window.currentUser)?.id;
    preview = isOwn
      ? `You: ${group.last_message_text}`
      : `${group.last_message_sender_name || "Member"}: ${
          group.last_message_text
        }`;
  }

  div.innerHTML = `
    <div style="position:relative;">
      ${_groupAvatar(group.avatar, group.name, "56px")}
    </div>
    <div class="conversation-info">
      <div class="conversation-name" style="display:flex;align-items:center;gap:6px;">
        <i class="fas fa-users" style="font-size:.72rem;color:var(--primary-purple);"></i>
        ${_esc(group.name)}
        ${
          group.role === "admin"
            ? `<span style="font-size:.6rem;background:var(--primary-purple);color:#fff;
                          padding:1px 6px;border-radius:8px;">Admin</span>`
            : ""
        }
      </div>
      <div class="conversation-preview ${
        group.unread_count > 0 ? "unread" : ""
      }">
        ${_esc(preview).substring(0, 42)}${preview.length > 42 ? "..." : ""}
      </div>
    </div>
    <div class="conversation-meta">
      <span class="conversation-time">${time}</span>
      ${
        group.unread_count > 0
          ? `<span class="unread-badge">${group.unread_count}</span>`
          : ""
      }
    </div>`;

  div.onclick = () => openGroup(group);
  return div;
}

// ─── OPEN GROUP ───────────────────────────────────────────────────────────────
async function openGroup(group) {
  // Leave previous group room
  if (currentGroup && window.socket) {
    window.socket.emit("leave_group_room", { group_id: currentGroup.group_id });
  }

  currentGroup = group;
  window.currentGroup = group; // keep in sync for modal access

  // Deselect all
  document
    .querySelectorAll(".conversation-item")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelector(`[data-group-id="${group.group_id}"]`)
    ?.classList.add("active");

  // Hide DM panel, show group panel
  const chatArea = document.getElementById("chatArea");
  const activeChat = document.getElementById("activeChat");
  const activeGroup = document.getElementById("activeGroupChat");
  const emptyState = document.getElementById("emptyChatState");

  if (chatArea) chatArea.classList.add("active");
  if (emptyState) emptyState.style.display = "none";
  if (activeChat) activeChat.style.display = "none";
  if (activeGroup) activeGroup.style.display = "flex";

  // Mobile: hide sidebar
  if (window.innerWidth <= 768) {
    document.getElementById("conversationsSidebar")?.classList.add("hidden");
  }

  // Update header
  _updateGroupChatHeader(group);

  // Load messages
  await _loadGroupMessages(group.group_id);

  // Join socket room
  window.socket?.emit("join_group", { group_id: group.group_id });
}

function _updateGroupChatHeader(group) {
  const header = document.getElementById("groupChatHeader");
  if (!header) return;
  const user = currentUser || window.currentUser;
  const isAdmin = group.role === "admin";

  // Build avatar — profile pic if exists, otherwise letter
  const avatarUrl = group.avatar ? _mediaUrl(group.avatar) : null;
  const avatarHTML = avatarUrl
    ? `<img src="${avatarUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--primary-purple);"
         onerror="this.outerHTML='<div style=\\'width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;flex-shrink:0;\\'>${group.name
           .charAt(0)
           .toUpperCase()}</div>'" />`
    : `<div style="width:44px;height:44px;border-radius:50%;flex-shrink:0;
                   background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));
                   color:#fff;display:flex;align-items:center;justify-content:center;
                   font-size:1.1rem;font-weight:700;border:2px solid var(--primary-purple);">
         <i class="fas fa-users" style="font-size:.9rem;"></i>
       </div>`;

  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex:1;cursor:pointer;min-width:0;"
         onclick="showGroupInfoModal(${group.group_id})">
      ${avatarHTML}
      <div style="min-width:0;">
        <div style="font-weight:700;font-size:1rem;color:var(--text-primary);
                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${_esc(group.name)}
        </div>
        <div style="font-size:.78rem;color:var(--text-secondary);" id="groupMemberCount">
          ${group.member_count || "?"} members
        </div>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0;">
      <button class="chat-action-btn" onclick="showGroupInfoModal(${
        group.group_id
      })" title="Group Info">
        <i class="fas fa-info-circle"></i>
      </button>
      ${
        isAdmin
          ? `<button class="chat-action-btn" onclick="openAddMemberToGroupModal(${group.group_id})" title="Add Member">
             <i class="fas fa-user-plus"></i>
           </button>`
          : ""
      }
      <button class="chat-action-btn" onclick="confirmLeaveCurrentGroup()"
              title="Leave Group" style="color:#ef4444;">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    </div>`;
}

// ─── LOAD GROUP MESSAGES ──────────────────────────────────────────────────────
async function _loadGroupMessages(groupId) {
  const wrapper = document.getElementById("groupMessagesWrapper");
  if (!wrapper) return;

  wrapper.innerHTML = `
    <div class="messages-loading">
      <div class="skeleton skeleton-message"></div>
      <div class="skeleton skeleton-message sent"></div>
      <div class="skeleton skeleton-message"></div>
    </div>`;

  try {
    const res = await fetch(`${GROUP_API}/${groupId}/messages?limit=100`, {
      headers: { Authorization: `Bearer ${_getToken()}` },
    });
    const data = await res.json();

    if (data.success) {
      groupMessages = data.messages;
      _renderGroupMessages(groupMessages);
      setTimeout(() => (wrapper.scrollTop = wrapper.scrollHeight), 100);
    } else {
      wrapper.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
          <i class="fas fa-comment-dots" style="font-size:3rem;opacity:.3;margin-bottom:16px;"></i>
          <p>No messages yet</p><p style="font-size:.85rem;margin-top:8px;">Send the first message!</p>
        </div>`;
      groupMessages = [];
    }
  } catch (e) {
    console.error("_loadGroupMessages error:", e);
    groupMessages = [];
  }
}

function _renderGroupMessages(msgs) {
  const wrapper = document.getElementById("groupMessagesWrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";
  let lastDate = null;
  msgs.forEach((msg) => {
    const d = new Date(msg.created_at).toLocaleDateString();
    if (d !== lastDate) {
      wrapper.appendChild(_groupDateDivider(msg.created_at));
      lastDate = d;
    }
    wrapper.appendChild(_createGroupMsgElement(msg));
  });
}

function _groupDateDivider(ts) {
  const div = document.createElement("div");
  div.className = "date-divider";
  div.innerHTML = `<span>${_formatDate(ts)}</span>`;
  return div;
}

function _createGroupMsgElement(msg) {
  const user = currentUser || window.currentUser;
  const isSent = msg.sender_id === user?.id;
  const div = document.createElement("div");
  div.className = `message-bubble ${isSent ? "sent" : "received"}`;
  div.dataset.messageId = msg.message_id;
  if (msg.is_temporary) div.classList.add("sending");

  const senderName = msg.sender_name || msg.sender_username || "Member";
  const time = _formatTime(msg.created_at);

  let bodyHTML;
  if (msg.is_deleted_for_everyone) {
    bodyHTML = `<div class="message-text" style="font-style:italic;color:var(--text-secondary);font-size:.85rem;">
      <i class="fas fa-ban" style="font-size:.75rem;margin-right:4px;"></i>This message was deleted
    </div>`;
  } else if (msg.message) {
    bodyHTML = `<div class="message-text">${_esc(msg.message)}</div>`;
  } else {
    bodyHTML = `<div class="message-text" style="font-style:italic;color:var(--text-secondary);">[Media]</div>`;
  }

  // Avatar for received messages — profile pic if available, else initial letter
  const avatarUrl = msg.sender_avatar
    ? _mediaUrl(msg.sender_avatar, "profile")
    : null;
  const avatarHTML = !isSent
    ? avatarUrl
      ? `<img src="${avatarUrl}"
             style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid var(--primary-purple);"
             onerror="this.outerHTML='<div style=\\'width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0;\\'>${senderName
               .charAt(0)
               .toUpperCase()}</div>'" />`
      : `<div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
                       background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));
                       color:#fff;display:flex;align-items:center;justify-content:center;
                       font-weight:700;font-size:.85rem;">
             ${senderName.charAt(0).toUpperCase()}
           </div>`
    : "";

  div.innerHTML = `
    ${avatarHTML}
    <div class="message-content">
      ${
        !isSent
          ? `<div class="group-sender-label">${_esc(senderName)}</div>`
          : ""
      }
      ${bodyHTML}
      <div class="message-meta">
        <span>${time}</span>
        ${
          isSent && msg.is_temporary
            ? '<i class="fas fa-clock" style="font-size:.7rem;"></i>'
            : ""
        }
      </div>
    </div>`;

  // Right-click to delete
  if (!msg.is_deleted_for_everyone && !msg.is_temporary) {
    div.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      _showGroupMsgMenu(e.clientX, e.clientY, msg, isSent);
    });
    let _lpTimer;
    div.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        _lpTimer = setTimeout(
          () => _showGroupMsgMenu(t.clientX, t.clientY, msg, isSent),
          600
        );
      },
      { passive: true }
    );
    div.addEventListener("touchend", () => clearTimeout(_lpTimer));
  }

  return div;
}

// ─── SEND GROUP MESSAGE ───────────────────────────────────────────────────────
async function sendGroupMessage() {
  if (!currentGroup) return;
  const textarea = document.getElementById("groupMessageInput");
  const message = textarea?.value.trim();
  if (!message) return;

  const user = currentUser || window.currentUser;
  const sendBtn = document.getElementById("groupSendButton");
  if (sendBtn) sendBtn.disabled = true;

  // Optimistic temp message shown immediately
  const temp = {
    message_id: `temp_${Date.now()}`,
    sender_id: user?.id,
    group_id: currentGroup.group_id,
    message,
    sender_name: user?.full_name,
    sender_username: user?.username,
    sender_avatar: user?.profile_pic,
    created_at: new Date().toISOString(),
    is_temporary: true,
    is_deleted_for_everyone: false,
  };

  groupMessages.push(temp);
  const wrapper = document.getElementById("groupMessagesWrapper");
  if (wrapper) {
    const el = _createGroupMsgElement(temp);
    el.dataset.tempId = temp.message_id;
    wrapper.appendChild(el);
    wrapper.scrollTop = wrapper.scrollHeight;
  }

  // Clear input immediately
  if (textarea) {
    textarea.value = "";
    textarea.style.height = "auto";
  }
  if (sendBtn) sendBtn.disabled = false;

  // Try WebSocket first, fall back to HTTP
  const sock = window.socket;
  if (sock?.connected) {
    sock.emit("group_typing_stop", { group_id: currentGroup.group_id });
    sock.emit("send_group_message", {
      group_id: currentGroup.group_id,
      message,
    });
  } else {
    // Fallback: send via REST API directly
    console.log("⚠️ Socket not connected — sending group message via HTTP");
    try {
      const res = await fetch(
        `${GROUP_API}/${currentGroup.group_id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${_getToken()}`,
          },
          body: JSON.stringify({ message }),
        }
      );
      const data = await res.json();
      if (data.success) {
        updateTempGroupMessage(data.data);
        loadGroupsIntoList(); // refresh sidebar
      } else {
        showGroupError(data.message || "Failed to send message");
        removeTempGroupMessage();
      }
    } catch (e) {
      showGroupError("Failed to send message. Please check your connection.");
      removeTempGroupMessage();
    }
  }
}

function handleNewGroupMessage(msg) {
  if (!currentGroup || msg.group_id !== currentGroup.group_id) {
    loadGroupsIntoList(); // sidebar only
    return;
  }
  if (groupMessages.find((m) => m.message_id === msg.message_id)) return;

  groupMessages.push(msg);
  const wrapper = document.getElementById("groupMessagesWrapper");
  if (wrapper) {
    wrapper.appendChild(_createGroupMsgElement(msg));
    wrapper.scrollTop = wrapper.scrollHeight;
  }
  loadGroupsIntoList();
}

function updateTempGroupMessage(serverMsg) {
  const tempEl = document.querySelector("[data-temp-id^='temp_']");
  const wrapper = document.getElementById("groupMessagesWrapper");
  const idx = groupMessages.findIndex((m) => m.is_temporary);
  if (idx !== -1) groupMessages[idx] = { ...serverMsg, is_temporary: false };
  if (tempEl && wrapper) {
    tempEl.remove();
    wrapper.appendChild(_createGroupMsgElement(serverMsg));
    wrapper.scrollTop = wrapper.scrollHeight;
  }
  loadGroupsIntoList();
}

function removeTempGroupMessage() {
  document.querySelector("[data-temp-id^='temp_']")?.remove();
  groupMessages = groupMessages.filter((m) => !m.is_temporary);
}

// ─── TYPING ───────────────────────────────────────────────────────────────────
function handleGroupInputTyping() {
  if (!currentGroup) return;
  const sock = window.socket;
  if (sock?.connected) {
    sock.emit("group_typing_start", { group_id: currentGroup.group_id });
  }
  clearTimeout(groupTypingTimeout);
  groupTypingTimeout = setTimeout(() => {
    if (window.socket?.connected) {
      window.socket.emit("group_typing_stop", {
        group_id: currentGroup.group_id,
      });
    }
  }, 2000);
}

function handleGroupTypingIndicator(data) {
  if (!currentGroup || data.group_id !== currentGroup.group_id) return;
  const wrapper = document.getElementById("groupMessagesWrapper");
  if (!wrapper) return;
  let indicator = document.getElementById("groupTypingIndicator");
  if (data.typing) {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "groupTypingIndicator";
      indicator.className = "typing-indicator";
      indicator.innerHTML = `
        <div class="typing-dots"><span></span><span></span><span></span></div>
        <span class="typing-text">Someone is typing...</span>`;
      wrapper.appendChild(indicator);
      wrapper.scrollTop = wrapper.scrollHeight;
    }
  } else {
    indicator?.remove();
  }
}

// ─── GROUP MESSAGE CONTEXT MENU ───────────────────────────────────────────────
function _showGroupMsgMenu(x, y, msg, isSender) {
  document.getElementById("_grpMsgMenu")?.remove();
  const menu = document.createElement("div");
  menu.id = "_grpMsgMenu";
  menu.style.cssText = `
    position:fixed;left:${Math.min(x, window.innerWidth - 200)}px;
    top:${Math.min(y, window.innerHeight - 110)}px;
    background:var(--card-bg);border:1.5px solid var(--border-purple,#f889e5);
    border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);
    z-index:99999;min-width:180px;overflow:hidden;`;

  const item = (icon, label, color, cb) => {
    const d = document.createElement("div");
    d.style.cssText = `display:flex;align-items:center;gap:10px;padding:11px 16px;
      cursor:pointer;font-size:.88rem;font-weight:600;color:${color};`;
    d.innerHTML = `<i class="fas ${icon}" style="width:16px;text-align:center"></i> ${label}`;
    d.onmouseenter = () =>
      (d.style.background = "var(--light-purple,rgba(139,92,246,.08))");
    d.onmouseleave = () => (d.style.background = "transparent");
    d.onclick = () => {
      menu.remove();
      cb();
    };
    return d;
  };

  menu.appendChild(
    item("fa-eye-slash", "Delete for Me", "var(--text-primary)", () =>
      _deleteGroupMsgForMe(msg.message_id)
    )
  );
  if (isSender) {
    menu.appendChild(
      item("fa-trash-alt", "Delete for Everyone", "#ef4444", () =>
        _deleteGroupMsgForEveryone(msg.message_id)
      )
    );
  }

  document.body.appendChild(menu);
  setTimeout(
    () =>
      document.addEventListener("click", () => menu.remove(), { once: true }),
    0
  );
}

async function _deleteGroupMsgForMe(messageId) {
  try {
    const res = await fetch(
      `${GROUP_API}/messages/delete-for-me/${messageId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${_getToken()}` },
      }
    );
    const data = await res.json();
    if (data.success) {
      document.querySelector(`[data-message-id="${messageId}"]`)?.remove();
      groupMessages = groupMessages.filter((m) => m.message_id !== messageId);
      showGroupSuccess("Message deleted for you");
    } else showGroupError(data.message);
  } catch (e) {
    showGroupError("Failed to delete message");
  }
}

async function _deleteGroupMsgForEveryone(messageId) {
  try {
    const res = await fetch(
      `${GROUP_API}/messages/delete-for-everyone/${messageId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${_getToken()}` },
      }
    );
    const data = await res.json();
    if (data.success) {
      showGroupDeletedPlaceholder(messageId);
      window.socket?.emit("delete_group_message_for_everyone", {
        message_id: messageId,
        group_id: currentGroup?.group_id,
      });
      showGroupSuccess("Message deleted for everyone");
    } else showGroupError(data.message);
  } catch (e) {
    showGroupError("Failed to delete message");
  }
}

function showGroupDeletedPlaceholder(messageId) {
  const el = document.querySelector(`[data-message-id="${messageId}"]`);
  const textEl = el?.querySelector(".message-text");
  if (textEl) {
    textEl.innerHTML = `<span style="font-style:italic;color:var(--text-secondary);font-size:.85rem;">
      <i class="fas fa-ban" style="font-size:.75rem;margin-right:4px;"></i>This message was deleted</span>`;
  }
}

// ─── CREATE GROUP MODAL ───────────────────────────────────────────────────────
function openCreateGroupModal() {
  let modal = document.getElementById("_createGroupModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "_createGroupModal";
    modal.style.cssText = `position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.6);
      backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;`;
    document.body.appendChild(modal);
  }

  window._selGroupMembers = [];

  modal.innerHTML = `
    <div style="background:var(--card-bg);border-radius:20px;padding:28px;max-width:440px;
                width:100%;box-shadow:0 16px 48px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div style="width:44px;height:44px;border-radius:50%;
                    background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));
                    display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-users" style="color:#fff;"></i>
        </div>
        <h3 style="font-weight:800;font-size:1.1rem;color:var(--text-primary);margin:0;">New Group</h3>
        <button onclick="document.getElementById('_createGroupModal').style.display='none'"
          style="margin-left:auto;background:none;border:none;cursor:pointer;
                 color:var(--text-secondary);font-size:1.2rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <input id="_grpName" type="text" placeholder="Group name *" maxlength="100"
        style="width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid var(--border-purple);
               background:var(--card-bg);color:var(--text-primary);font-size:.95rem;
               margin-bottom:12px;box-sizing:border-box;outline:none;" />

      <textarea id="_grpDesc" placeholder="Description (optional)" maxlength="500" rows="2"
        style="width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid var(--border-purple);
               background:var(--card-bg);color:var(--text-primary);font-size:.95rem;
               margin-bottom:14px;box-sizing:border-box;outline:none;resize:none;"></textarea>

      <p style="font-size:.83rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">
        <i class="fas fa-user-plus" style="margin-right:4px;"></i>Add members
      </p>
      <div style="position:relative;margin-bottom:8px;">
        <input id="_grpMemberSearch" type="text" placeholder="Search users..."
          style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border-purple);
                 background:var(--card-bg);color:var(--text-primary);font-size:.9rem;
                 box-sizing:border-box;outline:none;"
          oninput="_searchGrpMembers(this.value)" />
      </div>
      <div id="_grpMemberResults" style="max-height:160px;overflow-y:auto;margin-bottom:8px;"></div>
      <div id="_grpSelectedDisplay" style="font-size:.78rem;color:var(--text-secondary);min-height:20px;"></div>

      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
        <button onclick="document.getElementById('_createGroupModal').style.display='none'"
          style="padding:10px 20px;border-radius:10px;border:none;cursor:pointer;
                 background:var(--light-purple);color:var(--text-primary);font-weight:700;">
          Cancel
        </button>
        <button onclick="_submitCreateGroup()"
          style="padding:10px 20px;border-radius:10px;border:none;cursor:pointer;
                 background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));
                 color:#fff;font-weight:700;">
          <i class="fas fa-users"></i> Create Group
        </button>
      </div>
    </div>`;

  modal.style.display = "flex";
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

let _grpSearchTimer = null;
async function _searchGrpMembers(query) {
  clearTimeout(_grpSearchTimer);
  const el = document.getElementById("_grpMemberResults");
  if (!query.trim()) {
    el.innerHTML = "";
    return;
  }
  _grpSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${_getToken()}` } }
      );
      const data = await res.json();
      if (data.success && data.users?.length > 0) {
        el.innerHTML = "";
        data.users.forEach((u) => {
          const sel = (window._selGroupMembers || []).includes(u.id);
          const picUrl = u.profile_pic
            ? _mediaUrl(u.profile_pic, "profile")
            : null;
          const initial = (u.full_name || "?").charAt(0).toUpperCase();

          const row = document.createElement("div");
          row.style.cssText = `display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:8px;background:${
            sel ? "var(--light-purple)" : "transparent"
          };`;
          row.onclick = () => _toggleGrpMember(u.id, u.full_name);
          row.onmouseenter = () =>
            (row.style.background = "var(--light-purple)");
          row.onmouseleave = () =>
            (row.style.background = sel
              ? "var(--light-purple)"
              : "transparent");

          // Avatar
          const avatarWrap = document.createElement("div");
          avatarWrap.style.flexShrink = "0";
          if (picUrl) {
            const img = document.createElement("img");
            img.src = picUrl;
            img.alt = u.full_name;
            img.style.cssText =
              "width:34px;height:34px;border-radius:50%;object-fit:cover;border:1.5px solid var(--primary-purple);display:block;";
            const fallback = document.createElement("div");
            fallback.style.cssText =
              "width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:none;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;";
            fallback.textContent = initial;
            img.onerror = () => {
              img.style.display = "none";
              fallback.style.display = "flex";
            };
            avatarWrap.appendChild(img);
            avatarWrap.appendChild(fallback);
          } else {
            const div = document.createElement("div");
            div.style.cssText =
              "width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;";
            div.textContent = initial;
            avatarWrap.appendChild(div);
          }

          // Info
          const info = document.createElement("div");
          info.style.flex = "1";
          info.innerHTML = `<div style="font-size:.9rem;font-weight:600;color:var(--text-primary);">${_esc(
            u.full_name
          )}</div>
            <div style="font-size:.76rem;color:var(--text-secondary);">@${_esc(
              u.username
            )}</div>`;

          row.appendChild(avatarWrap);
          row.appendChild(info);
          if (sel) {
            const check = document.createElement("i");
            check.className = "fas fa-check";
            check.style.color = "var(--primary-purple)";
            row.appendChild(check);
          }
          el.appendChild(row);
        });
      } else {
        el.innerHTML = `<p style="text-align:center;color:var(--text-secondary);font-size:.85rem;padding:10px;">No users found</p>`;
      }
    } catch (e) {
      el.innerHTML = `<p style="text-align:center;color:#ef4444;font-size:.85rem;padding:10px;">Search failed</p>`;
    }
  }, 400);
}

function _toggleGrpMember(id, name) {
  window._selGroupMembers = window._selGroupMembers || [];
  const idx = window._selGroupMembers.indexOf(id);
  if (idx === -1) window._selGroupMembers.push(id);
  else window._selGroupMembers.splice(idx, 1);

  const display = document.getElementById("_grpSelectedDisplay");
  if (display) {
    display.textContent =
      window._selGroupMembers.length > 0
        ? `${window._selGroupMembers.length} member(s) selected`
        : "";
  }
  const q = document.getElementById("_grpMemberSearch")?.value;
  if (q) _searchGrpMembers(q);
}

async function _submitCreateGroup() {
  const name = document.getElementById("_grpName")?.value.trim();
  const desc = document.getElementById("_grpDesc")?.value.trim();
  const memberIds = window._selGroupMembers || [];

  if (!name) {
    showGroupError("Group name is required");
    return;
  }

  try {
    const res = await fetch(GROUP_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${_getToken()}`,
      },
      body: JSON.stringify({ name, description: desc, member_ids: memberIds }),
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById("_createGroupModal").style.display = "none";
      showGroupSuccess("Group created!");
      _groupsLoaded = false;
      // Switch to groups tab and open the new group
      if (typeof switchMainTab === "function") switchMainTab("groups");
      setTimeout(async () => {
        await loadGroupsIntoList();
        const newGrp = groups.find((g) => g.group_id === data.group_id);
        if (newGrp) openGroup(newGrp);
      }, 300);
    } else {
      showGroupError(data.message || "Failed to create group");
    }
  } catch (e) {
    showGroupError("Failed to create group");
  }
}

// ─── ADD MEMBER MODAL ─────────────────────────────────────────────────────────
function openAddMemberToGroupModal(groupId) {
  let modal = document.getElementById("_addMemberModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "_addMemberModal";
    modal.style.cssText = `position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.6);
      backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:var(--card-bg);border-radius:20px;padding:24px;max-width:400px;width:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3 style="margin:0;font-weight:800;color:var(--text-primary);">
          <i class="fas fa-user-plus" style="color:var(--primary-purple);margin-right:8px;"></i>Add Member
        </h3>
        <button onclick="document.getElementById('_addMemberModal').style.display='none'"
          style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:1.2rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <input type="text" id="_addMbrSearch" placeholder="Search users..."
        style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border-purple);
               background:var(--card-bg);color:var(--text-primary);font-size:.9rem;
               box-sizing:border-box;outline:none;margin-bottom:10px;"
        oninput="_searchAddMember(this.value, ${groupId})" />
      <div id="_addMbrResults" style="max-height:220px;overflow-y:auto;"></div>
    </div>`;
  modal.style.display = "flex";
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

let _addMbrTimer = null;
async function _searchAddMember(query, groupId) {
  clearTimeout(_addMbrTimer);
  const el = document.getElementById("_addMbrResults");
  if (!query.trim()) {
    el.innerHTML = "";
    return;
  }

  // Show loading skeleton while debouncing
  el.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text-secondary);">
    <i class="fas fa-spinner fa-spin"></i>
  </div>`;

  _addMbrTimer = setTimeout(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${_getToken()}` } }
      );
      const data = await res.json();
      if (data.success && data.users?.length > 0) {
        // Build rows in JS so we can call _mediaUrl properly
        el.innerHTML = "";
        data.users.forEach((u) => {
          const picUrl = u.profile_pic
            ? _mediaUrl(u.profile_pic, "profile")
            : null;
          const initial = (u.full_name || "?").charAt(0).toUpperCase();

          const row = document.createElement("div");
          row.style.cssText =
            "display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:default;";
          row.onmouseenter = () =>
            (row.style.background = "var(--light-purple)");
          row.onmouseleave = () => (row.style.background = "transparent");

          // Avatar
          const avatarWrap = document.createElement("div");
          avatarWrap.style.cssText = "flex-shrink:0;";
          if (picUrl) {
            const img = document.createElement("img");
            img.src = picUrl;
            img.alt = u.full_name;
            img.style.cssText =
              "width:36px;height:36px;border-radius:50%;object-fit:cover;border:1.5px solid var(--primary-purple);display:block;";
            const fallback = document.createElement("div");
            fallback.style.cssText =
              "width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:none;align-items:center;justify-content:center;font-weight:700;font-size:.9rem;";
            fallback.textContent = initial;
            img.onerror = () => {
              img.style.display = "none";
              fallback.style.display = "flex";
            };
            avatarWrap.appendChild(img);
            avatarWrap.appendChild(fallback);
          } else {
            const div = document.createElement("div");
            div.style.cssText =
              "width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem;";
            div.textContent = initial;
            avatarWrap.appendChild(div);
          }

          // Info
          const info = document.createElement("div");
          info.style.flex = "1";
          info.innerHTML = `<div style="font-size:.9rem;font-weight:600;color:var(--text-primary);">${_esc(
            u.full_name
          )}</div>
            <div style="font-size:.76rem;color:var(--text-secondary);">@${_esc(
              u.username
            )}</div>`;

          // Add button
          const btn = document.createElement("button");
          btn.textContent = "Add";
          btn.style.cssText =
            "padding:6px 14px;border-radius:8px;border:none;cursor:pointer;background:var(--primary-purple);color:#fff;font-size:.8rem;font-weight:700;flex-shrink:0;";
          btn.onclick = () => _inviteToGroup(groupId, u.id, u.full_name, btn);

          row.appendChild(avatarWrap);
          row.appendChild(info);
          row.appendChild(btn);
          el.appendChild(row);
        });
      } else {
        el.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:10px;font-size:.85rem;">No users found</p>`;
      }
    } catch (e) {
      el.innerHTML = `<p style="text-align:center;color:#ef4444;padding:10px;font-size:.85rem;">Search failed</p>`;
    }
  }, 400);
}

async function _inviteToGroup(groupId, userId, name, btnEl) {
  // Show loading on the button
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  try {
    const res = await fetch(`${GROUP_API}/${groupId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${_getToken()}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json();
    if (data.success) {
      const isAdded = data.status === "active";
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = isAdded
          ? '<i class="fas fa-check"></i> Added'
          : '<i class="fas fa-paper-plane"></i> Sent';
        btnEl.style.background = isAdded ? "#22c55e" : "#7c3aed";
      }
      showGroupSuccess(isAdded ? `${name} added!` : `Invite sent to ${name}`);
    } else {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = "Add";
      }
      showGroupError(data.message || "Failed to invite");
    }
  } catch (e) {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = "Add";
    }
    showGroupError("Failed to invite member");
  }
}

// ─── GROUP INVITES LIST ───────────────────────────────────────────────────────
async function loadGroupInvitesIntoList() {
  const list = document.getElementById("conversationsList");
  if (!list) return;
  list.innerHTML = `
    <div style="text-align:center;padding:30px;color:var(--text-secondary);">
      <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i>
    </div>`;
  try {
    const res = await fetch(`${GROUP_API}/invites`, {
      headers: { Authorization: `Bearer ${_getToken()}` },
    });
    const data = await res.json();
    if (data.success && data.invites?.length > 0) {
      list.innerHTML = "";
      data.invites.forEach((inv) =>
        list.appendChild(_createGroupInviteItem(inv))
      );
    } else {
      list.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
          <i class="fas fa-envelope-open" style="font-size:3rem;opacity:.3;margin-bottom:16px;"></i>
          <p>No pending invitations</p>
        </div>`;
    }
  } catch (e) {
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">Failed to load invites</div>`;
  }
}

function _createGroupInviteItem(inv) {
  const div = document.createElement("div");
  div.className = "group-invite-item";
  div.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      ${_groupAvatar(inv.avatar, inv.name, "48px")}
      <div style="flex:1;">
        <div style="font-weight:700;font-size:.95rem;color:var(--text-primary);">
          <i class="fas fa-users" style="font-size:.75rem;color:var(--primary-purple);margin-right:4px;"></i>
          ${_esc(inv.name)}
        </div>
        <div style="font-size:.78rem;color:var(--text-secondary);">
          Invited by ${_esc(inv.inviter_name || "someone")} · ${
    inv.member_count
  } members
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="_respondGrpInvite(${inv.group_id}, true)"
        style="flex:1;padding:9px;background:var(--primary-purple);color:#fff;
               border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:.85rem;">
        <i class="fas fa-check"></i> Accept
      </button>
      <button onclick="_respondGrpInvite(${inv.group_id}, false)"
        style="flex:1;padding:9px;background:var(--light-purple);color:var(--text-secondary);
               border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:.85rem;">
        <i class="fas fa-times"></i> Decline
      </button>
    </div>`;
  return div;
}

async function _respondGrpInvite(groupId, accept) {
  try {
    const res = await fetch(`${GROUP_API}/${groupId}/respond`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${_getToken()}`,
      },
      body: JSON.stringify({ accept }),
    });
    const data = await res.json();
    if (data.success) {
      showGroupSuccess(accept ? "Joined group!" : "Invitation declined");
      updateGroupInviteBadge();
      if (accept) {
        _groupsLoaded = false;
        if (typeof switchMainTab === "function") switchMainTab("groups");
        setTimeout(loadGroupsIntoList, 300);
      } else {
        loadGroupInvitesIntoList();
      }
    } else showGroupError(data.message);
  } catch (e) {
    showGroupError("Failed to respond");
  }
}

async function updateGroupInviteBadge() {
  try {
    const res = await fetch(`${GROUP_API}/invites/count`, {
      headers: { Authorization: `Bearer ${_getToken()}` },
    });
    const data = await res.json();
    const count = data.count || 0;
    ["groupInviteBadge", "groupInviteBadge2"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = count;
        el.classList.toggle("show", count > 0);
        el.style.display = count > 0 ? "inline-flex" : "none";
      }
    });
  } catch (e) {}
}

// ─── GROUP INFO MODAL ─────────────────────────────────────────────────────────
async function showGroupInfoModal(groupId) {
  const res = await fetch(`${GROUP_API}/${groupId}/members`, {
    headers: { Authorization: `Bearer ${_getToken()}` },
  });
  const data = await res.json();
  if (!data.success) return;

  let modal = document.getElementById("_grpInfoModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "_grpInfoModal";
    modal.style.cssText = `position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.6);
      backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;`;
    document.body.appendChild(modal);
  }

  const isAdmin = currentGroup?.role === "admin";
  const user = currentUser || window.currentUser;

  // Build member rows with real profile pics (JS, not template literal)
  const memberRows = data.members
    .map((m) => {
      const picUrl = m.profile_pic ? _mediaUrl(m.profile_pic, "profile") : null;
      const initial = (m.full_name || "?").charAt(0).toUpperCase();
      const avatarHTML = picUrl
        ? `<img src="${picUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid var(--primary-purple);" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:none;align-items:center;justify-content:center;font-weight:700;">${initial}</div>`
        : `<div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${initial}</div>`;
      const adminBadge =
        m.role === "admin"
          ? `<span style="font-size:.62rem;background:var(--primary-purple);color:#fff;padding:2px 8px;border-radius:8px;flex-shrink:0;">Admin</span>`
          : "";
      const removeBtn =
        isAdmin && m.user_id !== user?.id && m.status === "active"
          ? `<button onclick="_kickGrpMember(${groupId}, ${m.user_id}, '${_esc(
              m.full_name
            )}')" style="padding:4px 8px;border-radius:6px;border:none;cursor:pointer;background:#fee;color:#ef4444;font-size:.75rem;flex-shrink:0;">Remove</button>`
          : "";
      const pendingLabel =
        m.status === "pending"
          ? ' · <span style="color:#f59e0b;">Pending</span>'
          : "";
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color,#eee);">${avatarHTML}<div style="flex:1;"><div style="font-size:.9rem;font-weight:600;color:var(--text-primary);">${_esc(
        m.full_name
      )}</div><div style="font-size:.75rem;color:var(--text-secondary);">@${_esc(
        m.username
      )}${pendingLabel}</div></div>${adminBadge}${removeBtn}</div>`;
    })
    .join("");

  modal.innerHTML = `
    <div style="background:var(--card-bg);border-radius:20px;padding:24px;max-width:400px;
                width:100%;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3 style="margin:0;font-weight:800;color:var(--text-primary);">
          <i class="fas fa-users" style="color:var(--primary-purple);margin-right:8px;"></i>
          ${_esc(currentGroup?.name || "Group")}
        </h3>
        <button onclick="document.getElementById('_grpInfoModal').style.display='none'"
          style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:1.2rem;">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <p style="font-size:.83rem;color:var(--text-secondary);margin-bottom:14px;">
        ${data.members.length} member(s)
      </p>
      <div id="_grpMemberList">${memberRows}</div>
    </div>`;

  modal.style.display = "flex";
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

async function _kickGrpMember(groupId, userId, name) {
  if (!confirm(`Remove ${name} from the group?`)) return;
  const res = await fetch(`${GROUP_API}/${groupId}/members/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${_getToken()}` },
  });
  const data = await res.json();
  if (data.success) {
    showGroupSuccess(`${name} removed`);
    showGroupInfoModal(groupId);
  } else showGroupError(data.message);
}

// ─── LEAVE GROUP ──────────────────────────────────────────────────────────────
// Define the modal here so it's guaranteed to be available
function confirmLeaveCurrentGroup() {
  const group = currentGroup || window.currentGroup;
  if (!group) return;
  const groupName = group.name || "this group";

  // Remove any existing modal
  document.getElementById("_leaveGrpModal")?.remove();

  const modal = document.createElement("div");
  modal.id = "_leaveGrpModal";
  modal.style.cssText = `position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);
    backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;`;

  modal.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:20px;padding:28px;max-width:400px;
                width:100%;box-shadow:0 16px 48px rgba(0,0,0,.25);">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="width:50px;height:50px;border-radius:50%;flex-shrink:0;background:rgba(239,68,68,.12);
                    display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-sign-out-alt" style="color:#ef4444;font-size:1.3rem;"></i>
        </div>
        <div>
          <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary);">Leave Group?</div>
          <div style="font-size:.82rem;color:var(--text-secondary);margin-top:3px;">
            <strong>${_esc(groupName)}</strong>
          </div>
        </div>
      </div>
      <p style="font-size:.88rem;color:var(--text-secondary);margin-bottom:20px;line-height:1.5;">
        You won't be able to see this group's messages anymore.
        If you're the only admin, the next oldest member will be promoted.
      </p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="document.getElementById('_leaveGrpModal').remove()"
          style="padding:10px 22px;border-radius:10px;border:none;cursor:pointer;
                 background:var(--light-purple,rgba(139,92,246,.1));color:var(--text-primary);font-weight:700;">
          Cancel
        </button>
        <button id="_leaveGrpConfirmBtn"
          style="padding:10px 22px;border-radius:10px;border:none;cursor:pointer;
                 background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-weight:700;">
          <i class="fas fa-sign-out-alt"></i> Leave
        </button>
      </div>
    </div>`;

  // Attach confirm button handler
  modal.querySelector("#_leaveGrpConfirmBtn").onclick = () => {
    modal.remove();
    _leaveGroup(group.group_id);
  };

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
}

async function _leaveGroup(groupId) {
  try {
    const res = await fetch(`${GROUP_API}/${groupId}/leave`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${_getToken()}` },
    });
    const data = await res.json();
    if (data.success) {
      showGroupSuccess("Left group");
      currentGroup = null;
      window.currentGroup = null;
      document.getElementById("activeGroupChat").style.display = "none";
      document.getElementById("emptyChatState").style.display = "flex";
      document.getElementById("chatArea").classList.remove("active");
      _groupsLoaded = false;
      loadGroupsIntoList();
    } else showGroupError(data.message);
  } catch (e) {
    showGroupError("Failed to leave group");
  }
}

// ─── INPUT LISTENERS ──────────────────────────────────────────────────────────
function setupGroupInputListeners() {
  const textarea = document.getElementById("groupMessageInput");
  const sendBtn = document.getElementById("groupSendButton");
  if (textarea) {
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
      if (sendBtn) sendBtn.disabled = !textarea.value.trim();
      if (textarea.value.trim()) handleGroupInputTyping();
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendGroupMessage();
      }
    });
  }
  if (sendBtn) sendBtn.onclick = sendGroupMessage;
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function _getToken() {
  return (
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
  );
}

function _mediaUrl(path, type = "profile") {
  if (!path || path === "null" || path === "undefined") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Use the same constructMediaUrl logic as messages.js if available
  if (typeof constructMediaUrl === "function")
    return constructMediaUrl(path, type);
  const clean = path.replace(/^\/+/, "").replace(/^uploads\//, "");
  if (type === "profile") {
    const filename = clean.split("/").pop();
    return `${API_BASE_URL}/get-profile-pic/${filename}`;
  }
  return `${API_BASE_URL}/uploads/${clean}`;
}

function _groupAvatar(avatarUrl, name, size = "48px") {
  const url = avatarUrl ? _mediaUrl(avatarUrl) : null;
  if (!url || url === "null") {
    return `<div style="width:${size};height:${size};border-radius:50%;flex-shrink:0;
      background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));
      color:#fff;display:flex;align-items:center;justify-content:center;">
      <i class="fas fa-users" style="font-size:calc(${size} / 3);"></i>
    </div>`;
  }
  return `<img src="${url}" style="width:${size};height:${size};border-radius:50%;
    object-fit:cover;flex-shrink:0;"
    onerror="this.outerHTML='<div style=\\'width:${size};height:${size};border-radius:50%;background:linear-gradient(135deg,var(--primary-purple),var(--accent-pink));color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;\\'>G</div>'" />`;
}

function _getAvatarEl(avatarUrl, name, size = "48px") {
  if (typeof getAvatarElement === "function")
    return getAvatarElement(avatarUrl, name, size);
  return _groupAvatar(avatarUrl, name, size);
}

function _esc(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function _timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function _formatDate(ts) {
  if (!ts) return "";
  const date = new Date(ts),
    today = new Date(),
    yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function _formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts),
    h = d.getHours(),
    m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
}

function showGroupError(msg) {
  _toast(msg, "error");
}
function showGroupSuccess(msg) {
  _toast(msg, "success");
}
function _toast(msg, type) {
  if (typeof showError === "function" && type === "error") {
    showError(msg);
    return;
  }
  if (typeof showSuccess === "function" && type === "success") {
    showSuccess(msg);
    return;
  }
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas fa-${
    type === "error" ? "exclamation-circle" : "check-circle"
  }"></i><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ─── EXPOSE GLOBALS ───────────────────────────────────────────────────────────
window.loadGroupsIntoList = loadGroupsIntoList;
window.loadGroupInvitesIntoList = loadGroupInvitesIntoList;
window.filterGroupsList = filterGroupsList;
window.openGroup = openGroup;
window.openCreateGroupModal = openCreateGroupModal;
window.openAddMemberToGroupModal = openAddMemberToGroupModal;
window.showGroupInfoModal = showGroupInfoModal;
window.confirmLeaveCurrentGroup = confirmLeaveCurrentGroup; // ← defined here, always available
window._leaveGroup = _leaveGroup;
window.updateGroupInviteBadge = updateGroupInviteBadge;
window._respondGrpInvite = _respondGrpInvite;
window._inviteToGroup = _inviteToGroup;
window._kickGrpMember = _kickGrpMember;
window._searchGrpMembers = _searchGrpMembers;
window._searchAddMember = _searchAddMember;
window._toggleGrpMember = _toggleGrpMember;
window._submitCreateGroup = _submitCreateGroup;
window.sendGroupMessage = sendGroupMessage;

console.log("✅ groups-integrated.js loaded");
