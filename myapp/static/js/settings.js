// static/js/settings.js

document.addEventListener('DOMContentLoaded', () => {
  const volSlider = document.getElementById('volume-slider');
  const txtSlider = document.getElementById('text-slider');
  const volLabel  = document.getElementById('volume-label');
  const txtLabel  = document.getElementById('text-label');
  const saveBtn   = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');

  // preview SFX
  const previewSfx = new Audio('/static/sfx/Ding.mp3');
  previewSfx.preload = 'auto';

  function applyVolume(v) {
    previewSfx.volume = v / 100;
    previewSfx.currentTime = 0;
    previewSfx.play().catch(() => {});
    volLabel.textContent = `${v}%`;
  }

  function applyTextSize(t) {
    document.documentElement.style.fontSize = `${t}%`;
    txtLabel.textContent = `${t}%`;
  }

  // initialize from sliders / localStorage
  const initVol = localStorage.getItem('user_volume') ?? volSlider.value;
  const initTxt = localStorage.getItem('user_text_size') ?? txtSlider.value;
  volSlider.value = initVol;
  txtSlider.value = initTxt;
  applyVolume(initVol);
  applyTextSize(initTxt);

  // live update & persist
  volSlider.addEventListener('input', () => {
    const v = volSlider.value;
    applyVolume(v);
    localStorage.setItem('user_volume', v);
  });
  txtSlider.addEventListener('input', () => {
    const t = txtSlider.value;
    applyTextSize(t);
    localStorage.setItem('user_text_size', t);
  });

  // save to server
  saveBtn.addEventListener('click', () => {
    fetch('/update_settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        volume: volSlider.value,
        text_size: txtSlider.value
      })
    })
    .then(res => res.json())
    .then(json => {
      statusMsg.textContent = json.success ? 'Settings saved!' : 'Error saving.';
      setTimeout(() => statusMsg.textContent = '', 2000);
    })
    .catch(() => {
      statusMsg.textContent = 'Network error.';
      setTimeout(() => statusMsg.textContent = '', 2000);
    });
  });
});
