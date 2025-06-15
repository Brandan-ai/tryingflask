// static/js/settings.js

document.addEventListener('DOMContentLoaded', () => {
  const volSlider = document.getElementById('volume-slider');
  const txtSlider = document.getElementById('text-slider');
  const volLabel  = document.getElementById('volume-label');
  const txtLabel  = document.getElementById('text-label');
  const saveBtn   = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status-msg');
  const previewSfx = new Audio('/static/sfx/Ding.mp3');
  previewSfx.preload = 'auto';

  function applyVolume(v) {
    previewSfx.volume = v/100;
    previewSfx.currentTime = 0;
    previewSfx.play().catch(()=>{});
    volLabel.textContent = `${v}%`;
  }

  function applyTextSize(t) {
    document.documentElement.style.fontSize = t + '%';
    txtLabel.textContent = `${t}%`;
  }

  // Paint the slider track with two colors
  function updateSliderFill(slider) {
    const min = +slider.min, max = +slider.max;
    const pct = (slider.value - min) / (max - min) * 100;
    slider.style.background = `linear-gradient(
      to right,
      #0056b3 0%,    /* filled color */
      #0056b3 ${pct}%,
      #78909c ${pct}%, /* unfilled color */
      #78909c 100%
    )`;
  }

  // Initialize values from localStorage or HTML defaults
  const initVol = localStorage.getItem('user_volume') ?? volSlider.value;
  const initTxt = localStorage.getItem('user_text_size') ?? txtSlider.value;
  volSlider.value = initVol;
  txtSlider.value = initTxt;
  applyVolume(initVol);
  applyTextSize(initTxt);
  updateSliderFill(volSlider);
  updateSliderFill(txtSlider);

  // Live-update & persist locally + fill
  volSlider.addEventListener('input', () => {
    const v = Math.max(0, Math.min(100, volSlider.value));
    applyVolume(v);
    localStorage.setItem('user_volume', v);
    updateSliderFill(volSlider);
  });

  txtSlider.addEventListener('input', () => {
    const t = Math.max(50, Math.min(200, txtSlider.value));
    applyTextSize(t);
    localStorage.setItem('user_text_size', t);
    updateSliderFill(txtSlider);
  });

  // Save to server via fetch
  function saveToServer() {
    fetch('/update_settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        volume: volSlider.value,
        text_size: txtSlider.value
      })
    })
    .then(r => r.json())
    .then(json => {
      statusMsg.textContent = json.success 
        ? 'Settings saved!' 
        : 'Error saving.';
      setTimeout(() => statusMsg.textContent = '', 2000);
    })
    .catch(() => {
      statusMsg.textContent = 'Network error.';
      setTimeout(() => statusMsg.textContent = '', 2000);
    });
  }
  saveBtn.addEventListener('click', saveToServer);

  // Save on unload via Beacon
  window.addEventListener('beforeunload', () => {
    const payload = JSON.stringify({
      volume: volSlider.value,
      text_size: txtSlider.value
    });
    navigator.sendBeacon(
      '/update_settings',
      new Blob([payload], { type: 'application/json' })
    );
  });
});
