// static/js/ui-sfx.js

// 1. Preload the three “UI” sounds
const uiFiles = [
  '/static/sfx/Ding.mp3',
  '/static/sfx/HighPitchPing.mp3',
  '/static/sfx/UIClick.mp3'
].map(src => {
  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
});

// 2. Play a random sound at the current user volume
function playRandomUI() {
  const idx = Math.floor(Math.random() * uiFiles.length);
  const sfx = uiFiles[idx];

  // always re-read the saved volume
  const savedVol = localStorage.getItem('user_volume');
  sfx.volume = savedVol !== null ? (savedVol / 100) : 1.0;

  sfx.currentTime = 0;
  sfx.play().catch(() => { /* silent if playback not allowed */ });
}

// 3. Attach to elements
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.play-ui-sfx').forEach(el => {
    el.addEventListener('click', playRandomUI);
  });
});
