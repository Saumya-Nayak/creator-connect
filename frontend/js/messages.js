// Check if API_BASE_URL is already defined
if (typeof API_BASE_URL === "undefined") {
  var API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/api"
      : "/api";
}
const EMOJI_CATEGORIES = {
  smileys: {
    name: "Smileys & Emotion",
    icon: "😊",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "🥲",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "😌",
      "😔",
      "😪",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🤧",
      "🥵",
      "🥶",
      "😵",
      "🤯",
      "🤠",
      "🥳",
      "😎",
      "🤓",
      "🧐",
    ],
  },
  gestures: {
    name: "People & Body",
    icon: "👋",
    emojis: [
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "👇",
      "☝️",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "🙏",
    ],
  },
  animals: {
    name: "Animals & Nature",
    icon: "🐶",
    emojis: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐽",
      "🐸",
      "🐵",
      "🙈",
      "🙉",
      "🙊",
      "🐒",
      "🐔",
      "🐧",
      "🐦",
      "🐤",
      "🐣",
      "🐥",
      "🦆",
      "🦅",
      "🦉",
      "🦇",
    ],
  },
  food: {
    name: "Food & Drink",
    icon: "🍕",
    emojis: [
      "🍎",
      "🍏",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🫐",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
      "🍆",
      "🥑",
      "🥦",
      "🥬",
      "🥒",
      "🌶️",
      "🫑",
      "🌽",
      "🥕",
      "🍕",
      "🍔",
      "🍟",
    ],
  },
  symbols: {
    name: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "☮️",
      "✨",
      "⭐",
      "🌟",
      "💫",
      "⚡",
      "💥",
      "🔥",
      "✅",
      "❌",
      "💯",
    ],
  },
};

let emojiRecentEmojis = [];
let emojiCurrentCategory = "smileys";

function toggleEmojiPicker() {
  console.log("👆 Toggle emoji picker clicked");
  const picker = document.getElementById("emojiPicker");
  const btn = document.getElementById("emojiBtn");

  if (!picker || !btn) {
    console.error("❌ Emoji picker elements not found");
    return;
  }

  const isShown = picker.classList.contains("show");
  console.log("🔍 Picker state:", isShown ? "shown" : "hidden");
  console.log("📊 Current styles:", {
    display: picker.style.display,
    opacity: window.getComputedStyle(picker).opacity,
    zIndex: window.getComputedStyle(picker).zIndex,
    visibility: window.getComputedStyle(picker).visibility,
    position: window.getComputedStyle(picker).position,
  });

  if (isShown) {
    picker.classList.remove("show");
    picker.style.display = "none";
    btn.classList.remove("active");
    console.log("📦 Picker closed");
  } else {
    // FORCE display
    picker.style.display = "flex";
    picker.style.opacity = "1";
    picker.style.visibility = "visible";
    picker.style.zIndex = "10000";
    picker.style.pointerEvents = "all";

    setTimeout(() => {
      picker.classList.add("show");
      console.log("📦 Picker opened");
      console.log("📊 After open:", {
        display: picker.style.display,
        opacity: window.getComputedStyle(picker).opacity,
        classList: picker.className,
      });
    }, 10);

    btn.classList.add("active");

    setTimeout(() => {
      const searchInput = document.getElementById("emojiSearch");
      if (searchInput) searchInput.focus();
    }, 100);
  }
}

function closeEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  const btn = document.getElementById("emojiBtn");

  if (picker) {
    picker.classList.remove("show");
    setTimeout(() => {
      picker.style.display = "none";
    }, 300);
  }
  if (btn) btn.classList.remove("active");

  const searchInput = document.getElementById("emojiSearch");
  if (searchInput) searchInput.value = "";

  renderEmojis(emojiCurrentCategory);
}

function initializeEmojiPicker() {
  console.log("🎨 Initializing emoji picker...");
  renderEmojiCategories();
  renderEmojis(emojiCurrentCategory);

  // Setup event listeners
  const emojiBtn = document.getElementById("emojiBtn");
  const closeBtn = document.getElementById("emojiPickerCloseBtn");
  const searchInput = document.getElementById("emojiSearch");

  if (emojiBtn) {
    emojiBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleEmojiPicker();
    });
    console.log("✅ Emoji button listener attached");
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeEmojiPicker();
    });
    console.log("✅ Close button listener attached");
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchEmojis(e.target.value);
    });
    console.log("✅ Search input listener attached");
  }

  // Close on outside click
  document.addEventListener("click", (e) => {
    const picker = document.getElementById("emojiPicker");
    const btn = document.getElementById("emojiBtn");

    if (!picker || !btn) return;

    if (picker.classList.contains("show")) {
      if (!picker.contains(e.target) && !btn.contains(e.target)) {
        closeEmojiPicker();
      }
    }
  });

  console.log("✅ Emoji picker initialized");
}

function renderEmojiCategories() {
  const categoriesDiv = document.getElementById("emojiCategories");
  if (!categoriesDiv) return;

  categoriesDiv.innerHTML = "";

  Object.keys(EMOJI_CATEGORIES).forEach((key) => {
    const category = EMOJI_CATEGORIES[key];
    const btn = document.createElement("button");
    btn.className = `emoji-category-btn ${
      key === emojiCurrentCategory ? "active" : ""
    }`;
    btn.textContent = category.icon;
    btn.title = category.name;
    btn.onclick = () => switchCategory(key, btn);
    categoriesDiv.appendChild(btn);
  });
}

function switchCategory(categoryKey, buttonElement) {
  emojiCurrentCategory = categoryKey;

  document.querySelectorAll(".emoji-category-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  buttonElement.classList.add("active");

  const searchInput = document.getElementById("emojiSearch");
  if (searchInput) searchInput.value = "";

  renderEmojis(categoryKey);
}

function renderEmojis(categoryKey) {
  const contentDiv = document.getElementById("emojiContent");
  if (!contentDiv) return;

  contentDiv.innerHTML = "";

  // Show recent emojis if on smileys category and have recent
  if (emojiRecentEmojis.length > 0 && categoryKey === "smileys") {
    const recentSection = document.createElement("div");
    recentSection.className = "emoji-category-section";
    recentSection.innerHTML = `
      <div class="emoji-category-name">Recently Used</div>
      <div class="emoji-grid" id="recentEmojisGrid"></div>
    `;
    contentDiv.appendChild(recentSection);

    const recentGrid = recentSection.querySelector("#recentEmojisGrid");
    emojiRecentEmojis.slice(0, 16).forEach((emoji) => {
      const btn = createEmojiButton(emoji);
      recentGrid.appendChild(btn);
    });
  }

  // Show category emojis
  const category = EMOJI_CATEGORIES[categoryKey];
  if (category) {
    const section = document.createElement("div");
    section.className = "emoji-category-section";
    section.innerHTML = `
      <div class="emoji-category-name">${category.name}</div>
      <div class="emoji-grid"></div>
    `;
    contentDiv.appendChild(section);

    const grid = section.querySelector(".emoji-grid");
    category.emojis.forEach((emoji) => {
      const btn = createEmojiButton(emoji);
      grid.appendChild(btn);
    });
  }
}

function createEmojiButton(emoji) {
  const btn = document.createElement("button");
  btn.className = "emoji-item";
  btn.textContent = emoji;
  btn.title = emoji;
  btn.onclick = () => insertEmoji(emoji);
  return btn;
}

function insertEmoji(emoji) {
  const textarea = document.getElementById("messageInput");
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + emoji + text.substring(end);

  const newPosition = start + emoji.length;
  textarea.setSelectionRange(newPosition, newPosition);
  textarea.focus();

  textarea.dispatchEvent(new Event("input"));

  addToRecentEmojis(emoji);

  console.log("✅ Inserted emoji:", emoji);
}

function addToRecentEmojis(emoji) {
  emojiRecentEmojis = emojiRecentEmojis.filter((e) => e !== emoji);
  emojiRecentEmojis.unshift(emoji);
  emojiRecentEmojis = emojiRecentEmojis.slice(0, 32);
}

function searchEmojis(query) {
  const contentDiv = document.getElementById("emojiContent");
  if (!contentDiv) return;

  if (!query.trim()) {
    renderEmojis(emojiCurrentCategory);
    return;
  }

  const lowerQuery = query.toLowerCase();
  const results = [];

  Object.keys(EMOJI_CATEGORIES).forEach((key) => {
    const category = EMOJI_CATEGORIES[key];
    if (category.name.toLowerCase().includes(lowerQuery)) {
      results.push(...category.emojis);
    }
  });

  const uniqueResults = [...new Set(results)];

  contentDiv.innerHTML = "";

  if (uniqueResults.length > 0) {
    const section = document.createElement("div");
    section.className = "emoji-category-section";
    section.innerHTML = `
      <div class="emoji-category-name">Search Results (${uniqueResults.length})</div>
      <div class="emoji-grid"></div>
    `;
    contentDiv.appendChild(section);

    const grid = section.querySelector(".emoji-grid");
    uniqueResults.forEach((emoji) => {
      const btn = createEmojiButton(emoji);
      grid.appendChild(btn);
    });
  } else {
    contentDiv.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <p>No emojis found</p>
      </div>
    `;
  }
}

console.log("✅ Emoji picker code loaded inline");
// WebSocket connection
let socket = null;
let currentUser = null;
let conversations = [];
let currentConversation = null;
let messages = [];
let typingTimeout = null;
window.deleteConversation = deleteConversation;
// ===== COMPLETE EMOJI PICKER FIX =====
// Replace your setupEmojiPickerListeners function and DOMContentLoaded section with this:

// ===== SETUP EMOJI PICKER LISTENERS (IMPROVED VERSION) =====
// ===== UPDATED DOMCONTENTLOADED =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Messages page initializing...");

  // 1. Check authentication
  checkAuth();

  if (!currentUser) {
    showError("Please login to access messages");
    setTimeout(() => {
      window.location.href = "home.html";
    }, 2000);
    return;
  }

  // 2. Initialize messages page
  await initializeMessagesPage();

  // 3. ✅ Initialize emoji picker (now globally available)
  setTimeout(() => {
    if (typeof initializeEmojiPicker === "function") {
      initializeEmojiPicker();
    } else {
      console.error("❌ Emoji picker not loaded");
    }
  }, 500);

  // 4. Check if coming from notification
  const urlParams = new URLSearchParams(window.location.search);
  const userIdToOpen = urlParams.get("user");

  if (userIdToOpen) {
    console.log(
      `🔔 Opening conversation from notification: User ${userIdToOpen}`
    );

    setTimeout(async () => {
      const conversation = conversations.find(
        (c) => c.other_user_id == userIdToOpen
      );

      if (conversation) {
        await openConversation(conversation);
      } else {
        try {
          const response = await fetch(
            `${API_BASE_URL}/profile/${userIdToOpen}`,
            {
              headers: {
                Authorization: `Bearer ${
                  localStorage.getItem("authToken") ||
                  sessionStorage.getItem("authToken")
                }`,
              },
            }
          );

          const data = await response.json();

          if (data.success && data.profile) {
            const tempConvo = {
              conversation_id: null,
              other_user_id: parseInt(userIdToOpen),
              other_user_name: data.profile.full_name,
              other_username: data.profile.username,
              other_user_avatar: data.profile.profile_pic,
              last_message_text: null,
              last_message_time: null,
              unread_count: 0,
            };

            await openConversation(tempConvo);
          }
        } catch (error) {
          console.error(
            "❌ Error opening conversation from notification:",
            error
          );
          showError("Failed to open conversation");
        }
      }

      window.history.replaceState({}, "", "messages.html");
    }, 1000);
  }
});

// ===== DEBUGGING HELPER =====
// Add this to check if elements exist
function debugEmojiPicker() {
  console.group("🔍 Emoji Picker Debug");

  const picker = document.getElementById("emojiPicker");
  const btn = document.getElementById("emojiBtn");
  const closeBtn = document.querySelector(".emoji-picker-close");
  const searchInput = document.getElementById("emojiSearch");
  const categories = document.getElementById("emojiCategories");
  const content = document.getElementById("emojiContent");

  console.log("Emoji Picker:", picker ? "✅ Found" : "❌ Not Found");
  console.log("Emoji Button:", btn ? "✅ Found" : "❌ Not Found");
  console.log("Close Button:", closeBtn ? "✅ Found" : "❌ Not Found");
  console.log("Search Input:", searchInput ? "✅ Found" : "❌ Not Found");
  console.log("Categories Div:", categories ? "✅ Found" : "❌ Not Found");
  console.log("Content Div:", content ? "✅ Found" : "❌ Not Found");

  if (btn) {
    console.log(
      "Button has event listeners:",
      btn.onclick ? "onclick attribute found" : "No onclick attribute"
    );
  }

  console.groupEnd();
}

// Make it available globally
window.debugEmojiPicker = debugEmojiPicker;

// Auto-run debug after 2 seconds
setTimeout(() => {
  console.log("🔍 Running automatic emoji picker debug...");
  debugEmojiPicker();
}, 2000);

console.log("✅ Emoji picker fix loaded");
console.log("💡 Run debugEmojiPicker() to check element status");
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

async function initializeMessagesPage() {
  console.log("📨 Initializing messages with WebSocket...");

  // Setup event listeners
  setupSearchListener();
  setupMessageInputListeners();

  // Initialize WebSocket connection
  await initializeWebSocket();

  // Load conversations
  await loadConversations();
}

// ===== WEBSOCKET CONNECTION =====
async function initializeWebSocket() {
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  if (!token) {
    console.error("❌ No auth token found");
    showError("Please login to use messaging");
    return;
  }

  // Get WebSocket URL
  const wsUrl =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "ws://localhost:3000"
      : `wss://${window.location.host}`;
  console.log("🔌 Connecting to WebSocket:", wsUrl);

  try {
    // Load Socket.IO if not already loaded
    if (typeof io === "undefined") {
      await loadSocketIO();
    }

    // Connect with authentication token in query string
    socket = io(wsUrl, {
      query: { token: token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    setupWebSocketListeners();
  } catch (error) {
    console.error("❌ WebSocket initialization failed:", error);
    showError("Failed to connect to messaging service");
  }
}

function loadSocketIO() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
function setupWebSocketListeners() {
  console.log("🔌 Setting up WebSocket listeners...");

  // Connection events
  socket.on("connect", () => {
    console.log("✅ WebSocket connected:", socket.id);

    setTimeout(() => {
      console.log("📡 Sending user_online event...");
      socket.emit("user_online");
    }, 500);

    updateConnectionStatus(true);
  });
  socket.on("message_deleted_for_everyone", (data) => {
    console.log("🗑️ Message deleted for everyone:", data.message_id);

    // Show deleted placeholder in UI
    if (typeof _showDeletedPlaceholder === "function") {
      _showDeletedPlaceholder(data.message_id);
    }

    // Update messages array
    messages = messages.map((m) =>
      m.message_id === data.message_id
        ? {
            ...m,
            is_deleted_for_everyone: true,
            message: null,
            media_url: null,
          }
        : m
    );
  });
  socket.on("connection_success", (data) => {
    console.log("✅ Connection confirmed:", data);
  });

  socket.on("user_online_success", (data) => {
    console.log("✅ User online confirmed:", data);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 WebSocket disconnected:", reason);
    updateConnectionStatus(false);

    if (reason === "io server disconnect") {
      socket.connect();
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error);
    showError("Connection error. Retrying...");
  });

  socket.on("error", (data) => {
    console.error("❌ WebSocket error:", data);
    showError(data.message || "WebSocket error");
  });

  // ===== MESSAGE EVENTS =====

  // ✅ CRITICAL: new_message event
  socket.on("new_message", (data) => {
    console.log("📨 NEW_MESSAGE EVENT:", data);

    if (!data || !data.message) {
      console.error("❌ Invalid new_message data:", data);
      return;
    }

    handleNewMessage(data.message);
  });

  // ✅ message_sent event (confirmation)
  socket.on("message_sent", (data) => {
    console.log("✅ MESSAGE_SENT EVENT:", data);

    if (!data || !data.success) {
      console.error("❌ Message send failed:", data);
      return;
    }

    if (data.message) {
      updateTemporaryMessage(data.message);
    }
  });

  // ✅ message_error event
  socket.on("message_error", (data) => {
    console.error("❌ MESSAGE_ERROR EVENT:", data);

    const errorMsg = data.details
      ? `${data.error}: ${data.details}`
      : data.error || "Failed to send message";

    showError(errorMsg);
    removeFailedMessage();
  });

  // Other events
  socket.on("messages_read", (data) => {
    console.log("👁️ Messages read:", data);
    handleMessagesRead(data);
  });

  socket.on("message_deleted", (data) => {
    console.log("🗑️ Message deleted:", data.message_id);
    handleMessageDeleted(data.message_id);
  });

  socket.on("user_typing", (data) => {
    console.log("⌨️ User typing:", data);
    handleUserTyping(data);
  });

  socket.on("user_status", (data) => {
    console.log("👤 User status:", data);
    handleUserStatus(data);
  });

  socket.on("conversation_updated", (data) => {
    console.log("💬 Conversation updated:", data);
    loadConversations();
  });

  socket.on("online_users_list", (data) => {
    console.log("👥 Online users:", data.users);
    updateOnlineStatus(data.users);
  });

  socket.on("reaction_added", (data) => {
    console.log("👍 Reaction added:", data);
    updateMessageReactions(data.message_id, data.reactions);
  });

  socket.on("reaction_removed", (data) => {
    console.log("🗑️ Reaction removed:", data);
    updateMessageReactions(data.message_id, data.reactions);
  });

  console.log("✅ All WebSocket listeners set up");
}

function updateConnectionStatus(connected) {
  let statusEl = document.querySelector(".connection-status");

  // Create if doesn't exist
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.className = "connection-status";
    document.body.appendChild(statusEl);
  }

  statusEl.textContent = connected ? "Connected" : "Reconnecting...";
  statusEl.className = `connection-status ${
    connected ? "connected" : "disconnected"
  }`;

  // Hide after 3 seconds if connected
  if (connected) {
    setTimeout(() => {
      statusEl.style.opacity = "0";
      setTimeout(() => {
        statusEl.style.opacity = "1";
      }, 5000);
    }, 3000);
  }
}

// 7. Add CSS for connection status (add to your messages.css)
const connectionStatusCSS = `
  .connection-status {
    position: fixed;
    top: 70px;
    right: 20px;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    z-index: 9999;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .connection-status.connected {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .connection-status.disconnected {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  [data-theme="dark"] .connection-status.connected {
    background: #1f3f1f;
    color: #51cf66;
    border-color: #2f5f2f;
  }

  [data-theme="dark"] .connection-status.disconnected {
    background: #3f1f1f;
    color: #ff6b6b;
    border-color: #5f2f2f;
  }
  `;
if (!document.querySelector("#connection-status-css")) {
  const style = document.createElement("style");
  style.id = "connection-status-css";
  style.textContent = connectionStatusCSS;
  document.head.appendChild(style);
}

console.log("✅ Enhanced WebSocket client loaded with debugging");
function handleNewMessage(message) {
  console.log("📨 NEW MESSAGE RECEIVED:", message);
  console.log("   Message ID:", message.message_id);
  console.log("   Sender ID:", message.sender_id);
  console.log("   Receiver ID:", message.receiver_id);
  console.log("   Media Type:", message.media_type);
  console.log("   Created At:", message.created_at);

  // ✅ CHECK: Is this message for the current conversation?
  if (!currentConversation) {
    console.log("⚠️ No current conversation - only updating sidebar");
    loadConversations();
    return;
  }

  const isFromCurrentConversation =
    message.sender_id === currentConversation.other_user_id ||
    message.receiver_id === currentConversation.other_user_id;

  if (!isFromCurrentConversation) {
    console.log("⚠️ Message is NOT for current conversation");
    console.log(
      "   Current conversation user:",
      currentConversation.other_user_id
    );
    loadConversations(); // Update sidebar only
    return;
  }

  console.log("✅ Message IS for current conversation");

  // ✅ CRITICAL: Check for duplicate BEFORE adding
  const existingIndex = messages.findIndex(
    (m) => m.message_id === message.message_id
  );

  if (existingIndex !== -1) {
    console.log("⚠️ DUPLICATE MESSAGE - Updating existing");
    // Update existing message instead of adding duplicate
    messages[existingIndex] = message;

    // Update DOM element
    const existingEl = document.querySelector(
      `[data-message-id="${message.message_id}"]`
    );
    if (existingEl) {
      const newEl = createMessageElement(message);
      existingEl.replaceWith(newEl);
      console.log("✅ Updated existing message in DOM");
    }

    loadConversations();
    return;
  }

  // ✅ Add message to array
  messages.push(message);
  console.log("✅ Message added to array. Total messages:", messages.length);

  // ✅ Add message to UI
  const messagesWrapper = document.getElementById("messagesWrapper");

  if (!messagesWrapper) {
    console.error("❌ Messages wrapper not found!");
    return;
  }

  // Check if we need a date divider
  const lastMessageDate =
    messages.length > 1
      ? new Date(messages[messages.length - 2].created_at).toLocaleDateString()
      : null;
  const currentMessageDate = new Date(message.created_at).toLocaleDateString();

  if (lastMessageDate !== currentMessageDate) {
    const dateDivider = createDateDivider(message.created_at);
    messagesWrapper.appendChild(dateDivider);
  }

  const messageEl = createMessageElement(message);
  messagesWrapper.appendChild(messageEl);
  console.log("✅ Message added to UI");

  // ✅ Scroll to bottom
  setTimeout(() => {
    messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
    console.log("✅ Scrolled to bottom");
  }, 100);

  // Mark as read if you're the receiver
  if (message.receiver_id === currentUser.id && socket && socket.connected) {
    socket.emit("mark_as_read", {
      other_user_id: message.sender_id,
    });
    console.log("✅ Marked as read");
  }

  // Play notification sound
  playNotificationSound();

  // ✅ ALWAYS update conversations list
  loadConversations();
  console.log("✅ Conversations list refreshed");
}

function handleMessageSent(message) {
  // Message is already added optimistically, just update with server data
  console.log("✅ Message confirmed by server");
}

function handleMessagesRead(data) {
  // Update message status to "seen"
  if (
    currentConversation &&
    data.reader_id === currentConversation.other_user_id
  ) {
    const messageEls = document.querySelectorAll(
      ".message-bubble.sent .message-status"
    );
    messageEls.forEach((el) => {
      el.innerHTML = '<i class="fas fa-check-double seen"></i>';
    });
  }
}

function handleMessageDeleted(messageId) {
  // Remove message from UI
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageEl) {
    messageEl.remove();
  }

  // Remove from messages array
  messages = messages.filter((m) => m.message_id !== messageId);
}

function handleUserTyping(data) {
  if (
    !currentConversation ||
    data.user_id !== currentConversation.other_user_id
  ) {
    return;
  }

  const typingIndicator = document.getElementById("typingIndicator");

  if (data.typing) {
    // Show typing indicator
    if (!typingIndicator) {
      const indicator = document.createElement("div");
      indicator.id = "typingIndicator";
      indicator.className = "typing-indicator";
      indicator.innerHTML = `
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="typing-text">${currentConversation.other_user_name} is typing...</span>
        `;

      const messagesWrapper = document.getElementById("messagesWrapper");
      messagesWrapper.appendChild(indicator);
      messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
    }
  } else {
    // Hide typing indicator
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
}

function handleUserStatus(data) {
  // Update online status indicator
  const statusDot = document.querySelector(
    `[data-user-id="${data.user_id}"] .status-dot`
  );

  if (statusDot) {
    statusDot.className = `status-dot ${data.status}`;
  }

  // Update current conversation header if applicable
  if (
    currentConversation &&
    currentConversation.other_user_id === data.user_id
  ) {
    const headerStatus = document.querySelector(
      ".chat-user-status .status-dot"
    );
    if (headerStatus) {
      headerStatus.className = `status-dot ${data.status}`;
    }

    const statusText = document.querySelector(
      ".chat-user-status span:last-child"
    );
    if (statusText) {
      statusText.textContent =
        data.status === "online" ? "Online" : "Tap to view profile";
    }
  }
}

function handleConversationUpdate(data) {
  // Reload conversations to update last message
  loadConversations();
}

function updateOnlineStatus(onlineUserIds) {
  // Update all conversation items with online status
  onlineUserIds.forEach((userId) => {
    const userEl = document.querySelector(`[data-user-id="${userId}"]`);
    if (userEl) {
      const statusDot = userEl.querySelector(".status-dot");
      if (statusDot) {
        statusDot.className = "status-dot online";
      }
    }
  });
}

// ===== SEND MESSAGE =====
async function sendMessage() {
  if (!currentConversation) {
    showError("No conversation selected");
    return;
  }

  const textarea = document.getElementById("messageInput");
  const message = textarea.value.trim();

  if (!message) {
    return;
  }

  if (!socket || !socket.connected) {
    showError("Not connected. Please wait...");
    if (socket) socket.connect();
    return;
  }

  const sendBtn = document.getElementById("sendButton");
  sendBtn.disabled = true;

  try {
    console.log("📤 Sending message:", message);

    // Stop typing indicator
    socket.emit("typing_stop", {
      receiver_id: currentConversation.other_user_id,
    });

    // Create message data
    const messageData = {
      receiver_id: currentConversation.other_user_id,
      message: message,
      conversation_id: currentConversation.conversation_id || null,
      media_url: null,
      media_type: null,
    };

    console.log("📤 Message data:", messageData);

    // Send message via WebSocket
    socket.emit("send_message", messageData);
    console.log("✅ Message sent to server");

    // Create temporary message
    const tempMessage = {
      message_id: `temp_${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: currentConversation.other_user_id,
      message: message,
      created_at: new Date().toISOString(),
      sender_name: currentUser.full_name,
      sender_username: currentUser.username,
      sender_avatar: currentUser.profile_pic,
      is_delivered: false,
      is_read: false,
      is_temporary: true,
    };

    messages.push(tempMessage);
    console.log("✅ Temporary message added to array");

    // Add to UI
    const messagesWrapper = document.getElementById("messagesWrapper");

    if (!messagesWrapper) {
      console.error("❌ Messages wrapper not found!");
      throw new Error("Messages wrapper not found");
    }

    const messageEl = createMessageElement(tempMessage);
    messageEl.dataset.tempId = tempMessage.message_id;
    messagesWrapper.appendChild(messageEl);
    console.log("✅ Temporary message added to UI");

    messagesWrapper.scrollTop = messagesWrapper.scrollHeight;

    // Clear input
    textarea.value = "";
    textarea.style.height = "auto";

    console.log("✅ Input cleared");
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    showError("Failed to send message: " + error.message);
  } finally {
    sendBtn.disabled = false;
  }
}
function debugMessageTimestamps() {
  console.group("🕐 Message Timestamps Debug");

  const now = new Date();
  console.log("Current local time:", now.toString());
  console.log("Current UTC time:", now.toUTCString());
  console.log("Timezone offset (hours):", now.getTimezoneOffset() / -60);

  console.log("\n📨 Last 5 Messages:");
  messages.slice(-5).forEach((msg, index) => {
    const msgDate = new Date(msg.created_at);
    console.log(`Message ${index + 1}:`, {
      id: msg.message_id,
      raw_timestamp: msg.created_at,
      local_time: msgDate.toString(),
      formatted: formatMessageTime(msg.created_at),
      time_ago: getTimeAgo(msg.created_at),
      is_temporary: msg.is_temporary,
    });
  });

  console.groupEnd();
}

// Make debug function available globally
window.debugMessageTimestamps = debugMessageTimestamps;

console.log("✅ Fixed timestamp functions loaded");
console.log("💡 Run debugMessageTimestamps() to check message times");
function updateTemporaryMessage(serverMessage) {
  console.log("📝 UPDATING TEMPORARY MESSAGE");
  console.log("   Server message:", serverMessage);

  // Find temporary message in array
  const tempIndex = messages.findIndex((m) => m.is_temporary === true);

  if (tempIndex !== -1) {
    console.log("✅ Found temporary message in array at index:", tempIndex);

    // Replace with server message
    messages[tempIndex] = {
      ...serverMessage,
      is_temporary: false,
    };

    console.log("✅ Updated messages array");
  } else {
    console.log("⚠️ No temporary message found, adding server message");
    messages.push({
      ...serverMessage,
      is_temporary: false,
    });
  }

  // Find temporary message element in DOM
  const tempElement = document.querySelector('[data-temp-id^="temp_"]');

  if (tempElement) {
    console.log("✅ Found temporary message element");

    const messagesWrapper = document.getElementById("messagesWrapper");
    if (!messagesWrapper) {
      console.error("❌ Messages wrapper not found!");
      return;
    }

    // Remove temporary element
    tempElement.remove();
    console.log("✅ Removed temporary element");

    // Create new element with server data
    const newMessageEl = createMessageElement(serverMessage);
    messagesWrapper.appendChild(newMessageEl);
    console.log("✅ Added server message element");

    // Scroll to bottom
    setTimeout(() => {
      messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
    }, 50);
  } else {
    console.log("⚠️ No temporary element found in DOM");
  }

  // Update conversations
  loadConversations();
}

function removeFailedMessage() {
  const tempElement = document.querySelector(`[data-temp-id^="temp_"]`);
  if (tempElement) {
    tempElement.remove();
  }

  // Remove from array
  messages = messages.filter((m) => !m.is_temporary);
}
function debugWebSocket() {
  console.group("🔍 WebSocket Debug");
  console.log("Socket exists:", !!socket);
  console.log("Socket connected:", socket ? socket.connected : "N/A");
  console.log("Socket ID:", socket ? socket.id : "N/A");
  console.log("Current user:", currentUser);
  console.log("Current conversation:", currentConversation);
  console.log("Messages count:", messages.length);
  console.groupEnd();
}

// Make it available globally
window.debugWebSocket = debugWebSocket;
// ===== TYPING INDICATORS =====
function handleTyping() {
  if (!currentConversation) return;

  // Emit typing start
  socket.emit("typing_start", {
    receiver_id: currentConversation.other_user_id,
  });

  // Clear previous timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  // Set timeout to emit typing stop
  typingTimeout = setTimeout(() => {
    socket.emit("typing_stop", {
      receiver_id: currentConversation.other_user_id,
    });
  }, 2000);
}

// ===== LOAD CONVERSATIONS =====
async function loadConversations() {
  const conversationsList = document.getElementById("conversationsList");

  if (!conversationsList) {
    console.error("❌ Conversations list element not found");
    return;
  }

  // Show loading only on first load
  if (conversations.length === 0) {
    conversationsList.innerHTML = `
      <div class="conversations-loading">
        <div class="skeleton skeleton-conversation"></div>
        <div class="skeleton skeleton-conversation"></div>
        <div class="skeleton skeleton-conversation"></div>
      </div>
    `;
  }

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(
      `${API_BASE_URL}/messages/conversations?limit=50`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success && data.conversations && data.conversations.length > 0) {
      conversations = data.conversations;
      renderConversations(conversations);

      // Request online status for conversation users
      const userIds = conversations.map((c) => c.other_user_id);
      socket.emit("get_online_users");
    } else {
      conversationsList.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
          <i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3; margin-bottom: 16px;"></i>
          <p>No conversations yet</p>
          <p style="font-size: 0.85rem; margin-top: 8px;">Start messaging your connections!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error loading conversations:", error);
    showError("Failed to load conversations");
  }
}

function renderConversations(convos) {
  const conversationsList = document.getElementById("conversationsList");
  conversationsList.innerHTML = "";

  convos.forEach((convo) => {
    const conversationEl = createConversationElement(convo);
    conversationsList.appendChild(conversationEl);
  });
}

function createConversationElement(convo) {
  const div = document.createElement("div");
  div.className = "conversation-item";
  div.dataset.conversationId = convo.conversation_id;
  div.dataset.userId = convo.other_user_id;

  const avatarUrl = constructMediaUrl(convo.other_user_avatar, "profile");
  const timeAgo = getTimeAgo(convo.last_message_time || convo.updated_at);

  // Handle preview for different message types
  let preview = "";
  if (convo.last_message_text) {
    const isOwn = convo.last_message_sender_id === currentUser.id;

    if (convo.last_message_media_type === "shared_post") {
      preview = isOwn ? "You shared a post" : "Shared a post";
    } else {
      preview = isOwn
        ? `You: ${convo.last_message_text}`
        : convo.last_message_text;
    }
  } else if (convo.last_message_media) {
    preview = "📷 Photo";
  } else {
    preview = "Start conversation";
  }

  div.innerHTML = `
    <div style="position: relative;">
      ${getAvatarElement(avatarUrl, convo.other_user_name, "56px")}
      <span class="status-dot offline"></span>
    </div>
    
    <div class="conversation-info">
      <div class="conversation-name">
        ${escapeHtml(convo.other_user_name)}
      </div>
      <div class="conversation-preview ${
        convo.unread_count > 0 ? "unread" : ""
      }">
        ${escapeHtml(preview).substring(0, 40)}${
    preview.length > 40 ? "..." : ""
  }
      </div>
    </div>
    
    <div class="conversation-meta">
      <span class="conversation-time">${timeAgo}</span>
      ${
        convo.unread_count > 0
          ? `<span class="unread-badge">${convo.unread_count}</span>`
          : ""
      }
      
      <button class="conversation-delete-btn" onclick="event.stopPropagation(); deleteConversation(${
        convo.other_user_id
      }, '${escapeHtml(convo.other_user_name).replace(
    /'/g,
    "\\'"
  )}');" title="Delete Conversation">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;

  div.onclick = () => openConversation(convo);

  return div;
}

const deleteConversationCSS = `
/* Delete Conversation Modal */
.delete-conversation-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.delete-conversation-modal.show {
  opacity: 1;
  visibility: visible;
}

.delete-modal-overlay {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.delete-modal-content {
  background: var(--card-bg);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 450px;
  transform: scale(0.9);
  transition: transform 0.3s ease;
}

.delete-conversation-modal.show .delete-modal-content {
  transform: scale(1);
}

.delete-modal-header {
  padding: 24px;
  border-bottom: 2px solid #fee;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(239, 68, 68, 0.1));
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 20px 20px 0 0;
}

.delete-modal-header i {
  font-size: 1.5rem;
  color: #ef4444;
}

.delete-modal-header h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.delete-modal-body {
  padding: 24px;
}

.delete-modal-body p {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 16px;
  line-height: 1.6;
}

.delete-modal-warning {
  background: var(--light-purple);
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.delete-modal-warning i {
  color: var(--primary-purple);
  margin-top: 2px;
}

.delete-modal-footer {
  padding: 20px 24px;
  border-top: 2px solid var(--border-purple);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary, .btn-danger {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary {
  background: var(--light-purple);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-purple);
  transform: translateY(-2px);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* Delete button in conversation item */
.conversation-delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  transition: var(--transition-smooth);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  font-size: 0.9rem;
  margin-left: 8px;
}

.conversation-item:hover .conversation-delete-btn {
  opacity: 1;
  pointer-events: all;
}

.conversation-delete-btn:hover {
  background: #fee;
  transform: scale(1.1);
}

/* Delete button in chat header */
.chat-action-btn.delete-btn {
  color: #ef4444;
}

.chat-action-btn.delete-btn:hover {
  background: #fee;
  color: #dc2626;
}

/* Dark mode */
[data-theme="dark"] .delete-modal-warning {
  background: #3f3f46;
}

[data-theme="dark"] .delete-modal-header {
  border-bottom-color: #3f1f1f;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
}

[data-theme="dark"] .conversation-delete-btn:hover {
  background: #3f1f1f;
}

[data-theme="dark"] .chat-action-btn.delete-btn:hover {
  background: #3f1f1f;
}

@media (max-width: 480px) {
  .delete-modal-content {
    max-width: 95%;
  }
  
  .delete-modal-footer {
    flex-direction: column-reverse;
  }
  
  .btn-secondary, .btn-danger {
    width: 100%;
    justify-content: center;
  }
}
`;

// Inject CSS
if (!document.querySelector("#delete-conversation-css")) {
  const style = document.createElement("style");
  style.id = "delete-conversation-css";
  style.textContent = deleteConversationCSS;
  document.head.appendChild(style);
}

console.log("✅ Delete conversation functionality loaded");
// ===== OPEN CONVERSATION =====
async function openConversation(convo) {
  console.log("📂 Opening conversation with:", convo.other_user_name);

  currentConversation = convo;

  // Update active state
  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.remove("active");
  });

  const activeItem = document.querySelector(
    `[data-user-id="${convo.other_user_id}"]`
  );
  if (activeItem) {
    activeItem.classList.add("active");
  }

  // Show chat area
  const chatArea = document.getElementById("chatArea");
  const activeChat = document.getElementById("activeChat");
  const emptyChatState = document.getElementById("emptyChatState");
  const conversationsSidebar = document.getElementById("conversationsSidebar");

  if (chatArea) chatArea.classList.add("active");
  if (emptyChatState) emptyChatState.style.display = "none";
  if (activeChat) activeChat.style.display = "flex";

  if (window.innerWidth <= 768) {
    if (conversationsSidebar) conversationsSidebar.classList.add("hidden");
    if (chatArea) chatArea.classList.remove("hidden");
  }

  // Update chat header
  updateChatHeader(convo);

  // Load messages
  await loadMessages(convo.other_user_id);

  // Join conversation room
  socket.emit("join_conversation", {
    conversation_id: convo.conversation_id,
    other_user_id: convo.other_user_id,
  });

  // Mark as read
  if (convo.conversation_id) {
    socket.emit("mark_as_read", {
      other_user_id: convo.other_user_id,
    });
  }
}
function updateChatHeader(convo) {
  const chatHeader = document.querySelector(".chat-header");
  const avatarUrl = constructMediaUrl(convo.other_user_avatar, "profile");

  chatHeader.innerHTML = `
    <div onclick="goToProfile(${convo.other_user_id})" style="cursor: pointer;">
      ${getAvatarElement(avatarUrl, convo.other_user_name, "48px")}
    </div>
    
    <div class="chat-user-info" onclick="goToProfile(${convo.other_user_id})">
      <div class="chat-user-name">${escapeHtml(convo.other_user_name)}</div>
      <div class="chat-user-status">
        <span class="status-dot offline"></span>
        <span>Tap to view profile</span>
      </div>
    </div>
    
    <div class="chat-actions">
      <button class="chat-action-btn" onclick="goToProfile(${
        convo.other_user_id
      })" title="View Profile">
        <i class="fas fa-user"></i>
      </button>
      
      <button 
        class="chat-action-btn delete-btn" 
        onclick="handleChatHeaderDelete(${convo.other_user_id}, '${escapeHtml(
    convo.other_user_name
  ).replace(/'/g, "\\'")}')" 
        title="Delete Conversation"
      >
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
}

async function handleChatHeaderDelete(otherUserId, otherUserName) {
  console.log(
    `🗑️ Chat header delete clicked: User ${otherUserId}, Name: ${otherUserName}`
  );

  // Call the main delete function
  await deleteConversation(otherUserId, otherUserName);
}
// ===== LOAD MESSAGES =====
async function loadMessages(otherUserId) {
  console.log("📂 LOADING MESSAGES for user:", otherUserId);

  const messagesWrapper = document.getElementById("messagesWrapper");

  messagesWrapper.innerHTML = `
    <div class="messages-loading">
      <div class="skeleton skeleton-message"></div>
      <div class="skeleton skeleton-message sent"></div>
      <div class="skeleton skeleton-message"></div>
    </div>
  `;

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(
      `${API_BASE_URL}/messages/messages/${otherUserId}?limit=100`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    console.log(
      "📡 Messages loaded from server:",
      data.success ? data.messages.length : "FAILED"
    );

    if (data.success && data.messages) {
      // ✅ CLEAR existing messages array
      messages = [];

      // ✅ Add all messages
      messages = data.messages.map((msg) => ({
        ...msg,
        is_temporary: false,
      }));

      console.log("✅ Messages array populated:", messages.length);

      // Render messages
      renderMessages(messages);

      // Scroll to bottom
      setTimeout(() => {
        messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
        console.log("✅ Scrolled to bottom");
      }, 100);
    } else {
      messagesWrapper.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
          <i class="fas fa-comment-dots" style="font-size: 3rem; opacity: 0.3; margin-bottom: 16px;"></i>
          <p>No messages yet</p>
          <p style="font-size: 0.85rem; margin-top: 8px;">Send the first message!</p>
        </div>
      `;
      messages = [];
    }
  } catch (error) {
    console.error("❌ Error loading messages:", error);
    showError("Failed to load messages");
    messages = [];
  }
}

function renderMessages(msgs) {
  const messagesWrapper = document.getElementById("messagesWrapper");
  messagesWrapper.innerHTML = "";

  let lastDate = null;

  msgs.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString();
    if (msgDate !== lastDate) {
      const dateDivider = createDateDivider(msg.created_at);
      messagesWrapper.appendChild(dateDivider);
      lastDate = msgDate;
    }

    const messageEl = createMessageElement(msg);
    messagesWrapper.appendChild(messageEl);
  });
}

function createDateDivider(date) {
  const div = document.createElement("div");
  div.className = "date-divider";
  div.innerHTML = `<span>${formatDate(date)}</span>`;
  return div;
}
// ===== FIXED: CREATE MESSAGE ELEMENT WITH PROPER SHARED POST HANDLING =====
function createMessageElement(msg) {
  const div = document.createElement("div");
  const isSent = msg.sender_id === currentUser.id;
  div.className = `message-bubble ${isSent ? "sent" : "received"}`;

  if (msg.is_temporary) {
    div.classList.add("sending");
  }

  div.dataset.messageId = msg.message_id;

  const avatarUrl = constructMediaUrl(msg.sender_avatar, "profile");
  const senderName = msg.sender_name || msg.sender_username || "User";
  const time = formatMessageTime(msg.created_at);

  let messageBodyHTML = "";

  // Check for shared post
  if (msg.media_type === "shared_post") {
    let shareData = null;

    try {
      shareData = JSON.parse(msg.message);
    } catch (e) {
      messageBodyHTML = `
        <div class="shared-post-message" style="background: #fee2e2; padding: 12px; border-radius: 12px; border-left: 3px solid #dc2626;">
          <div style="display: flex; align-items: center; gap: 8px; color: #dc2626;">
            <i class="fas fa-exclamation-triangle"></i>
            <span style="font-size: 0.9rem; font-weight: 600;">Error loading shared post</span>
          </div>
          <p style="font-size: 0.8rem; color: #991b1b; margin-top: 4px;">Unable to display post data</p>
        </div>
      `;
    }

    if (shareData && shareData.type === "shared_post") {
      const postTitle =
        shareData.product_title ||
        shareData.caption ||
        shareData.title ||
        "Shared Post";
      const postPrice = shareData.price ? `₹${shareData.price}` : "";
      const postAuthor =
        shareData.author?.username || shareData.author?.name || "Unknown";
      const postImage = shareData.media_url || "";

      messageBodyHTML = `
        <div class="shared-post-message" onclick="openSharedPostDetail(${
          shareData.post_id
        })" 
             style="cursor: pointer; background: var(--light-purple); border-radius: 12px; padding: 12px; border-left: 3px solid var(--primary-purple); max-width: 300px;">
          
          <div class="shared-post-header" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--primary-purple); font-weight: 600; margin-bottom: 10px;">
            <i class="fas fa-share"></i>
            <span>Shared a post</span>
          </div>

          <div class="shared-post-preview" style="display: flex; gap: 12px; padding: 10px; background: var(--card-bg); border-radius: 8px; transition: all 0.3s ease;">
            ${
              postImage
                ? `
              <img 
                src="${constructMediaUrl(postImage, "post")}" 
                class="shared-post-image" 
                alt="Post preview"
                style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;"
                onerror="this.style.display='none'"
              />
            `
                : ""
            }

            <div class="shared-post-info" style="flex: 1; min-width: 0;">
              <h4 style="font-size: 0.95rem; color: var(--text-primary); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${escapeHtml(postTitle)}
              </h4>
              
              ${
                postPrice
                  ? `
                <p style="font-size: 1.1rem; font-weight: 700; color: var(--primary-purple); margin-bottom: 4px;">
                  ${postPrice}
                </p>
              `
                  : ""
              }
              
              <p style="font-size: 0.8rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                by @${escapeHtml(postAuthor)}
              </p>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Regular text message
  if (!messageBodyHTML && msg.message && msg.media_type !== "shared_post") {
    messageBodyHTML = `
      <div class="message-text">${escapeHtml(msg.message)}</div>
    `;
  }

  // Media attachment
  let mediaHTML = "";
  if (msg.media_url && msg.media_type !== "shared_post") {
    mediaHTML = `
      <div class="message-media">
        <img 
          src="${constructMediaUrl(msg.media_url, "post")}" 
          alt="Media" 
          style="max-width: 300px; border-radius: 12px;"
          onerror="this.style.display='none'"
        />
      </div>
    `;
  }

  // Fallback if no content
  if (!messageBodyHTML && !mediaHTML) {
    messageBodyHTML = `
      <div class="message-text" style="font-style: italic; color: var(--text-secondary);">
        [Message content unavailable]
      </div>
    `;
  }

  // Message status icon
  let statusIcon = "";
  if (isSent) {
    if (msg.is_temporary) {
      statusIcon = '<i class="fas fa-clock"></i>';
    } else if (msg.is_read) {
      statusIcon = '<i class="fas fa-check-double seen"></i>';
    } else if (msg.is_delivered) {
      statusIcon = '<i class="fas fa-check-double delivered"></i>';
    } else {
      statusIcon = '<i class="fas fa-check"></i>';
    }
  }

  // Reactions display
  let reactionsHTML = "";
  if (msg.reactions && msg.reactions.length > 0) {
    const grouped = {};
    msg.reactions.forEach((r) => {
      if (!grouped[r.reaction_type]) grouped[r.reaction_type] = [];
      grouped[r.reaction_type].push(r);
    });

    const REACTION_EMOJIS = {
      like: "👍",
      love: "❤️",
      laugh: "😂",
      wow: "😮",
      sad: "😢",
      angry: "😠",
    };

    const reactionBubbles = Object.entries(grouped)
      .map(([type, users]) => {
        const userReacted = users.some((u) => u.user_id === currentUser.id);
        const usernames = users
          .map((u) => u.full_name || u.username)
          .join(", ");
        return `
          <div class="reaction-bubble ${userReacted ? "user-reacted" : ""}" 
               title="${usernames}"
               onclick="${
                 userReacted
                   ? `removeReaction(${msg.message_id})`
                   : `addReaction(${msg.message_id}, '${type}')`
               }">
            <span class="reaction-emoji">${REACTION_EMOJIS[type]}</span>
            <span class="reaction-count">${users.length}</span>
          </div>
        `;
      })
      .join("");

    reactionsHTML = `<div class="message-reactions-display">${reactionBubbles}</div>`;
  }

  // Assemble complete message
  div.innerHTML = `
    ${getAvatarElement(avatarUrl, senderName, "36px")}
    
    <div class="message-content">
      ${messageBodyHTML}
      ${mediaHTML}
      ${reactionsHTML}
      
      <div class="message-meta">
        <span>${time}</span>
        ${isSent ? `<span class="message-status">${statusIcon}</span>` : ""}
        ${
          !msg.is_temporary
            ? `
          <button class="message-reaction-btn" onclick="event.stopPropagation(); showReactionPicker(${msg.message_id}, this)" title="Add Reaction">
            <i class="far fa-smile"></i>
          </button>
        `
            : ""
        }
      </div>
    </div>
  `;

  return div;
}

console.log(
  "✅ Fixed messages.js functions loaded with avatar fallback and shared post fix"
);

console.log("✅ Fixed createMessageElement function loaded");
function openSharedPostDetail(postId) {
  console.log(`🔍 Opening shared post detail: ${postId}`);

  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "post-detail-modal";
  modal.id = "sharedPostDetailModal";
  modal.innerHTML = `
    <div class="post-detail-modal-overlay" onclick="closeSharedPostModal()">
      <div class="post-detail-modal-content" onclick="event.stopPropagation()">
        <button class="modal-close-btn" onclick="closeSharedPostModal()" title="Close">
          <i class="fas fa-times"></i>
        </button>
        <iframe 
          src="post-detail.html?id=${postId}" 
          frameborder="0"
          id="sharedPostDetailIframe"
          style="width: 100%; height: 100%; border: none;"
        ></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  // Animate modal in
  setTimeout(() => {
    modal.classList.add("show");
  }, 10);
}
function closeSharedPostModal() {
  const modal = document.getElementById("sharedPostDetailModal");
  if (!modal) return;

  modal.classList.remove("show");

  setTimeout(() => {
    modal.remove();
    document.body.style.overflow = "auto";
  }, 300);
}
function getAvatarElement(avatarUrl, fullName, size = "48px") {
  const firstLetter = fullName ? fullName.charAt(0).toUpperCase() : "?";

  // Check if avatar URL is valid
  if (
    !avatarUrl ||
    avatarUrl === "null" ||
    avatarUrl === "undefined" ||
    avatarUrl === "images/default-avatar.png" ||
    avatarUrl.includes("default-avatar")
  ) {
    // Return colored initial fallback
    return `
      <div class="avatar-fallback" style="
        width: ${size}; 
        height: ${size}; 
        border-radius: 50%; 
        background: linear-gradient(135deg, var(--primary-purple), var(--accent-pink));
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: calc(${size} / 2);
        border: 2px solid var(--primary-purple);
        flex-shrink: 0;
      ">
        ${firstLetter}
      </div>
    `;
  } else {
    // Return image with fallback on error
    return `
      <img 
        src="${avatarUrl}" 
        alt="${escapeHtml(fullName)}"
        class="avatar-image"
        style="
          width: ${size}; 
          height: ${size}; 
          border-radius: 50%; 
          object-fit: cover;
          border: 2px solid var(--primary-purple);
          flex-shrink: 0;
        "
        onerror="this.outerHTML='<div class=\\'avatar-fallback\\' style=\\'width: ${size}; height: ${size}; border-radius: 50%; background: linear-gradient(135deg, var(--primary-purple), var(--accent-pink)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: calc(${size} / 2); border: 2px solid var(--primary-purple); flex-shrink: 0;\\'>${firstLetter}</div>'"
      />
    `;
  }
}

// Make function globally accessible
window.openSharedPostDetail = openSharedPostDetail;
window.closeSharedPostModal = closeSharedPostModal;

console.log("✅ Shared post modal functions loaded");
console.log("✅ Fixed shared post message display loaded");
function debugTimezone() {
  console.group("🕒 Timezone Debug");

  const now = new Date();
  console.log("Current local time:", now.toString());
  console.log("Current UTC time:", now.toUTCString());
  console.log("Current ISO string:", now.toISOString());
  console.log("Timezone offset (minutes):", now.getTimezoneOffset());

  // Test a sample timestamp
  const sampleTimestamp = "2025-01-15T10:34:00.000Z"; // UTC time
  const sampleDate = new Date(sampleTimestamp);
  console.log("\nSample timestamp:", sampleTimestamp);
  console.log("Converted to local:", sampleDate.toString());
  console.log("Formatted time:", formatMessageTime(sampleTimestamp));
  console.log("Time ago:", getTimeAgo(sampleTimestamp));

  console.groupEnd();
}
window.debugMessageTimestamps = function () {
  console.group("🕒 Message Timestamps Debug");

  console.log("Current time:", new Date().toISOString());
  console.log(
    "Timezone offset:",
    new Date().getTimezoneOffset() / -60,
    "hours"
  );

  console.log("\nMessages in array:");
  messages.slice(-5).forEach((msg, index) => {
    console.log(`Message ${index + 1}:`, {
      id: msg.message_id,
      created_at: msg.created_at,
      local_time: new Date(msg.created_at).toString(),
      formatted: formatMessageTime(msg.created_at),
      is_temporary: msg.is_temporary,
    });
  });

  console.log("\nMessages in DOM:");
  const messageElements = document.querySelectorAll(".message-bubble");
  Array.from(messageElements)
    .slice(-5)
    .forEach((el, index) => {
      const timeSpan = el.querySelector(".message-meta span");
      console.log(`DOM Message ${index + 1}:`, {
        id: el.dataset.messageId,
        displayed_time: timeSpan?.textContent,
        is_temporary: el.classList.contains("sending"),
      });
    });

  console.groupEnd();
};

console.log("✅ Time synchronization fixes loaded");
console.log(
  "💡 Run debugMessageTimestamps() to check current message timestamps"
);
// Call this on page load to see timezone info
window.debugTimezone = debugTimezone;

console.log(
  "✅ Timezone fixes loaded. Current timezone offset:",
  new Date().getTimezoneOffset() / -60,
  "hours from UTC"
);
console.log("💡 Run debugTimezone() to see detailed timezone information");
// ===== EVENT LISTENERS =====
function setupSearchListener() {
  const searchInput = document.getElementById("conversationSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      filterConversations(query);
    });
  }
}

function filterConversations(query) {
  const filtered = conversations.filter(
    (convo) =>
      convo.other_user_name.toLowerCase().includes(query) ||
      convo.other_username.toLowerCase().includes(query)
  );
  renderConversations(filtered);
}

function setupMessageInputListeners() {
  const textarea = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendButton");

  if (textarea) {
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";

      sendBtn.disabled = !textarea.value.trim();

      // Handle typing indicator
      if (textarea.value.trim()) {
        handleTyping();
      }
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (sendBtn) {
    sendBtn.onclick = sendMessage;
  }
}
function debugMessageState() {
  console.group("🔍 MESSAGE STATE DEBUG");

  console.log("Current conversation:", currentConversation);
  console.log("Messages in array:", messages.length);

  console.log("\nLast 5 messages in array:");
  messages.slice(-5).forEach((msg, i) => {
    console.log(
      `  ${i + 1}. ID: ${msg.message_id}, Type: ${
        msg.media_type
      }, Text: ${msg.message?.substring(0, 30)}...`
    );
  });

  console.log("\nMessages in DOM:");
  const domMessages = document.querySelectorAll(".message-bubble");
  console.log(`  Count: ${domMessages.length}`);

  domMessages.forEach((el, i) => {
    if (i >= domMessages.length - 5) {
      console.log(
        `  ${i + 1}. ID: ${
          el.dataset.messageId
        }, Has shared post: ${!!el.querySelector(".shared-post-message")}`
      );
    }
  });

  console.groupEnd();
}

window.debugMessageState = debugMessageState;

console.log("✅ Complete message handling fix loaded");
console.log("💡 Run debugMessageState() to check message state");
// ===== NEW MESSAGE MODAL =====
function openNewMessageModal() {
  const modal = document.getElementById("newMessageModal");
  if (modal) {
    modal.style.display = "flex";
    document.getElementById("userSearchInput").value = "";
    document.getElementById("userSearchResults").innerHTML = `
      <div class="search-hint">
        <i class="fas fa-info-circle"></i>
        <p>Search for users you follow to start a conversation</p>
      </div>
    `;
  }
}

function closeNewMessageModal() {
  const modal = document.getElementById("newMessageModal");
  if (modal) {
    modal.style.display = "none";
  }
}

let searchTimeout = null;
async function searchUsersToMessage(query) {
  const resultsDiv = document.getElementById("userSearchResults");

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!query.trim()) {
    resultsDiv.innerHTML = `
      <div class="search-hint">
        <i class="fas fa-info-circle"></i>
        <p>Search for users you follow to start a conversation</p>
      </div>
    `;
    return;
  }

  resultsDiv.innerHTML = `
    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
      <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i>
      <p style="margin-top: 8px;">Searching...</p>
    </div>
  `;

  searchTimeout = setTimeout(async () => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");

      const response = await fetch(
        `${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`,
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
        resultsDiv.innerHTML = data.users
          .map((user) => {
            const avatarUrl = constructMediaUrl(user.profile_pic, "profile");
            return `
              <div class="user-search-item" onclick="startConversationWith(${
                user.id
              }, '${escapeHtml(user.full_name)}', '${escapeHtml(
              user.username
            )}', '${user.profile_pic || ""}')">
                ${getAvatarElement(avatarUrl, user.full_name, "48px")}
                <div class="user-search-info">
                  <div class="user-search-name">${escapeHtml(
                    user.full_name
                  )}</div>
                  <div class="user-search-username">@${escapeHtml(
                    user.username
                  )}</div>
                </div>
              </div>
            `;
          })
          .join("");
      } else {
        resultsDiv.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
            <i class="fas fa-user-slash" style="font-size: 2rem; opacity: 0.3; margin-bottom: 8px;"></i>
            <p>No users found</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("❌ Error searching users:", error);
      resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 8px;"></i>
          <p>Error searching users</p>
        </div>
      `;
    }
  }, 500);
}

console.log("✅ Avatar fallback functions loaded for messages page");
async function startConversationWith(userId, fullName, username, avatar) {
  closeNewMessageModal();

  const tempConvo = {
    conversation_id: null,
    other_user_id: userId,
    other_user_name: fullName,
    other_username: username,
    other_user_avatar: avatar,
    last_message_text: null,
    last_message_time: null,
    unread_count: 0,
  };

  await openConversation(tempConvo);

  const chatArea = document.getElementById("chatArea");
  const activeChat = document.getElementById("activeChat");
  const emptyChatState = document.getElementById("emptyChatState");

  if (chatArea && activeChat && emptyChatState) {
    chatArea.classList.add("active");
    emptyChatState.style.display = "none";
    activeChat.style.display = "flex";
  }
}

// ===== UTILITY FUNCTIONS =====
function constructMediaUrl(path, type = "post") {
  if (!path) return "images/default-avatar.png";
  if (path.startsWith("http")) return path;
  return path;
}

function getTimeAgo(timestamp) {
  if (!timestamp) return "";

  try {
    const now = new Date();
    const time = new Date(timestamp);

    // Check if date is valid
    if (isNaN(time.getTime())) {
      console.error("Invalid timestamp:", timestamp);
      return "";
    }

    const diffInSeconds = Math.floor((now - time) / 1000);

    // Handle future timestamps (shouldn't happen, but just in case)
    if (diffInSeconds < 0) {
      return "Just now";
    }

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return time.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error calculating time ago:", error);
    return "";
  }
}
function formatDate(timestamp) {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time parts for accurate date comparison
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const yesterdayOnly = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function goToProfile(userId) {
  window.location.href = `profile.html?id=${userId}`;
}

function playNotificationSound() {
  // Optional: Add notification sound
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
}

function showError(message) {
  const toast = document.createElement("div");
  toast.className = "toast toast-error";
  toast.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showSuccess(message) {
  const toast = document.createElement("div");
  toast.className = "toast toast-success";
  toast.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (socket) {
    socket.disconnect();
  }
});

console.log("✅ WebSocket messages page loaded");
async function deleteConversation(otherUserId, otherUserName) {
  console.log(
    `🗑️ deleteConversation called: User ${otherUserId}, Name: ${otherUserName}`
  );

  if (!currentUser) {
    showError("Please login to delete conversations");
    return;
  }

  // Show confirmation modal
  const confirmed = await showDeleteConversationModal(otherUserName);

  if (!confirmed) {
    console.log("❌ User cancelled deletion");
    return;
  }

  console.log(`🗑️ Deleting conversation with user ${otherUserId}`);

  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!token) {
      showError("Authentication required");
      return;
    }

    // Construct full API URL
    const apiUrl = `${API_BASE_URL}/messages/delete-conversation/${otherUserId}`;
    console.log("📡 DELETE request to:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mode: "me" }), // ← ADD THIS LINE
    });

    console.log("📡 Response status:", response.status);

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Server error:", errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("📡 Response data:", data);

    if (data.success) {
      console.log("✅ Conversation deleted successfully");
      showSuccess("Conversation deleted");

      // Remove from conversations array
      conversations = conversations.filter(
        (c) => c.other_user_id !== otherUserId
      );

      // Re-render conversations list
      renderConversations(conversations);

      // If this was the active conversation, close it
      if (
        currentConversation &&
        currentConversation.other_user_id === otherUserId
      ) {
        closeCurrentConversation();
      }
    } else {
      console.error("❌ Failed to delete conversation:", data.message);
      showError(data.message || "Failed to delete conversation");
    }
  } catch (error) {
    console.error("❌ Error deleting conversation:", error);
    console.error("   Error name:", error.name);
    console.error("   Error message:", error.message);
    console.error("   Stack:", error.stack);

    // Show more specific error
    if (error.message.includes("Failed to fetch")) {
      showError("Network error. Please check your connection and try again.");
    } else {
      showError("Failed to delete conversation. Please try again.");
    }
  }
}
async function testDeleteAPI() {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const testUrl = `${API_BASE_URL}/messages/health`;

    console.log("🔍 Testing API connection:", testUrl);

    const response = await fetch(testUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log("✅ API Test Result:", data);

    return data.success;
  } catch (error) {
    console.error("❌ API Test Failed:", error);
    return false;
  }
}

// Call this on page load to verify API is reachable
if (typeof window !== "undefined") {
  window.testDeleteAPI = testDeleteAPI;
  window.deleteConversation = deleteConversation;
}
// ===== ✅ NEW: CLOSE CURRENT CONVERSATION =====
function closeCurrentConversation() {
  currentConversation = null;
  messages = [];

  const chatArea = document.getElementById("chatArea");
  const activeChat = document.getElementById("activeChat");
  const emptyChatState = document.getElementById("emptyChatState");

  if (chatArea) chatArea.classList.remove("active");
  if (emptyChatState) emptyChatState.style.display = "flex";
  if (activeChat) activeChat.style.display = "none";

  // Remove active state from all conversations
  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.remove("active");
  });
}

// ===== ✅ NEW: DELETE CONFIRMATION MODAL =====
function showDeleteConversationModal(userName) {
  return new Promise((resolve) => {
    // Create modal
    const modal = document.createElement("div");
    modal.className = "delete-conversation-modal";
    modal.innerHTML = `
      <div class="delete-modal-overlay" onclick="event.stopPropagation()">
        <div class="delete-modal-content">
          <div class="delete-modal-header">
            <i class="fas fa-trash-alt"></i>
            <h3>Delete Conversation?</h3>
          </div>
          
          <div class="delete-modal-body">
            <p>Are you sure you want to delete this conversation with <strong>${escapeHtml(
              userName
            )}</strong>?</p>
            <p class="delete-modal-warning">
              <i class="fas fa-info-circle"></i>
              This will only delete the conversation from your view. The other person will still see it.
            </p>
          </div>
          
          <div class="delete-modal-footer">
            <button class="btn-secondary" id="btnCancelDelete">
              Cancel
            </button>
            <button class="btn-danger" id="btnConfirmDelete">
              <i class="fas fa-trash"></i>
              Delete Conversation
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    // Animate in
    setTimeout(() => {
      modal.classList.add("show");
    }, 10);

    // Handle cancel
    document.getElementById("btnCancelDelete").onclick = () => {
      closeDeleteModal(modal);
      resolve(false);
    };

    // Handle confirm
    document.getElementById("btnConfirmDelete").onclick = () => {
      closeDeleteModal(modal);
      resolve(true);
    };

    // Close on overlay click
    modal.querySelector(".delete-modal-overlay").onclick = (e) => {
      if (e.target === e.currentTarget) {
        closeDeleteModal(modal);
        resolve(false);
      }
    };
  });
}
function formatMessageTime(timestamp) {
  if (!timestamp) return "";

  try {
    // Parse timestamp - if no 'Z', browser treats as local time (correct!)
    const date = new Date(timestamp);

    // Validate
    if (isNaN(date.getTime())) {
      console.error("Invalid timestamp:", timestamp);
      return "";
    }

    // Format in 12-hour time
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");

    return `${displayHours}:${displayMinutes} ${ampm}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
}

// ===== ✅ NEW: CLOSE DELETE MODAL =====
function closeDeleteModal(modal) {
  modal.classList.remove("show");
  setTimeout(() => {
    modal.remove();
    document.body.style.overflow = "auto";
  }, 300);
}
window.deleteConversation = deleteConversation;
window.handleChatHeaderDelete = handleChatHeaderDelete;
window.closeCurrentConversation = closeCurrentConversation;

console.log("✅ Delete conversation functions loaded and made global");
// ===== 🔍 COMPREHENSIVE DEBUG HELPER =====
// Add this temporarily to your messages.js to diagnose the issue

async function debugDeleteConversation(otherUserId) {
  console.group("🔍 DEBUG: Delete Conversation");

  // Step 1: Check environment
  console.log("📋 Step 1: Environment Check");
  console.log("   API_BASE_URL:", API_BASE_URL);
  console.log("   Current user:", currentUser);
  console.log("   Other user ID:", otherUserId);

  // Step 2: Check authentication
  console.log("\n🔐 Step 2: Authentication Check");
  const token =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  console.log("   Token exists:", !!token);
  console.log("   Token length:", token ? token.length : 0);
  console.log(
    "   Token preview:",
    token ? token.substring(0, 20) + "..." : "none"
  );

  // Step 3: Test API health
  console.log("\n🏥 Step 3: API Health Check");
  try {
    const healthUrl = `${API_BASE_URL}/messages/health`;
    console.log("   Testing:", healthUrl);

    const healthResponse = await fetch(healthUrl);
    const healthData = await healthResponse.json();
    console.log("   ✅ API is reachable:", healthData);
  } catch (error) {
    console.error("   ❌ API health check failed:", error);
    console.groupEnd();
    return;
  }

  // Step 4: Test delete endpoint
  console.log("\n🗑️ Step 4: Testing Delete Endpoint");
  const deleteUrl = `${API_BASE_URL}/messages/delete-conversation/${otherUserId}`;
  console.log("   Full URL:", deleteUrl);

  try {
    // First try OPTIONS (preflight)
    console.log("   Testing OPTIONS request...");
    const optionsResponse = await fetch(deleteUrl, {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(
      "   OPTIONS response:",
      optionsResponse.status,
      optionsResponse.statusText
    );

    // Now try DELETE
    console.log("   Testing DELETE request...");
    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("   DELETE response status:", deleteResponse.status);
    console.log("   DELETE response ok:", deleteResponse.ok);
    console.log("   DELETE response headers:", [
      ...deleteResponse.headers.entries(),
    ]);

    const responseText = await deleteResponse.text();
    console.log("   Raw response:", responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log("   Parsed response:", responseJson);

      if (responseJson.success) {
        console.log("   ✅ Delete successful!");
      } else {
        console.error("   ❌ Delete failed:", responseJson.message);
      }
    } catch (parseError) {
      console.error("   ❌ Failed to parse response:", parseError);
    }
  } catch (error) {
    console.error("   ❌ Request failed:", error);
    console.error("   Error type:", error.constructor.name);
    console.error("   Error message:", error.message);

    // Check specific error types
    if (error.message.includes("Failed to fetch")) {
      console.error("   💡 This is a network/CORS error");
      console.error("   Possible causes:");
      console.error("      1. Server is not running");
      console.error("      2. CORS not configured correctly");
      console.error("      3. URL is incorrect");
      console.error("      4. Network/firewall blocking request");
    }
  }

  console.groupEnd();
}

// Add to window for easy access
window.debugDeleteConversation = debugDeleteConversation;

console.log("🔍 Debug helper loaded. Use: debugDeleteConversation(userId)");

// ===== ALSO ADD NETWORK MONITOR =====
(function setupNetworkMonitor() {
  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    const [url, options = {}] = args;

    // Only log API calls
    if (url.includes("/api/messages/delete-conversation")) {
      console.log("🌐 FETCH INTERCEPTED:");
      console.log("   URL:", url);
      console.log("   Method:", options.method || "GET");
      console.log("   Headers:", options.headers);
      console.log("   Body:", options.body);
    }

    return originalFetch
      .apply(this, args)
      .then((response) => {
        if (url.includes("/api/messages/delete-conversation")) {
          console.log("📥 RESPONSE RECEIVED:");
          console.log("   Status:", response.status);
          console.log("   OK:", response.ok);
        }
        return response;
      })
      .catch((error) => {
        if (url.includes("/api/messages/delete-conversation")) {
          console.error("❌ FETCH ERROR:", error);
        }
        throw error;
      });
  };

  console.log("🌐 Network monitor active");
})();
const REACTION_EMOJIS = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😠",
};

// ===== ADD/REMOVE REACTION =====
async function addReaction(messageId, reactionType) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(`${API_BASE_URL}/messages/reactions/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message_id: messageId,
        reaction_type: reactionType,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Emit WebSocket event for real-time update
      if (socket && socket.connected && currentConversation) {
        socket.emit("add_reaction", {
          message_id: messageId,
          reaction_type: reactionType,
          other_user_id: currentConversation.other_user_id,
        });
      }

      // Update UI locally
      updateMessageReactions(messageId, data.reactions);
      showSuccess(`Reacted with ${REACTION_EMOJIS[reactionType]}`);
    } else {
      showError(data.message || "Failed to add reaction");
    }
  } catch (error) {
    console.error("Error adding reaction:", error);
    showError("Failed to add reaction");
  }
}

async function removeReaction(messageId) {
  try {
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch(
      `${API_BASE_URL}/messages/reactions/remove/${messageId}`,
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
      // Emit WebSocket event for real-time update
      if (socket && socket.connected && currentConversation) {
        socket.emit("remove_reaction", {
          message_id: messageId,
          other_user_id: currentConversation.other_user_id,
        });
      }

      // Update UI locally
      updateMessageReactions(messageId, data.reactions);
      showSuccess("Reaction removed");
    } else {
      showError(data.message || "Failed to remove reaction");
    }
  } catch (error) {
    console.error("Error removing reaction:", error);
    showError("Failed to remove reaction");
  }
}
function updateMessageReactions(messageId, reactions) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return;

  const messageContent = messageEl.querySelector(".message-content");
  if (!messageContent) return;

  // Remove existing reactions display
  const existingReactions = messageContent.querySelector(
    ".message-reactions-display"
  );
  if (existingReactions) {
    existingReactions.remove();
  }

  // Add new reactions display if there are any
  if (reactions && reactions.length > 0) {
    const reactionsEl = createReactionsDisplay(reactions, messageId);
    messageContent.appendChild(reactionsEl);
  }
}

// ===== CREATE REACTIONS DISPLAY =====
function createReactionsDisplay(reactions, messageId) {
  const div = document.createElement("div");
  div.className = "message-reactions-display";

  // Group reactions by type
  const grouped = {};
  reactions.forEach((r) => {
    if (!grouped[r.reaction_type]) {
      grouped[r.reaction_type] = [];
    }
    grouped[r.reaction_type].push(r);
  });

  // Create reaction bubbles
  Object.entries(grouped).forEach(([type, users]) => {
    const bubble = document.createElement("div");
    bubble.className = "reaction-bubble";

    // Check if current user reacted with this type
    const userReacted = users.some((u) => u.user_id === currentUser.id);
    if (userReacted) {
      bubble.classList.add("user-reacted");
    }

    bubble.innerHTML = `
      <span class="reaction-emoji">${REACTION_EMOJIS[type]}</span>
      <span class="reaction-count">${users.length}</span>
    `;

    // Show tooltip on hover
    const usernames = users.map((u) => u.full_name || u.username).join(", ");
    bubble.title = usernames;

    // Click to remove if user reacted, otherwise add
    bubble.onclick = () => {
      if (userReacted) {
        removeReaction(messageId);
      } else {
        addReaction(messageId, type);
      }
    };

    div.appendChild(bubble);
  });

  return div;
}

// ===== SHOW REACTION PICKER =====
function showReactionPicker(messageId, buttonElement) {
  // Remove any existing picker
  const existingPicker = document.querySelector(".reaction-picker");
  if (existingPicker) {
    existingPicker.remove();
  }

  // Create picker
  const picker = document.createElement("div");
  picker.className = "reaction-picker";

  Object.entries(REACTION_EMOJIS).forEach(([type, emoji]) => {
    const btn = document.createElement("button");
    btn.className = "reaction-option";
    btn.textContent = emoji;
    btn.title = type;
    btn.onclick = () => {
      addReaction(messageId, type);
      picker.remove();
    };
    picker.appendChild(btn);
  });

  // Position picker
  const rect = buttonElement.getBoundingClientRect();
  picker.style.position = "absolute";
  picker.style.bottom = "100%";
  picker.style.marginBottom = "8px";

  buttonElement.parentElement.style.position = "relative";
  buttonElement.parentElement.appendChild(picker);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", function closePickerHandler(e) {
      if (!picker.contains(e.target) && e.target !== buttonElement) {
        picker.remove();
        document.removeEventListener("click", closePickerHandler);
      }
    });
  }, 0);
}
