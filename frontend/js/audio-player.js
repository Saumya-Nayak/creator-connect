(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const audio = document.getElementById("bg-audio");

    if (!audio) {
      console.error("🎧 Audio element not found");
      return;
    }

    audio.volume = 0.5;
    let hasPlayed = false;

    function playAudioOnce() {
      if (hasPlayed) return;

      console.log("🎧 Playing audio on page load...");

      audio
        .play()
        .then(() => {
          hasPlayed = true;
          console.log("🎧 ✅ Audio playing successfully");
          cleanup();
        })
        .catch((err) => {
          console.error("🎧 ❌ Audio blocked:", err.message);
          // Keep listeners if autoplay failed - try on first interaction
        });
    }

    function cleanup() {
      document.removeEventListener("click", playAudioOnce, true);
      document.removeEventListener("keydown", playAudioOnce, true);
      document.removeEventListener("touchstart", playAudioOnce, true);
      console.log("🎧 Event listeners cleaned up");
    }

    // Add event listeners as fallback (in case autoplay fails)
    document.addEventListener("click", playAudioOnce, {
      once: true,
      capture: true,
    });
    document.addEventListener("keydown", playAudioOnce, {
      once: true,
      capture: true,
    });
    document.addEventListener("touchstart", playAudioOnce, {
      once: true,
      capture: true,
    });

    // Try to play immediately (will only work if user already interacted with site)
    playAudioOnce();

    // Debug info
    console.log("🎧 Audio player ready");
    console.log("🎧 Audio src:", audio.src);
    console.log("🎧 Audio volume:", audio.volume);

    // Monitor if audio actually plays
    audio.addEventListener("playing", () => {
      console.log("🎧 🔊 AUDIO IS NOW PLAYING!");
    });

    audio.addEventListener("ended", () => {
      console.log("🎧 Audio finished");
    });

    audio.addEventListener("error", () => {
      console.error("🎧 Audio loading error - check file path!");
    });
    const muteBtn = document.getElementById("muteToggle");

    // Restore mute state
    if (localStorage.getItem("bgAudioMuted") === "true") {
      audio.muted = true;
      muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }

    muteBtn.addEventListener("click", () => {
      audio.muted = !audio.muted;

      if (audio.muted) {
        muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        localStorage.setItem("bgAudioMuted", "true");
        console.log("🔇 Audio muted");
      } else {
        muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        localStorage.setItem("bgAudioMuted", "false");
        console.log("🔊 Audio unmuted");
      }
    });
    audio.addEventListener("play", () => {
      muteBtn.style.display = "flex";
    });

    audio.addEventListener("pause", () => {
      muteBtn.style.display = "none";
    });

    audio.addEventListener("ended", () => {
      muteBtn.style.display = "none";
    });
  });
})();
