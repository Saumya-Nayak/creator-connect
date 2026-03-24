// ===== STANDALONE EMOJI PICKER =====
// This file should be loaded BEFORE messages.js

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

let recentEmojis = [];
let currentCategory = "smileys";

// ===== GLOBAL FUNCTIONS =====
window.toggleEmojiPicker = function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  console.log("👆 Toggle emoji picker clicked");
  const picker = document.getElementById("emojiPicker");
  const btn = document.getElementById("emojiBtn");

  if (!picker || !btn) {
    console.error("❌ Emoji picker elements not found");
    return;
  }

  const isShown = picker.classList.contains("show");
  console.log("🔍 Current state - isShown:", isShown);

  if (isShown) {
    console.log("📦 Closing picker...");
    picker.classList.remove("show");
    picker.style.display = "none";
    btn.classList.remove("active");
  } else {
    console.log("📦 Opening picker...");
    picker.style.display = "flex";
    setTimeout(() => picker.classList.add("show"), 10);
    btn.classList.add("active");

    setTimeout(() => {
      const searchInput = document.getElementById("emojiSearch");
      if (searchInput) searchInput.focus();
    }, 100);
  }
};

window.closeEmojiPicker = function () {
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

  renderEmojis(currentCategory);
};

window.initializeEmojiPicker = function () {
  console.log("🎨 Initializing emoji picker...");
  renderEmojiCategories();
  renderEmojis(currentCategory);
  setupEmojiPickerListeners();
  console.log("✅ Emoji picker initialized");
};

function setupEmojiPickerListeners() {
  // Search input
  const searchInput = document.getElementById("emojiSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchEmojis(e.target.value);
    });
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
}

function renderEmojiCategories() {
  const categoriesDiv = document.getElementById("emojiCategories");
  if (!categoriesDiv) return;

  categoriesDiv.innerHTML = "";

  Object.keys(EMOJI_CATEGORIES).forEach((key) => {
    const category = EMOJI_CATEGORIES[key];
    const btn = document.createElement("button");
    btn.className = `emoji-category-btn ${
      key === currentCategory ? "active" : ""
    }`;
    btn.textContent = category.icon;
    btn.title = category.name;
    btn.onclick = () => switchCategory(key, btn);
    categoriesDiv.appendChild(btn);
  });
}

function switchCategory(categoryKey, buttonElement) {
  currentCategory = categoryKey;

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
  if (recentEmojis.length > 0 && categoryKey === "smileys") {
    const recentSection = document.createElement("div");
    recentSection.className = "emoji-category-section";
    recentSection.innerHTML = `
        <div class="emoji-category-name">Recently Used</div>
        <div class="emoji-grid" id="recentEmojisGrid"></div>
      `;
    contentDiv.appendChild(recentSection);

    const recentGrid = recentSection.querySelector("#recentEmojisGrid");
    recentEmojis.slice(0, 16).forEach((emoji) => {
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
  recentEmojis = recentEmojis.filter((e) => e !== emoji);
  recentEmojis.unshift(emoji);
  recentEmojis = recentEmojis.slice(0, 32);
}

window.searchEmojis = function (query) {
  const contentDiv = document.getElementById("emojiContent");
  if (!contentDiv) return;

  if (!query.trim()) {
    renderEmojis(currentCategory);
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
};

console.log("✅ Emoji picker loaded globally");
